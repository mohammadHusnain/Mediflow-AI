import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  mapStaffToForm,
  prepareStaffPayload,
  validateStaffForm,
} from './staffForm.js'

const VALID_STAFF_FORM = {
  age: '30',
  email: '',
  first_name: 'Aisha',
  joining_date: '2026-01-01',
  last_name: 'Khan',
  phone: '+923001234567',
  role: 'Nurse',
  shift_end: '17:00',
  shift_start: '09:00',
  status: 'active',
}

describe('staff form helpers', () => {
  test('allows empty staff email but validates provided format', () => {
    assert.equal(validateStaffForm(VALID_STAFF_FORM).email, undefined)
    assert.equal(
      validateStaffForm({ ...VALID_STAFF_FORM, email: 'not-an-email' }).email,
      'Please enter a valid email address',
    )
  })

  test('sends null for empty staff email', () => {
    const payload = prepareStaffPayload(VALID_STAFF_FORM)

    assert.equal(payload.email, null)
  })

  test('falls back to full name when first and last name fields are missing', () => {
    const form = mapStaffToForm({
      age: 30,
      full_name: 'Dana Teller',
      phone: '+923001234567',
      role: 'Receptionist',
    })

    assert.equal(form.first_name, 'Dana')
    assert.equal(form.last_name, 'Teller')
  })
})

