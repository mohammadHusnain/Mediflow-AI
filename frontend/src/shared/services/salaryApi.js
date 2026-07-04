import { api } from './api'
import { PUBLIC_ROUTES_FOR_TESTING } from '@shared/lib/testingAccess'
import { assertSalaryConfigPayload } from '@shared/lib/financialValidation'

const NOW = new Date()
const CURRENT_MONTH = NOW.toISOString().slice(0, 7)

function monthOffset(offset = 0) {
  const date = new Date(NOW.getFullYear(), NOW.getMonth() + offset, 1)
  return date.toISOString().slice(0, 7)
}

function isoNow() {
  return new Date().toISOString()
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function createDemoError(detail, status = 400) {
  const error = new Error(detail)
  error.response = {
    data: { detail, error: detail },
    status,
  }
  throw error
}

function throwSalaryError(error) {
  error.service = 'salary'
  throw error
}

function normalizeMonth(params = {}) {
  if (params.month && String(params.month).includes('-')) {
    return String(params.month)
  }

  if (params.month && params.year) {
    return `${params.year}-${String(params.month).padStart(2, '0')}`
  }

  return params.month || CURRENT_MONTH
}

function paginate(items, params = {}) {
  const page = Math.max(1, Number(params.page || 1))
  const pageSize = Math.max(1, Number(params.page_size || 20))
  const start = (page - 1) * pageSize
  const results = items.slice(start, start + pageSize)

  return {
    count: items.length,
    next: start + pageSize < items.length ? `demo-page-${page + 1}` : null,
    previous: page > 1 ? `demo-page-${page - 1}` : null,
    results,
  }
}

let demoSalaryPeople = [
  {
    id: 201,
    email: 'doctor.testing@mediflow.local',
    employee_type: 'doctor',
    name: 'Nora Patel',
    role: 'Doctor',
    current_config: {
      commission_base: 'consultation_fee',
      commission_rate: 30,
      configured_by: 'admin@clinic.local',
      effective_from: monthOffset(-2),
      fixed_amount: null,
      salary_type: 'commission',
      updated_at: monthOffset(-1),
    },
  },
  {
    id: 202,
    email: 'ayesha.rahman@clinic.local',
    employee_type: 'doctor',
    name: 'Ayesha Rahman',
    role: 'Doctor',
    current_config: {
      commission_base: '',
      commission_rate: null,
      configured_by: 'admin@clinic.local',
      effective_from: monthOffset(-3),
      fixed_amount: 180000,
      salary_type: 'fixed',
      updated_at: monthOffset(-2),
    },
  },
  {
    id: 203,
    email: 'usman.siddiqui@clinic.local',
    employee_type: 'doctor',
    name: 'Usman Siddiqui',
    role: 'Doctor',
    current_config: null,
  },
  {
    id: 401,
    email: 'reception.testing@mediflow.local',
    employee_type: 'staff',
    name: 'Dana Teller',
    role: 'Receptionist',
    current_config: {
      commission_base: '',
      commission_rate: null,
      configured_by: 'admin@clinic.local',
      effective_from: monthOffset(-4),
      fixed_amount: 85000,
      salary_type: 'fixed',
      updated_at: monthOffset(-1),
    },
  },
  {
    id: 402,
    email: 'sana.iqbal@clinic.local',
    employee_type: 'staff',
    name: 'Sana Iqbal',
    role: 'Nurse',
    current_config: {
      commission_base: '',
      commission_rate: null,
      configured_by: 'admin@clinic.local',
      effective_from: monthOffset(-5),
      fixed_amount: 70000,
      salary_type: 'fixed',
      updated_at: monthOffset(-1),
    },
  },
  {
    id: 403,
    email: 'imran.qureshi@clinic.local',
    employee_type: 'staff',
    name: 'Imran Qureshi',
    role: 'Lab Technician',
    current_config: null,
  },
]

let demoHistory = [
  {
    id: 3001,
    appointments_count: 22,
    base_amount: 0,
    calculated_amount: 39600,
    employee_name: 'Nora Patel',
    role: 'Doctor',
    salary_month: CURRENT_MONTH,
    salary_type: 'commission',
    status: 'pending',
    total_earned: 39600,
    user_id: 201,
  },
  {
    id: 3002,
    appointments_count: 0,
    base_amount: 180000,
    calculated_amount: 180000,
    employee_name: 'Ayesha Rahman',
    role: 'Doctor',
    salary_month: CURRENT_MONTH,
    salary_type: 'fixed',
    status: 'disbursed',
    total_earned: 180000,
    user_id: 202,
  },
  {
    id: 3003,
    appointments_count: 0,
    base_amount: 85000,
    calculated_amount: 85000,
    employee_name: 'Dana Teller',
    role: 'Receptionist',
    salary_month: CURRENT_MONTH,
    salary_type: 'fixed',
    status: 'pending',
    total_earned: 85000,
    user_id: 401,
  },
  {
    id: 3004,
    appointments_count: 0,
    base_amount: 70000,
    calculated_amount: 70000,
    employee_name: 'Sana Iqbal',
    role: 'Nurse',
    salary_month: CURRENT_MONTH,
    salary_type: 'fixed',
    status: 'on_hold',
    total_earned: 70000,
    user_id: 402,
  },
  {
    id: 3005,
    appointments_count: 18,
    base_amount: 0,
    calculated_amount: 32400,
    employee_name: 'Nora Patel',
    role: 'Doctor',
    salary_month: monthOffset(-1),
    salary_type: 'commission',
    status: 'disbursed',
    total_earned: 32400,
    user_id: 201,
  },
]

let demoDisbursements = [
  {
    id: 5001,
    base_amount: 39600,
    bonus: 0,
    disbursed_on: '',
    employee_name: 'Nora Patel',
    role: 'Doctor',
    salary_month: CURRENT_MONTH,
    salary_type: 'commission',
    status: 'pending',
    total: 39600,
    user_id: 201,
  },
  {
    id: 5002,
    base_amount: 180000,
    bonus: 10000,
    disbursed_on: `${CURRENT_MONTH}-02`,
    employee_name: 'Ayesha Rahman',
    role: 'Doctor',
    salary_month: CURRENT_MONTH,
    salary_type: 'fixed',
    status: 'disbursed',
    total: 190000,
    user_id: 202,
  },
  {
    id: 5003,
    base_amount: 85000,
    bonus: 5000,
    disbursed_on: '',
    employee_name: 'Dana Teller',
    role: 'Receptionist',
    salary_month: CURRENT_MONTH,
    salary_type: 'fixed',
    status: 'pending',
    total: 90000,
    user_id: 401,
  },
  {
    id: 5004,
    base_amount: 70000,
    bonus: 0,
    disbursed_on: '',
    employee_name: 'Sana Iqbal',
    role: 'Nurse',
    salary_month: CURRENT_MONTH,
    salary_type: 'fixed',
    status: 'pending',
    total: 70000,
    user_id: 402,
  },
]

function configuredPeople() {
  return demoSalaryPeople.filter((person) => person.current_config)
}

function getDemoSalaryStats() {
  const configured = configuredPeople()

  return {
    commission_count: configured.filter((person) => person.current_config.salary_type === 'commission').length,
    not_configured: demoSalaryPeople.length - configured.length,
    total_configured: configured.length,
    total_fixed_monthly: configured.reduce(
      (sum, person) => sum + Number(person.current_config.fixed_amount || 0),
      0,
    ),
  }
}

function getDemoSalaryOverview() {
  const stats = getDemoSalaryStats()

  return {
    budget_trend: [
      { commission: 28800, fixed: 315000, month: monthOffset(-3), total: 343800 },
      { commission: 32400, fixed: 325000, month: monthOffset(-2), total: 357400 },
      { commission: 34200, fixed: 335000, month: monthOffset(-1), total: 369200 },
      { commission: 39600, fixed: stats.total_fixed_monthly, month: CURRENT_MONTH, total: stats.total_fixed_monthly + 39600 },
    ],
    salary_type_distribution: [
      { name: 'Fixed', value: configuredPeople().filter((person) => person.current_config.salary_type === 'fixed').length },
      { name: 'Commission', value: stats.commission_count },
      { name: 'Not Set', value: stats.not_configured },
    ],
  }
}

function getDemoOwnSalary() {
  const person = demoSalaryPeople.find((candidate) => candidate.id === 201)
  return {
    ...person.current_config,
    configured_by: person.current_config?.configured_by || '',
    history: demoHistory.filter((record) => record.user_id === person.id),
    staff_member: person,
  }
}

function getPersonById(id) {
  return demoSalaryPeople.find((person) => String(person.id) === String(id))
}

function recordPerson(record) {
  return getPersonById(record.user_id) || null
}

function recordStatusMatches(record, status) {
  const requestedStatus = String(status || '').trim().toLowerCase()
  if (!requestedStatus) return true

  const currentStatus = String(record.status || '').trim().toLowerCase()
  if (requestedStatus === 'paid') return ['paid', 'disbursed'].includes(currentStatus)
  if (requestedStatus === 'partially_paid') return ['partial', 'partially_paid'].includes(currentStatus)

  return currentStatus === requestedStatus
}

function recordDepartmentMatches(record, department) {
  const requestedDepartment = String(department || '').trim().toLowerCase()
  if (!requestedDepartment) return true

  const person = recordPerson(record)
  return String(person?.role || record.role || '').trim().toLowerCase() === requestedDepartment
}

function recordEmployeeMatches(record, employee) {
  const query = String(employee || '').trim().toLowerCase()
  if (!query) return true

  const person = recordPerson(record)
  return [record.employee_name, record.staff_name, person?.name, person?.email, record.role]
    .some((value) => String(value || '').toLowerCase().includes(query))
}

function applyConfig(payload = {}) {
  const userId = payload.user_id ?? payload.staff_id ?? payload.id
  const person = getPersonById(userId)

  if (!person) {
    createDemoError('Staff member not found.', 404)
  }

  assertSalaryConfigPayload(payload, person)

  if (person.employee_type !== 'doctor' && payload.salary_type === 'commission') {
    createDemoError('Commission salary is only available for doctors.')
  }

  const nextConfig = {
    commission_base: payload.salary_type === 'commission' ? payload.commission_base || 'consultation_fee' : '',
    commission_rate: payload.salary_type === 'commission' ? Number(payload.commission_rate || 0) : null,
    configured_by: 'demo.admin@clinic.local',
    effective_from: payload.effective_from || CURRENT_MONTH,
    fixed_amount: payload.salary_type === 'fixed' ? Number(payload.fixed_amount || 0) : null,
    salary_type: payload.salary_type || 'fixed',
    updated_at: isoNow(),
  }

  demoSalaryPeople = demoSalaryPeople.map((candidate) =>
    String(candidate.id) === String(person.id)
      ? { ...candidate, current_config: nextConfig }
      : candidate,
  )

  const baseAmount = Number(nextConfig.fixed_amount || 0)
  const appointmentsCount = nextConfig.salary_type === 'commission' ? 12 : 0
  const calculatedAmount =
    nextConfig.salary_type === 'commission'
      ? Math.round((appointmentsCount * 6000 * Number(nextConfig.commission_rate || 0)) / 100)
      : baseAmount
  const salaryMonth = nextConfig.effective_from || CURRENT_MONTH
  const historyRecord = {
    id: Date.now(),
    appointments_count: appointmentsCount,
    base_amount: baseAmount,
    calculated_amount: calculatedAmount,
    employee_name: person.name,
    role: person.role,
    salary_month: salaryMonth,
    salary_type: nextConfig.salary_type,
    status: 'pending',
    total_earned: calculatedAmount,
    user_id: person.id,
  }
  const disbursementRecord = {
    id: Date.now() + 1,
    base_amount: calculatedAmount,
    bonus: 0,
    disbursed_on: '',
    employee_name: person.name,
    role: person.role,
    salary_month: salaryMonth,
    salary_type: nextConfig.salary_type,
    status: 'pending',
    total: calculatedAmount,
    user_id: person.id,
  }

  demoHistory = [
    historyRecord,
    ...demoHistory.filter((record) =>
      String(record.user_id) !== String(person.id) || record.salary_month !== salaryMonth
    ),
  ]

  demoDisbursements = [
    disbursementRecord,
    ...demoDisbursements.filter((record) =>
      String(record.user_id) !== String(person.id) || record.salary_month !== salaryMonth
    ),
  ]

  return clone({ ...person, current_config: nextConfig })
}

export async function getSalaryOverview() {
  if (PUBLIC_ROUTES_FOR_TESTING) return getDemoSalaryOverview()

  try {
    const { data } = await api.get('/salary/overview/')
    return data
  } catch (error) {
    throwSalaryError(error)
  }
}

export async function getSalaryStats() {
  if (PUBLIC_ROUTES_FOR_TESTING) return getDemoSalaryStats()

  try {
    const { data } = await api.get('/salary/stats/')
    return data
  } catch (error) {
    throwSalaryError(error)
  }
}

export async function getDoctorSalaries() {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    return clone(demoSalaryPeople.filter((person) => person.employee_type === 'doctor'))
  }

  try {
    const { data } = await api.get('/salary/doctors/')
    return data
  } catch (error) {
    throwSalaryError(error)
  }
}

