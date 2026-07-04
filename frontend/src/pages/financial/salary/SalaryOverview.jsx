import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Search,
  Stethoscope,
  Users,
  Wallet,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import InvoiceBadge from '../../../components/financial/InvoiceBadge.jsx'
import SalaryBadge from '../../../components/financial/SalaryBadge.jsx'
import SalaryConfigModal from '../../../components/financial/SalaryConfigModal.jsx'
import Avatar from '@shared/components/Avatar'
import { useAuth } from '@shared/context/AuthContext'
import {
  getDoctorSalaries,
  getOwnSalary,
  getSalaryHistory,
  getStaffSalaries,
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
    month: 'short',
    year: 'numeric',
  }).format(new Date(Number(year), Number(month) - 1, 1))
}

function commissionBaseLabel(value) {
  if (value === 'monthly_revenue') return 'Monthly Revenue Total'
  return 'Consultation Fee (per appointment)'
}

function amountLabel(person) {
  const config = person?.current_config

  if (!config) return '-'
  if (config.salary_type === 'commission') {
    return `${numberValue(config.commission_rate)}% per appt`
  }

  return `${formatPkr(config.fixed_amount)}/mo`
}

function payrollRecordFor(person, records) {
  return records.find((record) => String(record.user_id) === String(person.id))
}

function payrollStatusValue(person, records) {
  if (!person?.current_config) return 'not_configured'

  const record = payrollRecordFor(person, records)
  const status = String(record?.status || 'pending').toLowerCase()

  if (['paid', 'disbursed'].includes(status)) return 'paid'
  if (['partial', 'partially_paid'].includes(status)) return 'partially_paid'
  return 'pending'
}

const PAYROLL_STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Paid', value: 'paid' },
  { label: 'Pending', value: 'pending' },
  { label: 'Partially Paid', value: 'partially_paid' },
  { label: 'Not Set', value: 'not_configured' },
]

function PaymentStatus({ configured, record }) {
  if (!configured) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#5B6472]">
        <AlertCircle aria-hidden="true" className="h-3.5 w-3.5" />
        Not Set
      </span>
    )
  }

  if (!record) {
    return <InvoiceBadge status="pending" />
  }

  if (record.status === 'disbursed') {
    return <InvoiceBadge status="paid" />
  }

  return <InvoiceBadge status={record.status || 'pending'} />
}

function ConfiguredStatus({ configured }) {
  return configured ? (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#0F9D66]">
      <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
      Configured
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#B45309]">
      <AlertCircle aria-hidden="true" className="h-4 w-4" />
      Not Set
    </span>
  )
}

function EmptyTable({ icon: Icon, label, onClick, toLabel }) {
  return (
    <div className="py-12 text-center">
      <Icon aria-hidden="true" className="mx-auto mb-3 h-10 w-10 text-hairline" />
      <p className="font-display text-[18px] italic text-slate">{label}</p>
      {onClick ? (
        <button
          className="mt-4 rounded-control border border-brand/30 px-4 py-2 text-[13px] font-semibold text-brand transition hover:bg-brand/5"
          onClick={onClick}
          type="button"
        >
          {toLabel}
        </button>
      ) : null}
    </div>
  )
}

