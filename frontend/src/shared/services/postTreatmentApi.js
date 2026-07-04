import { api } from './api'
import { PUBLIC_ROUTES_FOR_TESTING, getPublicTestingSession } from '@shared/lib/testingAccess'
import {
  computeScheduleDates,
  computeScheduleDays,
  validateSchedule,
} from '@shared/lib/scheduleBuilder'

const DEMO_STORAGE_KEY = 'mediflow_post_treatment_demo_v1'
const DAY_MS = 24 * 60 * 60 * 1000

let memoryStore = null

const DEMO_PATIENTS = [
  { id: 101, full_name: 'Maria Garcia', phone: '+15550142111' },
  { id: 102, full_name: 'Robert Johnson', phone: '+15550188222' },
  { id: 103, full_name: 'Aisha Khan', phone: '+923001234567' },
  { id: 104, full_name: 'Daniel Turner', phone: '+15550194444' },
  { id: 105, full_name: 'Mei Lin', phone: '+15550166555' },
  { id: 106, full_name: 'Omar Hassan', phone: '+15550125666' },
]

const DEMO_DOCTORS = [
  { id: 201, full_name: 'Nora Patel', qualification: 'MD - Orthopedic Surgery' },
  { id: 202, full_name: 'Ethan Morris', qualification: 'MD - Cardiology' },
  { id: 203, full_name: 'Leila Reed', qualification: 'MD - Pediatrics' },
]

const DEMO_APPOINTMENTS = [
  { id: 301, appointment_dt: offsetIso(-28, 9, 30), doctor: 201, patient: 101, status: 'completed' },
  { id: 302, appointment_dt: offsetIso(-18, 11, 0), doctor: 202, patient: 102, status: 'completed' },
  { id: 303, appointment_dt: offsetIso(-7, 14, 15), doctor: 201, patient: 103, status: 'completed' },
  { id: 316, appointment_dt: offsetIso(0, 9, 0), doctor: 201, patient: 104, status: 'completed' },
]

const CONDITION_PRESETS = [
  {
    id: 1,
    condition_name: 'Cardiac Follow-up',
    custom_days: null,
    interval_days: 1,
    schedule_mode: 'interval',
    total_messages: 7,
  },
  {
    id: 2,
    condition_name: 'Hepatitis B',
    custom_days: [1, 4, 7, 10],
    interval_days: null,
    schedule_mode: 'custom',
    total_messages: 4,
  },
  {
    id: 3,
    condition_name: 'Viral Fever',
    custom_days: [1, 2],
    interval_days: null,
    schedule_mode: 'custom',
    total_messages: 2,
  },
]

function unwrap(response) {
  return response?.data ?? response
}

function nowIso() {
  return new Date().toISOString()
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function dateKeyFromOffset(offset = 0) {
  const date = new Date()
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() + offset)

  return date.toISOString().slice(0, 10)
}

function isoFromOffset(offsetDays = 0, offsetHours = 0) {
  return new Date(Date.now() + offsetDays * DAY_MS + offsetHours * 60 * 60 * 1000).toISOString()
}

function offsetIso(offsetDays = 0, hour = 9, minute = 0) {
  const date = new Date()
  date.setUTCHours(hour, minute, 0, 0)
  date.setUTCDate(date.getUTCDate() + offsetDays)

  return date.toISOString()
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function createDemoError(message, status = 400) {
  const error = new Error(message)
  error.response = {
    data: { detail: message },
    status,
  }
  throw error
}

function readStoredDemo() {
  if (typeof localStorage === 'undefined') {
    if (!memoryStore) {
      memoryStore = createInitialDemoData()
    }

    return clone(memoryStore)
  }

  try {
    const stored = localStorage.getItem(DEMO_STORAGE_KEY)

    if (stored) {
      const parsed = JSON.parse(stored)

      if (
        Array.isArray(parsed?.plans) &&
        Array.isArray(parsed?.steps) &&
        Array.isArray(parsed?.messages) &&
        Array.isArray(parsed?.alerts)
      ) {
        return parsed
      }
    }
  } catch {
    // Reset corrupt storage below.
  }

  const initialData = createInitialDemoData()
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(initialData))

  return initialData
}

