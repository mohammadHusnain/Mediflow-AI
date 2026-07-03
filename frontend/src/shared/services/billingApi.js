import { api } from './api'
import { PUBLIC_ROUTES_FOR_TESTING } from '@shared/lib/testingAccess'
import {
  assertBillingInvoicePayload,
  assertDateRange,
} from '@shared/lib/financialValidation'

const DEMO_NOW = new Date()
const DAY_MS = 24 * 60 * 60 * 1000

function isoDate(daysOffset = 0) {
  return new Date(DEMO_NOW.getTime() + daysOffset * DAY_MS).toISOString()
}

let demoInvoices = [
  {
    id: 1001,
    amount: 2500,
    appointment: { appointment_dt: isoDate(-2), id: 501 },
    appointment_date: isoDate(-2),
    appointment_id: 501,
    created_at: isoDate(-2),
    doctor: { full_name: 'Ayesha Rahman', id: 201 },
    doctor_name: 'Ayesha Rahman',
    due_date: isoDate(5),
    invoice_date: isoDate(-2),
    invoice_number: 'INV-2026-001',
    paid_at: isoDate(-1),
    patient: { full_name: 'Sarah Khan', id: 301, phone: '+92 300 1122334' },
    patient_id: 301,
    patient_name: 'Sarah Khan',
    patient_phone: '+92 300 1122334',
    payment_method: 'cash',
    status: 'paid',
    total_amount: 2500,
  },
  {
    id: 1002,
    amount: 3200,
    appointment: { appointment_dt: isoDate(-1), id: 502 },
    appointment_date: isoDate(-1),
    appointment_id: 502,
    created_at: isoDate(-1),
    doctor: { full_name: 'Nora Patel', id: 202 },
    doctor_name: 'Nora Patel',
    due_date: isoDate(6),
    invoice_date: isoDate(-1),
    invoice_number: 'INV-2026-002',
    paid_at: null,
    patient: { full_name: 'Hamza Ali', id: 302, phone: '+92 301 4455667' },
    patient_id: 302,
    patient_name: 'Hamza Ali',
    patient_phone: '+92 301 4455667',
    payment_method: '',
    status: 'pending',
    total_amount: 3200,
  },
  {
    id: 1003,
    amount: 1800,
    appointment: { appointment_dt: isoDate(-4), id: 503 },
    appointment_date: isoDate(-4),
    appointment_id: 503,
    created_at: isoDate(-4),
    doctor: null,
    doctor_name: '',
    due_date: isoDate(-1),
    invoice_date: isoDate(-4),
    invoice_number: 'INV-2026-003',
    paid_at: null,
    patient: { full_name: 'Zainab Malik', id: 303, phone: '+92 302 7788990' },
    patient_id: 303,
    patient_name: 'Zainab Malik',
    patient_phone: '+92 302 7788990',
    payment_method: '',
    status: 'overdue',
    total_amount: 1800,
  },
  {
    id: 1004,
    amount: 5000,
    appointment: { appointment_dt: isoDate(-7), id: 504 },
    appointment_date: isoDate(-7),
    appointment_id: 504,
    created_at: isoDate(-7),
    doctor: { full_name: 'Usman Siddiqui', id: 203 },
    doctor_name: 'Usman Siddiqui',
    due_date: isoDate(0),
    invoice_date: isoDate(-7),
    invoice_number: 'INV-2026-004',
    paid_at: null,
    patient: { full_name: 'Bilal Ahmed', id: 304, phone: '+92 303 5566778' },
    patient_id: 304,
    patient_name: 'Bilal Ahmed',
    patient_phone: '+92 303 5566778',
    payment_method: 'online',
    status: 'partial',
    total_amount: 5000,
  },
  {
    id: 1005,
    amount: 0,
    appointment: { appointment_dt: isoDate(-10), id: 505 },
    appointment_date: isoDate(-10),
    appointment_id: 505,
    created_at: isoDate(-10),
    doctor: { full_name: 'Ayesha Rahman', id: 201 },
    doctor_name: 'Ayesha Rahman',
    due_date: isoDate(-3),
    invoice_date: isoDate(-10),
    invoice_number: 'INV-2026-005',
    paid_at: null,
    patient: { full_name: 'Mariam Raza', id: 305, phone: '+92 304 1234567' },
    patient_id: 305,
    patient_name: 'Mariam Raza',
    patient_phone: '+92 304 1234567',
    payment_method: '',
    status: 'cancelled',
    total_amount: 0,
  },
]

