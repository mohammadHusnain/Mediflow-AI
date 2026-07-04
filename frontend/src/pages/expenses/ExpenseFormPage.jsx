import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

import ConfirmationModal from '@shared/components/ConfirmationModal'
import {
  ErrorBanner,
  FieldError,
  FieldLabel,
  FormField,
  LoadingSpinner,
  getFieldClass,
} from '@shared/components/FormPrimitives'
import { useToast } from '@shared/components/Toast'
import { useDebounce } from '@shared/hooks/useDebounce'
import { getBackendError } from '@shared/lib/records'
import {
  createExpense,
  deleteExpense,
  getExpenseById,
  getExpenseCategories,
  updateExpense,
} from '@shared/services/api'

const PKR_SYMBOL = '\u20A8'
const EXPENSE_TYPES = [
  { label: 'Operational', value: 'operational' },
  { label: 'Salary', value: 'salary' },
  { label: 'Equipment', value: 'equipment' },
  { label: 'Supplies', value: 'supplies' },
  { label: 'Other', value: 'other' },
]
const EXPENSE_STATUS_OPTIONS = [
  { label: 'Recorded', value: 'recorded' },
  { label: 'Approved', value: 'approved' },
  { label: 'Void', value: 'void' },
]
const MONTH_OPTIONS = [
  { label: 'January', value: '01' },
  { label: 'February', value: '02' },
  { label: 'March', value: '03' },
  { label: 'April', value: '04' },
  { label: 'May', value: '05' },
  { label: 'June', value: '06' },
  { label: 'July', value: '07' },
  { label: 'August', value: '08' },
  { label: 'September', value: '09' },
  { label: 'October', value: '10' },
  { label: 'November', value: '11' },
  { label: 'December', value: '12' },
]

function getCurrentMonthParts() {
  const today = new Date()
  return {
    month: String(today.getMonth() + 1).padStart(2, '0'),
    year: String(today.getFullYear()),
  }
}

