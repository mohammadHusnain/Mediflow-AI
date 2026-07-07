# MediFlow AI — Salary & Billing Module
## 2 Frontend Master Prompts + Backend Requirements

**Branch:** `feature/financial-reports`
**Stack:** React + Vite + Tailwind CSS (same config as existing modules)
**Design tokens (unchanged):**
  `--brand #4338CA` · `--brandDark #352E9E` · `--ink #14181F` · `--slate #5B6472`
  `--mist #F6F8F9` · `--hairline #E4E8EB` · `--canvas #FFFFFF`
**Fonts (unchanged):** Outfit 400/500/600/700 · DM Serif Display 400/italic · JetBrains Mono 400/500
**RBAC context:** admin + receptionist = full write access · doctor = read own salary only

---

## Module Structure (inside existing app)

Financial Reports is already in the sidebar as a collapsible nav group.
Do NOT add Billing or Salary as top-level sidebar items.
Nest them as children under Financial Reports only.

```
Financial Reports (sidebar parent — collapsible, lucide BarChart3)
│
├── Billing                  → /financial/billing
│   ├── Appointment Invoices → /financial/billing/invoices
│   ├── Payment Records      → /financial/billing/payments
│   └── Invoice History      → /financial/billing/history
│
├── Salary                   → /financial/salary
│   ├── Overview             → /financial/salary
│   ├── Salary Config        → /financial/salary/config
│   └── Salary History       → /financial/salary/history
│
└── Expenses (deferred — render placeholder only)
```

---

# MASTER PROMPT 1
# Financial Reports Shell + Complete Billing Module

---

