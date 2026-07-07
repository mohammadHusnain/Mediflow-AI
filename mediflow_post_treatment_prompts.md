# MediFlow — Post-Treatment Feature
## 2 Master Prompts · Backend API & Routes Requirements

Design system in force: Outfit (sans), JetBrains Mono (mono), brand #4338CA,
brandDark #352E9E, slate #5B6472, mist #F6F8F9, hairline #E4E8EB, canvas #FFFFFF,
text-slate-900 for primary text. All animation classes from existing tailwind.config.js.
No new external libraries. No placeholders. No TODOs.

Scope: WhatsApp messages are STATIC/MOCKED for this phase — no live WhatsApp
Business API integration yet. The system logs what would be sent, stores
patient replies (entered manually or via webhook stub), and displays the
conversation thread. Real WhatsApp API wiring is a future phase.

---

---

# MASTER PROMPT 1 — Foundation: Data Model, Schedule Builder, RBAC, Shared Components

## Role
Senior frontend engineer. Build the entire post-treatment infrastructure:
data contracts, the schedule builder engine, RBAC, and every shared component
that Prompt 2's pages consume. No full pages yet.

---

## 1. CONCEPT MODEL — how post-treatment plans work

A **Post-Treatment Plan** is created by a doctor after (or during) a completed
appointment. It defines a messaging schedule tailored to the patient's condition.

Example patterns the doctor can configure:
```
Cardiac patient:    Daily check-in message × 7 days
Hepatitis patient:  Message every 3 days × 3 occurrences, then 1 message on day 7
                    (4 messages across 10 days: Day 1, Day 3, Day 6/7, Day 10)
Mild fever:         Message on Day 1, Day 2 only (short 1-2 day plan)
```

A plan is NOT a fixed template — the doctor builds a custom schedule per patient
using a **frequency + duration + step pattern**, OR picks specific days manually.
Two schedule building modes:

**Mode A — Recurring Interval:** "Every N days, for M total messages"
  e.g. "Every 3 days, 4 messages" → Day 1, Day 4, Day 7, Day 10

**Mode B — Custom Days:** doctor manually picks exact days
  e.g. Day 1, Day 2, Day 3, Day 7 (mixed cadence)

Each scheduled message point becomes a **PlanStep**. Each PlanStep, when its
date arrives, triggers a WhatsApp message send (mocked) and creates a
**MessageLog** entry. Patient replies attach to that MessageLog entry as a thread.

If a scheduled check-in message reveals a critical response (patient selects
"Severe" symptoms, or a keyword-based reply flags concern), the system creates
a **CriticalAlert** — visible to the doctor with "Call this patient" action.

---

## 2. DATA CONTRACTS

### 2A. PostTreatmentPlan object
```js
{
  id:                number,
  patient_id:        number,
  patient_name:       string,
  doctor_id:         number,
  doctor_name:       string,
  appointment_id:    number,          // the visit this plan originated from
  condition:         string,          // "Cardiac Follow-up", "Hepatitis B", "Viral Fever"
  schedule_mode:     "interval" | "custom",
  interval_days:     number | null,   // e.g. 3 (only for interval mode)
  total_messages:    number,          // e.g. 4
  custom_days:       number[] | null, // e.g. [1,2,3,7] (only for custom mode)
  start_date:        string,          // "YYYY-MM-DD" — plan activation date
  status:            "active" | "completed" | "cancelled",
  created_at:        string,
  notes:             string | null,   // doctor's notes on why this schedule was chosen
}
```

### 2B. PlanStep object
```js
{
  id:              number,
  plan_id:         number,
  day_offset:       number,           // day 1, 3, 7, 10 relative to start_date
  scheduled_date:   string,           // computed: start_date + day_offset
  status:           "pending" | "sent" | "replied" | "missed",
  message_log_id:   number | null,    // links to MessageLog once sent
}
```

### 2C. MessageLog object (WhatsApp thread)
```js
{
  id:              number,
  plan_step_id:     number | null,    // null if it's an ad-hoc message
  patient_id:       number,
  patient_phone:    string,
  direction:        "outbound" | "inbound",
  message_type:     "template" | "reply" | "manual",
  content:          string,
  sent_at:          string,           // ISO
  delivery_status:  "queued" | "sent" | "delivered" | "read" | "failed",
  is_critical_flag: boolean,          // true if this message/reply triggered a critical alert
}
```

### 2D. CriticalAlert object
```js
{
  id:              number,
  patient_id:       number,
  patient_name:     string,
  patient_phone:    string,
  plan_id:          number,
  message_log_id:   number,
  trigger_reason:   string,           // "Patient reported severe chest pain"
  condition:        string,           // condition context from the plan
  created_at:       string,
  status:           "pending" | "acknowledged" | "resolved",
  acknowledged_by:  string | null,
  resolved_at:      string | null,
}
```

### 2E. Condition Preset (for quick-start templates — optional convenience, doctor can still customize)
```js
{
  id:            number,
  condition_name: string,             // "Cardiac", "Hepatitis", "Viral Fever"
  schedule_mode:  "interval" | "custom",
  interval_days:  number | null,
  total_messages: number,
  custom_days:    number[] | null,
}
```
Presets are suggestions only — selecting one pre-fills the schedule builder,
doctor can still edit before saving.

---

## 3. RBAC

| Action | Admin | Doctor | Receptionist |
|---|---|---|---|
| Create post-treatment plan | ✗ | ✓ (own patients only) | ✗ |
| View plan | ✓ (all) | ✓ (own patients only) | ✓ (all, read-only) |
| Edit/Cancel plan | ✗ | ✓ (own, before completion) | ✗ |
| View message log | ✓ (all) | ✓ (own) | ✓ (all, read-only) |
| View critical alerts | ✓ (all) | ✓ (own patients) | ✓ (all, read-only, no acknowledge) |
| Acknowledge/resolve critical alert | ✓ | ✓ (own) | ✗ |
| Manually call patient (mark as called) | ✓ | ✓ (own) | ✗ |

```js
// src/lib/postTreatmentAccess.js
import { ROLES } from './roles'

export const canCreatePlan       = (u) => u.role === ROLES.DOCTOR
export const canEditPlan         = (u, plan) =>
  u.role === ROLES.DOCTOR && plan.doctor_id === u.user_id && plan.status === 'active'
export const canViewPlan         = (u) => true  // all roles view, scoped server-side for doctor
export const canAcknowledgeAlert = (u, alert) =>
  u.role === ROLES.ADMIN || (u.role === ROLES.DOCTOR && alert.doctor_id === u.user_id)
export const canMarkCalled       = (u, alert) => canAcknowledgeAlert(u, alert)
```

