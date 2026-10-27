import type { TrackPoint } from './db'

export interface ParsedGpx {
  name: string
  points: TrackPoint[]
}

export function parseGpx(xml: string, fallbackName: string): ParsedGpx {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.querySelector('parsererror')) throw new Error(`${fallbackName} : GPX illisible`)

  const nodes = doc.querySelectorAll('trkpt, rtept')
  const points: TrackPoint[] = []
  nodes.forEach((node) => {
    const lat = parseFloat(node.getAttribute('lat') ?? '')
    const lon = parseFloat(node.getAttribute('lon') ?? '')
    const time = Date.parse(node.querySelector('time')?.textContent ?? '')
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      points.push([lat, lon, Number.isFinite(time) ? time : 0])
    }
  })
  if (points.length < 2) throw new Error(`${fallbackName} : aucun tracé trouvé`)

  const name = doc.querySelector('trk > name, metadata > name')?.textContent?.trim()
  return { name: name || fallbackName.replace(/\.gpx$/i, ''), points }
}
