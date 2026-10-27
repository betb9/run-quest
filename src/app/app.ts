import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { SwUpdate } from '@angular/service-worker'
import { ConquestMap } from './components/conquest-map'
import { Hero } from './components/hero'
import { Journey } from './components/journey'
import { LiveRun } from './components/live-run'
import { RewardsModal } from './components/rewards-modal'
import { Runs } from './components/runs'
import type { TrackPoint } from './lib/db'
import { buildRun } from './lib/geo'
import { type Rewards, RunsStore } from './lib/runs-store'

type Tab = 'hero' | 'runs' | 'map' | 'journey'

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'hero', icon: '🛡️', label: 'Héros' },
  { id: 'runs', icon: '🏃', label: 'Courses' },
  { id: 'map', icon: '🗺️', label: 'Conquête' },
  { id: 'journey', icon: '💍', label: 'Quête' },
]

@Component({
  selector: 'app-root',
  imports: [ConquestMap, Hero, Journey, LiveRun, RewardsModal, Runs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (runs(); as runs) {
      @if (live()) {
        <app-live-run (finish)="finishLive($event)" (cancel)="live.set(false)" />
      } @else {
        <div class="app">
          <header class="topbar">⚔️ Run Quest</header>
          <main>
            @switch (tab()) {
              @case ('hero') {
                <app-hero [runs]="runs" />
              }
              @case ('runs') {
                <app-runs [runs]="runs" (startLive)="live.set(true)" (rewards)="rewards.set($event)" />
              }
              @case ('map') {
                <app-conquest-map [runs]="runs" />
              }
              @case ('journey') {
                <app-journey [runs]="runs" />
              }
            }
          </main>
          <nav class="tabbar">
            @for (t of tabs; track t.id) {
              <button [class.active]="tab() === t.id" (click)="tab.set(t.id)">
                <span>{{ t.icon }}</span>
                {{ t.label }}
              </button>
            }
          </nav>
          @if (rewards(); as r) {
            <app-rewards-modal [rewards]="r" (close)="rewards.set(null)" />
          }
        </div>
      }
    }
  `,
})
export class App {
  readonly #store = inject(RunsStore)
  protected readonly runs = this.#store.runs
  protected readonly tabs = TABS
  protected readonly tab = signal<Tab>('hero')
  protected readonly live = signal(false)
  protected readonly rewards = signal<Rewards | null>(null)

  constructor() {
    // Équivalent du registerType « autoUpdate » : recharge dès qu'une nouvelle version est prête
    const sw = inject(SwUpdate)
    if (sw.isEnabled) {
      sw.versionUpdates.subscribe((e) => {
        if (e.type === 'VERSION_READY' && !this.live()) document.location.reload()
      })
    }
  }

  protected async finishLive(points: TrackPoint[]) {
    const name = `Course du ${new Date(points[0][2]).toLocaleDateString('fr-FR')}`
    this.rewards.set(await this.#store.save([buildRun(points, 'live', name)]))
    this.live.set(false)
  }
}
