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
const EMPTY_FORM = {
  amount: '',
  category: '',
  description: '',
  expense_date: new Date().toISOString().slice(0, 10),
  expense_type: 'operational',
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

function validateForm(form) {
  const errors = {}
  const category = String(form.category || '').trim()
  const amountText = String(form.amount ?? '').trim()
  const amount = Number.parseFloat(amountText)

  if (!category) {
    errors.category = 'Category is required'
  } else if (category.length < 2) {
    errors.category = 'Category must be at least 2 characters'
  }

  if (!form.expense_type) {
    errors.expense_type = 'Expense type is required'
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
          setForm({
            amount: String(expense.amount ?? ''),
            category: expense.category || '',
            description: expense.description || '',
            expense_date: expense.expense_date || getToday(),
            expense_type: expense.expense_type || 'operational',
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
    setForm((currentForm) => ({ ...currentForm, [name]: value }))
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
      expense_date: form.expense_date,
      expense_type: form.expense_type,
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

                <FormField error={errors.expense_date} label="Expense Date">
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
