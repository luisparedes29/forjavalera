import { useAppStore } from '../../store/appStore'
import { TABS } from './tabs'

export default function NavTabbar() {
  const view = useAppStore((s) => s.view)
  const setView = useAppStore((s) => s.setView)

  return (
    <nav className="tabbar" role="tablist" aria-label="Secciones de la app">
      {TABS.map((t) => (
        <button
          key={t.v}
          className={`tabbar-btn${view === t.v ? ' active' : ''}`}
          data-view={t.v}
          role="tab"
          aria-selected={view === t.v}
          onClick={() => setView(t.v, true)}
        >
          {t.icon}
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  )
}