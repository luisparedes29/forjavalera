import { useEffect, useState } from 'react'
import { dismissToast, subscribeToasts, type ToastItem } from '../../lib/toast'

export default function Toasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => subscribeToasts(setToasts), [])

  return (
    <div id="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type} show`}>
          <span>{t.msg}</span>
          {t.action ? (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                t.action?.run()
                dismissToast(t.id)
              }}
            >
              {t.action.label}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  )
}