export async function getStaffSalaries() {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    return clone(demoSalaryPeople.filter((person) => person.employee_type === 'staff'))
  }

  try {
    const { data } = await api.get('/salary/staff/')
    return data
  } catch (error) {
    throwSalaryError(error)
  }
}

export async function getSalaryRecord(id) {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    const record = demoHistory.find((candidate) => String(candidate.id) === String(id))
    if (!record) createDemoError('Salary record not found.', 404)
    return clone(record)
  }

  try {
    const { data } = await api.get(`/salary/records/${id}/`)
    return data
  } catch (error) {
    throwSalaryError(error)
  }
}

export async function getOwnSalary() {
  if (PUBLIC_ROUTES_FOR_TESTING) return clone(getDemoOwnSalary())

  try {
    const { data } = await api.get('/salary/me/')
    return data
  } catch (error) {
    throwSalaryError(error)
  }
}

export async function getSalaryConfig(staffId) {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    const person = getPersonById(staffId)
    if (!person) createDemoError('Staff member not found.', 404)
    return clone(person.current_config || null)
  }

  try {
    const { data } = await api.get(`/salary/config/${staffId}/`)
    return data
  } catch (error) {
    throwSalaryError(error)
  }
}

export async function upsertSalaryConfig(payload) {
  if (PUBLIC_ROUTES_FOR_TESTING) return applyConfig(payload)

  try {
    assertSalaryConfigPayload(payload, { employee_type: payload.employee_type || payload.role || 'doctor' })
    const { data } = await api.post('/salary/config/upsert/', payload)
    return data
  } catch (error) {
    throwSalaryError(error)
  }
}

