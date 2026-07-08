import { useEffect, useState } from 'react'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

import CategorySelect from '@shared/components/CategorySelect'
import ConfirmationModal from '@shared/components/ConfirmationModal'
import CurrencyInput from '@shared/components/CurrencyInput'
import {
  ErrorBanner,
  FieldError,
  FormField,
  FormSectionHeading,
  LoadingSpinner,
  getFieldClass,
} from '@shared/components/FormPrimitives'
import { useToast } from '@shared/components/Toast'
import { getBackendError, normalizeList } from '@shared/lib/records'
import {
  createExpense,
  deleteExpense,
  getExpenseCategories,
  getExpenseById,
  getExpenses,
  updateExpense,
} from '@shared/services/api'

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

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

function getExpenseTypeLabel(value) {
  return EXPENSE_TYPES.find((type) => type.value === value)?.label || 'Other'
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

function normalizeDuplicateText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase()
}

function sameMoney(left, right) {
  return Number(left || 0).toFixed(2) === Number(right || 0).toFixed(2)
}

function validateForm(form) {
  const errors = {}
  const amountText = String(form.amount ?? '').trim()
  const amount = Number.parseFloat(amountText)

  if (!form.expense_type) {
    errors.expense_type = 'Expense type is required'
  }

  if (!String(form.category || '').trim()) {
    errors.category = 'Category is required'
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

function getExpenseName(expense) {
  return expense?.expense_name || expense?.name || expense?.description || expense?.category || 'this expense'
}

export default function ExpenseFormPage({ mode = 'add' }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const toast = useToast()
  const isEdit = mode === 'edit'
  const [form, setForm] = useState(EMPTY_FORM)
  const [categories, setCategories] = useState([])
  const [originalExpense, setOriginalExpense] = useState(null)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isLoading, setIsLoading] = useState(isEdit)
  const [isSubmitting, setIsSubmitting] = useState(false)
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
          setOriginalExpense(expense)
          setForm({
            amount: String(expense.amount ?? ''),
            category: expense.category || '',
            description: expense.description || expense.expense_name || expense.name || '',
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
    const amountValue = Number.parseFloat(String(form.amount || '').trim())
    const expenseDate = form.expense_date
    const category = form.category.trim() || getExpenseTypeLabel(form.expense_type)
    const description = form.description.trim()
    const expenseName = description || originalExpense?.expense_name || originalExpense?.name || `${category} expense`

    return {
      amount: Number(amountValue.toFixed(2)),
      category,
      description,
      expense_date: expenseDate,
      expense_month: Number(expenseDate.slice(5, 7)),
      expense_name: expenseName,
      expense_type: form.expense_type,
      expense_year: Number(expenseDate.slice(0, 4)),
      status: 'recorded',
    }
  }

  async function findDuplicateExpense(payload) {
    const response = await getExpenses({
      date_from: payload.expense_date,
      date_to: payload.expense_date,
      expense_type: payload.expense_type,
      page_size: 100,
    })
    const expenseName = normalizeDuplicateText(payload.expense_name || payload.description)

    return normalizeList(response).find((expense) => {
      if (isEdit && String(expense.id) === String(id)) {
        return false
      }

      const currentName = normalizeDuplicateText(
        expense.expense_name || expense.description || expense.category,
      )

      return (
        String(expense.expense_date || '').slice(0, 10) === payload.expense_date &&
        String(expense.expense_type || '') === payload.expense_type &&
        sameMoney(expense.amount, payload.amount) &&
        currentName === expenseName
      )
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = validateForm(form)
    setErrors(nextErrors)
    setSubmitError('')

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    const payload = getPayload()
    setIsSubmitting(true)

    try {
      const duplicate = await findDuplicateExpense(payload)

      if (duplicate) {
        setSubmitError('This expense entry already exists for the same date, type, name, and amount.')
        return
      }

      if (isEdit) {
        await updateExpense(id, payload)
        toast.success('Expense updated')
      } else {
        await createExpense(payload)
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
              <FormSectionHeading title="Expense Details" />
              <div className="grid gap-4 md:grid-cols-2">
                <CategorySelect
                  categories={categories}
                  error={errors.category}
                  onCategoryCreated={(createdName) =>
                    setCategories((currentCategories) => {
                      if (currentCategories.some((category) => category.name === createdName)) {
                        return currentCategories
                      }

                      return [...currentCategories, { count: null, name: createdName }]
                    })
                  }
                  onChange={(nextCategory) => updateField('category', nextCategory)}
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

                <FormField error={errors.amount} label="Amount">
                  <CurrencyInput
                    inputClassName={errors.amount ? 'border-[#C8102E] bg-[#FCE4E8]/50' : ''}
                    onChange={(event) => updateField('amount', event.target.value)}
                    placeholder="0.00"
                    value={form.amount}
                  />
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
          body={`This will permanently delete ${getExpenseName(form)}.`}
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
