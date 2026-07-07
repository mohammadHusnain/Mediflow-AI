import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Search, X } from 'lucide-react'
import { Navigate } from 'react-router-dom'

import SalaryBadge from '../../../components/financial/SalaryBadge.jsx'
import { SalaryConfigForm } from '../../../components/financial/SalaryConfigModal.jsx'
import Avatar from '@shared/components/Avatar'
import { useAuth } from '@shared/context/AuthContext'
import { getDoctors, getStaff } from '@shared/services/api'
import { getSalaryConfigs } from '@shared/services/billingApi'
import { PUBLIC_ROUTES_FOR_TESTING } from '@shared/lib/testingAccess'
import {
  getDoctorSalaries as getDemoDoctorSalaries,
  getStaffSalaries as getDemoStaffSalaries,
} from '@shared/services/salaryApi'

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

function configAmount(config) {
  if (!config) return '-'
  if (config.salary_type === 'commission') return `${numberValue(config.commission_rate)}%`
  return formatPkr(config.base_salary ?? config.fixed_amount ?? 0)
}

function CurrentConfig({ config }) {
  if (!config) return null

  return (
    <section className="mb-6 rounded-[12px] bg-mist p-5">
      <h3 className="mb-3 text-[13px] font-semibold text-ink">Current Configuration</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[12px] font-medium text-slate">Salary Type</p>
          <p className="mt-1 font-mono text-[13px] text-ink">{config.salary_type || '-'}</p>
        </div>
        <div>
          <p className="text-[12px] font-medium text-slate">Amount / Rate</p>
          <p className="mt-1 font-mono text-[13px] text-ink">{configAmount(config)}</p>
        </div>
        <div>
          <p className="text-[12px] font-medium text-slate">Effective From</p>
          <p className="mt-1 font-mono text-[13px] text-ink">{formatMonth(config.effective_from)}</p>
        </div>
        <div>
          <p className="text-[12px] font-medium text-slate">Configured By</p>
          <p className="mt-1 font-mono text-[13px] text-ink">{config.configured_by || '-'}</p>
        </div>
      </div>
    </section>
  )
}