function writeStoredDemo(data) {
  if (typeof localStorage === 'undefined') {
    memoryStore = clone(data)
  } else {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data))
  }

  return clone(data)
}

function nextId(records, floor = 1) {
  return records.reduce((max, record) => {
    const id = Number(record.id)
    return Number.isFinite(id) && id >= max ? id + 1 : max
  }, floor)
}

function getDemoUser() {
  const session = getPublicTestingSession()
  const roleSlug = session?.role?.slug || 'admin'

  return {
    ...(session?.user || {}),
    role: roleSlug,
    role_slug: roleSlug,
  }
}

function currentRole() {
  return getDemoUser().role_slug || getDemoUser().role || 'admin'
}

function currentDoctorId() {
  const user = getDemoUser()

  return currentRole() === 'doctor'
    ? user.doctor_id ?? user.user_id ?? user.id
    : null
}

function currentActorName() {
  const user = getDemoUser()

  return user.full_name || [user.first_name, user.last_name].filter(Boolean).join(' ') || 'MediFlow User'
}

function patientById(id, fallback = {}) {
  return (
    DEMO_PATIENTS.find((patient) => String(patient.id) === String(id)) ||
    {
      id: Number(id),
      full_name: fallback.patient_name || fallback.full_name || 'Patient',
      phone: fallback.patient_phone || fallback.phone || '',
    }
  )
}

function doctorById(id, fallback = {}) {
  return (
    DEMO_DOCTORS.find((doctor) => String(doctor.id) === String(id)) ||
    {
      id: Number(id),
      full_name: fallback.doctor_name || fallback.full_name || currentActorName(),
      qualification: fallback.qualification || '',
    }
  )
}

function appointmentById(id) {
  return DEMO_APPOINTMENTS.find((appointment) => String(appointment.id) === String(id))
}

function scopePlans(plans) {
  const doctorId = currentDoctorId()

  if (!doctorId) {
    return plans
  }

  return plans.filter((plan) => String(plan.doctor_id) === String(doctorId))
}

function scopeAlerts(alerts) {
  const doctorId = currentDoctorId()

  if (!doctorId) {
    return alerts
  }

  return alerts.filter((alert) => String(alert.doctor_id) === String(doctorId))
}

function paginate(items, params = {}) {
  const hasPagination = params.page !== undefined || params.page_size !== undefined

  if (!hasPagination) {
    return clone(items)
  }

  const page = Math.max(1, Number(params.page || 1))
  const pageSize = Math.max(1, Number(params.page_size || 10))
  const start = (page - 1) * pageSize

  return clone({
    count: items.length,
    next: start + pageSize < items.length ? `demo-page-${page + 1}` : null,
    previous: page > 1 ? `demo-page-${page - 1}` : null,
    results: items.slice(start, start + pageSize),
  })
}

function isCriticalContent(content) {
  return /\b(severe|urgent|emergency|chest pain|shortness of breath|bleeding|faint|unconscious|worse|critical)\b/i
    .test(String(content || ''))
}

function criticalReason(content, plan) {
  const normalized = String(content || '').trim()

  if (/chest pain/i.test(normalized)) {
    return 'Patient reported severe chest pain'
  }

  if (/shortness of breath/i.test(normalized)) {
    return 'Patient reported shortness of breath'
  }

  if (/bleeding/i.test(normalized)) {
    return 'Patient reported bleeding'
  }

  if (/severe/i.test(normalized)) {
    return `Patient reported severe symptoms during ${plan.condition}`
  }

  return `Patient reply flagged concern during ${plan.condition}`
}

function stepStatusForDisplay(step) {
  if (step.status === 'pending' && step.scheduled_date < todayKey()) {
    return 'missed'
  }

  return step.status
}

function decorateStep(step) {
  return {
    ...step,
    status: stepStatusForDisplay(step),
  }
}

