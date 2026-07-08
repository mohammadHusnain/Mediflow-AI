import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Eye,
  History,
  Pencil,
  Plus,
  Receipt,
  Search,
  Wallet,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import Avatar from '@shared/components/Avatar'
import ConfirmationModal from '@shared/components/ConfirmationModal'
import CurrencyDisplay from '@shared/components/CurrencyDisplay'
import { useToast } from '@shared/components/Toast'
import { useAuth } from '@shared/context/AuthContext'
import { translucentBackdropClass } from '@shared/components/FormPrimitives'
import { getBackendError } from '@shared/lib/records'
import { getDoctors, getStaff } from '@shared/services/api'
import {
  getSalaryConfigs,
  getSalaryRecords,
  paySalary,
} from '@shared/services/billingApi'
import { getOwnSalary } from '@shared/services/salaryApi'

function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

function listFromResponse(response) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.results)) return response.results
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.data?.results)) return response.data.results
  return []
}

function numberValue(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function fullName(person) {
  return (
    person?.full_name ||
    person?.name ||
    `${person?.first_name || ''} ${person?.last_name || ''}`.trim() ||
    person?.email ||
    'Unknown employee'
  )
}

function employeeRole(person, employeeType) {
  if (employeeType === 'doctor') {
    const specialization = Array.isArray(person?.specializations)
      ? person.specializations[0]
      : person?.specialization || person?.specializations

    return specialization || 'Doctor'
  }

  return person?.role || person?.title || 'Staff'
}

function normalizeConfig(config) {
  if (!config) return null

  return {
    ...config,
    base_salary: numberValue(config.base_salary ?? config.fixed_amount),
    effective_from: config.effective_from || '',
  }
}

function monthParts(month) {
  const [year, monthNumber] = String(month || currentMonth()).split('-')
  return { month: Number(monthNumber), year: Number(year) }
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

function formatMonth(value) {
  if (!value) return '-'
  const [year, month] = String(value).split('-')
  if (!year || !month) return value

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(Number(year), Number(month) - 1, 1))
}

function recordEmployeeId(record) {
  return record?.employee_id || record?.user_id || record?.employee?.id || record?.staff?.id || null
}

function recordEmployeeEmail(record) {
  return String(record?.employee?.email || record?.email || '').toLowerCase()
}

function recordAmount(record) {
  return record?.total_earned ?? record?.calculated_amount ?? record?.net_salary ?? record?.amount ?? record?.base_amount ?? 0
}

function recordStatus(record) {
  const status = String(record?.status || '').toLowerCase()
  if (['paid', 'disbursed', 'processed'].includes(status)) return 'paid'
  return 'unpaid'
}

function employeeRecord(employee, records) {
  return records.find((record) => {
    const id = recordEmployeeId(record)
    if (id && String(id) === String(employee.id)) return true

    const email = recordEmployeeEmail(record)
    return email && email === String(employee.email || '').toLowerCase()
  }) || null
}

function receiptNumber(employee, record, month) {
  if (record?.receipt_number || record?.payment_reference || record?.reference) {
    return record.receipt_number || record.payment_reference || record.reference
  }

  const salaryMonth = String(record?.salary_month || month || currentMonth()).replace('-', '')
  return `SAL-${salaryMonth}-${employee?.id || 'EMP'}`
}

function StatusChip({ status }) {
  const paid = status === 'paid'

  return (
    <span
      className={[
        'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
        paid ? 'bg-[#E3F7EC] text-[#0F9D66]' : 'bg-[#FCE4E8] text-[#C8102E]',
      ].join(' ')}
    >
      {paid ? 'Paid' : 'Unpaid'}
    </span>
  )
}

function NotSetChip() {
  return (
    <span className="inline-flex rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#5B6472]">
      Not Set
    </span>
  )
}

function SummaryCard({ amount, count, label }) {
  return (
    <section className="rounded-[14px] border border-hairline bg-canvas px-5 py-4 shadow-sm">
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate">{label}</p>
      <p className="mt-2 text-[20px] font-bold text-ink">
        <CurrencyDisplay amount={amount} />
      </p>
      <p className="mt-1 text-[12px] text-slate">{count} employees</p>
    </section>
  )
}

function ReceiptRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-hairline py-2.5 last:border-0">
      <span className="text-[13px] font-medium text-slate">{label}</span>
      <span className="text-right text-[13px] font-semibold text-ink">{value || '-'}</span>
    </div>
  )
}

