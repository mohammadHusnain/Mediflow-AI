import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, Calendar, Save } from 'lucide-react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'

import {
  FieldError,
  LoadingSpinner,
  getFieldClass,
} from '@shared/components/FormPrimitives'
import { useToast } from '@shared/components/Toast'
import { useAuth } from '@shared/context/AuthContext'
import { formatDate, getBackendError } from '@shared/lib/records'
import { canEditPlan } from '@shared/lib/postTreatmentAccess'
import {
  computeScheduleDates,
  computeScheduleDays,
  describeSchedule,
  validateSchedule,
} from '@shared/lib/scheduleBuilder'
import {
  getPlanById,
  getPlanSteps,
  updatePlan,
} from '@shared/services/postTreatmentApi'
import CustomDaysBuilder from '../components/CustomDaysBuilder'
import IntervalBuilder from '../components/IntervalBuilder'
import PlanStatusBadge from '../components/PlanStatusBadge'
import ScheduleModeToggle from '../components/ScheduleModeToggle'

function formatDateList(dates = []) {
  return dates
    .map((date) =>
      new Intl.DateTimeFormat('en-US', {
        day: 'numeric',
        month: 'short',
      }).format(new Date(`${date}T00:00:00.000Z`)),
    )
    .join(', ')
}

export function EditPlan() {
  const { id } = useParams()
  const { role, user } = useAuth()
  const subject = useMemo(() => ({ role, user }), [role, user])
  const navigate = useNavigate()
  const outletContext = useOutletContext()
  const toast = useToast()
  const [plan, setPlan] = useState(null)
  const [steps, setSteps] = useState([])
  const [notes, setNotes] = useState('')
  const [schedule, setSchedule] = useState(null)
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState('')

  const loadPlan = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')

    try {
      const [planResponse, stepResponse] = await Promise.all([
        getPlanById(id),
        getPlanSteps(id),
      ])

      if (!canEditPlan(subject, planResponse)) {
        navigate('/not-available?reason=role', { replace: true })
        return
      }

      setPlan(planResponse)
      setSteps(Array.isArray(stepResponse) ? stepResponse : [])
      setNotes(planResponse.notes || '')
      setSchedule({
        custom_days: planResponse.custom_days ? [...planResponse.custom_days] : null,
        interval_days: planResponse.interval_days,
        schedule_mode: planResponse.schedule_mode,
        total_messages: planResponse.total_messages,
      })
      outletContext?.setPageMeta?.({
        title: `Edit ${planResponse.condition}`,
        subtitle: 'Changes only apply to upcoming messages',
      })
    } catch (error) {
      setLoadError(getBackendError(error, 'Post-treatment plan could not be loaded.'))
    } finally {
      setIsLoading(false)
    }
  }, [id, navigate, outletContext, subject])

  useEffect(() => {
    queueMicrotask(() => {
      loadPlan()
    })

    return () => outletContext?.clearPageMeta?.()
  }, [loadPlan, outletContext])

  const dayOffsets = schedule ? computeScheduleDays(schedule) : []
  const previewDates = plan ? computeScheduleDates(plan.start_date, dayOffsets) : []
  const sentCount = steps.filter((step) => ['sent', 'replied'].includes(step.status)).length

  async function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = validateSchedule(schedule)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setIsSaving(true)

    try {
      await updatePlan(id, {
        ...schedule,
        notes: notes.trim() || null,
      })
      toast.success('Post-treatment plan updated')
      navigate(`/post-treatment/plans/${id}`)
    } catch (error) {
      toast.error(getBackendError(error, 'Post-treatment plan could not be updated.'))
    } finally {
      setIsSaving(false)
    }
  }

  if (loadError) {
    return (
      <section className="mx-auto max-w-2xl rounded-card bg-canvas p-8 text-center shadow-card">
        <AlertTriangle aria-hidden="true" className="mx-auto mb-3 h-8 w-8 text-rose-500" />
        <h2 className="text-[18px] font-bold text-ink">Unable to edit plan</h2>
        <p className="mt-2 text-[14px] text-slate">{loadError}</p>
        <Link
          className="mt-5 inline-flex rounded-control bg-mist px-4 py-2 text-[13px] font-semibold text-slate transition hover:bg-hairline hover:text-ink"
          to={`/post-treatment/plans/${id}`}
        >
          Back to plan
        </Link>
      </section>
    )
  }

  if (isLoading || !plan || !schedule) {
    return (
      <section className="mx-auto max-w-2xl rounded-card bg-canvas p-8 shadow-card">
        <div className="h-6 w-48 animate-pulse rounded bg-hairline" />
        <div className="mt-6 h-80 animate-pulse rounded-card bg-mist" />
      </section>
    )
  }

  return (
    <form className="mx-auto max-w-2xl rounded-card bg-canvas p-8 shadow-card" onSubmit={handleSubmit}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[22px] font-bold text-ink">Edit Plan</h1>
            <PlanStatusBadge status={plan.status} />
          </div>
          <p className="mt-1 text-[13px] font-medium text-slate">
            {plan.condition} for {plan.patient_name}
          </p>
        </div>
        <button
          className="inline-flex h-10 items-center rounded-control bg-mist px-3 text-[13px] font-semibold text-slate transition hover:bg-hairline hover:text-ink"
          onClick={() => navigate(`/post-treatment/plans/${id}`)}
          type="button"
        >
          <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />
          Back
        </button>
      </div>

      <div className="mb-6 rounded-control border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-medium leading-5 text-amber-800">
        <AlertTriangle aria-hidden="true" className="mr-2 inline h-4 w-4" />
        Changes only apply to upcoming messages. {sentCount} sent message{sentCount === 1 ? '' : 's'} will remain unchanged.
      </div>

      <section className="grid gap-4 rounded-card border border-hairline bg-mist p-4 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate">
            Patient
          </p>
          <p className="mt-1 text-[14px] font-semibold text-ink">{plan.patient_name}</p>
          <p className="font-mono text-[12px] text-slate">{plan.patient_phone}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate">
            Start Date
          </p>
          <p className="mt-1 text-[14px] font-semibold text-ink">
            {formatDate(plan.start_date)}
          </p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate">
            Condition
          </p>
          <p className="mt-1 text-[14px] font-semibold text-ink">{plan.condition}</p>
        </div>
      </section>

      <section className="mt-6">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink">
            Doctor Notes
            <span className="ml-2 text-[12px] font-normal text-slate">optional</span>
          </span>
          <textarea
            className={getFieldClass(false, 'min-h-[76px] resize-none')}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            value={notes}
          />
        </label>
      </section>

      <section className="mt-7 space-y-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-slate">
          Message Schedule
        </h2>
        <ScheduleModeToggle
          onChange={(mode) => {
            setSchedule(
              mode === 'interval'
                ? { custom_days: null, interval_days: 1, schedule_mode: 'interval', total_messages: 3 }
                : { custom_days: [1, 2], interval_days: null, schedule_mode: 'custom', total_messages: 2 },
            )
            setErrors({})
          }}
          value={schedule.schedule_mode}
        />
        {schedule.schedule_mode === 'interval' ? (
          <IntervalBuilder
            errors={errors}
            onChange={setSchedule}
            schedule={schedule}
            startDate={plan.start_date}
          />
        ) : (
          <CustomDaysBuilder
            errors={errors}
            onChange={setSchedule}
            schedule={schedule}
            startDate={plan.start_date}
          />
        )}
        <FieldError>{errors.schedule_mode}</FieldError>
      </section>

      <section className="mt-5 rounded-xl border border-brand/20 bg-brand-light/30 p-4">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-slate-900">
          <Calendar aria-hidden="true" className="h-4 w-4 text-brand" />
          {describeSchedule(schedule)}
        </p>
        <p className="mt-1 font-mono text-[12px] text-slate">
          {previewDates.length > 0 ? formatDateList(previewDates) : 'No dates selected'}
        </p>
      </section>

      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          className="inline-flex h-10 items-center justify-center rounded-control bg-mist px-4 text-[13px] font-semibold text-slate transition hover:bg-hairline hover:text-ink"
          onClick={() => navigate(`/post-treatment/plans/${id}`)}
          type="button"
        >
          Cancel
        </button>
        <button
          className="primary-button inline-flex h-10 min-w-[130px] items-center justify-center rounded-control bg-brand px-4 text-[13px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? (
            <LoadingSpinner light />
          ) : (
            <>
              <Save aria-hidden="true" className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </form>
  )
}

export default EditPlan