const CURRENT_MONTH_PARTS = getCurrentMonthParts()
const EMPTY_FORM = {
  amount: '',
  category: '',
  description: '',
  expense_date: new Date().toISOString().slice(0, 10),
  expense_month: CURRENT_MONTH_PARTS.month,
  expense_name: '',
  expense_type: 'operational',
  expense_year: CURRENT_MONTH_PARTS.year,
  status: 'recorded',
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

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

function getMonthFromDate(dateValue) {
  return String(dateValue || '').slice(5, 7) || CURRENT_MONTH_PARTS.month
}

function getYearFromDate(dateValue) {
  return String(dateValue || '').slice(0, 4) || CURRENT_MONTH_PARTS.year
}

function getExpenseYearOptions() {
  const currentYear = Number(CURRENT_MONTH_PARTS.year)
  return Array.from({ length: 8 }, (_, index) => String(currentYear - index))
}

function isFutureExpenseMonth(month, year) {
  const monthNumber = Number(month)
  const yearNumber = Number(year)
  const currentMonth = Number(CURRENT_MONTH_PARTS.month)
  const currentYear = Number(CURRENT_MONTH_PARTS.year)

  return yearNumber > currentYear || (yearNumber === currentYear && monthNumber > currentMonth)
}

function getLastDayOfMonth(month, year) {
  return new Date(Number(year), Number(month), 0).getDate()
}

function buildExpenseDate(month, year, preferredDate = getToday()) {
  const monthValue = String(month || CURRENT_MONTH_PARTS.month).padStart(2, '0')
  const yearValue = String(year || CURRENT_MONTH_PARTS.year)
  const preferredDay = Number(String(preferredDate || '').slice(-2)) || 1
  const maxDay = getLastDayOfMonth(monthValue, yearValue)
  const currentDayCap = monthValue === CURRENT_MONTH_PARTS.month && yearValue === CURRENT_MONTH_PARTS.year
    ? Number(getToday().slice(-2))
    : maxDay
  const day = String(Math.max(1, Math.min(preferredDay, maxDay, currentDayCap))).padStart(2, '0')

  return `${yearValue}-${monthValue}-${day}`
}

function validateForm(form) {
  const errors = {}
  const category = String(form.category || '').trim()
  const amountText = String(form.amount ?? '').trim()
  const amount = Number.parseFloat(amountText)
  const month = String(form.expense_month || '').padStart(2, '0')
  const year = String(form.expense_year || '')

  if (!category) {
    errors.category = 'Category is required'
  } else if (category.length < 2) {
    errors.category = 'Category must be at least 2 characters'
  }

  if (!String(form.expense_name || '').trim()) {
    errors.expense_name = 'Expense name is required'
  }

  if (!form.expense_type) {
    errors.expense_type = 'Expense type is required'
  }

  if (!MONTH_OPTIONS.some((option) => option.value === month)) {
    errors.expense_month = 'Expense month is required'
  }

  if (!year || Number.isNaN(Number(year))) {
    errors.expense_year = 'Expense year is required'
  } else if (isFutureExpenseMonth(month, year)) {
    errors.expense_year = 'Cannot record a future expense month'
  }

  if (!form.status) {
    errors.status = 'Status is required'
  }

  if (!amountText || Number.isNaN(amount)) {
    errors.amount = 'Valid amount required'
  } else if (amount <= 0) {
    errors.amount = 'Amount must be greater than zero'
  }

  if (!form.expense_date) {
    errors.expense_date = 'Expense date is required'
  } else if (form.expense_date > getToday()) {
    errors.expense_date = 'Cannot record a future expense'
  }

  return errors
}

function CategoryField({
  categories,
  error,
  onBlur,
  onChange,
  onSelect,
  open,
  setOpen,
  value,
}) {
  const debouncedValue = useDebounce(value, 200)
  const trimmedValue = debouncedValue.trim()
  const matches = useMemo(() => {
    if (!trimmedValue) {
      return []
    }

    return categories
      .filter((category) => category.name.toLowerCase().includes(trimmedValue.toLowerCase()))
      .slice(0, 5)
  }, [categories, trimmedValue])
  const exactMatch = categories.find(
    (category) => category.name.toLowerCase() === trimmedValue.toLowerCase(),
  )
  const showDropdown = open && trimmedValue.length > 0

  return (
    <div className="relative animate-fade-up md:col-span-2">
      <label className="block">
        <FieldLabel error={error} label="Category" />
        <input
          className={getFieldClass(error)}
          onBlur={(event) => {
            onBlur(event)
            window.setTimeout(() => setOpen(false), 120)
          }}
          onChange={(event) => {
            onChange(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Electricity, Furniture, Rent"
          type="text"
          value={value}
        />
      </label>
      <FieldError>{error}</FieldError>

      {showDropdown ? (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-hairline bg-canvas shadow-card">
          {matches.map((category) => (
            <button
              className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[14px] text-ink transition hover:bg-brand-light/40"
              key={category.name}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(category.name)}
              type="button"
            >
              <span>{category.name}</span>
              {category.count !== null ? (
                <span className="text-[11px] text-slate">{category.count} used</span>
              ) : null}
            </button>
          ))}
          {!exactMatch ? (
            <button
              className="flex w-full border-t border-hairline px-4 py-2.5 text-left text-[14px] font-medium text-brand transition hover:bg-brand-light/40"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(trimmedValue)}
              type="button"
            >
              Use "{trimmedValue}"
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default function ExpenseFormPage({ mode = 'add' }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const toast = useToast()
  const isEdit = mode === 'edit'
  const [form, setForm] = useState(EMPTY_FORM)
  const [categories, setCategories] = useState([])
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isLoading, setIsLoading] = useState(isEdit)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const yearOptions = useMemo(() => getExpenseYearOptions(), [])
  const amount = Number.parseFloat(String(form.amount || '').trim())
  const largeAmountWarning = Number.isFinite(amount) && amount > 10000000
    ? 'Large amount - please verify'
    : ''

  useEffect(() => {
    let mounted = true

    async function loadCategories() {
      try {
        const response = await getExpenseCategories()
        if (mounted) {
          setCategories(normalizeCategoryItems(response))
        }
      } catch {
        if (mounted) {
          setCategories([])
        }
      }
    }

    loadCategories()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!isEdit) {
      return undefined
    }

    let mounted = true

    async function loadExpense() {
      setIsLoading(true)
      setSubmitError('')

      try {
        const expense = await getExpenseById(id)

        if (mounted) {
          const expenseDate = expense.expense_date || getToday()
          setForm({
            amount: String(expense.amount ?? ''),
            category: expense.category || '',
            description: expense.description || '',
            expense_date: expenseDate,
            expense_month: String(expense.expense_month || getMonthFromDate(expenseDate)).padStart(2, '0'),
            expense_name: expense.expense_name || expense.name || expense.category || '',
            expense_type: expense.expense_type || 'operational',
            expense_year: String(expense.expense_year || getYearFromDate(expenseDate)),
            status: expense.status || 'recorded',
          })
        }
      } catch (error) {
        if (mounted) {
          setSubmitError(getBackendError(error, 'Expense could not be loaded.'))
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    loadExpense()

    return () => {
      mounted = false
    }
  }, [id, isEdit])

  function updateField(name, value) {
    setForm((currentForm) => {
      const nextForm = { ...currentForm, [name]: value }

      if (name === 'expense_month' || name === 'expense_year') {
        nextForm.expense_date = buildExpenseDate(
          name === 'expense_month' ? value : currentForm.expense_month,
          name === 'expense_year' ? value : currentForm.expense_year,
          currentForm.expense_date,
        )
      }

      if (name === 'expense_date') {
        nextForm.expense_month = getMonthFromDate(value)
        nextForm.expense_year = getYearFromDate(value)
      }

      return nextForm
    })
    setErrors((currentErrors) => ({ ...currentErrors, [name]: '' }))
    setSubmitError('')
  }

  function getPayload() {
    const categoryInput = form.category.trim()
    const existingCategory = categories.find(
      (category) => category.name.toLowerCase() === categoryInput.toLowerCase(),
    )
    const amountValue = Number.parseFloat(String(form.amount || '').trim())

    return {
      amount: Number(amountValue.toFixed(2)),
      category: existingCategory?.name || categoryInput,
      description: form.description.trim(),
      expense_date: buildExpenseDate(form.expense_month, form.expense_year, form.expense_date),
      expense_month: Number(form.expense_month),
      expense_name: form.expense_name.trim(),
      expense_type: form.expense_type,
      expense_year: Number(form.expense_year),
      status: form.status,
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = validateForm(form)
    setErrors(nextErrors)
    setSubmitError('')

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setIsSubmitting(true)

    try {
      if (isEdit) {
        await updateExpense(id, getPayload())
        toast.success('Expense updated')
      } else {
        await createExpense(getPayload())
        toast.success('Expense recorded')
      }

      navigate('/financial-reports/expenses')
    } catch (error) {
      setSubmitError(getBackendError(error, 'Expense could not be saved.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)

    try {
      await deleteExpense(id)
      toast.success('Expense deleted')
      navigate('/financial-reports/expenses')
    } catch (error) {
      setSubmitError(getBackendError(error, 'Expense could not be deleted.'))
    } finally {
      setIsDeleting(false)
      setDeleteOpen(false)
    }
  }

  return (
    <div className="animate-fade-up">
      <div className="mx-auto max-w-2xl rounded-card bg-canvas p-5 shadow-card sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <button
              className="mb-3 inline-flex items-center gap-2 text-[13px] font-semibold text-slate transition hover:text-ink"
              onClick={() => navigate('/financial-reports/expenses')}
              type="button"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              Back
            </button>
            <h1 className="text-[22px] font-bold leading-tight text-ink">
              {isEdit ? 'Edit Expense' : 'Record Expense'}
            </h1>
            <p className="mt-1 text-[14px] text-slate">
              {isEdit ? 'Update clinic expense details' : 'Add a new clinic expense entry'}
            </p>
          </div>
          {isEdit ? (
            <button
              className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
              onClick={() => setDeleteOpen(true)}
              title="Delete expense"
              type="button"
            >
              <span className="sr-only">Delete expense</span>
              <Trash2 aria-hidden="true" className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {isLoading ? (
          <div className="flex h-44 items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <section>
              <h2 className="mb-2.5 text-[13px] font-medium uppercase tracking-wide text-slate">
                Expense Details
              </h2>
              <div className="mb-3.5 h-px bg-hairline" />
              <div className="grid gap-4 md:grid-cols-2">
                <FormField error={errors.expense_name} label="Expense Name">
                  <input
                    className={getFieldClass(errors.expense_name)}
                    onChange={(event) => updateField('expense_name', event.target.value)}
                    placeholder="Monthly rent, generator fuel, lab supplies"
                    type="text"
                    value={form.expense_name}
                  />
                </FormField>

                <CategoryField
                  categories={categories}
                  error={errors.category}
                  onBlur={() => {}}
                  onChange={(value) => updateField('category', value)}
                  onSelect={(value) => {
                    updateField('category', value)
                    setCategoryOpen(false)
                  }}
                  open={categoryOpen}
                  setOpen={setCategoryOpen}
                  value={form.category}
                />

                <FormField error={errors.expense_month} label="Expense Month">
                  <select
                    className={getFieldClass(errors.expense_month)}
                    onChange={(event) => updateField('expense_month', event.target.value)}
                    value={form.expense_month}
                  >
                    {MONTH_OPTIONS.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField error={errors.expense_year} label="Expense Year">
                  <select
                    className={getFieldClass(errors.expense_year)}
                    onChange={(event) => updateField('expense_year', event.target.value)}
                    value={form.expense_year}
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField error={errors.expense_type} label="Expense Type">
                  <select
                    className={getFieldClass(errors.expense_type)}
                    onChange={(event) => updateField('expense_type', event.target.value)}
                    value={form.expense_type}
                  >
                    {EXPENSE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField error={errors.status} label="Status">
                  <select
                    className={getFieldClass(errors.status)}
                    onChange={(event) => updateField('status', event.target.value)}
                    value={form.status}
                  >
                    {EXPENSE_STATUS_OPTIONS.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField error={errors.amount} label="Amount (PKR)">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-[14px] text-slate">
                      {PKR_SYMBOL}
                    </span>
                    <input
                      className={getFieldClass(errors.amount, 'pl-12 font-mono')}
                      min="0"
                      onChange={(event) => updateField('amount', event.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      type="number"
                      value={form.amount}
                    />
                  </div>
                  <FieldError tone="warning">{largeAmountWarning}</FieldError>
                </FormField>

                <FormField error={errors.expense_date} label="Ledger Date">
                  <input
                    className={getFieldClass(errors.expense_date)}
                    max={getToday()}
                    onChange={(event) => updateField('expense_date', event.target.value)}
                    type="date"
                    value={form.expense_date}
                  />
                </FormField>

                <div className="md:col-span-2">
                  <FormField error={errors.description} label="Description" optional>
                    <textarea
                      className={getFieldClass(errors.description, 'min-h-[76px] resize-none')}
                      onChange={(event) => updateField('description', event.target.value)}
                      placeholder="Additional details"
                      rows={2}
                      value={form.description}
                    />
                  </FormField>
                </div>
              </div>
            </section>

            <ErrorBanner message={submitError} />

            <div className="flex justify-end gap-3 pt-1">
              <button
                className="rounded-control border border-hairline bg-canvas px-4 py-2.5 text-[13px] font-semibold text-slate transition hover:bg-mist hover:text-ink"
                disabled={isSubmitting}
                onClick={() => navigate('/financial-reports/expenses')}
                type="button"
              >
                Cancel
              </button>
              <button
                className="primary-button inline-flex min-w-[128px] items-center justify-center rounded-control bg-brand px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? <LoadingSpinner light /> : isEdit ? 'Save Changes' : 'Save Expense'}
              </button>
            </div>
          </form>
        )}
      </div>

      {deleteOpen ? (
        <ConfirmationModal
          body="This will permanently delete this expense entry."
          confirmLabel="Delete Expense"
          isLoading={isDeleting}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={handleDelete}
          title="Delete expense?"
        />
      ) : null}
    </div>
  )
}
