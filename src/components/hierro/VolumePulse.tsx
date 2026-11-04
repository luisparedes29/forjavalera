import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { GCOLORS, GROUPS, SET_GUIDE } from '../../data/routine'
import { weeklyVolume } from '../../lib/logic'
import type { WeeklyVolumeEntry } from '../../lib/logic'
import type { SessionHistory } from '../../lib/types'
import { useAppStore } from '../../store/appStore'

const SCALE = 24
const STATUS: Record<string, string> = {
  none: 'sin trabajo',
  low: 'bajo',
  ok: 'en rango',
  high: 'alto'
}

export default function VolumePulse() {
  const history = useAppStore((s) => s.history)
  const exercises = useAppStore((s) => s.exercises)
  const [now, setNow] = useState<number | null>(null)
  const hasExercises = exercises.length > 0

  useEffect(() => {
    if (!hasExercises) {
      setNow(null)
      return
    }
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [hasExercises])

  const wv = useMemo<Record<string, WeeklyVolumeEntry>>(() => {
    if (now === null) return {}
    const live: SessionHistory | null = hasExercises
      ? {
          id: 'live',
          ts: new Date(now).toISOString(),
          volume: 0,
          focus: '',
          exercises
        }
      : null
    return weeklyVolume(live ? [live, ...history] : history, now)
  }, [now, history, exercises, hasExercises])

  if (now === null || !hasExercises) return null

  const groups = Object.keys(SET_GUIDE).filter((g) => wv[g])
  if (!groups.length) return null

  let total = 0
  let inRange = 0
  groups.forEach((g) => {
    const sets = wv[g].sets
    total += sets
    if (sets >= SET_GUIDE[g].min && sets <= SET_GUIDE[g].max) inRange++
  })

  return (
    <details className="volume-pulse">
      <summary>
        <span className="vp-title">Volumen en vivo</span>
        <span className="vp-sum" aria-live="polite" aria-atomic="true">
          {total} series · {inRange}/{groups.length} en rango
        </span>
      </summary>
      <div className="vp-list">
        {groups.map((g) => {
          const d = wv[g]
          const guide = SET_GUIDE[g]
          const cls =
            d.sets === 0
              ? 'none'
              : d.sets < guide.min
                ? 'low'
                : d.sets > guide.max
                  ? 'high'
                  : 'ok'
          return (
            <div
              className="vp-row"
              key={g}
              style={{ '--gc': GCOLORS[g] } as CSSProperties}
            >
              <span className="vp-name">
                {GROUPS[g]}
                <i>{STATUS[cls]}</i>
              </span>
              <div
                className="vp-track"
                role="meter"
                aria-label={GROUPS[g]}
                aria-valuemin={0}
                aria-valuemax={Math.max(SCALE, d.sets)}
                aria-valuenow={d.sets}
                aria-valuetext={`${d.sets} series completadas · objetivo ${guide.min}–${guide.max} · ${STATUS[cls]}`}
              >
                <span
                  className="vp-zone"
                  style={{
                    left: `${(guide.min / SCALE) * 100}%`,
                    width: `${((guide.max - guide.min) / SCALE) * 100}%`
                  }}
                />
                <span
                  className={`vp-fill ${cls}`}
                  style={{ width: `${(Math.min(d.sets, SCALE) / SCALE) * 100}%` }}
                />
              </div>
              <span className={`vp-num ${cls}`}>
                {d.sets}
                <i>/{guide.max}</i>
              </span>
            </div>
          )
        })}
      </div>
    </details>
  )
}
