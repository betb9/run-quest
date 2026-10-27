import type { Run } from './db'

// ---------- XP & niveaux ----------

export function runXp(run: Pick<Run, 'distanceKm'>): number {
  const base = Math.round(run.distanceKm * 100) + 50
  return run.distanceKm >= 10 ? Math.round(base * 1.25) : base
}

/** XP cumulée nécessaire pour atteindre un niveau */
export function xpToReach(level: number): number {
  return level <= 1 ? 0 : Math.round(250 * (level - 1) ** 1.5)
}

export function levelInfo(totalXp: number) {
  let level = 1
  while (totalXp >= xpToReach(level + 1)) level++
  const floor = xpToReach(level)
  return { level, current: totalXp - floor, needed: xpToReach(level + 1) - floor }
}

const TITLES: [number, string][] = [
  [1, 'Joggeur du dimanche'],
  [5, 'Coureur des rues'],
  [10, 'Arpenteur'],
  [15, 'Pisteur'],
  [20, 'Coureur des bois'],
  [30, 'Vagabond infatigable'],
  [40, 'Ultra-traileur'],
  [50, 'Légende des sentiers'],
]

export function titleFor(level: number): string {
  return TITLES.filter(([min]) => level >= min).pop()![1]
}

// ---------- Semaines & boss ----------

const DAY = 86_400_000

/** Lundi 00:00 (heure locale) de la semaine contenant `ts` */
export function weekStart(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.getTime()
}

export interface Boss {
  emoji: string
  name: string
}

const BOSSES: Boss[] = [
  { emoji: '🛋️', name: 'Golem du Canapé' },
  { emoji: '🐌', name: 'Limace de la Flemme' },
  { emoji: '🌧️', name: 'Esprit de la Pluie' },
  { emoji: '🍕', name: 'Ogre de la Malbouffe' },
  { emoji: '😴', name: 'Hydre de la Grasse Mat' },
  { emoji: '📱', name: 'Démon du Scroll' },
  { emoji: '🥶', name: "Yéti de l'Hiver" },
  { emoji: '🐉', name: 'Dragon de la Procrastination' },
]

export function bossForWeek(weekTs: number): Boss {
  const index = Math.floor((weekTs + 4 * DAY) / (7 * DAY)) // stable pour une semaine donnée
  return BOSSES[((index % BOSSES.length) + BOSSES.length) % BOSSES.length]
}

export function kmByWeek(runs: Run[]): Map<number, number> {
  const map = new Map<number, number>()
  for (const r of runs) {
    const w = weekStart(r.startedAt)
    map.set(w, (map.get(w) ?? 0) + r.distanceKm)
  }
  return map
}

/** Nombre de semaines consécutives avec au moins une course (la semaine en cours compte si déjà courue) */
export function weekStreak(runs: Run[], now = Date.now()): number {
  const weeks = kmByWeek(runs)
  let w = weekStart(now)
  if (!weeks.has(w)) w = weekStart(w - DAY)
  let streak = 0
  while (weeks.has(w)) {
    streak++
    w = weekStart(w - DAY)
  }
  return streak
}

// ---------- Voyage : la Quête de l'Anneau ----------

export interface Waypoint {
  name: string
  /** km cumulés depuis le départ (approximatifs) */
  km: number
  /** position sur la carte stylisée (viewBox 1000 × 700) */
  x: number
  y: number
  lore: string
}

export const JOURNEY: Waypoint[] = [
  { name: 'Cul-de-Sac', km: 0, x: 90, y: 250, lore: "Tout commence à Hobbitebourg. Le chemin s'en va, s'en va…" },
  { name: 'Pays de Bouc', km: 80, x: 150, y: 262, lore: 'Le bac de Fertébouc est franchi juste à temps.' },
  { name: 'Bree', km: 217, x: 230, y: 240, lore: 'Une auberge, un rôdeur mystérieux et une bonne bière.' },
  { name: 'Mont Venteux', km: 386, x: 320, y: 228, lore: 'Des silhouettes noires rôdent autour des ruines…' },
  { name: 'Gué de la Bruinen', km: 708, x: 418, y: 232, lore: 'La rivière se soulève et emporte les cavaliers noirs.' },
  { name: 'Fondcombe', km: 737, x: 445, y: 212, lore: 'Repos chez les Elfes. La Communauté est formée.' },
  { name: 'Houx', km: 1050, x: 425, y: 325, lore: "Des corbeaux espions survolent l'ancienne terre elfique." },
  { name: 'Caradhras', km: 1130, x: 475, y: 345, lore: 'La neige et le vent forcent la Communauté à faire demi-tour.' },
  { name: 'Porte de la Moria', km: 1250, x: 455, y: 385, lore: 'Parle, ami, et entre.' },
  { name: 'Pont de Khazad-dûm', km: 1320, x: 505, y: 392, lore: 'Une ombre de feu se dresse sur le pont étroit.' },
  { name: 'Lothlórien', km: 1481, x: 565, y: 400, lore: "Les mellyrn dorés offrent un répit hors du temps." },
  { name: 'Argonath', km: 1990, x: 618, y: 495, lore: 'Deux rois de pierre gardent le fleuve.' },
  { name: 'Amon Hen', km: 2107, x: 632, y: 522, lore: 'La Communauté se brise. Deux hobbits continuent seuls.' },
  { name: 'Emyn Muil', km: 2200, x: 685, y: 512, lore: 'Un labyrinthe de rochers… et une créature qui suit à la trace.' },
  { name: 'Marais des Morts', km: 2330, x: 742, y: 505, lore: "Ne suivez pas les lumières !" },
  { name: 'Morannon', km: 2430, x: 800, y: 488, lore: 'La Porte Noire est fermée. Il faut un autre chemin.' },
  { name: 'Ithilien', km: 2560, x: 765, y: 590, lore: "Une dernière forêt verte avant l'ombre." },
  { name: 'Cirith Ungol', km: 2680, x: 812, y: 612, lore: "L'escalier, le tunnel… et ce qui y vit." },
  { name: 'Montagne du Destin', km: 2863, x: 885, y: 580, lore: "Le feu de l'Orodruin. La quête s'achève ici." },
]

