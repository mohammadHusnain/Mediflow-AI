const DEMO_APPOINTMENT_INVOICE_OFFSET = 100000

function recordId(record) {
  return record?.id ?? record?.pk ?? record?.uuid ?? null
}

export function isAppointmentInvoiceEligible(appointment) {
  return String(appointment?.status || '').toLowerCase() === 'completed'
}

export function getGeneratedInvoiceIdForAppointment(appointmentId) {
  const text = String(appointmentId ?? '').trim()
  if (!text) return null

  const numericId = Number(text)
  return Number.isFinite(numericId)
    ? DEMO_APPOINTMENT_INVOICE_OFFSET + numericId
    : `appointment-${text}`
}

export function getAppointmentIdFromGeneratedInvoiceId(invoiceId) {
  const text = String(invoiceId ?? '').trim()
  if (!text) return null

  if (text.startsWith('appointment-')) {
    return text.replace('appointment-', '') || null
  }

  const numericId = Number(text)
  if (!Number.isFinite(numericId) || numericId < DEMO_APPOINTMENT_INVOICE_OFFSET) {
    return null
  }

  return numericId - DEMO_APPOINTMENT_INVOICE_OFFSET
}

export function getInvoiceAppointmentId(invoice) {
  return (
    invoice?.appointment_id ??
    invoice?.appointment?.id ??
    invoice?.appointment_info?.appointment_id ??
    null
  )
}

export function getAppointmentInvoiceId(
  appointment,
  { generateForCompleted = false, preferGeneratedForCompleted = false } = {},
) {
  const appointmentId = recordId(appointment)
  const generatedId =
    generateForCompleted && isAppointmentInvoiceEligible(appointment)
      ? getGeneratedInvoiceIdForAppointment(appointmentId)
      : null

  if (preferGeneratedForCompleted && generatedId) {
    return generatedId
  }

  return (
    appointment?.invoice_id ||
    appointment?.invoice?.id ||
    appointment?.invoice?.invoice_id ||
    appointment?.billing_invoice_id ||
    generatedId ||
    null
  )
}
