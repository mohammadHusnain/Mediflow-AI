import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Percent,
  PiggyBank,
  Receipt,
  Stethoscope,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'

import DateRangePicker from '../../../components/financial/DateRangePicker.jsx'
import ExpenseBreakdownChart from '../../../components/financial/ExpenseBreakdownChart.jsx'
import ReportsBreakdownTable from '../../../components/financial/ReportsBreakdownTable.jsx'
import RevenueChart from '../../../components/financial/RevenueChart.jsx'
import SalaryVsRevenueChart from '../../../components/financial/SalaryVsRevenueChart.jsx'
import StatCard from '../../../components/financial/StatCard.jsx'
import { useToast } from '@shared/components/Toast'
import { exportReportPdf } from '@shared/lib/exportPdf'
import { getBackendError } from '@shared/lib/records'
import * as reportsApi from '@shared/services/reportsApi'

const PKR_FORMATTER = new Intl.NumberFormat('en-PK')

const PERIOD_LABELS = {
  daily: 'today',
  monthly: 'this month',
  six_month: 'last 6 months',
  weekly: 'this week',
  yearly: 'this year',
}

function numberValue(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function isMissing(value) {
  return value === null || value === undefined || value === ''
}

function formatPkr(value) {
  return `PKR ${PKR_FORMATTER.format(numberValue(value))}`
}

function formatPercent(value) {
  if (isMissing(value)) return '-'
  if (typeof value === 'string') return value.includes('%') ? value : `${value}%`

  return `${PKR_FORMATTER.format(numberValue(value))}%`
}

function normalizeArray(response, key) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.results)) return response.results
  if (key && Array.isArray(response?.[key])) return response[key]
  return []
}

function normalizeTrendRows(rows = []) {
  return rows.map((row) => ({
    expenses: numberValue(row.expenses ?? row.total_expenses),
    label: row.label || row.period || '-',
    revenue: numberValue(row.revenue ?? row.total_revenue),
    salary: numberValue(row.salary ?? row.total_salary ?? row.salary_cost),
  }))
}

function normalizeExpenseBreakdown(rows = []) {
  return rows.map((row) => ({
    amount: numberValue(row.amount ?? row.total),
    category: row.category || row.name || '-',
    percentage: numberValue(row.percentage ?? row.percent),
  }))
}

function normalizeSalaryRows(rows = []) {
  return rows.map((row) => ({
    label: row.label || row.period || '-',
    ratio: numberValue(row.ratio),
    revenue: numberValue(row.revenue ?? row.total_revenue),
    salary_cost: numberValue(row.salary_cost ?? row.salary ?? row.total_salary),
  }))
}

function getBreakdownRows(summaryData, trend) {
  const backendRows = normalizeArray(summaryData, 'breakdown_rows')

  if (backendRows.length > 0) {
    return backendRows.map((row) => {
      const revenue = numberValue(row.revenue ?? row.total_revenue)
      const salary = numberValue(row.salary ?? row.salary_paid ?? row.total_salary)
      const expenses = numberValue(row.expenses ?? row.total_expenses)

      return {
        expenses,
        label: row.label || row.period || '-',
        net_profit: numberValue(row.net_profit ?? revenue - salary - expenses),
        revenue,
        salary,
      }
    })
  }

  return trend.map((row) => ({
    expenses: row.expenses,
    label: row.label,
    net_profit: row.revenue - row.salary - row.expenses,
    revenue: row.revenue,
    salary: row.salary,
  }))
}

function getSummaryValue(summaryData, key, fallback) {
  return numberValue(summaryData?.[key] ?? fallback)
}