---

## 4. API SERVICE — src/services/postTreatmentApi.js

```js
import { api } from './api'

// Plans
export const getPlans          = (params = {}) => api.get('/post-treatment/plans/', { params })
export const getPlanById       = (id)          => api.get(`/post-treatment/plans/${id}/`)
export const createPlan        = (data)        => api.post('/post-treatment/plans/', data)
export const updatePlan        = (id, data)    => api.put(`/post-treatment/plans/${id}/`, data)
export const cancelPlan        = (id)          => api.patch(`/post-treatment/plans/${id}/`, { status: 'cancelled' })

// Presets
export const getConditionPresets = ()          => api.get('/post-treatment/presets/')

// Plan steps
export const getPlanSteps      = (planId)      => api.get(`/post-treatment/plans/${planId}/steps/`)

// Message log
export const getMessageLog     = (planId)      => api.get(`/post-treatment/plans/${planId}/messages/`)
export const getPatientMessages= (patientId, params = {}) =>
  api.get(`/post-treatment/patients/${patientId}/messages/`, { params })
export const sendManualMessage = (planId, content) =>
  api.post(`/post-treatment/plans/${planId}/messages/`, { content, message_type: 'manual' })
export const logPatientReply   = (messageLogId, content) =>
  api.post(`/post-treatment/messages/${messageLogId}/reply/`, { content })  // for manual reply entry (mock)

// Critical alerts
export const getCriticalAlerts = (params = {}) => api.get('/post-treatment/alerts/', { params })
export const acknowledgeAlert  = (id)          => api.patch(`/post-treatment/alerts/${id}/`, { status: 'acknowledged' })
export const resolveAlert      = (id, notes)   => api.patch(`/post-treatment/alerts/${id}/`, { status: 'resolved', resolution_notes: notes })
export const markPatientCalled = (id)          => api.post(`/post-treatment/alerts/${id}/mark-called/`)
```

---

## 5. SCHEDULE BUILDER ENGINE — src/lib/scheduleBuilder.js

The core logic that computes plan steps from the schedule configuration.
Runs client-side for live preview before submission; backend recomputes
authoritatively on save.

```js
/**
 * Computes an array of day offsets based on schedule mode.
 * @returns number[] — e.g. [1, 4, 7, 10]
 */
export function computeScheduleDays({ schedule_mode, interval_days, total_messages, custom_days }) {
  if (schedule_mode === 'custom') {
    return [...custom_days].sort((a, b) => a - b)
  }
  // interval mode: day 1, then +interval_days each subsequent message
  const days = []
  for (let i = 0; i < total_messages; i++) {
    days.push(1 + i * interval_days)
  }
  return days
}

/**
 * Converts day offsets into actual calendar dates given a start date.
 */
export function computeScheduleDates(startDateString, dayOffsets) {
  const start = new Date(startDateString)
  return dayOffsets.map(offset => {
    const d = new Date(start)
    d.setDate(d.getDate() + offset - 1)   // day 1 = start_date itself
    return d.toISOString().split('T')[0]
  })
}

/**
 * Human-readable summary of a schedule for display before saving.
 * e.g. "4 messages over 10 days: Day 1, Day 4, Day 7, Day 10"
 */
export function describeSchedule({ schedule_mode, interval_days, total_messages, custom_days }) {
  const days = computeScheduleDays({ schedule_mode, interval_days, total_messages, custom_days })
  const span = days[days.length - 1] - days[0] + 1
  const dayList = days.map(d => `Day ${d}`).join(', ')
  return `${days.length} message${days.length !== 1 ? 's' : ''} over ${span} day${span !== 1 ? 's' : ''}: ${dayList}`
}

/**
 * Validation: ensure schedule config is coherent before submit.
 */
export function validateSchedule({ schedule_mode, interval_days, total_messages, custom_days }) {
  const errors = {}
  if (schedule_mode === 'interval') {
    if (!interval_days || interval_days < 1) errors.interval_days = 'Must be at least 1 day'
    if (!total_messages || total_messages < 1) errors.total_messages = 'Must be at least 1 message'
    if (total_messages > 30) errors.total_messages = 'Maximum 30 messages per plan'
  }
  if (schedule_mode === 'custom') {
    if (!custom_days || custom_days.length === 0) errors.custom_days = 'Select at least 1 day'
    if (custom_days?.some(d => d < 1 || d > 90)) errors.custom_days = 'Days must be between 1 and 90'
    if (new Set(custom_days).size !== custom_days?.length) errors.custom_days = 'Duplicate days not allowed'
  }
  return errors
}
```

---

## 6. SHARED COMPONENTS

### 6A. src/components/postTreatment/ScheduleTimeline.jsx
A visual horizontal timeline showing scheduled message days.
```
Day 1 ●──────● Day 4 ──────● Day 7 ────────● Day 10
      sent    sent          pending          pending
```
Props: dayOffsets (number[]), stepStatuses (array matching status per step, optional)
- Container: `flex items-center w-full relative py-6`
- Base line: `absolute h-0.5 bg-hairline left-0 right-0 top-1/2 -translate-y-1/2`
- Each day marker: positioned proportionally along the line based on day_offset
  relative to max day_offset
- Marker circle: `w-3 h-3 rounded-full` — color by status:
    sent/replied: bg-green-500
    pending (future): bg-slate-300 border-2 border-canvas
    missed: bg-rose-500
  Today indicator: if a day falls on today, add a pulsing ring
    `ring-4 ring-brand/20 animate-pulse-brand`
- Label below each marker: "Day [N]" font-mono text-[10px] text-slate
- If no stepStatuses provided (preview mode before saving): all markers bg-brand-light
  border-2 border-brand (neutral "will be scheduled" state)

### 6B. src/components/postTreatment/ScheduleModeToggle.jsx
Same pill-radio pattern as existing/new-patient toggle:
```
[ Recurring Interval ]   [ Custom Days ]
```

### 6C. src/components/postTreatment/IntervalBuilder.jsx
Shown when mode = "interval":
```
"Send a message every [interval_days] day(s), for a total of [total_messages] message(s)"
```
Two number inputs inline within the sentence (styled as compact inputs,
w-16, centered text, font-mono):
  interval_days: min 1, max 30
  total_messages: min 1, max 30
