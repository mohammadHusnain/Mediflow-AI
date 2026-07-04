import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  canAcknowledgeAlert,
  canCreatePlan,
  canEditPlan,
  canMarkCalled,
} from './postTreatmentAccess.js'

const admin = { role: { slug: 'admin' }, user: { id: 1 } }
const doctor = { role: { slug: 'doctor' }, user: { id: 201, doctor_id: 201 } }
const otherDoctor = { role: { slug: 'doctor' }, user: { id: 202, doctor_id: 202 } }
const receptionist = { role: { slug: 'receptionist' }, user: { id: 401 } }

describe('post-treatment access helpers', () => {
  test('only doctors can create plans', () => {
    assert.equal(canCreatePlan(admin), false)
    assert.equal(canCreatePlan(doctor), true)
    assert.equal(canCreatePlan(receptionist), false)
  })

  test('doctors can edit own active plans only', () => {
    const plan = { doctor_id: 201, status: 'active' }

    assert.equal(canEditPlan(doctor, plan), true)
    assert.equal(canEditPlan(otherDoctor, plan), false)
    assert.equal(canEditPlan(doctor, { ...plan, status: 'completed' }), false)
  })

  test('receptionists cannot acknowledge or mark alerts called', () => {
    const alert = { doctor_id: 201 }

    assert.equal(canAcknowledgeAlert(receptionist, alert), false)
    assert.equal(canMarkCalled(receptionist, alert), false)
  })

  test('admin and owning doctor can acknowledge alerts', () => {
    const alert = { doctor_id: 201 }

    assert.equal(canAcknowledgeAlert(admin, alert), true)
    assert.equal(canAcknowledgeAlert(doctor, alert), true)
    assert.equal(canAcknowledgeAlert(otherDoctor, alert), false)
  })
})
