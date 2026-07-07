# MediFlow — Expenses Module (Submodule of Financial Reports)
## 1 Master Prompt · Backend API & Routes Requirements

Design system in force: Outfit (sans), JetBrains Mono (mono), brand #4338CA,
brandDark #352E9E, slate #5B6472, mist #F6F8F9, hairline #E4E8EB, canvas #FFFFFF,
text-slate-900 for primary text. Status colors and animation classes unchanged.
No new external libraries. recharts already installed. No placeholders. No TODOs.

---

---

# MASTER PROMPT — Expenses Module (Financial Reports Submodule)

## Role
Senior frontend engineer extending the MediFlow portal.
Build the Expenses module as a submodule within the existing Financial Reports
section. This module is the single source of truth for all clinic financial
activity: outgoing expenses, salary costs, and incoming patient revenue.

---

## 1. ROUTING — add to App.jsx

Feature key: `"financial_reports"` — wrap with FeatureRoute("financial_reports").
RBAC: Admin only. Receptionist and Doctor → redirect to /.

```
/financial-reports                  → FinancialReports parent page (existing or new)
/financial-reports/expenses         → Expenses overview (default tab of above)
/financial-reports/expenses/add     → Add Expense entry
/financial-reports/expenses/:id/edit → Edit Expense entry
```

If `/financial-reports` already exists: add "Expenses" as a tab inside it.
If it does not exist: create it with Expenses as the only tab for now —
structure it so future tabs (Billing, Payroll, etc.) slot in cleanly.

Add to Sidebar nav (admin only, inside existing nav or as new item):
```
Financial Reports → /financial-reports  (lucide TrendingUp icon)
```
Place below Staff in the nav order.

RBAC guard in App.jsx:
```js
// Only admin sees financial reports
if (!isAdmin(user)) return <Navigate to="/" replace />
```

---

## 2. DATA CONTRACTS

### 2A. Expense Entry object
```js
{
  id:           number,
  category:     string,          // free text — "Electricity", "Furniture", "Rent"
  description:  string,          // additional detail, optional
  amount:       number,          // PKR, positive float
  expense_date: string,          // "YYYY-MM-DD"
  expense_type: "operational" | "salary" | "equipment" | "supplies" | "other",
  added_by:     string,          // user full_name
  created_at:   string,          // ISO
}
```

### 2B. ExpenseSummary object (from GET /api/expenses/summary/)
```js
{
  period:              string,   // "month" | "6months" | "year"
  total_expenses:      number,
  total_salary:        number,   // sum of all salary-type expenses
  total_operational:   number,   // electricity, rent, etc.
  total_equipment:     number,
  total_other:         number,
  total_patient_revenue: number, // sum of paid appointments in period
  net:                 number,   // total_patient_revenue - total_expenses (can be negative)
  monthly_breakdown: Array<{
    month:    string,            // "2025-01"
    expenses: number,
    revenue:  number,
    salary:   number,
  }>,
  category_breakdown: Array<{
    category: string,
    amount:   number,
    count:    number,
  }>,
  expense_type_breakdown: Array<{
    type:   string,
    amount: number,
  }>,
}
```

### 2C. SalaryRecord object (GET /api/expenses/salaries/)
```js
{
  id:           number,
  employee_name:string,
  employee_type:"doctor" | "staff",
  role:         string,
  salary_month: string,          // "2025-03"
  amount:       number,
  status:       "paid" | "pending",
  paid_date:    string | null,
}
```

### 2D. PatientRevenue object (computed from appointments)
```js
{
  period:        string,
  total_revenue: number,
  paid_count:    number,
  unpaid_count:  number,
  unpaid_amount: number,
  monthly: Array<{ month: string, amount: number, count: number }>,
}
```

---

## 3. API SERVICE — add to src/services/api.js

