import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Percent,
  Stethoscope,
  Users,
  Wallet,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import SalaryBadge from '../../../components/financial/SalaryBadge.jsx'
import SalaryConfigModal from '../../../components/financial/SalaryConfigModal.jsx'
import StatCard from '../../../components/financial/StatCard.jsx'
import Avatar from '@shared/components/Avatar'
import { useAuth } from '@shared/context/AuthContext'
import {
  getDoctorSalaries,
  getOwnSalary,
  getSalaryOverview,
  getSalaryStats,
  getStaffSalaries,
} from '@shared/services/salaryApi'

const CHART_COLORS = ['#4338CA', '#7C3AED', '#B45309']

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

function SalaryTable({ emptyIcon, emptyLabel, emptyLink, onConfigure, onHistory, people, type }) {
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
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead className="border-b border-hairline bg-mist/60">
            <tr>
              {['Name', 'Role', 'Salary Type', 'Amount / Rate', 'Effective From', 'Configured', 'Actions'].map((header) => (
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
              const invalidStaffCommission = type === 'staff' && config?.salary_type === 'commission'

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
  const [activeTab, setActiveTab] = useState('doctors')
  const [stats, setStats] = useState(null)
  const [overview, setOverview] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [configModal, setConfigModal] = useState({ open: false, staff: null })

  const loadSalaryData = useCallback(async () => {
    setLoading(true)
    try {
      const [statsData, overviewData, doctorsData, staffData] = await Promise.all([
        getSalaryStats(),
        getSalaryOverview(),
        getDoctorSalaries(),
        getStaffSalaries(),
      ])
      setStats(statsData || {})
      setOverview(overviewData || {})
      setDoctors(listFromResponse(doctorsData))
      setStaff(listFromResponse(staffData))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadSalaryData, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadSalaryData])

  function handleHistory(person) {
    navigate('/financial-reports/salary/history', { state: { userId: person.id } })
  }

  const currentRows = activeTab === 'doctors' ? doctors : staff

  return (
    <div>
      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Staff on Salary"
          loading={loading && !stats}
          value={stats?.total_configured}
        />
        <StatCard
          icon={DollarSign}
          label="Fixed Salary Budget"
          loading={loading && !stats}
          sub="PKR/month"
          value={stats?.total_fixed_monthly === undefined ? undefined : formatPkr(stats.total_fixed_monthly)}
        />
        <StatCard
          accentColor="green"
          icon={Percent}
          label="Commission Staff"
          loading={loading && !stats}
          value={stats?.commission_count}
        />
        <StatCard
          accentColor={numberValue(stats?.not_configured) > 0 ? 'amber' : 'slate'}
          icon={AlertCircle}
          label="Not Configured"
          loading={loading && !stats}
          value={stats?.not_configured}
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-[16px] border border-hairline bg-canvas p-5">
          <div className="mb-4">
            <h3 className="text-[15px] font-semibold text-ink">Monthly Salary Budget</h3>
            <p className="mt-1 text-[12px] text-slate">Fixed and commission projection</p>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer height="100%" minHeight={1} minWidth={1} width="100%">
              <BarChart data={overview?.budget_trend || []}>
                <CartesianGrid stroke="#E4E8EB" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#5B6472', fontSize: 11 }} tickFormatter={formatMonth} tickLine={false} />
                <YAxis tick={{ fill: '#5B6472', fontSize: 11 }} tickFormatter={(value) => `${Math.round(value / 1000)}K`} tickLine={false} />
                <Tooltip formatter={(value) => formatPkr(value)} labelFormatter={formatMonth} />
                <Bar dataKey="fixed" fill="#4338CA" name="Fixed" radius={[6, 6, 0, 0]} />
                <Bar dataKey="commission" fill="#7C3AED" name="Commission" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-[16px] border border-hairline bg-canvas p-5">
          <div className="mb-4">
            <h3 className="text-[15px] font-semibold text-ink">Salary Types</h3>
            <p className="mt-1 text-[12px] text-slate">Configured vs pending</p>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer height="100%" minHeight={1} minWidth={1} width="100%">
              <PieChart>
                <Tooltip />
                <Pie
                  data={overview?.salary_type_distribution || []}
                  dataKey="value"
                  innerRadius={58}
                  outerRadius={86}
                  paddingAngle={4}
                >
                  {(overview?.salary_type_distribution || []).map((entry, index) => (
                    <Cell fill={CHART_COLORS[index % CHART_COLORS.length]} key={entry.name} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="mb-6 flex border-b border-hairline">
        {[
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
          emptyLabel={activeTab === 'doctors' ? 'No doctors added yet. Add a doctor first.' : 'No staff members added yet.'}
          emptyLink={activeTab === 'doctors' ? { label: 'Go to Doctors', to: '/doctors' } : { label: 'Go to Staff', to: '/staff' }}
          onConfigure={(person) => setConfigModal({ open: true, staff: person })}
          onHistory={handleHistory}
          people={currentRows}
          type={activeTab === 'doctors' ? 'doctor' : 'staff'}
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
