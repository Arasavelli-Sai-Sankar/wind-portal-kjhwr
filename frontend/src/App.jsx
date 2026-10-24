
import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import './App.css'

const API = '/api'

const formatNumber = (value, digits = 0) =>
  value == null || !Number.isFinite(Number(value))
    ? '—'
    : Number(value).toLocaleString('en-GB', {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      })

const formatDate = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }) + ' UTC'
}

function MetricCard({ label, value, unit, description, icon, accent }) {
  return (
    <article className={`metric-card ${accent || ''}`}>
      <div className="metric-top">
        <span className="metric-label">{label}</span>
        <span className="metric-icon">{icon}</span>
      </div>
      <div className="metric-value">
        {value}
        {unit && <span className="metric-unit">{unit}</span>}
      </div>
      <p className="metric-description">{description}</p>
    </article>
  )
}

function EmptyChart({ message }) {
  return <div className="empty-chart">{message}</div>
}

function App() {
  const [summary, setSummary] = useState(null)
  const [publications, setPublications] = useState([])
  const [selectedPublication, setSelectedPublication] = useState('')
  const [comparison, setComparison] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [activeTab, setActiveTab] = useState('generation')

  useEffect(() => {
    async function loadInitialData() {
      try {
        setError('')

        const [summaryResponse, publicationResponse] = await Promise.all([
          fetch(`${API}/summary`),
          fetch(`${API}/publications`),
        ])

        if (!summaryResponse.ok || !publicationResponse.ok) {
          throw new Error('Unable to load dashboard data from the API.')
        }

        const summaryData = await summaryResponse.json()
        const publicationData = await publicationResponse.json()

        setSummary(summaryData)

        const publicationList = publicationData.data || []
        setPublications(publicationList)

        if (publicationList.length > 0) {
          setSelectedPublication(publicationList[publicationList.length - 1])
        }
      } catch (err) {
        setError(
          `${err.message} Make sure the FastAPI backend is running on port 8000.`,
        )
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [])

  useEffect(() => {
    if (!selectedPublication) {
      setComparison([])
      setMetrics(null)
      return
    }

    let cancelled = false

    async function loadComparison() {
      setLoading(true)
      setError('')

      try {
        const params = new URLSearchParams()
        params.set('publish_time', selectedPublication)

        if (startDate) {
          params.set('start_date', `${startDate}T00:00:00Z`)
        }

        if (endDate) {
          params.set('end_date', `${endDate}T23:59:59Z`)
        }

        const [comparisonResponse, metricsResponse] = await Promise.all([
          fetch(`${API}/comparison?${params.toString()}`),
          fetch(`${API}/metrics?${params.toString()}`),
        ])

        if (!comparisonResponse.ok || !metricsResponse.ok) {
          throw new Error('Unable to load forecast comparisons.')
        }

        const comparisonData = await comparisonResponse.json()
        const metricsData = await metricsResponse.json()

        if (!cancelled) {
          setComparison(comparisonData.data || [])
          setMetrics(metricsData.metrics || null)
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadComparison()

    return () => {
      cancelled = true
    }
  }, [selectedPublication, startDate, endDate])

  const chartData = useMemo(() => {
    const byTime = new Map()

    comparison.forEach((row) => {
      const key = row.startTime
      const current = byTime.get(key) || {
        time: key,
        actual: Number(row.actual),
        forecast: Number(row.forecast),
      }

      byTime.set(key, current)
    })

    return [...byTime.values()].sort(
      (a, b) => new Date(a.time) - new Date(b.time),
    )
  }, [comparison])

  const errorData = useMemo(
    () =>
      comparison.map((row) => ({
        time: row.startTime,
        error: Number(row.error),
        absoluteError: Number(row.absoluteError),
      })),
    [comparison],
  )

  const latestActual = chartData.length
    ? chartData[chartData.length - 1].actual
    : null

  const latestForecast = chartData.length
    ? chartData[chartData.length - 1].forecast
    : null

  const resetFilters = () => {
    setStartDate('')
    setEndDate('')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="Wind Intelligence home">
          <span className="brand-mark">W</span>
          <span className="brand-copy">
            <strong>WIND<span>IQ</span></strong>
            <small>INTELLIGENCE PLATFORM</small>
          </span>
        </a>

        <div className="sidebar-section-label">WORKSPACE</div>

        <nav className="sidebar-nav">
          <a className="nav-item active" href="#overview">
            <span className="nav-icon">▦</span>
            Overview
          </a>
          <a className="nav-item" href="#generation">
            <span className="nav-icon">⌁</span>
            Generation analysis
          </a>
          <a className="nav-item" href="#accuracy">
            <span className="nav-icon">◫</span>
            Forecast accuracy
          </a>
          <a className="nav-item" href="#data-table">
            <span className="nav-icon">☷</span>
            Data explorer
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="status-card">
            <span className="status-dot" />
            <div>
              <strong>Data engine</strong>
              <small>Local API connection</small>
            </div>
            <span className="status-check">✓</span>
          </div>
          <p className="sidebar-footer">WIND IQ · ANALYTICS SUITE</p>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> <strong>Overview</strong>
          </div>
          <div className="topbar-right">
            <span className="live-indicator">
              <span className="status-dot" /> DATA CONNECTED
            </span>
            <div className="avatar">WI</div>
          </div>
        </header>

        <div className="dashboard">
          <section className="page-heading" id="overview">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-line" /> RENEWABLE ENERGY ANALYTICS
              </div>
              <h1>Wind Forecast Intelligence</h1>
              <p className="page-subtitle">
                Monitor wind generation, evaluate forecast performance, and
                explore historical predictions.
              </p>
            </div>
            <div className="heading-date">
              <span className="calendar-icon">▦</span>
              <div>
                <small>DATA PERIOD</small>
                <strong>Historical analysis</strong>
              </div>
            </div>
          </section>

          {error && (
            <div className="error-banner" role="alert">
              <strong>Connection issue</strong>
              <span>{error}</span>
              <button onClick={() => window.location.reload()}>Retry</button>
            </div>
          )}

          <section className="filter-bar" aria-label="Dashboard filters">
            <div className="filter-title">
              <span>☷</span>
              <strong>FILTERS</strong>
            </div>

            <label className="filter-field publication-field">
              <span>Forecast publication</span>
              <select
                value={selectedPublication}
                onChange={(event) => setSelectedPublication(event.target.value)}
              >
                {publications.length === 0 && (
                  <option value="">No publications available</option>
                )}
                {[...publications].reverse().map((publication) => (
                  <option key={publication} value={publication}>
                    {formatDate(publication)}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-field">
              <span>From date</span>
              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>

            <label className="filter-field">
              <span>To date</span>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>

            <button className="reset-button" onClick={resetFilters}>
              Reset
            </button>
          </section>

          <section className="section-heading">
            <div>
              <h2>Performance overview</h2>
              <p>Key indicators for the selected dataset</p>
            </div>
            <span className="updated-label">
              {loading ? 'Updating data…' : '● Data loaded'}
            </span>
          </section>

          <section className="metrics-grid">
            <MetricCard
              label="Mean absolute error"
              value={formatNumber(metrics?.mae, 2)}
              unit="MW"
              description="Average absolute forecast deviation"
              icon="↕"
              accent="blue"
            />
            <MetricCard
              label="Root mean squared error"
              value={formatNumber(metrics?.rmse, 2)}
              unit="MW"
              description="Penalizes larger forecast errors"
              icon="∿"
              accent="purple"
            />
            <MetricCard
              label="Mean absolute percentage error"
              value={formatNumber(metrics?.mape, 2)}
              unit="%"
              description="Average error relative to actual output"
              icon="%"
              accent="orange"
            />
            <MetricCard
              label="Forecast bias"
              value={formatNumber(metrics?.bias, 2)}
              unit="MW"
              description="Positive values indicate overforecasting"
              icon="↗"
              accent="green"
            />
          </section>

          <section className="dataset-strip">
            <div className="dataset-item">
              <span className="dataset-icon actual-icon">A</span>
              <div>
                <small>ACTUAL RECORDS</small>
                <strong>{formatNumber(summary?.actual_records)}</strong>
              </div>
            </div>
            <div className="dataset-divider" />
            <div className="dataset-item">
              <span className="dataset-icon forecast-icon">F</span>
              <div>
                <small>FORECAST RECORDS</small>
                <strong>{formatNumber(summary?.forecast_records)}</strong>
              </div>
            </div>
            <div className="dataset-divider" />
            <div className="dataset-item">
              <span className="dataset-icon matched-icon">✓</span>
              <div>
                <small>ALL MATCHED COMPARISONS</small>
                <strong>{formatNumber(summary?.matched_comparisons)}</strong>
              </div>
            </div>
            <div className="dataset-divider" />
            <div className="dataset-item last-updated">
              <span className="dataset-icon time-icon">◷</span>
              <div>
                <small>SELECTED PUBLICATION</small>
                <strong className="publication-value">
                  {formatDate(selectedPublication)}
                </strong>
              </div>
            </div>
          </section>

          <section className="chart-card" id="generation">
            <div className="card-heading chart-heading">
              <div>
                <div className="card-overline">GENERATION INSIGHTS</div>
                <h2>Wind generation analysis</h2>
                <p>Compare forecast generation against measured output.</p>
              </div>
              <div className="chart-tabs">
                <button
                  className={activeTab === 'generation' ? 'selected' : ''}
                  onClick={() => setActiveTab('generation')}
                >
                  Generation
                </button>
                <button
                  className={activeTab === 'error' ? 'selected' : ''}
                  onClick={() => setActiveTab('error')}
                >
                  Forecast error
                </button>
              </div>
            </div>

            <div className="chart-legend">
              {activeTab === 'generation' ? (
                <>
                  <span><i className="legend-dot actual-dot" /> Actual generation</span>
                  <span><i className="legend-dot forecast-dot" /> Forecast generation</span>
                </>
              ) : (
                <>
                  <span><i className="legend-dot error-dot" /> Forecast error</span>
                  <span className="legend-note">Above zero = overforecast</span>
                </>
              )}
            </div>

            <div className="chart-summary">
              <div>
                <small>LATEST ACTUAL</small>
                <strong>{formatNumber(latestActual)} <em>MW</em></strong>
              </div>
              <div>
                <small>LATEST FORECAST</small>
                <strong>{formatNumber(latestForecast)} <em>MW</em></strong>
              </div>
              <div>
                <small>COMPARISONS IN VIEW</small>
                <strong>{formatNumber(chartData.length)}</strong>
              </div>
            </div>

            <div className="main-chart">
              {loading ? (
                <EmptyChart message="Loading chart data…" />
              ) : chartData.length === 0 ? (
                <EmptyChart message="No matched records for this publication and date range. Try another publication or reset the filters." />
              ) : activeTab === 'generation' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 12, left: 0, bottom: 4 }}
                  >
                    <defs>
                      <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1685e8" stopOpacity={0.19} />
                        <stop offset="100%" stopColor="#1685e8" stopOpacity={0.01} />
                      </linearGradient>
                      <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b72e8" stopOpacity={0.14} />
                        <stop offset="100%" stopColor="#8b72e8" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#edf1f6" strokeDasharray="4 5" vertical={false} />
                    <XAxis
                      dataKey="time"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          timeZone: 'UTC',
                        })
                      }
                      tick={{ fill: '#8994a7', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={35}
                    />
                    <YAxis
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      tick={{ fill: '#8994a7', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={44}
                    />
                    <Tooltip
                      labelFormatter={(value) => formatDate(value)}
                      formatter={(value, name) => [
                        `${formatNumber(value, 2)} MW`,
                        name,
                      ]}
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid #e8edf4',
                        boxShadow: '0 8px 24px #1c315015',
                      }}
                    />
                    <Legend verticalAlign="top" height={0} />
                    <Area
                      type="monotone"
                      dataKey="actual"
                      name="Actual generation"
                      stroke="#1685e8"
                      strokeWidth={2.5}
                      fill="url(#actualFill)"
                      connectNulls
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="forecast"
                      name="Forecast generation"
                      stroke="#8b72e8"
                      strokeWidth={2.2}
                      fill="url(#forecastFill)"
                      connectNulls
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={errorData}
                    margin={{ top: 10, right: 12, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid stroke="#edf1f6" strokeDasharray="4 5" vertical={false} />
                    <XAxis
                      dataKey="time"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          timeZone: 'UTC',
                        })
                      }
                      tick={{ fill: '#8994a7', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={35}
                    />
                    <YAxis
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      tick={{ fill: '#8994a7', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={44}
                    />
                    <Tooltip
                      labelFormatter={(value) => formatDate(value)}
                      formatter={(value) => [`${formatNumber(value, 2)} MW`, 'Forecast error']}
                    />
                    <Line
                      type="monotone"
                      dataKey="error"
                      name="Forecast error"
                      stroke="#e58b37"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="chart-footnote">
              <span>ⓘ</span>
              Values are shown in MW. All displayed timestamps use UTC.
              Forecast records are matched with actuals by target time.
            </div>
          </section>

          <section className="bottom-grid">
            <article className="chart-card accuracy-card" id="accuracy">
              <div className="card-heading">
                <div>
                  <div className="card-overline">MODEL EVALUATION</div>
                  <h2>Forecast accuracy</h2>
                  <p>Selected publication performance indicators.</p>
                </div>
                <span className="mini-icon">◎</span>
              </div>

              <div className="accuracy-rows">
                <div className="accuracy-row">
                  <div className="accuracy-label">
                    <span>MAE</span>
                    <strong>{formatNumber(metrics?.mae, 2)} MW</strong>
                  </div>
                  <div className="accuracy-track">
                    <div
                      className="accuracy-fill mae-fill"
                      style={{
                        width: `${Math.min((metrics?.mae || 0) / Math.max(metrics?.rmse || 1, 1) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="accuracy-row">
                  <div className="accuracy-label">
                    <span>RMSE</span>
                    <strong>{formatNumber(metrics?.rmse, 2)} MW</strong>
                  </div>
                  <div className="accuracy-track">
                    <div className="accuracy-fill rmse-fill" style={{ width: '100%' }} />
                  </div>
                </div>
                <div className="accuracy-row">
                  <div className="accuracy-label">
                    <span>MAPE</span>
                    <strong>{formatNumber(metrics?.mape, 2)}%</strong>
                  </div>
                  <div className="accuracy-track">
                    <div
                      className="accuracy-fill mape-fill"
                      style={{ width: `${Math.min(metrics?.mape || 0, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="bias-note">
                <span className="bias-note-icon">↗</span>
                <div>
                  <strong>
                    {metrics?.bias > 0
                      ? 'Overforecasting tendency'
                      : metrics?.bias < 0
                        ? 'Underforecasting tendency'
                        : 'No average forecast bias'}
                  </strong>
                  <p>
                    Mean bias is {formatNumber(metrics?.bias, 2)} MW. Positive
                    values indicate forecasts above actual generation.
                  </p>
                </div>
              </div>
            </article>

            <article className="chart-card snapshot-card">
              <div className="card-heading">
                <div>
                  <div className="card-overline">SELECTED DATASET</div>
                  <h2>Publication snapshot</h2>
                  <p>Details for the chosen forecast version.</p>
                </div>
                <span className="mini-icon">◷</span>
              </div>

              <div className="snapshot-list">
                <div>
                  <span>Publication time</span>
                  <strong>{formatDate(selectedPublication)}</strong>
                </div>
                <div>
                  <span>Matched observations</span>
                  <strong>{formatNumber(metrics?.count)}</strong>
                </div>
                <div>
                  <span>Latest target time</span>
                  <strong>{formatDate(chartData.at(-1)?.time)}</strong>
                </div>
                <div>
                  <span>Generation unit</span>
                  <strong>Megawatts (MW)</strong>
                </div>
              </div>

              <div className="snapshot-footer">
                <span className="status-dot" />
                <span>
                  {loading ? 'Refreshing dataset' : 'Dataset loaded successfully'}
                </span>
              </div>
            </article>
          </section>

          <section className="chart-card table-card" id="data-table">
            <div className="card-heading table-heading">
              <div>
                <div className="card-overline">RECORD EXPLORER</div>
                <h2>Forecast vs actual data</h2>
                <p>Review individual observations for the selected publication.</p>
              </div>
              <span className="record-count">
                {formatNumber(comparison.length)} records
              </span>
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Target time (UTC)</th>
                    <th>Forecast (MW)</th>
                    <th>Actual (MW)</th>
                    <th>Error (MW)</th>
                    <th>Absolute error (MW)</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.slice(0, 12).map((row, index) => (
                    <tr key={`${row.startTime}-${index}`}>
                      <td>{formatDate(row.startTime)}</td>
                      <td>{formatNumber(row.forecast, 2)}</td>
                      <td>{formatNumber(row.actual, 2)}</td>
                      <td className={Number(row.error) > 0 ? 'positive-error' : 'negative-error'}>
                        {Number(row.error) > 0 ? '+' : ''}
                        {formatNumber(row.error, 2)}
                      </td>
                      <td>{formatNumber(row.absoluteError, 2)}</td>
                      <td>
                        <span className={`result-pill ${Number(row.error) > 0 ? 'over' : 'under'}`}>
                          {Number(row.error) > 0 ? 'Overforecast' : Number(row.error) < 0 ? 'Underforecast' : 'Exact'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!loading && comparison.length === 0 && (
                <EmptyChart message="No records available for the selected filters." />
              )}
            </div>
            {comparison.length > 12 && (
              <div className="table-footer">
                Showing the first 12 of {formatNumber(comparison.length)} records.
                Use the publication and date filters to narrow your results.
              </div>
            )}
          </section>

          <footer className="page-footer">
            <span>WIND IQ <span className="footer-separator">/</span> WIND FORECAST INTELLIGENCE PORTAL</span>
            <span>Built with React, Recharts & FastAPI</span>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default App
