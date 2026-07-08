import axios from 'axios'

import {
  createDemoRole,
  deleteDemoRole,
  getDemoRoleById,
  getDemoRoleNames,
  getDemoRoles,
  setDemoRolePermissions,
  updateDemoRole,
} from '@shared/lib/accessControlData'
import {
  createDemoExpenseCategory,
  createDemoExpense,
  deleteDemoExpense,
  getDemoExpenseById,
  getDemoExpenseCategories,
  getDemoExpenses,
  getDemoExpenseSummary,
  getDemoPatientRevenue,
  getDemoSalaryRecords,
  markDemoSalaryPaid,
  updateDemoExpense,
} from '@shared/lib/expensesDemoData'
import {
  bookDemoAppointment,
  createDemoDoctor,
  createDemoPatient,
  createDemoQualification,
  createDemoStaff,
  deleteDemoAppointment,
  deleteDemoDoctor,
  deleteDemoPatient,
  deleteDemoStaff,
  getDemoAppointment,
  getDemoAppointments,
  getDemoDoctorAppointments,
  getDemoDoctorById,
  getDemoDoctors,
  getDemoDoctorStats,
  getDemoPatient,
  getDemoPatients,
  getDemoQualifications,
  getDemoStaff,
  getDemoStaffById,
  updateDemoAppointment,
  updateDemoDoctor,
  updateDemoPatient,
  updateDemoPayment,
  updateDemoStaff,
  updateDemoStatus,
} from '@shared/lib/seedData'
import { PUBLIC_ROUTES_FOR_TESTING } from '@shared/lib/testingAccess'

try {
  localStorage.removeItem('mediflow_demo_data_v7')
} catch {
  // localStorage may be unavailable in some environments
}

export const api = axios.create({
  baseURL: 'http://localhost:8000/api',
})

const authSyncHandlers = {
  getRefreshToken: () =>
    localStorage.getItem('refresh_token') || localStorage.getItem('refresh') || '',
  onSessionExpired: () => {},
  onSessionSync: () => {},
}

export function configureAuthSync(handlers = {}) {
  Object.assign(authSyncHandlers, handlers)
}

function dispatchToast(type, message) {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent('mediflow:toast', {
      detail: { message, type },
    }),
  )
}

function getAccessToken() {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    return ''
  }

  return (
    localStorage.getItem('access_token') ||
    localStorage.getItem('access')
  )
}

function getDetailMessage(error) {
  const detail = error?.response?.data?.detail

  if (typeof detail === 'string') {
    return detail
  }

  return ''
}

function isFeatureRestriction(detail) {
  const message = detail.toLowerCase()

  return (
    message.includes('plan') ||
    message.includes('subscription') ||
    message.includes('feature not enabled') ||
    message.includes('feature is not enabled') ||
    message.includes('feature disabled') ||
    message.includes('feature is disabled') ||
    message.includes('not enabled for your org') ||
    message.includes('not enabled for your organization') ||
    message.includes('enable this feature') ||
    message.includes('ask your admin to enable')
  )
}

function isWriteMethod(method = '') {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())
}

function ensureAuthenticated() {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    return
  }

  if (!getAccessToken()) {
    const err = new Error('Authentication required. Please log in.')
    err.response = { status: 401, data: { detail: 'Authentication required.' } }
    throw err
  }
}

function normalizeParams(params = '') {
  if (typeof params === 'string') {
    return params.trim() ? { search: params.trim() } : {}
  }

  return params || {}
}

export function getList(response) {
  if (Array.isArray(response)) {
    return response
  }

  if (Array.isArray(response?.results)) {
    return response.results
  }

  return []
}

