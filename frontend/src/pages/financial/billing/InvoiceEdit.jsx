import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, CalendarDays } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'

import CurrencyInput from '@shared/components/CurrencyInput.jsx'
import {
  ErrorBanner,
  FormField,
  FormSection,
  LoadingSpinner,
  getFieldClass,
} from '@shared/components/FormPrimitives'
import { useToast } from '@shared/components/Toast'
import { getInvoiceAppointmentId } from '@shared/lib/invoices'
import { getBackendError } from '@shared/lib/records'
import { getInvoice, updateInvoice } from '@shared/services/billingApi'

const STATUS_OPTIONS = [
  { label: 'Paid', value: 'paid' },
  { label: 'Pending', value: 'pending' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Partial', value: 'partial' },
]

function invoiceNumber(invoice) {
  return invoice?.invoice_number || invoice?.number || `INV-${invoice?.id || ''}`
}

function invoiceAmount(invoice) {
  return invoice?.amount ?? invoice?.total_amount ?? invoice?.total ?? ''
}

function appointmentId(invoice) {
  return getInvoiceAppointmentId(invoice)
}

function toFormValues(invoice) {
  return {
    amount: invoiceAmount(invoice),
    notes: invoice?.notes || invoice?.description || '',
    payment_method: invoice?.payment_method || '',
    status: invoice?.status || 'pending',
  }
}

export default function InvoiceEdit() {
  const { id, invoiceId } = useParams()
  const resolvedInvoiceId = invoiceId || id
  const navigate = useNavigate()
  const toast = useToast()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitError, setSubmitError] = useState('')
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm({ defaultValues: toFormValues(null) })

  const loadInvoice = useCallback(async () => {
    setLoading(true)
    setSubmitError('')

    try {
      const data = await getInvoice(resolvedInvoiceId)
      setInvoice(data)
      reset(toFormValues(data))
    } catch (error) {
      setSubmitError(getBackendError(error, 'Invoice could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [reset, resolvedInvoiceId])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadInvoice, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadInvoice])

  async function onSubmit(values) {
    setSubmitError('')
    const amount = Number(values.amount)

    try {
      await updateInvoice(resolvedInvoiceId, {
        amount,
        description: values.notes || '',
        notes: values.notes || '',
        payment_method: values.payment_method || '',
        status: values.status,
        total_amount: amount,
      })
      toast.success('Invoice updated')
      navigate(`/financial-reports/billing/invoice/${resolvedInvoiceId}`)
    } catch (error) {
      setSubmitError(getBackendError(error, 'Invoice could not be saved.'))
    }
  }

  return (
    <div className="animate-fade-up">
      <div className="mx-auto max-w-2xl rounded-card bg-canvas p-5 shadow-card sm:p-6">
        <div className="mb-5">
          <button
            className="mb-3 inline-flex items-center gap-2 text-[13px] font-semibold text-slate transition hover:text-ink"
            onClick={() => navigate(`/financial-reports/billing/invoice/${resolvedInvoiceId}`)}
            type="button"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back
          </button>
          <h1 className="text-[22px] font-bold leading-tight text-ink">Edit Invoice</h1>
          <p className="mt-1 text-[14px] text-slate">
            {invoice ? `Invoice #${invoiceNumber(invoice)}` : 'Loading invoice'}
          </p>
        </div>

        {loading ? (
          <div className="flex h-44 items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <FormSection title="Invoice Details">
              <FormField label="Invoice ID">
                <p className="rounded-control border border-hairline bg-mist px-4 py-2.5 font-mono text-[13px] text-slate">
                  {invoiceNumber(invoice)}
                </p>
              </FormField>

              <FormField label="Linked Appointment" optional>
                <div className="rounded-control border border-hairline bg-mist px-4 py-2.5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[13px] font-medium text-slate">
                      {appointmentId(invoice) ? 'Linked appointment available' : 'No linked appointment'}
                    </p>
                    {appointmentId(invoice) ? (
                      <button
                        className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand transition hover:text-brand-dark"
                        onClick={() => navigate(`/appointments/${appointmentId(invoice)}`)}
                        type="button"
                      >
                        <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />
                        View Appointment
                      </button>
                    ) : null}
                  </div>
                </div>
              </FormField>

              <FormField error={errors.amount?.message} label="Amount">
                <CurrencyInput
                  inputClassName={errors.amount?.message ? 'border-[#C8102E] bg-[#FCE4E8]/50' : ''}
                  placeholder="0.00"
                  {...register('amount', {
                    required: 'Amount is required',
                    min: { value: 0, message: 'Amount cannot be negative' },
                    valueAsNumber: true,
                  })}
                />
              </FormField>

              <FormField error={errors.status?.message} label="Payment Status">
                <select
                  className={getFieldClass(errors.status?.message)}
                  {...register('status', { required: 'Payment status is required' })}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Payment Method" optional>
                <select className={getFieldClass(false)} {...register('payment_method')}>
                  <option value="">Select method</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="online">Online Transfer</option>
                  <option value="insurance">Insurance</option>
                </select>
              </FormField>

              <div className="md:col-span-2">
                <FormField label="Notes" optional>
                  <textarea
                    className={getFieldClass(false, 'min-h-[90px] resize-y')}
                    placeholder="Invoice notes or line item description"
                    rows={3}
                    {...register('notes')}
                  />
                </FormField>
              </div>
            </FormSection>

            <ErrorBanner message={submitError} />

            <div className="flex justify-end gap-3">
              <button
                className="rounded-control border border-hairline bg-canvas px-4 py-2.5 text-[13px] font-semibold text-slate transition hover:bg-mist hover:text-ink"
                disabled={isSubmitting}
                onClick={() => navigate(`/financial-reports/billing/invoice/${resolvedInvoiceId}`)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="primary-button inline-flex min-w-[128px] items-center justify-center rounded-control bg-brand px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? <LoadingSpinner light /> : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