let demoHistory = [
  {
    id: 9001,
    actor_email: 'admin@clinic.local',
    amount: 2500,
    appointment_date: isoDate(-2),
    event_type: 'created',
    invoice_number: 'INV-2026-001',
    patient_name: 'Sarah Khan',
    timestamp: isoDate(-2),
  },
  {
    id: 9002,
    actor_email: 'reception@clinic.local',
    amount: 2500,
    appointment_date: isoDate(-2),
    event_type: 'paid',
    invoice_number: 'INV-2026-001',
    patient_name: 'Sarah Khan',
    timestamp: isoDate(-1),
  },
  {
    id: 9003,
    actor_email: 'admin@clinic.local',
    amount: 3200,
    appointment_date: isoDate(-1),
    event_type: 'created',
    invoice_number: 'INV-2026-002',
    patient_name: 'Hamza Ali',
    timestamp: isoDate(-1),
  },
  {
    id: 9004,
    actor_email: 'admin@clinic.local',
    amount: 5000,
    appointment_date: isoDate(-7),
    event_type: 'updated',
    invoice_number: 'INV-2026-004',
    patient_name: 'Bilal Ahmed',
    timestamp: isoDate(-3),
  },
  {
    id: 9005,
    actor_email: 'reception@clinic.local',
    amount: 0,
    appointment_date: isoDate(-10),
    event_type: 'cancelled',
    invoice_number: 'INV-2026-005',
    patient_name: 'Mariam Raza',
    timestamp: isoDate(-9),
  },
]

let demoPayments = [
  {
    id: 7001,
    amount: 2500,
    date: isoDate(-1),
    invoice_id: 1001,
    invoice_number: 'INV-2026-001',
    method: 'cash',
    patient_name: 'Sarah Khan',
    payment_ref: 'PAY-2026-001',
    status: 'paid',
  },
  {
    id: 7002,
    amount: 2000,
    date: isoDate(-3),
    invoice_id: 1004,
    invoice_number: 'INV-2026-004',
    method: 'online',
    patient_name: 'Bilal Ahmed',
    payment_ref: 'PAY-2026-002',
    status: 'partial',
  },
  {
    id: 7003,
    amount: 1500,
    date: isoDate(-12),
    invoice_id: 1006,
    invoice_number: 'INV-2026-000',
    method: 'card',
    patient_name: 'Demo Refund',
    payment_ref: 'PAY-2026-003',
    status: 'refunded',
  },
]

function createDemoError(detail, status = 404) {
  const error = new Error(detail)
  error.response = { data: { detail, error: detail }, status }
  throw error
}

function normalizeSearch(value) {
  return String(value || '').trim().toLowerCase()
}

function inDateRange(value, dateFrom, dateTo) {
  if (!value) return true

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return true

  const day = date.toISOString().slice(0, 10)

  if (dateFrom && day < dateFrom) return false
  if (dateTo && day > dateTo) return false

  return true
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

function getDemoInvoices(params = {}) {
  assertDateRange(params.date_from, params.date_to)

  const search = normalizeSearch(params.search)
  const status = normalizeSearch(params.status)
  const filtered = demoInvoices
    .filter((invoice) => {
      const matchesSearch = !search ||
        invoice.invoice_number.toLowerCase().includes(search) ||
        invoice.patient_name.toLowerCase().includes(search)
      const matchesStatus = !status || invoice.status === status
      const matchesDate = inDateRange(
        invoice.appointment_date || invoice.invoice_date,
        params.date_from,
        params.date_to,
      )

      return matchesSearch && matchesStatus && matchesDate
    })
    .sort((left, right) => new Date(right.created_at) - new Date(left.created_at))

  return paginate(filtered, params)
}

function getDemoPayments(params = {}) {
  assertDateRange(params.date_from, params.date_to)

  const search = normalizeSearch(params.search)
  const filtered = demoPayments
    .filter((payment) => {
      const matchesSearch = !search ||
        payment.payment_ref.toLowerCase().includes(search) ||
        payment.patient_name.toLowerCase().includes(search) ||
        payment.invoice_number.toLowerCase().includes(search)
      const matchesDate = inDateRange(payment.date, params.date_from, params.date_to)

      return matchesSearch && matchesDate
    })
    .sort((left, right) => new Date(right.date) - new Date(left.date))

  return paginate(filtered, params)
}

function getDemoHistory(params = {}) {
  assertDateRange(params.date_from, params.date_to)

  const filtered = demoHistory
    .filter((event) => inDateRange(event.timestamp, params.date_from, params.date_to))
    .sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp))

  return paginate(filtered, params)
}