```js
// Expenses
export const getExpenses        = (params = {}) => api.get('/expenses/', { params })
export const getExpenseById     = (id)          => api.get(`/expenses/${id}/`)
export const createExpense      = (data)        => api.post('/expenses/', data)
export const updateExpense      = (id, data)    => api.put(`/expenses/${id}/`, data)
export const deleteExpense      = (id)          => api.delete(`/expenses/${id}/`)
export const getExpenseSummary  = (period)      => api.get('/expenses/summary/', { params: { period } })
export const getExpenseCategories = ()          => api.get('/expenses/categories/')

// Salaries
export const getSalaryRecords   = (params = {}) => api.get('/expenses/salaries/', { params })
export const markSalaryPaid     = (id)          => api.patch(`/expenses/salaries/${id}/`, { status: 'paid' })

// Revenue (from appointments — read-only)
export const getPatientRevenue  = (period)      => api.get('/expenses/revenue/', { params: { period } })
```

---

## 4. PERIOD FILTER — global to this module

A period toggle shared across all sections of the expenses module.
Three options: **This Month** | **Last 6 Months** | **This Year**

```jsx
// src/components/expenses/PeriodToggle.jsx
// Same pill-radio style used in doctors and appointments modules
// bg-mist inline-flex rounded-xl border border-hairline p-1
// Active pill: bg-canvas shadow-sm text-slate-900 font-semibold
// Inactive: text-slate hover:text-slate-900
// Changing period refetches: getExpenseSummary + getExpenses + getPatientRevenue
// Store in URL: ?period=month|6months|year so the view is shareable/bookmarkable
// Default: "month" (This Month)
```

---

## 5. FINANCIAL REPORTS PAGE — src/pages/FinancialReports.jsx

Parent shell for the module.
Topbar title: "Financial Reports" · subtitle: "Expenses, revenue, and salary overview"

**Tab bar** (below topbar, above content, same style as chat tab bar but lighter):
`bg-canvas border-b border-hairline px-8 flex gap-0`
Tabs: "Expenses" (default active) — future: "Billing", "Payroll"
Active tab: border-b-2 border-brand text-brand Outfit 600 14px
Inactive: text-slate Outfit 500 14px hover:text-slate-900

Right of tab bar: PeriodToggle component (right-aligned in the same row)

Content area below tab bar renders: ExpensesTab component

---

## 6. EXPENSES TAB — src/pages/expenses/ExpensesTab.jsx

### 6A. Summary Strip (4 cards, 4-column grid, gap-4, mb-6)

Fetch getExpenseSummary(period) on mount and on period change.
Count-up animation on all numbers. Same card style as all other modules.

Card 1 — Total Revenue (income from patients):
  Icon chip: bg-green-50, trending-up icon text-green-600
  Number: "₨ 2,48,500" JetBrains Mono 700 32px text-slate-900
  Label: "Patient Revenue" Outfit 500 13px text-slate
  Context: "[paid_count] paid appointments" Outfit 400 12px text-slate/70

Card 2 — Total Expenses (all outgoing):
  Icon chip: bg-rose-50, receipt icon text-rose-500
  Number: "₨ 1,82,300" JetBrains Mono 700 32px
  Label: "Total Expenses" Outfit 500 13px text-slate
  Context: "Salaries + Operational" Outfit 400 12px text-slate/70

Card 3 — Salary Costs:
  Icon chip: bg-violet-50, users icon text-violet-600
  Number: "₨ 1,10,000" JetBrains Mono 700 32px
  Label: "Salary Expenses" Outfit 500 13px text-slate
  Context: "[N] employees" Outfit 400 12px text-slate/70

Card 4 — Net (Revenue - Expenses):
  Icon chip: bg-brand-light, scale icon text-brand
  Number: color conditional:
    Positive net: text-green-600 JetBrains Mono 700 32px "₨ +66,200"
    Negative net: text-rose-500 JetBrains Mono 700 32px "₨ -12,400"
  Label: "Net Balance" Outfit 500 13px text-slate
  Context: if positive: "Surplus this period" text-green-600
           if negative: "Deficit this period" text-rose-500
  Card border-left: 3px solid green-400 if positive, rose-400 if negative

Edge case: all zeros on a new month → count-up to 0, no crash, cards still render.

### 6B. Two-column chart row (gap-4, mb-4)

