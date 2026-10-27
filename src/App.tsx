import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { ConquestMap } from './components/ConquestMap'
import { Hero } from './components/Hero'
import { Journey } from './components/Journey'
import { LiveRun } from './components/LiveRun'
import { type Rewards, Runs, saveRuns } from './components/Runs'
import { db, type TrackPoint } from './lib/db'
import { questBossXp, titleFor } from './lib/game'
import { buildRun } from './lib/geo'
import { useWeeklyGoal } from './lib/settings'

type Tab = 'hero' | 'runs' | 'map' | 'journey'

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'hero', icon: '🛡️', label: 'Héros' },
  { id: 'runs', icon: '🏃', label: 'Courses' },
  { id: 'map', icon: '🗺️', label: 'Conquête' },
  { id: 'journey', icon: '💍', label: 'Quête' },
]

export default function App() {
  const runs = useLiveQuery(() => db.runs.toArray(), [])
  const [tab, setTab] = useState<Tab>('hero')
  const [live, setLive] = useState(false)
  const [rewards, setRewards] = useState<Rewards | null>(null)
  const [goal, setGoal] = useWeeklyGoal()

  if (!runs) return null

  const finishLive = async (points: TrackPoint[]) => {
    const name = `Course du ${new Date(points[0][2]).toLocaleDateString('fr-FR')}`
    setRewards(await saveRuns([buildRun(points, 'live', name)], runs))
    setLive(false)
  }

  if (live) return <LiveRun onFinish={finishLive} onCancel={() => setLive(false)} />

  return (
    <div className="app">
      <header className="topbar">⚔️ Run Quest</header>
      <main>
        {tab === 'hero' && <Hero runs={runs} goal={goal} onGoalChange={setGoal} />}
        {tab === 'runs' && <Runs runs={runs} onStartLive={() => setLive(true)} onRewards={setRewards} />}
        {tab === 'map' && <ConquestMap runs={runs} />}
        {tab === 'journey' && <Journey runs={runs} />}
      </main>
      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
      {rewards && <RewardsModal rewards={rewards} onClose={() => setRewards(null)} />}
    </div>
  )
}

function RewardsModal({ rewards, onClose }: { rewards: Rewards; onClose: () => void }) {
  const levelUp = rewards.levelAfter > rewards.levelBefore
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon">{levelUp ? '🎉' : '🎁'}</div>
        <h2>{levelUp ? `Niveau ${rewards.levelAfter} !` : 'Butin récolté'}</h2>
        {levelUp && <p className="title">Nouveau titre : {titleFor(rewards.levelAfter)}</p>}
        <ul className="loot">
          <li>🛣️ {rewards.km.toFixed(2)} km parcourus</li>
          <li>✨ +{rewards.xp} XP</li>
          <li>🗺️ {rewards.newCells} nouvelle(s) zone(s) conquise(s)</li>
          <li>⚔️ {rewards.km.toFixed(1)} dégâts infligés au boss de la semaine</li>
          {rewards.bossesDefeated.map((b) => (
            <li key={b.name} className="loot-boss">
              {b.emoji} {b.name} vaincu ! +{questBossXp(b)} XP
            </li>
          ))}
          {rewards.newEncounter && (
            <li className="loot-encounter">
              {rewards.newEncounter.emoji} {rewards.newEncounter.name} te barre la route ! {rewards.newEncounter.taunt}
            </li>
          )}
        </ul>
        <button className="btn primary big" onClick={onClose}>
          Continuer
        </button>
      </div>
    </div>
  )
}
