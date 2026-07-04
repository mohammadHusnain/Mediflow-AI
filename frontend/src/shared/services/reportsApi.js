import { PUBLIC_ROUTES_FOR_TESTING } from '@shared/lib/testingAccess'

import { api } from './api'

const DAY_MS = 24 * 60 * 60 * 1000
const VALID_PERIODS = new Set(['daily', 'weekly', 'monthly', 'six_month', 'yearly', 'custom'])

const DEMO_TRENDS = {
  daily: [
    { label: '9 AM', revenue: 12000, salary: 4200, expenses: 1600 },
    { label: '11 AM', revenue: 18000, salary: 6100, expenses: 2300 },
    { label: '1 PM', revenue: 15000, salary: 5300, expenses: 1800 },
    { label: '3 PM', revenue: 21000, salary: 7200, expenses: 2700 },
    { label: '5 PM', revenue: 9000, salary: 2900, expenses: 1200 },
  ],
  weekly: [
    { label: 'Mon', revenue: 62000, salary: 22000, expenses: 7600 },
    { label: 'Tue', revenue: 71000, salary: 26000, expenses: 8400 },
    { label: 'Wed', revenue: 54000, salary: 21000, expenses: 6900 },
    { label: 'Thu', revenue: 81000, salary: 29000, expenses: 9300 },
    { label: 'Fri', revenue: 76000, salary: 27500, expenses: 8800 },
    { label: 'Sat', revenue: 43000, salary: 17000, expenses: 5200 },
    { label: 'Sun', revenue: 18000, salary: 6400, expenses: 2600 },
  ],
  monthly: [
    { label: 'Week 1', revenue: 226000, salary: 82000, expenses: 31000 },
    { label: 'Week 2', revenue: 248000, salary: 91000, expenses: 35500 },
    { label: 'Week 3', revenue: 219000, salary: 78000, expenses: 28000 },
    { label: 'Week 4', revenue: 271000, salary: 96000, expenses: 39000 },
  ],
  six_month: [
    { label: 'Feb', revenue: 820000, salary: 301000, expenses: 117000 },
    { label: 'Mar', revenue: 875000, salary: 318000, expenses: 126000 },
    { label: 'Apr', revenue: 842000, salary: 309000, expenses: 121000 },
    { label: 'May', revenue: 934000, salary: 337000, expenses: 139000 },
    { label: 'Jun', revenue: 966000, salary: 348000, expenses: 147000 },
    { label: 'Jul', revenue: 1014000, salary: 363000, expenses: 153000 },
  ],
  yearly: [
    { label: 'Jan', revenue: 780000, salary: 286000, expenses: 111000 },
    { label: 'Feb', revenue: 820000, salary: 301000, expenses: 117000 },
    { label: 'Mar', revenue: 875000, salary: 318000, expenses: 126000 },
    { label: 'Apr', revenue: 842000, salary: 309000, expenses: 121000 },
    { label: 'May', revenue: 934000, salary: 337000, expenses: 139000 },
    { label: 'Jun', revenue: 966000, salary: 348000, expenses: 147000 },
    { label: 'Jul', revenue: 1014000, salary: 363000, expenses: 153000 },
  ],
}

function numberValue(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function throwReportError(error) {
  error.service = 'reports'
  throw error
}

function parseDate(value) {
  if (!value) return null

  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function dateLabel(date) {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
  }).format(date)
}

function cloneRows(rows) {
  return rows.map((row) => ({ ...row }))
}

function buildCustomTrend(params = {}) {
  const from = parseDate(params.dateFrom || params.date_from)
  const to = parseDate(params.dateTo || params.date_to)

  if (!from || !to) {
    return cloneRows(DEMO_TRENDS.monthly)
  }

  const diffDays = Math.max(0, Math.round((to.getTime() - from.getTime()) / DAY_MS))

  if (diffDays === 0) {
    return [{ label: dateLabel(from), revenue: 42000, salary: 14500, expenses: 6200 }]
  }

  const points = Math.min(6, diffDays + 1)
  const step = Math.max(1, Math.floor(diffDays / Math.max(points - 1, 1)))

  return Array.from({ length: points }, (_, index) => {
    const date = new Date(from.getTime() + Math.min(diffDays, index * step) * DAY_MS)
    const lift = index * 7400

    return {
      label: dateLabel(date),
      revenue: 64000 + lift,
      salary: 23000 + Math.round(lift * 0.34),
      expenses: 8500 + Math.round(lift * 0.16),
    }
  })
}

function getDemoTrend(params = {}) {
  if (params.period === 'custom') {
    return buildCustomTrend(params)
  }

  return cloneRows(DEMO_TRENDS[params.period] || DEMO_TRENDS.monthly)
}

