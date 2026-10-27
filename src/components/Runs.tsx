import { useRef, useState } from 'react'
import { db, exportBackup, importBackup, type Run } from '../lib/db'
import { levelInfo, type QuestBoss, questState, runXp, totalXp } from '../lib/game'
import { buildRun, formatDuration, formatPace } from '../lib/geo'
import { parseGpx } from '../lib/gpx'

export interface Rewards {
  km: number
  xp: number
  levelBefore: number
  levelAfter: number
  newCells: number
  bossesDefeated: QuestBoss[]
  /** boss de la quête rencontré lors de ces courses (combat en cours) */
  newEncounter: QuestBoss | null
}

/** Enregistre de nouvelles courses et calcule les récompenses gagnées */
export async function saveRuns(fresh: Run[], existing: Run[]): Promise<Rewards> {
  const all = [...existing, ...fresh]
  const xpBefore = totalXp(existing)
  const xpAfter = totalXp(all)
  const questBefore = questState(existing)
  const questAfter = questState(all)
  const known = new Set(existing.flatMap((r) => r.cells))
  const newCells = new Set(fresh.flatMap((r) => r.cells).filter((c) => !known.has(c))).size
  await db.runs.bulkAdd(fresh)
  const encounterAfter = questAfter.encounter?.boss ?? null
  return {
    km: fresh.reduce((s, r) => s + r.distanceKm, 0),
    xp: xpAfter - xpBefore,
    levelBefore: levelInfo(xpBefore).level,
    levelAfter: levelInfo(xpAfter).level,
    newCells,
    bossesDefeated: questAfter.defeated.slice(questBefore.defeated.length).map((d) => d.boss),
    newEncounter: encounterAfter !== (questBefore.encounter?.boss ?? null) ? encounterAfter : null,
  }
}

interface Props {
  runs: Run[]
  onStartLive: () => void
  onRewards: (r: Rewards) => void
}

export function Runs({ runs, onStartLive, onRewards }: Props) {
  const gpxInput = useRef<HTMLInputElement>(null)
  const backupInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)

  const importGpx = async (files: FileList | null) => {
    if (!files?.length) return
    const known = new Set(runs.map((r) => r.startedAt))
    const fresh: Run[] = []
    const errors: string[] = []
    for (const file of files) {
      try {
        const { name, points } = parseGpx(await file.text(), file.name)
        const run = buildRun(points, 'gpx', name)
        if (known.has(run.startedAt)) errors.push(`${file.name} : déjà importée`)
        else {
          fresh.push(run)
          known.add(run.startedAt)
        }
      } catch (e) {
        errors.push((e as Error).message)
      }
    }
    setMessage(errors.length ? errors.join('\n') : null)
    if (fresh.length) onRewards(await saveRuns(fresh, runs))
  }

  const downloadBackup = async () => {
    const blob = new Blob([await exportBackup()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `run-quest-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const restoreBackup = async (file: File | undefined) => {
    if (!file) return
    try {
      const n = await importBackup(await file.text())
      setMessage(`${n} course(s) restaurée(s)`)
    } catch (e) {
      setMessage((e as Error).message)
    }
  }

  const remove = async (run: Run) => {
    if (run.id && confirm(`Supprimer « ${run.name} » ?`)) await db.runs.delete(run.id)
  }

  const sorted = [...runs].sort((a, b) => b.startedAt - a.startedAt)

  return (
    <div className="page">
      <div className="actions">
        <button className="btn primary big" onClick={onStartLive}>
          ▶ Courir maintenant
        </button>
        <button className="btn big" onClick={() => gpxInput.current?.click()}>
          📥 Importer des GPX
        </button>
        <input
          ref={gpxInput}
          type="file"
          accept=".gpx,application/gpx+xml,application/xml,text/xml"
          multiple
          hidden
          onChange={(e) => {
            importGpx(e.target.files)
            e.target.value = ''
          }}
        />
      </div>
      <p className="muted small">
        Depuis WorkoutDoors sur l'iPhone : ouvre la séance, exporte-la en GPX, puis enregistre-la dans Fichiers pour
        l'importer ici.
      </p>
      {message && <pre className="card message small">{message}</pre>}

      {sorted.length === 0 && <p className="card center muted">Aucune course pour l'instant. Ta quête commence ici !</p>}
      <ul className="run-list">
        {sorted.map((r) => (
          <li key={r.id} className="card run">
            <div className="grow">
              <div className="run-name">
                {r.source === 'live' ? '📱' : '⌚'} {r.name}
              </div>
              <div className="muted small">
                {new Date(r.startedAt).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}{' '}
                · {formatDuration(r.durationSec)} · {formatPace(r.durationSec, r.distanceKm)}/km · {r.cells.length} cases
              </div>
            </div>
            <div className="run-km">
              {r.distanceKm.toFixed(2)} km
              <div className="xp-badge">+{runXp(r)} XP</div>
            </div>
            <button className="icon-btn" aria-label="Supprimer" onClick={() => remove(r)}>
              🗑
            </button>
          </li>
        ))}
      </ul>

      <section className="card backup">
        <div className="small muted">
          Tes données restent sur ce téléphone. Fais une sauvegarde de temps en temps.
        </div>
        <div className="actions">
          <button className="btn" onClick={downloadBackup}>
            💾 Sauvegarder
          </button>
          <button className="btn" onClick={() => backupInput.current?.click()}>
            ♻️ Restaurer
          </button>
          <input
            ref={backupInput}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              restoreBackup(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>
      </section>
    </div>
  )
}