**Left (60%): Income vs Expenses Chart**
`bg-canvas rounded-card shadow-card p-6`
Title: "Revenue vs Expenses" Outfit 700 16px
Subtitle: period label ("This Month" / "Last 6 Months" / "This Year") text-slate 13px

recharts ComposedChart (height 260px):
- Bar series 1: Patient Revenue — fill #0D9488 (teal), radius [4,4,0,0], barSize 20
- Bar series 2: Total Expenses — fill #EF4444 (rose), radius [4,4,0,0], barSize 20
  Side-by-side bars per month (grouped BarChart)
- Line series: Net balance — stroke #4338CA strokeWidth 2 dot={false} type="monotone"
  Values can be negative — Y axis must handle negative range

X axis: month labels (Jan, Feb, Mar...) JetBrains Mono 10px text-slate
Y axis: PKR amounts abbreviated (1L, 2L for 100k, 200k) JetBrains Mono 10px
ReferenceLine at y=0: stroke hairline strokeDasharray "4 4" (zero baseline)
CartesianGrid: horizontal only, hairline dashed

Custom dark tooltip (DarkTooltip component from improvements prompt):
  Month label + Revenue row (teal dot) + Expenses row (rose dot) + Net (brand)

Legend below chart: flex row gap-4
  Teal bar square + "Revenue" · Rose bar square + "Expenses" · Brand line + "Net"

Period = "month": show weekly breakdown (Week 1–4 on X axis instead of months)
Period = "6months": show 6 monthly bars
Period = "year": show 12 monthly bars (compress X labels every 2nd month)

**Right (38%): Expense Category Breakdown**
`bg-canvas rounded-card shadow-card p-5`
Title: "Expense Breakdown" Outfit 700 15px

recharts PieChart donut (height 200px):
  innerRadius 60, outerRadius 85
  Data: category_breakdown from summary
  Colors: deterministic from 8-color palette (same as doctor case types chart):
    ['#4338CA','#0D9488','#F59E0B','#EF4444','#8B5CF6','#EC4899','#6366F1','#14B8A6']
  Center: total expenses JetBrains Mono 700 18px + "Total" Outfit 400 11px text-slate
  White stroke gap between slices

Legend below (vertical list, max 6 items, "+ N more" if overflow):
  Each: color dot 8px + category name Outfit 400 13px + amount JetBrains Mono 500 13px
  text-slate right-aligned + percentage Outfit 400 11px text-slate/60

Empty state (no expenses yet):
  lucide PieChart size-32 text-brand/20 centered
  "No expense data for this period" Outfit 600 14px text-slate-900

### 6C. Expense Log Table — full width

`bg-canvas rounded-card shadow-card overflow-hidden`

**Header row** (px-5 py-4 flex justify-between items-center border-b border-hairline):
Left: "Expense Log" Outfit 700 16px
Right: flex gap-2
  - Search input (compact, w-[200px], icon-left, debounce 300ms)
  - Category filter dropdown (styled select, "All Categories" default,
    populated from getExpenseCategories())
  - Expense type filter chips (inline, small): All | Operational | Salary | Equipment | Supplies | Other
  - "+ Add Expense" button — brand solid, lucide Plus icon, height 34px
    → navigates to /financial-reports/expenses/add

**Table:**
Same thead/tbody styling as all other module tables.
thead: bg-mist, Outfit 600 11px text-slate uppercase tracking-wide, sticky

Columns:
| Column | Content | Style |
|---|---|---|
| Date | expense_date formatted "Mar 15, 2025" | font-mono text-[12px] text-slate |
| Category | Category chip (RoleBadge-style, deterministic color from name hash) | |
| Type | Expense type pill (see type colors below) | |
| Description | truncate max-w-[220px], title attr for full text | Outfit 400 text-[13px] text-slate-900 |
| Amount | "₨ 12,500" right-aligned | font-mono text-[13px] text-slate-900 font-medium |
| Added By | Outfit 400 text-[12px] text-slate | |
| Actions | Pencil + Trash (admin only) | icon buttons |

