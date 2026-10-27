import type { Run } from '../lib/db'
import { JOURNEY, JOURNEY_KM, journeyPosition, QUEST_BOSSES, questState } from '../lib/game'
import { EncounterCard } from './EncounterCard'

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

const route = JOURNEY.map((w) => `${w.x},${w.y}`).join(' ')

export function Journey({ runs }: { runs: Run[] }) {
  const quest = questState(runs)
  const totalKm = quest.progressKm
  const pos = journeyPosition(totalKm)
  const finished = pos.finished && !quest.encounter
  const defeatedNames = new Set(quest.defeated.map((d) => d.boss.name))
  const done = [...JOURNEY.slice(0, pos.reached).map((w) => `${w.x},${w.y}`), `${pos.x},${pos.y}`].join(' ')
  const current = JOURNEY[pos.reached - 1]

  return (
    <div className="page">
      <section className="card">
        <div className="muted small">La Quête de l'Anneau : de Cul-de-Sac à la Montagne du Destin</div>
        <div className="stat-value">
          {Math.min(totalKm, JOURNEY_KM).toFixed(0)} / {JOURNEY_KM} km
        </div>
        <div className="bar journey">
          <div style={{ width: `${Math.min(100, (totalKm / JOURNEY_KM) * 100)}%` }} />
        </div>
        <div className="small">
          {finished
            ? "💍🔥 L'Anneau est détruit. La Terre du Milieu te doit une fière chandelle !"
            : quest.encounter
              ? `${quest.encounter.boss.emoji} ${quest.encounter.boss.name} bloque le passage à ${quest.encounter.boss.stage} !`
              : `Prochaine étape : ${pos.next!.name} dans ${pos.kmToNext.toFixed(1)} km`}
        </div>
      </section>

      {quest.encounter && <EncounterCard encounter={quest.encounter} />}

      <svg className="middle-earth" viewBox="0 0 1000 700" role="img" aria-label="Carte du voyage">
        <defs>
          <radialGradient id="parchment" cx="50%" cy="45%" r="75%">
            <stop offset="0%" stopColor="#f3e3bf" />
            <stop offset="100%" stopColor="#c9a86a" />
          </radialGradient>
          <radialGradient id="shadow" cx="88%" cy="85%" r="30%">
            <stop offset="0%" stopColor="#3b0d0d" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#3b0d0d" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1000" height="700" fill="url(#parchment)" />
        <rect width="1000" height="700" fill="url(#shadow)" />

        {/* Anduin et Brandevin */}
        <path d="M560 70 C 575 200, 545 330, 590 430 S 640 560, 650 700" className="river" />
        <path d="M140 140 C 150 220, 135 300, 160 400" className="river thin" />

        {MOUNTAINS.map((pts, i) => (
          <polygon key={i} points={pts} className="mountain" />
        ))}
        <polygon points="860,600 885,548 910,600" className="doom" />

        {LABELS.map(([text, x, y]) => (
          <text key={text} x={x} y={y} className="region">
            {text}
          </text>
        ))}

        <polyline points={route} className="route" />
        <polyline points={done} className="route-done" />

        {JOURNEY.map((w, i) => (
          <g key={w.name}>
            <circle cx={w.x} cy={w.y} r={6} className={i < pos.reached ? 'stop reached' : 'stop'} />
            {(i < pos.reached || i === pos.reached) && (
              <text x={w.x + 9} y={w.y - 8} className="stop-name">
                {w.name}
              </text>
            )}
          </g>
        ))}

        {QUEST_BOSSES.map((b) => {
          const w = JOURNEY.find((s) => s.name === b.stage)!
          return (
            <text key={b.name} x={w.x - 30} y={w.y + 30} className="map-boss">
              {defeatedNames.has(b.name) ? '💀' : b.emoji}
            </text>
          )
        })}

        <text x={pos.x} y={pos.y + 9} className="hobbit" textAnchor="middle">
          💍
        </text>
      </svg>

      {current && (
        <blockquote className="card lore">
          <strong>{current.name}</strong> — {current.lore}
        </blockquote>
      )}

      <ol className="stages">
        {JOURNEY.map((w, i) => (
          <li key={w.name} className={i < pos.reached ? 'reached' : ''}>
            <span>{i < pos.reached ? '✅' : '⬜'}</span>
            <span className="grow">{i <= pos.reached ? w.name : '???'}</span>
            {QUEST_BOSSES.filter((b) => b.stage === w.name).map((b) => (
              <span key={b.name} title={b.name}>
                {defeatedNames.has(b.name) ? '💀' : i <= pos.reached ? b.emoji : '❓'}
              </span>
            ))}
            <span className="muted small">{w.km} km</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
