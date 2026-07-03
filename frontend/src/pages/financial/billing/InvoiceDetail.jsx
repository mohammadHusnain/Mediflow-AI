import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock,
  Download,
  FileX,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

import InvoiceBadge from '../../../components/financial/InvoiceBadge.jsx'
import { useAuth } from '@shared/context/AuthContext'
import {
  downloadBlob,
  downloadInvoicePDF,
  getInvoice,
  markInvoicePaid,
} from '@shared/services/billingApi'

function numberValue(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function formatPkr(value) {
  return `PKR ${numberValue(value).toLocaleString()}`
}

function formatDate(value, fallback = '-') {
  if (!value) return fallback

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback

  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatDateTime(value, fallback = '-') {
  if (!value) return fallback

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback

  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function titleCase(value) {
  const text = String(value || '').replace(/[_-]+/g, ' ').trim()

  if (!text) return '-'

  return text.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function invoiceNumber(invoice) {
  return invoice?.invoice_number || invoice?.number || `INV-${invoice?.id || ''}`
}

function patientName(invoice) {
  return invoice?.patient_name || invoice?.patient?.full_name || invoice?.patient?.name || 'Unknown patient'
}

function patientPhone(invoice) {
  return invoice?.patient_phone || invoice?.patient?.phone || invoice?.patient?.mobile || '-'
}

function patientId(invoice) {
  return invoice?.patient_id || invoice?.patient?.id || '-'
}

function doctorName(invoice) {
  return invoice?.doctor_name || invoice?.doctor?.full_name || invoice?.doctor?.name || ''
}

function appointmentId(invoice) {
  return invoice?.appointment_id || invoice?.appointment?.id || '-'
}

function appointmentDate(invoice) {
  return (
    invoice?.appointment_date ||
    invoice?.appointment?.appointment_dt ||
    invoice?.appointment?.date ||
    invoice?.invoice_date ||
    invoice?.created_at
  )
}

function invoiceAmount(invoice) {
  return invoice?.amount ?? invoice?.total_amount ?? invoice?.total ?? 0
}

function MetaRow({ fontMono = false, label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-hairline py-2 last:border-0">
      <span className="text-[13px] font-normal text-slate">{label}</span>
      <span className={`text-right text-[13px] font-medium text-ink ${fontMono ? 'font-mono' : ''}`}>
        {value || '-'}
      </span>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-24 animate-pulse rounded-[16px] bg-canvas" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="h-[520px] animate-pulse rounded-[16px] bg-canvas lg:col-span-2" />
        <div className="h-[320px] animate-pulse rounded-[16px] bg-canvas" />
      </div>
    </div>
  )
}

function NotFoundCard() {
  const navigate = useNavigate()

  return (
    <section className="mx-auto flex min-h-[360px] max-w-xl items-center justify-center rounded-[16px] border border-hairline bg-canvas p-8 text-center shadow-card">
      <div>
        <FileX aria-hidden="true" className="mx-auto mb-4 h-10 w-10 text-hairline" />
        <h2 className="text-[18px] font-semibold text-ink">Invoice not found</h2>
        <p className="mt-2 text-[14px] text-slate">The invoice may have been deleted or moved.</p>
        <button
          className="mt-5 rounded-control bg-brand px-5 py-2.5 text-[14px] font-semibold text-white transition hover:bg-brand-dark"
          onClick={() => navigate('/financial-reports/billing/invoices')}
          type="button"
        >
          Back to Invoices
        </button>
      </div>
    </section>
  )
}

export default function InvoiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { role } = useAuth()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [actionError, setActionError] = useState('')
  const [saving, setSaving] = useState(false)
  const canWrite = role?.slug !== 'doctor'

  const loadInvoice = useCallback(async () => {
    setLoading(true)
    setActionError('')
    try {
      const data = await getInvoice(id)
      setInvoice(data)
      setNotFound(false)
    } catch (error) {
      if (error?.response?.status === 404) {
        setNotFound(true)
      } else {
        setActionError('Invoice could not be loaded.')
      }
      setInvoice(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadInvoice()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadInvoice])

  useEffect(() => {
    if (invoice?.status === 'paid' && !invoice?.paid_at) {
      console.warn(`Invoice ${invoiceNumber(invoice)} is marked paid without a paid_at timestamp.`)
    }
  }, [invoice])

  const amount = useMemo(() => invoiceAmount(invoice), [invoice])
  const status = String(invoice?.status || '').toLowerCase()
  const showMarkPaid = canWrite && ['pending', 'partial'].includes(status)

  async function handleDownload() {
    try {
      const blob = await downloadInvoicePDF(id)
      downloadBlob(blob, `${invoiceNumber(invoice)}.pdf`)
    } catch {
      setActionError('Invoice PDF could not be downloaded.')
    }
  }

  async function handleMarkPaid() {
    setSaving(true)
    setActionError('')
    try {
      await markInvoicePaid(id)
      await loadInvoice()
    } catch {
      setActionError('Invoice could not be marked as paid.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <DetailSkeleton />
  }

  if (notFound) {
    return <NotFoundCard />
  }

  if (!invoice) {
    return (
      <section className="rounded-[16px] border border-[#FFC9C9] bg-[#FCE4E8] px-5 py-4 text-[14px] font-medium text-[#C8102E]">
        {actionError || 'Invoice could not be loaded.'}
      </section>
    )
  }

  return (
    <div>
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button
            className="mb-4 inline-flex items-center gap-2 text-[14px] font-medium text-slate transition hover:text-ink"
            onClick={() => navigate(-1)}
            type="button"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-[28px] text-ink">Invoice #{invoiceNumber(invoice)}</h2>
            <InvoiceBadge status={invoice.status} />
          </div>
          <p className="mt-1 text-[14px] font-normal text-slate">
            Generated {formatDate(invoice.created_at || invoice.invoice_date)}
          </p>
        </div>

        {canWrite ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-control border border-hairline bg-canvas px-5 py-2.5 text-[14px] font-semibold text-ink transition hover:bg-mist"
              onClick={handleDownload}
              type="button"
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              Download PDF
            </button>
            {showMarkPaid ? (
              <button
                className="inline-flex items-center gap-2 rounded-control bg-brand px-5 py-2.5 text-[14px] font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
                disabled={saving}
                onClick={handleMarkPaid}
                type="button"
              >
                <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                Mark as Paid
              </button>
            ) : null}
          </div>
        ) : null}
      </header>

      {actionError ? (
        <div className="mb-6 rounded-[12px] border border-[#FFC9C9] bg-[#FCE4E8] px-5 py-4 text-[14px] font-medium text-[#C8102E]">
          {actionError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-[16px] border border-hairline bg-canvas p-8 lg:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-brand text-[18px] font-bold text-white">
                M
              </div>
              <span className="text-[16px] font-bold text-ink">MediFlow AI</span>
            </div>
            <div className="text-left sm:text-right">
              <h3 className="font-display text-[22px] text-ink">INVOICE</h3>
              <p className="mt-1 font-mono text-[13px] text-slate">#{invoiceNumber(invoice)}</p>
            </div>
          </div>

          <div className="my-6 border-t border-hairline" />

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate">Billed To</p>
              <p className="text-[16px] font-semibold text-ink">{patientName(invoice)}</p>
              <p className="mt-1 font-mono text-[13px] text-slate">{patientPhone(invoice)}</p>
              <p className="mt-1 font-mono text-[12px] text-slate/70">Patient ID: {patientId(invoice)}</p>
            </div>
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate">
                Appointment Details
              </p>
              {doctorName(invoice) ? (
                <p className="text-[14px] font-medium text-ink">Dr. {doctorName(invoice)}</p>
              ) : (
                <p className="text-[14px] font-medium italic text-slate">Unassigned</p>
              )}
              <p className="mt-1 font-mono text-[13px] text-slate">{formatDateTime(appointmentDate(invoice))}</p>
              <p className="mt-1 font-mono text-[12px] text-slate/70">Appointment ID: {appointmentId(invoice)}</p>
            </div>
          </div>

          <div className="my-6 border-t border-hairline" />

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-hairline">
                  {['Description', 'Qty', 'Unit Price', 'Total'].map((header) => (
                    <th
                      className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate first:pl-0 last:text-right last:pr-0"
                      key={header}
                      scope="col"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-hairline">
                  <td className="px-3 py-4 pl-0 text-[14px] font-normal text-ink">Consultation Fee</td>
                  <td className="px-3 py-4 font-mono text-[14px] text-ink">1</td>
                  <td className="px-3 py-4 font-mono text-[14px] text-ink">{formatPkr(amount)}</td>
                  <td className="px-3 py-4 pr-0 text-right font-mono text-[14px] text-ink">{formatPkr(amount)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 border-t border-hairline pt-4">
            <div className="ml-auto max-w-[280px] space-y-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[14px] font-normal text-slate">Subtotal</span>
                <span className="font-mono text-[14px] text-ink">{formatPkr(amount)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[14px] font-normal text-slate">Tax (0%)</span>
                <span className="font-mono text-[14px] text-ink">PKR 0</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[16px] font-bold text-ink">Total</span>
                <span className="font-mono text-[18px] font-bold text-brand">{formatPkr(amount)}</span>
              </div>
            </div>
          </div>

          {status === 'paid' ? (
            <div className="mt-6 flex items-center gap-2 rounded-[10px] bg-[#E3F7EC] px-4 py-3">
              <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-[#0F9D66]" />
              <span className="text-[13px] font-medium text-[#0F9D66]">
                Payment received on {invoice.paid_at ? formatDate(invoice.paid_at) : '-'}
              </span>
            </div>
          ) : (
            <div className="mt-6 flex items-center gap-2 rounded-[10px] bg-[#FEF3C7] px-4 py-3">
              <Clock aria-hidden="true" className="h-4 w-4 text-[#B45309]" />
              <span className="text-[13px] font-medium text-[#B45309]">Payment pending</span>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-[14px] border border-hairline bg-mist p-5">
            <h3 className="mb-4 text-[13px] font-semibold text-ink">Invoice Details</h3>
            <MetaRow label="Status" value={titleCase(invoice.status)} />
            <MetaRow fontMono label="Invoice #" value={invoiceNumber(invoice)} />
            <MetaRow fontMono label="Created" value={formatDate(invoice.created_at || invoice.invoice_date)} />
            <MetaRow fontMono label="Due Date" value={formatDate(invoice.due_date)} />
            <MetaRow label="Payment Method" value={titleCase(invoice.payment_method)} />
          </section>

          <section className="rounded-[14px] border border-hairline bg-mist p-5">
            <h3 className="mb-3 text-[13px] font-semibold text-ink">Linked Appointment</h3>
            <div className="flex items-start gap-2">
              <CalendarClock aria-hidden="true" className="mt-0.5 h-4 w-4 text-brand" />
              <div>
                <p className="text-[14px] font-medium text-ink">{formatDateTime(appointmentDate(invoice))}</p>
                <p className="mt-1 block text-[13px] font-normal text-slate">
                  {doctorName(invoice) ? `Dr. ${doctorName(invoice)}` : 'Unassigned'}
                </p>
              </div>
            </div>
            <button
              className="mt-4 text-[13px] font-semibold text-brand transition hover:text-brand-dark"
              onClick={() => navigate('/appointments')}
              type="button"
            >
              View Appointment -&gt;
            </button>
          </section>
        </aside>
      </div>
    </div>
  )
}
