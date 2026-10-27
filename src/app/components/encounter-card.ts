import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core'
import { ENCOUNTER_DAYS, type Encounter, questBossXp } from '../lib/game'

const DAY = 86_400_000

/** Combat en cours contre un boss de la Quête */
@Component({
  selector: 'app-encounter-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'card boss encounter', style: 'display: block' },
  template: `
    @let boss = encounter().boss;
    <div class="muted small">⚠️ Rencontre sur la route — {{ boss.stage }}</div>
    <div class="boss-head">
      <span class="boss-emoji">{{ boss.emoji }}</span>
      <div class="grow">
        <div class="boss-name">{{ boss.name }}</div>
        <div class="small lore-line">{{ boss.taunt }}</div>
        <div class="bar hp">
          <div [style.width.%]="(expired() ? 1 : hpLeft() / boss.hp) * 100"></div>
        </div>
        <div class="small">
          @if (expired()) {
            Le boss s'est retranché. Ta prochaine course relance le combat ({{ boss.hp }} km en {{ encounterDays }} jours).
          } @else {
            {{ hpLeft().toFixed(1) }} / {{ boss.hp }} PV — {{ daysLeft() }} jour(s) restant(s)
            @if (encounter().attempt > 1) {
              · tentative {{ encounter().attempt }}
            }
          }
        </div>
        <div class="muted small">
          L'Anneau n'avance plus tant qu'il n'est pas vaincu · récompense +{{ questBossXp(boss) }} XP
        </div>
      </div>
    </div>
  `,
})
export class EncounterCard {
  readonly encounter = input.required<Encounter>()

  protected readonly hpLeft = computed(() => Math.max(0, this.encounter().boss.hp - this.encounter().damage))
  readonly #msLeft = computed(() => this.encounter().start + ENCOUNTER_DAYS * DAY - Date.now())
  protected readonly expired = computed(() => this.#msLeft() <= 0)
  protected readonly daysLeft = computed(() => Math.ceil(this.#msLeft() / DAY))
  protected readonly encounterDays = ENCOUNTER_DAYS
  protected readonly questBossXp = questBossXp
}
