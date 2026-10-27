import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core'
import type { Run } from '../lib/db'
import { bossForWeek, kmByWeek, levelInfo, questState, titleFor, totalXp, weekStart, weekStreak } from '../lib/game'
import { formatPace } from '../lib/geo'
import { Settings } from '../lib/settings.service'
import { EncounterCard } from './encounter-card'

@Component({
  selector: 'app-hero',
  imports: [EncounterCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  template: `
    @let lvl = level();
    <section class="card hero">
      <div class="avatar">🏃</div>
      <div class="grow">
        <div class="level">Niveau {{ lvl.level }}</div>
        <div class="title">{{ titleFor(lvl.level) }}</div>
        <div class="bar xp">
          <div [style.width.%]="(lvl.current / lvl.needed) * 100"></div>
        </div>
        <div class="muted small">{{ lvl.current }} / {{ lvl.needed }} XP · total {{ xp() }} XP</div>
      </div>
    </section>

    @if (quest().encounter; as encounter) {
      <app-encounter-card [encounter]="encounter" />
    }

    @let w = week();
    <section class="card boss" [class.defeated]="w.defeated">
      <div class="muted small">Boss de la semaine</div>
      <div class="boss-head">
        <span class="boss-emoji">{{ w.defeated ? '💀' : w.boss.emoji }}</span>
        <div class="grow">
          <div class="boss-name">{{ w.boss.name }}</div>
          <div class="bar hp">
            <div [style.width.%]="(w.hpLeft / goal()) * 100"></div>
          </div>
          <div class="small">
            @if (w.defeated) {
              Vaincu ! {{ w.km.toFixed(1) }} km de dégâts 🏆
            } @else {
              {{ w.hpLeft.toFixed(1) }} / {{ goal() }} PV — encore {{ w.hpLeft.toFixed(1) }} km pour le terrasser
            }
          </div>
        </div>
      </div>
      <label class="goal small muted">
        Objectif hebdo (PV du boss) :
        <input type="number" min="1" max="200" [value]="goal()" (input)="onGoalInput($event)" />
        km
      </label>
    </section>

    <section class="stats">
      @for (s of stats(); track s.label) {
        <div class="card stat">
          <span class="stat-icon">{{ s.icon }}</span>
          <div class="stat-value">{{ s.value }}</div>
          <div class="muted small">{{ s.label }}</div>
        </div>
      }
    </section>
  `,
})
export class Hero {
  readonly runs = input.required<Run[]>()
  readonly #settings = inject(Settings)
  protected readonly goal = this.#settings.weeklyGoal
  protected readonly titleFor = titleFor

  protected readonly xp = computed(() => totalXp(this.runs()))
  protected readonly level = computed(() => levelInfo(this.xp()))
  protected readonly quest = computed(() => questState(this.runs()))

  protected readonly week = computed(() => {
    const thisWeek = weekStart(Date.now())
    const weeks = kmByWeek(this.runs())
    const km = weeks.get(thisWeek) ?? 0
    const hpLeft = Math.max(0, this.goal() - km)
    const pastWins = [...weeks].filter(([w, wkm]) => w !== thisWeek && wkm >= this.goal()).length
    return { boss: bossForWeek(thisWeek), km, hpLeft, defeated: hpLeft === 0, pastWins }
  })

  protected readonly stats = computed(() => {
    const runs = this.runs()
    const { pastWins, defeated } = this.week()
    const totalKm = runs.reduce((sum, r) => sum + r.distanceKm, 0)
    const longest = Math.max(0, ...runs.map((r) => r.distanceKm))
    const timed = runs.filter((r) => r.durationSec > 0 && r.distanceKm >= 1)
    const best = timed.sort((a, b) => a.durationSec / a.distanceKm - b.durationSec / b.distanceKm)[0]
    return [
      { icon: '🛣️', label: 'Distance totale', value: `${totalKm.toFixed(1)} km` },
      { icon: '🏃', label: 'Courses', value: String(runs.length) },
      { icon: '🔥', label: 'Série', value: `${weekStreak(runs)} sem.` },
      { icon: '⚔️', label: 'Boss hebdo vaincus', value: String(pastWins + (defeated ? 1 : 0)) },
      { icon: '💍', label: 'Boss de la Quête', value: `${this.quest().defeated.length} / 8` },
      { icon: '🫁', label: 'Endurance (plus longue)', value: `${longest.toFixed(1)} km` },
      {
        icon: '⚡',
        label: 'Vitesse (meilleure allure)',
        value: best ? `${formatPace(best.durationSec, best.distanceKm)}/km` : '–',
      },
    ]
  })

  protected onGoalInput(event: Event) {
    const v = Number((event.target as HTMLInputElement).value)
    if (v > 0) this.#settings.setWeeklyGoal(v)
  }
}
