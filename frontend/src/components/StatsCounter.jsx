import React, { useState, useEffect, useRef } from 'react'

export default function StatsCounter({ end, suffix = '' }) {
  const [count, setCount] = useState(0)
  const [visible, setVisible] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setVisible(true)
        let start = null
        const duration = 1500
        const step = (timestamp) => {
          if (!start) start = timestamp
          const progress = timestamp - start
          const value = Math.min(end, Math.floor((progress / duration) * end))
          setCount(value)
          if (progress < duration) requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
        obs.disconnect()
      }
    }, { threshold: 0.5 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [end])

  return (
    <div ref={ref} className={`stats-card ${visible ? 'visible' : ''}`}>
      <div className="stats-number">{count}{suffix}</div>
    </div>
  )
}
