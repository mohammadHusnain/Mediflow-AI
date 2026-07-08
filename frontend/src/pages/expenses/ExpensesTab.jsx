import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import ConfirmationModal from '@shared/components/ConfirmationModal'
import CurrencyDisplay from '@shared/components/CurrencyDisplay'
import Pagination from '@shared/components/Pagination'
import SkeletonRow from '@shared/components/SkeletonRow'
import { useToast } from '@shared/components/Toast'
import { useDebounce } from '@shared/hooks/useDebounce'
import { PAGE_SIZE, normalizePaginatedResponse } from '@shared/lib/pagination'
import { formatDate, getBackendError } from '@shared/lib/records'
import { usePermission } from '@shared/lib/usePermission'
import {
  deleteExpense,
  getExpenseCategories,
  getExpenses,
} from '@shared/services/api'

const TYPE_OPTIONS = [
  { label: 'All Types', value: '' },
  { label: 'Operational', value: 'operational' },
  { label: 'Salary', value: 'salary' },
  { label: 'Equipment', value: 'equipment' },
  { label: 'Supplies', value: 'supplies' },
  { label: 'Other', value: 'other' },
]

const MONTH_OPTIONS = [
  ['01', 'January'],
  ['02', 'February'],
  ['03', 'March'],
  ['04', 'April'],
  ['05', 'May'],
  ['06', 'June'],
  ['07', 'July'],
  ['08', 'August'],
  ['09', 'September'],
  ['10', 'October'],
  ['11', 'November'],
  ['12', 'December'],
]

function currentMonthParts() {
  const now = new Date()
  return {
    month: String(now.getMonth() + 1).padStart(2, '0'),
    year: String(now.getFullYear()),
  }
}

