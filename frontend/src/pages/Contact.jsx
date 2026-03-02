import React from 'react'
import './Contact.css'

export default function Contact() {
  return (
    <div className="contact-page">
      <header className="contact-header">
        <h1>Our Team</h1>
      </header>
      <main className="contact-content">
        <p>Meet the people behind the Data Quality Checker project:</p>
        <ul>
          <li>Jane Doe - Project Lead</li>
          <li>John Smith - Backend Developer</li>
          <li>Alex Lee - Frontend Developer</li>
          <li>Maria Garcia - Data Scientist</li>
        </ul>
      </main>
    </div>
  )
}
