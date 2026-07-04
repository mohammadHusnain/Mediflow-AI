import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, ArrowLeft, Calendar, MessageCircle } from 'lucide-react'
import { Link, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'

import Avatar from '@shared/components/Avatar'
import {
  FieldError,
  LoadingSpinner,
  getFieldClass,
} from '@shared/components/FormPrimitives'
import { useToast } from '@shared/components/Toast'
import { useAuth } from '@shared/context/AuthContext'
import {
  formatDateTime,
  getAppointmentPatientId,
  getBackendError,
  getPatientName,
} from '@shared/lib/records'
import { canCreatePlan } from '@shared/lib/postTreatmentAccess'
import {
  computeScheduleDates,
  computeScheduleDays,
  describeSchedule,
  validateSchedule,
} from '@shared/lib/scheduleBuilder'
import { getAppointment, getPatient } from '@shared/services/api'
import {
  createPlan,
  getConditionPresets,
} from '@shared/services/postTreatmentApi'
import ConditionPresetPicker from '../components/ConditionPresetPicker'
import CustomDaysBuilder from '../components/CustomDaysBuilder'
import IntervalBuilder from '../components/IntervalBuilder'
import ScheduleModeToggle from '../components/ScheduleModeToggle'

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function offsetDateKey(offset) {
  const date = new Date()
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() + offset)

  return date.toISOString().slice(0, 10)
}

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

const DEFAULT_SCHEDULE = {
  custom_days: null,
  interval_days: 1,
  schedule_mode: 'interval',
  total_messages: 3,
}