**Expense type pill colors:**
```
operational: bg-sky-50    text-sky-700   border-sky-200    "Operational"
salary:      bg-violet-50 text-violet-700 border-violet-200 "Salary"
equipment:   bg-amber-50  text-amber-700  border-amber-200  "Equipment"
supplies:    bg-teal-50   text-teal-700   border-teal-200   "Supplies"
other:       bg-slate-100 text-slate-500  border-slate-200  "Other"
```

**Row subtotal bar:**
At the bottom of the table, above pagination:
`bg-mist px-5 py-3 border-t border-hairline flex justify-between items-center`
Left: Outfit 500 13px text-slate "Showing [N] entries"
Right: "Period Total: ₨ [sum]" JetBrains Mono 600 14px text-slate-900

Pagination: 10 per page, ordering=-expense_date (most recent first).
Standard Pagination component same as all other tables.

Loading: 8 SkeletonRow shimmer instances.

Empty state:
  lucide Receipt size-40 text-brand/20 mb-3 centered
  "No expenses recorded" Outfit 600 15px text-slate-900
  "for this period" text-slate 13px
  "+ Add Expense" brand link

---

## 7. ADD EXPENSE PAGE — /financial-reports/expenses/add

Centered card: `max-w-xl mx-auto bg-canvas rounded-card shadow-card p-8 animate-fade-up`
Title: "Record Expense" Outfit 700 22px
Subtitle: "Add a new clinic expense entry" text-slate 14px mt-1

**Form sections:**

**Expense Details** (section heading style):

| Field | Type | Validation | Notes |
|---|---|---|---|
| Category | text + autocomplete | required, min 2 chars | Same pattern as qualifications: check existing categories (getExpenseCategories()), if not found → create new. Autocomplete dropdown shows matching existing categories as user types. New category created on submit if not matched. |
| Expense Type | select | required | Operational / Salary / Equipment / Supplies / Other |
| Description | textarea (2 rows) | optional | Additional details |
| Amount (₨) | number | required, > 0 | step 0.01, JetBrains Mono input style |
| Expense Date | date | required, not in future | Can be past (retroactive entry) |

**Category autocomplete spec:**
```js
// On category input change (debounce 200ms):
// Filter getExpenseCategories() result client-side
// Show dropdown with matching items:
// Each item: category name + count of times used (Outfit 400 11px text-slate)
// "Use '[input]'" option at bottom if no exact match
// On select existing: use it. On select "Use X": create on submit via backend
```

Input: same style as qualification tag input but single-value (not a chip array).
Dropdown: `absolute z-50 bg-canvas border border-hairline rounded-xl shadow-card
           max-h-[200px] overflow-y-auto mt-1 w-full`
Each option: `px-4 py-2.5 hover:bg-brand-light/40 cursor-pointer Outfit 400 14px text-slate-900`

**Amount field:**
`relative` wrapper: "₨" prefix text inside field left side:
`absolute left-4 top-1/2 -translate-y-1/2 font-mono text-[14px] text-slate`
Input padding-left: pl-8 to make room for ₨ prefix.

**Validation rules:**
- Amount = 0 or negative → "Amount must be greater than zero" blocking
- Amount > 10,000,000 (1 crore) → amber warning "Large amount — please verify" non-blocking
- Expense date in future → "Cannot record a future expense" blocking
- Category empty → "Category is required" blocking
- All errors fire simultaneously on submit

**Actions (right-aligned):**
Cancel → navigate to /financial-reports/expenses
"Save Expense" → brand solid, loading spinner on submit
On success: toast "Expense recorded", navigate to /financial-reports/expenses

---

## 8. EDIT EXPENSE — /financial-reports/expenses/:id/edit

Same card and form as Add. Pre-populate all fields.
Title: "Edit Expense"
On success: toast "Expense updated", navigate to /financial-reports/expenses
Delete: Trash icon in card top-right → confirmation modal → navigate to list

---

## 9. SALARY SECTION (inside Expenses tab, below Expense Log)

`bg-canvas rounded-card shadow-card overflow-hidden mt-4`

Header: "Salary Overview" Outfit 700 15px + period label right + "Manage →" link (future)

**Two-column salary breakdown:**

