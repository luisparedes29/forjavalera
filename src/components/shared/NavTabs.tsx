import { useAppStore } from '../../store/appStore'
import { TABS } from './tabs'

export default function NavTabs() {
  const view = useAppStore((s) => s.view)
  const setView = useAppStore((s) => s.setView)

  return (
    <nav className="tabs" role="tablist" aria-label="Secciones de la app">
      {TABS.map((t) => (
        <button
          key={t.v}
          className={`tab${view === t.v ? ' active' : ''}`}
          data-view={t.v}
          role="tab"
          aria-selected={view === t.v}
          onClick={() => setView(t.v, true)}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </nav>
  )
}