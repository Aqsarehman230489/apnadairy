import { useEffect, useRef, useState } from 'react'

// eases a number towards value whenever it changes; format turns it into text
export default function CountUp({ value, format = (n) => Math.round(n).toLocaleString('en-PK') }) {
  const [n, setN] = useState(0)
  const from = useRef(0)
  useEffect(() => {
    if (value == null) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const start = from.current, t0 = performance.now(), dur = 700
    let raf
    const tick = (t) => {
      const p = reduce ? 1 : Math.min(1, (t - t0) / dur)
      const v = start + (value - start) * (1 - Math.pow(1 - p, 3))
      setN(v); from.current = v
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  if (value == null) return '—'
  return format(n)
}
