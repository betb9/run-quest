import { cellsToMultiPolygon, getHexagonAreaAvg } from 'h3-js'
import { useMemo, useState } from 'react'
import { MapContainer, Polygon, Polyline, TileLayer } from 'react-leaflet'
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet'
import type { Run } from '../lib/db'
import { HEX_RES } from '../lib/geo'

const PARIS: LatLngExpression = [48.8566, 2.3522]

export function ConquestMap({ runs }: { runs: Run[] }) {
  const [showTracks, setShowTracks] = useState(false)

  const cells = useMemo(() => [...new Set(runs.flatMap((r) => r.cells))], [runs])
  const territory = useMemo(() => cellsToMultiPolygon(cells), [cells])
  const bounds = useMemo<LatLngBoundsExpression | undefined>(() => {
    const pts = runs.flatMap((r) => r.points.map((p) => [p[0], p[1]] as [number, number]))
    if (!pts.length) return undefined
    const lats = pts.map((p) => p[0])
    const lons = pts.map((p) => p[1])
    return [
      [Math.min(...lats), Math.min(...lons)],
      [Math.max(...lats), Math.max(...lons)],
    ]
  }, [runs])

  const areaKm2 = cells.length * getHexagonAreaAvg(HEX_RES, 'km2')

  return (
    <div className="page map-page">
      <div className="card map-header">
        <div>
          <div className="stat-value">{cells.length} zones</div>
          <div className="muted small">≈ {areaKm2.toFixed(2)} km² explorés</div>
        </div>
        <label className="small">
          <input type="checkbox" checked={showTracks} onChange={(e) => setShowTracks(e.target.checked)} /> Tracés
        </label>
      </div>
      <MapContainer
        className="map"
        {...(bounds ? { bounds, boundsOptions: { padding: [20, 20] } } : { center: PARIS, zoom: 12 })}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polygon
          positions={territory as LatLngExpression[][][]}
          pathOptions={{ color: '#f97316', weight: 1, fillColor: '#f97316', fillOpacity: 0.35 }}
        />
        {showTracks &&
          runs.map((r) => (
            <Polyline
              key={r.id}
              positions={r.points.map((p) => [p[0], p[1]] as [number, number])}
              pathOptions={{ color: '#7c3aed', weight: 2, opacity: 0.7 }}
            />
          ))}
      </MapContainer>
      <p className="muted small">Chaque hexagone traversé est conquis. Explore de nouvelles rues pour agrandir ton territoire !</p>
    </div>
  )
}
