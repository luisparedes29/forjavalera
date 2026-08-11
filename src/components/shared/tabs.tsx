import type { ReactNode } from 'react'
import type { ViewId } from '../../store/appStore'

export const TABS: Array<{ v: ViewId; label: string; icon: ReactNode }> = [
  {
    v: 'hierro',
    label: 'Hierro',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M6.5 6.5v11M17.5 6.5v11M2.5 9.5v5M21.5 9.5v5M6.5 12h11" />
      </svg>
    )
  },
  {
    v: 'cuerpo',
    label: 'Cuerpo',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
        <path d="M8.5 15a3.5 3.5 0 0 1 7 0" />
        <path d="M12 15l2.2-2.2" />
      </svg>
    )
  },
  {
    v: 'progreso',
    label: 'Progreso',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M17 7h4v4" />
      </svg>
    )
  }
]