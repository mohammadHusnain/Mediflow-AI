import { useEffect, useRef, useState } from 'react'
import { Calendar, FileDown, Loader2 } from 'lucide-react'

const DAY_MS = 24 * 60 * 60 * 1000

const PERIODS = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: '6 Months', value: 'six_month' },
  { label: 'Yearly', value: 'yearly' },
]

function parseDate(value) {
  if (!value) return null

  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function getRangeError(dateFrom, dateTo) {
  const from = parseDate(dateFrom)
  const to = parseDate(dateTo)

  if (!from || !to) {
    return ''
  }

  if (to < from) {
    return 'End date must be after start date'
  }

  const days = Math.round((to.getTime() - from.getTime()) / DAY_MS)

  if (days > 366) {
    return 'Maximum range is 1 year'
  }

  return ''
}

export default function DateRangePicker({
  disabled = false,
  exporting = false,
  onChange,
  onExport,
  value,
}) {
  const popoverRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [dateFrom, setDateFrom] = useState(value?.dateFrom || '')
  const [dateTo, setDateTo] = useState(value?.dateTo || '')
  const isCustom = value?.period === 'custom'
  const error = getRangeError(dateFrom, dateTo)
  const canApply = Boolean(dateFrom && dateTo && !error)
  const exportDisabled = disabled || exporting || !onExport

  useEffect(() => {
    if (!open) {
      return undefined
    }

    function handleMouseDown(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleMouseDown)

    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [open])

  function selectPeriod(period) {
    setOpen(false)
    setDateFrom('')
    setDateTo('')
    onChange?.({ period, dateFrom: null, dateTo: null })
  }

  function toggleCustomRange() {
    if (!open) {
      setDateFrom(value?.dateFrom || '')
      setDateTo(value?.dateTo || '')
    }

    setOpen((current) => !current)
  }

  function applyCustomRange() {
    if (!canApply) return

    setOpen(false)
    onChange?.({ period: 'custom', dateFrom, dateTo })
  }

  return (
    <section className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-hairline bg-canvas p-4">
      <div className="flex flex-wrap gap-1 rounded-control bg-mist p-1">
        {PERIODS.map((period) => {
          const active = value?.period === period.value

          return (
            <button
              className={[
                'rounded-[6px] px-4 py-2 text-[13px] transition',
                active
                  ? 'bg-canvas font-semibold text-brand shadow-sm'
                  : 'font-medium text-slate hover:text-ink',
              ].join(' ')}
              key={period.value}
              onClick={() => selectPeriod(period.value)}
              type="button"
            >
              {period.label}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative" ref={popoverRef}>
          <button
            className={[
              'inline-flex items-center rounded-control border px-4 py-2 text-[13px] font-medium transition',
              isCustom
                ? 'border-brand bg-brand/5 text-brand'
                : 'border-hairline text-ink hover:bg-mist',
            ].join(' ')}
            onClick={toggleCustomRange}
            type="button"
          >
            <Calendar aria-hidden="true" className="mr-2 h-[14px] w-[14px]" />
            Custom Range
          </button>

          {open ? (
            <div className="absolute right-0 top-full z-40 mt-2 w-[280px] rounded-[12px] border border-hairline bg-canvas p-4 shadow-card">
              <label className="block">
                <span className="text-[13px] font-normal text-slate">From</span>
                <input
                  className="mt-1 h-10 w-full rounded-control border border-hairline px-3 text-[13px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
                  onChange={(event) => setDateFrom(event.target.value)}
                  type="date"
                  value={dateFrom}
                />
              </label>
              <label className="mt-3 block">
                <span className="text-[13px] font-normal text-slate">To</span>
                <input
                  className="mt-1 h-10 w-full rounded-control border border-hairline px-3 text-[13px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
                  onChange={(event) => setDateTo(event.target.value)}
                  type="date"
                  value={dateTo}
                />
              </label>
              {error ? (
                <p className="mt-2 text-[12px] font-medium text-[#C8102E]">{error}</p>
              ) : null}
              <button
                className="mt-3 w-full rounded-control bg-brand py-2 text-[13px] font-semibold text-white transition hover:bg-brandDark disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!canApply}
                onClick={applyCustomRange}
                type="button"
              >
                Apply
              </button>
            </div>
          ) : null}
        </div>

        {onExport ? (
          <button
            className="inline-flex items-center gap-2 rounded-control bg-brand px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-brandDark disabled:cursor-not-allowed disabled:opacity-50"
            disabled={exportDisabled}
            onClick={onExport}
            type="button"
          >
            {exporting ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown aria-hidden="true" className="h-4 w-4" />
            )}
            {exporting ? 'Generating...' : 'Export PDF'}
          </button>
        ) : null}
      </div>
    </section>
  )
}
