import { useEffect, useRef, useState } from 'react'
import type { TrackPoint } from '../lib/db'
import { formatDuration, formatPace, haversineKm, trackDistanceKm } from '../lib/geo'

interface Props {
  onFinish: (points: TrackPoint[]) => void
  onCancel: () => void
}

const MAX_ACCURACY_M = 30
const MIN_STEP_KM = 0.003
const MAX_SPEED_KMH = 40

export function LiveRun({ onFinish, onCancel }: Props) {
  const [points, setPoints] = useState<TrackPoint[]>([])
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [startedAt] = useState(Date.now)
  const [now, setNow] = useState(Date.now)
  const pointsRef = useRef<TrackPoint[]>([])

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000)

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setAccuracy(pos.coords.accuracy)
        setError(null)
        if (pos.coords.accuracy > MAX_ACCURACY_M) return
        const p: TrackPoint = [pos.coords.latitude, pos.coords.longitude, pos.timestamp]
        const prev = pointsRef.current[pointsRef.current.length - 1]
        if (prev) {
          const km = haversineKm([prev[0], prev[1]], [p[0], p[1]])
          const hours = (p[2] - prev[2]) / 3_600_000
          if (km < MIN_STEP_KM) return // bruit GPS à l'arrêt
          if (hours > 0 && km / hours > MAX_SPEED_KMH) return // saut aberrant
        }
        pointsRef.current = [...pointsRef.current, p]
        setPoints(pointsRef.current)
      },
      (err) => setError(err.code === err.PERMISSION_DENIED ? 'Accès à la position refusé' : 'Signal GPS perdu…'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 },
    )

    // Garde l'écran allumé : iOS suspend la page quand il se verrouille
    let wakeLock: WakeLockSentinel | null = null
    const requestWakeLock = async () => {
      try {
        wakeLock = await navigator.wakeLock?.request('screen')
      } catch {
        // non supporté ou refusé
      }
    }
    const onVisible = () => document.visibilityState === 'visible' && requestWakeLock()
    requestWakeLock()
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearInterval(tick)
      navigator.geolocation.clearWatch(watchId)
      document.removeEventListener('visibilitychange', onVisible)
      wakeLock?.release().catch(() => {})
    }
  }, [])

  const km = trackDistanceKm(points)
  const elapsed = Math.round((now - startedAt) / 1000)

  const stop = () => {
    if (km < 0.05) {
      if (confirm('Moins de 50 m enregistrés. Abandonner cette course ?')) onCancel()
      return
    }
    onFinish(points)
  }

  return (
    <div className="live">
      <div className="live-gps small">
        {error ?? (accuracy === null ? '📡 Recherche du GPS…' : `📡 Précision ±${Math.round(accuracy)} m`)}
      </div>
      <div className="live-km">{km.toFixed(2)}</div>
      <div className="muted">kilomètres</div>
      <div className="live-row">
        <div>
          <div className="live-val">{formatDuration(elapsed)}</div>
          <div className="muted small">durée</div>
        </div>
        <div>
          <div className="live-val">{formatPace(elapsed, km)}</div>
          <div className="muted small">allure /km</div>
        </div>
        <div>
          <div className="live-val">+{Math.round(km * 100)}</div>
          <div className="muted small">XP</div>
        </div>
      </div>
      <p className="muted small center">Garde l'écran allumé : si le téléphone se verrouille, le suivi s'interrompt.</p>
      <button className="btn danger big" onClick={stop}>
        ⏹ Terminer
      </button>
    </div>
  )
}