function getDemoBillingStats() {
  const monthKey = DEMO_NOW.toISOString().slice(0, 7)

  return {
    paid_count: demoInvoices.filter((invoice) => invoice.status === 'paid').length,
    pending_count: demoInvoices.filter((invoice) => invoice.status === 'pending').length,
    revenue_month: demoPayments
      .filter((payment) => payment.status !== 'refunded' && payment.date.slice(0, 7) === monthKey)
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    total_invoices: demoInvoices.length,
  }
}

function getDemoPaymentSummary() {
  const payments = demoPayments.filter((payment) => payment.status !== 'refunded')
  const monthKey = DEMO_NOW.toISOString().slice(0, 7)
  const totalReceived = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)

  return {
    avg_daily: Math.round(totalReceived / 30),
    this_month: payments
      .filter((payment) => payment.date.slice(0, 7) === monthKey)
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    total_received: totalReceived,
  }
}

function throwBillingError(error) {
  error.service = 'billing'
  throw error
}

function nextInvoiceId() {
  return Math.max(1000, ...demoInvoices.map((invoice) => Number(invoice.id) || 0)) + 1
}

function nextInvoiceNumber(id) {
  return `INV-2026-${String(id).padStart(3, '0')}`
}

function nextPaymentId() {
  return Math.max(7000, ...demoPayments.map((payment) => Number(payment.id) || 0)) + 1
}

function nextPaymentRef(id) {
  return `PAY-2026-${String(id).padStart(3, '0')}`
}

function upsertPaymentForInvoice(invoice, date = new Date().toISOString()) {
  const existing = demoPayments.find((payment) => String(payment.invoice_id) === String(invoice.id))
  const paymentId = existing?.id || nextPaymentId()
  const payment = {
    id: paymentId,
    amount: Number(invoice.amount || invoice.total_amount || 0),
    date,
    invoice_id: invoice.id,
    invoice_number: invoice.invoice_number,
    method: invoice.payment_method || 'cash',
    patient_name: invoice.patient_name,
    payment_ref: existing?.payment_ref || nextPaymentRef(paymentId),
    status: invoice.status === 'partial' ? 'partial' : 'paid',
  }

  demoPayments = existing
    ? demoPayments.map((candidate) => (candidate.id === existing.id ? payment : candidate))
    : [payment, ...demoPayments]

  return payment
}

function createDemoInvoice(data = {}) {
  assertBillingInvoicePayload(data)

  const id = nextInvoiceId()
  const now = new Date().toISOString()
  const amount = Number(data.amount ?? data.total_amount ?? data.total ?? 0)
  const patientName = data.patient_name || data.patient?.full_name || data.patient?.name
  const patientPhone = data.patient_phone || data.patient?.phone || ''
  const doctorName = data.doctor_name || data.doctor?.full_name || data.doctor?.name || ''
  const invoice = {
    id,
    amount,
    appointment: data.appointment || {
      appointment_dt: data.appointment_date || data.invoice_date || now,
      id: data.appointment_id || null,
    },
    appointment_date: data.appointment_date || data.invoice_date || now,
    appointment_id: data.appointment_id || data.appointment?.id || null,
    created_at: data.created_at || now,
    doctor: data.doctor || (doctorName ? { full_name: doctorName, id: data.doctor_id || null } : null),
    doctor_name: doctorName,
    due_date: data.due_date || '',
    invoice_date: data.invoice_date || now,
    invoice_number: data.invoice_number || nextInvoiceNumber(id),
    paid_at: data.status === 'paid' ? data.paid_at || now : data.paid_at || null,
    patient: data.patient || {
      full_name: patientName,
      id: data.patient_id || null,
      phone: patientPhone,
    },
    patient_id: data.patient_id || data.patient?.id || null,
    patient_name: patientName,
    patient_phone: patientPhone,
    payment_method: data.payment_method || '',
    status: data.status || 'pending',
    total_amount: amount,
  }

  demoInvoices = [invoice, ...demoInvoices]
  if (invoice.status === 'paid' || invoice.status === 'partial') {
    upsertPaymentForInvoice(invoice, invoice.paid_at || now)
  }

  demoHistory = [
    {
      id: Date.now(),
      actor_email: 'demo@clinic.local',
      amount: invoice.amount,
      appointment_date: invoice.appointment_date,
      event_type: 'created',
      invoice_number: invoice.invoice_number,
      patient_name: invoice.patient_name,
      timestamp: now,
    },
    ...demoHistory,
  ]

  return invoice
}