export function CreatePlan() {
  const { role, user } = useAuth()
  const navigate = useNavigate()
  const outletContext = useOutletContext()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const patientParam = searchParams.get('patient')
  const appointmentParam = searchParams.get('appointment')
  const [patient, setPatient] = useState(null)
  const [appointment, setAppointment] = useState(null)
  const [presets, setPresets] = useState([])
  const [selectedPresetId, setSelectedPresetId] = useState(null)
  const [condition, setCondition] = useState('')
  const [notes, setNotes] = useState('')
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE)
  const [startDate, setStartDate] = useState(todayKey())
  const [errors, setErrors] = useState({})
  const [loadError, setLoadError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const subject = useMemo(() => ({ role, user }), [role, user])

  const loadContext = useCallback(async () => {
    if (!canCreatePlan(subject)) {
      navigate('/', { replace: true })
      return
    }

    setIsLoading(true)
    setLoadError('')

    try {
      const appointmentResponse = appointmentParam
        ? await getAppointment(appointmentParam)
        : null
      const patientId =
        patientParam ||
        (appointmentResponse ? getAppointmentPatientId(appointmentResponse) : null)

      if (!patientId) {
        throw new Error('Choose a patient before creating a post-treatment plan.')
      }

      const [patientResponse, presetResponse] = await Promise.all([
        getPatient(patientId),
        getConditionPresets(),
      ])

      setAppointment(appointmentResponse)
      setPatient(patientResponse)
      setPresets(Array.isArray(presetResponse) ? presetResponse : presetResponse?.results || [])
    } catch (error) {
      setLoadError(getBackendError(error, error.message || 'Plan context could not be loaded.'))
    } finally {
      setIsLoading(false)
    }
  }, [appointmentParam, navigate, patientParam, subject])

  useEffect(() => {
    outletContext?.setPageMeta?.({
      title: 'Create Post-Treatment Plan',
      subtitle: 'Configure WhatsApp follow-up messages',
    })

    return () => outletContext?.clearPageMeta?.()
  }, [outletContext])

  useEffect(() => {
    queueMicrotask(() => {
      loadContext()
    })
  }, [loadContext])

  const dayOffsets = computeScheduleDays(schedule)
  const previewDates = computeScheduleDates(startDate, dayOffsets)
  const scheduleSummary = describeSchedule(schedule)

  function handlePresetSelect(preset) {
    setSelectedPresetId(preset.id)
    setCondition(preset.condition_name)
    setSchedule({
      custom_days: preset.custom_days ? [...preset.custom_days] : null,
      interval_days: preset.interval_days,
      schedule_mode: preset.schedule_mode,
      total_messages: preset.total_messages,
    })
    setErrors((current) => ({ ...current, condition: '', custom_days: '', interval_days: '', total_messages: '' }))
  }

  function handleCustomPreset() {
    setSelectedPresetId('custom')
    setCondition('')
    setSchedule(DEFAULT_SCHEDULE)
  }

  function validateForm() {
    const nextErrors = {
      ...validateSchedule(schedule),
    }

    if (!condition.trim()) {
      nextErrors.condition = 'Condition is required'
    }

    if (!startDate) {
      nextErrors.start_date = 'Start date is required'
    } else if (startDate < offsetDateKey(-7)) {
      nextErrors.start_date = 'Start date cannot be more than 7 days in the past'
    }

    if (!patient?.phone) {
      nextErrors.patient_phone = 'Patient has no phone number on file. Update patient profile first.'
    }

    setErrors(nextErrors)
    return nextErrors
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = validateForm()

    if (Object.keys(nextErrors).some((key) => nextErrors[key])) {
      return
    }

    setIsSubmitting(true)

    try {
      const created = await createPlan({
        ...schedule,
        appointment_id: appointmentParam ? Number(appointmentParam) : null,
        condition: condition.trim(),
        notes: notes.trim() || null,
        patient_id: patient.id,
        patient_name: getPatientName(patient),
        patient_phone: patient.phone,
        start_date: startDate,
      })

      toast.success('Post-treatment plan created')
      navigate(`/post-treatment/plans/${created.id}`)
    } catch (error) {
      toast.error(getBackendError(error, 'Post-treatment plan could not be created.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loadError) {
    return (
      <section className="mx-auto max-w-2xl rounded-card bg-canvas p-8 text-center shadow-card">
        <AlertCircle aria-hidden="true" className="mx-auto mb-3 h-8 w-8 text-rose-500" />
        <h2 className="text-[18px] font-bold text-ink">Unable to create plan</h2>
        <p className="mt-2 text-[14px] text-slate">{loadError}</p>
        <button
          className="mt-5 rounded-control bg-mist px-4 py-2 text-[13px] font-semibold text-slate transition hover:bg-hairline hover:text-ink"
          onClick={() => navigate(-1)}
          type="button"
        >
          Go back
        </button>
      </section>
    )
  }

  if (isLoading || !patient) {
    return (
      <section className="mx-auto max-w-2xl rounded-card bg-canvas p-8 shadow-card">
        <div className="h-6 w-56 animate-pulse rounded bg-hairline" />
        <div className="mt-6 h-20 animate-pulse rounded-card bg-mist" />
        <div className="mt-6 h-72 animate-pulse rounded-card bg-mist" />
      </section>
    )
  }

  return (
    <form className="mx-auto max-w-2xl rounded-card bg-canvas p-8 shadow-card" onSubmit={handleSubmit}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-ink">
            Create Post-Treatment Plan
          </h1>
          <p className="mt-1 text-[13px] font-medium text-slate">
            Static WhatsApp follow-up schedule
          </p>
        </div>
        <button
          className="inline-flex h-10 items-center rounded-control bg-mist px-3 text-[13px] font-semibold text-slate transition hover:bg-hairline hover:text-ink"
          onClick={() => navigate(patient?.id ? `/patients/${patient.id}` : -1)}
          type="button"
        >
          <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />
          Cancel
        </button>
      </div>

      <div className="mb-6 flex items-center gap-3 rounded-xl bg-mist p-3">
        <Avatar name={getPatientName(patient)} size="md" />
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-ink">
            {getPatientName(patient)}
          </p>
          <p className="font-mono text-[12px] text-slate">
            {patient.phone || 'No phone on file'}
          </p>
          {appointment ? (
            <p className="mt-0.5 text-[12px] text-slate">
              from visit on {formatDateTime(appointment.appointment_dt)}
            </p>
          ) : null}
        </div>
      </div>

      {errors.patient_phone ? (
        <div className="mb-5 rounded-control border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-medium text-rose-700">
          {errors.patient_phone}{' '}
          <Link className="font-semibold underline" to={`/patients/${patient.id}/edit`}>
            Update patient profile
          </Link>
        </div>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-slate">
          Condition & Context
        </h2>
        <ConditionPresetPicker
          onCustom={handleCustomPreset}
          onSelect={handlePresetSelect}
          presets={presets}
          selectedId={selectedPresetId}
        />

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink">
            Condition
          </span>
          <input
            className={getFieldClass(errors.condition)}
            onChange={(event) => {
              setCondition(event.target.value)
              setErrors((current) => ({ ...current, condition: '' }))
            }}
            placeholder="Cardiac Follow-up"
            value={condition}
          />
          <FieldError>{errors.condition}</FieldError>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink">
            Doctor Notes
            <span className="ml-2 text-[12px] font-normal text-slate">optional</span>
          </span>
          <textarea
            className={getFieldClass(false, 'min-h-[76px] resize-none')}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Why this schedule was chosen"
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
                ? { ...DEFAULT_SCHEDULE, schedule_mode: 'interval' }
                : { custom_days: [1, 2], interval_days: null, schedule_mode: 'custom', total_messages: 2 },
            )
            setErrors((current) => ({ ...current, custom_days: '', interval_days: '', total_messages: '' }))
          }}
          value={schedule.schedule_mode}
        />
        {schedule.schedule_mode === 'interval' ? (
          <IntervalBuilder
            errors={errors}
            onChange={setSchedule}
            schedule={schedule}
            startDate={startDate}
          />
        ) : (
          <CustomDaysBuilder
            errors={errors}
            onChange={setSchedule}
            schedule={schedule}
            startDate={startDate}
          />
        )}
      </section>

      <section className="mt-7 space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink">
            Start Date
          </span>
          <input
            className={getFieldClass(errors.start_date, 'max-w-[220px]')}
            onChange={(event) => {
              setStartDate(event.target.value)
              setErrors((current) => ({ ...current, start_date: '' }))
            }}
            type="date"
            value={startDate}
          />
          <p className="mt-1.5 text-[12px] font-normal italic text-slate/60">
            Day 1 of the schedule begins on this date.
          </p>
          <FieldError>{errors.start_date}</FieldError>
        </label>
      </section>

      <section className="mt-5 rounded-xl border border-brand/20 bg-brand-light/30 p-4">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-slate-900">
          <Calendar aria-hidden="true" className="h-4 w-4 text-brand" />
          {scheduleSummary}
        </p>
        <p className="mt-1 font-mono text-[12px] text-slate">
          {previewDates.length > 0 ? formatDateList(previewDates) : 'No dates selected'}
        </p>
      </section>

      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          className="inline-flex h-10 items-center justify-center rounded-control bg-mist px-4 text-[13px] font-semibold text-slate transition hover:bg-hairline hover:text-ink"
          onClick={() => navigate(patient?.id ? `/patients/${patient.id}` : -1)}
          type="button"
        >
          Cancel
        </button>
        <button
          className="primary-button inline-flex h-10 min-w-[140px] items-center justify-center rounded-control bg-brand px-4 text-[13px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? (
            <LoadingSpinner light />
          ) : (
            <>
              <MessageCircle aria-hidden="true" className="mr-2 h-4 w-4" />
              Create Plan
            </>
          )}
        </button>
      </div>
    </form>
  )
}

export default CreatePlan
