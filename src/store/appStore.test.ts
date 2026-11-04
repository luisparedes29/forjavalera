import { afterEach, describe, expect, it, vi } from 'vitest'

function fakeWindow(hash = '') {
  return {
    location: { hash },
    scrollTo: vi.fn(),
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    }
  }
}

describe('setProgresoSub', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('actualiza la sub-vista y escribe el hash', async () => {
    const win = fakeWindow('')
    vi.stubGlobal('window', win)
    const { useAppStore } = await import('./appStore')
    useAppStore.getState().setProgresoSub('historial', true)
    expect(useAppStore.getState().progresoSub).toBe('historial')
    expect(win.location.hash).toBe('historial')
  })

  it('hace scroll si el hash ya es el correcto', async () => {
    const win = fakeWindow('#historial')
    vi.stubGlobal('window', win)
    const { useAppStore } = await import('./appStore')
    useAppStore.getState().setProgresoSub('historial', true)
    expect(win.scrollTo).toHaveBeenCalledWith({ top: 0 })
  })

  it('no toca el hash ni hace scroll sin push', async () => {
    const win = fakeWindow('')
    vi.stubGlobal('window', win)
    const { useAppStore } = await import('./appStore')
    useAppStore.getState().setProgresoSub('historial')
    expect(useAppStore.getState().progresoSub).toBe('historial')
    expect(win.location.hash).toBe('')
    expect(win.scrollTo).not.toHaveBeenCalled()
  })
})