function createStepsForPlan(plan, startId = 1) {
  const dayOffsets = computeScheduleDays(plan)
  const dates = computeScheduleDates(plan.start_date, dayOffsets)

  return dayOffsets.map((dayOffset, index) => ({
    id: startId + index,
    day_offset: dayOffset,
    message_log_id: null,
    plan_id: plan.id,
    scheduled_date: dates[index],
    status: 'pending',
  }))
}

function makeTemplateMessage(plan, step, id, sentAt, status = 'delivered') {
  return {
    id,
    content: `Hi ${plan.patient_name}, this is your ${plan.condition} check-in for Day ${step.day_offset}. Please reply with how you are feeling today.`,
    delivery_status: status,
    direction: 'outbound',
    is_critical_flag: false,
    message_type: 'template',
    patient_id: plan.patient_id,
    patient_phone: plan.patient_phone,
    plan_id: plan.id,
    plan_step_id: step.id,
    sent_at: sentAt,
  }
}

function createInitialDemoData() {
  const cardiacStart = dateKeyFromOffset(-2)
  const feverStart = dateKeyFromOffset(-5)
  const resolvedStart = dateKeyFromOffset(-8)
  const plans = [
    {
      id: 7001,
      appointment_id: 318,
      condition: 'Cardiac Follow-up',
      created_at: isoFromOffset(-2, -3),
      custom_days: null,
      doctor_id: 201,
      doctor_name: 'Nora Patel',
      interval_days: 1,
      notes: 'Monitor chest symptoms and medication tolerance closely.',
      patient_id: 106,
      patient_name: 'Omar Hassan',
      patient_phone: '+15550125666',
      schedule_mode: 'interval',
      start_date: cardiacStart,
      status: 'active',
      total_messages: 7,
    },
    {
      id: 7002,
      appointment_id: 302,
      condition: 'Diabetes Follow-up',
      created_at: isoFromOffset(-5, -4),
      custom_days: [1, 3, 5],
      doctor_id: 202,
      doctor_name: 'Ethan Morris',
      interval_days: null,
      notes: 'Review appetite, glucose trends, and fatigue.',
      patient_id: 102,
      patient_name: 'Robert Johnson',
      patient_phone: '+15550188222',
      schedule_mode: 'custom',
      start_date: feverStart,
      status: 'active',
      total_messages: 3,
    },
    {
      id: 7003,
      appointment_id: 303,
      condition: 'Hypertension Check',
      created_at: isoFromOffset(-8, -2),
      custom_days: [1, 4, 7],
      doctor_id: 201,
      doctor_name: 'Nora Patel',
      interval_days: null,
      notes: 'Short follow-up after medication adjustment.',
      patient_id: 103,
      patient_name: 'Aisha Khan',
      patient_phone: '+923001234567',
      schedule_mode: 'custom',
      start_date: resolvedStart,
      status: 'completed',
      total_messages: 3,
    },
  ]
  let steps = []
  let messages = []

  plans.forEach((plan) => {
    const nextStepId = nextId(steps, 8001)
    const planSteps = createStepsForPlan(plan, nextStepId)
    steps = [...steps, ...planSteps]
  })

  const sentSteps = [
    { planId: 7001, stepIndex: 0, status: 'delivered', reply: 'Doing okay, mild fatigue.', critical: false },
    { planId: 7001, stepIndex: 1, status: 'read', reply: 'Severe chest pain since morning.', critical: true },
    { planId: 7002, stepIndex: 0, status: 'delivered', reply: 'Sugar is stable today.', critical: false },
    { planId: 7002, stepIndex: 1, status: 'read', reply: 'Feeling better.', critical: false },
    { planId: 7003, stepIndex: 0, status: 'read', reply: 'BP is better.', critical: false },
    { planId: 7003, stepIndex: 1, status: 'read', reply: 'No dizziness.', critical: false },
    { planId: 7003, stepIndex: 2, status: 'read', reply: 'Resolved after call.', critical: false },
  ]

  sentSteps.forEach((item) => {
    const plan = plans.find((candidate) => candidate.id === item.planId)
    const planSteps = steps.filter((step) => step.plan_id === item.planId)
    const step = planSteps[item.stepIndex]
    const outboundId = nextId(messages, 9001)
    const outbound = makeTemplateMessage(
      plan,
      step,
      outboundId,
      `${step.scheduled_date}T09:00:00.000Z`,
      item.status,
    )
    const inbound = {
      id: outboundId + 1,
      content: item.reply,
      delivery_status: 'read',
      direction: 'inbound',
      is_critical_flag: item.critical,
      message_type: 'reply',
      patient_id: plan.patient_id,
      patient_phone: plan.patient_phone,
      plan_id: plan.id,
      plan_step_id: step.id,
      reply_to_message_log_id: outboundId,
      sent_at: `${step.scheduled_date}T10:00:00.000Z`,
    }

    step.message_log_id = outboundId
    step.status = 'replied'
    messages = [...messages, outbound, inbound]
  })

  return {
    alerts: [
      {
        id: 10001,
        acknowledged_by: null,
        called_at: null,
        called_by: null,
        condition: 'Cardiac Follow-up',
        created_at: isoFromOffset(0, -2),
        doctor_id: 201,
        message_log_id: messages.find((message) => message.is_critical_flag)?.id || 9004,
        patient_id: 106,
        patient_name: 'Omar Hassan',
        patient_phone: '+15550125666',
        plan_id: 7001,
        resolution_notes: '',
        resolved_at: null,
        status: 'pending',
        trigger_reason: 'Patient reported severe chest pain during Day 2 check-in',
      },
      {
        id: 10002,
        acknowledged_by: 'Ethan Morris',
        called_at: isoFromOffset(-1, -3),
        called_by: 'Ethan Morris',
        condition: 'Diabetes Follow-up',
        created_at: isoFromOffset(-1, -5),
        doctor_id: 202,
        message_log_id: 9008,
        patient_id: 102,
        patient_name: 'Robert Johnson',
        patient_phone: '+15550188222',
        plan_id: 7002,
        resolution_notes: '',
        resolved_at: null,
        status: 'acknowledged',
        trigger_reason: 'Patient reported worsening fatigue',
      },
      {
        id: 10003,
        acknowledged_by: 'Nora Patel',
        called_at: isoFromOffset(0, -7),
        called_by: 'Nora Patel',
        condition: 'Hypertension Check',
        created_at: isoFromOffset(0, -9),
        doctor_id: 201,
        message_log_id: 9014,
        patient_id: 103,
        patient_name: 'Aisha Khan',
        patient_phone: '+923001234567',
        plan_id: 7003,
        resolution_notes: 'Patient was stable on callback and advised to continue monitoring.',
        resolved_at: isoFromOffset(0, -6),
        status: 'resolved',
        trigger_reason: 'Patient reported dizziness',
      },
    ],
    messages,
    plans,
    steps,
  }
}

