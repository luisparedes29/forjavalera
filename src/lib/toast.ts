export interface ToastAction {
  label: string
  run: () => void
}

export interface ToastItem {
  id: number
  msg: string
  type: 'ok' | 'warn'
  action?: ToastAction
}

export type ToastListener = (toasts: ToastItem[]) => void

const DURATION = 2950
const ACTION_DURATION = 6000

let counter = 0
let toasts: ToastItem[] = []
const listeners = new Set<ToastListener>()

const nextId = (): number => Date.now() + counter++

const emit = (): void => {
  for (const l of listeners) l(toasts)
}

export const dismissToast = (id: number): void => {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export const toast = (
  msg: string,
  type: 'ok' | 'warn' = 'ok',
  action?: ToastAction
): void => {
  const item: ToastItem = { id: nextId(), msg, type, action }
  toasts = [...toasts, item]
  emit()
  setTimeout(() => dismissToast(item.id), action ? ACTION_DURATION : DURATION)
}

export const subscribeToasts = (listener: ToastListener): (() => void) => {
  listeners.add(listener)
  listener(toasts)
  return () => listeners.delete(listener)
}
