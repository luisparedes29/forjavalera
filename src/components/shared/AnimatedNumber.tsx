import { useEffect, useRef, useState } from 'react'
import { fmtN } from '../../lib/util'

interface AnimatedNumberProps {
  value: number
  d?: number
}

export default function AnimatedNumber({ value, d = 0 }: AnimatedNumberProps) {
  const [text, setText] = useState(fmtN(value, d))
  const prevRef = useRef(value)

  useEffect(() => {
    const from = prevRef.current
    prevRef.current = value
    if (from === value) {
      setText(fmtN(value, d))
      return
    }
    const t0 = performance.now()
    const dur = 450
    let raf = 0
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur)
      const e = 1 - Math.pow(1 - p, 3)
      setText(fmtN(from + (value - from) * e, d))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, d])

  return <b>{text}</b>
}