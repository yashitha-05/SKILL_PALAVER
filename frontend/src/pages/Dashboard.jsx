import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getDashboard, getDatasets, enhanceDataset, downloadEnhancedFile } from '../api'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import './Dashboard.css'

const COLORS = {
  correct: '#22c55e',
  warnings: '#eab308',
  errors: '#ea580c',
  fatal: '#dc2626',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [data, setData] = useState(null)
  const [datasets, setDatasets] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('current')
  const [selectedId, setSelectedId] = useState(null)
  const [enhancing, setEnhancing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getDashboard(), getDatasets()])
      .then(([dash, ds]) => {
        setData(dash)
        setDatasets(ds)
        setSelectedId((prev) => prev ?? (ds?.[0]?.id ?? null))
      })
      .catch(() => setData({ overall_score: 0, monthly: [], check_counts: {}, check_pcts: {} }))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="dashboard-loading">Loading dashboard...</div>

  const score = data?.overall_score ?? 0
  const monthly = data?.monthly ?? []
  const counts = data?.check_counts ?? { correct: 0, warnings: 0, errors: 0, fatal: 0 }
  const pcts = data?.check_pcts ?? { correct_pct: 100, warnings_pct: 0, errors_pct: 0, fatal_pct: 0 }

  const pieData = [
    { name: 'Correct results', value: counts.correct, color: COLORS.correct },
    { name: 'Warnings', value: counts.warnings, color: COLORS.warnings },
    { name: 'Errors', value: counts.errors, color: COLORS.errors },
    { name: 'Fatal errors', value: counts.fatal, color: COLORS.fatal },
  ].filter((d) => d.value > 0)

  if (pieData.length === 0) {
    pieData.push({ name: 'Correct results', value: 1, color: COLORS.correct })
  }

  const barData = monthly.slice(-6).map((m) => ({
    month: m.month,
    score: m.avg_score,
    datasets: m.datasets,
  }))

  const formatCount = (n) => {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
    return String(n)
  }

  const selected = datasets.find((d) => d.id === selectedId) || null
  const issues = selected?.metrics?.issues || []

  const handleEnhance = async () => {
    if (!selectedId) return
    setError('')
    setEnhancing(true)
    try {
      const res = await enhanceDataset(selectedId)
      const updated = res.dataset
      setDatasets((prev) => prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)))
      // refresh dashboard summary after enhancing
      const dash = await getDashboard()
      setData(dash)
    } catch (e) {
      setError(e.response?.data?.detail || 'Enhancement failed.')
    } finally {
      setEnhancing(false)
    }
  }

  const handleDownload = async () => {
    if (!selectedId) return
    const filename = (selected?.name || 'data').replace(/\.[^.]+$/, '') + '_enhanced.csv'
    try {
      await downloadEnhancedFile(selectedId, filename)
    } catch {
      setError('Download failed.')
    }
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>KPIs scorecard - summary</h1>
          <div className="period-tabs">
            <button
              className={period === 'current' ? 'active' : ''}
              onClick={() => setPeriod('current')}
            >
              Current month
            </button>
            <button
              className={period === 'previous' ? 'active' : ''}
              onClick={() => setPeriod('previous')}
            >
              Previous month
            </button>
          </div>
        </div>
        <div className="header-actions">
          <Link to="/" className="btn-link">Upload new file</Link>
          <span className="user-name">{user?.username}</span>
          <button className="btn-logout" onClick={logout}>Logout</button>
        </div>
      </header>

      <div className="dashboard-filters">
        <select placeholder="Connection">
          <option>All connections</option>
        </select>
        <select placeholder="Quality dimension">
          <option>All dimensions</option>
        </select>
        <select placeholder="Check category">
          <option>All categories</option>
        </select>
        <select placeholder="Data group names">
          <option>All groups</option>
        </select>
        <select placeholder="Table filter">
          <option>All tables</option>
        </select>
        <div className="filter-check">
          <input type="text" placeholder="Check type filter" />
          <label><input type="checkbox" /> Only include in KPI checks</label>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="gauge-card">
          <h3>Percentage of Passed Checks</h3>
          <div className="gauge-wrapper">
            <div className="gauge">
              <div
                className="gauge-fill"
                style={{ '--score': Math.min(100, score) }}
              />
              <span className="gauge-value">{score}%</span>
            </div>
            <p className="gauge-period">{period === 'current' ? 'Current month' : 'Previous month'}</p>
          </div>
        </div>

        <div className="chart-card">
          <h3>DASHBOARD</h3>
          <div className="chart-inner">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="score" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="cards-row">
          <div className="card-mini correct">
            <div className="card-mini-label">Correct results</div>
            <div className="card-mini-value">{formatCount(counts.correct)}</div>
            <div className="card-mini-pct">{pcts.correct_pct}%</div>
          </div>
          <div className="card-mini warning">
            <div className="card-mini-label">Warnings</div>
            <div className="card-mini-value">{formatCount(counts.warnings)}</div>
            <div className="card-mini-pct">{pcts.warnings_pct}%</div>
          </div>
          <div className="card-mini error">
            <div className="card-mini-label">Errors</div>
            <div className="card-mini-value">{formatCount(counts.errors)}</div>
            <div className="card-mini-pct">{pcts.errors_pct}%</div>
          </div>
          <div className="card-mini fatal">
            <div className="card-mini-label">Fatal errors</div>
            <div className="card-mini-value">{formatCount(counts.fatal)}</div>
            <div className="card-mini-pct">{pcts.fatal_pct}%</div>
          </div>
        </div>

        <div className="donut-card">
          <h3>Percentage of executed checks</h3>
          <div className="donut-inner">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="dashboard-grid full">
        <div className="stacked-chart-card">
          <h3>Distribution of checks results per month</h3>
          <div className="chart-inner">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Legend />
                <Tooltip />
                <Bar dataKey="score" stackId="a" fill={COLORS.correct} name="Correct results" />
                <Bar dataKey="datasets" stackId="a" fill={COLORS.warnings} name="Warnings" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="datasets-section">
        <h3>Your datasets</h3>
        {datasets.length === 0 ? (
          <p>No datasets yet. <Link to="/">Upload a file</Link> to get started.</p>
        ) : (
          <div className="dataset-split">
            <ul className="dataset-list">
              {datasets.map((ds) => (
                <li key={ds.id} className={ds.id === selectedId ? 'active' : ''}>
                  <button className="dataset-item" onClick={() => setSelectedId(ds.id)}>
                    <div className="dataset-name">{ds.name}</div>
                    <div className="dataset-meta">Score: {ds.score}/100</div>
                  </button>
                  {!ds.enhanced_csv && <span className="badge">Enhance available</span>}
                </li>
              ))}
            </ul>

            {selected && (
              <div className="dataset-detail-card">
                <div className="dataset-detail-header">
                  <div>
                    <h4>{selected.name}</h4>
                    <p className="dataset-detail-score">Current score: <b>{selected.score}/100</b></p>
                  </div>
                  <div className="dataset-actions">
                    {!selected.enhanced_csv ? (
                      <button className="btn-enhance" onClick={handleEnhance} disabled={enhancing}>
                        {enhancing ? 'Enhancing...' : '✨ Enhance with AI'}
                      </button>
                    ) : (
                      <button className="btn-download" onClick={handleDownload}>
                        Download corrected file
                      </button>
                    )}
                  </div>
                </div>

                <div className="issues-box">
                  <h5>Detected issues</h5>
                  {issues.length === 0 ? (
                    <p className="muted">No issues detected.</p>
                  ) : (
                    <ul className="issues-list">
                      {issues.map((it, idx) => (
                        <li key={idx}>{it}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="metrics-box">
                  <h5>Quality metrics</h5>
                  <div className="metrics-grid">
                    <div className="metric"><span>Completeness</span><b>{selected.metrics?.completeness ?? 0}%</b></div>
                    <div className="metric"><span>Uniqueness</span><b>{selected.metrics?.uniqueness ?? 0}%</b></div>
                    <div className="metric"><span>Type consistency</span><b>{selected.metrics?.type_consistency ?? 0}%</b></div>
                    <div className="metric"><span>Missing cells</span><b>{selected.metrics?.missing_cells ?? 0}</b></div>
                    <div className="metric"><span>Duplicate rows</span><b>{selected.metrics?.duplicate_rows ?? 0}</b></div>
                  </div>
                </div>

                <div className="view-report">
                  <button className="btn-secondary" onClick={() => navigate(`/results/${selected.id}`)}>
                    View report page
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {error && <p className="dashboard-error">{error}</p>}
    </div>
  )
}