api.interceptors.request.use((config) => {
  const access = getAccessToken()

  if (access) {
    config.headers.Authorization = `Bearer ${access}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const detail = getDetailMessage(error)

    if (
      !PUBLIC_ROUTES_FOR_TESTING &&
      error?.response?.status === 401 &&
      !error.config?._retried &&
      !String(error.config?.url || '').includes('/auth/refresh/')
    ) {
      const refreshTokenValue = authSyncHandlers.getRefreshToken()

      if (refreshTokenValue) {
        try {
          error.config._retried = true
          const data = await refreshToken(refreshTokenValue)
          const accessToken = data?.access_token ?? data?.access

          if (accessToken) {
            localStorage.setItem('access_token', accessToken)
            localStorage.removeItem('access')
            error.config.headers = {
              ...error.config.headers,
              Authorization: `Bearer ${accessToken}`,
            }
          }

          authSyncHandlers.onSessionSync(data)

          return api(error.config)
        } catch (refreshError) {
          authSyncHandlers.onSessionExpired()
          return Promise.reject(refreshError)
        }
      }
    }

    if (!PUBLIC_ROUTES_FOR_TESTING && error?.response?.status === 403) {
      const method = error.config?.method || ''

      error.detail = detail
      error.featureBlocked = isFeatureRestriction(detail)

      if (isWriteMethod(method)) {
        dispatchToast(
          'error',
          detail || 'You do not have permission to perform this action.',
        )
      }
    }

    return Promise.reject(error)
  },
)

export async function login(email, password) {
  const { data } = await api.post('/auth/login/', { email, password })
  return data
}

export async function refreshToken(refreshTokenValue) {
  const { data } = await api.post('/auth/refresh/', {
    refresh_token:
      refreshTokenValue ||
      localStorage.getItem('refresh_token') ||
      localStorage.getItem('refresh'),
  })
  return data
}

export async function changePassword(newPassword, confirmPassword) {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    return { detail: 'Password changed for testing session.' }
  }

  ensureAuthenticated()
  const { data } = await api.post('/auth/change-password/', {
    new_password: newPassword,
    confirm_password: confirmPassword,
  })
  return data
}

// DOCTOR ROLE — automatic server-side scoping (no frontend param needed):
// GET /api/patients/          → returns only patients who have had appointments with this doctor
// GET /api/appointments/      → returns only this doctor's appointments
// GET /api/doctors/:id/stats/ → returns only if :id matches doctor's own user_id
// GET /api/staff/             → 403 Forbidden (doctor has no staff access)
//
// RECEPTIONIST ROLE:
// GET /api/patients/          → all patients (no scoping)
// GET /api/appointments/      → all appointments (no scoping)
// POST /api/doctors/          → allowed (receptionist can add doctors)
// POST /api/patients/         → allowed (receptionist can add patients)
// POST /api/appointments/     → allowed (receptionist can book appointments)
// GET /api/staff/             → 403 Forbidden (staff module is admin-only)
//
// ADMIN:
// Full access with no role-based scoping, including /api/staff/
export async function getPatients(params = '') {
  const normalizedParams = normalizeParams(params)
  if (PUBLIC_ROUTES_FOR_TESTING) return getDemoPatients(normalizedParams)
  ensureAuthenticated()
  const { data } = await api.get('/patients/', { params: normalizedParams })
  return data
}

export async function getPatient(id) {
  if (PUBLIC_ROUTES_FOR_TESTING) return getDemoPatient(id)
  ensureAuthenticated()
  const { data } = await api.get(`/patients/${id}/`)
  return data
}

export async function createPatient(patient) {
  if (PUBLIC_ROUTES_FOR_TESTING) return createDemoPatient(patient)
  ensureAuthenticated()
  const { data } = await api.post('/patients/', patient)
  return data
}

export async function updatePatient(id, patient) {
  if (PUBLIC_ROUTES_FOR_TESTING) return updateDemoPatient(id, patient)
  ensureAuthenticated()
  const { data } = await api.patch(`/patients/${id}/`, patient)
  return data
}

export async function deletePatient(id) {
  if (PUBLIC_ROUTES_FOR_TESTING) return deleteDemoPatient(id)
  ensureAuthenticated()
  const { data } = await api.delete(`/patients/${id}/`)
  return data
}

export async function getDoctors(params = {}) {
  const normalizedParams = normalizeParams(params)
  if (PUBLIC_ROUTES_FOR_TESTING) return getDemoDoctors(normalizedParams)
  ensureAuthenticated()
  const { data } = await api.get('/doctors/', { params: normalizedParams })
  return data
}

export async function getDoctorById(id) {
  if (PUBLIC_ROUTES_FOR_TESTING) return getDemoDoctorById(id)
  ensureAuthenticated()
  const { data } = await api.get(`/doctors/${id}/`)
  return data
}

export async function createDoctor(doctorData) {
  if (PUBLIC_ROUTES_FOR_TESTING) return createDemoDoctor(doctorData)
  ensureAuthenticated()
  const { data } = await api.post('/doctors/', doctorData)
  return data
}

export async function updateDoctor(id, doctorData) {
  if (PUBLIC_ROUTES_FOR_TESTING) return updateDemoDoctor(id, doctorData)
  ensureAuthenticated()
  const { data } = await api.put(`/doctors/${id}/`, doctorData)
  return data
}

export async function deleteDoctor(id) {
  if (PUBLIC_ROUTES_FOR_TESTING) return deleteDemoDoctor(id)
  ensureAuthenticated()
  const { data } = await api.delete(`/doctors/${id}/`)
  return data
}

export async function getQualifications() {
  if (PUBLIC_ROUTES_FOR_TESTING) return getDemoQualifications()
  ensureAuthenticated()
  const { data } = await api.get('/qualifications/')
  return data
}

export async function createQualification(name) {
  if (PUBLIC_ROUTES_FOR_TESTING) return createDemoQualification(name)
  ensureAuthenticated()
  const { data } = await api.post('/qualifications/', { name })
  return data
}

export async function getRoles() {
  if (PUBLIC_ROUTES_FOR_TESTING) return getDemoRoles()
  ensureAuthenticated()
  const { data } = await api.get('/access-control/roles/')
  return data
}

export async function getRoleById(roleId) {
  if (PUBLIC_ROUTES_FOR_TESTING) return getDemoRoleById(roleId)
  ensureAuthenticated()
  const { data } = await api.get(`/access-control/roles/${roleId}/`)
  return data
}

export async function createRole(roleData) {
  if (PUBLIC_ROUTES_FOR_TESTING) return createDemoRole(roleData)
  ensureAuthenticated()
  const { data } = await api.post('/access-control/roles/', roleData)
  return data
}

export async function updateRole(roleId, roleData) {
  if (PUBLIC_ROUTES_FOR_TESTING) return updateDemoRole(roleId, roleData)
  ensureAuthenticated()
  const { data } = await api.put(`/access-control/roles/${roleId}/`, roleData)
  return data
}

export async function deleteRole(roleId) {
  if (PUBLIC_ROUTES_FOR_TESTING) return deleteDemoRole(roleId)
  ensureAuthenticated()
  const { data } = await api.delete(`/access-control/roles/${roleId}/`)
  return data
}

export async function setRolePermissions(roleId, payload) {
  if (PUBLIC_ROUTES_FOR_TESTING) return setDemoRolePermissions(roleId, payload)
  ensureAuthenticated()
  const { data } = await api.post(`/access-control/roles/${roleId}/set-permissions/`, payload)
  return data
}

export async function updateRolePermissions(roleId, permissions) {
  return setRolePermissions(roleId, { permissions })
}

export async function getRoleNames() {
  if (PUBLIC_ROUTES_FOR_TESTING) return getDemoRoleNames()
  ensureAuthenticated()
  const { data } = await api.get('/access-control/role-names/')
  return data
}

export async function getStaff(params = {}) {
  const normalizedParams = normalizeParams(params)
  if (PUBLIC_ROUTES_FOR_TESTING) return getDemoStaff(normalizedParams)
  ensureAuthenticated()
  const { data } = await api.get('/staff/', { params: normalizedParams })
  return data
}

export async function getStaffById(id) {
  if (PUBLIC_ROUTES_FOR_TESTING) return getDemoStaffById(id)
  ensureAuthenticated()
  const { data } = await api.get(`/staff/${id}/`)
  return data
}

export async function createStaff(staffData) {
  if (PUBLIC_ROUTES_FOR_TESTING) return createDemoStaff(staffData)
  ensureAuthenticated()
  const { data } = await api.post('/staff/', staffData)
  return data
}

export async function updateStaff(id, staffData) {
  if (PUBLIC_ROUTES_FOR_TESTING) return updateDemoStaff(id, staffData)
  ensureAuthenticated()
  const { data } = await api.put(`/staff/${id}/`, staffData)
  return data
}

export async function deleteStaff(id) {
  if (PUBLIC_ROUTES_FOR_TESTING) return deleteDemoStaff(id)
  ensureAuthenticated()
  const { data } = await api.delete(`/staff/${id}/`)
  return data
}

export async function getDoctorStats(id) {
  if (PUBLIC_ROUTES_FOR_TESTING) return getDemoDoctorStats(id)
  ensureAuthenticated()
  const { data } = await api.get(`/doctors/${id}/stats/`)
  return data
}

export async function getDoctorAppointments(id, params = {}) {
  const normalizedParams = normalizeParams(params)
  if (PUBLIC_ROUTES_FOR_TESTING) return getDemoDoctorAppointments(id, normalizedParams)
  ensureAuthenticated()
  const { data } = await api.get(`/doctors/${id}/appointments/`, { params: normalizedParams })
  return data
}

export async function getAppointments(params = {}) {
  const normalizedParams = normalizeParams(params)
  if (PUBLIC_ROUTES_FOR_TESTING) return getDemoAppointments(normalizedParams)
  ensureAuthenticated()
  const { data } = await api.get('/appointments/', { params: normalizedParams })
  return data
}

export async function getAppointment(id) {
  if (PUBLIC_ROUTES_FOR_TESTING) return getDemoAppointment(id)
  ensureAuthenticated()
  const { data } = await api.get(`/appointments/${id}/`)
  return data
}

export async function bookAppointment(appointment) {
  if (PUBLIC_ROUTES_FOR_TESTING) return bookDemoAppointment(appointment)
  ensureAuthenticated()
  const { data } = await api.post('/appointments/', appointment)
  return data
}

export async function updateAppointment(id, appointment) {
  if (PUBLIC_ROUTES_FOR_TESTING) return updateDemoAppointment(id, appointment)
  ensureAuthenticated()
  const { data } = await api.patch(`/appointments/${id}/`, appointment)
  return data
}

export async function deleteAppointment(id) {
  if (PUBLIC_ROUTES_FOR_TESTING) return deleteDemoAppointment(id)
  ensureAuthenticated()
  const { data } = await api.delete(`/appointments/${id}/`)
  return data
}

export async function updateStatus(id, status) {
  if (PUBLIC_ROUTES_FOR_TESTING) return updateDemoStatus(id, status)
  ensureAuthenticated()
  const { data } = await api.patch(`/appointments/${id}/update_status/`, { status })
  return data
}

export async function updatePaymentStatus(id, paymentStatus) {
  if (PUBLIC_ROUTES_FOR_TESTING) return updateDemoPayment(id, paymentStatus)
  ensureAuthenticated()
  const { data } = await api.patch(`/appointments/${id}/`, { payment_status: paymentStatus })
  return data
}

export async function getExpenses(params = {}) {
  const normalizedParams = normalizeParams(params)
  if (PUBLIC_ROUTES_FOR_TESTING) return getDemoExpenses(normalizedParams)
  ensureAuthenticated()
  const { data } = await api.get('/expenses/', { params: normalizedParams })
  return data
}

export async function getExpenseById(id) {
  if (PUBLIC_ROUTES_FOR_TESTING) return getDemoExpenseById(id)
  ensureAuthenticated()
  const { data } = await api.get(`/expenses/${id}/`)
  return data
}

export async function createExpense(data) {
  if (PUBLIC_ROUTES_FOR_TESTING) return createDemoExpense(data)
  ensureAuthenticated()
  const response = await api.post('/expenses/', data)
  return response.data
}

export async function updateExpense(id, data) {
  if (PUBLIC_ROUTES_FOR_TESTING) return updateDemoExpense(id, data)
  ensureAuthenticated()
  const response = await api.put(`/expenses/${id}/`, data)
  return response.data
}

export async function deleteExpense(id) {
  if (PUBLIC_ROUTES_FOR_TESTING) return deleteDemoExpense(id)
  ensureAuthenticated()
  const { data } = await api.delete(`/expenses/${id}/`)
  return data
}

export async function getExpenseSummary(period = 'month') {
  if (PUBLIC_ROUTES_FOR_TESTING) return getDemoExpenseSummary(period)
  ensureAuthenticated()
  const { data } = await api.get('/expenses/summary/', { params: { period } })
  return data
}

export async function getExpenseCategories() {
  if (PUBLIC_ROUTES_FOR_TESTING) return getDemoExpenseCategories()
  ensureAuthenticated()
  const { data } = await api.get('/expenses/categories/')
  return data
}

export async function createExpenseCategory(name) {
  if (PUBLIC_ROUTES_FOR_TESTING) return createDemoExpenseCategory(name)
  ensureAuthenticated()
  const { data } = await api.post('/expenses/categories/', { name })
  return data
}

export async function getSalaryRecords(params = {}) {
  const normalizedParams = normalizeParams(params)
  if (PUBLIC_ROUTES_FOR_TESTING) return getDemoSalaryRecords(normalizedParams)
  ensureAuthenticated()
  const { data } = await api.get('/expenses/salaries/', { params: normalizedParams })
  return data
}

export async function markSalaryPaid(id) {
  if (PUBLIC_ROUTES_FOR_TESTING) return markDemoSalaryPaid(id)
  ensureAuthenticated()
  const { data } = await api.patch(`/expenses/salaries/${id}/`, { status: 'paid' })
  return data
}

export async function getPatientRevenue(period = 'month') {
  if (PUBLIC_ROUTES_FOR_TESTING) return getDemoPatientRevenue(period)
  ensureAuthenticated()
  const { data } = await api.get('/expenses/revenue/', { params: { period } })
  return data
}
