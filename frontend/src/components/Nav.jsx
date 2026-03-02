import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './Nav.css'

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const linkClass = (path) =>
    `nav-link ${location.pathname === path ? 'active' : ''}`

  return (
    <nav className={`site-nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="nav-left">
        <Link to="/" className="nav-brand">
          Data Quality Checker
        </Link>
      </div>
      <div className="nav-right">
        <Link to="/" className={linkClass('/')}>Home</Link>
        <Link to="/about" className={linkClass('/about')}>About</Link>
        <Link to="/signin" className={linkClass('/signin')}>Sign In</Link>
        <Link to="/signup" className={linkClass('/signup')}>Sign Up</Link>
        <Link to="/contact" className="nav-link nav-cta">Contact Us</Link>
      </div>
    </nav>
  )
}
