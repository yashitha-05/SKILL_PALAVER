import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadFile } from '../api'
import { useAuth } from '../context/AuthContext'
import './Landing.css'

export default function Landing() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const { logout } = useAuth()

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
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
    try {
      const res = await uploadFile(file)
      localStorage.setItem(`dataset_${res.dataset.id}`, JSON.stringify(res.dataset))
      navigate(`/results/${res.dataset.id}`)
    } catch (err) {
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
    } finally {
      setUploading(false)
    }
  }

  const handleUploadClick = () => fileInputRef.current?.click()

  return (
    <div className="landing">
      <header className="landing-header">
        <h1>Check Your Data Quality</h1>
        <p>Upload your CSV or Excel file to analyze data quality</p>
      </header>

      <div className="landing-cards">
        <div
          className={`landing-card upload-card ${uploading ? 'loading' : ''}`}
          onClick={uploading ? undefined : handleUploadClick}
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
          <p>We'll analyze and enhance your existing dataset</p>
          <span className="supported">Supported format: CSV, XLS, XLSX</span>
          {uploading && <div className="spinner" />}
        </div>
      </div>

      {error && <p className="landing-error">{error}</p>}
    </div>
  )
}
