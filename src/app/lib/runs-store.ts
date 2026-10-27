import { DestroyRef, Injectable, inject, signal } from '@angular/core'
import { liveQuery } from 'dexie'
import { db, type Run } from './db'
import { levelInfo, type QuestBoss, questState, totalXp } from './game'

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

/** Courses stockées dans IndexedDB, synchronisées en direct */
@Injectable({ providedIn: 'root' })
export class RunsStore {
  readonly #runs = signal<Run[] | undefined>(undefined)
  /** `undefined` tant que la base n'est pas chargée */
  readonly runs = this.#runs.asReadonly()

  constructor() {
    const sub = liveQuery(() => db.runs.toArray()).subscribe({
      next: (runs) => this.#runs.set(runs),
      error: (e) => console.error(e),
    })
    inject(DestroyRef).onDestroy(() => sub.unsubscribe())
  }

  /** Enregistre de nouvelles courses et calcule les récompenses gagnées */
  async save(fresh: Run[]): Promise<Rewards> {
    const existing = this.#runs() ?? []
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
}
