import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from '../../store/appStore'
import ProgresoView from './ProgresoView'

describe('ProgresoView', () => {
  beforeEach(() => {
    useAppStore.setState({ history: [], progresoSub: 'resumen' })
    useAppStore.getInitialState().progresoSub = 'resumen'
  })

  it('muestra el segmento y los stats en Resumen', () => {
    const html = renderToStaticMarkup(<ProgresoView />)
    expect(html).toContain('aria-label="Contenido de Progreso"')
    expect(html).toMatch(/aria-pressed="true"[^>]*>Resumen<\/button>/)
    expect(html).toContain('stats-progreso')
    expect(html).not.toContain('id="historyList"')
  })

  it('muestra el historial y oculta los stats en Historial', () => {
    useAppStore.setState({ progresoSub: 'historial' })
    useAppStore.getInitialState().progresoSub = 'historial'
    const html = renderToStaticMarkup(<ProgresoView />)
    expect(html).toMatch(/aria-pressed="true"[^>]*>Historial<\/button>/)
    expect(html).toContain('id="historyList"')
    expect(html).not.toContain('stats-progreso')
  })
})