export const JOURNEY_KM = JOURNEY[JOURNEY.length - 1].km

export function journeyPosition(totalKm: number) {
  const km = Math.min(totalKm, JOURNEY_KM)
  const nextIndex = JOURNEY.findIndex((w) => w.km > km)
  if (nextIndex === -1) {
    const last = JOURNEY[JOURNEY.length - 1]
    return { x: last.x, y: last.y, reached: JOURNEY.length, next: null, kmToNext: 0, finished: true }
  }
  const a = JOURNEY[nextIndex - 1]
  const b = JOURNEY[nextIndex]
  const t = (km - a.km) / (b.km - a.km)
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    reached: nextIndex,
    next: b,
    kmToNext: b.km - km,
    finished: false,
  }
}

// ---------- Boss de la Quête ----------

export interface QuestBoss {
  /** Étape du voyage où le boss barre la route */
  stage: string
  emoji: string
  name: string
  /** Points de vie = km à courir en 7 jours */
  hp: number
  taunt: string
}

export const QUEST_BOSSES: QuestBoss[] = [
  { stage: 'Mont Venteux', emoji: '👻', name: 'Les Nazgûl', hp: 10, taunt: 'Cinq ombres encerclent le campement…' },
  { stage: 'Caradhras', emoji: '❄️', name: 'La Tempête du Caradhras', hp: 12, taunt: 'La montagne elle-même refuse le passage.' },
  { stage: 'Porte de la Moria', emoji: '🐙', name: "Le Guetteur de l'Eau", hp: 8, taunt: "Des tentacules jaillissent de l'eau noire !" },
  { stage: 'Pont de Khazad-dûm', emoji: '🔥', name: 'Le Balrog', hp: 21, taunt: 'Un semi-marathon pour lui échapper. Fuis !' },
  { stage: 'Amon Hen', emoji: '🪓', name: 'Les Uruk-hai', hp: 15, taunt: "Les cors de l'Isengard résonnent dans la forêt." },
  { stage: 'Emyn Muil', emoji: '🐟', name: 'Gollum', hp: 10, taunt: 'Il veut son précieux…' },
  { stage: 'Cirith Ungol', emoji: '🕷️', name: 'Arachne', hp: 18, taunt: 'Des toiles collantes obstruent le tunnel.' },
  { stage: 'Montagne du Destin', emoji: '👁️', name: "L'Œil de Sauron", hp: 30, taunt: "L'Œil s'est tourné vers toi. Dernier effort !" },
]

const QUEST_BOSS_KM = new Map(QUEST_BOSSES.map((b) => [b, JOURNEY.find((w) => w.name === b.stage)!.km]))
const ORDERED_BOSSES = [...QUEST_BOSSES].sort((a, b) => QUEST_BOSS_KM.get(a)! - QUEST_BOSS_KM.get(b)!)

export const ENCOUNTER_DAYS = 7

export function questBossXp(boss: QuestBoss): number {
  return boss.hp * 50
}

export interface Encounter {
  boss: QuestBoss
  /** début de la tentative en cours */
  start: number
  damage: number
  attempt: number
}

export interface QuestState {
  /** km parcourus sur la route (bloqués tant qu'un boss n'est pas vaincu) */
  progressKm: number
  defeated: { boss: QuestBoss; at: number }[]
  encounter: Encounter | null
}

/** Rejoue toutes les courses dans l'ordre pour déduire l'état de la quête */
export function questState(runs: Run[]): QuestState {
  const sorted = [...runs].sort((a, b) => a.startedAt - b.startedAt)
  const defeated: QuestState['defeated'] = []
  let progressKm = 0
  let encounter = null as Encounter | null

  for (const run of sorted) {
    let km = run.distanceKm
    if (encounter && run.startedAt >= encounter.start + ENCOUNTER_DAYS * DAY) {
      // tentative expirée : le combat reprend à zéro
      encounter = { ...encounter, start: run.startedAt, damage: 0, attempt: encounter.attempt + 1 }
    }
    while (km > 1e-9) {
      if (encounter) {
        const hit = Math.min(km, encounter.boss.hp - encounter.damage)
        encounter.damage += hit
        km -= hit
        if (encounter.damage < encounter.boss.hp - 1e-9) break
        defeated.push({ boss: encounter.boss, at: run.startedAt })
        encounter = null
      } else {
        const next = ORDERED_BOSSES[defeated.length]
        const room = next ? QUEST_BOSS_KM.get(next)! - progressKm : Infinity
        if (km < room) {
          progressKm += km
          km = 0
        } else {
          progressKm += room
          km -= room
          encounter = { boss: next, start: run.startedAt, damage: 0, attempt: 1 }
        }
      }
    }
  }
  return { progressKm: Math.min(progressKm, JOURNEY_KM), defeated, encounter }
}

/** XP totale : courses + bonus des boss de la quête vaincus */
export function totalXp(runs: Run[]): number {
  const fromRuns = runs.reduce((sum, r) => sum + runXp(r), 0)
  return fromRuns + questState(runs).defeated.reduce((sum, d) => sum + questBossXp(d.boss), 0)
}