function updateDemoInvoice(id, data = {}) {
  assertBillingInvoicePayload(data, { partial: true })

  let updatedInvoice = null
  demoInvoices = demoInvoices.map((invoice) => {
    if (String(invoice.id) !== String(id)) return invoice

    const amount = data.amount ?? data.total_amount ?? data.total
    updatedInvoice = {
      ...invoice,
      ...data,
      amount: amount === undefined ? invoice.amount : Number(amount),
      doctor_name: data.doctor_name || data.doctor?.full_name || data.doctor?.name || invoice.doctor_name,
      patient_name: data.patient_name || data.patient?.full_name || data.patient?.name || invoice.patient_name,
      patient_phone: data.patient_phone || data.patient?.phone || invoice.patient_phone,
      status: data.status || invoice.status,
      total_amount: amount === undefined ? invoice.total_amount : Number(amount),
    }

    if (updatedInvoice.status === 'paid' && !updatedInvoice.paid_at) {
      updatedInvoice.paid_at = new Date().toISOString()
    }

    return updatedInvoice
  })

  if (!updatedInvoice) {
    createDemoError('Invoice not found.')
  }

  if (updatedInvoice.status === 'paid' || updatedInvoice.status === 'partial') {
    upsertPaymentForInvoice(updatedInvoice, updatedInvoice.paid_at || new Date().toISOString())
  }

  demoHistory = [
    {
      id: Date.now(),
      actor_email: 'demo@clinic.local',
      amount: updatedInvoice.amount,
      appointment_date: updatedInvoice.appointment_date,
      event_type: 'updated',
      invoice_number: updatedInvoice.invoice_number,
      patient_name: updatedInvoice.patient_name,
      timestamp: new Date().toISOString(),
    },
    ...demoHistory,
  ]

  return updatedInvoice
}

function deleteDemoInvoice(id) {
  const invoice = demoInvoices.find((candidate) => String(candidate.id) === String(id))

  if (!invoice) {
    createDemoError('Invoice not found.')
  }

  demoInvoices = demoInvoices.filter((candidate) => String(candidate.id) !== String(id))
  demoPayments = demoPayments.filter((payment) => String(payment.invoice_id) !== String(id))
  demoHistory = [
    {
      id: Date.now(),
      actor_email: 'demo@clinic.local',
      amount: invoice.amount,
      appointment_date: invoice.appointment_date,
      event_type: 'cancelled',
      invoice_number: invoice.invoice_number,
      patient_name: invoice.patient_name,
      timestamp: new Date().toISOString(),
    },
    ...demoHistory,
  ]

  return { deleted: true, id: invoice.id }
}

export const getBillingDashboard = () => api.get('/billing/dashboard/')

export async function getInvoices(params) {
  assertDateRange(params?.date_from, params?.date_to)

  if (PUBLIC_ROUTES_FOR_TESTING) {
    return getDemoInvoices(params)
  }

  try {
    const { data } = await api.get('/billing/invoices/', { params })
    return data
  } catch (error) {
    throwBillingError(error)
  }
}

export async function getInvoice(id) {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    const invoice = demoInvoices.find((candidate) => String(candidate.id) === String(id))

    if (!invoice) {
      createDemoError('Invoice not found.')
    }

    return invoice
  }

  try {
    const { data } = await api.get(`/billing/invoices/${id}/`)
    return data
  } catch (error) {
    throwBillingError(error)
  }
}

export async function createInvoice(data) {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    return createDemoInvoice(data)
  }

  try {
    assertBillingInvoicePayload(data)
    const response = await api.post('/billing/invoices/', data)
    return response.data
  } catch (error) {
    throwBillingError(error)
  }
}

export async function updateInvoice(id, data) {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    return updateDemoInvoice(id, data)
  }

  try {
    assertBillingInvoicePayload(data, { partial: true })
    const response = await api.patch(`/billing/invoices/${id}/`, data)
    return response.data
  } catch (error) {
    throwBillingError(error)
  }
}