function normalizeReportModel({
  expenseData,
  salaryData,
  summaryData,
  topMetricsData,
  trendData,
}) {
  const trend = normalizeTrendRows(
    normalizeArray(trendData, 'trend').length
      ? normalizeArray(trendData, 'trend')
      : normalizeArray(summaryData, 'trend'),
  )
  const expenseBreakdown = normalizeExpenseBreakdown(
    normalizeArray(expenseData, 'expense_breakdown').length
      ? normalizeArray(expenseData, 'expense_breakdown')
      : normalizeArray(summaryData, 'expense_breakdown'),
  )
  const salaryVsRevenue = normalizeSalaryRows(
    normalizeArray(salaryData, 'salary_vs_revenue').length
      ? normalizeArray(salaryData, 'salary_vs_revenue')
      : normalizeArray(summaryData, 'salary_vs_revenue'),
  )
  const trendRevenue = trend.reduce((sum, row) => sum + numberValue(row.revenue), 0)
  const trendSalary = trend.reduce((sum, row) => sum + numberValue(row.salary), 0)
  const trendExpenses = trend.reduce((sum, row) => sum + numberValue(row.expenses), 0)
  const totalRevenue = getSummaryValue(summaryData, 'total_revenue', trendRevenue)
  const totalSalary = getSummaryValue(summaryData, 'total_salary', trendSalary)
  const totalExpenses = getSummaryValue(summaryData, 'total_expenses', trendExpenses)

  return {
    breakdown_rows: getBreakdownRows(summaryData, trend),
    expense_breakdown: expenseBreakdown,
    net_profit: getSummaryValue(summaryData, 'net_profit', totalRevenue - totalSalary - totalExpenses),
    salary_vs_revenue: salaryVsRevenue.length > 0
      ? salaryVsRevenue
      : trend.map((row) => ({
          label: row.label,
          ratio: row.revenue ? Math.round((row.salary / row.revenue) * 100) : 0,
          revenue: row.revenue,
          salary_cost: row.salary,
        })),
    top_metrics: topMetricsData?.top_metrics || topMetricsData || summaryData?.top_metrics || {},
    total_expenses: totalExpenses,
    total_revenue: totalRevenue,
    total_salary: totalSalary,
    trend,
  }
}

function isAbortError(error) {
  return error?.name === 'AbortError' || error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED'
}

function periodLabel(range) {
  if (range.period === 'custom') {
    return `${range.dateFrom || 'Custom'} - ${range.dateTo || 'Range'}`
  }

  return PERIOD_LABELS[range.period] || 'selected range'
}

function ErrorCard({ error, onRetry }) {
  const forbidden = error?.response?.status === 403
  const message = forbidden
    ? "You don't have permission to view financial reports."
    : 'Something went wrong generating this report. Please try again.'

  return (
    <section className="flex flex-wrap items-center gap-3 rounded-[12px] border border-[#FFC9C9] bg-[#FCE4E8] px-5 py-4">
      <AlertCircle aria-hidden="true" className="h-4 w-4 text-[#C8102E]" />
      <span className="text-[14px] font-medium text-[#C8102E]">{message}</span>
      {!forbidden ? (
        <button
          className="text-[14px] font-semibold text-brand transition hover:text-brandDark"
          onClick={onRetry}
          type="button"
        >
          Retry
        </button>
      ) : null}
    </section>
  )
}

function ChartSkeleton() {
  return <div className="h-[360px] animate-pulse rounded-[16px] bg-mist" />
}

function EmptyState({
  subtitle = 'Try selecting a wider date range',
  title = 'Not enough data for this range',
}) {
  return (
    <div className="py-16 text-center">
      <BarChart3 aria-hidden="true" className="mx-auto mb-3 h-10 w-10 text-hairline" />
      <p className="font-display text-[18px] italic text-slate">{title}</p>
      <p className="mt-1 text-[14px] font-normal text-slate/70">{subtitle}</p>
    </div>
  )
}

function LegendDot({ color, label }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}

function metricValue(label, amount) {
  if (isMissing(label)) return '-'
  if (isMissing(amount)) return label

  return `${label} - ${formatPkr(amount)}`
}

function MetricRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-hairline pb-4 last:border-0 last:pb-0">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-brand/10 text-brand">
          <Icon aria-hidden="true" className="h-4 w-4" />
        </span>
        <span className="truncate text-[14px] font-medium text-ink">{label}</span>
      </div>
      <span className="max-w-[48%] truncate text-right font-mono text-[14px] text-ink">
        {value || '-'}
      </span>
    </div>
  )
}

function hasNonZeroAmount(rows, key = 'amount') {
  return rows.some((row) => numberValue(row[key]) !== 0)
}

export default function ReportsOverview() {
  const toast = useToast()
  const [range, setRange] = useState({ dateFrom: null, dateTo: null, period: 'monthly' })
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [showTable, setShowTable] = useState(false)

  const loadReports = useCallback(async (signal) => {
    setLoading(true)
    setError(null)

    try {
      const [
        summaryData,
        trendData,
        expenseData,
        salaryData,
        topMetricsData,
      ] = await Promise.all([
        reportsApi.getFinancialSummary(range, { signal }),
        reportsApi.getRevenueTrend(range, { signal }),
        reportsApi.getExpenseBreakdown(range, { signal }),
        reportsApi.getSalaryVsRevenue(range, { signal }),
        reportsApi.getTopMetrics(range, { signal }),
      ])

      if (signal.aborted) return

      setSummary(normalizeReportModel({
        expenseData,
        salaryData,
        summaryData,
        topMetricsData,
        trendData,
      }))
    } catch (loadError) {
      if (signal.aborted || isAbortError(loadError)) return

      setError(loadError)
      setSummary(null)
    } finally {
      if (!signal.aborted) {
        setLoading(false)
      }
    }
  }, [range])

  useEffect(() => {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => {
      loadReports(controller.signal)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [loadReports, reloadKey])

  const label = periodLabel(range)
  const topMetrics = useMemo(() => summary?.top_metrics || {}, [summary?.top_metrics])
  const trend = summary?.trend || []
  const expenseBreakdown = summary?.expense_breakdown || []
  const salaryVsRevenue = summary?.salary_vs_revenue || []
  const onePointTrend = trend.length === 1
  const canShowTrendChart = trend.length >= 2
  const canShowSalaryChart = salaryVsRevenue.length >= 2
  const canShowExpenseChart = expenseBreakdown.length > 0 && hasNonZeroAmount(expenseBreakdown)

  const metricRows = useMemo(
    () => [
      {
        icon: Stethoscope,
        label: 'Top Earning Doctor',
        value: metricValue(
          topMetrics.top_doctor_name,
          topMetrics.top_doctor_revenue ?? topMetrics.top_doctor_amount,
        ),
      },
      {
        icon: Users,
        label: 'Most Billed Patient Type',
        value: topMetrics.top_condition || '-',
      },
      {
        icon: Receipt,
        label: 'Largest Expense Category',
        value: metricValue(
          topMetrics.top_expense_category,
          topMetrics.top_expense_amount,
        ),
      },
      {
        icon: TrendingUp,
        label: 'Best Revenue Day',
        value: metricValue(topMetrics.best_day, topMetrics.best_day_amount),
      },
      {
        icon: Percent,
        label: 'Avg Commission Payout',
        value: formatPercent(topMetrics.avg_commission),
      },
    ],
    [topMetrics],
  )

  async function handleExport() {
    if (loading || !summary) return

    setExporting(true)

    try {
      await exportReportPdf(reportsApi, range, (exportError) => {
        toast.error(getBackendError(exportError, 'Report PDF could not be generated.'))
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <header className="mb-6">
        <h2 className="font-display text-[26px] text-ink">Financial Reports</h2>
        <p className="mt-1 text-[14px] font-normal text-slate">
          Revenue, salary, and expense insights across your clinic
        </p>
      </header>

      <DateRangePicker
        disabled={loading || !summary}
        exporting={exporting}
        onChange={setRange}
        onExport={handleExport}
        value={range}
      />

      {error ? (
        <ErrorCard error={error} onRetry={() => setReloadKey((current) => current + 1)} />
      ) : (
        <>
          <section className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={TrendingUp}
              label="Total Revenue"
              loading={loading}
              sub={`PKR - ${label}`}
              value={formatPkr(summary?.total_revenue)}
            />
            <StatCard
              accentColor="amber"
              icon={Wallet}
              label="Total Salary Paid"
              loading={loading}
              sub={`PKR - ${label}`}
              value={formatPkr(summary?.total_salary)}
            />
            <StatCard
              accentColor="red"
              icon={Receipt}
              label="Total Expenses"
              loading={loading}
              sub={`PKR - ${label}`}
              value={formatPkr(summary?.total_expenses)}
            />
            <StatCard
              accentColor={numberValue(summary?.net_profit) < 0 ? 'red' : 'green'}
              icon={PiggyBank}
              label="Net Profit"
              loading={loading}
              sub="revenue - salary - expenses"
              value={formatPkr(summary?.net_profit)}
              valueColorClass={numberValue(summary?.net_profit) < 0 ? 'text-[#C8102E]' : 'text-ink'}
            />
          </section>

          {loading ? (
            <ChartSkeleton />
          ) : (
            <>
              <section className="mb-6 rounded-[16px] border border-hairline bg-canvas p-6">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-[16px] font-semibold text-ink">
                    Revenue, Salary & Expense Trend
                  </h3>
                  <div className="flex flex-wrap gap-4 text-[12px] font-normal text-slate">
                    <LegendDot color="#4338CA" label="Revenue" />
                    <LegendDot color="#B45309" label="Salary" />
                    <LegendDot color="#C8102E" label="Expenses" />
                  </div>
                </div>
                {canShowTrendChart ? (
                  <RevenueChart data={trend} />
                ) : onePointTrend ? (
                  <EmptyState title="Select a wider range to see trend charts" />
                ) : (
                  <EmptyState />
                )}
              </section>

              <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-[16px] border border-hairline bg-canvas p-6">
                  <h3 className="mb-6 text-[16px] font-semibold text-ink">Expense Breakdown</h3>
                  {canShowExpenseChart ? (
                    <ExpenseBreakdownChart data={expenseBreakdown} />
                  ) : (
                    <EmptyState
                      subtitle="No expenses recorded for this period"
                      title="No expenses recorded"
                    />
                  )}
                </div>

                <div className="rounded-[16px] border border-hairline bg-canvas p-6">
                  <h3 className="mb-6 text-[16px] font-semibold text-ink">Highlights</h3>
                  <div className="space-y-4">
                    {metricRows.map((row) => (
                      <MetricRow
                        icon={row.icon}
                        key={row.label}
                        label={row.label}
                        value={row.value}
                      />
                    ))}
                  </div>
                </div>
              </section>

              <section className="mt-6 rounded-[16px] border border-hairline bg-canvas p-6">
                <h3 className="mb-6 text-[16px] font-semibold text-ink">Salary vs Revenue</h3>
                {canShowSalaryChart ? (
                  <SalaryVsRevenueChart data={salaryVsRevenue} />
                ) : onePointTrend ? (
                  <EmptyState title="Select a wider range to see trend charts" />
                ) : (
                  <EmptyState />
                )}
              </section>

              <button
                className="mb-4 mt-8 flex items-center gap-2 text-[14px] font-semibold text-brand transition hover:text-brandDark"
                onClick={() => setShowTable((current) => !current)}
                type="button"
              >
                {showTable ? (
                  <ChevronUp aria-hidden="true" className="h-4 w-4" />
                ) : (
                  <ChevronDown aria-hidden="true" className="h-4 w-4" />
                )}
                {showTable ? 'Hide' : 'View'} Detailed Breakdown Table
              </button>

              {showTable ? (
                <ReportsBreakdownTable
                  period={range.period}
                  rows={summary?.breakdown_rows || []}
                />
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  )
}
