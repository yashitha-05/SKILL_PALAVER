import { useState, useEffect, useRef } from 'react'
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

// new palette provided by user: red shades for problems and greens for good values
const COLORS = {
  correct: '#A3D78A',     // light mint-green
  warnings: '#C1E59F',    // pale green
  errors: '#FF937E',      // coral
  fatal: '#FF5555',       // strong red
}

// Parse CSV string and extract column names and unique values
const parseCSVForFilters = (rawCSV) => {
  if (!rawCSV) return { columns: [], uniqueValues: {} }
  const lines = rawCSV.trim().split('\n')
  if (lines.length === 0) return { columns: [], uniqueValues: {} }
  const headers = lines[0].split(',').map((h) => h.trim())
  const uniqueValues = {}
  headers.forEach((col) => {
    uniqueValues[col] = new Set()
  })
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',')
    headers.forEach((col, idx) => {
      if (idx < parts.length) {
        uniqueValues[col].add(parts[idx].trim())
      }
    })
  }
  const uniqueValuesObj = {}
  headers.forEach((col) => {
    uniqueValuesObj[col] = Array.from(uniqueValues[col]).sort()
  })
  return { columns: headers, uniqueValues: uniqueValuesObj }
}

// Apply column filters to raw CSV and compute new metrics
const computeMetricsFromFilteredData = (rawCSV, columnFilters) => {
  const lines = rawCSV.trim().split('\n')
  if (lines.length === 0) return { completeness: 100, uniqueness: 100, type_consistency: 100 }
  const headers = lines[0].split(',')
  let filteredRows = []
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',')
    let matches = true
    headers.forEach((col, idx) => {
      if (columnFilters[col] && columnFilters[col].length > 0) {
        const val = idx < parts.length ? parts[idx].trim() : ''
        if (!columnFilters[col].includes(val)) {
          matches = false
        }
      }
    })
    if (matches) filteredRows.push(parts)
  }
  // Simple metrics: completeness based on empty cells
  let totalCells = filteredRows.length * headers.length
  let emptyCells = 0
  filteredRows.forEach((row) => {
    headers.forEach((_, idx) => {
      if (idx >= row.length || !row[idx].trim()) emptyCells += 1
    })
  })
  const completeness = totalCells === 0 ? 100 : Math.round((1 - emptyCells / totalCells) * 100)
  // Duplicates
  const rowStrings = new Set()
  let duplicates = 0
  filteredRows.forEach((row) => {
    const str = row.join(',')
    if (rowStrings.has(str)) duplicates += 1
    else rowStrings.add(str)
  })
  const uniqueness = filteredRows.length === 0 ? 100 : Math.round((1 - duplicates / filteredRows.length) * 100)
  return { completeness, uniqueness, type_consistency: 100 }
}