export async function getSalaryHistory(params = {}) {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    const month = normalizeMonth(params)
    const filtered = demoHistory.filter((record) => {
      const matchesUser = !params.user_id || String(record.user_id) === String(params.user_id)
      const matchesMonth = !month || record.salary_month === month
      const matchesDepartment = recordDepartmentMatches(record, params.department)
      const matchesEmployee = recordEmployeeMatches(record, params.employee)
      const matchesStatus = recordStatusMatches(record, params.status)
      return matchesUser && matchesMonth && matchesDepartment && matchesEmployee && matchesStatus
    })
    return paginate(filtered, params)
  }

  try {
    const { data } = await api.get('/salary/history/', { params })
    return data
  } catch (error) {
    throwSalaryError(error)
  }
}

export async function getDisbursements(params = {}) {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    const month = normalizeMonth(params)
    return paginate(
      demoDisbursements.filter((record) =>
        (!month || record.salary_month === month) &&
        recordDepartmentMatches(record, params.department) &&
        recordEmployeeMatches(record, params.employee) &&
        recordStatusMatches(record, params.status)
      ),
      params,
    )
  }

  try {
    const { data } = await api.get('/salary/disbursements/', { params })
    return data
  } catch (error) {
    throwSalaryError(error)
  }
}

export async function markDisbursed(id) {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    let updatedRecord = null

    demoDisbursements = demoDisbursements.map((record) => {
      if (String(record.id) !== String(id)) return record

      updatedRecord = {
        ...record,
        disbursed_on: new Date().toISOString().slice(0, 10),
        status: 'disbursed',
      }
      return updatedRecord
    })

    if (!updatedRecord) createDemoError('Disbursement record not found.', 404)

    demoHistory = demoHistory.map((record) =>
      String(record.user_id) === String(updatedRecord.user_id) &&
      record.salary_month === updatedRecord.salary_month
        ? { ...record, status: 'disbursed' }
        : record,
    )

    return clone(updatedRecord)
  }

  try {
    const { data } = await api.patch(`/salary/disbursements/${id}/mark_disbursed/`)
    return data
  } catch (error) {
    throwSalaryError(error)
  }
}
