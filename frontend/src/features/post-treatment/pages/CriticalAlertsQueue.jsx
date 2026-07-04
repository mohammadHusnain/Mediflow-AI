import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  PhoneCall,
  PhoneForwarded,
  PhoneOff,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react'
import { Link, useOutletContext } from 'react-router-dom'

import Avatar from '@shared/components/Avatar'
import ConfirmationModal from '@shared/components/ConfirmationModal'
import { FieldError, LoadingSpinner, getFieldClass } from '@shared/components/FormPrimitives'
import Pagination from '@shared/components/Pagination'
import { useToast } from '@shared/components/Toast'
import { useAuth } from '@shared/context/AuthContext'
import { formatDate, getBackendError } from '@shared/lib/records'
import {
  canMarkCalled,
  canResolveAlert,
  canViewAlerts,
} from '@shared/lib/postTreatmentAccess'
import {
  getCriticalAlerts,
  markPatientCalled,
  resolveAlert,
} from '@shared/services/postTreatmentApi'
import CriticalAlertBadge from '../components/CriticalAlertBadge'

const PAGE_SIZE = 10
const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Acknowledged', value: 'acknowledged' },
  { label: 'Resolved', value: 'resolved' },
]

function isToday(value) {
  const date = new Date(value)
  const today = new Date()

  return !Number.isNaN(date.getTime()) && date.toDateString() === today.toDateString()
}

function timeAgo(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000))

  if (seconds < 60) return `${seconds}s ago`

  const minutes = Math.floor(seconds / 60)

  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)

  if (hours < 24) return `${hours}h ago`

  return `${Math.floor(hours / 24)}d ago`
}

function isOlderThanOneHour(value) {
  const date = new Date(value)

  return !Number.isNaN(date.getTime()) && Date.now() - date.getTime() > 60 * 60 * 1000
}

function borderClass(status) {
  if (status === 'resolved') return 'border-l-green-500'
  if (status === 'acknowledged') return 'border-l-amber-500'
  return 'border-l-rose-500'
}