// Analyze filter selection: count records that match selected filters vs don't match
const computeFilterAnalysis = (rawCSV, columnFilters) => {
  const lines = rawCSV.trim().split('\n')
  if (lines.length <= 1) return { matched: 0, unmatched: 0, total: 0, byColumn: {} }
  
  const headers = lines[0].split(',')
  const totalRecords = lines.length - 1
  let matchedCount = 0
  const columnAnalysis = {}
  
  // Count records matching all selected filters
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',')
    let matches = true
    
    headers.forEach((col, idx) => {
      if (columnFilters[col] && columnFilters[col].length > 0) {
        const val = idx < parts.length ? parts[idx].trim() : ''
        if (!columnFilters[col].includes(val)) {
          matches = false
        }
      }
    })
    
    if (matches) matchedCount += 1
  }
  
  // Also analyze per-column breakdown
  Object.keys(columnFilters).forEach((col) => {
    if (columnFilters[col].length === 0) return
    const colIdx = headers.indexOf(col)
    if (colIdx === -1) return
    
    let colMatched = 0
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',')
      const val = colIdx < parts.length ? parts[colIdx].trim() : ''
      if (columnFilters[col].includes(val)) {
        colMatched += 1
      }
    }
    columnAnalysis[col] = { matched: colMatched, unmatched: totalRecords - colMatched }
  })
  
  return {
    matched: matchedCount,
    unmatched: totalRecords - matchedCount,
    total: totalRecords,
    byColumn: columnAnalysis,
  }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [data, setData] = useState(null)
  const [datasets, setDatasets] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('current')
  const [selectedId, setSelectedId] = useState(null)
  const [columnFilters, setColumnFilters] = useState({}) // { colName: [values] }
  const [csvMetadata, setCsvMetadata] = useState({ columns: [], uniqueValues: {} })
  const [enhancing, setEnhancing] = useState(false)
  const [error, setError] = useState('')
  const [openFilter, setOpenFilter] = useState(null) // which column filter is open
  const [filterSearches, setFilterSearches] = useState({}) // { colName: searchTerm }
  const [selectedCardDetail, setSelectedCardDetail] = useState(null) // Show detail modal

  // Filter modal component with enhanced UI
  const FilterModal = ({ column, values = [], selected = [], onToggle, onSelectAll, onClearAll }) => {
    const [search, setSearch] = useState(filterSearches[column] || '')
    const [sortOrder, setSortOrder] = useState('asc') // 'asc' or 'desc'
    const selectAllRef = useRef(null)
    const filtered = values
      .filter((v) => (v || '(empty)').toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        const aStr = (a || '(empty)').toLowerCase()
        const bStr = (b || '(empty)').toLowerCase()
        return sortOrder === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
      })
    const isAllSelected = filtered.length > 0 && filtered.every((v) => selected.includes(v))
    const isSomeSelected = filtered.length > 0 && filtered.some((v) => selected.includes(v)) && !isAllSelected
    const activeFilterCount = selected.length
    
    // Update indeterminate state for select-all checkbox
    useEffect(() => {
      if (selectAllRef.current) {
        selectAllRef.current.indeterminate = isSomeSelected
      }
    }, [isSomeSelected])
    
    return (
      <div className="filter-modal">
        <div className="filter-modal-header">
          <div className="filter-modal-title">
            <h4>{column}</h4>
            {activeFilterCount > 0 && <span className="filter-badge">{activeFilterCount}</span>}
          </div>
          <button className="filter-close" onClick={() => setOpenFilter(null)}>×</button>
        </div>
        
        <div className="filter-sort-options">
          <button
            className={`sort-btn ${sortOrder === 'asc' ? 'active' : ''}`}
            onClick={() => setSortOrder('asc')}
            title="Sort A to Z"
          >
            ⬆ A-Z
          </button>
          <button
            className={`sort-btn ${sortOrder === 'desc' ? 'active' : ''}`}
            onClick={() => setSortOrder('desc')}
            title="Sort Z to A"
          >
            ⬇ Z-A
          </button>
        </div>
        
        {activeFilterCount > 0 && (
          <button className="filter-clear-from" onClick={() => onClearAll()}>
            🗑 Clear Filter From "{column}"
          </button>
        )}
        
        <input
          type="text"
          className="filter-search"
          placeholder="Search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setFilterSearches((prev) => ({ ...prev, [column]: e.target.value }))
          }}
        />
        
        <div className="filter-modal-actions">
          <label className="filter-item select-all-label">
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={isAllSelected}
              onChange={() => (isAllSelected ? onClearAll() : onSelectAll(filtered))}
            />
            <span>(Select All)</span>
          </label>
        </div>
        
        <div className="filter-list">
          {filtered.map((v) => (
            <label key={v} className="filter-item">
              <input
                type="checkbox"
                checked={selected.includes(v)}
                onChange={() => onToggle(v)}
              />
              <span>{v || '(empty)'}</span>
            </label>
          ))}
        </div>
        
        <div className="filter-modal-footer">
          <button className="btn-ok" onClick={() => setOpenFilter(null)}>OK</button>
          <button className="btn-cancel" onClick={() => setOpenFilter(null)}>Cancel</button>
        </div>
      </div>
    )
  }

  useEffect(() => {
    // extract columns and unique values when selected dataset changes
    const selected = datasets.find((d) => d.id === selectedId)
    if (selected && selected.raw_csv) {
      const meta = parseCSVForFilters(selected.raw_csv)
      setCsvMetadata(meta)
      // reset filters
      setColumnFilters({})
    } else {
      setCsvMetadata({ columns: [], uniqueValues: {} })
      setColumnFilters({})
    }
  }, [selectedId, datasets])

  useEffect(() => {
    Promise.all([getDashboard(), getDatasets()])
      .then(([dash, ds]) => {
        setData(dash)
        setDatasets(ds)
        const nextId = ds?.[0]?.id ?? null
        setSelectedId(nextId)
      })
      .catch(() => setData({ overall_score: 0, monthly: [], check_counts: {}, check_pcts: {} }))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="dashboard-loading">Loading dashboard...</div>

  // compute counts/pcts and monthly data based on filterId, falling back to overall summary
  const computeCounts = (list) => {
    let correct = 0,
      warnings = 0,
      errors = 0,
      fatal = 0
    list.forEach((ds) => {
      const m = ds.metrics || {}
      const comp = m.completeness ?? 100
      const uniq = m.uniqueness ?? 100
      const typ = m.type_consistency ?? 100
      if (comp >= 95) correct += 1
      else warnings += 1
      if (uniq >= 95) correct += 1
      else errors += 1
      if (typ >= 100) correct += 1
      else fatal += 1
    })
    const total = correct + warnings + errors + fatal
    if (total === 0)
      return {
        counts: { correct: 0, warnings: 0, errors: 0, fatal: 0 },
        pcts: { correct_pct: 100, warnings_pct: 0, errors_pct: 0, fatal_pct: 0 },
      }
    return {
      counts: { correct, warnings, errors, fatal },
      pcts: {
        correct_pct: Math.round((100 * correct) / total * 10) / 10,
        warnings_pct: Math.round((100 * warnings) / total * 10) / 10,
        errors_pct: Math.round((100 * errors) / total * 10) / 10,
        fatal_pct: Math.round((100 * fatal) / total * 10) / 10,
      },
    }
  }

  const computeMonthly = (list) => {
    const map = {}
    list.forEach((ds) => {
      const d = new Date(ds.uploaded_at)
      const month = d.toLocaleString('default', { month: 'short', year: 'numeric' })
      if (!map[month]) map[month] = { scoreSum: 0, count: 0 }
      map[month].scoreSum += ds.score
      map[month].count += 1
    })
    return Object.entries(map).map(([month, { scoreSum, count }]) => ({
      month,
      avg_score: Math.round((scoreSum / count) * 10) / 10,
      datasets: count,
    }))
  }

  const baseData = selectedId ? datasets.filter((d) => d.id === selectedId) : []

  // Check if any filters are applied
  const hasActiveFilters = Object.keys(columnFilters).some((k) => columnFilters[k].length > 0)

  // if we have column filters, recompute metrics from filtered CSV
  let applicableMetrics = baseData[0]?.metrics || {}
  let filterAnalysis = null
  if (selectedId && hasActiveFilters && baseData[0]?.raw_csv) {
    const filtered = computeMetricsFromFilteredData(baseData[0].raw_csv, columnFilters)
    applicableMetrics = {
      ...baseData[0].metrics,
      completeness: filtered.completeness,
      uniqueness: filtered.uniqueness,
      type_consistency: filtered.type_consistency,
    }
    filterAnalysis = computeFilterAnalysis(baseData[0].raw_csv, columnFilters)
  }

  const { counts, pcts } = computeCounts(
    baseData[0] ? [{ ...baseData[0], metrics: applicableMetrics }] : []
  )
  const score = baseData[0]?.score ?? 0
  const monthly = []

  // Generate chart data
  let pieData = []
  let barData = []
  
  if (hasActiveFilters && filterAnalysis) {
    // Show filter analysis: matched vs unmatched records (use palette greens/red)
    pieData = [
      { name: `Matched Selection (${filterAnalysis.matched})`, value: filterAnalysis.matched, color: COLORS.correct },
      { name: `Not Matched (${filterAnalysis.unmatched})`, value: filterAnalysis.unmatched, color: COLORS.fatal },
    ].filter((d) => d.value > 0)
    
    barData = [
      { name: 'Matched', count: filterAnalysis.matched, color: COLORS.correct },
      { name: 'Not Matched', count: filterAnalysis.unmatched, color: COLORS.fatal },
    ]
  } else {
    // Original chart data
    pieData = [
      { name: 'Correct results', value: counts.correct, color: COLORS.correct },
      { name: 'Warnings', value: counts.warnings, color: COLORS.warnings },
      { name: 'Errors', value: counts.errors, color: COLORS.errors },
      { name: 'Fatal errors', value: counts.fatal, color: COLORS.fatal },
    ].filter((d) => d.value > 0)

    if (pieData.length === 0) {
      pieData.push({ name: 'Correct results', value: 1, color: COLORS.correct })
    }

    barData = monthly.slice(-6).map((m) => ({
      month: m.month,
      score: m.avg_score,
      datasets: m.datasets,
    }))
  }

  const formatCount = (n) => {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
    return String(n)
  }

  const selected = datasets.find((d) => d.id === selectedId) || null
  const issues = selected?.metrics?.issues || []

  // Compute column quality data for chart
  const columnQualityData = csvMetadata.columns.map((col) => {
    const values = csvMetadata.uniqueValues[col] || []
    const uniqueCount = values.length
    const empty = values.includes('') ? 1 : 0
    return {
      name: col.length > 12 ? col.substring(0, 12) + '...' : col,
      unique: uniqueCount,
      completeness: empty > 0 ? 90 : 100,
    }
  }).slice(0, 8)

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
          <h1>Data Quality Dashboard</h1>
          {selected && (
            <div className="filter-info">
              <span className="filter-status">
                📊 {selected.name} 
                {Object.keys(columnFilters).some((k) => columnFilters[k].length > 0) && (
                  <span className="filter-indicator"> • Filtered</span>
                )}
              </span>
            </div>
          )}
        </div>
        <div className="header-actions">
          <Link to="/" className="btn-link">Upload new file</Link>
          <span className="user-name">{user?.username}</span>
          <button className="btn-logout" onClick={logout}>Logout</button>
        </div>
      </header>

      <div className="dashboard-filters">
        {/* Column-based filters ONLY - removed unnecessary top-level filters */}
        {csvMetadata.columns.length > 0 ? (
          <div className="column-filters-container">
            <h3 className="filters-title">Filter by Column</h3>
            <div className="filter-buttons-grid">
              {csvMetadata.columns.map((col) => {
                const selected = columnFilters[col] || []
                const displayText = selected.length > 0 ? `${col} (${selected.length})` : col
                return (
                  <div key={col} className="column-filter-wrapper">
                    <button
                      className={`column-filter-btn ${selected.length > 0 ? 'active' : ''}`}
                      onClick={() => setOpenFilter(openFilter === col ? null : col)}
                    >
                      {displayText}
                    </button>
                    {openFilter === col && (
                      <FilterModal
                        column={col}
                        values={csvMetadata.uniqueValues[col] || []}
                        selected={selected}
                        onToggle={(val) => {
                          setColumnFilters((prev) => {
                            const current = prev[col] || []
                            return {
                              ...prev,
                              [col]: current.includes(val)
                                ? current.filter((v) => v !== val)
                                : [...current, val],
                            }
                          })
                        }}
                        onSelectAll={(vals) => {
                          setColumnFilters((prev) => ({ ...prev, [col]: vals }))
                        }}
                        onClearAll={() => {
                          setColumnFilters((prev) => ({ ...prev, [col]: [] }))
                        }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
            {Object.keys(columnFilters).some((k) => columnFilters[k].length > 0) && (
              <button className="btn-clear-all-filters" onClick={() => setColumnFilters({})}>🗑 Clear All Filters</button>
            )}
          </div>
        ) : (
          <p className="no-dataset-message">Select a dataset to see column filters</p>
        )}
      </div>

      {/* end filters section, continue with grids and dataset area */}
      <div className="dashboard-grid">
        <div className="gauge-card">
          <h3>{hasActiveFilters ? 'Filter Results Summary' : 'Percentage of Passed Checks'}</h3>
          <div className="gauge-wrapper">
            {hasActiveFilters && filterAnalysis ? (
              <div className="filter-stats">
                <div className="filter-stat-item">
                  <p className="filter-stat-label">Total Records</p>
                  <p className="filter-stat-value">{filterAnalysis.total}</p>
                </div>
                <div className="filter-stat-item">
                  <p className="filter-stat-label">Matched Selection</p>
                  <p className="filter-stat-value" style={{ color: '#10b981' }}>{filterAnalysis.matched}</p>
                </div>
                <div className="filter-stat-item">
                  <p className="filter-stat-label">Not Matched</p>
                  <p className="filter-stat-value" style={{ color: '#ef4444' }}>{filterAnalysis.unmatched}</p>
                </div>
                <div className="filter-stat-item">
                  <p className="filter-stat-label">Match Percentage</p>
                  <p className="filter-stat-value" style={{ color: '#3b82f6' }}>
                    {filterAnalysis.total > 0 ? Math.round((filterAnalysis.matched / filterAnalysis.total) * 100) : 0}%
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="gauge">
                  <div
                    className="gauge-fill"
                    style={{ '--score': Math.min(100, score) }}
                  />
                  <span className="gauge-value">{score}%</span>
                </div>
                <p className="gauge-period">{period === 'current' ? 'Current month' : 'Previous month'}</p>
              </>
            )}
          </div>
        </div>

        <div className="chart-card">
          <h3>Column Data Quality</h3>
          <div className="chart-inner">
            {columnQualityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={columnQualityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="completeness" fill={COLORS.correct} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="no-data">Select a dataset to view column quality</p>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="cards-row">
          <div className="card-mini correct" onClick={() => setSelectedCardDetail('correct')} style={{ cursor: 'pointer' }}>
            <div className="card-mini-label">✓ Correct results</div>
            <div className="card-mini-value">{formatCount(counts.correct)}</div>
            <div className="card-mini-pct">{pcts.correct_pct}%</div>
            <div className="card-mini-hint">Click for details</div>
          </div>
          <div className="card-mini warning" onClick={() => setSelectedCardDetail('warnings')} style={{ cursor: 'pointer' }}>
            <div className="card-mini-label">⚠ Warnings</div>
            <div className="card-mini-value">{formatCount(counts.warnings)}</div>
            <div className="card-mini-pct">{pcts.warnings_pct}%</div>
            <div className="card-mini-hint">Click for details</div>
          </div>
          <div className="card-mini error" onClick={() => setSelectedCardDetail('errors')} style={{ cursor: 'pointer' }}>
            <div className="card-mini-label">⚡ Errors</div>
            <div className="card-mini-value">{formatCount(counts.errors)}</div>
            <div className="card-mini-pct">{pcts.errors_pct}%</div>
            <div className="card-mini-hint">Click for details</div>
          </div>
          <div className="card-mini fatal" onClick={() => setSelectedCardDetail('fatal')} style={{ cursor: 'pointer' }}>
            <div className="card-mini-label">🚫 Fatal errors</div>
            <div className="card-mini-value">{formatCount(counts.fatal)}</div>
            <div className="card-mini-pct">{pcts.fatal_pct}%</div>
            <div className="card-mini-hint">Click for details</div>
          </div>
        </div>

        <div className="donut-card">
          <h3>{hasActiveFilters ? 'Filter Analysis: Matched vs Unmatched Records' : 'Percentage of executed checks'}</h3>
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
          <h3>{hasActiveFilters ? 'Filter Comparison: Records by Selection Status' : 'Data Quality Overview by Column'}</h3>
          <div className="chart-inner">
            {hasActiveFilters && filterAnalysis ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill={COLORS.correct} name="Record Count" />
                </BarChart>
              </ResponsiveContainer>
            ) : columnQualityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={columnQualityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="completeness" fill={COLORS.correct} name="Completeness %" />
                  <Bar dataKey="unique" fill={COLORS.warnings} name="Unique Values" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="no-data">Select a dataset to view column analysis</p>
            )}
          </div>
        </div>
      </div>


      {/* datasets section returned to bottom */}
      <div className="datasets-section">
        <h3>Your datasets</h3>
        {datasets.length === 0 ? (
          <p>No datasets yet. <Link to="/">Upload a file</Link> to get started.</p>
        ) : (
          <div className="dataset-split">
            <ul className="dataset-list">
              {datasets.map((ds) => (
                <li key={ds.id} className={ds.id === selectedId ? 'active' : ''}>
                  <button
                    className="dataset-item"
                    onClick={() => setSelectedId(ds.id)}
                  >
                    <div className="dataset-name">{ds.name}</div>
                    <div className="dataset-meta">Score: {ds.score}/100</div>
                  </button>
                  {!ds.enhanced_csv && <span className="badge">Enhance available</span>}
                </li>
              ))}
            </ul>

            <div className="report-panel">
              {selected ? (
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
              ) : (
                <div className="dataset-detail-card placeholder">
                  <p className="muted" style={{ textAlign: 'center', padding: '2rem' }}>
                    Select a dataset to view its report section.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {selectedCardDetail && (
        <div className="detail-modal-overlay" onClick={() => setSelectedCardDetail(null)}>
          <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="detail-close" onClick={() => setSelectedCardDetail(null)}>×</button>
            <h3>
              {selectedCardDetail === 'correct' && '✓ Correct Results'}
              {selectedCardDetail === 'warnings' && '⚠ Warnings'}
              {selectedCardDetail === 'errors' && '⚡ Errors'}
              {selectedCardDetail === 'fatal' && '🚫 Fatal Errors'}
            </h3>
            <div className="detail-content">
              <p className="detail-count">Count: <strong>{selectedCardDetail === 'correct' ? counts.correct : selectedCardDetail === 'warnings' ? counts.warnings : selectedCardDetail === 'errors' ? counts.errors : counts.fatal}</strong></p>
              <p className="detail-pct">Percentage: <strong>{selectedCardDetail === 'correct' ? pcts.correct_pct : selectedCardDetail === 'warnings' ? pcts.warnings_pct : selectedCardDetail === 'errors' ? pcts.errors_pct : pcts.fatal_pct}%</strong></p>
              <p className="detail-desc">
                {selectedCardDetail === 'correct' && 'All data quality checks passed for the selected filters.'}
                {selectedCardDetail === 'warnings' && 'Minor data quality issues detected. Some completeness or uniqueness issues found.'}
                {selectedCardDetail === 'errors' && 'Data quality errors detected. Type consistency or other issues are present.'}
                {selectedCardDetail === 'fatal' && 'Critical data quality issues detected. Immediate attention required.'}
              </p>
              {selected && (
                <p className="detail-file">File: <strong>{selected.name}</strong></p>
              )}
            </div>
          </div>
        </div>
      )}

      {error && <p className="dashboard-error">{error}</p>}
    </div>
  )
}
