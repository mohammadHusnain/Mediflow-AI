import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  FileText,
  Loader2,
  Wallet,
} from 'lucide-react'
import { useLocation } from 'react-router-dom'

import InvoiceBadge from '../../../components/financial/InvoiceBadge.jsx'
import SalaryBadge from '../../../components/financial/SalaryBadge.jsx'
import Avatar from '@shared/components/Avatar'
import { useAuth } from '@shared/context/AuthContext'
import {
  getDisbursements,
  getDoctorSalaries,
  getSalaryHistory,
  getStaffSalaries,
  markDisbursed,
} from '@shared/services/salaryApi'

function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

function listFromResponse(response) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.results)) return response.results
  return []
}

function numberValue(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function formatPkr(value) {
  return `PKR ${numberValue(value).toLocaleString()}`
}

function formatMonth(value) {
  if (!value) return '-'

  const [year, month] = String(value).split('-')
  if (!year || !month) return value

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(Number(year), Number(month) - 1, 1))
}

function recordName(record) {
  return record.employee_name || record.staff_name || record.name || 'Unknown staff member'
}

function recordRole(record) {
  return record.role || record.staff_role || '-'
}

const SALARY_STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Paid', value: 'paid' },
  { label: 'Pending', value: 'pending' },
  { label: 'Partially Paid', value: 'partially_paid' },
  { label: 'On Hold', value: 'on_hold' },
]

function EmptyState({ month }) {
  return (
    <div className="py-14 text-center">
      <Wallet aria-hidden="true" className="mx-auto mb-3 h-10 w-10 text-hairline" />
      <p className="font-display text-[18px] italic text-slate">
        No salary records for {formatMonth(month)}
      </p>
      <p className="mt-2 text-[14px] font-normal text-slate/70">
        Records are generated at end of each month
      </p>
    </div>
  )
}

