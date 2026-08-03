import type { WeekState, SessionHistory, Exercise, BodyRecord } from './types'

export interface BackupV3 {
  app: string
  version: number
  exportedAt: string
  week: WeekState
  session: Exercise[]
  history: SessionHistory[]
  body: BodyRecord[]
}

export function buildBackup(
  week: WeekState,
  session: Exercise[],
  history: SessionHistory[],
  body: BodyRecord[]
): BackupV3 {
  return {
    app: 'FORJA',
    version: 3,
    exportedAt: new Date().toISOString(),
    week: { week: week.week, deload: week.deload },
    session: session.map((ex) => ({ ...ex, sets: ex.sets.map((s) => ({ ...s })) })),
    history: history.map((h) => ({ ...h, exercises: h.exercises.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s })) })) })),
    body: body.map((r) => ({ ...r, m: { ...r.m } }))
  }
}

export function parseBackup(text: string): BackupV3 {
  let d: unknown
  try {
    d = JSON.parse(text)
  } catch {
    throw new Error('Archivo de respaldo inválido')
  }
  if (!d || typeof d !== 'object') throw new Error('Archivo de respaldo inválido')
  const obj = d as BackupV3
  if (
    obj.history === undefined &&
    obj.body === undefined &&
    obj.session === undefined
  )
    throw new Error('Archivo de respaldo inválido')
  return obj
}

export function downloadBackup(blobOrText: string): void {
  const blob = new Blob([blobOrText], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `forja-respaldo-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(typeof r.result === 'string' ? r.result : '')
    r.onerror = () => reject(r.error)
    r.readAsText(file)
  })
}