import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  validateBillingInvoicePayload,
  validateDateRange,
  validateSalaryConfigPayload,
} from './financialValidation.js'

describe('financial validation', () => {
  test('accepts valid and empty date ranges', () => {
    assert.equal(validateDateRange('', ''), '')
    assert.equal(validateDateRange('2026-07-01', '2026-07-31'), '')
  })

  test('rejects inverted date ranges', () => {
    assert.equal(validateDateRange('2026-07-31', '2026-07-01'), 'End date must be after start date')
  })

  test('validates required billing invoice fields', () => {
    const errors = validateBillingInvoicePayload({
      amount: -1,
      patient_name: '',
      status: 'archived',
    })

    assert.equal(errors.patient_name, 'Patient name is required')
    assert.equal(errors.amount, 'Amount cannot be negative')
    assert.equal(errors.status, 'Invoice status is invalid')
  })

  test('allows zero amount invoices', () => {
    assert.deepEqual(
      validateBillingInvoicePayload({
        amount: 0,
        patient_name: 'Demo Patient',
        status: 'pending',
      }),
      {},
    )
  })

  test('validates fixed salary limits', () => {
    const errors = validateSalaryConfigPayload(
      {
        effective_from: '2026-07',
        fixed_amount: 999,
        salary_type: 'fixed',
      },
      { role: 'Receptionist' },
    )

    assert.equal(errors.fixed_amount, 'Minimum salary is 1,000')
  })

  test('rejects commission salary for non-doctors', () => {
    const errors = validateSalaryConfigPayload(
      {
        commission_base: 'consultation_fee',
        commission_rate: 25,
        effective_from: '2026-07',
        salary_type: 'commission',
      },
      { role: 'Nurse' },
    )

    assert.equal(errors.salary_type, 'Commission salary is only available for doctors')
  })

  test('accepts valid doctor commission salary', () => {
    assert.deepEqual(
      validateSalaryConfigPayload(
        {
          commission_base: 'consultation_fee',
          commission_rate: 25,
          effective_from: '2026-07',
          salary_type: 'commission',
        },
        { role: 'Doctor' },
      ),
      {},
    )
  })
})
