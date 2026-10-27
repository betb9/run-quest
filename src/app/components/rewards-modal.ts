import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core'
import { questBossXp, titleFor } from '../lib/game'
import type { Rewards } from '../lib/runs-store'

@Component({
  selector: 'app-rewards-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'modal-backdrop', '(click)': 'close.emit()' },
  template: `
    @let r = rewards();
    <div class="modal card" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
      <div class="modal-icon">{{ levelUp() ? '🎉' : '🎁' }}</div>
      <h2>{{ levelUp() ? 'Niveau ' + r.levelAfter + ' !' : 'Butin récolté' }}</h2>
      @if (levelUp()) {
        <p class="title">Nouveau titre : {{ titleFor(r.levelAfter) }}</p>
      }
      <ul class="loot">
        <li>🛣️ {{ r.km.toFixed(2) }} km parcourus</li>
        <li>✨ +{{ r.xp }} XP</li>
        <li>🗺️ {{ r.newCells }} nouvelle(s) zone(s) conquise(s)</li>
        <li>⚔️ {{ r.km.toFixed(1) }} dégâts infligés au boss de la semaine</li>
        @for (b of r.bossesDefeated; track b.name) {
          <li class="loot-boss">{{ b.emoji }} {{ b.name }} vaincu ! +{{ questBossXp(b) }} XP</li>
        }
        @if (r.newEncounter; as e) {
          <li class="loot-encounter">{{ e.emoji }} {{ e.name }} te barre la route ! {{ e.taunt }}</li>
        }
      </ul>
      <button class="btn primary big" (click)="close.emit()">Continuer</button>
    </div>
  `,
})
export class RewardsModal {
  readonly rewards = input.required<Rewards>()
  readonly close = output()

  protected readonly levelUp = computed(() => this.rewards().levelAfter > this.rewards().levelBefore)
  protected readonly titleFor = titleFor
  protected readonly questBossXp = questBossXp
}