Live preview below: describeSchedule() text + ScheduleTimeline preview

### 6D. src/components/postTreatment/CustomDaysBuilder.jsx
Shown when mode = "custom":
A row of toggleable day chips for Day 1 through Day 30 (scrollable horizontal row):
```jsx
// Each day chip: w-9 h-9 rounded-lg border flex items-center justify-center
// Selected: bg-brand text-white border-brand font-semibold
// Unselected: bg-mist text-slate border-hairline hover:border-brand/40
// font-mono text-[12px]
```
Plus a "Custom day" text input for entering days beyond 30 if needed (rare case) —
"Add day…" small input + button, appends to selection if valid.
Selected days shown as removable chips above the grid (sorted ascending).
Live preview: describeSchedule() + ScheduleTimeline.

### 6E. src/components/postTreatment/ConditionPresetPicker.jsx
A horizontal scrollable row of preset cards shown at the TOP of the plan
creation form (optional quick-start):
```
[ Cardiac ]  [ Hepatitis ]  [ Viral Fever ]  [ Custom ]
```
Each preset card: `bg-canvas border border-hairline rounded-xl px-4 py-3
  hover:border-brand hover:bg-brand-light/20 cursor-pointer transition-all
  min-w-[140px]`
  Condition name: Outfit 600 text-[13px]
  Schedule summary: Outfit 400 text-[11px] text-slate mt-1 (from describeSchedule())
Selecting a preset: pre-fills schedule_mode, interval_days/total_messages or
custom_days, AND condition field — but everything remains editable afterward.
"Custom" option: clears all pre-fills, doctor builds from scratch.

### 6F. src/components/postTreatment/MessageBubble.jsx
Reuses the same visual language as the Chat module's MessageBubble but adapted:
```
Outbound (system → patient): right-aligned, bg-brand text-white rounded-[18px]
  rounded-br-[4px] — includes a small WhatsApp icon (lucide MessageCircle)
  badge in top-right corner of bubble, text-[9px] "WhatsApp"
Inbound (patient reply): left-aligned, bg-mist text-slate-900 rounded-[18px]
  rounded-bl-[4px]
Critical flag: if is_critical_flag, add a rose-tinted left border (3px) +
  small alert-triangle icon before the message content, text-rose-500
Delivery status (outbound only): small text below bubble, right-aligned
  "Delivered" / "Read" / "Failed" font-mono text-[10px] text-slate/60
  "Failed" in text-rose-500
Timestamp: font-mono text-[10px] text-slate/50 below bubble
```

### 6G. src/components/postTreatment/CriticalAlertBadge.jsx
```
pending:      bg-rose-50 text-rose-700 border-rose-200 · pulsing dot · "Needs Call"
acknowledged: bg-amber-50 text-amber-700 border-amber-200 · "Acknowledged"
resolved:     bg-green-50 text-green-700 border-green-200 · "Resolved"
```
Same pill structure as other status badges.

### 6H. src/components/postTreatment/PlanStatusBadge.jsx
```
active:    bg-brand-light text-brand border-brand/20 · pulsing dot · "Active"
completed: bg-green-50 text-green-700 border-green-200 · "Completed"
cancelled: bg-slate-100 text-slate-500 border-slate-200 · "Cancelled"
```

---

## 7. QA FOR PROMPT 1

### Schedule builder engine
[ ] computeScheduleDays interval mode: interval=3, total=4 → [1,4,7,10]
[ ] computeScheduleDays custom mode: returns sorted custom_days array
[ ] computeScheduleDates: Day 1 = start_date itself (not start_date + 1)
[ ] describeSchedule: correct plain-English summary for both modes
[ ] validateSchedule: interval_days=0 → error; total_messages=31 → error (max 30)
[ ] validateSchedule: custom_days with duplicate → error
[ ] validateSchedule: custom_days=[] → error "select at least 1 day"

### Components
[ ] ScheduleTimeline: markers position proportionally, not evenly spaced regardless of gaps
[ ] ScheduleTimeline: today's date gets pulsing ring if it falls on a scheduled day
[ ] IntervalBuilder: live preview updates as numbers change (no submit needed)
[ ] CustomDaysBuilder: clicking a day chip toggles selection, updates preview live
[ ] ConditionPresetPicker: selecting a preset pre-fills but remains editable
[ ] MessageBubble: critical flag shows rose border + icon only when is_critical_flag=true
[ ] CriticalAlertBadge: 3 states render distinctly, pending has pulsing dot

### RBAC
[ ] canCreatePlan: false for admin and receptionist
[ ] canEditPlan: false for a doctor viewing another doctor's plan
[ ] canEditPlan: false if plan.status !== 'active' (cannot edit completed/cancelled)
[ ] canAcknowledgeAlert: false for receptionist

---

---

# MASTER PROMPT 2 — Pages: Plan Creation, Patient Timeline, Message Log, Critical Alerts Queue

## Role
Senior frontend engineer. Build all post-treatment pages using Prompt 1's
foundation. Production quality, complete code.

---

## 1. ROUTES — add to App.jsx

```
/post-treatment/plans/new                     → CreatePlan (doctor only)
                                                  query param: ?patient=:id&appointment=:id
/post-treatment/plans/:id                      → PlanView (all roles, scoped)
/post-treatment/plans/:id/edit                 → EditPlan (doctor, own, active only)
/post-treatment/alerts                         → CriticalAlertsQueue (admin, doctor, receptionist)
```

Entry points into plan creation (add these buttons to EXISTING pages, don't
build new pages for them):

**On PatientView page (/patients/:id):**
Add a new section "Post-Treatment Plans" below the Consultation History section:
- Lists any existing plans for this patient (PlanCard mini component)
- "+ Create Post-Treatment Plan" button — visible only if canCreatePlan(user)
  AND the viewing doctor has a completed appointment with this patient
  → navigates to /post-treatment/plans/new?patient=:id

**On AppointmentView page (/appointments/:id), when status='completed':**
Add a banner/card at the bottom: "Set up a post-treatment plan for this visit?"
  "+ Create Plan" button → /post-treatment/plans/new?patient=:patientId&appointment=:id

**Sidebar:** Add "Post-Treatment" or fold into existing nav — actually, since
this isn't a standalone list-everything module but contextual + an alerts queue,
add ONE sidebar item:
```
Critical Alerts → /post-treatment/alerts   (lucide PhoneCall icon)
  Badge: pending alert count (rose, same UnreadBadge component from chat)
  Visible to: admin, doctor, receptionist
```