function SalaryReceiptModal({ employee, month, onClose }) {
  if (!employee) return null

  const record = employee.record || {}
  const amount = recordAmount(record) || employee.base_salary
  const paidDate = record.paid_date || record.disbursed_on || record.payment_date
  const salaryMonth = record.salary_month || month

  return (
    <div className={`fixed inset-0 z-[80] flex items-center justify-center px-4 ${translucentBackdropClass}`}>
      <section
        aria-labelledby="salary-receipt-title"
        aria-modal="true"
        className="w-full max-w-[520px] animate-scale-in overflow-hidden rounded-card border border-hairline bg-canvas shadow-[0_16px_60px_rgba(20,24,31,0.18)]"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-hairline bg-mist/60 px-6 py-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
              <Receipt aria-hidden="true" className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[18px] font-bold text-ink" id="salary-receipt-title">
                Salary Receipt
              </h2>
              <p className="mt-1 font-mono text-[12px] text-slate">
                {receiptNumber(employee, record, month)}
              </p>
            </div>
          </div>
          <button
            className="rounded-lg p-2 text-slate transition hover:bg-canvas hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            onClick={onClose}
            type="button"
          >
            <span className="sr-only">Close receipt</span>
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="mb-5 rounded-[14px] border border-hairline bg-mist/50 px-4 py-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate">
              Amount Paid
            </p>
            <p className="mt-2 text-[28px] font-bold leading-none text-brand">
              <CurrencyDisplay amount={amount} />
            </p>
          </div>

          <div className="rounded-[14px] border border-hairline px-4 py-2">
            <ReceiptRow label="Employee" value={employee.name} />
            <ReceiptRow label="Role" value={employee.role} />
            <ReceiptRow label="Salary Month" value={formatMonth(salaryMonth)} />
            <ReceiptRow label="Paid Date" value={formatDate(paidDate)} />
            <ReceiptRow label="Status" value="Paid" />
          </div>
        </div>

        <div className="flex justify-end border-t border-hairline px-6 py-4">
          <button
            className="rounded-control bg-brand px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2"
            onClick={onClose}
            type="button"
          >
            Done
          </button>
        </div>
      </section>
    </div>
  )
}

