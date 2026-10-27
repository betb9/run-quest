import { ENCOUNTER_DAYS, type Encounter, questBossXp } from '../lib/game'

const DAY = 86_400_000

/** Combat en cours contre un boss de la Quête */
export function EncounterCard({ encounter }: { encounter: Encounter }) {
  const { boss, damage, start, attempt } = encounter
  const hpLeft = Math.max(0, boss.hp - damage)
  const msLeft = start + ENCOUNTER_DAYS * DAY - Date.now()
  const expired = msLeft <= 0
  const daysLeft = Math.ceil(msLeft / DAY)

  return (
    <section className="card boss encounter">
      <div className="muted small">⚠️ Rencontre sur la route — {boss.stage}</div>
      <div className="boss-head">
        <span className="boss-emoji">{boss.emoji}</span>
        <div className="grow">
          <div className="boss-name">{boss.name}</div>
          <div className="small lore-line">{boss.taunt}</div>
          <div className="bar hp">
            <div style={{ width: `${(expired ? 1 : hpLeft / boss.hp) * 100}%` }} />
          </div>
          <div className="small">
            {expired
              ? `Le boss s'est retranché. Ta prochaine course relance le combat (${boss.hp} km en ${ENCOUNTER_DAYS} jours).`
              : `${hpLeft.toFixed(1)} / ${boss.hp} PV — ${daysLeft} jour(s) restant(s)${attempt > 1 ? ` · tentative ${attempt}` : ''}`}
          </div>
          <div className="muted small">L'Anneau n'avance plus tant qu'il n'est pas vaincu · récompense +{questBossXp(boss)} XP</div>
        </div>
      </div>
    </section>
  )
}
