/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  CheckCircle2,
  Pencil,
  PieChart as PieChartIcon,
  Plus,
  Receipt,
  Scale,
  Search,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import Avatar from '@shared/components/Avatar'
import ConfirmationModal from '@shared/components/ConfirmationModal'
import Pagination from '@shared/components/Pagination'
import SkeletonRow from '@shared/components/SkeletonRow'
import DarkTooltip from '@shared/components/charts/DarkTooltip'
import { useToast } from '@shared/components/Toast'
import { useDebounce } from '@shared/hooks/useDebounce'
import { useCountUp } from '@shared/lib/countUp'
import { PAGE_SIZE, normalizePaginatedResponse } from '@shared/lib/pagination'
import { formatDate, getBackendError } from '@shared/lib/records'
import { usePermission } from '@shared/lib/usePermission'
import {
  deleteExpense,
  getExpenseCategories,
  getExpenses,
  getExpenseSummary,
  getPatientRevenue,
  getSalaryRecords,
  markSalaryPaid,
} from '@shared/services/api'
import { getExpensePeriodLabel } from '../../components/expenses/periods.js'

const PKR_SYMBOL = '\u20A8'
const CHART_COLORS = ['#4338CA', '#0D9488', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6']
const TYPE_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Operational', value: 'operational' },
  { label: 'Salary', value: 'salary' },
  { label: 'Equipment', value: 'equipment' },
  { label: 'Supplies', value: 'supplies' },
  { label: 'Other', value: 'other' },
]
const TYPE_META = {
  equipment: {
    className: 'border-amber-200 bg-amber-50 text-amber-700',
    label: 'Equipment',
  },
  operational: {
    className: 'border-sky-200 bg-sky-50 text-sky-700',
    label: 'Operational',
  },
  other: {
    className: 'border-slate-200 bg-slate-100 text-slate-500',
    label: 'Other',
  },
  salary: {
    className: 'border-violet-200 bg-violet-50 text-violet-700',
    label: 'Salary',
  },
  supplies: {
    className: 'border-teal-200 bg-teal-50 text-teal-700',
    label: 'Supplies',
  },
}
const EXPENSE_TABLE_COLUMNS = [
  { className: '', label: 'Date' },
  { className: '', label: 'Category' },
  { className: '', label: 'Type' },
  { className: '', label: 'Description' },
  { className: 'text-right', label: 'Amount' },
  { className: '', label: 'Added By' },
  { className: 'text-right', label: 'Actions' },
]
const SALARY_TABLE_COLUMNS = [
  { className: '', label: 'Employee' },
  { className: '', label: 'Role' },
  { className: '', label: 'Type' },
  { className: '', label: 'Month' },
  { className: 'text-right', label: 'Amount' },
  { className: 'text-right', label: 'Status' },
]
const CATEGORY_CHIP_CLASSES = [
  'border-brand/20 bg-brand-light text-brand',
  'border-teal-200 bg-teal-50 text-teal-700',
  'border-amber-200 bg-amber-50 text-amber-700',
  'border-rose-200 bg-rose-50 text-rose-600',
  'border-violet-200 bg-violet-50 text-violet-700',
  'border-pink-200 bg-pink-50 text-pink-700',
  'border-indigo-200 bg-indigo-50 text-indigo-700',
  'border-sky-200 bg-sky-50 text-sky-700',
]

