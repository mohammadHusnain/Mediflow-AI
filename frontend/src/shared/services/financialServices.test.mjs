import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  createInvoice,
  deleteInvoice,
  getInvoice,
  getInvoiceHistory,
  getInvoices,
  getPayments,
  markInvoicePaid,
  updateInvoice,
} from './billingApi.js'
import {
  getDisbursements,
  getDoctorSalaries,
  getSalaryHistory,
  getStaffSalaries,
  markDisbursed,
  upsertSalaryConfig,
} from './salaryApi.js'
import {
  buildReportParams,
  downloadReportPDF,
  getExpenseBreakdown,
  getFinancialSummary,
  getRevenueTrend,
  getSalaryVsRevenue,
  getTopMetrics,
} from './reportsApi.js'
import { exportReportPdf } from '../lib/exportPdf.js'

describe('billing demo service CRUD', () => {
  test('creates, reads, updates, marks paid, syncs payment, and deletes an invoice', async () => {
    const created = await createInvoice({
      amount: 1200,
      appointment_date: '2026-07-03T09:30:00.000Z',
      doctor_name: 'Test Doctor',
      patient_name: 'Unit Billing Patient',
      patient_phone: '+92 300 0000000',
      status: 'pending',
    })

    assert.ok(created.id)
    assert.equal(created.patient_name, 'Unit Billing Patient')
    assert.equal(created.amount, 1200)

    const fetched = await getInvoice(created.id)
    assert.equal(fetched.invoice_number, created.invoice_number)

    const updated = await updateInvoice(created.id, {
      amount: 1500,
      status: 'partial',
    })

    assert.equal(updated.amount, 1500)
    assert.equal(updated.status, 'partial')

    const partialPayments = await getPayments({ search: created.invoice_number })
    assert.equal(partialPayments.results.length, 1)
    assert.equal(partialPayments.results[0].status, 'partial')

    const paid = await markInvoicePaid(created.id)
    assert.equal(paid.status, 'paid')
    assert.ok(paid.paid_at)

    const payments = await getPayments({ search: created.invoice_number })
    assert.equal(payments.results.length, 1)
    assert.equal(payments.results[0].status, 'paid')
    assert.equal(payments.results[0].amount, 1500)

    const history = await getInvoiceHistory({})
    assert.ok(history.results.some((event) => event.invoice_number === created.invoice_number))

    const deleted = await deleteInvoice(created.id)
    assert.deepEqual(deleted, { deleted: true, id: created.id })

    await assert.rejects(() => getInvoice(created.id), /Invoice not found/)
  })

  test('rejects invalid invoice input and invalid date ranges', async () => {
    await assert.rejects(
      () => createInvoice({ amount: -10, patient_name: 'Invalid Patient' }),
      /Amount cannot be negative/,
    )

    await assert.rejects(
      () => getInvoices({ date_from: '2026-07-31', date_to: '2026-07-01' }),
      /End date must be after start date/,
    )
  })
})

describe('salary demo service flows', () => {
  test('updates fixed staff salary and exposes the generated history record', async () => {
    const staffBefore = await getStaffSalaries()
    const target = staffBefore.find((person) => person.id === 403)

    assert.ok(target)
    assert.equal(target.current_config, null)

    const saved = await upsertSalaryConfig({
      effective_from: '2026-07',
      fixed_amount: 95000,
      salary_type: 'fixed',
      user_id: target.id,
    })

    assert.equal(saved.current_config.salary_type, 'fixed')
    assert.equal(saved.current_config.fixed_amount, 95000)

    const history = await getSalaryHistory({ month: '2026-07', user_id: target.id })
    assert.ok(history.results.some((record) => record.user_id === target.id))
  })

  test('updates doctor commission salary and rejects staff commission', async () => {
    const doctors = await getDoctorSalaries()
    const doctor = doctors.find((person) => person.id === 203)

    assert.ok(doctor)

    const saved = await upsertSalaryConfig({
      commission_base: 'consultation_fee',
      commission_rate: 35,
      effective_from: '2026-07',
      salary_type: 'commission',
      user_id: doctor.id,
    })

    assert.equal(saved.current_config.salary_type, 'commission')
    assert.equal(saved.current_config.commission_rate, 35)

    await assert.rejects(
      () =>
        upsertSalaryConfig({
          commission_base: 'consultation_fee',
          commission_rate: 20,
          effective_from: '2026-07',
          salary_type: 'commission',
          user_id: 401,
        }),
      /Commission salary is only available for doctors/,
    )
  })

  test('marks salary disbursements as disbursed', async () => {
    const before = await getDisbursements({ month: '2026-07' })
    const pending = before.results.find((record) => record.status === 'pending')

    assert.ok(pending)

    const updated = await markDisbursed(pending.id)
    assert.equal(updated.status, 'disbursed')
    assert.ok(updated.disbursed_on)

    const after = await getDisbursements({ month: '2026-07' })
    const persisted = after.results.find((record) => record.id === pending.id)
    assert.equal(persisted.status, 'disbursed')
  })
})

describe('reports demo service and export helpers', () => {
  test('normalizes report params and only sends custom dates for custom ranges', () => {
    assert.deepEqual(
      buildReportParams({
        dateFrom: '2026-07-01',
        dateTo: '2026-07-31',
        period: 'monthly',
      }),
      { period: 'monthly' },
    )

    assert.deepEqual(
      buildReportParams({
        dateFrom: '2026-07-01',
        dateTo: '2026-07-31',
        period: 'custom',
      }),
      {
        date_from: '2026-07-01',
        date_to: '2026-07-31',
        period: 'custom',
      },
    )
  })

  test('returns demo report data for the composed financial reports page', async () => {
    const params = { period: 'monthly' }
    const [summary, trend, expenseBreakdown, salaryVsRevenue, topMetrics] = await Promise.all([
      getFinancialSummary(params),
      getRevenueTrend(params),
      getExpenseBreakdown(params),
      getSalaryVsRevenue(params),
      getTopMetrics(params),
    ])

    assert.ok(summary.total_revenue > 0)
    assert.ok(summary.net_profit > 0)
    assert.ok(trend.length >= 2)
    assert.ok(expenseBreakdown.length > 0)
    assert.ok(salaryVsRevenue.every((row) => 'salary_cost' in row))
    assert.equal(topMetrics.top_doctor_name, 'Nora Patel')
  })

  test('supports a one-day custom range and demo PDF blob', async () => {
    const params = {
      dateFrom: '2026-07-04',
      dateTo: '2026-07-04',
      period: 'custom',
    }
    const trend = await getRevenueTrend(params)
    const pdf = await downloadReportPDF(params)

    assert.equal(trend.length, 1)
    assert.equal(pdf.type, 'application/pdf')
  })

  test('surfaces JSON error blobs instead of downloading invalid PDFs', async () => {
    let capturedError = null
    const reportsApi = {
      downloadReportPDF: async () =>
        new Blob([JSON.stringify({ detail: 'PDF generation failed' })], {
          type: 'application/json',
        }),
    }

    await exportReportPdf(reportsApi, { period: 'monthly' }, (error) => {
      capturedError = error
    })

    assert.equal(capturedError?.message, 'PDF generation failed')
  })
})
