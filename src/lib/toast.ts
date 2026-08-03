export interface ToastItem {
  id: number
  msg: string
  type: 'ok' | 'warn'
}

export type ToastListener = (toasts: ToastItem[]) => void

const DURATION = 2950

let counter = 0
let toasts: ToastItem[] = []
const listeners = new Set<ToastListener>()

const nextId = (): number =>
  Date.now() + counter++

const emit = (): void => {
  for (const l of listeners) l(toasts)
}

export const toast = (msg: string, type: 'ok' | 'warn' = 'ok'): void => {
  const item: ToastItem = { id: nextId(), msg, type }
  toasts = [...toasts, item]
  emit()
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== item.id)
    emit()
  }, DURATION)
}

export const subscribeToasts = (listener: ToastListener): (() => void) => {
  listeners.add(listener)
  listener(toasts)
  return () => listeners.delete(listener)
}