function SalaryTable({
  emptyIcon,
  emptyLabel,
  emptyLink,
  onConfigure,
  onHistory,
  payrollRecords,
  people,
  type,
}) {
  const navigate = useNavigate()

  if (people.length === 0) {
    return (
      <section className="rounded-[16px] border border-hairline bg-canvas">
        <EmptyTable
          icon={emptyIcon}
          label={emptyLabel}
          onClick={emptyLink ? () => navigate(emptyLink.to) : null}
          toLabel={emptyLink?.label}
        />
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-[16px] border border-hairline bg-canvas">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] border-collapse text-left">
          <thead className="border-b border-hairline bg-mist/60">
            <tr>
              {[
                'Employee',
                'Department',
                'Salary Type',
                'Assigned Salary',
                'Effective From',
                'Configured',
                'Selected Month Status',
                'Actions',
              ].map((header) => (
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
            {people.map((person) => {
              const config = person.current_config
              const record = payrollRecordFor(person, payrollRecords)
              const invalidStaffCommission =
                (type === 'staff' || person.employee_type === 'staff') && config?.salary_type === 'commission'

              return (
                <tr className="border-b border-hairline last:border-0 hover:bg-mist/40" key={person.id}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={person.name} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-ink">{person.name}</p>
                        <p className="truncate text-[12px] text-slate">{person.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-[13px] font-normal text-slate">{person.role}</td>
                  <td className="px-5 py-4">
                    {invalidStaffCommission ? (
                      <span className="text-[12px] font-medium text-[#C8102E]">Invalid config</span>
                    ) : (
                      <SalaryBadge type={config?.salary_type} />
                    )}
                  </td>
                  <td className={`px-5 py-4 font-mono text-[14px] ${config ? 'text-ink' : 'italic text-slate'}`}>
                    {amountLabel(person)}
                  </td>
                  <td className="px-5 py-4 font-mono text-[12px] text-slate">
                    {formatMonth(config?.effective_from)}
                  </td>
                  <td className="px-5 py-4">
                    <ConfiguredStatus configured={Boolean(config)} />
                  </td>
                  <td className="px-5 py-4">
                    <PaymentStatus configured={Boolean(config)} record={record} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        className="text-[13px] font-semibold text-brand transition hover:text-brand-dark"
                        onClick={() => onConfigure(person)}
                        type="button"
                      >
                        Configure
                      </button>
                      <button
                        className="text-[13px] font-medium text-slate transition hover:text-ink"
                        onClick={() => onHistory(person)}
                        type="button"
                      >
                        History
                      </button>
                    </div>
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

function DoctorSalaryView() {
  const navigate = useNavigate()
  const [salary, setSalary] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadOwnSalary = useCallback(async () => {
    setLoading(true)
    try {
      setSalary(await getOwnSalary())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadOwnSalary, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadOwnSalary])

  const configured = Boolean(salary?.salary_type)

  return (
    <div>
      <header className="mb-6">
        <h2 className="font-display text-[26px] text-ink">My Salary</h2>
        <p className="mt-1 text-[14px] font-normal text-slate">Your current salary configuration and history</p>
      </header>

      {loading ? (
        <div className="h-[360px] max-w-[480px] animate-pulse rounded-[20px] bg-canvas" />
      ) : !configured ? (
        <section className="flex min-h-[300px] max-w-[480px] items-center justify-center rounded-[20px] border border-hairline bg-canvas p-8 text-center">
          <div>
            <Wallet aria-hidden="true" className="mx-auto mb-3 h-10 w-10 text-hairline" />
            <p className="font-display text-[20px] italic text-slate">Salary not configured yet</p>
            <p className="mt-2 text-[14px] font-normal text-slate/70">
              Contact your administrator to set up your salary.
            </p>
          </div>
        </section>
      ) : (
        <section className="max-w-[520px] rounded-[20px] border border-hairline bg-canvas p-8">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[13px] font-medium text-slate">Salary Type</p>
            <SalaryBadge type={salary.salary_type} />
          </div>

          <div className="mt-6">
            {salary.salary_type === 'fixed' ? (
              <>
                <p className="font-display text-[42px] leading-none text-brand">{formatPkr(salary.fixed_amount)}</p>
                <p className="mt-2 text-[14px] font-normal text-slate">per month - fixed</p>
              </>
            ) : (
              <>
                <p className="font-display text-[42px] leading-none text-brand">{numberValue(salary.commission_rate)}%</p>
                <p className="mt-2 text-[14px] font-normal text-slate">per consultation - commission-based</p>
                <p className="mt-2 text-[13px] font-medium text-slate">
                  Based on: {commissionBaseLabel(salary.commission_base)}
                </p>
              </>
            )}
          </div>

          <div className="my-6 border-t border-hairline" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[12px] font-medium text-slate">Effective From</p>
              <p className="mt-1 font-mono text-[13px] text-ink">{formatMonth(salary.effective_from)}</p>
            </div>
            <div>
              <p className="text-[12px] font-medium text-slate">Configured By</p>
              <p className="mt-1 text-[13px] font-normal text-slate">{salary.configured_by || '-'}</p>
            </div>
            <div>
              <p className="text-[12px] font-medium text-slate">Last Updated</p>
              <p className="mt-1 font-mono text-[13px] text-ink">{formatMonth(salary.updated_at)}</p>
            </div>
            <div>
              <p className="text-[12px] font-medium text-slate">Status</p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#0F9D66]">
                <span className="h-2 w-2 rounded-full bg-[#0F9D66]" />
                Active
              </p>
            </div>
          </div>

          <button
            className="mt-6 block w-full rounded-control border border-brand/30 px-5 py-2.5 text-center text-[14px] font-semibold text-brand transition hover:bg-brand/5"
            onClick={() => navigate('/financial-reports/salary/history')}
            type="button"
          >
            View My Salary History
          </button>
        </section>
      )}
    </div>
  )
}

function AdminSalaryView() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('all')
  const [payrollMonth, setPayrollMonth] = useState(currentMonth())
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [doctors, setDoctors] = useState([])
  const [staff, setStaff] = useState([])
  const [payrollRecords, setPayrollRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [configModal, setConfigModal] = useState({ open: false, staff: null })

  const loadSalaryData = useCallback(async () => {
    setLoading(true)
    try {
      const [doctorsData, staffData, historyData] = await Promise.all([
        getDoctorSalaries(),
        getStaffSalaries(),
        getSalaryHistory({ month: payrollMonth }),
      ])
      setDoctors(listFromResponse(doctorsData))
      setStaff(listFromResponse(staffData))
      setPayrollRecords(listFromResponse(historyData))
    } finally {
      setLoading(false)
    }
  }, [payrollMonth])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadSalaryData, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadSalaryData])

  function handleHistory(person) {
    navigate('/financial-reports/salary/history', { state: { userId: person.id } })
  }

  const allPeople = useMemo(() => [...doctors, ...staff], [doctors, staff])
  const departments = useMemo(() => {
    return [...new Set(allPeople.map((person) => person.role).filter(Boolean))]
      .sort((first, second) => first.localeCompare(second))
  }, [allPeople])
  const currentRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    const department = departmentFilter.trim().toLowerCase()
    const source = activeTab === 'doctors'
      ? doctors
      : activeTab === 'staff'
        ? staff
        : allPeople

    return source
      .filter((person) => {
        if (!query) return true
        return [person.name, person.email, person.role]
          .some((value) => String(value || '').toLowerCase().includes(query))
      })
      .filter((person) => !department || String(person.role || '').toLowerCase() === department)
      .filter((person) => !statusFilter || payrollStatusValue(person, payrollRecords) === statusFilter)
      .sort((first, second) => String(first.name || '').localeCompare(String(second.name || '')))
  }, [activeTab, allPeople, departmentFilter, doctors, payrollRecords, search, staff, statusFilter])

  const payrollSummary = useMemo(() => {
    return allPeople.reduce(
      (summary, person) => {
        const status = payrollStatusValue(person, payrollRecords)

        if (status === 'not_configured') {
          summary.notConfigured += 1
        } else if (status === 'paid') {
          summary.paid += 1
        } else if (status === 'partially_paid') {
          summary.partial += 1
        } else {
          summary.pending += 1
        }

        return summary
      },
      { notConfigured: 0, paid: 0, partial: 0, pending: 0 },
    )
  }, [allPeople, payrollRecords])

  const tableType = activeTab === 'staff' ? 'staff' : activeTab === 'doctors' ? 'doctor' : 'mixed'

  return (
    <div>
      <header className="mb-5 rounded-[18px] border border-hairline bg-canvas px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="font-display text-[26px] text-ink">Payroll Management</h2>
            <p className="mt-2 text-[15px] font-normal leading-6 text-slate">
              Assign salaries, review monthly payroll status, and open payment history by employee.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[12px]">
            <span className="rounded-full bg-[#E3F7EC] px-3 py-1 font-semibold text-[#0F9D66]">
              Paid {payrollSummary.paid}
            </span>
            <span className="rounded-full bg-[#FEF3C7] px-3 py-1 font-semibold text-[#B45309]">
              Pending {payrollSummary.pending}
            </span>
            <span className="rounded-full bg-[#E7EEFF] px-3 py-1 font-semibold text-[#1D4ED8]">
              Partial {payrollSummary.partial}
            </span>
            <span className="rounded-full bg-[#F3F4F6] px-3 py-1 font-semibold text-[#5B6472]">
              Not Set {payrollSummary.notConfigured}
            </span>
          </div>
        </div>
      </header>

      <section className="mb-6 rounded-[16px] border border-hairline bg-canvas p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[180px_minmax(220px,1fr)_180px_170px] md:items-end">
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">Payroll Month</span>
            <input
              className="h-11 w-full rounded-control border border-hairline bg-canvas px-3 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
              onChange={(event) => setPayrollMonth(event.target.value)}
              type="month"
              value={payrollMonth}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">Search</span>
            <span className="relative block">
              <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate/60" />
              <input
                className="h-11 w-full rounded-control border border-hairline bg-canvas py-2 pl-9 pr-3 text-[14px] text-ink outline-none transition placeholder:text-slate/60 focus:border-brand focus:ring-1 focus:ring-brand"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Employee or department"
                type="search"
              value={search}
            />
            </span>
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
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">Payment Status</span>
            <select
              className="h-11 w-full rounded-control border border-hairline bg-canvas px-3 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
              onChange={(event) => setStatusFilter(event.target.value)}
              value={statusFilter}
            >
              {PAYROLL_STATUS_OPTIONS.map((status) => (
                <option key={status.value || 'all'} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <div className="mb-6 flex border-b border-hairline">
        {[
          { id: 'all', label: 'All Employees' },
          { id: 'doctors', label: 'Doctors' },
          { id: 'staff', label: 'Staff' },
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

      {loading ? (
        <div className="h-[320px] animate-pulse rounded-[16px] bg-canvas" />
      ) : (
        <SalaryTable
          emptyIcon={activeTab === 'doctors' ? Stethoscope : Users}
          emptyLabel={activeTab === 'doctors' ? 'No doctors added yet. Add a doctor first.' : 'No staff members found.'}
          emptyLink={activeTab === 'doctors' ? { label: 'Go to Doctors', to: '/doctors' } : { label: 'Go to Staff', to: '/staff' }}
          onConfigure={(person) => setConfigModal({ open: true, staff: person })}
          onHistory={handleHistory}
          payrollRecords={payrollRecords}
          people={currentRows}
          type={tableType}
        />
      )}

      <SalaryConfigModal
        isOpen={configModal.open}
        onClose={() => setConfigModal({ open: false, staff: null })}
        onSaved={loadSalaryData}
        staffMember={configModal.staff}
      />
    </div>
  )
}

export default function SalaryOverview() {
  const { role } = useAuth()

  if (role?.slug === 'doctor') {
    return <DoctorSalaryView />
  }

  return <AdminSalaryView />
}