export async function deleteInvoice(id) {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    return deleteDemoInvoice(id)
  }

  try {
    const response = await api.delete(`/billing/invoices/${id}/`)
    return response.data
  } catch (error) {
    throwBillingError(error)
  }
}

export async function downloadInvoicePDF(id) {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    const invoice = demoInvoices.find((candidate) => String(candidate.id) === String(id))

    if (!invoice) {
      createDemoError('Invoice not found.')
    }

    demoHistory = [
      {
        id: Date.now(),
        actor_email: 'demo@clinic.local',
        amount: invoice.amount,
        appointment_date: invoice.appointment_date,
        event_type: 'downloaded',
        invoice_number: invoice.invoice_number,
        patient_name: invoice.patient_name,
        timestamp: new Date().toISOString(),
      },
      ...demoHistory,
    ]

    return new Blob([`Demo invoice ${invoice.invoice_number}`], {
      type: 'application/pdf',
    })
  }

  try {
    const { data } = await api.get(`/billing/invoices/${id}/download/`, {
      responseType: 'blob',
    })
    return data
  } catch (error) {
    throwBillingError(error)
  }
}

export function downloadBlob(blobOrResponse, filename) {
  const blob = blobOrResponse?.data || blobOrResponse
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function getPayments(params) {
  assertDateRange(params?.date_from, params?.date_to)

  if (PUBLIC_ROUTES_FOR_TESTING) {
    return getDemoPayments(params)
  }

  try {
    const { data } = await api.get('/billing/payments/', { params })
    return data
  } catch (error) {
    throwBillingError(error)
  }
}

export async function getPaymentSummary() {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    return getDemoPaymentSummary()
  }

  try {
    const { data } = await api.get('/billing/payments/summary/')
    return data
  } catch (error) {
    throwBillingError(error)
  }
}

export async function getInvoiceHistory(params) {
  assertDateRange(params?.date_from, params?.date_to)

  if (PUBLIC_ROUTES_FOR_TESTING) {
    return getDemoHistory(params)
  }

  try {
    const { data } = await api.get('/billing/invoices/history/', { params })
    return data
  } catch (error) {
    throwBillingError(error)
  }
}

export async function getBillingStats() {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    return getDemoBillingStats()
  }

  try {
    const { data } = await api.get('/billing/stats/')
    return data
  } catch (error) {
    throwBillingError(error)
  }
}

export async function markInvoicePaid(id) {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    const paidAt = new Date().toISOString()
    let updatedInvoice = null

    demoInvoices = demoInvoices.map((invoice) => {
      if (String(invoice.id) !== String(id)) return invoice

      updatedInvoice = {
        ...invoice,
        paid_at: paidAt,
        payment_method: invoice.payment_method || 'cash',
        status: 'paid',
      }

      return updatedInvoice
    })

    if (!updatedInvoice) {
      createDemoError('Invoice not found.')
    }

    upsertPaymentForInvoice(updatedInvoice, paidAt)

    demoHistory = [
      {
        id: Date.now(),
        actor_email: 'demo@clinic.local',
        amount: updatedInvoice.amount,
        appointment_date: updatedInvoice.appointment_date,
        event_type: 'paid',
        invoice_number: updatedInvoice.invoice_number,
        patient_name: updatedInvoice.patient_name,
        timestamp: paidAt,
      },
      ...demoHistory,
    ]

    return updatedInvoice
  }

  try {
    const { data } = await api.patch(`/billing/invoices/${id}/mark_paid/`)
    return data
  } catch (error) {
    throwBillingError(error)
  }
}

export const getSalaryConfigs = (params) => api.get('/billing/salary/config/', { params })
export const createSalaryConfig = (data) => api.post('/billing/salary/config/', data)
export const updateSalaryConfig = (id, data) => api.patch(`/billing/salary/config/${id}/`, data)

export const getSalaryPreview = (month, year) =>
  api.get('/billing/salary/preview/', { params: { month, year } })
export const processSalary = (data) => api.post('/billing/salary/process/', data)
export const getSalaryRecords = (params) => api.get('/billing/salary/records/', { params })
export const updateSalaryRecord = (id, data) => api.patch(`/billing/salary/records/${id}/`, data)

export const getFinancialReportData = (params) => api.get('/billing/reports/data/', { params })
export const downloadFinancialReportPDF = (params) =>
  api.get('/billing/reports/pdf/', { params, responseType: 'blob' })