export default function SalaryConfig() {
  const { role } = useAuth()
  const [doctors, setDoctors] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [success, setSuccess] = useState(false)

  const loadPeople = useCallback(async () => {
    setLoading(true)
    try {
      if (PUBLIC_ROUTES_FOR_TESTING) {
        const [doctorData, staffData] = await Promise.all([
          getDemoDoctorSalaries(),
          getDemoStaffSalaries(),
        ])
        const nextDoctors = listFromResponse(doctorData)
        const nextStaff = listFromResponse(staffData)
        setDoctors(nextDoctors)
        setStaff(nextStaff)
        setSelectedStaff((current) => {
          if (!current) return current
          return [...nextDoctors, ...nextStaff].find((person) => String(person.id) === String(current.id)) || current
        })
        return [...nextDoctors, ...nextStaff]
      }

      const [doctorsRes, staffRes, configsRes] = await Promise.all([
        getDoctors(),
        getStaff(),
        getSalaryConfigs(),
      ])

      const doctorsList = listFromResponse(doctorsRes)
      const staffList = listFromResponse(staffRes)
      const configs = configsRes?.data?.results ?? configsRes?.data ?? []

      const configMap = new Map()
      const configByEmail = new Map()
      for (const config of configs) {
        const empId = config.employee?.id
        const empEmail = config.employee?.email?.toLowerCase()
        if (empId) configMap.set(empId, config)
        if (empEmail) configByEmail.set(empEmail, config)
      }

      const findConfig = (person) => {
        const byId = configMap.get(person.user_id) || configMap.get(person.id)
        if (byId) return byId
        const email = person.email?.toLowerCase()
        if (email) return configByEmail.get(email)
        return null
      }

      const mapPerson = (person, employeeType) => {
        const empId = employeeType === 'staff' ? (person.user_id ?? person.id) : person.id
        const config = findConfig(person)
        return {
          id: empId,
          name: person.full_name ?? person.name ?? '',
          email: person.email ?? person.user?.email ?? '',
          role: person.role ?? employeeType,
          employee_type: employeeType,
          current_config: config ? {
            id: config.id,
            salary_type: config.salary_type,
            base_salary: config.base_salary,
            fixed_amount: config.base_salary,
            commission_rate: config.commission_rate,
            commission_per_appointment: config.commission_per_appointment,
            effective_from: config.effective_from,
            configured_by: config.employee?.full_name ?? '',
            allowances: config.allowances,
            deductions: config.deductions,
            updated_at: config.updated_at,
          } : null,
        }
      }

      const nextDoctors = doctorsList.map((d) => mapPerson(d, 'doctor'))
      const nextStaff = staffList.map((s) => mapPerson(s, 'staff'))

      setDoctors(nextDoctors)
      setStaff(nextStaff)
      setSelectedStaff((current) => {
        if (!current) return current
        return [...nextDoctors, ...nextStaff].find((person) => String(person.id) === String(current.id)) || current
      })

      return [...nextDoctors, ...nextStaff]
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadPeople, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadPeople])

  useEffect(() => {
    if (!success) return undefined

    const timeoutId = window.setTimeout(() => setSuccess(false), 4000)
    return () => window.clearTimeout(timeoutId)
  }, [success])

  const allPeople = useMemo(() => [...doctors, ...staff], [doctors, staff])
  const filteredPeople = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    const source = query
      ? allPeople.filter((person) => {
      return (
        person.name?.toLowerCase().includes(query) ||
        person.email?.toLowerCase().includes(query) ||
        person.role?.toLowerCase().includes(query)
      )
      })
      : allPeople

    return [...source].sort((first, second) => {
      const firstConfigured = first.current_config ? 1 : 0
      const secondConfigured = second.current_config ? 1 : 0

      if (firstConfigured !== secondConfigured) {
        return firstConfigured - secondConfigured
      }

      return String(first.name || '').localeCompare(String(second.name || ''))
    })
  }, [allPeople, searchQuery])

  if (role?.slug === 'doctor') {
    return <Navigate replace to="/financial-reports/salary" />
  }

  async function handleSaved() {
    await loadPeople()
    setSuccess(true)
  }

  return (
    <div>
      <header className="mb-6">
        <h2 className="font-display text-[26px] text-ink">Salary Configuration</h2>
        <p className="mt-1 text-[14px] font-normal text-slate">
          Configure or update salary for doctors and staff
        </p>
      </header>

      <section className="mb-6 rounded-[16px] border border-hairline bg-canvas p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[14px] font-semibold text-ink">Related Staff Members</h3>
          <span className="text-[12px] font-medium text-slate">
            {loading ? 'Loading...' : `${filteredPeople.length} shown`}
          </span>
        </div>
        <label className="relative block">
          <span className="sr-only">Search staff members</span>
          <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate/60" />
          <input
            className="h-11 w-full rounded-control border border-hairline bg-canvas py-2 pl-9 pr-3 text-[14px] text-ink outline-none transition placeholder:text-slate/60 focus:border-brand focus:ring-1 focus:ring-brand"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by name or email"
            type="search"
            value={searchQuery}
          />
        </label>

        <div className="mt-3 max-h-[320px] overflow-y-auto rounded-[12px] border border-hairline bg-mist">
          {loading ? (
            <p className="px-4 py-3 text-[14px] font-normal text-slate">Loading staff...</p>
          ) : filteredPeople.length === 0 ? (
            <p className="px-4 py-3 text-[14px] font-normal text-slate">No staff found</p>
          ) : (
            filteredPeople.map((person) => {
              const selected = String(selectedStaff?.id || '') === String(person.id)

              return (
                <button
                  className={[
                    'flex w-full items-center justify-between gap-4 border-b border-hairline px-4 py-3 text-left transition last:border-0',
                    selected ? 'bg-brand/5' : 'hover:bg-canvas',
                  ].join(' ')}
                  key={person.id}
                  onClick={() => {
                    setSelectedStaff(person)
                    setSuccess(false)
                  }}
                  type="button"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar name={person.name} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-semibold text-ink">{person.name}</span>
                      <span className="block truncate text-[12px] font-normal text-slate">{person.role} - {person.email}</span>
                    </span>
                  </span>
                  {person.current_config ? (
                    <SalaryBadge type={person.current_config.salary_type} />
                  ) : (
                    <span className="text-[12px] font-normal text-slate">Not configured</span>
                  )}
                </button>
              )
            })
          )}
        </div>
      </section>

      {selectedStaff ? (
        <section className="animate-fade-in rounded-[16px] border border-hairline bg-canvas p-8">
          <header className="mb-6 flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={selectedStaff.name} size="md" />
              <div className="min-w-0">
                <h3 className="truncate text-[18px] font-semibold text-ink">{selectedStaff.name}</h3>
                <p className="truncate text-[13px] font-normal text-slate">{selectedStaff.role} - {selectedStaff.email}</p>
              </div>
            </div>
            <button
              className="rounded-control p-2 text-slate transition hover:bg-mist hover:text-ink"
              onClick={() => {
                setSelectedStaff(null)
                setSuccess(false)
              }}
              type="button"
            >
              <span className="sr-only">Clear selected staff member</span>
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </header>

          {success ? (
            <div className="mb-6 flex items-center gap-2 rounded-[10px] border border-[#A7F3D0] bg-[#E3F7EC] px-4 py-3">
              <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-[#0F9D66]" />
              <span className="text-[13px] font-medium text-[#0F9D66]">
                Salary configuration saved successfully.
              </span>
            </div>
          ) : null}

          <CurrentConfig config={selectedStaff.current_config} />

          <SalaryConfigForm
            onSaved={handleSaved}
            staffMember={selectedStaff}
            submitLabel="Save Configuration"
          />
          <p className="mt-3 text-center text-[12px] font-normal italic text-slate">
            This will take effect from the selected month onwards
          </p>
        </section>
      ) : null}
    </div>
  )
}
