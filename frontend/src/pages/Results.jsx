import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getDataset, claimDataset, enhanceDataset, downloadEnhancedFile } from '../api'
import './Results.css'

const CATEGORIES = [
  { key: 'completeness', label: 'COMPLETENESS', icon: '📊' },
  { key: 'uniqueness', label: 'UNIQUENESS', icon: '🔗' },
  { key: 'type_consistency', label: 'TYPE CONSISTENCY', icon: '✓' },
]

export default function Results() {
  const { datasetId } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('completeness')
  const [enhancing, setEnhancing] = useState(false)
  const [viewMode, setViewMode] = useState('enhanced') // 'original' | 'enhanced'

  useEffect(() => {
    const stored = localStorage.getItem(`dataset_${datasetId}`)
    if (stored) {
      try {
        setData(JSON.parse(stored))
      } catch {}
    }
    if (isAuthenticated && datasetId) {
      getDataset(datasetId)
        .then((res) => {
          setData(res)
          localStorage.setItem(`dataset_${datasetId}`, JSON.stringify(res))
        })
        .catch(() => setError('Could not load dataset.'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
      if (!stored && datasetId) setError('Dataset not found. Please upload again.')
    }
  }, [datasetId, isAuthenticated])

  const handleUnlockFullReport = () => {
    navigate('/signin', { state: { redirect: `/dashboard`, claimId: datasetId } })
  }

  const handleEnhance = async () => {
    setEnhancing(true)
    try {
      const res = await enhanceDataset(datasetId)
      setData(res.dataset)
      localStorage.setItem(`dataset_${datasetId}`, JSON.stringify(res.dataset))
    } catch (err) {
      setError(err.response?.data?.detail || 'Enhancement failed.')
    } finally {
      setEnhancing(false)
    }
  }

  const handleDownload = () => {
    const filename = (data?.name || 'data').replace(/\.[^.]+$/, '') + '_enhanced.csv'
    downloadEnhancedFile(datasetId, filename).catch(() => setError('Download failed.'))
  }

  if (loading) return <div className="results-loading">Loading...</div>
  if (error && !data) return <div className="results-error">{error}</div>

  const metrics = data?.metrics || {}
  const score = data?.score ?? 0
  const issues = metrics.issues || []
  const issueCount = issues.length

  const getCategoryValue = (key) => metrics[key] ?? 0
  const getCategoryStatus = (key) => {
    const v = getCategoryValue(key)
    if (v >= 95) return { status: 'No Issues', color: 'green' }
    if (v >= 80) return { status: 'Needs attention', color: 'yellow' }
    return { status: 'Issues found', color: 'red' }
  }

  const categoryDescriptions = {
    completeness: 'Completeness measures how many cells in your dataset have values. Missing values can affect analysis and machine learning models.',
    uniqueness: 'Uniqueness checks for duplicate rows. Duplicates can skew statistics and reporting.',
    type_consistency: 'Type consistency ensures columns have uniform data types. Mixed types can cause errors during processing.',
  }

  return (
    <div className="results">
      <div className="results-layout">
        <aside className="results-sidebar">
          <div className="score-header">
            <h2>Your Score</h2>
            <p className="score-value">{Math.round(score)}/100</p>
            <p className="issue-count">{issueCount} {issueCount === 1 ? 'Issue' : 'Issues'}</p>
          </div>

          <div className="categories">
            {CATEGORIES.map((cat) => {
              const { status, color } = getCategoryStatus(cat.key)
              const isExpanded = selectedCategory === cat.key
              return (
                <div
                  key={cat.key}
                  className={`category-item ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => setSelectedCategory(cat.key)}
                >
                  <div className="category-header">
                    <span>{cat.label}</span>
                    <span className="category-pct">{getCategoryValue(cat.key)}%</span>
                    <span className="chevron">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                  {isExpanded && (
                    <div className="category-sub">
                      <span className={`status-dot ${color}`} />
                      {status}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {!isAuthenticated ? (
            <button className="btn-unlock" onClick={handleUnlockFullReport}>
              <span className="lock-icon">🔒</span> Unlock Full Report
            </button>
          ) : (
            <>
              {!data?.enhanced_csv && (
                <button
                  className="btn-enhance"
                  onClick={handleEnhance}
                  disabled={enhancing}
                >
                  {enhancing ? 'Enhancing...' : '✨ Enhance with AI'}
                </button>
              )}
              {data?.enhanced_csv && (
                <div className="post-enhance">
                  <button className="btn-secondary" onClick={() => navigate('/dashboard')}>
                    View Dashboard
                  </button>
                  <button className="btn-download" onClick={handleDownload}>
                    Download Corrected File
                  </button>
                </div>
              )}
            </>
          )}
        </aside>

        <main className="results-detail">
          <div className="detail-header">
            <h2>{selectedCategory.replace('_', ' ').toUpperCase()}</h2>
            <span className="issues-badge">
              {getCategoryStatus(selectedCategory).status === 'No Issues' ? '0 issues' : 'Issues found'}
            </span>
          </div>

          <div className="detail-content">
            <h3>{CATEGORIES.find((c) => c.key === selectedCategory)?.label}</h3>
            <p>{categoryDescriptions[selectedCategory]}</p>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${getCategoryValue(selectedCategory)}%` }}
              />
            </div>
            <p className="progress-message">
              {getCategoryValue(selectedCategory) >= 95
                ? `Great! ${getCategoryValue(selectedCategory)}% of your data meets quality standards.`
                : `Your data has ${getCategoryValue(selectedCategory)}% quality for this dimension. Consider improving.`}
            </p>
          </div>

          {data?.enhanced_csv && (
            <div className="version-toggle">
              <span>View:</span>
              <button
                className={viewMode === 'original' ? 'active' : ''}
                onClick={() => setViewMode('original')}
              >
                Original
              </button>
              <button
                className={viewMode === 'enhanced' ? 'active' : ''}
                onClick={() => setViewMode('enhanced')}
              >
                Enhanced
              </button>
            </div>
          )}
        </main>
      </div>

      {error && <p className="results-error">{error}</p>}
    </div>
  )
}
