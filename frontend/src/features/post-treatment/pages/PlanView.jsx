import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Clock,
  Edit,
  MessageCircle,
  Phone,
  Trash2,
} from 'lucide-react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'

import Avatar from '@shared/components/Avatar'
import ConfirmationModal from '@shared/components/ConfirmationModal'
import { LoadingSpinner, getFieldClass } from '@shared/components/FormPrimitives'
import MessageInput from '@shared/components/chat/MessageInput'
import { useToast } from '@shared/components/Toast'
import { useAuth } from '@shared/context/AuthContext'
import {
  formatDate,
  getBackendError,
} from '@shared/lib/records'
import {
  canEditPlan,
  getPostTreatmentDoctorId,
} from '@shared/lib/postTreatmentAccess'
import {
  describeSchedule,
} from '@shared/lib/scheduleBuilder'
import {
  cancelPlan,
  getMessageLog,
  getPlanById,
  getPlanSteps,
  logPatientReply,
  sendManualMessage,
} from '@shared/services/postTreatmentApi'
import MessageBubble from '../components/MessageBubble'
import PlanStatusBadge from '../components/PlanStatusBadge'
import ScheduleTimeline from '../components/ScheduleTimeline'

function isSameDate(first, second) {
  if (!first || !second) {
    return false
  }

  return new Date(first).toDateString() === new Date(second).toDateString()
}

function DateSeparator({ value }) {
  const date = new Date(value)
  const label = Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(date)

  return (
    <div className="my-3 flex items-center gap-3">
      <span className="h-px flex-1 bg-canvas/70" />
      <span className="rounded-full bg-canvas/80 px-3 py-0.5 text-[10px] font-semibold text-slate">
        {label}
      </span>
      <span className="h-px flex-1 bg-canvas/70" />
    </div>
  )
}

function statusDot(status) {
  if (status === 'sent' || status === 'replied') return 'bg-green-500'
  if (status === 'missed') return 'bg-rose-500'
  return 'bg-slate-300'
}