function findPlanOrThrow(data, id) {
  const plan = scopePlans(data.plans).find((candidate) => String(candidate.id) === String(id))

  if (!plan) {
    createDemoError('Post-treatment plan not found', 404)
  }

  return plan
}

function buildPlanPayload(data = {}) {
  const user = getDemoUser()
  const appointment = appointmentById(data.appointment_id)
  const patient = patientById(data.patient_id || appointment?.patient, data)
  const doctorId =
    data.doctor_id ||
    appointment?.doctor ||
    user.doctor_id ||
    user.user_id ||
    user.id
  const doctor = doctorById(doctorId, data)
  const scheduleErrors = validateSchedule(data)

  if (Object.keys(scheduleErrors).length > 0) {
    createDemoError(Object.values(scheduleErrors)[0])
  }

  if (!patient.phone && !data.patient_phone) {
    createDemoError('Patient has no phone number on file. Update patient profile first.')
  }

  return {
    appointment_id: data.appointment_id ? Number(data.appointment_id) : null,
    condition: String(data.condition || '').trim(),
    created_at: data.created_at || nowIso(),
    custom_days: data.schedule_mode === 'custom'
      ? [...(data.custom_days || [])].map(Number).sort((a, b) => a - b)
      : null,
    doctor_id: Number(doctorId),
    doctor_name: doctor.full_name,
    interval_days: data.schedule_mode === 'interval' ? Number(data.interval_days) : null,
    notes: data.notes || null,
    patient_id: Number(patient.id),
    patient_name: data.patient_name || patient.full_name,
    patient_phone: data.patient_phone || patient.phone,
    schedule_mode: data.schedule_mode,
    start_date: data.start_date || todayKey(),
    status: data.status || 'active',
    total_messages: data.schedule_mode === 'custom'
      ? (data.custom_days || []).length
      : Number(data.total_messages),
  }
}

