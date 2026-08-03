import { useEffect } from 'react'
import { useAppStore, type ViewId } from '../store/appStore'
import useReveal from '../hooks/useReveal'
import HierroView from './hierro/HierroView'
import CuerpoView from './cuerpo/CuerpoView'
import ProgresoView from './progreso/ProgresoView'

export default function ViewManager() {
  const view = useAppStore((s) => s.view)
  const ref = useReveal<HTMLDivElement>()

  useEffect(() => {
    const fromHash = (): void => {
      const h = window.location.hash.slice(1)
      const v: ViewId = h === 'cuerpo' || h === 'progreso' ? h : 'hierro'
      useAppStore.getState().setView(v, false)
    }
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
  }, [])

  return (
    <div ref={ref}>
      <div id="view-hierro" className={`view${view === 'hierro' ? ' active' : ''}`}>
        <HierroView />
      </div>
      <div id="view-cuerpo" className={`view${view === 'cuerpo' ? ' active' : ''}`}>
        <CuerpoView />
      </div>
      <div id="view-progreso" className={`view${view === 'progreso' ? ' active' : ''}`}>
        <ProgresoView />
      </div>
    </div>
  )
}