function HistoryTable({ rows }) {
  if (rows.length === 0) {
    return (
      <section className="rounded-[14px] border border-hairline bg-canvas px-5 py-8 text-center">
        <Wallet aria-hidden="true" className="mx-auto mb-3 h-9 w-9 text-hairline" />
        <p className="font-display text-[17px] italic text-slate">No salary history for this month</p>
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-[16px] border border-hairline bg-canvas">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead className="border-b border-hairline bg-mist/60">
            <tr>
              {['Date', 'Employee', 'Amount', 'Status'].map((header) => (
                <th
                  className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate"
                  key={header}
                  scope="col"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((record) => (
              <tr className="border-b border-hairline last:border-0 hover:bg-mist/40" key={record.id || `${recordEmployeeId(record)}-${record.salary_month}`}>
                <td className="px-5 py-2.5 font-mono text-[12px] text-slate">
                  {formatDate(record.paid_date || record.disbursed_on || record.salary_month)}
                </td>
                <td className="px-5 py-2.5 text-[14px] font-semibold text-ink">
                  {record.employee_name || record.staff_name || record.employee?.full_name || '-'}
                </td>
                <td className="px-5 py-2.5 text-[14px] text-ink">
                  <CurrencyDisplay amount={recordAmount(record)} />
                </td>
                <td className="px-5 py-2.5">
                  <StatusChip status={recordStatus(record)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function DoctorSalaryView() {
  const [salary, setSalary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadOwnSalary() {
      setLoading(true)
      try {
        const data = await getOwnSalary()
        if (mounted) setSalary(data)
      } catch {
        if (mounted) setSalary(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadOwnSalary()

    return () => {
      mounted = false
    }
  }, [])

  const config = salary?.current_config || salary
  const amount = config?.base_salary ?? config?.fixed_amount ?? 0

  return (
    <div>
      <header className="mb-6">
        <h2 className="font-display text-[26px] text-ink">My Salary</h2>
        <p className="mt-1 text-[14px] font-normal text-slate">Your current salary configuration</p>
      </header>

      {loading ? (
        <div className="h-[280px] max-w-[520px] animate-pulse rounded-[20px] bg-canvas" />
      ) : !amount ? (
        <section className="flex min-h-[260px] max-w-[520px] items-center justify-center rounded-[20px] border border-hairline bg-canvas p-8 text-center">
          <div>
            <Wallet aria-hidden="true" className="mx-auto mb-3 h-10 w-10 text-hairline" />
            <p className="font-display text-[20px] italic text-slate">Salary not configured yet</p>
          </div>
        </section>
      ) : (
        <section className="max-w-[520px] rounded-[20px] border border-hairline bg-canvas p-8">
          <p className="text-[13px] font-medium text-slate">Base Salary</p>
          <p className="mt-3 text-[42px] font-bold leading-none text-brand">
            <CurrencyDisplay amount={amount} />
          </p>
          <p className="mt-3 text-[14px] text-slate">Effective from {formatDate(config.effective_from)}</p>
        </section>
      )}
    </div>
  )
}

export default function SalaryOverview() {
  const navigate = useNavigate()
  const toast = useToast()
  const { role } = useAuth()
  const [month, setMonth] = useState(currentMonth())
  const [search, setSearch] = useState('')
  const [employees, setEmployees] = useState([])
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [payTarget, setPayTarget] = useState(null)
  const [payingId, setPayingId] = useState(null)
  const [receiptTarget, setReceiptTarget] = useState(null)

  const loadSalaryData = useCallback(async () => {
    setLoading(true)

    try {
      const { month: monthNumber, year } = monthParts(month)
      const [doctorsRes, staffRes, configsRes, recordsRes] = await Promise.all([
        getDoctors(),
        getStaff(),
        getSalaryConfigs(),
        getSalaryRecords({ month: monthNumber, year }),
      ])
      const configs = listFromResponse(configsRes)
      const configById = new Map()
      const configByEmail = new Map()

      configs.forEach((config) => {
        const normalized = normalizeConfig(config)
        const employeeId = config.employee?.id || config.employee_id || config.user_id || config.staff_id
        const email = String(config.employee?.email || config.email || '').toLowerCase()

        if (employeeId) configById.set(String(employeeId), normalized)
        if (email) configByEmail.set(email, normalized)
      })

      const findConfig = (person) => {
        const id = person.user_id ?? person.id
        const email = String(person.email || person.user?.email || '').toLowerCase()

        return configById.get(String(id)) || (email ? configByEmail.get(email) : null) || null
      }
      const mapPerson = (person, employeeType) => {
        const id = employeeType === 'staff' ? (person.user_id ?? person.id) : (person.user_id ?? person.id)
        const config = findConfig(person)

        return {
          base_salary: numberValue(config?.base_salary ?? person.base_salary ?? person.salary),
          current_config: config,
          email: person.email ?? person.user?.email ?? '',
          employee_type: employeeType,
          id,
          name: fullName(person),
          role: employeeRole(person, employeeType),
        }
      }

      setEmployees([
        ...listFromResponse(doctorsRes).map((doctor) => mapPerson(doctor, 'doctor')),
        ...listFromResponse(staffRes).map((staffMember) => mapPerson(staffMember, 'staff')),
      ])
      setRecords(listFromResponse(recordsRes))
    } catch (error) {
      toast.error(getBackendError(error, 'Salary data could not be loaded.'))
      setEmployees([])
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [month, toast])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadSalaryData, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadSalaryData])

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()

    return employees
      .filter((employee) => {
        if (!query) return true
        return [employee.name, employee.email, employee.role]
          .some((value) => String(value || '').toLowerCase().includes(query))
      })
      .map((employee) => {
        const record = employeeRecord(employee, records)
        const configured = employee.base_salary > 0
        const status = configured ? recordStatus(record) : 'not_set'

        return { ...employee, configured, record, status }
      })
      .sort((first, second) => String(first.name || '').localeCompare(String(second.name || '')))
  }, [employees, records, search])

  const summary = useMemo(() => {
    return rows.reduce(
      (totals, employee) => {
        if (!employee.configured) return totals

        totals.total.count += 1
        totals.total.amount += employee.base_salary

        if (employee.status === 'paid') {
          totals.paid.count += 1
          totals.paid.amount += employee.base_salary
        } else {
          totals.pending.count += 1
          totals.pending.amount += employee.base_salary
        }

        return totals
      },
      {
        paid: { amount: 0, count: 0 },
        pending: { amount: 0, count: 0 },
        total: { amount: 0, count: 0 },
      },
    )
  }, [rows])

  async function handlePayConfirm() {
    if (!payTarget) return

    setPayingId(payTarget.id)

    try {
      await paySalary({
        employeeId: payTarget.id,
        month,
        recordId: payTarget.record?.id,
      })
      toast.success('Payment recorded')
      setPayTarget(null)
      await loadSalaryData()
    } catch (error) {
      toast.error(getBackendError(error, 'Salary payment could not be recorded.'))
    } finally {
      setPayingId(null)
    }
  }

  if (role?.slug === 'doctor') {
    return <DoctorSalaryView />
  }

  return (
    <div>
      <section className="mb-6 rounded-[16px] border border-hairline bg-canvas shadow-sm">
        <div className="flex flex-col gap-4 border-b border-hairline px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-[16px] font-bold text-ink">Salary Overview</h2>
            <p className="mt-1 text-[14px] text-slate">{formatMonth(month)}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[180px_minmax(240px,1fr)]">
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">Month</span>
              <input
                className="h-11 w-full rounded-control border border-hairline bg-canvas px-3 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
                onChange={(event) => setMonth(event.target.value || currentMonth())}
                type="month"
                value={month}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">Search</span>
              <span className="relative block">
                <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate/60" />
                <input
                  className="h-11 w-full rounded-control border border-hairline bg-canvas py-2 pl-9 pr-3 text-[14px] text-ink outline-none transition placeholder:text-slate/60 focus:border-brand focus:ring-1 focus:ring-brand"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Employee or role"
                  type="search"
                  value={search}
                />
              </span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
          <SummaryCard amount={summary.total.amount} count={summary.total.count} label="Total Payroll" />
          <SummaryCard amount={summary.paid.amount} count={summary.paid.count} label="Paid" />
          <SummaryCard amount={summary.pending.amount} count={summary.pending.count} label="Pending" />
        </div>

        <div className="overflow-x-auto border-t border-hairline">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead className="border-b border-hairline bg-mist/60">
              <tr>
                {['Employee', 'Role', 'Salary', 'Status', 'Action'].map((header) => (
                  <th
                    className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate"
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
                <tr>
                  <td className="px-5 py-10 text-center text-[14px] text-slate" colSpan={5}>
                    Loading salary records...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-5 py-12 text-center" colSpan={5}>
                    <Wallet aria-hidden="true" className="mx-auto mb-3 h-10 w-10 text-hairline" />
                    <p className="font-display text-[18px] italic text-slate">No employees found</p>
                  </td>
                </tr>
              ) : (
                rows.map((employee) => (
                  <tr className="border-b border-hairline last:border-0 hover:bg-mist/40" key={`${employee.employee_type}-${employee.id}`}>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={employee.name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-semibold text-ink">{employee.name}</p>
                          <p className="truncate text-[12px] text-slate">{employee.email || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-[13px] text-slate">{employee.role}</td>
                    <td className="px-5 py-2.5 text-[14px] text-ink">
                      {employee.configured ? <CurrencyDisplay amount={employee.base_salary} /> : <span className="text-slate/50">-</span>}
                    </td>
                    <td className="px-5 py-2.5">
                      {employee.configured ? <StatusChip status={employee.status} /> : <NotSetChip />}
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          className="inline-flex h-9 items-center gap-1.5 rounded-control border border-brand/20 bg-brand/5 px-3 text-[13px] font-semibold text-brand transition hover:border-brand/30 hover:bg-brand/10 hover:text-brand-dark"
                          onClick={() => navigate(`/financial-reports/salary/${employee.id}/${employee.configured ? 'edit' : 'add'}`)}
                          type="button"
                        >
                          {employee.configured ? <Pencil aria-hidden="true" className="h-4 w-4" /> : <Plus aria-hidden="true" className="h-4 w-4" />}
                          {employee.configured ? 'Edit Salary' : 'Add Salary'}
                        </button>
                        {employee.configured && employee.status !== 'paid' ? (
                          <button
                            className="inline-flex h-9 items-center gap-1.5 rounded-control bg-brand px-3 text-[13px] font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
                            disabled={payingId === employee.id}
                            onClick={() => setPayTarget(employee)}
                            type="button"
                          >
                            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                            {payingId === employee.id ? 'Paying...' : 'Pay Now'}
                          </button>
                        ) : null}
                        {employee.status === 'paid' ? (
                          <button
                            className="inline-flex h-9 items-center gap-1.5 rounded-control border border-hairline bg-canvas px-3 text-[13px] font-semibold text-slate transition hover:bg-mist hover:text-ink"
                            onClick={() => setReceiptTarget(employee)}
                            type="button"
                          >
                            <Eye aria-hidden="true" className="h-4 w-4" />
                            View Receipt
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
      </section>

      <button
        className="mb-4 flex items-center gap-2 text-[13px] font-semibold text-brand transition hover:text-brand-dark"
        onClick={() => setShowHistory((current) => !current)}
        type="button"
      >
        <History aria-hidden="true" className="h-4 w-4" />
        {showHistory ? 'Hide Salary History' : 'Show Salary History'}
      </button>

      {showHistory ? (
        <div className="animate-fade-up">
          <HistoryTable rows={records} />
        </div>
      ) : null}

      {payTarget ? (
        <ConfirmationModal
          body={
            <>
              Confirm payment of <CurrencyDisplay amount={payTarget.base_salary} className="font-semibold text-ink" /> to{' '}
              <span className="font-semibold text-ink">{payTarget.name}</span> for {formatMonth(month)}?
            </>
          }
          confirmLabel="Pay Now"
          isLoading={payingId === payTarget.id}
          onCancel={() => setPayTarget(null)}
          onConfirm={handlePayConfirm}
          title="Record salary payment?"
        />
      ) : null}

      {receiptTarget ? (
        <SalaryReceiptModal
          employee={receiptTarget}
          month={month}
          onClose={() => setReceiptTarget(null)}
        />
      ) : null}
    </div>
  )
}
