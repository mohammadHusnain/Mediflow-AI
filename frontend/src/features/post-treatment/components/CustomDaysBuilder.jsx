import { useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'

import { FieldError } from '@shared/components/FormPrimitives'
import {
  computeScheduleDays,
  describeSchedule,
} from '@shared/lib/scheduleBuilder'
import ScheduleTimeline from './ScheduleTimeline'

const DAY_OPTIONS = Array.from({ length: 30 }, (_, index) => index + 1)

function sortedUniqueDays(days = []) {
  return [...new Set(days.map(Number).filter((day) => Number.isFinite(day)))]
    .sort((a, b) => a - b)
}

export function CustomDaysBuilder({
  errors = {},
  onChange,
  schedule,
  startDate,
}) {
  const [customDay, setCustomDay] = useState('')
  const [localError, setLocalError] = useState('')
  const selectedDays = useMemo(
    () => sortedUniqueDays(schedule.custom_days || []),
    [schedule.custom_days],
  )
  const previewConfig = {
    ...schedule,
    custom_days: selectedDays,
    schedule_mode: 'custom',
    total_messages: selectedDays.length,
  }
  const dayOffsets = computeScheduleDays(previewConfig)

  function commitDays(days) {
    const nextDays = sortedUniqueDays(days)
    onChange?.({
      ...schedule,
      custom_days: nextDays,
      interval_days: null,
      schedule_mode: 'custom',
      total_messages: nextDays.length,
    })
  }

  function toggleDay(day) {
    setLocalError('')
    commitDays(
      selectedDays.includes(day)
        ? selectedDays.filter((selectedDay) => selectedDay !== day)
        : [...selectedDays, day],
    )
  }

  function addCustomDay() {
    const day = Number(customDay)

    if (!Number.isInteger(day) || day < 1 || day > 90) {
      setLocalError('Days must be between 1 and 90')
      return
    }

    if (selectedDays.includes(day)) {
      setLocalError('Duplicate days not allowed')
      return
    }

    setLocalError('')
    setCustomDay('')
    commitDays([...selectedDays, day])
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-control border border-hairline bg-mist px-4 py-3">
        {selectedDays.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedDays.map((day) => (
              <button
                className="inline-flex h-8 items-center gap-1 rounded-full border border-brand/20 bg-brand-light px-3 font-mono text-[11px] font-semibold text-brand transition hover:bg-brand hover:text-white"
                key={day}
                onClick={() => toggleDay(day)}
                type="button"
              >
                Day {day}
                <X aria-hidden="true" className="h-3 w-3" />
              </button>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
          {DAY_OPTIONS.map((day) => {
            const selected = selectedDays.includes(day)

            return (
              <button
                className={[
                  'flex h-9 w-9 items-center justify-center rounded-lg border font-mono text-[12px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
                  selected
                    ? 'border-brand bg-brand font-semibold text-white'
                    : 'border-hairline bg-mist text-slate hover:border-brand/40 hover:bg-canvas',
                ].join(' ')}
                key={day}
                onClick={() => toggleDay(day)}
                type="button"
              >
                {day}
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            className="h-9 w-28 rounded-control border border-hairline bg-canvas px-3 font-mono text-[12px] text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            max="90"
            min="1"
            onChange={(event) => setCustomDay(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                addCustomDay()
              }
            }}
            placeholder="Add day..."
            type="number"
            value={customDay}
          />
          <button
            className="inline-flex h-9 items-center gap-1.5 rounded-control bg-brand px-3 text-[12px] font-semibold text-white transition hover:bg-brandDark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
            onClick={addCustomDay}
            type="button"
          >
            <Plus aria-hidden="true" className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
        <FieldError>{localError || errors.custom_days}</FieldError>
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

export default CustomDaysBuilder
