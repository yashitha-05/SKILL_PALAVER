import React, { useState, useEffect, useRef } from 'react'
export default function FeatureCard({ icon, title, description }) {
  const [visible, setVisible] = useState(false)
  const [flipped, setFlipped] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setVisible(true)
        obs.disconnect()
      }
    }, { threshold: 0.3 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      className={`feature-card ${visible ? 'visible' : ''} ${flipped ? 'flipped' : ''}`}
      onClick={() => setFlipped((f) => !f)}
    >
      <div className="feature-front">
        <div className="feature-icon">{icon}</div>
        <h3 className="feature-title">{title}</h3>
      </div>
      <div className="feature-back">
        <p>{description || 'Learn more about this feature'}</p>
      </div>
    </div>
  )
}