function numberValue(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function titleCase(value) {
  const text = String(value || '').replace(/[_-]+/g, ' ').trim()

  if (!text) return '-'

  return text.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function monthLabel(month, year) {
  const monthName = MONTH_OPTIONS.find(([value]) => value === String(month).padStart(2, '0'))?.[1] || month
  return `${monthName} ${year}`
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

function getExpenseName(expense) {
  return expense.expense_name || expense.name || expense.description || expense.category || '-'
}

function getExpenseMonth(expense) {
  return String(expense.expense_month || String(expense.expense_date || '').slice(5, 7)).padStart(2, '0')
}

function getExpenseYear(expense) {
  return String(expense.expense_year || String(expense.expense_date || '').slice(0, 4))
}

function ExpenseTypeBadge({ type }) {
  return (
    <span className="inline-flex rounded-full border border-hairline bg-mist px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate">
      {titleCase(type)}
    </span>
  )
}

function isWithinLast24Hours(value) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  return Date.now() - date.getTime() <= 24 * 60 * 60 * 1000
}

function groupExpensesByMonth(expenses) {
  const groups = expenses.reduce((map, expense) => {
    const month = getExpenseMonth(expense)
    const year = getExpenseYear(expense)
    const key = `${year}-${month}`
    const current = map.get(key) || {
      expenses: [],
      key,
      month,
      total: 0,
      year,
    }

    current.expenses.push(expense)
    current.total += numberValue(expense.amount)
    map.set(key, current)
    return map
  }, new Map())

  return [...groups.values()].sort((left, right) => right.key.localeCompare(left.key))
}

function ExpenseRows({ canManage, expenses, onDelete }) {
  const navigate = useNavigate()

  return (
    <table className="w-full min-w-[860px] border-collapse text-left">
      <thead className="border-b border-hairline bg-mist/70">
        <tr>
          {[
            'Date',
            'Category',
            'Type',
            'Description',
            'Amount',
            'Actions',
          ].map((header) => (
            <th
              className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate"
              key={header}
              scope="col"
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {expenses.map((expense) => (
          <tr className="border-b border-hairline last:border-0 hover:bg-mist/40" key={expense.id}>
            <td className="px-4 py-2.5 font-mono text-[12px] text-slate">
              <div className="flex items-center gap-2">
                {formatDate(expense.expense_date || expense.created_at)}
                {isWithinLast24Hours(expense.created_at) ? (
                  <span className="rounded-full bg-brand-light px-1.5 py-0.5 text-[9px] font-semibold text-brand">
                    NEW
                  </span>
                ) : null}
              </div>
            </td>
            <td className="px-4 py-2.5 text-[13px] font-semibold text-ink">{expense.category || '-'}</td>
            <td className="px-4 py-2.5">
              <ExpenseTypeBadge type={expense.expense_type} />
            </td>
            <td className="max-w-[340px] truncate px-4 py-2.5 text-[13px] text-slate">
              {expense.description || '-'}
            </td>
            <td className="px-4 py-2.5 text-[14px] font-semibold text-ink">
              <CurrencyDisplay amount={expense.amount} />
            </td>
            <td className="px-4 py-2.5">
              {canManage ? (
                <div className="flex items-center gap-2">
                  <button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 transition hover:bg-amber-100"
                    onClick={() => navigate(`/financial-reports/expenses/${expense.id}/edit`)}
                    title="Edit expense"
                    type="button"
                  >
                    <span className="sr-only">Edit expense</span>
                    <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                    onClick={() => onDelete(expense)}
                    title="Delete expense"
                    type="button"
                  >
                    <span className="sr-only">Delete expense</span>
                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <span className="text-[12px] text-slate">Read only</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function ExpensesTab() {
  const toast = useToast()
  const { canWrite } = usePermission()
  const canManage = canWrite('financial_reports')
  const { month: initialMonth, year: initialYear } = currentMonthParts()
  const [categories, setCategories] = useState([])
  const [expenses, setExpenses] = useState([])
  const [expenseCount, setExpenseCount] = useState(0)
  const [periodTotal, setPeriodTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [month, setMonth] = useState(initialMonth)
  const [year, setYear] = useState(initialYear)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const debouncedSearch = useDebounce(search, 300)
  const dateError = dateFrom && dateTo && dateTo < dateFrom
  const filtersActive = Boolean(
    debouncedSearch ||
    categoryFilter ||
    typeFilter ||
    dateFrom ||
    dateTo ||
    month !== initialMonth ||
    year !== initialYear
  )

  const years = useMemo(() => {
    const current = Number(initialYear)
    return Array.from({ length: 5 }, (_, index) => String(current - index))
  }, [initialYear])

  const loadCategories = useCallback(async () => {
    try {
      const response = await getExpenseCategories()
      setCategories(normalizeCategoryItems(response))
    } catch {
      setCategories([])
    }
  }, [])

  const loadExpenses = useCallback(async () => {
    if (dateError) return

    setLoading(true)
    try {
      const response = await getExpenses({
        category: categoryFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        expense_type: typeFilter || undefined,
        month,
        ordering: '-expense_date',
        page,
        page_size: PAGE_SIZE,
        search: debouncedSearch.trim() || undefined,
        year,
      })
      const normalized = normalizePaginatedResponse(response)
      const visibleTotal = normalized.results.reduce((sum, expense) => sum + numberValue(expense.amount), 0)

      setExpenses(normalized.results)
      setExpenseCount(normalized.count)
      setPeriodTotal(numberValue(response?.period_total ?? response?.total_amount ?? visibleTotal))
    } catch (error) {
      toast.error(getBackendError(error, 'Expenses could not be loaded.'))
      setExpenses([])
      setExpenseCount(0)
      setPeriodTotal(0)
    } finally {
      setLoading(false)
    }
  }, [categoryFilter, dateError, dateFrom, dateTo, debouncedSearch, month, page, toast, typeFilter, year])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadCategories, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadCategories])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadExpenses, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadExpenses])

  function resetPageAndSet(setter) {
    return (value) => {
      setter(value)
      setPage(1)
    }
  }

  function clearFilters() {
    setSearch('')
    setMonth(initialMonth)
    setYear(initialYear)
    setCategoryFilter('')
    setTypeFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return

    const target = deleteTarget
    setIsDeleting(true)

    try {
      await deleteExpense(target.id)
      toast.success('Expense deleted')
      setDeleteTarget(null)
      await Promise.all([loadExpenses(), loadCategories()])
    } catch (error) {
      toast.error(getBackendError(error, 'Expense could not be deleted.'))
    } finally {
      setIsDeleting(false)
    }
  }

  const groups = groupExpensesByMonth(expenses)

  return (
    <>
      <section className="mb-5 rounded-[16px] border border-hairline bg-canvas px-6 py-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {canManage ? (
            <Link
              className="inline-flex h-11 min-w-[190px] items-center justify-center gap-2 rounded-control bg-brand px-5 text-[14px] font-semibold text-white shadow-[0_10px_24px_rgba(67,56,202,0.22)] transition hover:bg-brand-dark"
              to="/financial-reports/expenses/add"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              Add Expense
            </Link>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <span className="rounded-full border border-hairline bg-mist px-3 py-1 text-[13px] font-medium text-slate">
              {monthLabel(month, year)}
            </span>
            <span className="rounded-full border border-hairline bg-mist px-3 py-1 text-[13px] font-medium text-slate">
              {expenseCount.toLocaleString()} records
            </span>
            <span className="rounded-full border border-hairline bg-mist px-3 py-1 text-[13px] font-semibold text-ink">
              Total <CurrencyDisplay amount={periodTotal} />
            </span>
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-[16px] border border-hairline bg-canvas p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1 sm:col-span-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">Search</span>
            <span className="relative block">
              <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate/60" />
              <input
                className="h-11 w-full rounded-control border border-hairline bg-canvas py-2 pl-9 pr-3 text-[14px] text-ink outline-none transition placeholder:text-slate/60 focus:border-brand focus:ring-1 focus:ring-brand"
                onChange={(event) => resetPageAndSet(setSearch)(event.target.value)}
                placeholder="Name, category, description"
                type="search"
                value={search}
              />
            </span>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">Month</span>
            <select
              className="h-11 w-full rounded-control border border-hairline bg-canvas px-3 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
              onChange={(event) => resetPageAndSet(setMonth)(event.target.value)}
              value={month}
            >
              {MONTH_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">Year</span>
            <select
              className="h-11 w-full rounded-control border border-hairline bg-canvas px-3 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
              onChange={(event) => resetPageAndSet(setYear)(event.target.value)}
              value={year}
            >
              {years.map((yearOption) => (
                <option key={yearOption} value={yearOption}>
                  {yearOption}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">Category</span>
            <select
              className="h-11 w-full rounded-control border border-hairline bg-canvas px-3 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
              onChange={(event) => resetPageAndSet(setCategoryFilter)(event.target.value)}
              value={categoryFilter}
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.name} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">Type</span>
            <select
              className="h-11 w-full rounded-control border border-hairline bg-canvas px-3 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
              onChange={(event) => resetPageAndSet(setTypeFilter)(event.target.value)}
              value={typeFilter}
            >
              {TYPE_OPTIONS.map((type) => (
                <option key={type.value || 'all'} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">Date From</span>
            <input
              className="h-11 w-full rounded-control border border-hairline bg-canvas px-3 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
              onChange={(event) => resetPageAndSet(setDateFrom)(event.target.value)}
              type="date"
              value={dateFrom}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">Date To</span>
            <input
              className="h-11 w-full rounded-control border border-hairline bg-canvas px-3 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
              onChange={(event) => resetPageAndSet(setDateTo)(event.target.value)}
              type="date"
              value={dateTo}
            />
          </label>
          {filtersActive ? (
            <button
              className="inline-flex h-11 items-center justify-center gap-1 self-end rounded-control border border-hairline px-4 text-[13px] font-medium text-slate transition hover:bg-mist hover:text-ink"
              onClick={clearFilters}
              type="button"
            >
              <X aria-hidden="true" className="h-3.5 w-3.5" />
              Clear
            </button>
          ) : null}
        </div>
        {dateError ? (
          <p className="mt-3 text-[13px] font-medium text-[#C8102E]">
            End date must be after start date
          </p>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-[16px] border border-hairline bg-canvas">
        {loading ? (
          <table className="w-full min-w-[860px] border-collapse text-left">
            <tbody>
              {Array.from({ length: 8 }).map((_, index) => (
                <SkeletonRow columns={6} index={index} key={index} />
              ))}
            </tbody>
          </table>
        ) : expenses.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <Receipt aria-hidden="true" className="mx-auto mb-3 h-10 w-10 text-hairline" />
            <p className="font-display text-[18px] italic text-slate">No expenses recorded</p>
            <p className="mt-1 text-[14px] text-slate/70">Add an expense or adjust your filters</p>
            {canManage ? (
              <Link
                className="mt-4 inline-flex items-center gap-2 rounded-control bg-brand px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-brand-dark"
                to="/financial-reports/expenses/add"
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
                Add Expense
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="space-y-0">
            {groups.map((group) => (
              <div className="border-b border-hairline last:border-0" key={group.key}>
                <div className="flex flex-wrap items-center justify-between gap-2 bg-mist/60 px-5 py-3">
                  <h3 className="text-[14px] font-semibold text-ink">{monthLabel(group.month, group.year)}</h3>
                  <div className="flex flex-wrap gap-2 text-[12px] font-medium text-slate">
                    <span>{group.expenses.length} entries</span>
                    <CurrencyDisplay amount={group.total} className="text-ink" />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <ExpenseRows
                    canManage={canManage}
                    expenses={group.expenses}
                    onDelete={setDeleteTarget}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-end gap-3 border-t border-hairline bg-mist/50 px-5 py-3">
          <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-slate">
            Period Total
          </span>
          <CurrencyDisplay amount={periodTotal} className="text-[14px] font-bold text-ink" />
        </div>
        <Pagination currentPage={page} onPageChange={setPage} totalCount={expenseCount} />
      </section>

      {deleteTarget ? (
        <ConfirmationModal
          body={
            <>
              This will permanently delete {getExpenseName(deleteTarget)} for{' '}
              <CurrencyDisplay amount={deleteTarget.amount} className="font-semibold text-ink" />.
            </>
          }
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
