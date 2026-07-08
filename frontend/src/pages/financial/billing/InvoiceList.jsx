import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Download,
  Eye,
  FileX,
  Search,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import InvoiceBadge from '../../../components/financial/InvoiceBadge.jsx'
import CurrencyDisplay from '@shared/components/CurrencyDisplay.jsx'
import { useAuth } from '@shared/context/AuthContext'
import { useDebounce } from '@shared/hooks/useDebounce'
import {
  downloadBlob,
  downloadInvoicePDF,
  getInvoices,
} from '@shared/services/billingApi'

const PAGE_SIZE = 20
const STATUS_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Paid', value: 'paid' },
  { label: 'Pending', value: 'pending' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Partial', value: 'partial' },
]

function normalizePaginated(response) {
  const results = Array.isArray(response)
    ? response
    : Array.isArray(response?.results)
      ? response.results
      : []

  return {
    count: Number.isFinite(Number(response?.count)) ? Number(response.count) : results.length,
    next: response?.next || null,
    previous: response?.previous || null,
    results,
  }
}

function numberValue(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
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

function combineDateAndTime(dateValue, timeValue) {
  const dateText = String(dateValue || '').trim()
  const timeText = String(timeValue || '').trim()

  if (!dateText) return ''
  if (dateText.includes('T') || !timeText) return dateText

  return `${dateText}T${timeText.slice(0, 5)}`
}

function invoiceNumber(invoice) {
  return invoice?.invoice_number || invoice?.number || `INV-${invoice?.id || ''}`
}

function invoicePatient(invoice) {
  return invoice?.patient_name || invoice?.patient?.full_name || invoice?.patient?.name || 'Unknown patient'
}

function invoiceDoctor(invoice) {
  return invoice?.doctor_name || invoice?.doctor?.full_name || invoice?.doctor?.name || 'Unassigned'
}

function invoiceDate(invoice) {
  return (
    combineDateAndTime(
      invoice?.appointment_info?.appointment_date,
      invoice?.appointment_info?.appointment_time,
    ) ||
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

function Pagination({ count, page, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(numberValue(count) / PAGE_SIZE))
  const start = count > 0 ? (page - 1) * PAGE_SIZE + 1 : 0
  const end = Math.min(page * PAGE_SIZE, count)

  return (
    <div className="flex flex-col gap-3 border-t border-hairline px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[13px] font-normal text-slate">
        Showing {start}-{end} of {count}
      </p>
      <div className="flex items-center gap-2">
        <button
          className="rounded-control border border-hairline bg-canvas px-4 py-2 text-[13px] font-medium text-slate transition hover:bg-mist hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          type="button"
        >
          Prev
        </button>
        <button
          className="rounded-control border border-hairline bg-canvas px-4 py-2 text-[13px] font-medium text-slate transition hover:bg-mist hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          Next
        </button>
      </div>
    </div>
  )
}

function ErrorBanner({ onRetry }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 rounded-[12px] border border-[#FFC9C9] bg-[#FCE4E8] px-5 py-4">
      <AlertCircle aria-hidden="true" className="h-4 w-4 text-[#C8102E]" />
      <span className="text-[14px] font-medium text-[#C8102E]">Failed to load invoices.</span>
      <button
        className="text-[14px] font-semibold text-brand transition hover:text-brand-dark"
        onClick={onRetry}
        type="button"
      >
        Retry
      </button>
    </div>
  )
}

function SkeletonRows() {
  return Array.from({ length: 5 }).map((_, index) => (
    <tr key={index}>
      <td className="px-5 py-3" colSpan={7}>
        <div className="h-[52px] animate-pulse rounded bg-mist/60" />
      </td>
    </tr>
  ))
}

export default function InvoiceList() {
  const navigate = useNavigate()
  const { role } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const debouncedSearch = useDebounce(search, 300)
  const dateError = dateFrom && dateTo && dateTo < dateFrom
  const filtersActive = Boolean(search || status || dateFrom || dateTo)
  const canDownload = role?.slug !== 'doctor'

  const params = useMemo(
    () => ({
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      page,
      page_size: PAGE_SIZE,
      search: debouncedSearch.trim() || undefined,
      status: status || undefined,
    }),
    [dateFrom, dateTo, debouncedSearch, page, status],
  )

  const loadInvoices = useCallback(async () => {
    if (dateError) {
      return
    }

    setLoading(true)
    setError(false)
    try {
      const invoiceData = await getInvoices(params)
      const normalized = normalizePaginated(invoiceData)

      setInvoices(normalized.results)
      setTotal(normalized.count)
    } catch {
      setError(true)
      setInvoices([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [dateError, params])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadInvoices()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadInvoices])

  function resetPageAndSet(setter) {
    return (event) => {
      setter(event.target.value)
      setPage(1)
    }
  }

  function clearFilters() {
    setSearch('')
    setStatus('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  async function handleDownload(invoice, event) {
    event.stopPropagation()
    try {
      const blob = await downloadInvoicePDF(invoice.id)
      downloadBlob(blob, `${invoiceNumber(invoice)}.pdf`)
    } catch {
      setError(true)
    }
  }

  return (
    <div>
      <section className="mb-6 rounded-[16px] border border-hairline bg-canvas p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-[13px] text-slate">
          <span className="rounded-full border border-hairline bg-mist px-3 py-1 font-medium">
            {loading ? 'Loading invoices' : `${total.toLocaleString()} invoices`}
          </span>
          {filtersActive ? (
            <span className="rounded-full border border-brand/20 bg-brand/5 px-3 py-1 font-semibold text-brand">
              Filtered register
            </span>
          ) : (
            <span className="rounded-full border border-hairline bg-mist px-3 py-1 font-medium">
              Current operating register
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(280px,1fr)_150px_160px_160px_auto] xl:items-end">
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">Search</span>
            <span className="relative block">
              <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate/60" />
              <input
                className="h-11 w-full rounded-control border border-hairline px-3 py-2 pl-9 text-[14px] font-normal text-ink outline-none transition placeholder:text-slate/60 focus:border-brand focus:ring-1 focus:ring-brand"
                onChange={resetPageAndSet(setSearch)}
                placeholder="Patient or invoice #"
                type="search"
                value={search}
              />
            </span>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">Status</span>
            <select
              className="h-11 w-full rounded-control border border-hairline bg-canvas px-3 py-2 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
              onChange={resetPageAndSet(setStatus)}
              value={status}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">Date From</span>
            <input
              className="h-11 w-full rounded-control border border-hairline px-3 py-2 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
              onChange={resetPageAndSet(setDateFrom)}
              type="date"
              value={dateFrom}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">Date To</span>
            <input
              className="h-11 w-full rounded-control border border-hairline px-3 py-2 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
              onChange={resetPageAndSet(setDateTo)}
              type="date"
              value={dateTo}
            />
          </label>
          {filtersActive ? (
            <button
              className="inline-flex h-11 items-center justify-center gap-1 rounded-control border border-hairline px-4 text-[13px] font-medium text-slate transition hover:bg-mist hover:text-ink"
              onClick={clearFilters}
              type="button"
            >
              <X aria-hidden="true" className="h-3.5 w-3.5" />
              Clear Filters
            </button>
          ) : null}
        </div>
        {dateError ? (
          <p className="mt-3 text-[13px] font-medium text-[#C8102E]">
            End date must be after start date
          </p>
        ) : null}
      </section>

      {error ? <ErrorBanner onRetry={loadInvoices} /> : null}

      <section className="overflow-hidden rounded-[16px] border border-hairline bg-canvas">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead className="border-b border-hairline bg-mist/60">
              <tr>
                {['Invoice #', 'Patient', 'Doctor', 'Appointment Date', 'Amount', 'Status', 'Actions'].map((header) => (
                  <th
                    className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate"
                    key={header}
                    scope="col"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows />
              ) : invoices.length === 0 ? (
                <tr>
                  <td className="px-5 py-16 text-center" colSpan={7}>
                    <FileX aria-hidden="true" className="mx-auto mb-3 h-10 w-10 text-hairline" />
                    <p className="font-display text-[18px] italic text-slate">No invoices found</p>
                    <p className="mt-1 text-[14px] font-normal text-slate/70">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr
                    className="cursor-pointer border-b border-hairline transition last:border-0 hover:bg-mist/40"
                    key={invoice.id}
                    onClick={() => navigate(`/financial-reports/billing/invoice/${invoice.id}`)}
                  >
                    <td className="px-5 py-2.5 font-mono text-[13px] text-ink">{invoiceNumber(invoice)}</td>
                    <td className="px-5 py-2.5 text-[14px] font-semibold text-ink">{invoicePatient(invoice)}</td>
                    <td className="px-5 py-2.5 text-[13px] font-normal text-slate">{invoiceDoctor(invoice)}</td>
                    <td className="px-5 py-2.5 font-mono text-[12px] text-slate">{formatDateTime(invoiceDate(invoice))}</td>
                    <td className="px-5 py-2.5 text-[14px] text-ink">
                      <CurrencyDisplay amount={invoiceAmount(invoice)} />
                    </td>
                    <td className="px-5 py-2.5">
                      <InvoiceBadge status={invoice.status} />
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2 text-[13px] font-normal">
                        <button
                          className="inline-flex items-center gap-1 text-brand transition hover:text-brand-dark"
                          onClick={(event) => {
                            event.stopPropagation()
                            navigate(`/financial-reports/billing/invoice/${invoice.id}`)
                          }}
                          type="button"
                        >
                          <Eye aria-hidden="true" className="h-3.5 w-3.5" />
                          View
                        </button>
                        {canDownload ? (
                          <button
                            className="inline-flex items-center gap-1 text-slate transition hover:text-ink"
                            onClick={(event) => handleDownload(invoice, event)}
                            type="button"
                          >
                            <Download aria-hidden="true" className="h-3.5 w-3.5" />
                            Download
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination count={total} onPageChange={setPage} page={page} />
      </section>
    </div>
  )
}