Left (55%): Salary table
Columns: Employee | Role | Type | Month | Amount | Status
- Employee: Avatar sm + name Outfit 500 13px + role Outfit 400 11px text-slate
- Type: "Doctor" chip or "Staff" chip (DoctorStatusBadge style)
- Month: JetBrains Mono 12px text-slate
- Amount: "₨ [N]" JetBrains Mono 13px font-medium
- Status: "Paid" (green chip) | "Pending" (amber chip)
  Paid: small checkmark icon inline
  Pending: "Mark Paid" button (ghost, xs) renders for admin

Loading: 5 SkeletonRow
Pagination: 10 per page

Right (43%): Salary stats
`bg-mist rounded-xl p-4`
Three stat rows:
  "Total Salary Expense" — "₨ 1,10,000" JetBrains Mono 700 20px
  "Doctors" — "₨ 80,000" JetBrains Mono 500 16px text-brand
  "Staff" — "₨ 30,000" JetBrains Mono 500 16px text-violet-600
Divider
  "Paid" — count in green
  "Pending" — count in amber
  "Total Employees" — N

---

## 10. PATIENT REVENUE SECTION (inside Expenses tab, below Salary)

`bg-canvas rounded-card shadow-card p-5 mt-4`

Header: "Patient Revenue" Outfit 700 15px + "From appointments" text-slate 12px

Three-column stat row:
Col 1: "₨ 2,48,500" total revenue — JetBrains Mono 700 24px text-green-600
        "Total Revenue" label text-slate 12px
Col 2: "[N] paid" JetBrains Mono 700 20px text-slate-900
        "Appointments" label
Col 3: "₨ [unpaid_amount]" JetBrains Mono 700 20px text-rose-500
        "[N] unpaid" label

Small revenue trend chart (recharts AreaChart, height 80px, no axes, brand fill 0.2 opacity)
showing monthly revenue from monthly array — purely decorative sparkline.

"View Unpaid Appointments →" brand link at bottom-right → /appointments?payment_status=unpaid

---

## 11. EDGE CASES

| Scenario | Behaviour |
|---|---|
| Net is negative (expenses > revenue) | Net card border-left rose, number rose-500, "Deficit" label — never shows as positive |
| Period = "month", only 2 weeks in | Chart shows partial month data correctly — no fabricated bars for future weeks |
| No expenses in selected period | Expense log empty state, summary cards all ₨ 0 via count-up, donut empty state |
| Category created mid-form (new) | Category appears in future autocomplete dropdowns immediately (refetch categories on next open) |
| Amount has more than 2 decimal places | Round to 2 on display. Backend stores as decimal(12,2). |
| Salary records for a month not yet generated | Show "No salary records" empty state in salary table |
| Revenue from unpaid appointments | Not counted in total_patient_revenue — only paid appointments |
| Delete expense with confirmed modal | Row removed optimistically, toast "Expense deleted", list refetches |
| Period changes while on page 3 of expense log | Reset to page 1 on period change |
| Large number formatting | 1,00,000 formatted as "₨ 1L" in chart Y axis, full "₨ 1,00,000" in cards |
| Non-admin user reaches /financial-reports | Redirect to / (not an error page) |
| Amount = "abc" entered | HTML number input prevents this. On form submit, parseFloat check → "Valid amount required" |
| Category already exists in DB but user types different case | Autocomplete matches case-insensitively, existing category used |

---

## 12. QA CHECKLIST

### Summary cards
[ ] All 4 cards render with count-up animation on mount
[ ] Net card: green border + green number when positive
[ ] Net card: rose border + rose number when negative
[ ] Cards re-animate on period change (re-trigger count-up)
[ ] All zeros on new period → cards show ₨ 0, no crash

### Charts
[ ] Revenue vs Expenses: two bar series side-by-side per time unit
[ ] Net line renders correctly including negative values below zero
[ ] ReferenceLine at y=0 visible when net goes negative
[ ] Period = month → weekly breakdown (4 bars per series)
[ ] Period = 6months → 6 monthly bars
[ ] Period = year → 12 monthly bars
[ ] Category donut center shows correct total
[ ] Empty category data → replacement empty state, no broken donut

