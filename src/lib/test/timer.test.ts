import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTimerStore } from '../../store/timerStore'
import { remainingAt } from '../timer'
import { beep, vibrate } from '../audio'

vi.mock('../audio', () => ({ beep: vi.fn(), vibrate: vi.fn() }))

const reset = (): void => {
  useTimerStore.getState().stop()
  useTimerStore.setState({
    running: false,
    done: false,
    total: 0,
    left: 0,
    paused: false,
    label: 'descanso',
    endsAt: null
  })
  vi.mocked(beep).mockClear()
  vi.mocked(vibrate).mockClear()
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-23T10:00:00Z'))
  reset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('remainingAt', () => {
  it('redondea hacia arriba y nunca baja de 0', () => {
    expect(remainingAt(10_000, 9_001)).toBe(1)
    expect(remainingAt(10_000, 10_000)).toBe(0)
    expect(remainingAt(10_000, 12_000)).toBe(0)
  })
})

describe('timerStore por timestamp', () => {
  it('start fija endsAt y left', () => {
    useTimerStore.getState().start(180, 'press banca')
    const s = useTimerStore.getState()
    expect(s.running).toBe(true)
    expect(s.left).toBe(180)
    expect(s.endsAt).toBe(Date.now() + 180_000)
  })

  it('sync corrige el tiempo tras un salto de pantalla apagada', () => {
    useTimerStore.getState().start(180, 'press banca')
    vi.setSystemTime(new Date('2026-10-23T10:03:00Z'))
    useTimerStore.getState().sync()
    const s = useTimerStore.getState()
    expect(s.left).toBe(0)
    expect(s.done).toBe(true)
    expect(s.running).toBe(false)
    expect(beep).toHaveBeenCalledTimes(1)
  })

  it('pausa congela el restante y reanuda con endsAt nuevo', () => {
    useTimerStore.getState().start(180, 'press banca')
    vi.setSystemTime(new Date('2026-10-23T10:00:30Z'))
    useTimerStore.getState().toggle()
    expect(useTimerStore.getState().left).toBe(150)
    expect(useTimerStore.getState().endsAt).toBeNull()

    vi.setSystemTime(new Date('2026-10-23T10:02:00Z'))
    useTimerStore.getState().sync()
    expect(useTimerStore.getState().left).toBe(150)

    useTimerStore.getState().toggle()
    expect(useTimerStore.getState().endsAt).toBe(Date.now() + 150_000)

    vi.setSystemTime(new Date('2026-10-23T10:02:30Z'))
    useTimerStore.getState().sync()
    expect(useTimerStore.getState().left).toBe(120)
  })

  it('add extiende el restante y el total', () => {
    useTimerStore.getState().start(180, 'press banca')
    vi.setSystemTime(new Date('2026-10-23T10:00:10Z'))
    useTimerStore.getState().sync()
    useTimerStore.getState().add(15)
    const s = useTimerStore.getState()
    expect(s.left).toBe(185)
    expect(s.total).toBe(185)
    expect(s.endsAt).toBe(Date.now() + 185_000)
  })

  it('finish es idempotente y no duplica el beep', () => {
    useTimerStore.getState().start(1, 'press banca')
    vi.setSystemTime(new Date('2026-10-23T10:00:02Z'))
    useTimerStore.getState().sync()
    useTimerStore.getState().finish()
    expect(beep).toHaveBeenCalledTimes(1)
    expect(vibrate).toHaveBeenCalledTimes(1)
  })
})
