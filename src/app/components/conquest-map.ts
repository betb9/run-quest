import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  type ElementRef,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core'
import { cellsToMultiPolygon, getHexagonAreaAvg } from 'h3-js'
import * as L from 'leaflet'
import type { Run } from '../lib/db'
import { HEX_RES } from '../lib/geo'

const PARIS: L.LatLngExpression = [48.8566, 2.3522]

@Component({
  selector: 'app-conquest-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page map-page' },
  template: `
    <div class="card map-header">
      <div>
        <div class="stat-value">{{ cells().length }} zones</div>
        <div class="muted small">≈ {{ areaKm2().toFixed(2) }} km² explorés</div>
      </div>
      <label class="small">
        <input type="checkbox" [checked]="showTracks()" (change)="showTracks.set(tracksBox.checked)" #tracksBox />
        Tracés
      </label>
    </div>
    <div class="map" #map></div>
    <p class="muted small">
      Chaque hexagone traversé est conquis. Explore de nouvelles rues pour agrandir ton territoire !
    </p>
  `,
})
export class ConquestMap {
  readonly runs = input.required<Run[]>()
  protected readonly showTracks = signal(false)

  protected readonly cells = computed(() => [...new Set(this.runs().flatMap((r) => r.cells))])
  protected readonly areaKm2 = computed(() => this.cells().length * getHexagonAreaAvg(HEX_RES, 'km2'))
  readonly #territory = computed(() => cellsToMultiPolygon(this.cells()))

  private readonly mapEl = viewChild.required<ElementRef<HTMLDivElement>>('map')
  readonly #map = signal<L.Map | null>(null)

  constructor() {
    afterNextRender(() => {
      const map = L.map(this.mapEl().nativeElement)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map)

      const pts = this.runs().flatMap((r) => r.points.map((p) => [p[0], p[1]] as [number, number]))
      if (pts.length) map.fitBounds(L.latLngBounds(pts), { padding: [20, 20] })
      else map.setView(PARIS, 12)

      this.#map.set(map)
    })
    inject(DestroyRef).onDestroy(() => this.#map()?.remove())

    effect((onCleanup) => {
      const map = this.#map()
      if (!map) return
      const layer = L.polygon(this.#territory() as L.LatLngExpression[][][], {
        color: '#f97316',
        weight: 1,
        fillColor: '#f97316',
        fillOpacity: 0.35,
      }).addTo(map)
      onCleanup(() => layer.remove())
    })

    effect((onCleanup) => {
      const map = this.#map()
      if (!map || !this.showTracks()) return
      const tracks = this.runs().map((r) =>
        L.polyline(
          r.points.map((p) => [p[0], p[1]] as [number, number]),
          { color: '#7c3aed', weight: 2, opacity: 0.7 },
        ).addTo(map),
      )
      onCleanup(() => tracks.forEach((t) => t.remove()))
    })
  }
}