function StatCard({ Icon, label, tone, value }) {
  const toneClass = {
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-green-50 text-green-700',
    rose: 'bg-rose-50 text-rose-700',
  }[tone]

  return (
    <article className="rounded-card bg-canvas p-4 shadow-card">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-control ${toneClass}`}>
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-slate">
            {label}
          </p>
          <p className="mt-1 text-[22px] font-bold text-ink">{value}</p>
        </div>
      </div>
    </article>
  )
}

export function CriticalAlertsQueue() {
  const { role, user } = useAuth()
  const subject = useMemo(() => ({ role, user }), [role, user])
  const outletContext = useOutletContext()
  const toast = useToast()
  const [alerts, setAlerts] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loadError, setLoadError] = useState('')
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)
  const [calledAlert, setCalledAlert] = useState(null)
  const [resolveTarget, setResolveTarget] = useState(null)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [resolutionError, setResolutionError] = useState('')
  const [isActing, setIsActing] = useState(false)
  const [, setClockTick] = useState(0)

  const loadAlerts = useCallback(async ({ silent = false } = {}) => {
    if (!canViewAlerts(subject)) {
      setLoadError('You do not have permission to view critical alerts.')
      setIsInitialLoading(false)
      return
    }

    if (!silent) {
      setLoadError('')
    }

    try {
      const response = await getCriticalAlerts({})
      const results = Array.isArray(response) ? response : response?.results || []
      setAlerts(results)
      setLastUpdatedAt(new Date())
    } catch (error) {
      if (!silent) {
        setLoadError(getBackendError(error, 'Critical alerts could not be loaded.'))
      }
    } finally {
      setIsInitialLoading(false)
    }
  }, [subject])

  useEffect(() => {
    outletContext?.setPageMeta?.({
      title: 'Critical Alerts',
      subtitle: 'Patients requiring immediate follow-up call',
    })

    return () => outletContext?.clearPageMeta?.()
  }, [outletContext])

  useEffect(() => {
    queueMicrotask(() => {
      loadAlerts()
    })

    const pollId = window.setInterval(() => {
      loadAlerts({ silent: true })
    }, 30_000)

    const tickId = window.setInterval(() => {
      setClockTick((tick) => tick + 1)
    }, 10_000)

    return () => {
      window.clearInterval(pollId)
      window.clearInterval(tickId)
    }
  }, [loadAlerts])

  const searchFilteredAlerts = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return alerts
    }

    return alerts.filter((alert) =>
      [alert.patient_name, alert.patient_phone, alert.condition, alert.trigger_reason]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [alerts, search])

  const filteredAlerts = useMemo(() => {
    if (statusFilter === 'all') {
      return searchFilteredAlerts
    }

    return searchFilteredAlerts.filter((alert) => alert.status === statusFilter)
  }, [searchFilteredAlerts, statusFilter])

  const pagedAlerts = filteredAlerts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const stats = {
    acknowledged: searchFilteredAlerts.filter((alert) => alert.status === 'acknowledged').length,
    pending: searchFilteredAlerts.filter((alert) => alert.status === 'pending').length,
    resolvedToday: searchFilteredAlerts.filter((alert) => alert.status === 'resolved' && isToday(alert.resolved_at)).length,
  }

  function updateFilter(nextFilter) {
    setStatusFilter(nextFilter)
    setPage(1)
  }

  async function handleMarkCalled() {
    if (!calledAlert) {
      return
    }

    setIsActing(true)

    try {
      await markPatientCalled(calledAlert.id)
      await loadAlerts({ silent: true })
      setCalledAlert(null)
      toast.success('Marked as called')
    } catch (error) {
      toast.error(getBackendError(error, 'Alert could not be marked as called.'))
    } finally {
      setIsActing(false)
    }
  }

  async function handleResolve() {
    if (!resolutionNotes.trim()) {
      setResolutionError('Resolution notes are required')
      return
    }

    setIsActing(true)

    try {
      await resolveAlert(resolveTarget.id, resolutionNotes)
      await loadAlerts({ silent: true })
      setResolveTarget(null)
      setResolutionNotes('')
      setResolutionError('')
      toast.success('Alert resolved')
    } catch (error) {
      toast.error(getBackendError(error, 'Alert could not be resolved.'))
    } finally {
      setIsActing(false)
    }
  }

  if (loadError) {
    return (
      <section className="rounded-card bg-canvas p-10 text-center shadow-card">
        <h2 className="text-[18px] font-bold text-ink">Critical alerts unavailable</h2>
        <p className="mt-2 text-[14px] text-slate">{loadError}</p>
        <button
          className="mt-5 rounded-control bg-mist px-4 py-2 text-[13px] font-semibold text-slate transition hover:bg-hairline hover:text-ink"
          onClick={() => loadAlerts()}
          type="button"
        >
          Try again
        </button>
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-[12px] font-medium text-slate">
          {lastUpdatedAt ? `Updated ${timeAgo(lastUpdatedAt)}` : 'Updating...'}
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard Icon={PhoneCall} label="Needs Call" tone="rose" value={stats.pending} />
        <StatCard Icon={PhoneForwarded} label="In Progress" tone="amber" value={stats.acknowledged} />
        <StatCard Icon={PhoneOff} label="Resolved Today" tone="green" value={stats.resolvedToday} />
      </section>

      <section className="rounded-card bg-canvas p-4 shadow-card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((filter) => (
              <button
                className={[
                  'rounded-full border px-3 py-1.5 text-[12px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
                  statusFilter === filter.value
                    ? 'border-brand bg-brand text-white'
                    : 'border-hairline bg-mist text-slate hover:border-brand/40 hover:text-ink',
                ].join(' ')}
                key={filter.value}
                onClick={() => updateFilter(filter.value)}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-[320px]">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate/60"
            />
            <input
              className="h-10 w-full rounded-control border border-hairline bg-mist pl-9 pr-9 text-[13px] text-ink outline-none transition focus:border-brand focus:bg-canvas focus:ring-2 focus:ring-brand/20"
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Search patient..."
              value={search}
            />
            {search ? (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-control p-1 text-slate transition hover:text-brand"
                onClick={() => {
                  setSearch('')
                  setPage(1)
                }}
                type="button"
              >
                <span className="sr-only">Clear search</span>
                <X aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {isInitialLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="h-32 animate-pulse rounded-card bg-canvas shadow-card" key={index} />
          ))}
        </div>
      ) : pagedAlerts.length === 0 ? (
        <section className="rounded-card bg-canvas px-6 py-14 text-center shadow-card">
          <ShieldCheck aria-hidden="true" className="mx-auto mb-3 h-11 w-11 text-green-500/30" />
          <h2 className="text-[16px] font-semibold text-slate-900">No critical alerts</h2>
          <p className="mt-1 text-[13px] text-slate">All patients are stable</p>
        </section>
      ) : (
        <section>
          {pagedAlerts.map((alert) => {
            const pendingEscalated =
              alert.status === 'pending' && isOlderThanOneHour(alert.created_at)
            const canCall = alert.status === 'pending' && canMarkCalled(subject, alert)
            const canResolve = alert.status === 'acknowledged' && canResolveAlert(subject, alert)

            return (
              <article
                className={[
                  'mb-3 rounded-card border-l-4 bg-canvas p-5 shadow-card',
                  borderClass(alert.status),
                  pendingEscalated ? 'bg-rose-50/30' : '',
                ].join(' ')}
                key={alert.id}
              >
                <div className="grid gap-4 lg:grid-cols-[minmax(220px,280px)_1fr_auto] lg:items-start">
                  <div className="flex items-center gap-3">
                    <Avatar name={alert.patient_name} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-ink">
                        {alert.patient_name}
                      </p>
                      <p className="font-mono text-[12px] text-slate">{alert.patient_phone}</p>
                      <span className="mt-1 inline-flex rounded-full bg-brand-light px-2.5 py-0.5 text-[11px] font-semibold text-brand">
                        {alert.condition}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-[14px] font-normal leading-6 text-slate-900">
                      {alert.trigger_reason}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-slate">
                      {timeAgo(alert.created_at)}
                    </p>
                    {alert.status === 'resolved' && alert.resolution_notes ? (
                      <details className="mt-3 rounded-control border border-hairline bg-mist px-3 py-2">
                        <summary className="cursor-pointer text-[12px] font-semibold text-slate">
                          Resolution notes
                        </summary>
                        <p className="mt-2 text-[13px] leading-5 text-slate-900">
                          {alert.resolution_notes}
                        </p>
                      </details>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row lg:min-w-[160px] lg:flex-col lg:items-stretch">
                    <CriticalAlertBadge status={alert.status} />
                    {canCall ? (
                      <button
                        className="inline-flex h-9 items-center justify-center rounded-control bg-brand px-3 text-[12px] font-semibold text-white transition hover:bg-brandDark"
                        onClick={() => setCalledAlert(alert)}
                        type="button"
                      >
                        <PhoneCall aria-hidden="true" className="mr-2 h-4 w-4" />
                        Mark Called
                      </button>
                    ) : null}
                    {canResolve ? (
                      <button
                        className="inline-flex h-9 items-center justify-center rounded-control border border-green-200 bg-green-50 px-3 text-[12px] font-semibold text-green-700 transition hover:brightness-95"
                        onClick={() => {
                          setResolveTarget(alert)
                          setResolutionNotes('')
                          setResolutionError('')
                        }}
                        type="button"
                      >
                        <CheckCircle2 aria-hidden="true" className="mr-2 h-4 w-4" />
                        Resolve
                      </button>
                    ) : null}
                    {alert.status === 'resolved' ? (
                      <p className="text-[12px] leading-5 text-slate">
                        Resolved by {alert.acknowledged_by || 'staff'} · {formatDate(alert.resolved_at)}
                      </p>
                    ) : null}
                    <Link
                      className="inline-flex h-9 items-center justify-center rounded-control border border-hairline bg-canvas px-3 text-[12px] font-semibold text-slate transition hover:bg-mist hover:text-ink"
                      to={`/post-treatment/plans/${alert.plan_id}`}
                    >
                      View Plan
                    </Link>
                  </div>
                </div>
              </article>
            )
          })}
          <Pagination
            currentPage={page}
            onPageChange={setPage}
            pageSize={PAGE_SIZE}
            totalCount={filteredAlerts.length}
          />
        </section>
      )}

      {calledAlert ? (
        <ConfirmationModal
          body={`Confirm you have called ${calledAlert.patient_name}?`}
          confirmLabel="Mark Called"
          isLoading={isActing}
          onCancel={() => setCalledAlert(null)}
          onConfirm={handleMarkCalled}
          title="Mark patient called?"
        />
      ) : null}

      {resolveTarget ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-canvas/75 px-4 backdrop-blur-sm animate-fade-in">
          <section className="w-full max-w-[460px] rounded-card border border-hairline bg-canvas p-6 shadow-[0_16px_60px_rgba(20,24,31,0.18)] animate-scale-in">
            <h2 className="text-[18px] font-bold text-ink">Resolve alert</h2>
            <p className="mt-1 text-[13px] text-slate">
              {resolveTarget.patient_name} · {resolveTarget.condition}
            </p>
            <label className="mt-5 block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">
                Resolution notes
              </span>
              <textarea
                className={getFieldClass(resolutionError, 'min-h-[120px] resize-none')}
                onChange={(event) => {
                  setResolutionNotes(event.target.value)
                  setResolutionError('')
                }}
                placeholder="What happened on the call?"
                value={resolutionNotes}
              />
              <FieldError>{resolutionError}</FieldError>
            </label>
            <div className="mt-5 flex justify-end gap-3">
              <button
                className="rounded-control bg-mist px-4 py-2.5 text-[14px] font-semibold text-slate transition hover:bg-hairline hover:text-ink"
                disabled={isActing}
                onClick={() => setResolveTarget(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex min-w-[130px] items-center justify-center rounded-control bg-green-600 px-4 py-2.5 text-[14px] font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isActing}
                onClick={handleResolve}
                type="button"
              >
                {isActing ? <LoadingSpinner light /> : 'Mark Resolved'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

export default CriticalAlertsQueue