```
You are a senior frontend engineer extending the MediFlow AI portal.
All existing design tokens, Tailwind config, font imports, AuthContext (useAuth),
api.js axios instance, ProtectedRoute, Sidebar, and Topbar are already built.
Do NOT rebuild them. Only add what is specified below.

BRANCH: feature/financial-reports
NEW FILES to create (do not touch existing files except where noted):
  src/pages/financial/FinancialLayout.jsx
  src/pages/financial/billing/InvoiceList.jsx
  src/pages/financial/billing/InvoiceDetail.jsx
  src/pages/financial/billing/PaymentRecords.jsx
  src/pages/financial/billing/InvoiceHistory.jsx
  src/components/financial/InvoiceBadge.jsx
  src/components/financial/StatCard.jsx  (reusable — also used in Prompt 2)
  src/services/billingApi.js

EXISTING FILE EDITS:
  src/App.jsx — add /financial/* routes inside ProtectedRoute
  src/components/Sidebar.jsx — add Financial Reports collapsible nav group

════════════════════════════════════════════════════════
STEP 0 — SIDEBAR UPDATE
════════════════════════════════════════════════════════

In src/components/Sidebar.jsx, add a collapsible nav group
below the existing Patients link.

Behavior: clicking "Financial Reports" toggles a sub-menu open/closed.
State: local useState isFinancialOpen. Persists to sessionStorage key
"sidebar_financial_open" so it stays open on page refresh.

Collapsed state:
  Row: flex items-center justify-between w-full px-3 py-2.5 rounded-control
    hover:bg-mist cursor-pointer group
  Left: lucide BarChart3 size-18px text-slate + Outfit 500 text-[14px] text-slate
    "Financial Reports"
  Right: lucide ChevronDown size-14px text-slate/60
    transition-transform — rotates 180deg when open

Expanded state (child links, indented pl-9 space-y-0.5 mt-0.5):
  Each child: same active pill style as main nav items but text-[13px] Outfit 500
  Children:
    "Billing"   lucide Receipt      → /financial/billing
    "Salary"    lucide Wallet       → /financial/salary
    "Expenses"  lucide TrendingDown → /financial/expenses (placeholder)

Active detection: useLocation().pathname.startsWith('/financial/billing') etc.
Active style: bg-brand/8 text-brand Outfit 600
Inactive style: text-slate hover:text-ink hover:bg-mist/60

════════════════════════════════════════════════════════
STEP 1 — ROUTE REGISTRATION IN APP.JSX
════════════════════════════════════════════════════════

Add inside the existing ProtectedRoute wrapper:

  <Route path="/financial" element={<FinancialLayout />}>
    <Route index element={<Navigate to="/financial/billing" replace />} />
    <Route path="billing" element={<Navigate to="/financial/billing/invoices" replace />} />
    <Route path="billing/invoices" element={<InvoiceList />} />
    <Route path="billing/invoices/:id" element={<InvoiceDetail />} />
    <Route path="billing/payments" element={<PaymentRecords />} />
    <Route path="billing/history" element={<InvoiceHistory />} />
    <Route path="salary" element={<SalaryOverview />} />       (built in Prompt 2)
    <Route path="salary/config" element={<SalaryConfig />} />  (built in Prompt 2)
    <Route path="salary/history" element={<SalaryHistory />} />(built in Prompt 2)
    <Route path="expenses" element={<ExpensesPlaceholder />} />
  </Route>

ExpensesPlaceholder: a simple centered card in bg-mist with lucide Construction
icon text-brand, Outfit 600 text-[18px] "Expenses module coming soon",
Outfit 400 text-[14px] text-slate subtext.

════════════════════════════════════════════════════════
STEP 2 — FINANCIAL LAYOUT (src/pages/financial/FinancialLayout.jsx)
════════════════════════════════════════════════════════

This is an inner layout that wraps all /financial/* pages.
It renders:
  1. A secondary sub-nav tab bar (horizontal, below Topbar)
  2. <Outlet /> for the active child route

Sub-nav tab bar:
  bg-canvas border-b border-hairline sticky top-[64px] z-30
  max-w-[1200px] mx-auto px-6 flex gap-0

  Three tabs: Billing · Salary · Expenses
  Each tab: a <NavLink> with className based on isActive:
    Active:   border-b-2 border-brand text-brand Outfit 600 text-[14px] px-5 py-3.5
    Inactive: text-slate hover:text-ink Outfit 500 text-[14px] px-5 py-3.5 border-b-2 border-transparent
  Tab paths: /financial/billing/invoices · /financial/salary · /financial/expenses
  isActive check: use pathname.startsWith('/financial/billing') etc.

Content area below: max-w-[1200px] mx-auto px-6 py-8

════════════════════════════════════════════════════════
STEP 3 — BILLING API SERVICE (src/services/billingApi.js)
════════════════════════════════════════════════════════

Import the existing axios instance from src/services/api.js (which already
attaches Bearer token via interceptor — do not re-implement auth).

Export these functions exactly:

  // Invoice endpoints
  getInvoices(params)          → GET /api/billing/invoices/?{status,search,date_from,date_to,page}
  getInvoice(id)               → GET /api/billing/invoices/{id}/
  downloadInvoicePDF(id)       → GET /api/billing/invoices/{id}/download/ (blob response)

  // Payment endpoints
  getPayments(params)          → GET /api/billing/payments/?{search,date_from,date_to,page}
  getPaymentSummary()          → GET /api/billing/payments/summary/

  // History
  getInvoiceHistory(params)    → GET /api/billing/invoices/history/?{page,date_from,date_to}

  // Stats
  getBillingStats()            → GET /api/billing/stats/

For downloadInvoicePDF: use axios({ responseType: 'blob' }), then create an
<a> element with URL.createObjectURL(blob) to trigger download — wrap in a
helper exported as downloadBlob(blob, filename).

All functions return response.data. Wrap each in try/catch and rethrow
so pages can catch and display errors.

════════════════════════════════════════════════════════
STEP 4 — SHARED COMPONENTS
════════════════════════════════════════════════════════

── InvoiceBadge (src/components/financial/InvoiceBadge.jsx) ──

Colored pill exactly like StatusBadge from appointments module.
Props: status (string)

Status → color mapping:
  "paid"     → text-[#0F9D66]  bg-[#E3F7EC]
  "pending"  → text-[#B45309]  bg-[#FEF3C7]
  "overdue"  → text-[#C8102E]  bg-[#FCE4E8]
  "cancelled"→ text-[#5B6472]  bg-[#F3F4F6]
  "partial"  → text-[#1D4ED8]  bg-[#E7EEFF]

Display: Outfit 600 text-[11px] uppercase tracking-wide px-2.5 py-1 rounded-full
Label: capitalize the status string (paid → "Paid", pending → "Pending" etc.)
Edge case: unknown status → render neutral gray pill with the raw string

── StatCard (src/components/financial/StatCard.jsx) ──

Props: icon (lucide component), label (string), value (string|number),
       sub (string, optional), accentColor (string, default "brand")

Layout:
  bg-canvas rounded-[16px] p-6 border border-hairline shadow-card
  flex items-start justify-between

Left:
  Outfit 500 text-[13px] text-slate mb-2 (label)
  font-display text-[32px] text-ink leading-none (value)
  Outfit 400 italic text-[12px] text-slate mt-1 (sub, if provided)

Right:
  w-11 h-11 rounded-[12px] bg-brand/10 flex items-center justify-center
  icon rendered at size-22px text-brand

Edge cases:
  value === null or undefined → show "—" in place of number
  value is number → format with toLocaleString() for comma separation
  sub is empty string → render nothing, no empty space

════════════════════════════════════════════════════════
STEP 5 — INVOICE LIST PAGE
(src/pages/financial/billing/InvoiceList.jsx)
════════════════════════════════════════════════════════

On mount: call getBillingStats() and getInvoices() in parallel with Promise.all.

─ TOPBAR CONTEXT ─
Pass to Topbar: title="Billing" subtitle="Appointment invoices and payments"

─ STATS ROW ─
4 StatCards in a grid-cols-2 lg:grid-cols-4 gap-5 mb-8:
  1. lucide Receipt      "Total Invoices"    stats.total_invoices
  2. lucide CheckCircle2 "Paid"              stats.paid_count      sub="invoices"
  3. lucide Clock        "Pending"           stats.pending_count   sub="awaiting payment"
  4. lucide DollarSign   "Revenue This Month" stats.revenue_month  sub="PKR"
     (format value as "PKR " + toLocaleString for this card only)

─ FILTER BAR ─
bg-canvas border border-hairline rounded-[12px] p-4 mb-6
flex flex-wrap gap-3 items-center

Filters (all controlled, trigger refetch on change with 300ms debounce on search):
  1. Search input: placeholder "Search patient or invoice #"
       lucide Search size-16px left icon, Outfit 400 text-[14px]
       w-[280px] border border-hairline rounded-control px-3 py-2 pl-9
       focus:border-brand focus:ring-1 focus:ring-brand outline-none
  2. Status select: options All · Paid · Pending · Overdue · Cancelled · Partial
       Same input styling, w-[140px]
  3. Date From: input type="date" w-[150px] same styling
  4. Date To:   input type="date" w-[150px] same styling
  5. Clear Filters button (only visible if any filter is active):
       ghost, Outfit 500 text-[13px] text-slate hover:text-ink
       lucide X size-14px mr-1

Edge cases:
  date_to < date_from → show inline error below the date row "End date must be after start date",
    disable the fetch, do not call API
  Empty search (after clearing) → re-fetch full list
  All filters cleared → reset to initial state

─ TABLE ─
bg-canvas rounded-[16px] border border-hairline overflow-hidden

Table header: bg-mist/60 border-b border-hairline
  Outfit 600 text-[11px] uppercase tracking-[0.08em] text-slate px-5 py-3.5

Columns:
  Invoice #    | Patient          | Doctor           | Appointment Date    | Amount       | Status  | Actions
  font-mono    | Outfit 600 text-ink | Outfit 400 text-slate | font-mono text-[12px] | font-mono text-[14px] | InvoiceBadge | —

Row hover: bg-mist/40 cursor-pointer (clicking row → /financial/billing/invoices/:id)

Actions column (Outfit 400 text-[13px] flex gap-2 items-center):
  "View"     → navigate to invoice detail  (lucide Eye size-14px)
  "Download" → call downloadInvoicePDF(id) → downloadBlob() (lucide Download size-14px)
  RBAC: "Download" only visible if user.role !== 'doctor'
    (doctors should not download patient financial records of others)

Empty state (when 0 results):
  centered, py-16:
  lucide FileX size-40px text-hairline mb-3
  font-display italic text-[18px] text-slate "No invoices found"
  Outfit 400 text-[14px] text-slate/70 "Try adjusting your filters"

─ PAGINATION ─
Bottom of table: flex justify-between items-center px-5 py-4 border-t border-hairline
  Left:  Outfit 400 text-[13px] text-slate "Showing 1–20 of {total}"
  Right: Prev / Next buttons
    bg-canvas border border-hairline rounded-control px-4 py-2 Outfit 500 text-[13px]
    Disabled state: opacity-40 cursor-not-allowed
  Page size: 20 per page, send ?page= to backend

─ LOADING STATE ─
While fetching: replace table body with 5 skeleton rows:
  Each: bg-mist/60 rounded animate-pulse h-[52px]
  Skeleton also on StatCards (replace value with w-20 h-6 bg-mist rounded animate-pulse)
Do NOT show a full-page spinner — keep the filter bar visible during load.

─ ERROR STATE ─
If API call fails: show bg-[#FCE4E8] border border-[#FFC9C9] rounded-[12px] px-5 py-4
  lucide AlertCircle text-[#C8102E] + Outfit 500 text-[14px] text-[#C8102E] inline
  "Failed to load invoices. " + "Retry" button (Outfit 600 text-brand cursor-pointer)
  Retry button calls the fetch again.

════════════════════════════════════════════════════════
STEP 6 — INVOICE DETAIL PAGE
(src/pages/financial/billing/InvoiceDetail.jsx)
════════════════════════════════════════════════════════

On mount: call getInvoice(id) where id = useParams().id

─ HEADER ─
flex justify-between items-start mb-8:
  Left:
    Back button: lucide ArrowLeft size-16px + Outfit 500 text-[14px] text-slate
      onClick navigate(-1)
    Below back button:
      font-display text-[28px] text-ink "Invoice #{invoice.invoice_number}"
      InvoiceBadge status={invoice.status} ml-3 inline-block
      Outfit 400 text-[14px] text-slate mt-1 "Generated {formatDate(invoice.created_at)}"
  Right (RBAC: hide entire right group for doctor role):
    "Download PDF" button: border border-hairline bg-canvas Outfit 600 text-[14px]
      px-5 py-2.5 rounded-control lucide Download mr-2
      onClick → downloadInvoicePDF(id) → downloadBlob()
    "Mark as Paid" button (only if invoice.status === 'pending' or 'partial'):
      bg-brand text-white Outfit 600 text-[14px] px-5 py-2.5 rounded-control
      lucide CheckCircle2 mr-2
      onClick → PATCH /api/billing/invoices/{id}/mark_paid/ then refetch

─ MAIN GRID ─
grid grid-cols-1 lg:grid-cols-3 gap-6

LEFT COLUMN (col-span-2): Invoice Card
  bg-canvas rounded-[16px] border border-hairline p-8

  Top: flex justify-between
    Left: Logo block — "M" square + "MediFlow AI" Outfit 700
    Right: font-display text-[22px] text-ink "INVOICE"
           Outfit 400 text-[13px] text-slate font-mono "#{invoice.invoice_number}"

  Divider: border-t border-hairline my-6

  Two-column info grid (grid grid-cols-2 gap-6):
    Billed To:
      Outfit 600 text-[12px] uppercase tracking-wide text-slate mb-2
      Patient name: Outfit 600 text-[16px] text-ink
      Phone: font-mono text-[13px] text-slate
      Patient ID: font-mono text-[12px] text-slate/70
    Appointment Info:
      Same label style "Appointment Details"
      Doctor: Outfit 500 text-[14px] text-ink
      Date & Time: font-mono text-[13px] text-slate
      Appointment ID: font-mono text-[12px] text-slate/70

  Divider

  Line items table:
    Header: Outfit 600 text-[11px] uppercase tracking-wide text-slate
    Columns: Description | Qty | Unit Price | Total
    One row: "Consultation Fee" | 1 | invoice.amount | invoice.amount
    All amounts: font-mono text-[14px] text-ink
    Row format: Outfit 400 text-[14px] text-ink

  Totals block (right-aligned, mt-4 border-t border-hairline pt-4):
    Subtotal: Outfit 400 text-[14px] text-slate "Subtotal" → font-mono text-[14px] text-ink
    Tax (0%): Outfit 400 text-[14px] text-slate "Tax (0%)" → font-mono text-[14px] text-ink "PKR 0"
    Grand Total: Outfit 700 text-[16px] text-ink "Total" → font-mono text-[18px] font-bold text-brand

  Payment note (if paid):
    bg-[#E3F7EC] rounded-[10px] px-4 py-3 mt-6 flex items-center gap-2
    lucide CheckCircle2 size-16px text-[#0F9D66]
    Outfit 500 text-[13px] text-[#0F9D66] "Payment received on {formatDate(invoice.paid_at)}"

  Payment note (if pending):
    bg-[#FEF3C7] rounded-[10px] px-4 py-3 mt-6
    lucide Clock size-16px text-[#B45309]
    Outfit 500 text-[13px] text-[#B45309] "Payment pending"

RIGHT COLUMN (col-span-1): Sidebar info cards (stacked, space-y-4)

  Card 1 — Invoice Meta
    bg-mist rounded-[14px] p-5 border border-hairline
    Outfit 600 text-[13px] text-ink mb-4 "Invoice Details"
    Rows (each: flex justify-between py-2 border-b border-hairline last:border-0):
      Label: Outfit 400 text-[13px] text-slate
      Value: Outfit 500 text-[13px] text-ink (font-mono for IDs and dates)
      Rows: Status · Invoice # · Created · Due Date · Payment Method

  Card 2 — Appointment Link
    Same card style
    Outfit 600 text-[13px] text-ink mb-3 "Linked Appointment"
    lucide CalendarClock size-16px text-brand mr-2
    Outfit 500 text-[14px] text-ink inline appointment date
    Outfit 400 text-[13px] text-slate block "Dr. {doctor_name}"
    "View Appointment →" Outfit 600 text-[13px] text-brand cursor-pointer
      onClick → navigate('/appointments') (filter by this appointment later)

Edge cases:
  id not found → API returns 404 → show centered card: "Invoice not found" +
    "Back to Invoices" button navigate('/financial/billing/invoices')
  invoice.doctor is null (appointment had no assigned doctor) →
    show "Unassigned" in text-slate italic
  invoice.amount is 0 → show "PKR 0" (don't hide or null it)
  invoice.paid_at is null and status is paid → show "—" for paid date, log warning

════════════════════════════════════════════════════════
STEP 7 — PAYMENT RECORDS PAGE
(src/pages/financial/billing/PaymentRecords.jsx)
════════════════════════════════════════════════════════

On mount: call getPayments() and getPaymentSummary() in parallel.

─ SUMMARY STRIP (3 cards, same StatCard component) ─
  lucide DollarSign  "Total Received"  summary.total_received  sub="all time PKR"
  lucide Calendar    "This Month"      summary.this_month      sub="PKR received"
  lucide TrendingUp  "Avg per Day"     summary.avg_daily       sub="last 30 days PKR"

─ FILTER BAR ─
Same pattern as InvoiceList:
  Search (patient name or payment ref) · Date From · Date To · Clear

─ TABLE ─
Columns:
  Payment Ref # | Patient | Invoice # | Amount | Method | Date | Status

  Payment Ref: font-mono text-[12px] text-slate
  Patient: Outfit 600 text-[14px] text-ink
  Invoice #: font-mono text-[12px] text-brand (clickable → navigate to invoice detail)
  Amount: font-mono text-[14px] text-ink "PKR {amount}"
  Method: Outfit 400 text-[13px] text-slate (Cash / Card / Online)
  Date: font-mono text-[12px] text-slate
  Status: InvoiceBadge (paid / pending / partial / refunded)

"Refunded" status additional badge color:
  text-[#7C3AED] bg-[#EDE9FE]  (purple — distinct from existing statuses)

Empty state: lucide CreditCard size-40px + "No payment records yet"
Pagination: same as InvoiceList

════════════════════════════════════════════════════════
STEP 8 — INVOICE HISTORY PAGE
(src/pages/financial/billing/InvoiceHistory.jsx)
════════════════════════════════════════════════════════

This page shows a chronological activity log of invoice events:
created, updated, status changed, downloaded, marked paid.

On mount: call getInvoiceHistory()

─ PAGE HEADER ─
font-display text-[26px] text-ink "Invoice History"
Outfit 400 text-[15px] text-slate mt-1 "Full audit trail of all invoice activity"

─ DATE FILTER ─
Two date inputs (Date From / Date To) + Clear — same style as above

─ TIMELINE VIEW ─
Vertical timeline: relative with a 2px left border border-brand/20

Each event item:
  flex items-start gap-4 mb-6 relative
  Before pseudo: absolute left-[-5px] top-2 w-[10px] h-[10px] rounded-full
    bg-brand border-2 border-canvas (dot on timeline line)

  Content card: bg-canvas border border-hairline rounded-[12px] px-5 py-4 flex-1
    Top row: flex justify-between items-center
      Left: Outfit 600 text-[14px] text-ink (event description)
        e.g. "Invoice #INV-001 created for Sarah Khan"
      Right: font-mono text-[11px] text-slate (timestamp)
    Second row: Outfit 400 text-[13px] text-slate mt-1
      e.g. "Appointment on 12 Jan 2025 · PKR 2,000 · Booked by admin@clinic.com"
    Event type icon (in the dot area, different color dots):
      created   → bg-brand
      paid      → bg-[#0F9D66]
      cancelled → bg-[#C8102E]
      updated   → bg-[#B45309]
      downloaded→ bg-[#5B6472]

Empty state: lucide History size-40px + "No history to display for this date range"
Pagination: load more button (not page numbers) — Outfit 600 text-brand border
  border-brand/30 rounded-control px-6 py-2.5 hover:bg-brand/5 mx-auto block mt-6
  only visible when response has next page
```