function sortPlans(plans) {
  return [...plans].sort((first, second) => new Date(second.created_at) - new Date(first.created_at))
}

function sortMessages(messages) {
  return [...messages].sort((first, second) => new Date(first.sent_at) - new Date(second.sent_at))
}

function sortAlerts(alerts) {
  const statusRank = { pending: 0, acknowledged: 1, resolved: 2 }

  return [...alerts].sort((first, second) => {
    const rankDiff = (statusRank[first.status] ?? 3) - (statusRank[second.status] ?? 3)

    if (rankDiff !== 0) {
      return rankDiff
    }

    return new Date(second.created_at) - new Date(first.created_at)
  })
}

export async function getPlans(params = {}) {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    const data = readStoredDemo()
    const search = String(params.search || '').trim().toLowerCase()
    let plans = scopePlans(data.plans)

    if (params.patient) {
      plans = plans.filter((plan) => String(plan.patient_id) === String(params.patient))
    }

    if (params.status) {
      plans = plans.filter((plan) => plan.status === params.status)
    }

    if (search) {
      plans = plans.filter((plan) =>
        [plan.patient_name, plan.condition, plan.doctor_name].join(' ').toLowerCase().includes(search),
      )
    }

    return paginate(sortPlans(plans), params)
  }

  const { data } = await api.get('/post-treatment/plans/', { params })
  return data
}

export async function getPlanById(id) {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    return clone(findPlanOrThrow(readStoredDemo(), id))
  }

  const { data } = await api.get(`/post-treatment/plans/${id}/`)
  return data
}

export async function createPlan(payload) {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    const data = readStoredDemo()
    const plan = {
      ...buildPlanPayload(payload),
      id: nextId(data.plans, 7001),
    }
    const steps = createStepsForPlan(plan, nextId(data.steps, 8001))

    data.plans = [plan, ...data.plans]
    data.steps = [...steps, ...data.steps]
    writeStoredDemo(data)

    return clone(plan)
  }

  const response = await api.post('/post-treatment/plans/', payload)
  return unwrap(response)
}

export async function updatePlan(id, payload) {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    const data = readStoredDemo()
    const existing = findPlanOrThrow(data, id)
    const nextPlan = {
      ...existing,
      ...buildPlanPayload({
        ...existing,
        ...payload,
        appointment_id: existing.appointment_id,
        condition: existing.condition,
        doctor_id: existing.doctor_id,
        patient_id: existing.patient_id,
        patient_name: existing.patient_name,
        patient_phone: existing.patient_phone,
        start_date: existing.start_date,
        status: existing.status,
      }),
      id: existing.id,
      created_at: existing.created_at,
      status: existing.status,
    }
    const existingSteps = data.steps.filter((step) => String(step.plan_id) === String(id))
    const sentSteps = existingSteps.filter((step) =>
      ['sent', 'replied'].includes(step.status) || step.message_log_id,
    )
    const nextFutureSteps = createStepsForPlan(nextPlan, nextId(data.steps, 8001))
      .filter((step) =>
        !sentSteps.some((sentStep) => Number(sentStep.day_offset) === Number(step.day_offset)),
      )
    const preservedOtherSteps = data.steps.filter((step) => String(step.plan_id) !== String(id))

    data.plans = data.plans.map((plan) => (String(plan.id) === String(id) ? nextPlan : plan))
    data.steps = [...preservedOtherSteps, ...sentSteps, ...nextFutureSteps]
    writeStoredDemo(data)

    return clone(nextPlan)
  }

  const response = await api.put(`/post-treatment/plans/${id}/`, payload)
  return unwrap(response)
}

