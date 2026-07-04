import { computeScheduleDates } from '@shared/lib/scheduleBuilder'

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function statusClass(status, preview) {
  if (preview) {
    return 'border-2 border-brand bg-brand-light'
  }

  if (status === 'sent' || status === 'replied') {
    return 'bg-green-500'
  }

  if (status === 'missed') {
    return 'bg-rose-500'
  }

  return 'border-2 border-canvas bg-slate-300'
}

export function ScheduleTimeline({
  dayOffsets = [],
  scheduledDates,
  startDate,
  stepStatuses,
}) {
  const days = [...dayOffsets].map(Number).filter((day) => Number.isFinite(day))
  const maxDay = Math.max(...days, 1)
  const minDay = Math.min(...days, 1)
  const span = Math.max(maxDay - minDay, 1)
  const preview = !Array.isArray(stepStatuses)
  const dateKeys = scheduledDates || (startDate ? computeScheduleDates(startDate, days) : [])
  const today = todayKey()

  if (days.length === 0) {
    return (
      <div className="rounded-control border border-dashed border-hairline bg-mist px-4 py-5 text-center text-[13px] font-medium text-slate">
        No schedule selected
      </div>
    )
  }

  return (
    <div className="relative min-h-[92px] w-full px-2 py-6">
      <div className="absolute left-4 right-4 top-1/2 h-0.5 -translate-y-1/2 bg-hairline" />
      {days.map((day, index) => {
        const left = days.length === 1 ? 50 : ((day - minDay) / span) * 100
        const status = stepStatuses?.[index] || 'pending'
        const isToday = dateKeys[index] === today

        return (
          <div
            className="absolute top-1/2 flex w-[70px] -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            key={`${day}-${index}`}
            style={{ left: `calc(${left}% + ${left === 0 ? 16 : left === 100 ? -16 : 0}px)` }}
          >
            <span
              className={[
                'relative z-10 h-3 w-3 rounded-full shadow-sm',
                statusClass(status, preview),
                isToday ? 'ring-4 ring-brand/20 animate-pulse-brand' : '',
              ].join(' ')}
            />
            <span className="mt-3 font-mono text-[10px] font-semibold text-slate">
              Day {day}
            </span>
            {!preview ? (
              <span className="mt-0.5 truncate font-mono text-[9px] capitalize text-slate/60">
                {status}
              </span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export default ScheduleTimeline