---

# MASTER PROMPT 2
# Complete Salary Module + Backend Requirements

---

```
Continue in the same branch: feature/financial-reports
All existing components, api.js, and design tokens are already in place.
Do not reinstall dependencies or modify existing files except App.jsx routes.

NEW FILES to create:
  src/pages/financial/salary/SalaryOverview.jsx
  src/pages/financial/salary/SalaryConfig.jsx
  src/pages/financial/salary/SalaryHistory.jsx
  src/components/financial/SalaryBadge.jsx
  src/components/financial/SalaryConfigModal.jsx
  src/services/salaryApi.js

════════════════════════════════════════════════════════
STEP 1 — SALARY API SERVICE (src/services/salaryApi.js)
════════════════════════════════════════════════════════

Import the existing axios instance (token interceptor already set).

Export exactly:

  // Overview
  getSalaryOverview()         → GET /api/salary/overview/
  getSalaryStats()            → GET /api/salary/stats/

  // Per-staff records
  getDoctorSalaries()         → GET /api/salary/doctors/
  getStaffSalaries()          → GET /api/salary/staff/
  getSalaryRecord(id)         → GET /api/salary/records/{id}/
  getOwnSalary()              → GET /api/salary/me/   (doctor-only endpoint)

  // Config
  getSalaryConfig(staffId)    → GET /api/salary/config/{staffId}/
  upsertSalaryConfig(payload) → POST /api/salary/config/upsert/
    payload: { user_id, salary_type, fixed_amount?, commission_rate?,
               commission_base?, effective_from }

  // History
  getSalaryHistory(params)    → GET /api/salary/history/?{user_id,month,year,page}
  getDisbursements(params)    → GET /api/salary/disbursements/?{month,year,page}
  markDisbursed(id)           → PATCH /api/salary/disbursements/{id}/mark_disbursed/

All functions return response.data.
Wrap each in try/catch and rethrow.

════════════════════════════════════════════════════════
STEP 2 — SHARED SALARY COMPONENTS
════════════════════════════════════════════════════════

── SalaryBadge (src/components/financial/SalaryBadge.jsx) ──

Props: type (string: "fixed" | "commission" | "mixed")

  "fixed"      → text-[#1D4ED8] bg-[#E7EEFF]  label "Fixed"
  "commission" → text-[#7C3AED] bg-[#EDE9FE]  label "Commission"
  "mixed"      → text-[#0F9D66] bg-[#E3F7EC]  label "Mixed"
  unknown      → text-[#5B6472] bg-[#F3F4F6]  label "Not Set"

Same pill style as InvoiceBadge: Outfit 600 text-[11px] uppercase tracking-wide
px-2.5 py-1 rounded-full

── SalaryConfigModal (src/components/financial/SalaryConfigModal.jsx) ──

Props: isOpen, onClose, onSaved, staffMember (object: {id, name, role, current_config})

Purpose: Admin/receptionist configures or updates salary for a staff member.
Rendered as a modal overlay — DO NOT navigate away, configure in-place.

Overlay: fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center
  Click outside modal body → call onClose()

Modal card: bg-canvas rounded-[20px] p-8 w-full max-w-[520px] shadow-[0_32px_80px_rgba(20,24,31,.2)]
  border border-hairline

Header:
  font-display text-[22px] text-ink "Configure Salary"
  Outfit 400 text-[14px] text-slate mt-1 "for {staffMember.name}"
  lucide X button top-right: text-slate hover:text-ink onClick=onClose

─ FORM (react-hook-form, all validations) ─

  Field 1 — Salary Type (required):
    Radio group (not select — more scannable):
      Two option cards side by side: grid grid-cols-2 gap-3 mt-4
      Each: border-2 rounded-[12px] p-4 cursor-pointer transition
        Unselected: border-hairline bg-mist
        Selected:   border-brand bg-brand/5
      Option A: lucide DollarSign text-brand + Outfit 600 "Fixed Salary"
                Outfit 400 text-[12px] text-slate "Monthly fixed amount"
      Option B: lucide Percent text-brand + Outfit 600 "Commission"
                Outfit 400 text-[12px] text-slate "% of each consultation"
    Register: { name: "salary_type", required: "Please select a salary type" }

  Field 2 — Fixed Amount (only visible if salary_type === "fixed"):
    Label: Outfit 500 text-[13px] text-ink "Monthly Fixed Amount (PKR)" required asterisk
    Input: type="number" min="0" step="100"
    Validation: required if type===fixed, min 1000 ("Minimum salary is PKR 1,000"),
      max 10000000 ("Please verify this amount")
    Left prefix: "PKR" text-slate Outfit 500 inside input left (pl-14 position)

  Field 3 — Commission Rate (only visible if salary_type === "commission"):
    Label: Outfit 500 text-[13px] "Commission Rate (%)"
    Input: type="number" min="0" max="100" step="0.5"
    Validation: required if type===commission, 0.1–100
    Right suffix: "%" inside input
    Below input: Outfit 400 italic text-[12px] text-slate
      "Applied to each appointment consultation fee"

  Field 4 — Commission Base (only visible if salary_type === "commission"):
    Label: "Calculate commission from"
    Select: options:
      "consultation_fee" → "Consultation Fee (per appointment)"
      "monthly_revenue"  → "Monthly Revenue Total"
    Validation: required if type===commission

  Field 5 — Effective From (always visible):
    Label: "Effective From" (required)
    Input: type="month" (YYYY-MM format)
    Default: current month
    Validation: must not be more than 3 months in the past (warn not error)
    Warning (if past): bg-[#FEF3C7] rounded-[8px] px-3 py-2 text-[#B45309]
      Outfit 400 text-[12px] "This change will apply retroactively to past records"

  Pre-fill: if staffMember.current_config is not null, pre-fill all fields with
    existing values so this acts as "update" not "create new"

─ SUBMIT ─
  "Save Salary Configuration" → bg-brand text-white Outfit 600 text-[14px] full-width
    px-6 py-3 rounded-control hover:bg-brandDark mt-6
    onClick: handleSubmit calls upsertSalaryConfig(payload)
    Loading state on button: replace text with lucide Loader2 animate-spin text-white
  
  Cancel: Outfit 500 text-[14px] text-slate text-center block mt-3 cursor-pointer
    hover:text-ink onClick=onClose

─ EDGE CASES ─
  API error on save → show error banner inside modal (not a toast):
    bg-[#FCE4E8] rounded-[10px] px-4 py-3 mt-4
    Outfit 500 text-[13px] text-[#C8102E] + error message from response.data.error
  Success → call onSaved() (parent will refetch) then onClose()
  staffMember with no name → show "this staff member" as fallback
  salary_type switches → clear validation errors of the hidden field

════════════════════════════════════════════════════════
STEP 3 — SALARY OVERVIEW PAGE
(src/pages/financial/salary/SalaryOverview.jsx)
════════════════════════════════════════════════════════

RBAC GATE (at very top of component):
  const { user } = useAuth()
  if (user.role === 'doctor') → render DoctorSalaryView (defined below)
  else → render AdminSalaryView (defined below)

─── DOCTOR SALARY VIEW ───
Shown when user.role === 'doctor'
On mount: call getOwnSalary()

Header:
  font-display text-[26px] text-ink "My Salary"
  Outfit 400 text-[14px] text-slate "Your current salary configuration and history"

Single info card: bg-canvas rounded-[20px] border border-hairline p-8 max-w-[480px]

  Top row: SalaryBadge type={salary.salary_type} + "Salary Type" label

  Salary detail:
    If fixed:
      font-display text-[42px] text-brand "PKR {amount}"
      Outfit 400 text-[14px] text-slate "per month · fixed"
    If commission:
      font-display text-[42px] text-brand "{rate}%"
      Outfit 400 text-[14px] text-slate "per consultation · commission-based"
      Below: Outfit 500 text-[13px] text-slate mt-2
        "Based on: {commission_base_label}"

  Divider mt-6 mb-6 border-t border-hairline

  Meta row (grid grid-cols-2 gap-4):
    "Effective From": font-mono text-[13px] text-ink
    "Configured By":  Outfit 400 text-[13px] text-slate (admin email)
    "Last Updated":   font-mono text-[13px] text-ink
    "Status":         Outfit 500 text-[13px] text-[#0F9D66] "Active" (green dot)

  "View My Salary History" → navigate('/financial/salary/history')
    Outfit 600 text-[14px] text-brand mt-6 block text-center border
    border-brand/30 rounded-control px-5 py-2.5 hover:bg-brand/5

Edge cases for doctor view:
  salary not configured → show a friendly empty state (not an error):
    lucide Wallet size-40px text-hairline
    font-display italic text-[20px] text-slate "Salary not configured yet"
    Outfit 400 text-[14px] text-slate/70 "Contact your administrator to set up your salary."
    No configure button — doctor cannot configure own salary

─── ADMIN / RECEPTIONIST SALARY VIEW ───
On mount: getSalaryStats() + getDoctorSalaries() + getStaffSalaries() in parallel

─ STATS ROW (4 StatCards) ─
  lucide Users       "Total Staff on Salary"  stats.total_configured
  lucide DollarSign  "Fixed Salary Budget"    stats.total_fixed_monthly  sub="PKR/month"
  lucide Percent     "Commission Staff"        stats.commission_count
  lucide AlertCircle "Not Configured"          stats.not_configured
    (if stats.not_configured > 0: icon chip bg-[#FEF3C7] text-[#B45309])

─ TABS inside page (not sub-nav) ─
Two tabs: "Doctors" | "Staff" (not full SubNav — just small local tabs)
  flex border-b border-hairline mb-6
  Same active/inactive pill style as FinancialLayout tabs but smaller text-[13px]

─ DOCTORS TABLE ─
Columns:
  Name           | Role      | Salary Type  | Amount / Rate  | Effective From | Configured | Actions
  (avatar initial| Outfit 400| SalaryBadge  | font-mono      | font-mono      | Yes/No badge|        )
  + name Outfit 600

Avatar: same avatarColor hash as rest of app (w-8 h-8 rounded-full initials)

Amount / Rate column:
  If fixed:      "PKR {amount.toLocaleString()}/mo" font-mono text-[14px] text-ink
  If commission: "{rate}% per appt" font-mono text-[14px] text-ink
  If not set:    "—" text-slate italic Outfit 400

Configured column:
  Yes: lucide CheckCircle2 size-16px text-[#0F9D66] + Outfit 500 text-[12px] text-[#0F9D66] "Configured"
  No:  lucide AlertCircle  size-16px text-[#B45309] + Outfit 500 text-[12px] text-[#B45309] "Not Set"

Actions:
  RBAC: only visible for admin role (not receptionist for delete; receptionist can configure)
  "Configure" button (always): Outfit 600 text-[13px] text-brand cursor-pointer
    onClick → open SalaryConfigModal with this doctor's data
  "History" button: Outfit 500 text-[13px] text-slate cursor-pointer
    onClick → navigate('/financial/salary/history', { state: { userId: doctor.id }})

─ STAFF TABLE ─
Same structure as Doctors table.
Staff have only "fixed" salary type (commission is doctor-only).
If a staff row has salary_type === 'commission' → show as bug, display
  "Invalid config" in text-[#C8102E] Outfit 500 text-[12px]

─ EMPTY STATES ─
  No doctors: lucide Stethoscope + "No doctors added yet. Add a doctor first."
  No staff:   lucide Users     + "No staff members added yet."
  Both: navigate links back to /doctors and /staff respectively

─ SalaryConfigModal usage ─
  State: useState({ open: false, staff: null }) → configModal
  <SalaryConfigModal
    isOpen={configModal.open}
    staffMember={configModal.staff}
    onClose={() => setConfigModal({ open: false, staff: null })}
    onSaved={handleRefetch}
  />
  handleRefetch: re-calls getDoctorSalaries() or getStaffSalaries()
    based on which tab is active

════════════════════════════════════════════════════════
STEP 4 — SALARY CONFIG PAGE
(src/pages/financial/salary/SalaryConfig.jsx)
════════════════════════════════════════════════════════

RBAC guard: if user.role === 'doctor' → redirect to /financial/salary immediately.
  (Doctors cannot access this page. Enforce both here and in route guard.)

On mount: getDoctorSalaries() + getStaffSalaries()

Purpose: Admin/receptionist can search for any staff member and configure their
salary without needing to go through the overview table. Entry point for
"add salary later" flow (Method 2 from requirements).

─ HEADER ─
font-display text-[26px] text-ink "Salary Configuration"
Outfit 400 text-[14px] text-slate mt-1
  "Configure or update salary for doctors and staff"

─ SEARCH & SELECT ─
bg-canvas rounded-[16px] border border-hairline p-6 mb-6

Outfit 600 text-[14px] text-ink mb-4 "Find Staff Member"

Search input: real-time filter of already-fetched staff list (no extra API call)
  placeholder "Search by name or email"
  lucide Search size-16px left icon, full-width

Results list (only shown when searchQuery.length > 0):
  bg-mist border border-hairline rounded-[12px] mt-2 max-h-[260px] overflow-y-auto
  Each result row: flex items-center justify-between px-4 py-3 hover:bg-canvas
    cursor-pointer border-b border-hairline last:border-0
    Left: avatar + name (Outfit 600 text-[14px]) + role badge (Outfit 400 text-[12px] text-slate)
    Right: SalaryBadge (current config if any) OR Outfit 400 text-[12px] text-slate "Not configured"
  Clicking a row → set selectedStaff, clear search, show config panel below

─ CONFIG PANEL (shown when selectedStaff !== null) ─
bg-canvas rounded-[16px] border border-hairline p-8 animate-fade-in

Header: flex justify-between items-center mb-6
  Left: avatar + name + role badge
  Right: lucide X button (text-slate hover:text-ink) → clear selectedStaff

Current config display (if exists):
  bg-mist rounded-[12px] p-5 mb-6
  Outfit 600 text-[13px] text-ink mb-3 "Current Configuration"
  Grid of current values (salary_type, amount/rate, effective_from, configured_by)
  font-mono for values

Inline form (same fields as SalaryConfigModal but not in a modal — inline on this page):
  Same validation rules as SalaryConfigModal
  Same salary_type radio cards
  Same conditional fields
  Submit: "Save Configuration" bg-brand text-white full-width
  Below form: Outfit 400 italic text-[12px] text-slate text-center
    "This will take effect from the selected month onwards"

Edge cases:
  selectedStaff has role 'doctor' → show commission option
  selectedStaff has role not 'doctor' → hide commission option (commission is doctors-only)
  Saving success: show success banner inside panel (not modal):
    bg-[#E3F7EC] border border-[#A7F3D0] rounded-[10px] px-4 py-3 flex items-center gap-2
    lucide CheckCircle2 text-[#0F9D66] + "Salary configuration saved successfully."
    Auto-dismiss after 4 seconds (setTimeout → clearTimeout on unmount)
  No search results: Outfit 400 text-[14px] text-slate px-4 py-3 "No staff found"

════════════════════════════════════════════════════════
STEP 5 — SALARY HISTORY PAGE
(src/pages/financial/salary/SalaryHistory.jsx)
════════════════════════════════════════════════════════

RBAC:
  Doctor → shows own history only (getOwnSalary history endpoint filtered to user.id)
  Admin/Receptionist → can view any staff's history + all disbursements

On mount (admin): getDisbursements() — current month by default
On mount (doctor): getSalaryHistory({ user_id: user.id }) auto-filtered

─ HEADER ─
Two tab row: "Salary History" | "Disbursements" (admin only — hide for doctor)
  Same local tab style as SalaryOverview

─ SALARY HISTORY TAB (default) ─

Filters:
  Admin: Staff selector (select dropdown of all staff names) + Month picker (type="month") + Clear
  Doctor: Month picker only + Clear

Table:
Columns (admin):
  Staff Member | Role | Salary Type | Month | Amount | Appointments | Total Earned | Status
  (avatar+name | Outfit 400 | SalaryBadge | font-mono | font-mono "PKR X" | number | font-mono bold text-brand | InvoiceBadge)

Columns (doctor — own view, narrower):
  Month | Salary Type | Appointments | Total Earned | Status | Actions

"Appointments" column (commission type only):
  Shows count of appointments used in commission calc
  Outfit 400 text-[13px] text-slate "{count} appts"
  If fixed salary: show "—"

"Total Earned" column:
  Fixed: same as monthly fixed amount
  Commission: calculated_amount from backend (commission_rate × total_consultation_fees)
  Display: font-mono text-[15px] text-brand font-medium "PKR {amount}"

"Status" column: InvoiceBadge repurposed:
  "disbursed" → paid color (green)
  "pending"   → pending color (amber)
  "on_hold"   → overdue color (red)

─ DISBURSEMENTS TAB (admin/receptionist only) ─

Header row:
  Month picker (type="month") + "Generate Disbursement Report" button
    border border-brand/30 text-brand Outfit 600 text-[13px] px-4 py-2 rounded-control
    onClick → (future feature — render "Coming soon" toast for now)

Table:
Columns:
  Staff Member | Salary Type | Base Amount | Bonus | Total | Disbursed On | Actions

"Mark Disbursed" action (only if status === 'pending'):
  bg-[#0F9D66]/10 text-[#0F9D66] Outfit 600 text-[12px] px-3 py-1.5 rounded-full
  hover:bg-[#0F9D66]/20 cursor-pointer
  onClick → markDisbursed(id) then refetch
  Loading inline: replace text with "..." while awaiting

Bulk action row (if any rows checked):
  Checkbox column added left of "Staff Member" when admin
  Selecting rows shows: bg-brand/5 border border-brand/20 rounded-[10px] px-4 py-3
    flex justify-between items-center mb-4
    Left: "{n} records selected"
    Right: "Mark All Disbursed" bg-brand text-white Outfit 600 text-[13px] px-4 py-2 rounded-control

Edge cases (all tabs):
  No history for selected month → empty state "No salary records for {month}"
    + Outfit 400 text-[14px] text-slate "Records are generated at end of each month"
  Commission salary with 0 appointments → show "PKR 0" not "—"
  History record with salary_type changed mid-month → show the type that was active
    at the time of calculation (backend provides this, display as-is)
  Doctor accessing this page directly by URL → allowed (own data only)
  Admin filtering by doctor → getSalaryHistory({ user_id: selectedId })
```

