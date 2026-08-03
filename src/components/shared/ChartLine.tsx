import { useEffect, useId, useRef } from 'react'
import { fmtN } from '../../lib/util'

interface ChartLineProps {
  points: number[]
  height?: number
  width?: number
  color?: string
  unit?: string
  animate?: boolean
}

export default function ChartLine({
  points,
  height = 110,
  width = 320,
  color,
  unit,
  animate = true
}: ChartLineProps) {
  const gid = useId().replace(/:/g, '')
  const lineRef = useRef<SVGPathElement | null>(null)
  const P = height >= 130 ? 12 : 10

  useEffect(() => {
    if (!animate || points.length <= 1) return
    const line = lineRef.current
    if (!line) return
    line.style.strokeDasharray = '1'
    line.style.strokeDashoffset = '1'
    let r1 = 0
    let r2 = 0
    r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => {
        line.style.transition = 'stroke-dashoffset 1s ease'
        line.style.strokeDashoffset = '0'
      })
    })
    return () => {
      cancelAnimationFrame(r1)
      cancelAnimationFrame(r2)
    }
  }, [points, animate])

  if (!points.length) return null

  const vals = points
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min || 1

  const X = (i: number): number =>
    vals.length === 1 ? width / 2 : P + (i * (width - 2 * P)) / (vals.length - 1)
  const Y = (v: number): number => height - P - ((v - min) / span) * (height - 2 * P)

  const md = (v: number): string =>
    (Number.isInteger(v) ? fmtN(v) : fmtN(v, 1)) + (unit ? ` ${unit}` : '')

  const stops = (
    <>
      <stop offset="0" stopColor={color ?? '#c9f24b'} stopOpacity="0.3" />
      <stop offset="1" stopColor={color ?? '#c9f24b'} stopOpacity="0" />
    </>
  )

  const last = vals[vals.length - 1]

  if (vals.length === 1) {
    return (
      <svg viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            {stops}
          </linearGradient>
        </defs>
        <circle cx={width / 2} cy={Y(last)} r="3.5" className="ch-dot" />
        <text x={width / 2 - 6} y={Y(last) - 8} className="ch-lab">
          {md(last)}
        </text>
      </svg>
    )
  }

  const path = vals
    .map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`)
    .join(' ')
  const area =
    path +
    ` L${X(vals.length - 1).toFixed(1)},${height - P} L${X(0).toFixed(1)},${
      height - P
    } Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          {stops}
        </linearGradient>
      </defs>
      <path d={area} className="ch-area" style={{ fill: `url(#${gid})` }} />
      <path
        d={path}
        className="ch-line"
        ref={lineRef}
        pathLength={1}
        style={{ stroke: color }}
      />
      {vals.map((v, i) => (
        <circle key={i} cx={X(i)} cy={Y(v)} r="2.6" className="ch-dot" />
      ))}
      <text x={X(vals.length - 1) - 4} y={Y(last) - 7} className="ch-lab">
        {md(last)}
      </text>
    </svg>
  )
}