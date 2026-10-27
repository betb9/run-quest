import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core'
import { db, exportBackup, importBackup, type Run } from '../lib/db'
import { runXp } from '../lib/game'
import { buildRun, formatDuration, formatPace } from '../lib/geo'
import { parseGpx } from '../lib/gpx'
import { type Rewards, RunsStore } from '../lib/runs-store'

@Component({
  selector: 'app-runs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  template: `
    <div class="actions">
      <button class="btn primary big" (click)="startLive.emit()">▶ Courir maintenant</button>
      <button class="btn big" (click)="gpxInput.click()">📥 Importer des GPX</button>
      <input
        #gpxInput
        type="file"
        accept=".gpx,application/gpx+xml,application/xml,text/xml"
        multiple
        hidden
        (change)="importGpx(gpxInput)"
      />
    </div>
    <p class="muted small">
      Depuis WorkoutDoors sur l'iPhone : ouvre la séance, exporte-la en GPX, puis enregistre-la dans Fichiers pour
      l'importer ici.
    </p>
    @if (message(); as m) {
      <pre class="card message small">{{ m }}</pre>
    }

    @if (sorted().length === 0) {
      <p class="card center muted">Aucune course pour l'instant. Ta quête commence ici !</p>
    }
    <ul class="run-list">
      @for (r of sorted(); track r.id) {
        <li class="card run">
          <div class="grow">
            <div class="run-name">{{ r.source === 'live' ? '📱' : '⌚' }} {{ r.name }}</div>
            <div class="muted small">
              {{ formatDate(r.startedAt) }} · {{ formatDuration(r.durationSec) }} ·
              {{ formatPace(r.durationSec, r.distanceKm) }}/km · {{ r.cells.length }} cases
            </div>
          </div>
          <div class="run-km">
            {{ r.distanceKm.toFixed(2) }} km
            <div class="xp-badge">+{{ runXp(r) }} XP</div>
          </div>
          <button class="icon-btn" aria-label="Supprimer" (click)="remove(r)">🗑</button>
        </li>
      }
    </ul>

    <section class="card backup">
      <div class="small muted">Tes données restent sur ce téléphone. Fais une sauvegarde de temps en temps.</div>
      <div class="actions">
        <button class="btn" (click)="downloadBackup()">💾 Sauvegarder</button>
        <button class="btn" (click)="backupInput.click()">♻️ Restaurer</button>
        <input #backupInput type="file" accept=".json,application/json" hidden (change)="restoreBackup(backupInput)" />
      </div>
    </section>
  `,
})
export class Runs {
  readonly runs = input.required<Run[]>()
  readonly startLive = output()
  readonly rewards = output<Rewards>()

  readonly #store = inject(RunsStore)
  protected readonly message = signal<string | null>(null)
  protected readonly sorted = computed(() => [...this.runs()].sort((a, b) => b.startedAt - a.startedAt))

  protected readonly formatDuration = formatDuration
  protected readonly formatPace = formatPace
  protected readonly runXp = runXp

  protected formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  protected async importGpx(input: HTMLInputElement) {
    const files = [...(input.files ?? [])]
    input.value = ''
    if (!files.length) return
    const known = new Set(this.runs().map((r) => r.startedAt))
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
    this.message.set(errors.length ? errors.join('\n') : null)
    if (fresh.length) this.rewards.emit(await this.#store.save(fresh))
  }

  protected async downloadBackup() {
    const blob = new Blob([await exportBackup()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `run-quest-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  protected async restoreBackup(input: HTMLInputElement) {
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    try {
      const n = await importBackup(await file.text())
      this.message.set(`${n} course(s) restaurée(s)`)
    } catch (e) {
      this.message.set((e as Error).message)
    }
  }

  protected async remove(run: Run) {
    if (run.id && confirm(`Supprimer « ${run.name} » ?`)) await db.runs.delete(run.id)
  }
}
