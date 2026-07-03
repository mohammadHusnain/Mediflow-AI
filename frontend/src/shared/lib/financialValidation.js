export const BILLING_STATUSES = ['paid', 'pending', 'overdue', 'cancelled', 'partial']
export const SALARY_TYPES = ['fixed', 'commission']

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === ''
}

function numericValue(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function isValidDateLike(value) {
  if (isBlank(value)) return true

  const date = new Date(value)
  return !Number.isNaN(date.getTime())
}

export function validateDateRange(dateFrom, dateTo) {
  if (!isBlank(dateFrom) && !isValidDateLike(dateFrom)) {
    return 'Start date is invalid'
  }

  if (!isBlank(dateTo) && !isValidDateLike(dateTo)) {
    return 'End date is invalid'
  }

  if (!isBlank(dateFrom) && !isBlank(dateTo) && String(dateTo) < String(dateFrom)) {
    return 'End date must be after start date'
  }

  return ''
}

export function assertDateRange(dateFrom, dateTo) {
  const error = validateDateRange(dateFrom, dateTo)

  if (error) {
    throw new Error(error)
  }
}

export function validateBillingInvoicePayload(payload = {}, { partial = false } = {}) {
  const errors = {}
  const amount = numericValue(payload.amount ?? payload.total_amount ?? payload.total)
  const patientName = payload.patient_name || payload.patient?.full_name || payload.patient?.name
  const appointmentDate = payload.appointment_date || payload.appointment?.appointment_dt || payload.invoice_date
  const status = payload.status ? String(payload.status).toLowerCase() : ''

  if (!partial && isBlank(patientName)) {
    errors.patient_name = 'Patient name is required'
  }

  if (!partial || amount !== null || payload.amount !== undefined || payload.total_amount !== undefined) {
    if (amount === null) {
      errors.amount = 'Amount is required'
    } else if (amount < 0) {
      errors.amount = 'Amount cannot be negative'
    }
  }

  if (status && !BILLING_STATUSES.includes(status)) {
    errors.status = 'Invoice status is invalid'
  }

  if (!isValidDateLike(appointmentDate)) {
    errors.appointment_date = 'Appointment date is invalid'
  }

  return errors
}

export function assertBillingInvoicePayload(payload = {}, options = {}) {
  const errors = validateBillingInvoicePayload(payload, options)

  if (Object.keys(errors).length > 0) {
    const error = new Error(Object.values(errors)[0])
    error.validationErrors = errors
    throw error
  }
}

export function validateSalaryConfigPayload(payload = {}, staffMember = {}) {
  const errors = {}
  const salaryType = String(payload.salary_type || '').toLowerCase()
  const isDoctor = String(staffMember.employee_type || staffMember.role || '').toLowerCase().includes('doctor')

  if (!SALARY_TYPES.includes(salaryType)) {
    errors.salary_type = 'Please select a salary type'
  }

  if (salaryType === 'commission' && !isDoctor) {
    errors.salary_type = 'Commission salary is only available for doctors'
  }

  if (salaryType === 'fixed') {
    const amount = numericValue(payload.fixed_amount)

    if (amount === null) {
      errors.fixed_amount = 'Monthly fixed amount is required'
    } else if (amount < 1000) {
      errors.fixed_amount = 'Minimum salary is PKR 1,000'
    } else if (amount > 10000000) {
      errors.fixed_amount = 'Please verify this amount'
    }
  }

  if (salaryType === 'commission') {
    const rate = numericValue(payload.commission_rate)

    if (rate === null) {
      errors.commission_rate = 'Commission rate is required'
    } else if (rate < 0.1) {
      errors.commission_rate = 'Commission rate must be at least 0.1%'
    } else if (rate > 100) {
      errors.commission_rate = 'Commission rate cannot exceed 100%'
    }

    if (isBlank(payload.commission_base)) {
      errors.commission_base = 'Commission base is required'
    }
  }

  if (isBlank(payload.effective_from)) {
    errors.effective_from = 'Effective month is required'
  } else if (!/^\d{4}-\d{2}$/.test(String(payload.effective_from))) {
    errors.effective_from = 'Effective month must be in YYYY-MM format'
  }

  return errors
}

export function assertSalaryConfigPayload(payload = {}, staffMember = {}) {
  const errors = validateSalaryConfigPayload(payload, staffMember)

  if (Object.keys(errors).length > 0) {
    const error = new Error(Object.values(errors)[0])
    error.validationErrors = errors
    throw error
  }
}