---

## 2. CREATE PLAN PAGE — /post-treatment/plans/new

Guard: if !canCreatePlan(user) → navigate to / on mount.
Read `patient` and `appointment` query params on mount, fetch patient details
via getPatientById(patientId) to show context.

**Layout:** Centered card, max-w-2xl, `bg-canvas rounded-card shadow-card p-8`

**Header:**
"Create Post-Treatment Plan" Outfit 700 22px
Patient context card below title (not a separate section — inline):
`bg-mist rounded-xl p-3 flex items-center gap-3 mt-3 mb-6`
Avatar md + flex col: patient name (Outfit 600 14px) + phone (font-mono 12px text-slate)
+ "from visit on [appointment date]" text-slate 12px if appointment_id present

**Step 1 — Condition & Context:**
| Field | Type | Validation |
|---|---|---|
| Condition | text | required — "Cardiac Follow-up", "Hepatitis B", etc. |
| Doctor Notes | textarea (2 rows) | optional — why this schedule was chosen |

ConditionPresetPicker rendered above the Condition field — selecting a preset
fills the Condition field with the preset name too.

**Step 2 — Schedule Configuration:**
Section heading: "Message Schedule"
ScheduleModeToggle → renders IntervalBuilder or CustomDaysBuilder based on selection
Both show live ScheduleTimeline preview.

**Step 3 — Start Date:**
| Field | Type | Validation |
|---|---|---|
| Start Date | date | required, defaults to today, cannot be more than 7 days in the past |

Helper text: "Day 1 of the schedule begins on this date."

**Live Full Preview Card** (updates as any field above changes):
`bg-brand-light/30 border border-brand/20 rounded-xl p-4 mt-5`
lucide Calendar size-[16px] text-brand inline mr-2
"[describeSchedule() output]" Outfit 500 text-[13px] text-slate-900
Below: list of actual computed dates (from computeScheduleDates):
  "Mar 15, Mar 18, Mar 21, Mar 24" font-mono text-[12px] text-slate mt-1

**Actions:**
Cancel → navigate back to /patients/:id (or wherever they came from)
"Create Plan" → brand solid, loading spinner
On success: toast "Post-treatment plan created", navigate to /post-treatment/plans/:id

**Validation (uses validateSchedule() from Prompt 1):**
All errors shown inline below their respective fields, fire simultaneously on submit.

---

## 3. PLAN VIEW PAGE — /post-treatment/plans/:id

Guard: if doctor role and plan.doctor_id !== user.user_id → 403 handling
(redirect to /not-available or show "not authorized" card).

**Topbar:** title = condition name, subtitle = patient name

**Section 1 — Plan Overview Card**
`bg-canvas rounded-card shadow-card p-6`
Top row: PlanStatusBadge (right) + condition title (left, Outfit 700 20px)
Patient info row: Avatar + name + phone + "View Patient →" link to /patients/:id
Doctor info row (if admin/receptionist viewing): "Dr. [name]" + specialization
Schedule summary: describeSchedule() text
Dates: "Started [start_date]" · "[N] of [total] messages sent"

Actions (top-right, RBAC gated):
  Edit (if canEditPlan) → /post-treatment/plans/:id/edit
  Cancel Plan (if canEditPlan, and status=active) → confirmation modal →
    cancelPlan(id) → toast → status updates to Cancelled badge

**Section 2 — Schedule Timeline (full width)**
`bg-canvas rounded-card shadow-card p-6 mt-4`
Title: "Message Schedule"
ScheduleTimeline component with real stepStatuses from getPlanSteps(id)
Below timeline: a compact list of each step:
```
Day 1  · Mar 15 · Sent · Delivered      [View Message]
Day 4  · Mar 18 · Sent · Read           [View Message]
Day 7  · Mar 21 · Pending               —
Day 10 · Mar 24 · Pending               —
```
Each row: font-mono text-[12px], status via small colored dot + label,
"View Message" link (if sent) scrolls to that message in the thread below.

**Section 3 — WhatsApp Message Thread (full width)**
`bg-canvas rounded-card shadow-card overflow-hidden mt-4`
Header: `bg-[#075E54] px-5 py-3 flex items-center gap-2` (WhatsApp brand green —
  the ONLY place in the entire app this color appears, deliberately signaling
  "this is the WhatsApp channel")
  lucide MessageCircle size-[18px] text-white
  "WhatsApp Conversation" Outfit 600 text-[14px] text-white
  Patient phone: font-mono text-[12px] text-white/70 ml-auto

Message area: `bg-[#E5DDD5] p-4 max-h-[500px] overflow-y-auto` (WhatsApp's
  characteristic beige chat background — again, only in this thread view)
  Uses MessageBubble component for each MessageLog entry, chronological order.
  Date separators between different days (same pattern as chat module).

Empty state (plan just created, no messages sent yet):
  lucide Clock size-32 text-slate/30 mb-2
  "First message scheduled for [Day 1 date]" text-slate-900 14px
  centered, on white bg (not the beige) — this replaces the beige area entirely

**Manual message composer (for doctor to send an ad-hoc message):**
`border-t border-hairline bg-canvas p-3 flex gap-2`
Textarea (auto-expand) + Send button — same style as chat module input.
On send: calls sendManualMessage(planId, content) — appears in thread
immediately (optimistic), tagged message_type='manual'.
RBAC: only visible if canEditPlan(user, plan) — receptionist/admin see read-only thread.

**Mock reply entry (since WhatsApp API is static/mocked this phase):**
Below the composer, a collapsed "Log a patient reply" link (dev/testing utility,
styled subtly, text-slate text-[12px] italic) — expands a small form:
  Textarea + "Log Reply" button → calls logPatientReply(messageLogId, content)
  This simulates what a real WhatsApp webhook would populate automatically.
  Only visible if canEditPlan(user, plan) — this is a stand-in until real
  WhatsApp Business API webhook integration replaces it.

---

## 4. CRITICAL ALERTS QUEUE PAGE — /post-treatment/alerts

Accessible to admin, doctor (own patients only — server-scoped), receptionist (read-only).

**Topbar:** "Critical Alerts" · subtitle "Patients requiring immediate follow-up call"

**Stats strip (3 cards):**
| Card | Icon | Label | Value |
|---|---|---|---|
| Pending | lucide PhoneCall (rose chip) | "Needs Call" | count status=pending |
| Acknowledged | lucide PhoneForwarded (amber chip) | "In Progress" | count status=acknowledged |
| Resolved Today | lucide PhoneOff (green chip) | "Resolved Today" | count resolved today |

