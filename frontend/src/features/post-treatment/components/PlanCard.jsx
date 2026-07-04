import { Calendar, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

import { formatDate } from '@shared/lib/records'
import { describeSchedule } from '@shared/lib/scheduleBuilder'
import PlanStatusBadge from './PlanStatusBadge'

export function PlanCard({ plan }) {
  if (!plan) {
    return null
  }

  return (
    <article className="rounded-card border border-hairline bg-canvas p-4 shadow-sm transition hover:border-brand/30 hover:shadow-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <MessageCircle aria-hidden="true" className="h-4 w-4 text-brand" />
            <h3 className="truncate text-[14px] font-semibold text-ink">
              {plan.condition}
            </h3>
            <PlanStatusBadge status={plan.status} />
          </div>
          <p className="mt-2 text-[12px] font-medium leading-5 text-slate">
            {describeSchedule(plan)}
          </p>
          <p className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] text-slate/70">
            <Calendar aria-hidden="true" className="h-3.5 w-3.5" />
            Started {formatDate(plan.start_date)}
          </p>
        </div>
        <Link
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-control bg-brand-light px-3 text-[12px] font-semibold text-brand transition hover:bg-brand hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
          to={`/post-treatment/plans/${plan.id}`}
        >
          View Plan
        </Link>
      </div>
    </article>
  )
}

export default PlanCard
