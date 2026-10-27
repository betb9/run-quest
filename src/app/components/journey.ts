import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core'
import type { Run } from '../lib/db'
import { JOURNEY, JOURNEY_KM, journeyPosition, QUEST_BOSSES, questState } from '../lib/game'
import { EncounterCard } from './encounter-card'

/** Petits triangles alignés pour dessiner une chaîne de montagnes */
function ridge(x1: number, y1: number, x2: number, y2: number, step = 22, size = 14): string[] {
  const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / step))
  return Array.from({ length: n + 1 }, (_, i) => {
    const x = x1 + ((x2 - x1) * i) / n + (i % 2 ? 6 : -6)
    const y = y1 + ((y2 - y1) * i) / n
    return `${x - size},${y + size} ${x},${y - size} ${x + size},${y + size}`
  })
}

const MOUNTAINS = [
  ...ridge(480, 80, 488, 430), // Monts Brumeux
  ...ridge(560, 520, 700, 470, 26, 10), // Montagnes Blanches
  ...ridge(815, 470, 980, 465), // Ered Lithui
  ...ridge(805, 500, 815, 690), // Ephel Dúath
]

const LABELS: [string, number, number][] = [
  ['La Comté', 100, 205],
  ['Eriador', 290, 150],
  ['Monts Brumeux', 520, 120],
  ['Rohan', 560, 470],
  ['Gondor', 660, 650],
  ['Mordor', 900, 660],
]

const ROUTE = JOURNEY.map((w) => `${w.x},${w.y}`).join(' ')

/** Boss de la quête placés sous leur étape */
const MAP_BOSSES = QUEST_BOSSES.map((b) => ({ boss: b, stop: JOURNEY.find((s) => s.name === b.stage)! }))

@Component({
  selector: 'app-journey',
  imports: [EncounterCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  template: `
    @let q = quest();
    @let p = pos();
    <section class="card">
      <div class="muted small">La Quête de l'Anneau : de Cul-de-Sac à la Montagne du Destin</div>
      <div class="stat-value">{{ shownKm().toFixed(0) }} / {{ journeyKm }} km</div>
      <div class="bar journey">
        <div [style.width.%]="progressPct()"></div>
      </div>
      <div class="small">
        @if (finished()) {
          💍🔥 L'Anneau est détruit. La Terre du Milieu te doit une fière chandelle !
        } @else if (q.encounter; as e) {
          {{ e.boss.emoji }} {{ e.boss.name }} bloque le passage à {{ e.boss.stage }} !
        } @else {
          Prochaine étape : {{ p.next?.name }} dans {{ p.kmToNext.toFixed(1) }} km
        }
      </div>
    </section>

    @if (q.encounter; as encounter) {
      <app-encounter-card [encounter]="encounter" />
    }

    <svg class="middle-earth" viewBox="0 0 1000 700" role="img" aria-label="Carte du voyage">
      <defs>
        <radialGradient id="parchment" cx="50%" cy="45%" r="75%">
          <stop offset="0%" stop-color="#f3e3bf" />
          <stop offset="100%" stop-color="#c9a86a" />
        </radialGradient>
        <radialGradient id="shadow" cx="88%" cy="85%" r="30%">
          <stop offset="0%" stop-color="#3b0d0d" stop-opacity="0.55" />
          <stop offset="100%" stop-color="#3b0d0d" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="1000" height="700" fill="url(#parchment)" />
      <rect width="1000" height="700" fill="url(#shadow)" />

      <!-- Anduin et Brandevin -->
      <path d="M560 70 C 575 200, 545 330, 590 430 S 640 560, 650 700" class="river" />
      <path d="M140 140 C 150 220, 135 300, 160 400" class="river thin" />

      @for (pts of mountains; track $index) {
        <polygon [attr.points]="pts" class="mountain" />
      }
      <polygon points="860,600 885,548 910,600" class="doom" />

      @for (l of labels; track l[0]) {
        <text [attr.x]="l[1]" [attr.y]="l[2]" class="region">{{ l[0] }}</text>
      }

      <polyline [attr.points]="route" class="route" />
      <polyline [attr.points]="done()" class="route-done" />

      @for (w of journey; track w.name; let i = $index) {
        <g>
          <circle [attr.cx]="w.x" [attr.cy]="w.y" r="6" class="stop" [class.reached]="i < p.reached" />
          @if (i <= p.reached) {
            <text [attr.x]="w.x + 9" [attr.y]="w.y - 8" class="stop-name">{{ w.name }}</text>
          }
        </g>
      }

      @for (m of mapBosses; track m.boss.name) {
        <text [attr.x]="m.stop.x - 30" [attr.y]="m.stop.y + 30" class="map-boss">
          {{ defeatedNames().has(m.boss.name) ? '💀' : m.boss.emoji }}
        </text>
      }

      <text [attr.x]="p.x" [attr.y]="p.y + 9" class="hobbit" text-anchor="middle">💍</text>
    </svg>

    @if (current(); as c) {
      <blockquote class="card lore"><strong>{{ c.name }}</strong> — {{ c.lore }}</blockquote>
    }

    <ol class="stages">
      @for (w of journey; track w.name; let i = $index) {
        <li [class.reached]="i < p.reached">
          <span>{{ i < p.reached ? '✅' : '⬜' }}</span>
          <span class="grow">{{ i <= p.reached ? w.name : '???' }}</span>
          @for (m of mapBosses; track m.boss.name) {
            @if (m.boss.stage === w.name) {
              <span [title]="m.boss.name">
                {{ defeatedNames().has(m.boss.name) ? '💀' : i <= p.reached ? m.boss.emoji : '❓' }}
              </span>
            }
          }
          <span class="muted small">{{ w.km }} km</span>
        </li>
      }
    </ol>
  `,
})
export class Journey {
  readonly runs = input.required<Run[]>()

  protected readonly journey = JOURNEY
  protected readonly journeyKm = JOURNEY_KM
  protected readonly mountains = MOUNTAINS
  protected readonly labels = LABELS
  protected readonly route = ROUTE
  protected readonly mapBosses = MAP_BOSSES

  protected readonly quest = computed(() => questState(this.runs()))
  protected readonly pos = computed(() => journeyPosition(this.quest().progressKm))
  protected readonly shownKm = computed(() => Math.min(this.quest().progressKm, JOURNEY_KM))
  protected readonly progressPct = computed(() => Math.min(100, (this.quest().progressKm / JOURNEY_KM) * 100))
  protected readonly finished = computed(() => this.pos().finished && !this.quest().encounter)
  protected readonly defeatedNames = computed(() => new Set(this.quest().defeated.map((d) => d.boss.name)))
  protected readonly current = computed(() => JOURNEY[this.pos().reached - 1])
  protected readonly done = computed(() => {
    const pos = this.pos()
    return [...JOURNEY.slice(0, pos.reached).map((w) => `${w.x},${w.y}`), `${pos.x},${pos.y}`].join(' ')
  })
}
