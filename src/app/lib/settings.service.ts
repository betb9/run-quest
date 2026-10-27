import { Injectable, signal } from '@angular/core'

const GOAL_KEY = 'run-quest:weekly-goal-km'

function readGoal(): number {
  try {
    const v = Number(localStorage.getItem(GOAL_KEY))
    return v > 0 ? v : 15
  } catch {
    return 15
  }
}

@Injectable({ providedIn: 'root' })
export class Settings {
  readonly #goal = signal(readGoal())
  /** Objectif hebdo en km = points de vie du boss de la semaine */
  readonly weeklyGoal = this.#goal.asReadonly()

  setWeeklyGoal(km: number) {
    this.#goal.set(km)
    try {
      localStorage.setItem(GOAL_KEY, String(km))
    } catch {
      // stockage indisponible (navigation privée) : on garde la valeur en mémoire
    }
  }
}