### Expense log
[ ] Table sorted by expense_date descending (most recent first)
[ ] Search filters by category + description simultaneously
[ ] Category filter dropdown + type chips compose correctly
[ ] Pagination: 10 per page, resets on filter change
[ ] Period subtotal row shows sum of currently visible period (not just current page)
[ ] Delete → confirmation modal → row removed → success toast

### Add expense form
[ ] Category autocomplete: typing "ele" shows "Electricity" if it exists
[ ] New category "Internet" not in DB → saved on submit, appears in dropdown next time
[ ] ₨ prefix visible inside amount field
[ ] Amount = 0 → blocking error before API call
[ ] Future date → blocking error before API call
[ ] All errors fire simultaneously on submit attempt
[ ] On success → toast → navigate to /financial-reports/expenses

### Salary section
[ ] Shows correct total for selected period
[ ] Doctor vs Staff subtotals correct
[ ] "Mark Paid" button: only admin sees it
[ ] "Mark Paid" click → optimistic status update → amber → green chip

### Patient revenue
[ ] Only paid appointments counted
[ ] "₨ 0" for unpaid amount when all paid — no crash
[ ] "View Unpaid Appointments →" link passes correct filter

### Access control
[ ] Doctor navigating to /financial-reports → redirect to /
[ ] Receptionist navigating to /financial-reports → redirect to /
[ ] Sidebar "Financial Reports" link only visible to admin

---

---

# BACKEND API REQUIREMENTS
## Hand to backend engineer

