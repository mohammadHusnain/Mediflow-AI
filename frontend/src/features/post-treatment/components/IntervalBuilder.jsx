import { FieldError } from '@shared/components/FormPrimitives'
import {
  computeScheduleDays,
  describeSchedule,
} from '@shared/lib/scheduleBuilder'
import ScheduleTimeline from './ScheduleTimeline'

function numberValue(value, fallback) {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : fallback
}

export function IntervalBuilder({
  errors = {},
  onChange,
  schedule,
  startDate,
}) {
  const intervalDays = numberValue(schedule.interval_days, 1)
  const totalMessages = numberValue(schedule.total_messages, 1)
  const previewConfig = {
    ...schedule,
    interval_days: intervalDays,
    schedule_mode: 'interval',
    total_messages: totalMessages,
  }
  const dayOffsets = computeScheduleDays(previewConfig)

  function update(field, value) {
    onChange?.({
      ...schedule,
      [field]: Number(value),
      custom_days: null,
      schedule_mode: 'interval',
    })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-control border border-hairline bg-mist px-4 py-3 text-[14px] leading-7 text-slate-900">
        Send a message every{' '}
        <input
          className="mx-1 h-9 w-16 rounded-control border border-hairline bg-canvas text-center font-mono text-[13px] font-semibold text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
          min="1"
          max="30"
          onChange={(event) => update('interval_days', event.target.value)}
          type="number"
          value={intervalDays}
        />{' '}
        day(s), for a total of{' '}
        <input
          className="mx-1 h-9 w-16 rounded-control border border-hairline bg-canvas text-center font-mono text-[13px] font-semibold text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
          min="1"
          max="30"
          onChange={(event) => update('total_messages', event.target.value)}
          type="number"
          value={totalMessages}
        />{' '}
        message(s).
        <FieldError>{errors.interval_days || errors.total_messages}</FieldError>
      </div>

      <div className="rounded-control border border-brand/20 bg-brand-light/30 px-4 py-3">
        <p className="text-[13px] font-semibold text-ink">
          {describeSchedule(previewConfig)}
        </p>
        <ScheduleTimeline dayOffsets={dayOffsets} startDate={startDate} />
      </div>
    </div>
  )
}

export default IntervalBuilder
