import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadFile } from '../api'
import { useAuth } from '../context/AuthContext'
import './Landing.css'
import FeatureCard from '../components/FeatureCard'
import StatsCounter from '../components/StatsCounter'

export default function Landing() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [progress, setProgress] = useState(0)
  const [score, setScore] = useState(0)
  const [displayScore, setDisplayScore] = useState(0)
  const [party, setParty] = useState(false)

  const handleScoreClick = () => {
    if (displayScore < 100) {
      setScore(100)
    } else {
      setParty(true)
      setTimeout(() => setParty(false), 1200)
    }
  }

  useEffect(() => {
    if (score === displayScore) return
    let start = null
    const duration = 800
    const step = (timestamp) => {
      if (!start) start = timestamp
      const progress = timestamp - start
      const val = Math.min(score, Math.floor((progress / duration) * score))
      setDisplayScore(val)
      if (progress < duration) requestAnimationFrame(step)
      else if (score === 100) {
        // celebrate when animation completes and score is perfect
        setParty(true)
        setTimeout(() => setParty(false), 1200)
      }
    }
    requestAnimationFrame(step)
  }, [score])
  const { logout } = useAuth()

  // SVG icons for feature cards
  const iconValidation = (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
      <path d="M20 6v10a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V6" />
    </svg>
  )
  const iconChart = (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
  const iconShield = (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2l7 4v6c0 5-3.7 9.74-7 10-3.3-.26-7-5-7-10V6l7-4z" />
    </svg>
  )

  const handleFileUpload = async (file) => {
    if (!file) return
    const valid = ['.csv', '.xlsx', '.xls'].some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    )
    if (!valid) {
      setError('Please upload a CSV or Excel file.')
      return
    }
    setError('')
    setUploading(true)
    setUploadedFile(file)
    // simulate progress for UI
    setProgress(0)
    const interval = setInterval(() => {
      setProgress((p) => Math.min(100, p + Math.random() * 20))
    }, 200)
    try {
      const res = await uploadFile(file)
      clearInterval(interval)
      setProgress(100)
      localStorage.setItem(`dataset_${res.dataset.id}`, JSON.stringify(res.dataset))
      setScore(res.dataset.score || 0)
      setTimeout(() => navigate(`/results/${res.dataset.id}`), 1000)
    } catch (err) {
      clearInterval(interval)
      setUploading(false)
      setProgress(0)
      // network level error (no response) vs HTTP error
      if (!err.response) {
        setError('Unable to contact server. Is the backend running?')
      } else {
        let msg = err.response?.data?.detail
        if (!msg && err.response?.data && typeof err.response.data === 'object') {
          const vals = Object.values(err.response.data).flat()
          msg = vals.length ? vals[0] : null
        }
        // handle invalid token explicitly: clear auth and prompt sign in
        if (msg && String(msg).toLowerCase().includes('invalid token')) {
          try { logout() } catch {}
          setError('Session expired. Please sign in to continue.')
        } else {
          setError(msg || err.message || 'Upload failed. Please try again.')
        }
      }
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    handleFileUpload(file)
  }

  const handleUploadClick = () => fileInputRef.current?.click()

  // drag & drop handlers
  const onDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }
  const onDragLeave = (e) => {
    e.preventDefault()
    setDragOver(false)
  }
  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }

  // animation class on mount
  useEffect(() => {
    document.body.classList.add('landing-loaded')
    return () => document.body.classList.remove('landing-loaded')
  }, [])

  return (
    <div className="landing">
      <header className="landing-header">
        <h1>Check Your Data Quality</h1>
        <p>Upload your CSV or Excel file to analyze data quality</p>
      </header>

      <div className="landing-cards">
        <div
          className={`landing-card upload-card ${uploading ? 'loading' : ''} ${dragOver ? 'drag-over' : ''}`}
          onClick={uploading ? undefined : handleUploadClick}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <div className="card-icon upload-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <h2>Upload Your Data</h2>
          <p>Drag &amp; drop or click to select file</p>
          <span className="supported">Supported: CSV, XLS, XLSX</span>
          {uploading && <div className="spinner" />}
          {uploadedFile && (
            <div className="file-info">
              {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)
            </div>
          )}
          {progress > 0 && (
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      </div>

      {/* score indicator */}
      <div className="score-wrapper">
        <div
          className={`score-circle${party ? ' party' : ''}`}
          style={{
            '--pct': displayScore,
            '--ring-color':
              displayScore >= 80 ? 'var(--accent-green)' : displayScore >= 60 ? 'var(--accent-yellow)' : 'var(--accent-red)',
          }}
          onClick={handleScoreClick}
        >
          <span className="score-val">{displayScore}%</span>
        </div>
        <p className="score-label">Data Quality Score</p>
      </div>

      {/* features section */}
      <section className="features">
        <FeatureCard icon={iconValidation} title="Smart Validation" description="Automatically checks your data for completeness, uniqueness and consistency." />
        <FeatureCard icon={iconChart} title="Data Insights" description="Visualize trends and anomalies with intuitive dashboards." />
        <FeatureCard icon={iconShield} title="Fast & Secure" description="Upload and process data quickly while keeping it private and safe." />
      </section>

      {/* stats section */}
      <section className="stats">
        <StatsCounter end={10000} suffix="+ Files" />
        <StatsCounter end={95} suffix="% Accuracy" />
        <StatsCounter end={2} suffix="s Avg Time" />
      </section>

      {error && <p className="landing-error">{error}</p>}
    </div>
  )
}