**Filter bar:**
Status chips: All | Pending | Acknowledged | Resolved
Search: by patient name

**Alert list (not a table — card list, since these need prominent action buttons):**

Each alert card: `bg-canvas rounded-card shadow-card p-5 mb-3
  border-l-4` — border color by status (rose/amber/green matching CriticalAlertBadge)

Layout:
Left: Avatar md + patient name (Outfit 600 15px) + phone (font-mono 12px)
      "+ [condition]" chip inline
Center: trigger_reason text (Outfit 400 14px text-slate-900) —
  "Patient reported severe chest pain during Day 4 check-in"
  Timestamp below: "2 hours ago" font-mono 11px text-slate
Right: CriticalAlertBadge + action buttons stacked:

**Pending state actions:**
  "Mark Called" button (brand solid, phone icon) → opens a small confirm:
    "Confirm you have called [patient name]?" → on confirm:
    markPatientCalled(id) → status becomes 'acknowledged', toast "Marked as called"
  "View Plan" ghost link → /post-treatment/plans/:planId

**Acknowledged state actions:**
  "Resolve" button (green ghost) → opens a small modal:
    Textarea "Resolution notes (what happened on the call)" required
    "Mark Resolved" button → resolveAlert(id, notes) → status='resolved'

**Resolved state:**
  Shows "Resolved by [admin/doctor name] · [date]" text-slate 12px
  Resolution notes shown in a collapsed/expandable text block
  No action buttons — read-only history

**Pulsing urgency indicator:**
Pending alerts older than 1 hour: card gets a subtle rose-tinted background
`bg-rose-50/30` in addition to the border, to visually escalate urgency the
longer it sits unresolved.

**Empty state:**
lucide ShieldCheck size-44 text-green-500/30 mb-3
"No critical alerts" Outfit 600 16px text-slate-900
"All patients are stable" text-slate 13px

**Real-time consideration:**
This page should poll for new alerts every 30s (setInterval + refetch) since
WebSocket infrastructure exists for chat but critical alerts are a separate
concern — simple polling is sufficient and simpler to reason about for a
safety-critical queue. Show a subtle "Updated just now" / "Updated 12s ago"
indicator in the topbar area so staff trust the data is live.

Pagination: 10 per page, ordering=-created_at (most recent first), but
PENDING alerts always sort to the top regardless of age (safety-critical:
never bury an unresolved critical alert below older resolved ones).

---

## 4A. CRITICAL ALERTS COMPLETE FLOW — end-to-end

Critical alerts are the safety workflow inside post-treatment follow-up. The
flow starts when a patient reply looks clinically concerning and ends only when
an authorized user resolves the alert with notes. Every alert must be traceable
back to the exact MessageLog that triggered it.

### Flow overview

```
Doctor creates PostTreatmentPlan
  → PlanStep schedule is generated
  → scheduled/mock WhatsApp check-in is sent
  → MessageLog outbound entry is created
  → patient reply is logged manually now, or via webhook in future
  → MessageLog inbound entry is created
  → critical keyword detection runs immediately
  → if critical: MessageLog.is_critical_flag = true
  → CriticalAlert is created with status='pending'
  → sidebar badge + Critical Alerts Queue show the alert
  → doctor/admin calls patient and marks alert acknowledged
  → doctor/admin resolves alert with required resolution notes
  → alert remains in history as resolved
```

### 1. Plan and scheduled check-in

1. Doctor creates a PostTreatmentPlan for a patient after a completed
   appointment.
2. Backend generates PlanStep records from the selected schedule.
3. On each scheduled day, the daily send task finds pending PlanSteps for active
   plans.
4. The task creates an outbound MessageLog with message_type='template' and
   sends through the mock WhatsApp provider.
5. The linked PlanStep moves from pending to sent and stores message_log_id.

### 2. Patient reply capture

For this phase, patient replies are static/mocked:

1. Doctor opens the PlanView message thread.
2. Doctor expands "Log a patient reply".
3. Doctor enters the patient's reply text.
4. Frontend calls logPatientReply(messageLogId, content).
5. Backend creates an inbound MessageLog linked to the same plan and PlanStep.

Future real WhatsApp phase:

1. WhatsApp webhook receives the patient's inbound message.
2. Backend matches the phone number to the patient.
3. Backend finds the active post-treatment plan/thread context.
4. Backend creates the same inbound MessageLog shape.
5. The same critical detection flow runs without changing the alert UI.

### 3. Critical detection

Detection runs immediately after any inbound MessageLog is created.

Rules:
- Normalize reply content with trim + case-insensitive matching.
- Scan the content against CRITICAL_KEYWORDS.
- Match whole clinical phrases where possible, especially "chest pain",
  "cannot breathe", and "help me".
- Do not trigger alerts from outbound template/manual messages.
- Do not create duplicate CriticalAlert records if the same MessageLog is
  processed more than once.

Critical keywords for this phase:

```js
[
  'severe',
  'unbearable',
  'emergency',
  'chest pain',
  "can't breathe",
  'cannot breathe',
  'shortness of breath',
  'bleeding',
  'faint',
  'fainted',
  'unconscious',
  'very bad',
  'worse',
  'worst',
  'help me',
  'urgent',
]
```

### 4. Alert creation

If a keyword matches:

1. Set inbound MessageLog.is_critical_flag = true.
2. Create CriticalAlert:
   - patient_id, patient_name, patient_phone copied from the patient snapshot
   - plan_id copied from the message's plan
   - message_log_id set to the exact inbound critical reply
   - condition copied from PostTreatmentPlan.condition
   - trigger_reason = `Patient reported: "[first 100 chars of reply]"`
   - status = 'pending'
   - acknowledged_by = null
   - resolved_at = null
3. Keep the MessageLog in the conversation thread with the critical visual flag.
4. Keep the PlanStep status as replied if the reply belongs to a scheduled step.

If no keyword matches:

1. Create the inbound MessageLog normally.
2. Set is_critical_flag = false.
3. Do not create a CriticalAlert.
4. If linked to a PlanStep, set that PlanStep status to replied.

### 5. Alert surfacing

After a CriticalAlert is created:

1. /post-treatment/alerts includes it on the next fetch or 30-second poll.
2. Sidebar "Critical Alerts" badge increments the pending count.
3. PlanView message thread shows the critical reply with the rose alert styling.
4. Pending alerts sort above acknowledged and resolved alerts, regardless of
   timestamp.
