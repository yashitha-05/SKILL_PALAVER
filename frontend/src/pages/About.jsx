import React from 'react'
import { Link } from 'react-router-dom'
import './About.css'

export default function About() {
  return (
    <div className="about-page">
      <header className="about-header">
        <h1>About Data Quality Checker</h1>
      </header>
      <main className="about-content">
        <p>
          Data Quality Checker is a tool designed to help you analyze and improve the
          quality of your datasets. Upload CSV or Excel files and get instant insight
          into completeness, uniqueness and consistency issues. Use our dashboards to
          filter, visualize, and fix problems quickly.
        </p>
        <p>
          This website is built as a demonstration of modern data validation techniques
          using Python/Django backend and a React frontend. The source code is open
          and can be adapted for your specific needs.
        </p>
      </main>
    </div>
  )
}
