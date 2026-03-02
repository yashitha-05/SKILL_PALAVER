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
          <li>ANIRUDH - Project Lead</li>
          <li>AJAY - Backend Developer</li>
          <li>YASHITHA - Frontend Developer</li>
          <li>AKSHAYA - Data Scientist</li>
        </ul>
      </main>
    </div>
  )
}