---

# BACKEND REQUIREMENTS + API ROUTES
# (For your friend — map frontend → backend exactly)

```markdown
## Billing Module — Backend Requirements

### Models needed (DRF + PostgreSQL)

Invoice:
  id, invoice_number (auto, format INV-YYYY-NNNN), appointment (FK→Appointment),
  patient (FK→Patient, via appointment.patient), doctor (FK→User, nullable),
  amount (decimal 10,2), status (choices: pending/paid/overdue/cancelled/partial),
  paid_at (datetime, nullable), due_date (date), payment_method (char, nullable),
  created_by (FK→User), created_at (auto), updated_at (auto)
  Auto-created when appointment status changes to "in_progress" or "completed".

Payment:
  id, payment_ref (auto, format PAY-YYYY-NNNN), invoice (FK→Invoice, CASCADE),
  patient (FK→Patient), amount (decimal 10,2),
  method (choices: cash/card/online), status (choices: paid/pending/partial/refunded),
  paid_at (datetime), recorded_by (FK→User), created_at (auto)

InvoiceEvent (audit log):
  id, invoice (FK→Invoice), event_type (char: created/paid/cancelled/updated/downloaded),
  description (text), performed_by (FK→User, nullable), created_at (auto)
  Auto-created on every invoice state change.

### Endpoints

GET    /api/billing/invoices/                    list (staff) — query: status, search, date_from, date_to, page
GET    /api/billing/invoices/{id}/               retrieve (staff)
PATCH  /api/billing/invoices/{id}/mark_paid/     update status→paid, set paid_at (staff only)
GET    /api/billing/invoices/{id}/download/      return PDF blob — use ReportLab, mark event in InvoiceEvent (staff only)
GET    /api/billing/invoices/history/            InvoiceEvent log — query: date_from, date_to, page (staff only)
GET    /api/billing/stats/                       aggregated counts + revenue_month (staff only)
GET    /api/billing/payments/                    list payments — query: search, date_from, date_to, page (staff)
GET    /api/billing/payments/summary/            { total_received, this_month, avg_daily } (staff)

Permission rule:
  Doctors → 403 on ALL billing endpoints. Billing is admin/receptionist only.
  (Doctor role should not read other patients' financial data.)

invoice_number auto-generation:
  Signal on Invoice post_save: if not invoice_number, generate INV-{YYYY}-{zero_padded_4digit_count}
  Use F-lock or select_for_update to avoid race conditions.

Invoice auto-creation trigger:
  In appointments/signals.py: on Appointment status → "completed",
  auto-create Invoice(appointment=instance, amount=instance.consultation_fee,
  status="pending"). If consultation_fee not set, use clinic's default fee from clinic config.

---

## Salary Module — Backend Requirements

### Models needed

SalaryConfig:
  id, user (FK→User, unique), salary_type (choices: fixed/commission),
  fixed_amount (decimal 10,2, nullable), commission_rate (decimal 5,2, nullable),
  commission_base (choices: consultation_fee/monthly_revenue, nullable),
  effective_from (date), configured_by (FK→User), created_at (auto), updated_at (auto)
  Constraint: if salary_type=fixed → fixed_amount required, commission_* null
              if salary_type=commission → commission_rate+base required, fixed_amount null
  Validate in model clean() — raise ValidationError for violations.

SalaryRecord (monthly snapshot):
  id, user (FK→User), month (date, first day of month), salary_type (char),
  base_amount (decimal 10,2), appointment_count (int, null for fixed),
  calculated_amount (decimal 10,2), status (choices: pending/disbursed/on_hold),
  disbursed_at (datetime, nullable), disbursed_by (FK→User, nullable),
  created_at (auto)
  Unique together: (user, month)

### Endpoints

GET  /api/salary/overview/            { doctors: [...], staff: [...] } (admin/receptionist)
GET  /api/salary/stats/               { total_configured, total_fixed_monthly, commission_count, not_configured } (admin/receptionist)
GET  /api/salary/doctors/             list doctors with their SalaryConfig (admin/receptionist)
GET  /api/salary/staff/               list staff (non-doctor) with their SalaryConfig (admin/receptionist)
GET  /api/salary/records/{id}/        single SalaryRecord (admin/receptionist)
GET  /api/salary/me/                  own SalaryConfig + latest SalaryRecord (doctor only)
GET  /api/salary/config/{user_id}/    get config for a specific user (admin/receptionist)
POST /api/salary/config/upsert/       create or update SalaryConfig (admin/receptionist)
  body: { user_id, salary_type, fixed_amount?, commission_rate?, commission_base?, effective_from }
  Logic: if SalaryConfig for user_id exists → update, else create
  Return: updated SalaryConfig object
GET  /api/salary/history/             SalaryRecord list — query: user_id, month, year, page (admin/receptionist)
  Doctor hitting this endpoint: filter automatically to own records only (do not 403)
GET  /api/salary/disbursements/       SalaryRecord list for disbursement — query: month, year, page (admin/receptionist)
PATCH /api/salary/disbursements/{id}/mark_disbursed/
  set status=disbursed, disbursed_at=now(), disbursed_by=request.user (admin only)

Permission matrix:
  admin        → full access to all salary endpoints
  receptionist → read + upsert config, cannot mark_disbursed
  doctor       → only /api/salary/me/ and own records in /api/salary/history/
                 403 on all other salary endpoints

SalaryConfig.commission_base validation:
  commission_base=consultation_fee  → each appointment's consultation_fee × rate / 100
  commission_base=monthly_revenue   → sum of all paid invoice amounts in month × rate / 100
  Calculation runs in a management command or celery task at month end.
  For MVP: expose a POST /api/salary/calculate/{month}/ (admin only) to trigger manually.

Salary auto-creation during doctor/staff creation:
  If salary data is passed in POST /api/users/doctors/ or /api/users/staff/,
  auto-create SalaryConfig in the same transaction (use atomic).
  Fields expected in creation payload (optional): salary_type, fixed_amount,
  commission_rate, commission_base, effective_from (default: today's month start).

Seed data addition to existing seed_demo command:
  Add SalaryConfig for 1 doctor (fixed, PKR 150,000/month) and
  1 doctor (commission, 15% of consultation_fee).
  Leave 1 doctor without config (tests the "Not Set" UI state).
  Add 2 SalaryRecord rows for past month (one disbursed, one pending).
```