function numberValue(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function formatPkr(value, { sign = false } = {}) {
  const amount = numberValue(value)
  const absolute = Math.abs(amount)
  const signLabel = sign && amount > 0 ? '+' : amount < 0 ? '-' : ''

  return `${PKR_SYMBOL} ${signLabel}${absolute.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}`
}

function formatAxisPkr(value) {
  const amount = Math.abs(numberValue(value))
  const signLabel = numberValue(value) < 0 ? '-' : ''

  if (amount >= 100000) {
    const lakhs = amount / 100000
    return `${signLabel}${lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(1)}L`
  }

  if (amount >= 1000) {
    return `${signLabel}${Math.round(amount / 1000)}K`
  }

  return `${signLabel}${amount}`
}

function formatMonthLabel(value, period) {
  if (period === 'month' || String(value || '').startsWith('Week')) {
    return value
  }

  const [year, month] = String(value || '').split('-')

  if (!year || !month) {
    return value
  }

  return new Intl.DateTimeFormat('en-US', { month: 'short' }).format(
    new Date(Number(year), Number(month) - 1, 1),
  )
}

function hashString(value) {
  return String(value || '').split('').reduce((hash, char) => hash + char.charCodeAt(0), 0)
}

function categoryChipClass(category) {
  return CATEGORY_CHIP_CLASSES[hashString(category) % CATEGORY_CHIP_CLASSES.length]
}

function normalizeCategoryItems(response) {
  const source = Array.isArray(response?.results) ? response.results : Array.isArray(response) ? response : []

  return source
    .map((item) => {
      if (typeof item === 'string') {
        return { count: null, name: item }
      }

      return {
        count: item.count ?? item.usage_count ?? null,
        name: item.name || item.category || '',
      }
    })
    .filter((item) => item.name)
}

function ExpenseTypePill({ type }) {
  const meta = TYPE_META[type] || TYPE_META.other

  return (
    <span className={`inline-flex max-w-full truncate whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  )
}

function SummaryCard({ borderClass = '', context, contextClass = 'text-slate/70', icon: Icon, iconClass, label, net = false, value }) {
  const animatedValue = useCountUp(value, 800)
  const valueClass = net
    ? numberValue(value) < 0
      ? 'text-rose-500'
      : 'text-green-600'
    : 'text-ink'

  return (
    <section className={`rounded-card border border-hairline bg-canvas p-4 shadow-card ${borderClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={`font-mono text-[28px] font-bold leading-none ${valueClass}`}>
            {formatPkr(animatedValue, { sign: net })}
          </p>
          <p className="mt-3 text-[13px] font-medium text-slate">{label}</p>
          <p className={`mt-1 text-[12px] font-normal ${contextClass}`}>{context}</p>
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
          <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
        </div>
      </div>
    </section>
  )
}

function SummaryStrip({ revenue, salaryCount, summary }) {
  const safeSummary = summary || {}
  const net = numberValue(safeSummary.net)
  const positiveNet = net >= 0

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        context={`${numberValue(revenue?.paid_count)} paid appointments`}
        icon={TrendingUp}
        iconClass="bg-green-50 text-green-600"
        label="Patient Revenue"
        value={safeSummary.total_patient_revenue}
      />
      <SummaryCard
        context="Salaries + Operational"
        icon={Receipt}
        iconClass="bg-rose-50 text-rose-500"
        label="Total Expenses"
        value={safeSummary.total_expenses}
      />
      <SummaryCard
        context={`${salaryCount} employees`}
        icon={Users}
        iconClass="bg-violet-50 text-violet-600"
        label="Salary Expenses"
        value={safeSummary.total_salary}
      />
      <SummaryCard
        borderClass={positiveNet ? 'border-l-[3px] border-l-green-400' : 'border-l-[3px] border-l-rose-400'}
        context={positiveNet ? 'Surplus this period' : 'Deficit this period'}
        contextClass={positiveNet ? 'text-green-600' : 'text-rose-500'}
        icon={Scale}
        iconClass="bg-brand-light text-brand"
        label="Net Balance"
        net
        value={net}
      />
    </div>
  )
}

function RevenueExpenseChart({ period, summary }) {
  const chartData = useMemo(() => {
    const source = Array.isArray(summary?.monthly_breakdown) ? summary.monthly_breakdown : []

    return source.map((item) => {
      const revenue = numberValue(item.revenue)
      const expenses = numberValue(item.expenses)

      return {
        expenses,
        label: formatMonthLabel(item.month || item.label, period),
        net: revenue - expenses,
        revenue,
      }
    })
  }, [period, summary])

  return (
    <section className="min-w-0 rounded-card bg-canvas p-4 shadow-card">
      <div className="mb-4">
        <h2 className="text-[16px] font-bold text-ink">Revenue vs Expenses</h2>
        <p className="mt-1 text-[13px] text-slate">{getExpensePeriodLabel(period)}</p>
      </div>
      <div className="h-[260px] min-w-0">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[14px] font-medium text-slate">
            No financial activity for this period
          </div>
        ) : (
          <ResponsiveContainer height="100%" minHeight={1} minWidth={1} width="100%">
            <ComposedChart data={chartData} margin={{ bottom: 8, left: 0, right: 8, top: 8 }}>
              <CartesianGrid stroke="#E4E8EB" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="label"
                interval={period === 'year' ? 1 : 0}
                tick={{ fill: '#5B6472', fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}
                tickLine={false}
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fill: '#5B6472', fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}
                tickFormatter={formatAxisPkr}
                tickLine={false}
              />
              <Tooltip content={<DarkTooltip />} formatter={(value) => formatPkr(value)} />
              <ReferenceLine y={0} stroke="#E4E8EB" strokeDasharray="4 4" />
              <Bar barSize={20} dataKey="revenue" fill="#0D9488" name="Revenue" radius={[4, 4, 0, 0]} />
              <Bar barSize={20} dataKey="expenses" fill="#EF4444" name="Expenses" radius={[4, 4, 0, 0]} />
              <Line dataKey="net" dot={false} name="Net" stroke="#4338CA" strokeWidth={2} type="monotone" />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-[12px] text-slate">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#0D9488]" />
          Revenue
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#EF4444]" />
          Expenses
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-px w-5 rounded-full bg-brand" />
          Net
        </span>
      </div>
    </section>
  )
}

function CategoryBreakdown({ summary }) {
  const data = Array.isArray(summary?.category_breakdown) ? summary.category_breakdown : []
  const total = data.reduce((sum, item) => sum + numberValue(item.amount), 0)

  if (data.length === 0 || total === 0) {
    return (
      <section className="flex min-h-[344px] flex-col items-center justify-center rounded-card bg-canvas p-5 text-center shadow-card">
        <PieChartIcon aria-hidden="true" className="mb-3 h-8 w-8 text-brand/20" />
        <p className="text-[14px] font-semibold text-ink">No expense data for this period</p>
      </section>
    )
  }

  return (
    <section className="min-w-0 rounded-card bg-canvas p-4 shadow-card">
      <h2 className="text-[15px] font-bold text-ink">Expense Breakdown</h2>
      <div className="relative mt-2 h-[200px] min-w-0">
        <ResponsiveContainer height="100%" minHeight={1} minWidth={1} width="100%">
          <PieChart>
            <Tooltip content={<DarkTooltip />} formatter={(value) => formatPkr(value)} />
            <Pie data={data} dataKey="amount" innerRadius={60} label={false} labelLine={false} outerRadius={85}>
              {data.map((item, index) => (
                <Cell
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                  key={item.category}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-[18px] font-bold text-ink">{formatPkr(total)}</span>
          <span className="text-[11px] text-slate">Total</span>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {data.slice(0, 6).map((item, index) => {
          const percent = total > 0 ? Math.round((numberValue(item.amount) / total) * 100) : 0

          return (
            <div className="flex items-center gap-2" key={item.category}>
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
              />
              <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{item.category}</span>
              <span className="font-mono text-[13px] font-medium text-slate">{formatPkr(item.amount)}</span>
              <span className="w-9 text-right text-[11px] text-slate/60">{percent}%</span>
            </div>
          )
        })}
        {data.length > 6 ? (
          <p className="pt-1 text-[12px] font-medium text-slate">+ {data.length - 6} more</p>
        ) : null}
      </div>
    </section>
  )
}

function ExpenseLog({
  categories,
  categoryFilter,
  expenses,
  loading,
  onCategoryFilterChange,
  onDelete,
  onPageChange,
  onSearchChange,
  onTypeFilterChange,
  page,
  periodTotal,
  search,
  total,
  typeFilter,
}) {
  const navigate = useNavigate()

  return (
    <section className="overflow-hidden rounded-card bg-canvas shadow-card">
      <div className="grid gap-3 border-b border-hairline px-4 py-3 xl:grid-cols-[128px_minmax(0,1fr)_auto] xl:items-center">
        <h2 className="text-[16px] font-bold text-ink">Expense Log</h2>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <label className="relative">
            <span className="sr-only">Search expenses</span>
            <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate/60" />
            <input
              className="h-[34px] w-[220px] rounded-control border border-hairline bg-canvas py-2 pl-9 pr-3 text-[13px] text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search expenses"
              type="search"
              value={search}
            />
          </label>
          <select
            className="h-[34px] w-[220px] rounded-control border border-hairline bg-canvas px-3 text-[13px] text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25"
            onChange={(event) => onCategoryFilterChange(event.target.value)}
            value={categoryFilter}
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.name} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1">
            {TYPE_OPTIONS.map((type) => {
              const active = type.value === typeFilter

              return (
                <button
                  className={[
                    'h-[30px] rounded-full border px-3 text-[11px] font-semibold transition',
                    active
                      ? 'border-brand bg-brand text-white'
                      : 'border-hairline bg-canvas text-slate hover:bg-mist hover:text-ink',
                  ].join(' ')}
                  key={type.value || 'all'}
                  onClick={() => onTypeFilterChange(type.value)}
                  type="button"
                >
                  {type.label}
                </button>
              )
            })}
          </div>
        </div>
        <button
          className="primary-button inline-flex h-[34px] items-center justify-center gap-2 rounded-control bg-brand px-4 text-[13px] font-semibold text-white transition hover:bg-brand-dark"
          onClick={() => navigate('/financial-reports/expenses/add')}
          type="button"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add Expense
        </button>
      </div>
      <div className="overflow-hidden">
        <table className="w-full table-fixed border-collapse text-left">
          <colgroup>
            <col className="w-[10%]" />
            <col className="w-[14%]" />
            <col className="w-[12%]" />
            <col className="w-[26%]" />
            <col className="w-[12%]" />
            <col className="w-[15%]" />
            <col className="w-[11%]" />
          </colgroup>
          <thead className="sticky top-0 border-b border-hairline bg-mist">
            <tr>
              {EXPENSE_TABLE_COLUMNS.map((column) => (
                <th
                  className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate ${column.className}`}
                  key={column.label}
                  scope="col"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, index) => (
                <SkeletonRow columns={7} index={index} key={index} />
              ))
            ) : expenses.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center" colSpan={7}>
                  <Receipt aria-hidden="true" className="mx-auto mb-3 h-10 w-10 text-brand/20" />
                  <p className="text-[15px] font-semibold text-ink">No expenses recorded</p>
                  <p className="mt-1 text-[13px] text-slate">for this period</p>
                  <Link
                    className="mt-4 inline-flex items-center gap-2 rounded-control bg-brand px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-brand-dark"
                    to="/financial-reports/expenses/add"
                  >
                    <Plus aria-hidden="true" className="h-4 w-4" />
                    Add Expense
                  </Link>
                </td>
              </tr>
            ) : (
              expenses.map((expense, index) => (
                <tr
                  className="animate-fade-up border-b border-hairline transition-colors last:border-0 hover:bg-brand-light/40"
                  key={expense.id}
                  style={{ animationDelay: `${index * 0.03}s` }}
                >
                  <td className="px-4 py-3.5 font-mono text-[12px] text-slate">{formatDate(expense.expense_date)}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex max-w-full truncate whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold ${categoryChipClass(expense.category)}`}>
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <ExpenseTypePill type={expense.expense_type} />
                  </td>
                  <td className="truncate px-4 py-3.5 text-[13px] text-ink" title={expense.description || ''}>
                    {expense.description || '-'}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-[13px] font-medium text-ink">
                    {formatPkr(expense.amount)}
                  </td>
                  <td className="truncate px-4 py-3.5 text-[12px] text-slate">{expense.added_by || '-'}</td>
                  <td className="px-3 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                        onClick={() => navigate(`/financial-reports/expenses/${expense.id}/edit`)}
                        title="Edit expense"
                        type="button"
                      >
                        <span className="sr-only">Edit expense</span>
                        <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                        onClick={() => onDelete(expense)}
                        title="Delete expense"
                        type="button"
                      >
                        <span className="sr-only">Delete expense</span>
                        <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-2 border-t border-hairline bg-mist px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] font-medium text-slate">Showing {expenses.length} entries</p>
        <p className="font-mono text-[14px] font-semibold text-ink">Period Total: {formatPkr(periodTotal)}</p>
      </div>
      <Pagination currentPage={page} onPageChange={onPageChange} totalCount={total} />
    </section>
  )
}

function SalaryStatus({ record, onMarkPaid, showAction }) {
  if (record.status === 'paid') {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700">
        <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
        Paid
      </span>
    )
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <span className="inline-flex whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
        Pending
      </span>
      {showAction ? (
        <button
          className="h-7 whitespace-nowrap rounded-lg border border-hairline bg-canvas px-2 text-[11px] font-semibold text-slate transition hover:bg-mist hover:text-ink"
          onClick={() => onMarkPaid(record)}
          type="button"
        >
          Mark Paid
        </button>
      ) : null}
    </div>
  )
}

function SalaryOverview({ loading, onMarkPaid, page, records, stats, total, onPageChange, period, showActions }) {
  return (
    <section className="mt-4 overflow-hidden rounded-card bg-canvas shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3">
        <div>
          <h2 className="text-[15px] font-bold text-ink">Salary Overview</h2>
          <p className="mt-1 text-[12px] text-slate">{getExpensePeriodLabel(period)}</p>
        </div>
        <span className="text-[13px] font-semibold text-brand">{'Manage \u2192'}</span>
      </div>
      <div className="grid items-start gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-hidden">
          <table className="w-full table-fixed border-collapse text-left">
            <colgroup>
              <col className="w-[24%]" />
              <col className="w-[18%]" />
              <col className="w-[12%]" />
              <col className="w-[13%]" />
              <col className="w-[15%]" />
              <col className="w-[18%]" />
            </colgroup>
            <thead className="border-b border-hairline bg-mist">
              <tr>
                {SALARY_TABLE_COLUMNS.map((column) => (
                  <th
                    className={`px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate ${column.className}`}
                    key={column.label}
                    scope="col"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <SkeletonRow columns={6} index={index} key={index} />
                ))
              ) : records.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center" colSpan={6}>
                    <p className="text-[14px] font-semibold text-ink">No salary records</p>
                    <p className="mt-1 text-[13px] text-slate">for this period</p>
                  </td>
                </tr>
              ) : (
                records.map((record, index) => (
                  <tr
                    className="animate-fade-up border-b border-hairline transition-colors last:border-0 hover:bg-brand-light/40"
                    key={record.id}
                    style={{ animationDelay: `${index * 0.03}s` }}
                  >
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-2">
                        <Avatar name={record.employee_name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-ink">{record.employee_name}</p>
                          <p className="truncate text-[11px] text-slate">{record.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="truncate px-3 py-3.5 text-[13px] text-slate">{record.role}</td>
                    <td className="px-3 py-3.5">
                      <span className={[
                        'inline-flex max-w-full truncate whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold',
                        record.employee_type === 'doctor'
                          ? 'bg-brand-light text-brand'
                          : 'bg-violet-50 text-violet-700',
                      ].join(' ')}
                      >
                        {record.employee_type === 'doctor' ? 'Doctor' : 'Staff'}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 font-mono text-[12px] text-slate">{record.salary_month}</td>
                    <td className="px-3 py-3.5 text-right font-mono text-[13px] font-medium text-ink">{formatPkr(record.amount)}</td>
                    <td className="px-3 py-3.5 text-right">
                      <SalaryStatus
                        onMarkPaid={onMarkPaid}
                        record={record}
                        showAction={showActions}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <Pagination currentPage={page} onPageChange={onPageChange} totalCount={total} />
        </div>
        <aside className="rounded-xl bg-mist p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] font-medium text-slate">Total Salary Expense</span>
              <span className="font-mono text-[20px] font-bold text-ink">{formatPkr(stats.total)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] text-slate">Doctors</span>
              <span className="font-mono text-[16px] font-medium text-brand">{formatPkr(stats.doctors)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] text-slate">Staff</span>
              <span className="font-mono text-[16px] font-medium text-violet-600">{formatPkr(stats.staff)}</span>
            </div>
          </div>
          <div className="my-4 h-px bg-hairline" />
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-slate">Paid</span>
              <span className="font-semibold text-green-600">{stats.paid}</span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-slate">Pending</span>
              <span className="font-semibold text-amber-600">{stats.pending}</span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-slate">Total Employees</span>
              <span className="font-semibold text-ink">{stats.employees}</span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}

function PatientRevenueSection({ revenue }) {
  const chartData = Array.isArray(revenue?.monthly) ? revenue.monthly : []

  return (
    <section className="mt-4 rounded-card bg-canvas p-4 shadow-card">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-ink">Patient Revenue</h2>
          <p className="mt-1 text-[12px] text-slate">From appointments</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <p className="font-mono text-[24px] font-bold text-green-600">{formatPkr(revenue?.total_revenue)}</p>
          <p className="mt-1 text-[12px] text-slate">Total Revenue</p>
        </div>
        <div>
          <p className="font-mono text-[20px] font-bold text-ink">{numberValue(revenue?.paid_count)} paid</p>
          <p className="mt-1 text-[12px] text-slate">Appointments</p>
        </div>
        <div>
          <p className="font-mono text-[20px] font-bold text-rose-500">{formatPkr(revenue?.unpaid_amount)}</p>
          <p className="mt-1 text-[12px] text-slate">{numberValue(revenue?.unpaid_count)} unpaid</p>
        </div>
      </div>
      <div className="mt-5 h-20">
        <ResponsiveContainer height="100%" minHeight={1} minWidth={1} width="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="patientRevenueGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#4338CA" stopOpacity={0.24} />
                <stop offset="95%" stopColor="#4338CA" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              dataKey="amount"
              fill="url(#patientRevenueGradient)"
              stroke="#4338CA"
              strokeWidth={2}
              type="monotone"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex justify-end">
        <Link className="text-[13px] font-semibold text-brand transition hover:text-brand-dark" to="/appointments?payment_status=unpaid">
          {'View Unpaid Appointments \u2192'}
        </Link>
      </div>
    </section>
  )
}

export default function ExpensesTab({ period }) {
  const toast = useToast()
  const { role } = usePermission()
  const isAdmin = role?.slug === 'admin'
  const [summary, setSummary] = useState(null)
  const [revenue, setRevenue] = useState(null)
  const [categories, setCategories] = useState([])
  const [expenses, setExpenses] = useState([])
  const [expenseCount, setExpenseCount] = useState(0)
  const [expensePeriodTotal, setExpensePeriodTotal] = useState(0)
  const [expensePage, setExpensePage] = useState(1)
  const [salaryPage, setSalaryPage] = useState(1)
  const [salaryRecords, setSalaryRecords] = useState([])
  const [salaryCount, setSalaryCount] = useState(0)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [expensesLoading, setExpensesLoading] = useState(true)
  const [salaryLoading, setSalaryLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const debouncedSearch = useDebounce(search, 300)

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true)
    try {
      const [summaryData, revenueData] = await Promise.all([
        getExpenseSummary(period),
        getPatientRevenue(period),
      ])
      setSummary(summaryData)
      setRevenue(revenueData)
    } catch (error) {
      toast.error(getBackendError(error, 'Financial overview could not be loaded.'))
      setSummary(null)
      setRevenue(null)
    } finally {
      setOverviewLoading(false)
    }
  }, [period, toast])

  const loadCategories = useCallback(async () => {
    try {
      const response = await getExpenseCategories()
      setCategories(normalizeCategoryItems(response))
    } catch {
      setCategories([])
    }
  }, [])

  const loadExpenses = useCallback(async () => {
    setExpensesLoading(true)
    try {
      const response = await getExpenses({
        category: categoryFilter || undefined,
        expense_type: typeFilter || undefined,
        ordering: '-expense_date',
        page: expensePage,
        page_size: PAGE_SIZE,
        period,
        search: debouncedSearch.trim() || undefined,
      })
      const normalized = normalizePaginatedResponse(response)
      const visibleTotal = normalized.results.reduce((sum, expense) => sum + numberValue(expense.amount), 0)

      setExpenses(normalized.results)
      setExpenseCount(normalized.count)
      setExpensePeriodTotal(
        numberValue(response?.period_total ?? response?.total_amount ?? response?.total_expenses ?? visibleTotal),
      )
    } catch (error) {
      toast.error(getBackendError(error, 'Expenses could not be loaded.'))
      setExpenses([])
      setExpenseCount(0)
      setExpensePeriodTotal(0)
    } finally {
      setExpensesLoading(false)
    }
  }, [categoryFilter, debouncedSearch, expensePage, period, toast, typeFilter])

  const loadSalaries = useCallback(async () => {
    setSalaryLoading(true)
    try {
      const response = await getSalaryRecords({
        page: salaryPage,
        page_size: PAGE_SIZE,
        period,
      })
      const normalized = normalizePaginatedResponse(response)

      setSalaryRecords(normalized.results)
      setSalaryCount(normalized.count)
    } catch (error) {
      toast.error(getBackendError(error, 'Salary records could not be loaded.'))
      setSalaryRecords([])
      setSalaryCount(0)
    } finally {
      setSalaryLoading(false)
    }
  }, [period, salaryPage, toast])

  useEffect(() => {
    setExpensePage(1)
    setSalaryPage(1)
  }, [period])

  useEffect(() => {
    loadOverview()
  }, [loadOverview])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  useEffect(() => {
    loadExpenses()
  }, [loadExpenses])

  useEffect(() => {
    loadSalaries()
  }, [loadSalaries])

  const salaryStats = useMemo(() => {
    return salaryRecords.reduce(
      (stats, record) => {
        const amount = numberValue(record.amount)

        stats.total += amount
        stats.employees += 1
        if (record.employee_type === 'doctor') stats.doctors += amount
        if (record.employee_type === 'staff') stats.staff += amount
        if (record.status === 'paid') stats.paid += 1
        if (record.status !== 'paid') stats.pending += 1
        return stats
      },
      { doctors: 0, employees: 0, paid: 0, pending: 0, staff: 0, total: 0 },
    )
  }, [salaryRecords])

  function handleFilterUpdate(setter) {
    return (value) => {
      setter(value)
      setExpensePage(1)
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return

    const target = deleteTarget
    const previousExpenses = expenses
    setIsDeleting(true)
    setExpenses((currentExpenses) => currentExpenses.filter((expense) => expense.id !== target.id))
    setExpenseCount((currentCount) => Math.max(0, currentCount - 1))

    try {
      await deleteExpense(target.id)
      toast.success('Expense deleted')
      setDeleteTarget(null)
      await Promise.all([loadExpenses(), loadOverview(), loadCategories()])
    } catch (error) {
      setExpenses(previousExpenses)
      toast.error(getBackendError(error, 'Expense could not be deleted.'))
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleMarkPaid(record) {
    const previousRecords = salaryRecords
    setSalaryRecords((currentRecords) =>
      currentRecords.map((currentRecord) =>
        currentRecord.id === record.id
          ? { ...currentRecord, paid_date: new Date().toISOString().slice(0, 10), status: 'paid' }
          : currentRecord,
      ),
    )

    try {
      await markSalaryPaid(record.id)
      toast.success('Salary marked paid')
      await loadSalaries()
    } catch (error) {
      setSalaryRecords(previousRecords)
      toast.error(getBackendError(error, 'Salary status could not be updated.'))
    }
  }

  return (
    <>
      <SummaryStrip revenue={revenue} salaryCount={salaryCount} summary={summary} />

      {overviewLoading ? (
        <div className="mb-4 grid gap-4 xl:grid-cols-[minmax(0,60%)_minmax(320px,38%)]">
          <section className="h-[344px] rounded-card bg-canvas p-4 shadow-card">
            <div className="h-full animate-shimmer rounded-card bg-gradient-to-r from-hairline via-canvas to-hairline bg-[length:200%_100%]" />
          </section>
          <section className="h-[344px] rounded-card bg-canvas p-5 shadow-card">
            <div className="h-full animate-shimmer rounded-card bg-gradient-to-r from-hairline via-canvas to-hairline bg-[length:200%_100%]" />
          </section>
        </div>
      ) : (
        <div className="mb-4 grid gap-4 xl:grid-cols-[minmax(0,60%)_minmax(320px,38%)]">
          <RevenueExpenseChart period={period} summary={summary} />
          <CategoryBreakdown summary={summary} />
        </div>
      )}

      <ExpenseLog
        categories={categories}
        categoryFilter={categoryFilter}
        expenses={expenses}
        loading={expensesLoading}
        onCategoryFilterChange={handleFilterUpdate(setCategoryFilter)}
        onDelete={setDeleteTarget}
        onPageChange={setExpensePage}
        onSearchChange={handleFilterUpdate(setSearch)}
        onTypeFilterChange={handleFilterUpdate(setTypeFilter)}
        page={expensePage}
        periodTotal={expensePeriodTotal}
        search={search}
        total={expenseCount}
        typeFilter={typeFilter}
      />

      <SalaryOverview
        loading={salaryLoading}
        onMarkPaid={handleMarkPaid}
        onPageChange={setSalaryPage}
        page={salaryPage}
        period={period}
        records={salaryRecords}
        stats={salaryStats}
        showActions={isAdmin}
        total={salaryCount}
      />

      <PatientRevenueSection revenue={revenue} />

      {deleteTarget ? (
        <ConfirmationModal
          body={`This will permanently delete the ${deleteTarget.category} expense for ${formatPkr(deleteTarget.amount)}.`}
          confirmLabel="Delete Expense"
          isLoading={isDeleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete expense?"
        />
      ) : null}
    </>
  )
}
