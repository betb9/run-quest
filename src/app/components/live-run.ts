import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, output, signal } from '@angular/core'
import type { TrackPoint } from '../lib/db'
import { formatDuration, formatPace, haversineKm, trackDistanceKm } from '../lib/geo'

const MAX_ACCURACY_M = 30
const MIN_STEP_KM = 0.003
const MAX_SPEED_KMH = 40

@Component({
  selector: 'app-live-run',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'live' },
  template: `
    <div class="live-gps small">{{ gpsStatus() }}</div>
    <div class="live-km">{{ km().toFixed(2) }}</div>
    <div class="muted">kilomètres</div>
    <div class="live-row">
      <div>
        <div class="live-val">{{ duration() }}</div>
        <div class="muted small">durée</div>
      </div>
      <div>
        <div class="live-val">{{ pace() }}</div>
        <div class="muted small">allure /km</div>
      </div>
      <div>
        <div class="live-val">+{{ xp() }}</div>
        <div class="muted small">XP</div>
      </div>
    </div>
    <p class="muted small center">Garde l'écran allumé : si le téléphone se verrouille, le suivi s'interrompt.</p>
    <button class="btn danger big" (click)="stop()">⏹ Terminer</button>
  `,
})
export class LiveRun {
  readonly finish = output<TrackPoint[]>()
  readonly cancel = output()

  readonly #points = signal<TrackPoint[]>([])
  readonly #accuracy = signal<number | null>(null)
  readonly #error = signal<string | null>(null)
  readonly #startedAt = Date.now()
  readonly #now = signal(Date.now())

  protected readonly km = computed(() => trackDistanceKm(this.#points()))
  readonly #elapsed = computed(() => Math.round((this.#now() - this.#startedAt) / 1000))
  protected readonly duration = computed(() => formatDuration(this.#elapsed()))
  protected readonly pace = computed(() => formatPace(this.#elapsed(), this.km()))
  protected readonly xp = computed(() => Math.round(this.km() * 100))
  protected readonly gpsStatus = computed(() => {
    const accuracy = this.#accuracy()
    return this.#error() ?? (accuracy === null ? '📡 Recherche du GPS…' : `📡 Précision ±${Math.round(accuracy)} m`)
  })

  constructor() {
    const tick = setInterval(() => this.#now.set(Date.now()), 1000)

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this.#accuracy.set(pos.coords.accuracy)
        this.#error.set(null)
        if (pos.coords.accuracy > MAX_ACCURACY_M) return
        const p: TrackPoint = [pos.coords.latitude, pos.coords.longitude, pos.timestamp]
        const points = this.#points()
        const prev = points[points.length - 1]
        if (prev) {
          const km = haversineKm([prev[0], prev[1]], [p[0], p[1]])
          const hours = (p[2] - prev[2]) / 3_600_000
          if (km < MIN_STEP_KM) return // bruit GPS à l'arrêt
          if (hours > 0 && km / hours > MAX_SPEED_KMH) return // saut aberrant
        }
        this.#points.set([...points, p])
      },
      (err) => this.#error.set(err.code === err.PERMISSION_DENIED ? 'Accès à la position refusé' : 'Signal GPS perdu…'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 },
    )

    // Garde l'écran allumé : iOS suspend la page quand il se verrouille
    let wakeLock: WakeLockSentinel | null = null
    const requestWakeLock = async () => {
      try {
        wakeLock = await navigator.wakeLock?.request('screen')
      } catch {
        // non supporté ou refusé
      }
    }
    const onVisible = () => document.visibilityState === 'visible' && requestWakeLock()
    requestWakeLock()
    document.addEventListener('visibilitychange', onVisible)

    inject(DestroyRef).onDestroy(() => {
      clearInterval(tick)
      navigator.geolocation.clearWatch(watchId)
      document.removeEventListener('visibilitychange', onVisible)
      wakeLock?.release().catch(() => {})
    })
  }

  protected stop() {
    if (this.km() < 0.05) {
      if (confirm('Moins de 50 m enregistrés. Abandonner cette course ?')) this.cancel.emit()
      return
    }
    this.finish.emit(this.#points())
  }
}
