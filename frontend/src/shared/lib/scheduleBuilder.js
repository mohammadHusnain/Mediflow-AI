function toPositiveInteger(value) {
  const numberValue = Number(value)

  return Number.isInteger(numberValue) ? numberValue : 0
}

function parseDateKey(value) {
  const [year, month, day] = String(value || '')
    .split('-')
    .map((part) => Number(part))

  if (!year || !month || !day) {
    return null
  }

  return { day, month, year }
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10)
}

export function computeScheduleDays({
  custom_days,
  interval_days,
  schedule_mode,
  total_messages,
}) {
  if (schedule_mode === 'custom') {
    return Array.isArray(custom_days)
      ? [...custom_days].map(Number).sort((a, b) => a - b)
      : []
  }

  const interval = toPositiveInteger(interval_days)
  const total = toPositiveInteger(total_messages)

  if (interval < 1 || total < 1) {
    return []
  }

  return Array.from({ length: total }, (_, index) => 1 + index * interval)
}

export function computeScheduleDates(startDateString, dayOffsets = []) {
  const parts = parseDateKey(startDateString)

  if (!parts) {
    return []
  }

  return dayOffsets.map((offset) => {
    const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
    date.setUTCDate(date.getUTCDate() + Number(offset || 0) - 1)

    return toDateKey(date)
  })
}

export function describeSchedule(config) {
  const days = computeScheduleDays(config)

  if (days.length === 0) {
    return 'No messages scheduled'
  }

  const span = days[days.length - 1] - days[0] + 1
  const dayList = days.map((day) => `Day ${day}`).join(', ')

  return `${days.length} message${days.length !== 1 ? 's' : ''} over ${span} day${span !== 1 ? 's' : ''}: ${dayList}`
}

export function validateSchedule({
  custom_days,
  interval_days,
  schedule_mode,
  total_messages,
}) {
  const errors = {}

  if (schedule_mode === 'interval') {
    const interval = Number(interval_days)
    const total = Number(total_messages)

    if (!Number.isInteger(interval) || interval < 1) {
      errors.interval_days = 'Must be at least 1 day'
    }

    if (!Number.isInteger(total) || total < 1) {
      errors.total_messages = 'Must be at least 1 message'
    } else if (total > 30) {
      errors.total_messages = 'Maximum 30 messages per plan'
    }
  } else if (schedule_mode === 'custom') {
    const days = Array.isArray(custom_days) ? custom_days.map(Number) : []

    if (days.length === 0) {
      errors.custom_days = 'Select at least 1 day'
    } else if (days.some((day) => !Number.isInteger(day) || day < 1 || day > 90)) {
      errors.custom_days = 'Days must be between 1 and 90'
    } else if (new Set(days).size !== days.length) {
      errors.custom_days = 'Duplicate days not allowed'
    }
  } else {
    errors.schedule_mode = 'Choose a schedule mode'
  }

  return errors
}
