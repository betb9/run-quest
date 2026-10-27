import Dexie, { type EntityTable } from 'dexie'

/** [latitude, longitude, timestamp ms] */
export type TrackPoint = [number, number, number]

export interface Run {
  id?: number
  name: string
  startedAt: number
  durationSec: number
  distanceKm: number
  points: TrackPoint[]
  /** Hexagones H3 traversés pendant la course */
  cells: string[]
  source: 'gpx' | 'live'
}

export const db = new Dexie('run-quest') as Dexie & {
  runs: EntityTable<Run, 'id'>
}

db.version(1).stores({ runs: '++id, startedAt' })

export async function exportBackup(): Promise<string> {
  const runs = await db.runs.toArray()
  return JSON.stringify({ version: 1, exportedAt: Date.now(), runs })
}

export async function importBackup(json: string): Promise<number> {
  const data = JSON.parse(json) as { runs?: Run[] }
  if (!Array.isArray(data.runs)) throw new Error('Fichier de sauvegarde invalide')
  const existing = new Set((await db.runs.toArray()).map((r) => r.startedAt))
  const fresh = data.runs.filter((r) => !existing.has(r.startedAt)).map(({ id: _id, ...r }) => r)
  await db.runs.bulkAdd(fresh)
  return fresh.length
}