function HistoryTable({ isDoctor, records }) {
  if (records.length === 0) {
    return null
  }

  return (
    <section className="overflow-hidden rounded-[16px] border border-hairline bg-canvas">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead className="border-b border-hairline bg-mist/60">
            <tr>
              {(isDoctor
                ? ['Month', 'Salary Type', 'Appointments', 'Total Earned', 'Status', 'Actions']
                : ['Staff Member', 'Role', 'Salary Type', 'Month', 'Amount', 'Appointments', 'Total Earned', 'Status']
              ).map((header) => (
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
            {records.map((record) => (
              <tr className="border-b border-hairline last:border-0 hover:bg-mist/40" key={record.id}>
                {!isDoctor ? (
                  <>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={recordName(record)} size="sm" />
                        <p className="text-[14px] font-semibold text-ink">{recordName(record)}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-[13px] font-normal text-slate">{recordRole(record)}</td>
                  </>
                ) : null}
                <td className="px-5 py-4">
                  {isDoctor ? (
                    <span className="font-mono text-[12px] text-slate">{formatMonth(record.salary_month || record.month)}</span>
                  ) : (
                    <SalaryBadge type={record.salary_type} />
                  )}
                </td>
                <td className="px-5 py-4">
                  {isDoctor ? (
                    <SalaryBadge type={record.salary_type} />
                  ) : (
                    <span className="font-mono text-[12px] text-slate">{formatMonth(record.salary_month || record.month)}</span>
                  )}
                </td>
                {!isDoctor ? (
                  <td className="px-5 py-4 font-mono text-[13px] text-ink">
                    {formatPkr(record.base_amount ?? record.amount ?? record.fixed_amount)}
                  </td>
                ) : null}
                <td className="px-5 py-4 text-[13px] font-normal text-slate">
                  {record.salary_type === 'commission'
                    ? `${numberValue(record.appointments_count ?? record.appointments)} appts`
                    : '-'}
                </td>
                <td className="px-5 py-4 font-mono text-[15px] font-medium text-brand">
                  {formatPkr(record.total_earned ?? record.calculated_amount)}
                </td>
                <td className="px-5 py-4">
                  <InvoiceBadge status={record.status || 'pending'} />
                </td>
                {isDoctor ? (
                  <td className="px-5 py-4">
                    <button
                      className="text-[13px] font-semibold text-brand transition hover:text-brand-dark"
                      type="button"
                    >
                      View
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function DisbursementTable({
  markingId,
  onMark,
  onToggle,
  records,
  selectedIds,
}) {
  if (records.length === 0) {
    return (
      <section className="rounded-[16px] border border-hairline bg-canvas">
        <EmptyState month={currentMonth()} />
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-[16px] border border-hairline bg-canvas">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse text-left">
          <thead className="border-b border-hairline bg-mist/60">
            <tr>
              <th className="w-12 px-5 py-3.5" scope="col">
                <span className="sr-only">Select</span>
              </th>
              {['Staff Member', 'Salary Type', 'Base Amount', 'Bonus', 'Total', 'Disbursed On', 'Actions'].map((header) => (
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
            {records.map((record) => {
              const pending = record.status === 'pending'

              return (
                <tr className="border-b border-hairline last:border-0 hover:bg-mist/40" key={record.id}>
                  <td className="px-5 py-4">
                    {pending ? (
                      <input
                        checked={selectedIds.has(record.id)}
                        className="h-4 w-4 rounded border-hairline text-brand focus:ring-brand"
                        onChange={() => onToggle(record.id)}
                        type="checkbox"
                      />
                    ) : null}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={recordName(record)} size="sm" />
                      <div>
                        <p className="text-[14px] font-semibold text-ink">{recordName(record)}</p>
                        <p className="text-[12px] font-normal text-slate">{recordRole(record)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <SalaryBadge type={record.salary_type} />
                  </td>
                  <td className="px-5 py-4 font-mono text-[13px] text-ink">{formatPkr(record.base_amount)}</td>
                  <td className="px-5 py-4 font-mono text-[13px] text-ink">{formatPkr(record.bonus)}</td>
                  <td className="px-5 py-4 font-mono text-[15px] font-medium text-brand">{formatPkr(record.total)}</td>
                  <td className="px-5 py-4 font-mono text-[12px] text-slate">{record.disbursed_on || '-'}</td>
                  <td className="px-5 py-4">
                    {pending ? (
                      <button
                        className="rounded-full bg-[#0F9D66]/10 px-3 py-1.5 text-[12px] font-semibold text-[#0F9D66] transition hover:bg-[#0F9D66]/20 disabled:opacity-60"
                        disabled={markingId === record.id}
                        onClick={() => onMark(record.id)}
                        type="button"
                      >
                        {markingId === record.id ? '...' : 'Mark Disbursed'}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#0F9D66]">
                        <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                        Disbursed
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default function SalaryHistory() {
  const { role, user } = useAuth()
  const location = useLocation()
  const isDoctor = role?.slug === 'doctor'
  const [activeTab, setActiveTab] = useState('history')
  const [month, setMonth] = useState(currentMonth())
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [selectedUserId, setSelectedUserId] = useState(location.state?.userId || '')
  const [statusFilter, setStatusFilter] = useState('')
  const [people, setPeople] = useState([])
  const [history, setHistory] = useState([])
  const [disbursements, setDisbursements] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [loadingDisbursements, setLoadingDisbursements] = useState(false)
  const [markingId, setMarkingId] = useState(null)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [reportMessage, setReportMessage] = useState('')

  const sortedPeople = useMemo(
    () => [...people].sort((first, second) => first.name.localeCompare(second.name)),
    [people],
  )
  const departments = useMemo(() => {
    return [...new Set(people.map((person) => person.role).filter(Boolean))]
      .sort((first, second) => first.localeCompare(second))
  }, [people])

  const loadPeople = useCallback(async () => {
    if (isDoctor) return

    const [doctorData, staffData] = await Promise.all([
      getDoctorSalaries(),
      getStaffSalaries(),
    ])
    setPeople([...listFromResponse(doctorData), ...listFromResponse(staffData)])
  }, [isDoctor])

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const data = await getSalaryHistory({
        department: departmentFilter || undefined,
        month,
        status: statusFilter || undefined,
        user_id: isDoctor ? user?.id || user?.user_id || user?.doctor_id : selectedUserId || undefined,
      })
      setHistory(listFromResponse(data))
    } finally {
      setLoadingHistory(false)
    }
  }, [departmentFilter, isDoctor, month, selectedUserId, statusFilter, user])

  const loadDisbursements = useCallback(async () => {
    if (isDoctor) return

    setLoadingDisbursements(true)
    try {
      const data = await getDisbursements({
        department: departmentFilter || undefined,
        month,
        status: statusFilter || undefined,
      })
      setDisbursements(listFromResponse(data))
      setSelectedIds(new Set())
    } finally {
      setLoadingDisbursements(false)
    }
  }, [departmentFilter, isDoctor, month, statusFilter])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadPeople, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadPeople])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadHistory, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadHistory])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadDisbursements, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadDisbursements])

  async function handleMarkDisbursed(id) {
    setMarkingId(id)
    try {
      await markDisbursed(id)
      await Promise.all([loadHistory(), loadDisbursements()])
    } finally {
      setMarkingId(null)
    }
  }

  async function handleBulkMarkDisbursed() {
    setMarkingId('bulk')
    try {
      await Promise.all([...selectedIds].map((id) => markDisbursed(id)))
      await Promise.all([loadHistory(), loadDisbursements()])
    } finally {
      setMarkingId(null)
    }
  }

  function toggleSelection(id) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function clearFilters() {
    setDepartmentFilter('')
    setMonth(currentMonth())
    setSelectedUserId('')
    setStatusFilter('')
  }

  return (
    <div>
      <header className="mb-6">
        <h2 className="font-display text-[26px] text-ink">Salary History</h2>
        <p className="mt-1 text-[14px] font-normal text-slate">
          {isDoctor ? 'Your salary records and payout status' : 'Salary records and disbursements'}
        </p>
      </header>

      {!isDoctor ? (
        <div className="mb-6 flex border-b border-hairline">
          {[
            { id: 'history', label: 'Salary History' },
            { id: 'disbursements', label: 'Disbursements' },
          ].map((tab) => (
            <button
              className={[
                'border-b-2 px-4 py-2.5 text-[13px] transition',
                activeTab === tab.id
                  ? 'border-brand font-semibold text-brand'
                  : 'border-transparent font-medium text-slate hover:text-ink',
              ].join(' ')}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      {activeTab === 'history' ? (
        <>
          <section className="mb-6 rounded-[16px] border border-hairline bg-canvas p-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(220px,1fr)_170px_minmax(160px,220px)_170px_auto] md:items-end">
              {!isDoctor ? (
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">Staff Member</span>
                  <select
                    className="h-11 w-full rounded-control border border-hairline bg-canvas px-3 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
                    onChange={(event) => setSelectedUserId(event.target.value)}
                    value={selectedUserId}
                  >
                    <option value="">All staff members</option>
                    {sortedPeople.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name} - {person.role}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">Month</span>
                <input
                  className="h-11 w-full rounded-control border border-hairline bg-canvas px-3 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
                  onChange={(event) => setMonth(event.target.value)}
                  type="month"
                  value={month}
                />
              </label>

              {!isDoctor ? (
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">Department</span>
                  <select
                    className="h-11 w-full rounded-control border border-hairline bg-canvas px-3 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
                    onChange={(event) => setDepartmentFilter(event.target.value)}
                    value={departmentFilter}
                  >
                    <option value="">All departments</option>
                    {departments.map((department) => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">Status</span>
                <select
                  className="h-11 w-full rounded-control border border-hairline bg-canvas px-3 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
                  onChange={(event) => setStatusFilter(event.target.value)}
                  value={statusFilter}
                >
                  {SALARY_STATUS_OPTIONS.map((status) => (
                    <option key={status.value || 'all'} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>

              {(selectedUserId || departmentFilter || statusFilter || month !== currentMonth()) ? (
                <button
                  className="inline-flex h-11 items-center justify-center rounded-control border border-hairline px-4 text-[13px] font-medium text-slate transition hover:bg-mist hover:text-ink"
                  onClick={clearFilters}
                  type="button"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </section>

          {loadingHistory ? (
            <div className="h-[320px] animate-pulse rounded-[16px] bg-canvas" />
          ) : history.length === 0 ? (
            <section className="rounded-[16px] border border-hairline bg-canvas">
              <EmptyState month={month} />
            </section>
          ) : (
            <HistoryTable isDoctor={isDoctor} records={history} />
          )}
        </>
      ) : null}

      {activeTab === 'disbursements' && !isDoctor ? (
        <>
          <section className="mb-6 rounded-[16px] border border-hairline bg-canvas p-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[180px_minmax(160px,220px)_170px_auto] md:items-end">
              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">Disbursement Month</span>
                <input
                  className="h-11 w-[180px] rounded-control border border-hairline bg-canvas px-3 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
                  onChange={(event) => setMonth(event.target.value)}
                  type="month"
                  value={month}
                />
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">Department</span>
                <select
                  className="h-11 w-full rounded-control border border-hairline bg-canvas px-3 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
                  onChange={(event) => setDepartmentFilter(event.target.value)}
                  value={departmentFilter}
                >
                  <option value="">All departments</option>
                  {departments.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">Status</span>
                <select
                  className="h-11 w-full rounded-control border border-hairline bg-canvas px-3 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
                  onChange={(event) => setStatusFilter(event.target.value)}
                  value={statusFilter}
                >
                  {SALARY_STATUS_OPTIONS.map((status) => (
                    <option key={status.value || 'all'} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-brand/30 px-4 text-[13px] font-semibold text-brand transition hover:bg-brand/5 md:justify-self-end"
                onClick={() => setReportMessage('Disbursement report generation is coming soon.')}
                type="button"
              >
                <FileText aria-hidden="true" className="h-4 w-4" />
                Generate Disbursement Report
              </button>
            </div>
          </section>

          {reportMessage ? (
            <div className="mb-4 rounded-[10px] border border-brand/20 bg-brand/5 px-4 py-3 text-[13px] font-medium text-brand">
              {reportMessage}
            </div>
          ) : null}

          {selectedIds.size > 0 ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-brand/20 bg-brand/5 px-4 py-3">
              <p className="text-[13px] font-semibold text-brand">{selectedIds.size} records selected</p>
              <button
                className="inline-flex items-center gap-2 rounded-control bg-brand px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
                disabled={markingId === 'bulk'}
                onClick={handleBulkMarkDisbursed}
                type="button"
              >
                {markingId === 'bulk' ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
                Mark All Disbursed
              </button>
            </div>
          ) : null}

          {loadingDisbursements ? (
            <div className="h-[320px] animate-pulse rounded-[16px] bg-canvas" />
          ) : (
            <DisbursementTable
              markingId={markingId}
              onMark={handleMarkDisbursed}
              onToggle={toggleSelection}
              records={disbursements}
              selectedIds={selectedIds}
            />
          )}
        </>
      ) : null}
    </div>
  )
}