export async function cancelPlan(id) {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    const data = readStoredDemo()
    const existing = findPlanOrThrow(data, id)
    const updated = { ...existing, status: 'cancelled' }

    data.plans = data.plans.map((plan) => (String(plan.id) === String(id) ? updated : plan))
    writeStoredDemo(data)

    return clone(updated)
  }

  const response = await api.patch(`/post-treatment/plans/${id}/`, { status: 'cancelled' })
  return unwrap(response)
}

export async function getConditionPresets() {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    return clone(CONDITION_PRESETS)
  }

  const response = await api.get('/post-treatment/presets/')
  return unwrap(response)
}

export async function getPlanSteps(planId) {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    const data = readStoredDemo()

    findPlanOrThrow(data, planId)

    return data.steps
      .filter((step) => String(step.plan_id) === String(planId))
      .sort((first, second) => Number(first.day_offset) - Number(second.day_offset))
      .map(decorateStep)
  }

  const response = await api.get(`/post-treatment/plans/${planId}/steps/`)
  return unwrap(response)
}

export async function getMessageLog(planId) {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    const data = readStoredDemo()

    findPlanOrThrow(data, planId)

    return clone(
      sortMessages(data.messages.filter((message) => String(message.plan_id) === String(planId))),
    )
  }

  const response = await api.get(`/post-treatment/plans/${planId}/messages/`)
  return unwrap(response)
}

export async function getPatientMessages(patientId, params = {}) {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    const data = readStoredDemo()
    const messages = sortMessages(
      data.messages.filter((message) => String(message.patient_id) === String(patientId)),
    )

    return paginate(messages, params)
  }

  const response = await api.get(`/post-treatment/patients/${patientId}/messages/`, { params })
  return unwrap(response)
}

export async function sendManualMessage(planId, content) {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    const data = readStoredDemo()
    const plan = findPlanOrThrow(data, planId)
    const message = {
      id: nextId(data.messages, 9001),
      content: String(content || '').trim(),
      delivery_status: /\bfail\b/i.test(String(content || '')) ? 'failed' : 'delivered',
      direction: 'outbound',
      is_critical_flag: false,
      message_type: 'manual',
      patient_id: plan.patient_id,
      patient_phone: plan.patient_phone,
      plan_id: plan.id,
      plan_step_id: null,
      sent_at: nowIso(),
    }

    data.messages = [...data.messages, message]
    writeStoredDemo(data)

    return clone(message)
  }

  const response = await api.post(`/post-treatment/plans/${planId}/messages/`, {
    content,
    message_type: 'manual',
  })
  return unwrap(response)
}

export async function logPatientReply(messageLogId, content) {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    const data = readStoredDemo()
    const parent = data.messages.find((message) => String(message.id) === String(messageLogId))

    if (!parent) {
      createDemoError('Message not found', 404)
    }

    const plan = findPlanOrThrow(data, parent.plan_id)
    const isCritical = isCriticalContent(content)
    const reply = {
      id: nextId(data.messages, 9001),
      content: String(content || '').trim(),
      delivery_status: 'read',
      direction: 'inbound',
      is_critical_flag: isCritical,
      message_type: 'reply',
      patient_id: parent.patient_id,
      patient_phone: parent.patient_phone,
      plan_id: parent.plan_id,
      plan_step_id: parent.plan_step_id,
      reply_to_message_log_id: parent.id,
      sent_at: nowIso(),
    }

    data.messages = [...data.messages, reply]

    if (parent.plan_step_id) {
      data.steps = data.steps.map((step) =>
        String(step.id) === String(parent.plan_step_id)
          ? { ...step, status: 'replied' }
          : step,
      )
    }

    if (isCritical) {
      data.alerts = [
        {
          id: nextId(data.alerts, 10001),
          acknowledged_by: null,
          called_at: null,
          called_by: null,
          condition: plan.condition,
          created_at: nowIso(),
          doctor_id: plan.doctor_id,
          message_log_id: reply.id,
          patient_id: plan.patient_id,
          patient_name: plan.patient_name,
          patient_phone: plan.patient_phone,
          plan_id: plan.id,
          resolution_notes: '',
          resolved_at: null,
          status: 'pending',
          trigger_reason: criticalReason(content, plan),
        },
        ...data.alerts,
      ]
    }

    writeStoredDemo(data)

    return clone(reply)
  }

  const response = await api.post(`/post-treatment/messages/${messageLogId}/reply/`, { content })
  return unwrap(response)
}

