import { useState } from 'react'

const GOAL_KEY = 'run-quest:weekly-goal-km'

function readGoal(): number {
  try {
    const v = Number(localStorage.getItem(GOAL_KEY))
    return v > 0 ? v : 15
  } catch {
    return 15
  }
}

/** Objectif hebdo en km = points de vie du boss de la semaine */
export function useWeeklyGoal(): [number, (km: number) => void] {
  const [goal, setGoal] = useState(readGoal)
  const update = (km: number) => {
    setGoal(km)
    try {
      localStorage.setItem(GOAL_KEY, String(km))
    } catch {
      // stockage indisponible (navigation privée) : on garde la valeur en mémoire
    }
  }
  return [goal, update]
}