```
# ─────────────────────────────────────────────────────────────
# EXPENSE MODEL
# ─────────────────────────────────────────────────────────────

# Model: Expense
  id:           AutoField
  category:     CharField(max_length=200)  ← FK to ExpenseCategory.name (denormalized for flexibility)
  category_ref: ForeignKey(ExpenseCategory, null=True, on_delete=SET_NULL)
  expense_type: CharField choices:
                  operational | salary | equipment | supplies | other
  description:  TextField(blank=True)
  amount:       DecimalField(max_digits=12, decimal_places=2)
  expense_date: DateField
  added_by:     ForeignKey(User, on_delete=SET_NULL, null=True)
  created_at:   DateTimeField(auto_now_add=True)
  updated_at:   DateTimeField(auto_now=True)

# Model: ExpenseCategory
  id:   AutoField
  name: CharField(max_length=200, unique=True)
       Stored with original case. Uniqueness enforced case-insensitively (iexact).
  POST /api/expenses/categories/ → same create-or-return pattern as qualifications:
    if "electricity" exists and "Electricity" submitted → return existing record
    if truly new → create and return

# Model: SalaryRecord
  id:            AutoField
  employee:      ForeignKey(User, on_delete=CASCADE)
  employee_type: CharField choices: doctor | staff
  salary_month:  CharField(max_length=7)  ← "2025-03"
  amount:        DecimalField(max_digits=10, decimal_places=2)
  status:        CharField choices: paid | pending   default: pending
  paid_date:     DateField(null=True)
  created_at:    DateTimeField(auto_now_add=True)

# ─────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────

# Expenses CRUD
GET    /api/expenses/
  → paginated list (page_size=10, ordering=-expense_date)
  → query params:
      period: month | 6months | year      (filters by expense_date range)
      category: string                     (exact match, case-insensitive)
      expense_type: operational|salary|... (filter by type)
      search: string                       (searches category + description)
  → RBAC: admin only

POST   /api/expenses/
  → body: category, expense_type, description, amount, expense_date
  → validation:
      amount > 0
      expense_date <= today
      category: non-empty, max 200 chars
  → auto-set added_by = request.user
  → auto-create or link ExpenseCategory
  → RBAC: admin only

PUT    /api/expenses/:id/
  → same body as POST
  → RBAC: admin only

DELETE /api/expenses/:id/
  → hard delete
  → RBAC: admin only

# Categories
GET    /api/expenses/categories/
  → full list (no pagination), ordered by name
  → response: [{ id, name, usage_count }]  ← usage_count: how many expenses use it
  → RBAC: admin only

POST   /api/expenses/categories/
  → body: { name: string }
  → create-or-return (case-insensitive uniqueness)
  → response: { id, name }  ← 200 if existing, 201 if created
  → RBAC: admin only

# Summary (aggregated)
GET    /api/expenses/summary/?period=month|6months|year
  → returns ExpenseSummary object:

  period date ranges:
    month:   first day of current month → today
    6months: 6 calendar months ago → today
    year:    Jan 1 of current year → today

  Compute:
    total_expenses:       SUM of all Expense.amount in period
    total_salary:         SUM where expense_type='salary'
    total_operational:    SUM where expense_type='operational'
    total_equipment:      SUM where expense_type='equipment'
    total_other:          SUM where expense_type in ('supplies','other')
    total_patient_revenue: SUM of Appointment.amount (or derived fee) where
                           payment_status='paid' AND appointment_dt in period
    net:                  total_patient_revenue - total_expenses

    monthly_breakdown:    group by month (YYYY-MM), sum expenses + revenue
                          include months with 0 values (no gaps in chart)
    category_breakdown:   group by category, sum amount, count entries
                          ordered by amount DESC
    expense_type_breakdown: group by expense_type, sum amount

  → RBAC: admin only
  → Cache: 5 minutes (this can be expensive) — bust cache on any expense write

# Salaries
GET    /api/expenses/salaries/
  → paginated (page_size=10)
  → query params: period (same as above), status (paid|pending), employee_type
  → RBAC: admin only

PATCH  /api/expenses/salaries/:id/
  → body: { status: 'paid', paid_date: 'YYYY-MM-DD' }
  → marks salary as paid
  → RBAC: admin only

# NOTE: salary records should be auto-generated monthly for all active
# doctors and staff. Implement as a Django management command or Celery
# periodic task (first of each month → create SalaryRecord for each
# active employee with their configured salary amount).
# Salary amount field: add to Doctor model and Staff model:
#   monthly_salary: DecimalField(max_digits=10, decimal_places=2, default=0)

# Patient Revenue (read-only, derived from Appointment)
GET    /api/expenses/revenue/?period=month|6months|year
  → response: PatientRevenue object
  → total_revenue: SUM Appointment.fee where payment_status='paid' in period
  → NOTE: requires Appointment model to have a 'fee' or 'amount' field.
    If not yet present: add fee: DecimalField(max_digits=10, decimal_places=2, default=0)
    to Appointment model. Frontend already has payment_status field.
  → RBAC: admin only

# ─────────────────────────────────────────────────────────────
# MODEL ADDITIONS (other modules)
# ─────────────────────────────────────────────────────────────

# Add to Doctor model:
  monthly_salary: DecimalField(max_digits=10, decimal_places=2, default=0)

# Add to Staff model:
  monthly_salary: DecimalField(max_digits=10, decimal_places=2, default=0)

# Add to Appointment model:
  fee: DecimalField(max_digits=10, decimal_places=2, default=0)
  ← the amount charged for this appointment
  Frontend can set this during booking (optional field in booking form)

# ─────────────────────────────────────────────────────────────
# SUMMARY TABLE — ALL ENDPOINTS
# ─────────────────────────────────────────────────────────────

  Endpoint                          Method   Notes
  ──────────────────────────────    ──────   ────────────────────────────────────
  /api/expenses/                    GET      paginated, period filter, search
  /api/expenses/                    POST     create expense + auto-link category
  /api/expenses/:id/                PUT      update
  /api/expenses/:id/                DELETE   hard delete
  /api/expenses/summary/            GET      NEW — aggregated summary with breakdown
  /api/expenses/categories/         GET      all categories with usage_count
  /api/expenses/categories/         POST     create-or-return (case-insensitive)
  /api/expenses/salaries/           GET      paginated salary records
  /api/expenses/salaries/:id/       PATCH    mark as paid
  /api/expenses/revenue/            GET      NEW — patient revenue from appointments

# ─────────────────────────────────────────────────────────────
# ERROR FORMAT (consistent with all modules)
# ─────────────────────────────────────────────────────────────

  { detail: "message" }              non-field error
  { field_name: ["message"] }        field-level DRF validation error

# All endpoints: admin role only. Return 403 for any other role.
```
