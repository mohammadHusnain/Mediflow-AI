import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  computeScheduleDates,
  computeScheduleDays,
  describeSchedule,
  validateSchedule,
} from './scheduleBuilder.js'

describe('post-treatment schedule builder', () => {
  test('computes interval day offsets', () => {
    assert.deepEqual(
      computeScheduleDays({
        interval_days: 3,
        schedule_mode: 'interval',
        total_messages: 4,
      }),
      [1, 4, 7, 10],
    )
  })

  test('sorts custom day offsets', () => {
    assert.deepEqual(
      computeScheduleDays({
        custom_days: [7, 1, 3],
        schedule_mode: 'custom',
      }),
      [1, 3, 7],
    )
  })

  test('computes day 1 as the start date itself', () => {
    assert.deepEqual(
      computeScheduleDates('2026-07-04', [1, 4, 7]),
      ['2026-07-04', '2026-07-07', '2026-07-10'],
    )
  })

  test('describes interval and custom schedules', () => {
    assert.equal(
      describeSchedule({
        interval_days: 3,
        schedule_mode: 'interval',
        total_messages: 4,
      }),
      '4 messages over 10 days: Day 1, Day 4, Day 7, Day 10',
    )
    assert.equal(
      describeSchedule({
        custom_days: [2, 1],
        schedule_mode: 'custom',
      }),
      '2 messages over 2 days: Day 1, Day 2',
    )
  })

  test('validates invalid interval schedules', () => {
    const errors = validateSchedule({
      interval_days: 0,
      schedule_mode: 'interval',
      total_messages: 31,
    })

    assert.equal(errors.interval_days, 'Must be at least 1 day')
    assert.equal(errors.total_messages, 'Maximum 30 messages per plan')
  })

  test('validates duplicate and empty custom schedules', () => {
    assert.equal(
      validateSchedule({
        custom_days: [1, 1, 5],
        schedule_mode: 'custom',
      }).custom_days,
      'Duplicate days not allowed',
    )
    assert.equal(
      validateSchedule({
        custom_days: [],
        schedule_mode: 'custom',
      }).custom_days,
      'Select at least 1 day',
    )
  })
})
