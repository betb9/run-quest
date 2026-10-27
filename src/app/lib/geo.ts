import { gridPathCells, latLngToCell } from 'h3-js'
import type { Run, TrackPoint } from './db'

/** Résolution H3 des cases de la carte (~0,1 km² par hexagone) */
export const HEX_RES = 9

export function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b[0] - a[0])
  const dLon = toRad(b[1] - a[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function trackDistanceKm(points: TrackPoint[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += haversineKm([points[i - 1][0], points[i - 1][1]], [points[i][0], points[i][1]])
  }
  return total
}

/** Liste des hexagones traversés, en comblant les trous entre deux points éloignés */
export function cellsForTrack(points: TrackPoint[]): string[] {
  const cells = new Set<string>()
  let prev: string | null = null
  for (const [lat, lon] of points) {
    const cell = latLngToCell(lat, lon, HEX_RES)
    if (prev && prev !== cell) {
      try {
        gridPathCells(prev, cell).forEach((c) => cells.add(c))
      } catch {
        // gridPathCells échoue rarement (pentagones, trop grande distance) : on garde juste la case
      }
    }
    cells.add(cell)
    prev = cell
  }
  return [...cells]
}

export function buildRun(points: TrackPoint[], source: Run['source'], name: string): Run {
  const startedAt = points[0]?.[2] || Date.now()
  const endedAt = points[points.length - 1]?.[2] || startedAt
  return {
    name,
    startedAt,
    durationSec: Math.max(0, Math.round((endedAt - startedAt) / 1000)),
    distanceKm: trackDistanceKm(points),
    points,
    cells: cellsForTrack(points),
    source,
  }
}

export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const mm = String(m).padStart(h ? 2 : 1, '0')
  const ss = String(s).padStart(2, '0')
  return h ? `${h}h${mm}:${ss}` : `${mm}:${ss}`
}

/** Allure en min/km, ex. "5'32\"" */
export function formatPace(durationSec: number, distanceKm: number): string {
  if (!durationSec || distanceKm < 0.05) return '–'
  const secPerKm = Math.round(durationSec / distanceKm)
  return `${Math.floor(secPerKm / 60)}'${String(secPerKm % 60).padStart(2, '0')}"`
}