function statusLabel(status = '') {
  return String(status || 'pending')
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function PlanView() {
  const { id } = useParams()
  const { role, user } = useAuth()
  const subject = useMemo(() => ({ role, user }), [role, user])
  const navigate = useNavigate()
  const outletContext = useOutletContext()
  const toast = useToast()
  const [plan, setPlan] = useState(null)
  const [steps, setSteps] = useState([])
  const [messages, setMessages] = useState([])
  const [manualMessage, setManualMessage] = useState('')
  const [replyInput, setReplyInput] = useState('')
  const [replyOpen, setReplyOpen] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isReplying, setIsReplying] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const messageRefs = useRef(new Map())

  const loadPlan = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')

    try {
      const [planResponse, stepResponse, messageResponse] = await Promise.all([
        getPlanById(id),
        getPlanSteps(id),
        getMessageLog(id),
      ])

      if (
        role?.slug === 'doctor' &&
        String(planResponse.doctor_id) !== String(getPostTreatmentDoctorId(subject))
      ) {
        navigate('/not-available?reason=role', { replace: true })
        return
      }

      setPlan(planResponse)
      setSteps(Array.isArray(stepResponse) ? stepResponse : [])
      setMessages(Array.isArray(messageResponse) ? messageResponse : [])
      outletContext?.setPageMeta?.({
        title: planResponse.condition,
        subtitle: planResponse.patient_name,
      })
    } catch (error) {
      setLoadError(getBackendError(error, 'Post-treatment plan could not be loaded.'))
    } finally {
      setIsLoading(false)
    }
  }, [id, navigate, outletContext, role, subject])

  useEffect(() => {
    queueMicrotask(() => {
      loadPlan()
    })

    return () => outletContext?.clearPageMeta?.()
  }, [loadPlan, outletContext])

  const editable = plan ? canEditPlan(subject, plan) : false
  const sentCount = steps.filter((step) => ['sent', 'replied'].includes(step.status)).length
  const latestOutbound = [...messages].reverse().find((message) => message.direction === 'outbound')

  function scrollToMessage(messageId) {
    messageRefs.current.get(String(messageId))?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }

  async function handleCancelPlan() {
    setIsCancelling(true)

    try {
      const updated = await cancelPlan(id)
      setPlan(updated)
      setCancelOpen(false)
      toast.success('Post-treatment plan cancelled')
    } catch (error) {
      toast.error(getBackendError(error, 'Plan could not be cancelled.'))
    } finally {
      setIsCancelling(false)
    }
  }

  async function handleSendManual() {
    const content = manualMessage.trim()

    if (!content || !plan) {
      return
    }

    const tempId = `temp-${Date.now()}`
    const optimistic = {
      id: tempId,
      content,
      delivery_status: 'queued',
      direction: 'outbound',
      is_critical_flag: false,
      message_type: 'manual',
      patient_id: plan.patient_id,
      patient_phone: plan.patient_phone,
      plan_id: plan.id,
      plan_step_id: null,
      sent_at: new Date().toISOString(),
    }

    setManualMessage('')
    setMessages((current) => [...current, optimistic])
    setIsSending(true)

    try {
      const saved = await sendManualMessage(plan.id, content)
      setMessages((current) =>
        current.map((message) => (message.id === tempId ? saved : message)),
      )
    } catch (error) {
      setMessages((current) =>
        current.map((message) =>
          message.id === tempId
            ? { ...message, delivery_status: 'failed' }
            : message,
        ),
      )
      toast.error(getBackendError(error, 'Message could not be sent.'))
    } finally {
      setIsSending(false)
    }
  }

  async function handleRetry(message) {
    if (!plan || !message?.content) {
      return
    }

    try {
      const saved = await sendManualMessage(plan.id, message.content)
      setMessages((current) => [...current, saved])
      toast.success('Message resent')
    } catch (error) {
      toast.error(getBackendError(error, 'Message could not be resent.'))
    }
  }

  async function handleLogReply() {
    const content = replyInput.trim()

    if (!content || !latestOutbound) {
      return
    }

    setIsReplying(true)

    try {
      const reply = await logPatientReply(latestOutbound.id, content)
      const nextSteps = await getPlanSteps(id)
      setMessages((current) => [...current, reply])
      setSteps(Array.isArray(nextSteps) ? nextSteps : [])
      setReplyInput('')
      setReplyOpen(false)
      if (reply.is_critical_flag) {
        toast.warning('Critical reply logged')
      } else {
        toast.success('Patient reply logged')
      }
    } catch (error) {
      toast.error(getBackendError(error, 'Reply could not be logged.'))
    } finally {
      setIsReplying(false)
    }
  }

  if (loadError) {
    return (
      <section className="mx-auto max-w-2xl rounded-card bg-canvas p-8 text-center shadow-card">
        <h2 className="text-[18px] font-bold text-ink">Plan unavailable</h2>
        <p className="mt-2 text-[14px] text-slate">{loadError}</p>
        <Link
          className="mt-5 inline-flex rounded-control bg-mist px-4 py-2 text-[13px] font-semibold text-slate transition hover:bg-hairline hover:text-ink"
          to="/patients"
        >
          Back to patients
        </Link>
      </section>
    )
  }

  if (isLoading || !plan) {
    return (
      <div className="space-y-4">
        <div className="h-44 animate-pulse rounded-card bg-canvas shadow-card" />
        <div className="h-48 animate-pulse rounded-card bg-canvas shadow-card" />
        <div className="h-96 animate-pulse rounded-card bg-canvas shadow-card" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4">
        <button
          className="inline-flex h-10 items-center rounded-control bg-mist px-3 text-[13px] font-semibold text-slate transition hover:bg-hairline hover:text-ink"
          onClick={() => navigate(-1)}
          type="button"
        >
          <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />
          Back
        </button>
      </div>

      <section className="rounded-card bg-canvas p-6 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[20px] font-bold text-ink">{plan.condition}</h1>
              <PlanStatusBadge status={plan.status} />
            </div>
            <p className="mt-2 text-[13px] font-medium text-slate">
              {describeSchedule(plan)}
            </p>
          </div>
          {editable ? (
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex h-10 items-center rounded-control border border-brand/20 bg-brand-light px-3 text-[13px] font-semibold text-brand transition hover:bg-brand hover:text-white"
                onClick={() => navigate(`/post-treatment/plans/${id}/edit`)}
                type="button"
              >
                <Edit aria-hidden="true" className="mr-2 h-4 w-4" />
                Edit
              </button>
              <button
                className="inline-flex h-10 items-center rounded-control border border-rose-200 bg-rose-50 px-3 text-[13px] font-semibold text-rose-600 transition hover:brightness-95"
                onClick={() => setCancelOpen(true)}
                type="button"
              >
                <Trash2 aria-hidden="true" className="mr-2 h-4 w-4" />
                Cancel Plan
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <div className="flex items-center gap-3 rounded-control border border-hairline bg-mist p-3">
            <Avatar name={plan.patient_name} size="md" />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-ink">{plan.patient_name}</p>
              <p className="font-mono text-[12px] text-slate">{plan.patient_phone}</p>
              <Link
                className="mt-1 inline-flex text-[12px] font-semibold text-brand hover:text-brandDark"
                to={`/patients/${plan.patient_id}`}
              >
                View Patient -&gt;
              </Link>
            </div>
          </div>
          {role?.slug !== 'doctor' ? (
            <div className="rounded-control border border-hairline bg-mist p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate">
                Doctor
              </p>
              <p className="mt-1 text-[14px] font-semibold text-ink">
                Dr. {plan.doctor_name}
              </p>
            </div>
          ) : null}
          <div className="rounded-control border border-hairline bg-mist p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate">
              Progress
            </p>
            <p className="mt-1 text-[14px] font-semibold text-ink">
              {sentCount} of {steps.length || plan.total_messages} messages sent
            </p>
            <p className="mt-1 text-[12px] text-slate">
              Started {formatDate(plan.start_date)}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-card bg-canvas p-6 shadow-card">
        <h2 className="text-[16px] font-bold text-ink">Message Schedule</h2>
        <ScheduleTimeline
          dayOffsets={steps.map((step) => step.day_offset)}
          scheduledDates={steps.map((step) => step.scheduled_date)}
          stepStatuses={steps.map((step) => step.status)}
        />

        <div className="mt-2 divide-y divide-hairline rounded-control border border-hairline">
          {steps.map((step) => {
            const stepMessage = messages.find((message) => String(message.id) === String(step.message_log_id))

            return (
              <div
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                key={step.id}
              >
                <div className="flex flex-wrap items-center gap-2 font-mono text-[12px] text-slate">
                  <span className="font-semibold text-ink">Day {step.day_offset}</span>
                  <span>-</span>
                  <span>{formatDate(step.scheduled_date)}</span>
                  <span>-</span>
                  <span className={`h-2 w-2 rounded-full ${statusDot(step.status)}`} />
                  <span>{statusLabel(step.status)}</span>
                  {stepMessage ? (
                    <>
                      <span>-</span>
                      <span>{statusLabel(stepMessage.delivery_status)}</span>
                    </>
                  ) : null}
                </div>
                {step.message_log_id ? (
                  <button
                    className="text-left text-[12px] font-semibold text-brand transition hover:text-brandDark sm:text-right"
                    onClick={() => scrollToMessage(step.message_log_id)}
                    type="button"
                  >
                    View Message
                  </button>
                ) : (
                  <span className="font-mono text-[12px] text-slate/40">-</span>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-card bg-canvas shadow-card">
        <header className="flex items-center gap-2 bg-[#075E54] px-5 py-3">
          <MessageCircle aria-hidden="true" className="h-[18px] w-[18px] text-white" />
          <h2 className="text-[14px] font-semibold text-white">WhatsApp Conversation</h2>
          <p className="ml-auto font-mono text-[12px] text-white/70">{plan.patient_phone}</p>
        </header>

        {messages.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center bg-canvas px-6 text-center">
            <Clock aria-hidden="true" className="mb-2 h-8 w-8 text-slate/30" />
            <p className="text-[14px] font-semibold text-slate-900">
              First message scheduled for {formatDate(steps[0]?.scheduled_date)}
            </p>
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto bg-[#E5DDD5] p-4 md:max-h-[500px]">
            {messages.map((message, index) => {
              const previous = messages[index - 1]

              return (
                <div
                  key={message.id}
                  ref={(node) => {
                    if (node) {
                      messageRefs.current.set(String(message.id), node)
                    }
                  }}
                >
                  {!previous || !isSameDate(previous.sent_at, message.sent_at) ? (
                    <DateSeparator value={message.sent_at} />
                  ) : null}
                  <MessageBubble message={message} onRetry={handleRetry} />
                </div>
              )
            })}
          </div>
        )}

        {editable ? (
          <>
            <MessageInput
              disabled={isSending}
              onChange={setManualMessage}
              onSend={handleSendManual}
              placeholder="Send a manual WhatsApp message..."
              value={manualMessage}
            />
            <div className="border-t border-hairline bg-canvas px-3 py-2">
              <button
                className="text-[12px] font-medium italic text-slate transition hover:text-brand"
                onClick={() => setReplyOpen((open) => !open)}
                type="button"
              >
                Log a patient reply
              </button>
              {replyOpen ? (
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start">
                  <textarea
                    className={getFieldClass(false, 'min-h-[68px] flex-1 resize-none')}
                    disabled={!latestOutbound || isReplying}
                    onChange={(event) => setReplyInput(event.target.value)}
                    placeholder={
                      latestOutbound
                        ? 'Patient reply text...'
                        : 'Send or select an outbound message first'
                    }
                    value={replyInput}
                  />
                  <button
                    className="inline-flex h-10 items-center justify-center rounded-control bg-brand px-4 text-[13px] font-semibold text-white transition hover:bg-brandDark disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!latestOutbound || !replyInput.trim() || isReplying}
                    onClick={handleLogReply}
                    type="button"
                  >
                    {isReplying ? (
                      <LoadingSpinner light />
                    ) : (
                      <>
                        <Phone aria-hidden="true" className="mr-2 h-4 w-4" />
                        Log Reply
                      </>
                    )}
                  </button>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </section>

      {cancelOpen ? (
        <ConfirmationModal
          body="This will stop future scheduled WhatsApp messages. Existing message history and critical alerts stay visible."
          confirmLabel="Cancel Plan"
          isLoading={isCancelling}
          onCancel={() => setCancelOpen(false)}
          onConfirm={handleCancelPlan}
          title="Cancel post-treatment plan?"
        />
      ) : null}
    </div>
  )
}

export default PlanView
