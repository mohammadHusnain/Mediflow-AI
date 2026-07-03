import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, History, X } from 'lucide-react'

import { getInvoiceHistory } from '@shared/services/billingApi'

const PAGE_SIZE = 20
const EVENT_COLORS = {
  cancelled: 'bg-[#C8102E]',
  created: 'bg-brand',
  downloaded: 'bg-[#5B6472]',
  paid: 'bg-[#0F9D66]',
  updated: 'bg-[#B45309]',
}

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
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function eventType(event) {
  const raw = String(event?.event_type || event?.type || event?.action || 'updated').toLowerCase()

  if (raw.includes('paid')) return 'paid'
  if (raw.includes('cancel')) return 'cancelled'
  if (raw.includes('download')) return 'downloaded'
  if (raw.includes('create')) return 'created'

  return 'updated'
}

function invoiceNumber(event) {
  return event?.invoice_number || event?.invoice?.invoice_number || event?.invoice?.number || 'Invoice'
}

function patientName(event) {
  return event?.patient_name || event?.patient?.full_name || event?.invoice?.patient_name || 'patient'
}

function eventTitle(event) {
  if (event?.description || event?.message) {
    return event.description || event.message
  }

  const type = eventType(event)

  if (type === 'paid') return `${invoiceNumber(event)} marked paid for ${patientName(event)}`
  if (type === 'cancelled') return `${invoiceNumber(event)} cancelled for ${patientName(event)}`
  if (type === 'downloaded') return `${invoiceNumber(event)} downloaded`
  if (type === 'created') return `${invoiceNumber(event)} created for ${patientName(event)}`

  return `${invoiceNumber(event)} updated`
}

function eventDetail(event) {
  if (typeof event?.details === 'string') return event.details
  if (typeof event?.detail === 'string') return event.detail

  const parts = [
    event?.appointment_date ? `Appointment on ${formatDate(event.appointment_date)}` : '',
    event?.amount !== undefined ? formatPkr(event.amount) : '',
    event?.actor_email || event?.user_email || event?.created_by ? `By ${event.actor_email || event.user_email || event.created_by}` : '',
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' - ') : 'Billing activity recorded'
}

function SkeletonTimeline() {
  return (
    <div className="space-y-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <div className="ml-7 h-[86px] animate-pulse rounded-[12px] bg-canvas" key={index} />
      ))}
    </div>
  )
}

export default function InvoiceHistory() {
  const [events, setEvents] = useState([])
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const dateError = dateFrom && dateTo && dateTo < dateFrom
  const filtersActive = Boolean(dateFrom || dateTo)

  const baseParams = useMemo(
    () => ({
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      page_size: PAGE_SIZE,
    }),
    [dateFrom, dateTo],
  )

  const loadHistory = useCallback(async (nextPage = 1, { append = false } = {}) => {
    if (dateError) return

    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }

    setError(false)
    try {
      const response = await getInvoiceHistory({
        ...baseParams,
        page: nextPage,
      })
      const normalized = normalizePaginated(response)

      setEvents((currentEvents) =>
        append ? [...currentEvents, ...normalized.results] : normalized.results,
      )
      setHasNext(Boolean(normalized.next) || nextPage * PAGE_SIZE < normalized.count)
      setPage(nextPage)
    } catch {
      setError(true)
      if (!append) {
        setEvents([])
        setHasNext(false)
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [baseParams, dateError])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadHistory(1)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [dateFrom, dateTo, loadHistory])

  function resetPageAndSet(setter) {
    return (event) => {
      setter(event.target.value)
      setPage(1)
    }
  }

  function clearFilters() {
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  return (
    <div>
      <header className="mb-6">
        <h2 className="font-display text-[26px] text-ink">Invoice History</h2>
        <p className="mt-1 text-[15px] font-normal text-slate">Full audit trail of all invoice activity</p>
      </header>

      <section className="mb-6 rounded-[12px] border border-hairline bg-canvas p-4">
        <div className="flex flex-wrap items-center gap-3">
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
          <span className="text-[14px] font-medium text-[#C8102E]">Failed to load invoice history.</span>
          <button
            className="text-[14px] font-semibold text-brand transition hover:text-brand-dark"
            onClick={() => loadHistory(1)}
            type="button"
          >
            Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <SkeletonTimeline />
      ) : events.length === 0 ? (
        <section className="rounded-[16px] border border-hairline bg-canvas px-5 py-16 text-center">
          <History aria-hidden="true" className="mx-auto mb-3 h-10 w-10 text-hairline" />
          <p className="font-display text-[18px] italic text-slate">No history to display for this date range</p>
        </section>
      ) : (
        <>
          <div className="relative border-l-2 border-brand/20 pl-7">
            {events.map((event, index) => {
              const type = eventType(event)
              const dotColor = EVENT_COLORS[type] || EVENT_COLORS.updated

              return (
                <article className="relative mb-6 flex items-start gap-4" key={event.id || `${type}-${index}`}>
                  <span
                    aria-hidden="true"
                    className={`absolute left-[-34px] top-2 h-[10px] w-[10px] rounded-full border-2 border-canvas ${dotColor}`}
                  />
                  <div className="flex-1 rounded-[12px] border border-hairline bg-canvas px-5 py-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-[14px] font-semibold text-ink">{eventTitle(event)}</p>
                      <p className="font-mono text-[11px] text-slate">
                        {formatDate(event.timestamp || event.created_at || event.updated_at)}
                      </p>
                    </div>
                    <p className="mt-1 text-[13px] font-normal text-slate">{eventDetail(event)}</p>
                  </div>
                </article>
              )
            })}
          </div>

          {hasNext ? (
            <button
              className="mx-auto mt-6 block rounded-control border border-brand/30 px-6 py-2.5 text-[14px] font-semibold text-brand transition hover:bg-brand/5 disabled:opacity-60"
              disabled={loadingMore}
              onClick={() => loadHistory(page + 1, { append: true })}
              type="button"
            >
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          ) : null}
        </>
      )}
    </div>
  )
}