export async function getCriticalAlerts(params = {}) {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    const data = readStoredDemo()
    const search = String(params.search || '').trim().toLowerCase()
    let alerts = scopeAlerts(data.alerts)

    if (params.status && params.status !== 'all') {
      alerts = alerts.filter((alert) => alert.status === params.status)
    }

    if (search) {
      alerts = alerts.filter((alert) =>
        [alert.patient_name, alert.patient_phone, alert.condition, alert.trigger_reason]
          .join(' ')
          .toLowerCase()
          .includes(search),
      )
    }

    return paginate(sortAlerts(alerts), params)
  }

  const { data } = await api.get('/post-treatment/alerts/', { params })
  return data
}

export async function acknowledgeAlert(id) {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    const data = readStoredDemo()
    let updated = null

    data.alerts = data.alerts.map((alert) => {
      if (String(alert.id) !== String(id)) {
        return alert
      }

      updated = {
        ...alert,
        acknowledged_by: currentActorName(),
        status: 'acknowledged',
      }

      return updated
    })

    if (!updated) {
      createDemoError('Critical alert not found', 404)
    }

    writeStoredDemo(data)
    return clone(updated)
  }

  const response = await api.patch(`/post-treatment/alerts/${id}/`, { status: 'acknowledged' })
  return unwrap(response)
}

export async function resolveAlert(id, notes) {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    if (!String(notes || '').trim()) {
      createDemoError('Resolution notes are required')
    }

    const data = readStoredDemo()
    let updated = null

    data.alerts = data.alerts.map((alert) => {
      if (String(alert.id) !== String(id)) {
        return alert
      }

      updated = {
        ...alert,
        acknowledged_by: alert.acknowledged_by || currentActorName(),
        resolution_notes: String(notes || '').trim(),
        resolved_at: nowIso(),
        status: 'resolved',
      }

      return updated
    })

    if (!updated) {
      createDemoError('Critical alert not found', 404)
    }

    writeStoredDemo(data)
    return clone(updated)
  }

  const response = await api.patch(`/post-treatment/alerts/${id}/`, {
    resolution_notes: notes,
    status: 'resolved',
  })
  return unwrap(response)
}

export async function markPatientCalled(id) {
  if (PUBLIC_ROUTES_FOR_TESTING) {
    const data = readStoredDemo()
    let updated = null

    data.alerts = data.alerts.map((alert) => {
      if (String(alert.id) !== String(id)) {
        return alert
      }

      updated = {
        ...alert,
        acknowledged_by: alert.acknowledged_by || currentActorName(),
        called_at: nowIso(),
        called_by: currentActorName(),
        status: 'acknowledged',
      }

      return updated
    })

    if (!updated) {
      createDemoError('Critical alert not found', 404)
    }

    writeStoredDemo(data)
    return clone(updated)
  }

  const response = await api.post(`/post-treatment/alerts/${id}/mark-called/`)
  return unwrap(response)
}

export function resetPostTreatmentDemoData() {
  const data = createInitialDemoData()
  writeStoredDemo(data)
  return clone(data)
}