5. Pending alerts older than 1 hour get the rose-tinted escalation background.

Visibility:
- Admin sees all alerts.
- Doctor sees only alerts for their own patients/plans.
- Receptionist sees all alerts for coordination awareness, but cannot mutate
  status.

### 6. Pending alert actions

Pending is the only urgent state. The alert means "this patient needs a call."

Allowed users:
- Admin
- Owning doctor

Actions:
1. User clicks "Mark Called".
2. UI asks for confirmation: "Confirm you have called [patient name]?"
3. On confirm, frontend calls markPatientCalled(id).
4. Backend sets:
   - status = 'acknowledged'
   - acknowledged_by = request.user
   - acknowledged_at = now()
5. UI updates the card from Needs Call to Acknowledged.
6. Pending badge count decreases.

Receptionist behavior:
- Can view patient name, phone number, condition, trigger reason, and timestamp.
- Does not see Mark Called or Resolve buttons.
- Can open the plan read-only if they need context.

### 7. Acknowledged alert actions

Acknowledged means the patient has been contacted or the call is in progress,
but the clinical outcome has not been finalized.

Allowed users:
- Admin
- Owning doctor

Actions:
1. User clicks "Resolve".
2. Modal opens with required "Resolution notes".
3. Empty notes block submit.
4. On submit, frontend calls resolveAlert(id, notes).
5. Backend sets:
   - status = 'resolved'
   - resolution_notes = notes
   - resolved_at = now()
   - acknowledged_by remains the first acknowledger if already set
6. UI moves the card to resolved state and shows read-only history.

### 8. Resolved alert history

Resolved alerts are never deleted from the queue history.

Resolved card shows:
- Patient identity and phone.
- Original trigger_reason.
- Original condition context.
- Resolved by [name].
- Resolved date/time.
- Expandable resolution notes.

No action buttons show after resolution.

### 9. Failure and edge behavior

| Scenario | Required behavior |
|---|---|
| Same inbound MessageLog processed twice | Do not create duplicate alerts for the same message_log_id |
| Multiple different critical replies in one plan | Create separate alerts; each reply needs its own traceable record |
| Plan cancelled after an alert exists | Alert remains visible and actionable until explicitly resolved |
| Patient has multiple active plans | Alert links to the exact plan/message thread that produced the reply |
| Alert is pending for more than 1 hour | Keep pending-first sort and add rose escalation background |
| User opens alert after plan is completed/cancelled | View Plan still opens read-only history |
| Resolve submitted with empty notes | Block submit and show field-level validation |
| Unauthorized user calls PATCH/mark-called | Backend returns 403; frontend hides buttons by RBAC |

### 10. QA checklist for critical alert flow

[ ] Non-critical reply creates inbound MessageLog but no CriticalAlert.
[ ] Critical reply sets MessageLog.is_critical_flag=true.
[ ] Critical reply creates exactly one CriticalAlert for the message_log_id.
[ ] Alert trigger_reason includes the patient's reply preview.
[ ] Critical reply appears flagged in PlanView conversation.
[ ] Alert appears in /post-treatment/alerts after refetch/poll.
[ ] Sidebar pending badge increments when alert is created.
[ ] Pending alerts always sort above acknowledged/resolved alerts.
[ ] Mark Called changes pending → acknowledged and stores acknowledged_by.
[ ] Resolve requires notes and changes acknowledged → resolved.
[ ] Cancelling the plan does not hide or auto-resolve the alert.
[ ] Receptionist can view alerts but cannot mark called or resolve.

---

## 5. EDGE CASES

