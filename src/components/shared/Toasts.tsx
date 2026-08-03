import { useEffect, useState } from 'react'
import { subscribeToasts, type ToastItem } from '../../lib/toast'

export default function Toasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => subscribeToasts(setToasts), [])

  return (
    <div id="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type} show`}>
          {t.msg}
        </div>
      ))}
    </div>
  )
}