function sumTrend(rows, key) {
  return rows.reduce((sum, row) => sum + numberValue(row[key]), 0)
}

function getDemoSummary(params = {}) {
  const trend = getDemoTrend(params)
  const totalRevenue = sumTrend(trend, 'revenue')
  const totalSalary = sumTrend(trend, 'salary')
  const totalExpenses = sumTrend(trend, 'expenses')

  return {
    date_from: params.period === 'custom' ? params.dateFrom || params.date_from || null : null,
    date_to: params.period === 'custom' ? params.dateTo || params.date_to || null : null,
    net_profit: totalRevenue - totalSalary - totalExpenses,
    period: params.period || 'monthly',
    total_expenses: totalExpenses,
    total_revenue: totalRevenue,
    total_salary: totalSalary,
  }
}

function getDemoExpenseBreakdown(params = {}) {
  const summary = getDemoSummary(params)
  const total = numberValue(summary.total_expenses)

  if (total === 0) {
    return []
  }

  const rows = [
    { category: 'Staff Salaries', amount: Math.round(total * 0.52) },
    { category: 'Clinic Bills', amount: Math.round(total * 0.31) },
    { category: 'Other', amount: total - Math.round(total * 0.52) - Math.round(total * 0.31) },
  ]

  return rows.map((row) => ({
    ...row,
    percentage: total ? Math.round((numberValue(row.amount) / total) * 100) : 0,
  }))
}

function getDemoSalaryVsRevenue(params = {}) {
  return getDemoTrend(params).map((row) => ({
    label: row.label,
    ratio: row.revenue ? Math.round((numberValue(row.salary) / numberValue(row.revenue)) * 100) : 0,
    revenue: row.revenue,
    salary_cost: row.salary,
  }))
}

function getDemoTopMetrics(params = {}) {
  const trend = getDemoTrend(params)
  const best = trend.reduce(
    (currentBest, row) => (numberValue(row.revenue) > numberValue(currentBest?.revenue) ? row : currentBest),
    trend[0],
  )

  return {
    avg_commission: 31,
    best_day: best?.label || null,
    best_day_amount: best?.revenue || 0,
    top_condition: 'Follow-up consultations',
    top_doctor_name: 'Nora Patel',
    top_doctor_revenue: Math.round(sumTrend(trend, 'revenue') * 0.28),
    top_expense_amount: getDemoExpenseBreakdown(params)[0]?.amount || 0,
    top_expense_category: 'Staff Salaries',
  }
}

export function buildReportParams(params = {}) {
  const period = VALID_PERIODS.has(params.period) ? params.period : 'monthly'
  const nextParams = { period }

  if (period === 'custom') {
    nextParams.date_from = params.date_from || params.dateFrom || undefined
    nextParams.date_to = params.date_to || params.dateTo || undefined
  }

  return nextParams
}

async function requestReport(endpoint, params = {}, options = {}) {
  try {
    const { data } = await api.get(endpoint, {
      params: buildReportParams(params),
      signal: options.signal,
    })
    return data
  } catch (error) {
    throwReportError(error)
  }
}

export async function getFinancialSummary(params = {}, options = {}) {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    return getDemoSummary({ ...params, ...buildReportParams(params) })
  }

  return requestReport('/reports/summary/', params, options)
}

export async function getRevenueTrend(params = {}, options = {}) {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    return getDemoTrend({ ...params, ...buildReportParams(params) })
  }

  return requestReport('/reports/revenue-trend/', params, options)
}

export async function getExpenseBreakdown(params = {}, options = {}) {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    return getDemoExpenseBreakdown({ ...params, ...buildReportParams(params) })
  }

  return requestReport('/reports/expense-breakdown/', params, options)
}

export async function getSalaryVsRevenue(params = {}, options = {}) {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    return getDemoSalaryVsRevenue({ ...params, ...buildReportParams(params) })
  }

  return requestReport('/reports/salary-vs-revenue/', params, options)
}

export async function getTopMetrics(params = {}, options = {}) {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    return getDemoTopMetrics({ ...params, ...buildReportParams(params) })
  }

  return requestReport('/reports/top-metrics/', params, options)
}

export async function downloadReportPDF(params = {}, options = {}) {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    return new Blob(['Demo MediFlow financial report'], {
      type: 'application/pdf',
    })
  }

  try {
    const { data } = await api.get('/reports/export-pdf/', {
      params: buildReportParams(params),
      responseType: 'blob',
      signal: options.signal,
    })
    return data
  } catch (error) {
    throwReportError(error)
  }
}