| Scenario | Behaviour |
|---|---|
| Doctor creates plan for patient with no phone number recorded | Blocking error before submit: "Patient has no phone number on file. Update patient profile first." + link to /patients/:id/edit |
| Plan created but patient's condition changes mid-plan | Doctor can Cancel the plan and create a new one — no in-place condition change (keeps history clean) |
| Two plans active for same patient simultaneously (different conditions) | Allowed — e.g. cardiac follow-up + a separate fever follow-up. Both show independently on PatientView. |
| Schedule extends beyond today (future steps) | ScheduleTimeline shows pending markers correctly, no messages sent yet for future days |
| A scheduled day already passed with status still "pending" | Treat as "missed" — display as such (backend cron should have processed it; if not, frontend shows missed state, not silently pending forever) |
| Doctor edits an active plan — steps already sent | Editing only affects FUTURE unsent steps. Past sent messages remain in history untouched. Show warning: "Changes only apply to upcoming messages." |
| Manual message sent but WhatsApp delivery fails (mocked failure) | MessageBubble shows "Failed" status in rose, retry option (tap to resend) |
| Critical alert for a plan that was later cancelled | Alert remains visible and actionable — cancelling a plan does not auto-resolve alerts, they need explicit resolution |
| Patient replies before doctor even sets up a plan (shouldn't happen structurally) | Not possible — MessageLog always requires plan_step_id or plan_id context; there is no reply channel without an active plan |
| Receptionist opens Critical Alerts | Sees full list read-only — "Mark Called" button hidden, "Resolve" hidden, but they can still see everything for coordination awareness |
| Empty condition presets (new system, none configured yet) | ConditionPresetPicker shows only "Custom" option, no crash |
| Custom schedule with days like [1, 1, 5] | validateSchedule blocks duplicate day 1 before submit |
| Plan status filter combined with search | Both compose correctly, client-side after fetch |
| 0 pending alerts but some acknowledged | Stats strip shows 0 for pending (not hidden), list shows acknowledged cards |

---

## 6. RESPONSIVE

- Create Plan page: max-w-2xl centers on all widths, CustomDaysBuilder day-chip
  grid wraps naturally on narrow screens (grid-cols-6 on mobile vs grid-cols-10 desktop)
- Plan View: WhatsApp thread max-h adjusts to viewport on mobile (max-h-[60vh])
- Critical Alerts cards: stack action buttons below content on screens < 640px
  instead of side-by-side

---

## 7. QA FOR PROMPT 2

### Create Plan
[ ] Query params patient/appointment pre-populate patient context card
[ ] Preset selection fills condition + schedule fields, remains editable after
[ ] Live preview updates instantly as interval/custom days change
[ ] Patient with no phone → blocking error with link to fix, before any API call
[ ] Start date > 7 days in past → blocking error
[ ] All schedule validation errors surface inline, fire together on submit
[ ] On success: navigates to the new plan's view page

### Plan View
[ ] Doctor viewing another doctor's plan → not authorized handling (no data leak)
[ ] Schedule timeline markers match actual PlanStep statuses from API
[ ] "View Message" link scrolls thread to correct message
[ ] Cancel Plan: confirmation modal → status updates to Cancelled, badge changes
[ ] Manual message composer hidden for receptionist (read-only view)
[ ] Manual message: optimistic append, then confirmed/failed state update
[ ] Mock reply logging tool present only for canEditPlan roles
[ ] Empty message thread (new plan) shows "First message scheduled for Day 1" not empty beige box

### Critical Alerts Queue
[ ] Pending alerts always sort above acknowledged/resolved regardless of timestamp
[ ] Stats strip counts match visible list counts
[ ] "Mark Called" → confirmation → status becomes acknowledged, card border color updates
[ ] "Resolve" requires notes text, blocks submit if empty
[ ] Receptionist: no Mark Called or Resolve buttons, full read visibility otherwise
[ ] Pending alert older than 1hr → subtle rose background escalation visible
[ ] Polling updates list every 30s without full page flicker/reload
[ ] Empty state (no alerts) shows calm green shield icon, not an error look

### Sidebar
[ ] "Critical Alerts" nav item shows correct pending count badge
[ ] Badge updates live as alerts are created/resolved (poll-driven)
[ ] Visible to admin, doctor, receptionist — not filtered out for any of these three

--

---

# BACKEND API REQUIREMENTS
## Hand to backend engineer

```
# ─────────────────────────────────────────────────────────────
# DATA MODELS
# ─────────────────────────────────────────────────────────────

# PostTreatmentPlan
  id:              AutoField
  patient:         ForeignKey(Patient)
  doctor:          ForeignKey(User)
  appointment:      ForeignKey(Appointment, null=True)
  condition:        CharField(max_length=200)
  schedule_mode:    CharField choices: interval | custom
  interval_days:    IntegerField(null=True)
  total_messages:   IntegerField(null=True)
  custom_days:      JSONField(null=True)          # array of ints, e.g. [1,4,7,10]
  start_date:       DateField
  status:           CharField choices: active | completed | cancelled, default active
  notes:            TextField(blank=True)
  created_at:       DateTimeField(auto_now_add=True)

# PlanStep
  id:              AutoField
  plan:             ForeignKey(PostTreatmentPlan, related_name='steps')
  day_offset:       IntegerField
  scheduled_date:   DateField                      # computed on creation: start_date + day_offset - 1
  status:           CharField choices: pending | sent | replied | missed, default pending
  message_log:      ForeignKey(MessageLog, null=True, related_name='+')

# MessageLog
  id:              AutoField
  plan_step:        ForeignKey(PlanStep, null=True, related_name='messages')
  plan:             ForeignKey(PostTreatmentPlan, null=True)   # for manual/ad-hoc messages
  patient:          ForeignKey(Patient)
  patient_phone:    CharField(max_length=20)        # snapshot at send time
  direction:        CharField choices: outbound | inbound
  message_type:     CharField choices: template | reply | manual
  content:          TextField
  sent_at:          DateTimeField(auto_now_add=True)
  delivery_status:  CharField choices: queued|sent|delivered|read|failed, default queued
  is_critical_flag: BooleanField(default=False)

# CriticalAlert
  id:              AutoField
  patient:          ForeignKey(Patient)
  plan:             ForeignKey(PostTreatmentPlan)
  message_log:       ForeignKey(MessageLog)
  trigger_reason:    TextField
  status:            CharField choices: pending|acknowledged|resolved, default pending
  acknowledged_by:   ForeignKey(User, null=True)
  acknowledged_at:   DateTimeField(null=True)
  resolved_at:       DateTimeField(null=True)
  resolution_notes:  TextField(blank=True)
  created_at:        DateTimeField(auto_now_add=True)

# ConditionPreset (admin-configurable convenience templates — optional seed data)
  id:              AutoField
  condition_name:   CharField(max_length=200)
  schedule_mode:    CharField choices: interval | custom
  interval_days:    IntegerField(null=True)
  total_messages:   IntegerField(null=True)
  custom_days:      JSONField(null=True)

# ─────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────

# Plans
GET  /api/post-treatment/plans/
  → paginated, ordering=-created_at
  → query params: patient (id), doctor (id), status
  → RBAC: doctor sees only own plans; admin/receptionist see all

POST /api/post-treatment/plans/
  → body: patient, appointment (optional), condition, schedule_mode,
    interval_days/total_messages OR custom_days, start_date, notes
  → validation:
      patient must have a phone number on file → 400 if missing:
        { detail: "Patient has no phone number on file." }
      schedule config validated server-side mirroring validateSchedule() logic
      start_date not more than 7 days in the past
  → on create: auto-generate PlanStep records for each computed day_offset
    (scheduled_date = start_date + day_offset - 1)
  → RBAC: doctor only, and only for their own patients (verify doctor has a
    completed appointment with this patient)

GET  /api/post-treatment/plans/:id/
  → single plan with nested steps summary
  → RBAC: doctor (own only) → 403 otherwise; admin/receptionist → all

PUT  /api/post-treatment/plans/:id/
  → update condition/notes and FUTURE unsent steps only
  → past sent PlanSteps are immutable
  → RBAC: doctor, own, status=active only

PATCH /api/post-treatment/plans/:id/
  → used for status changes: { status: 'cancelled' } or { status: 'completed' }
  → on cancel: does NOT delete existing PlanSteps/MessageLogs (history preserved)
    but stops any future scheduled sends for pending steps
  → RBAC: doctor, own, active only

# Plan Steps
GET  /api/post-treatment/plans/:id/steps/
  → list of PlanStep for this plan, ordered by day_offset
  → RBAC: same as plan view

# Presets
GET  /api/post-treatment/presets/
  → list of ConditionPreset (admin-seeded)
  → RBAC: all authenticated (doctor needs this for the picker)

# Messages
GET  /api/post-treatment/plans/:id/messages/
  → paginated MessageLog for this plan, ordering=sent_at ascending
  → RBAC: same as plan view

POST /api/post-treatment/plans/:id/messages/
  → body: { content, message_type: 'manual' }
  → creates outbound MessageLog, direction='outbound'
  → triggers mock WhatsApp send (see §Mock Integration below)
  → RBAC: doctor, own, active plan only

POST /api/post-treatment/messages/:id/reply/
  → body: { content }
  → creates inbound MessageLog attached to same plan/plan_step, direction='inbound'
  → THIS IS A MOCK/TESTING STUB for this phase — in production this endpoint
    is replaced by a WhatsApp webhook receiver (see below)
  → runs critical-keyword detection (see §Critical Detection below)
  → RBAC: doctor, own, active plan only (dev/testing utility)

GET  /api/post-treatment/patients/:id/messages/
  → all messages across all plans for a patient (for a unified patient-level view if needed)
  → RBAC: doctor (if has a plan with this patient) / admin / receptionist

# Critical Alerts
GET  /api/post-treatment/alerts/
  → paginated, custom ordering: pending status ALWAYS first (regardless of
    created_at), then acknowledged, then resolved — within each status group,
    order by -created_at
  → query params: status, search (patient name)
  → RBAC: doctor sees alerts for own patients only; admin/receptionist see all

PATCH /api/post-treatment/alerts/:id/
  → body: { status: 'acknowledged' } or { status: 'resolved', resolution_notes }
  → sets acknowledged_by = request.user, acknowledged_at = now() on ack
  → sets resolved_at = now() on resolve
  → RBAC: admin, doctor (own patients only) — 403 for receptionist

POST /api/post-treatment/alerts/:id/mark-called/
  → shortcut: sets status='acknowledged', acknowledged_by=request.user,
    acknowledged_at=now()
  → RBAC: admin, doctor (own patients only) — 403 for receptionist

# ─────────────────────────────────────────────────────────────
# SCHEDULED MESSAGE SENDING (Celery periodic task)
# ─────────────────────────────────────────────────────────────

# A daily Celery beat task (runs once per day, e.g. 8:00 AM clinic time):
#   1. Query all PlanStep where scheduled_date = today AND status = 'pending'
#      AND plan.status = 'active'
#   2. For each: generate message content from a template based on plan.condition
#      (simple templated text for this phase — e.g.
#      "Hi [patient_name], this is a check-in for your [condition] recovery.
#       How are you feeling today? Reply with: Good / OK / Not Well")
#   3. Send via mock WhatsApp send function (see below)
#   4. Create MessageLog (direction='outbound', message_type='template')
#   5. Update PlanStep.status = 'sent', link message_log

# A separate daily task marks any PlanStep where scheduled_date < today AND
# status still 'pending' as 'missed' (safety net for any failed sends).

# ─────────────────────────────────────────────────────────────
# MOCK WHATSAPP INTEGRATION (this phase only)
# ─────────────────────────────────────────────────────────────

# No real WhatsApp Business API call yet. Implement a mock_whatsapp_send()
# function that:
#   - Logs the outgoing message (already covered by MessageLog creation)
#   - Simulates delivery_status progression: queued → sent → delivered
#     (can just set delivery_status='sent' immediately for this phase,
#     or simulate a short delay via Celery task chaining if desired)
#   - Returns success (no real external call)

# Structure this as an interface (e.g. WhatsAppProvider abstract class /
# a single send_whatsapp_message(phone, content) function) so that swapping
# in the real WhatsApp Business API later is a drop-in replacement without
# touching the Plan/PlanStep/MessageLog logic above it.

# Future phase (not now): real webhook endpoint
#   POST /api/webhooks/whatsapp/
#   Receives inbound messages from Meta's WhatsApp Business API,
#   matches phone number to patient, creates inbound MessageLog,
#   runs critical detection. This replaces the manual
#   /api/post-treatment/messages/:id/reply/ stub endpoint.

# ─────────────────────────────────────────────────────────────
# CRITICAL DETECTION (simple keyword-based, this phase)
# ─────────────────────────────────────────────────────────────

# On any inbound MessageLog creation, run a simple keyword scan against
# content (case-insensitive):
CRITICAL_KEYWORDS = [
  'severe', 'unbearable', 'emergency', 'chest pain', "can't breathe",
  'cannot breathe', 'shortness of breath', 'bleeding', 'faint', 'fainted',
  'unconscious', 'very bad', 'worse', 'worst', 'help me', 'urgent'
]

# If any keyword matches:
#   1. Set MessageLog.is_critical_flag = True
#   2. Create a CriticalAlert:
#        trigger_reason = f"Patient reported: \"{content[:100]}\""
#        condition = plan.condition
#        status = 'pending'
#   3. (Future) send a push notification / SMS to the assigned doctor —
#      out of scope for this phase, just create the DB record for now.

# This is intentionally simple (keyword match) for this phase — can be
# upgraded to sentiment analysis or an LLM classification pass in a future
# iteration without changing the CriticalAlert data model.

# ─────────────────────────────────────────────────────────────
# ERROR FORMAT (consistent with all modules)
# ─────────────────────────────────────────────────────────────

  { detail: "message" }              non-field error
  { field_name: ["message"] }        field-level DRF validation error

# ─────────────────────────────────────────────────────────────
# SUMMARY TABLE — ALL ENDPOINTS
# ─────────────────────────────────────────────────────────────

  Endpoint                                        Method   Notes
  ───────────────────────────────────────────     ──────   ─────────────────────────
  /api/post-treatment/plans/                      GET      paginated, role-scoped
  /api/post-treatment/plans/                      POST     create + auto-generate steps
  /api/post-treatment/plans/:id/                  GET      single plan detail
  /api/post-treatment/plans/:id/                  PUT      edit (future steps only)
  /api/post-treatment/plans/:id/                  PATCH    status change (cancel/complete)
  /api/post-treatment/plans/:id/steps/            GET      step list for timeline
  /api/post-treatment/presets/                    GET      condition preset templates
  /api/post-treatment/plans/:id/messages/         GET      message thread
  /api/post-treatment/plans/:id/messages/         POST     manual outbound message
  /api/post-treatment/messages/:id/reply/         POST     MOCK inbound reply (testing stub)
  /api/post-treatment/patients/:id/messages/      GET      all messages for a patient
  /api/post-treatment/alerts/                     GET      pending-first ordering
  /api/post-treatment/alerts/:id/                 PATCH    acknowledge / resolve
  /api/post-treatment/alerts/:id/mark-called/     POST     shortcut acknowledge

# ─────────────────────────────────────────────────────────────
# DEPENDENCIES
# ─────────────────────────────────────────────────────────────

  celery (already likely present for other scheduled tasks)
  django-celery-beat (for the daily scheduled message task)
  No new third-party WhatsApp SDK needed yet — mock_whatsapp_send() is
  internal only for this phase.
```
