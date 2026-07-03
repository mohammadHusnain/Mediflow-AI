import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Calendar,
  CreditCard,
  DollarSign,
  Search,
  TrendingUp,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import InvoiceBadge from '../../../components/financial/InvoiceBadge.jsx'
import StatCard from '../../../components/financial/StatCard.jsx'
import { useDebounce } from '@shared/hooks/useDebounce'
import { getPayments, getPaymentSummary } from '@shared/services/billingApi'

const PAGE_SIZE = 20

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

function titleCase(value) {
  const text = String(value || '').replace(/[_-]+/g, ' ').trim()

  if (!text) return '-'

  return text.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function paymentReference(payment) {
  return payment?.payment_ref || payment?.reference || payment?.payment_reference || `PAY-${payment?.id || ''}`
}

function patientName(payment) {
  return payment?.patient_name || payment?.patient?.full_name || payment?.patient?.name || 'Unknown patient'
}

function invoiceNumber(payment) {
  return payment?.invoice_number || payment?.invoice?.invoice_number || payment?.invoice?.number || '-'
}

function invoiceId(payment) {
  return payment?.invoice_id || payment?.invoice?.id || null
}

function paymentAmount(payment) {
  return payment?.amount ?? payment?.paid_amount ?? payment?.total ?? 0
}

function paymentDate(payment) {
  return payment?.date || payment?.paid_at || payment?.created_at
}

function paymentStatus(payment) {
  return payment?.status || payment?.invoice_status || 'paid'
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

function SkeletonRows() {
  return Array.from({ length: 5 }).map((_, index) => (
    <tr key={index}>
      <td className="px-5 py-3" colSpan={7}>
        <div className="h-[52px] animate-pulse rounded bg-mist/60" />
      </td>
    </tr>
  ))
}

export default function PaymentRecords() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [payments, setPayments] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const debouncedSearch = useDebounce(search, 300)
  const dateError = dateFrom && dateTo && dateTo < dateFrom
  const filtersActive = Boolean(search || dateFrom || dateTo)

  const params = useMemo(
    () => ({
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      page,
      page_size: PAGE_SIZE,
      search: debouncedSearch.trim() || undefined,
    }),
    [dateFrom, dateTo, debouncedSearch, page],
  )

  const loadPayments = useCallback(async () => {
    if (dateError) return

    setLoading(true)
    setError(false)
    try {
      const [summaryData, paymentData] = await Promise.all([
        getPaymentSummary(),
        getPayments(params),
      ])
      const normalized = normalizePaginated(paymentData)

      setSummary(summaryData || {})
      setPayments(normalized.results)
      setTotal(normalized.count)
    } catch {
      setError(true)
      setPayments([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [dateError, params])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadPayments()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadPayments])

  function resetPageAndSet(setter) {
    return (event) => {
      setter(event.target.value)
      setPage(1)
    }
  }

  function clearFilters() {
    setSearch('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  return (
    <div>
      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3">
        <StatCard
          accentColor="green"
          icon={DollarSign}
          label="Total Received"
          loading={loading && !summary}
          sub="all time PKR"
          value={summary?.total_received === undefined ? undefined : formatPkr(summary.total_received)}
        />
        <StatCard
          icon={Calendar}
          label="This Month"
          loading={loading && !summary}
          sub="PKR received"
          value={summary?.this_month === undefined ? undefined : formatPkr(summary.this_month)}
        />
        <StatCard
          accentColor="amber"
          icon={TrendingUp}
          label="Avg per Day"
          loading={loading && !summary}
          sub="last 30 days PKR"
          value={summary?.avg_daily === undefined ? undefined : formatPkr(summary.avg_daily)}
        />
      </div>

      <section className="mb-6 rounded-[12px] border border-hairline bg-canvas p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative">
            <span className="sr-only">Search payments</span>
            <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate/60" />
            <input
              className="w-[280px] rounded-control border border-hairline px-3 py-2 pl-9 text-[14px] font-normal text-ink outline-none transition placeholder:text-slate/60 focus:border-brand focus:ring-1 focus:ring-brand"
              onChange={resetPageAndSet(setSearch)}
              placeholder="Search patient or payment ref"
              type="search"
              value={search}
            />
          </label>
          <input
            className="w-[150px] rounded-control border border-hairline px-3 py-2 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
            onChange={resetPageAndSet(setDateFrom)}
            type="date"
            value={dateFrom}
          />
          <input
            className="w-[150px] rounded-control border border-hairline px-3 py-2 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
            onChange={resetPageAndSet(setDateTo)}
            type="date"
            value={dateTo}
          />
          {filtersActive ? (
            <button
              className="inline-flex items-center gap-1 text-[13px] font-medium text-slate transition hover:text-ink"
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

      {error ? (
        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-[12px] border border-[#FFC9C9] bg-[#FCE4E8] px-5 py-4">
          <AlertCircle aria-hidden="true" className="h-4 w-4 text-[#C8102E]" />
          <span className="text-[14px] font-medium text-[#C8102E]">Failed to load payment records.</span>
          <button
            className="text-[14px] font-semibold text-brand transition hover:text-brand-dark"
            onClick={loadPayments}
            type="button"
          >
            Retry
          </button>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[16px] border border-hairline bg-canvas">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead className="border-b border-hairline bg-mist/60">
              <tr>
                {['Payment Ref #', 'Patient', 'Invoice #', 'Amount', 'Method', 'Date', 'Status'].map((header) => (
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
              ) : payments.length === 0 ? (
                <tr>
                  <td className="px-5 py-16 text-center" colSpan={7}>
                    <CreditCard aria-hidden="true" className="mx-auto mb-3 h-10 w-10 text-hairline" />
                    <p className="font-display text-[18px] italic text-slate">No payment records yet</p>
                    <p className="mt-1 text-[14px] font-normal text-slate/70">Payments will appear here after invoices are paid</p>
                  </td>
                </tr>
              ) : (
                payments.map((payment) => {
                  const linkedInvoiceId = invoiceId(payment)

                  return (
                    <tr
                      className="border-b border-hairline transition last:border-0 hover:bg-mist/40"
                      key={payment.id || paymentReference(payment)}
                    >
                      <td className="px-5 py-4 font-mono text-[12px] text-slate">{paymentReference(payment)}</td>
                      <td className="px-5 py-4 text-[14px] font-semibold text-ink">{patientName(payment)}</td>
                      <td className="px-5 py-4">
                        {linkedInvoiceId ? (
                          <button
                            className="font-mono text-[12px] text-brand transition hover:text-brand-dark"
                            onClick={() => navigate(`/financial-reports/billing/invoices/${linkedInvoiceId}`)}
                            type="button"
                          >
                            {invoiceNumber(payment)}
                          </button>
                        ) : (
                          <span className="font-mono text-[12px] text-slate">{invoiceNumber(payment)}</span>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono text-[14px] text-ink">{formatPkr(paymentAmount(payment))}</td>
                      <td className="px-5 py-4 text-[13px] font-normal text-slate">{titleCase(payment.method || payment.payment_method)}</td>
                      <td className="px-5 py-4 font-mono text-[12px] text-slate">{formatDate(paymentDate(payment))}</td>
                      <td className="px-5 py-4">
                        <InvoiceBadge status={paymentStatus(payment)} />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination count={total} onPageChange={setPage} page={page} />
      </section>
    </div>
  )
}
