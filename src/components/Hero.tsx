import type { Run } from '../lib/db'
import { bossForWeek, kmByWeek, levelInfo, questState, titleFor, totalXp, weekStart, weekStreak } from '../lib/game'
import { formatPace } from '../lib/geo'
import { EncounterCard } from './EncounterCard'

interface Props {
  runs: Run[]
  goal: number
  onGoalChange: (km: number) => void
}

export function Hero({ runs, goal, onGoalChange }: Props) {
  const xp = totalXp(runs)
  const { level, current, needed } = levelInfo(xp)
  const quest = questState(runs)
  const totalKm = runs.reduce((sum, r) => sum + r.distanceKm, 0)

  const thisWeek = weekStart(Date.now())
  const weeks = kmByWeek(runs)
  const weekKm = weeks.get(thisWeek) ?? 0
  const boss = bossForWeek(thisWeek)
  const hpLeft = Math.max(0, goal - weekKm)
  const defeated = hpLeft === 0
  const pastWins = [...weeks].filter(([w, km]) => w !== thisWeek && km >= goal).length

  const longest = Math.max(0, ...runs.map((r) => r.distanceKm))
  const timed = runs.filter((r) => r.durationSec > 0 && r.distanceKm >= 1)
  const best = timed.sort((a, b) => a.durationSec / a.distanceKm - b.durationSec / b.distanceKm)[0]

  return (
    <div className="page">
      <section className="card hero">
        <div className="avatar">🏃</div>
        <div className="grow">
          <div className="level">Niveau {level}</div>
          <div className="title">{titleFor(level)}</div>
          <div className="bar xp">
            <div style={{ width: `${(current / needed) * 100}%` }} />
          </div>
          <div className="muted small">
            {current} / {needed} XP · total {xp} XP
          </div>
        </div>
      </section>

      {quest.encounter && <EncounterCard encounter={quest.encounter} />}

      <section className={`card boss ${defeated ? 'defeated' : ''}`}>
        <div className="muted small">Boss de la semaine</div>
        <div className="boss-head">
          <span className="boss-emoji">{defeated ? '💀' : boss.emoji}</span>
          <div className="grow">
            <div className="boss-name">{boss.name}</div>
            <div className="bar hp">
              <div style={{ width: `${(hpLeft / goal) * 100}%` }} />
            </div>
            <div className="small">
              {defeated
                ? `Vaincu ! ${weekKm.toFixed(1)} km de dégâts 🏆`
                : `${hpLeft.toFixed(1)} / ${goal} PV — encore ${hpLeft.toFixed(1)} km pour le terrasser`}
            </div>
          </div>
        </div>
        <label className="goal small muted">
          Objectif hebdo (PV du boss) :
          <input
            type="number"
            min={1}
            max={200}
            value={goal}
            onChange={(e) => {
              const v = Number(e.target.value)
              if (v > 0) onGoalChange(v)
            }}
          />
          km
        </label>
      </section>

      <section className="stats">
        <Stat icon="🛣️" label="Distance totale" value={`${totalKm.toFixed(1)} km`} />
        <Stat icon="🏃" label="Courses" value={String(runs.length)} />
        <Stat icon="🔥" label="Série" value={`${weekStreak(runs)} sem.`} />
        <Stat icon="⚔️" label="Boss hebdo vaincus" value={String(pastWins + (defeated ? 1 : 0))} />
        <Stat icon="💍" label="Boss de la Quête" value={`${quest.defeated.length} / 8`} />
        <Stat icon="🫁" label="Endurance (plus longue)" value={`${longest.toFixed(1)} km`} />
        <Stat icon="⚡" label="Vitesse (meilleure allure)" value={best ? `${formatPace(best.durationSec, best.distanceKm)}/km` : '–'} />
      </section>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="card stat">
      <span className="stat-icon">{icon}</span>
      <div className="stat-value">{value}</div>
      <div className="muted small">{label}</div>
    </div>
  )
}
