import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  PiggyBank,
  Receipt,
  TrendingUp,
  Wallet,
} from 'lucide-react'

import DateRangePicker from '../../../components/financial/DateRangePicker.jsx'
import ReportsBreakdownTable from '../../../components/financial/ReportsBreakdownTable.jsx'
import RevenueChart from '../../../components/financial/RevenueChart.jsx'
import StatCard from '../../../components/financial/StatCard.jsx'
import { useToast } from '@shared/components/Toast'
import { exportReportPdf } from '@shared/lib/exportPdf'
import { formatCurrencyAmount } from '@shared/lib/currency'
import { getBackendError } from '@shared/lib/records'
import * as reportsApi from '@shared/services/reportsApi'

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

function formatMoney(value) {
  return formatCurrencyAmount(numberValue(value))
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
  summaryData,
  trendData,
}) {
  const trend = normalizeTrendRows(
    normalizeArray(trendData, 'trend').length
      ? normalizeArray(trendData, 'trend')
      : normalizeArray(summaryData, 'trend'),
  )
  const trendRevenue = trend.reduce((sum, row) => sum + numberValue(row.revenue), 0)
  const trendSalary = trend.reduce((sum, row) => sum + numberValue(row.salary), 0)
  const trendExpenses = trend.reduce((sum, row) => sum + numberValue(row.expenses), 0)
  const totalRevenue = getSummaryValue(summaryData, 'total_revenue', trendRevenue)
  const totalSalary = getSummaryValue(summaryData, 'total_salary', trendSalary)
  const totalExpenses = getSummaryValue(summaryData, 'total_expenses', trendExpenses)

  return {
    breakdown_rows: getBreakdownRows(summaryData, trend),
    net_profit: getSummaryValue(summaryData, 'net_profit', totalRevenue - totalSalary - totalExpenses),
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
      <Receipt aria-hidden="true" className="mx-auto mb-3 h-10 w-10 text-hairline" />
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

export default function ReportsOverview() {
  const toast = useToast()
  const [range, setRange] = useState({ dateFrom: null, dateTo: null, period: 'monthly' })
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const loadReports = useCallback(async (signal) => {
    setLoading(true)
    setError(null)

    try {
      const [
        summaryData,
        trendData,
      ] = await Promise.all([
        reportsApi.getFinancialSummary(range, { signal }),
        reportsApi.getRevenueTrend(range, { signal }),
      ])

      if (signal.aborted) return

      setSummary(normalizeReportModel({
        summaryData,
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
  const trend = summary?.trend || []
  const onePointTrend = trend.length === 1
  const canShowTrendChart = trend.length >= 2

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
              sub={label}
              value={formatMoney(summary?.total_revenue)}
            />
            <StatCard
              accentColor="amber"
              icon={Wallet}
              label="Total Salary Paid"
              loading={loading}
              sub={label}
              value={formatMoney(summary?.total_salary)}
            />
            <StatCard
              accentColor="red"
              icon={Receipt}
              label="Total Expenses"
              loading={loading}
              sub={label}
              value={formatMoney(summary?.total_expenses)}
            />
            <StatCard
              accentColor={numberValue(summary?.net_profit) < 0 ? 'red' : 'green'}
              icon={PiggyBank}
              label="Net Profit"
              loading={loading}
              sub="revenue - salary - expenses"
              value={formatMoney(summary?.net_profit)}
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

              <ReportsBreakdownTable
                period={range.period}
                rows={summary?.breakdown_rows || []}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}
