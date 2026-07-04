import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  cancelPlan,
  createPlan,
  getCriticalAlerts,
  getMessageLog,
  getPlanSteps,
  logPatientReply,
  markPatientCalled,
  resetPostTreatmentDemoData,
  resolveAlert,
  sendManualMessage,
} from './postTreatmentApi.js'

describe('post-treatment demo service flows', () => {
  test('creates a plan and generates schedule steps', async () => {
    resetPostTreatmentDemoData()

    const plan = await createPlan({
      condition: 'Unit Follow-up',
      custom_days: null,
      interval_days: 3,
      patient_id: 106,
      schedule_mode: 'interval',
      start_date: '2026-07-04',
      total_messages: 4,
    })
    const steps = await getPlanSteps(plan.id)

    assert.equal(plan.condition, 'Unit Follow-up')
    assert.deepEqual(steps.map((step) => step.day_offset), [1, 4, 7, 10])
    assert.deepEqual(
      steps.map((step) => step.scheduled_date),
      ['2026-07-04', '2026-07-07', '2026-07-10', '2026-07-13'],
    )
  })

  test('logs manual messages and critical replies', async () => {
    resetPostTreatmentDemoData()

    const plan = await createPlan({
      condition: 'Chest Follow-up',
      custom_days: [1],
      patient_id: 106,
      schedule_mode: 'custom',
      start_date: '2026-07-04',
      total_messages: 1,
    })
    const outbound = await sendManualMessage(plan.id, 'How are symptoms today?')
    const reply = await logPatientReply(outbound.id, 'Severe chest pain and urgent help needed')
    const messages = await getMessageLog(plan.id)
    const alerts = await getCriticalAlerts({ status: 'pending' })

    assert.equal(outbound.direction, 'outbound')
    assert.equal(reply.is_critical_flag, true)
    assert.ok(messages.some((message) => message.id === reply.id))
    assert.ok(alerts.some((alert) => alert.message_log_id === reply.id))
  })

  test('marks called, resolves alerts, and keeps pending alerts sorted first', async () => {
    resetPostTreatmentDemoData()

    const before = await getCriticalAlerts({})

    assert.equal(before[0].status, 'pending')

    const called = await markPatientCalled(before[0].id)
    assert.equal(called.status, 'acknowledged')
    assert.ok(called.called_at)

    const resolved = await resolveAlert(called.id, 'Patient was stable after callback.')
    assert.equal(resolved.status, 'resolved')
    assert.equal(resolved.resolution_notes, 'Patient was stable after callback.')

    const plan = await createPlan({
      condition: 'Urgent Follow-up',
      custom_days: [1],
      patient_id: 106,
      schedule_mode: 'custom',
      start_date: '2026-07-04',
      total_messages: 1,
    })
    const outbound = await sendManualMessage(plan.id, 'Any severe symptoms?')
    await logPatientReply(outbound.id, 'Severe breathing issue')
    const after = await getCriticalAlerts({})

    assert.equal(after[0].status, 'pending')
  })

  test('cancels plans without deleting alerts', async () => {
    resetPostTreatmentDemoData()

    const alerts = await getCriticalAlerts({ status: 'pending' })
    const cancelled = await cancelPlan(alerts[0].plan_id)
    const after = await getCriticalAlerts({ status: 'pending' })

    assert.equal(cancelled.status, 'cancelled')
    assert.ok(after.some((alert) => alert.id === alerts[0].id))
  })
})
