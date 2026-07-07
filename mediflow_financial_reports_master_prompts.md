# MediFlow AI — Financial Reports (Insights & Analytics) Module
## 2 Frontend Master Prompts + Backend Requirements

**Branch:** `feature/financial-reports` (same branch as Billing/Salary — this is a new tab on FinancialLayout)
**Stack:** React + Vite + Tailwind CSS + recharts (already installed for Dashboard)
**Design tokens (unchanged):**
  `--brand #4338CA` · `--brandDark #352E9E` · `--ink #14181F` · `--slate #5B6472`
  `--mist #F6F8F9` · `--hairline #E4E8EB` · `--canvas #FFFFFF`
**Fonts (unchanged):** Outfit 400/500/600/700 · DM Serif Display 400/italic · JetBrains Mono 400/500
**RBAC:** admin + receptionist only. Doctors get 403 on every endpoint here — this page aggregates clinic-wide revenue/salary/expense data, which is exactly the financial visibility a doctor role should not have (consistent with Billing module rule already set).
**Data sources:** this module reads only — it aggregates existing Invoice, Payment, SalaryRecord, and Expense data. It writes nothing.

---

## Where this fits in Financial Reports

```
Financial Reports (sidebar parent)
│
├── Billing     (built)
├── Salary      (built)
├── Expenses    (placeholder — real model exists once Expenses module ships)
└── Reports     ← NEW — this is the "Insights" tab, add as 4th FinancialLayout tab
```

No new sidebar item. Add "Reports" as a 4th tab inside the existing `FinancialLayout.jsx` sub-nav (Billing · Salary · Expenses · Reports), routed at `/financial/reports`.

---

# MASTER PROMPT 1
# Reports Shell + Filter System + Revenue & Expense Insights

---

```
You are a senior frontend engineer extending the MediFlow AI portal.
FinancialLayout, Sidebar, api.js, AuthContext, StatCard, InvoiceBadge, SalaryBadge,
and all billing/salary pages already exist. Do NOT rebuild them.

BRANCH: feature/financial-reports
NEW FILES:
  src/pages/financial/reports/ReportsOverview.jsx
  src/components/financial/DateRangePicker.jsx
  src/components/financial/RevenueChart.jsx
  src/components/financial/ExpenseBreakdownChart.jsx
  src/services/reportsApi.js
  src/lib/exportPdf.js

EXISTING FILE EDITS:
  src/pages/financial/FinancialLayout.jsx — add "Reports" as 4th tab
  src/App.jsx — add /financial/reports route

════════════════════════════════════════════════════════
STEP 0 — ADD REPORTS TAB TO FINANCIAL LAYOUT
════════════════════════════════════════════════════════

In FinancialLayout.jsx sub-nav tab bar, add a 4th NavLink after Expenses:
  Label: "Reports"  path: /financial/reports  isActive check: pathname.startsWith('/financial/reports')
  Same active/inactive style as the other three tabs — no new styling needed.

In App.jsx, add inside the /financial parent route:
  <Route path="reports" element={<ReportsOverview />} />

RBAC route guard: wrap this specific route so that if user.role === 'doctor',
redirect to /financial/billing immediately (doctors never see this tab —
also hide the "Reports" tab itself in FinancialLayout when user.role === 'doctor').

════════════════════════════════════════════════════════
STEP 1 — REPORTS API SERVICE (src/services/reportsApi.js)
════════════════════════════════════════════════════════

Import the existing shared axios instance from src/services/api.js.

Export exactly:

  getFinancialSummary(params)   → GET /api/reports/summary/?{period,date_from,date_to}
  getRevenueTrend(params)       → GET /api/reports/revenue-trend/?{period,date_from,date_to}
  getExpenseBreakdown(params)   → GET /api/reports/expense-breakdown/?{period,date_from,date_to}
  getSalaryVsRevenue(params)    → GET /api/reports/salary-vs-revenue/?{period,date_from,date_to}
  getTopMetrics(params)         → GET /api/reports/top-metrics/?{period,date_from,date_to}
  downloadReportPDF(params)     → GET /api/reports/export-pdf/?{period,date_from,date_to} (blob)

"period" param is one of: daily | weekly | monthly | six_month | yearly | custom
When period === "custom", also send date_from and date_to (YYYY-MM-DD).
For all other periods, backend computes the range server-side — do not send
date_from/date_to unless period is custom.

All functions return response.data. Wrap in try/catch, rethrow.
downloadReportPDF uses axios({ responseType: 'blob' }) same pattern as
downloadInvoicePDF in billingApi.js.

════════════════════════════════════════════════════════
STEP 2 — DATE RANGE PICKER
(src/components/financial/DateRangePicker.jsx)
════════════════════════════════════════════════════════

Props: value ({period, dateFrom, dateTo}), onChange (fn), onExport (fn, optional)

This is the single control that drives every chart and card on the page.
Renders as a horizontal bar:
  bg-canvas border border-hairline rounded-[14px] p-4 mb-8
  flex flex-wrap items-center justify-between gap-4

LEFT — period pill group:
  flex bg-mist rounded-control p-1 gap-1
  5 buttons: Daily · Weekly · Monthly · 6 Months · Yearly
  Active:   bg-canvas text-brand Outfit 600 text-[13px] shadow-sm px-4 py-2 rounded-[6px]
  Inactive: text-slate hover:text-ink Outfit 500 text-[13px] px-4 py-2

  Clicking a pill sets period and clears any custom date range.

RIGHT — custom range + export:
  "Custom Range" toggle button: border border-hairline rounded-control px-4 py-2
    Outfit 500 text-[13px] text-ink lucide Calendar size-14px mr-2
    Active state (custom selected): border-brand text-brand bg-brand/5
    Clicking opens an inline popover (absolute, right-0 top-full mt-2 z-40):
      bg-canvas border border-hairline rounded-[12px] shadow-card p-4 w-[280px]
      Two date inputs (From / To) stacked, Outfit 400 text-[13px] labels
      "Apply" button: bg-brand text-white Outfit 600 text-[13px] w-full py-2 rounded-control mt-3
      Validation: date_to must be >= date_from, else show inline error text-[#C8102E]
        "End date must be after start date" — disable Apply button
      Validation: range cannot exceed 366 days, else "Maximum range is 1 year"
      Clicking outside popover (mousedown listener on document) → close without applying

  Export button: bg-brand text-white Outfit 600 text-[13px] px-5 py-2.5 rounded-control
    hover:bg-brandDark flex items-center gap-2
    lucide FileDown size-16px
    "Export PDF"
    onClick → calls onExport() (parent handles the actual download + loading state)
    Loading state: icon → lucide Loader2 animate-spin, text → "Generating..."
    disabled while loading

Edge case: switching from custom back to a preset pill clears dateFrom/dateTo
  and popover closes if open.

════════════════════════════════════════════════════════
STEP 3 — PDF EXPORT HELPER (src/lib/exportPdf.js)
════════════════════════════════════════════════════════

export async function exportReportPdf(reportsApi, params, onError) {
  try {
    const blob = await reportsApi.downloadReportPDF(params)
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const label = params.period === 'custom'
      ? `${params.dateFrom}_to_${params.dateTo}`
      : params.period
    a.download = `MediFlow_Financial_Report_${label}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  } catch (err) {
    onError?.(err)
  }
}

Edge case: if the blob response is actually a JSON error (backend failed to
generate PDF), detect via blob.type !== 'application/pdf' — read it as text,
parse JSON, and surface that error message instead of downloading garbage.

════════════════════════════════════════════════════════
STEP 4 — REPORTS OVERVIEW PAGE (main file)
(src/pages/financial/reports/ReportsOverview.jsx)
════════════════════════════════════════════════════════

State:
  const [range, setRange] = useState({ period: 'monthly', dateFrom: null, dateTo: null })
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [exporting, setExporting] = useState(false)

On mount AND whenever range changes: refetch getFinancialSummary(range)
  (debounce not needed here — range changes are discrete clicks, not typing)

─ PAGE HEADER ─
font-display text-[26px] text-ink "Financial Reports"
Outfit 400 text-[14px] text-slate mt-1
  "Revenue, salary, and expense insights across your clinic"

─ DATE RANGE PICKER ─
<DateRangePicker value={range} onChange={setRange} onExport={handleExport} />

handleExport:
  setExporting(true)
  await exportReportPdf(reportsApi, range, (err) => showErrorToast(err))
  setExporting(false)

─ TOP METRIC CARDS (4, using existing StatCard component) ─
grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8

  1. lucide TrendingUp  "Total Revenue"      summary.total_revenue    sub="PKR · {period label}"
  2. lucide Wallet      "Total Salary Paid"  summary.total_salary     sub="PKR · {period label}"
  3. lucide Receipt     "Total Expenses"     summary.total_expenses   sub="PKR · {period label}"
  4. lucide PiggyBank   "Net Profit"         summary.net_profit       sub="revenue − salary − expenses"
     Conditional color: if net_profit < 0, render value in text-[#C8102E] instead of text-ink
       (override StatCard's default ink color via a prop — add optional
       valueColorClass prop to StatCard, default 'text-ink')

Period label helper: map period → "today" / "this week" / "this month" /
  "last 6 months" / "this year" / "{dateFrom} – {dateTo}" for custom

─ LOADING STATE ─
While loading: StatCards show skeleton (same pattern as billing module —
  animate-pulse bg-mist block in place of the number).
Charts area (below) shows a single skeleton block:
  bg-mist rounded-[16px] h-[360px] animate-pulse

─ ERROR STATE ─
Same pattern as InvoiceList: bg-[#FCE4E8] border rounded card with Retry button.
If the error is a 403 (shouldn't happen since route is gated, but defensive):
  show "You don't have permission to view financial reports." — no retry button.

─ REVENUE VS EXPENSE VS SALARY TREND CHART ─
bg-canvas rounded-[16px] border border-hairline p-6 mb-6

Header row: flex justify-between items-center mb-6
  Left: Outfit 600 text-[16px] text-ink "Revenue, Salary & Expense Trend"
  Right: small legend — 3 dots + labels:
    ● brand "Revenue"   ● #B45309 "Salary"   ● #C8102E "Expenses"
    Outfit 400 text-[12px] text-slate, flex gap-4

<RevenueChart data={summary.trend} />  (component built in Step 5)

Empty state (if summary.trend has < 2 data points):
  centered py-16: lucide BarChart3 size-40px text-hairline
  font-display italic text-[18px] text-slate "Not enough data for this range"
  Outfit 400 text-[14px] text-slate/70 "Try selecting a wider date range"

─ TWO-COLUMN SECOND ROW ─
grid grid-cols-1 lg:grid-cols-2 gap-6

LEFT — Expense Breakdown (pie/donut):
  bg-canvas rounded-[16px] border border-hairline p-6
  Outfit 600 text-[16px] text-ink mb-6 "Expense Breakdown"
  <ExpenseBreakdownChart data={summary.expense_breakdown} />  (Step 6)
  Empty state: "No expenses recorded for this period"

RIGHT — Top Metrics list:
  bg-canvas rounded-[16px] border border-hairline p-6
  Outfit 600 text-[16px] text-ink mb-6 "Highlights"

  List of metric rows (space-y-4), each:
    flex justify-between items-center pb-4 border-b border-hairline last:border-0 last:pb-0
    Left: icon chip (w-9 h-9 bg-brand/10 rounded-[10px]) + Outfit 500 text-[14px] text-ink label
    Right: font-mono text-[14px] text-ink value

  Rows (from getTopMetrics response):
    lucide Stethoscope   "Top Earning Doctor"       top_metrics.top_doctor_name + revenue
    lucide Users         "Most Billed Patient Type" top_metrics.top_condition (if tracked)
    lucide Receipt       "Largest Expense Category" top_metrics.top_expense_category
    lucide TrendingUp    "Best Revenue Day"          top_metrics.best_day + amount
    lucide Percent       "Avg Commission Payout"     top_metrics.avg_commission

  Each value formatted with toLocaleString() where numeric, "PKR" prefix where currency.
  Edge case: any field null/undefined → render "—" not "undefined" or "NaN"
```

---

# MASTER PROMPT 2
# Detailed Breakdown Tables + Comparison View + Backend Requirements

---

```
Continue in the same branch: feature/financial-reports
ReportsOverview.jsx, DateRangePicker, RevenueChart, ExpenseBreakdownChart,
and reportsApi.js already exist from Prompt 1. Extend ReportsOverview.jsx
with the sections below — do not create a separate route/page, this is the
same page, scrolling further down.

NEW FILES:
  src/components/financial/SalaryVsRevenueChart.jsx
  src/components/financial/ReportsBreakdownTable.jsx

════════════════════════════════════════════════════════
STEP 5 — REVENUE CHART COMPONENT
(src/components/financial/RevenueChart.jsx)
════════════════════════════════════════════════════════

Props: data (array of {label, revenue, salary, expenses})
  label format varies by period: "Mon" for weekly, "Jan 1" for monthly,
  "Jan" for six_month/yearly — backend provides pre-formatted labels, don't
  reformat dates on the frontend.

Use recharts ComposedChart or LineChart with 3 lines:
  <ResponsiveContainer width="100%" height={340}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#E4E8EB" vertical={false} />
      <XAxis dataKey="label" tick={{ fontFamily: 'Outfit', fontSize: 12, fill: '#5B6472' }}
             axisLine={{ stroke: '#E4E8EB' }} tickLine={false} />
      <YAxis tick={{ fontFamily: 'Outfit', fontSize: 12, fill: '#5B6472' }}
             axisLine={false} tickLine={false}
             tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
      <Tooltip content={<CustomTooltip />} />
      <Line type="monotone" dataKey="revenue"  stroke="#4338CA" strokeWidth={2.5} dot={false} />
      <Line type="monotone" dataKey="salary"   stroke="#B45309" strokeWidth={2}   dot={false} strokeDasharray="4 3" />
      <Line type="monotone" dataKey="expenses" stroke="#C8102E" strokeWidth={2}   dot={false} strokeDasharray="4 3" />
    </LineChart>
  </ResponsiveContainer>

CustomTooltip (inline component in same file):
  bg-ink rounded-[10px] px-4 py-3 shadow-lg
  Label: Outfit 500 text-[12px] text-white/60 mb-2
  Each series row: flex justify-between gap-6
    Outfit 400 text-[13px] text-white (series name)
    font-mono text-[13px] text-white font-medium "PKR {value.toLocaleString()}"

Edge case: data array empty → parent handles empty state, this component
  should not be rendered in that case (guard in ReportsOverview).

════════════════════════════════════════════════════════
STEP 6 — EXPENSE BREAKDOWN CHART
(src/components/financial/ExpenseBreakdownChart.jsx)
════════════════════════════════════════════════════════

Props: data (array of {category, amount, percentage})
  Categories from Expenses module: "Staff Salaries" · "Clinic Bills" · "Other"

Use recharts PieChart (donut style):
  <ResponsiveContainer width="100%" height={280}>
    <PieChart>
      <Pie data={data} dataKey="amount" nameKey="category"
           innerRadius={65} outerRadius={95} paddingAngle={2}>
        {data.map((entry, i) => (
          <Cell key={i} fill={COLORS[i % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip content={<CustomPieTooltip />} />
    </PieChart>
  </ResponsiveContainer>

COLORS array (brand-consistent, 4 colors max since only 3 categories exist):
  ['#4338CA', '#7C3AED', '#B45309', '#5B6472']

Center label overlay (absolute positioned over the donut center):
  font-display text-[20px] text-ink "PKR {total.toLocaleString()}"
  Outfit 400 text-[11px] text-slate "Total"

Legend below chart (not recharts default — custom, matches app style):
  flex flex-wrap gap-4 mt-4 justify-center
  Each: flex items-center gap-2
    w-2.5 h-2.5 rounded-full (bg = matching COLORS[i])
    Outfit 500 text-[13px] text-ink category name
    Outfit 400 text-[12px] text-slate "({percentage}%)"

CustomPieTooltip: bg-ink rounded-[8px] px-3 py-2
  Outfit 500 text-[12px] text-white category + font-mono text-[12px] text-white/80 amount

Edge case: only 1 category has data → still render (donut becomes a full ring
  of one color), don't break the layout.

════════════════════════════════════════════════════════
STEP 7 — SALARY VS REVENUE COMPARISON CHART
(src/components/financial/SalaryVsRevenueChart.jsx)
════════════════════════════════════════════════════════

Props: data (array of {label, revenue, salary_cost, ratio})

Purpose: shows what % of revenue is going to salary payouts — a genuinely
useful clinic-ops metric (are we paying out more than we're earning?).

Bar chart (grouped bars, not stacked — makes the comparison legible):
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#E4E8EB" vertical={false} />
      <XAxis dataKey="label" tick={{ fontFamily:'Outfit', fontSize:12, fill:'#5B6472' }}
             axisLine={{stroke:'#E4E8EB'}} tickLine={false} />
      <YAxis tick={{ fontFamily:'Outfit', fontSize:12, fill:'#5B6472' }}
             axisLine={false} tickLine={false}
             tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
      <Tooltip content={<CustomTooltip />} />
      <Bar dataKey="revenue" fill="#4338CA" radius={[4,4,0,0]} barSize={18} />
      <Bar dataKey="salary_cost" fill="#B45309" radius={[4,4,0,0]} barSize={18} />
    </BarChart>
  </ResponsiveContainer>

Below chart — ratio callout:
  bg-mist rounded-[10px] px-4 py-3 mt-4 flex items-center justify-between
  Left: Outfit 500 text-[13px] text-ink "Salary-to-Revenue Ratio"
  Right: font-display text-[20px]
    Color logic: ratio <= 40 → text-[#0F9D66] (healthy)
                 ratio 40-60 → text-[#B45309] (watch)
                 ratio > 60  → text-[#C8102E] (concerning)
    "{ratio}%"

Add this chart to ReportsOverview.jsx as a 3rd row, full width, below the
two-column Expense Breakdown / Highlights row from Prompt 1:

  <div className="bg-canvas rounded-[16px] border border-hairline p-6 mt-6">
    <h3 className="font-sans font-semibold text-[16px] text-ink mb-6">
      Salary vs Revenue
    </h3>
    <SalaryVsRevenueChart data={summary.salary_vs_revenue} />
  </div>

════════════════════════════════════════════════════════
STEP 8 — DETAILED BREAKDOWN TABLE
(src/components/financial/ReportsBreakdownTable.jsx)
════════════════════════════════════════════════════════

Props: rows (array), period (string — for column label context)

Purpose: a raw tabular view of the same data behind the charts, for anyone
who wants exact numbers rather than a visual. Placed at the very bottom of
ReportsOverview.jsx as a collapsible section.

In ReportsOverview.jsx, add below the Salary vs Revenue chart:

  <button onClick={() => setShowTable(!showTable)}
    className="flex items-center gap-2 text-brand font-sans font-semibold
    text-[14px] mt-8 mb-4">
    {showTable ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
    {showTable ? 'Hide' : 'View'} Detailed Breakdown Table
  </button>

  {showTable && <ReportsBreakdownTable rows={summary.breakdown_rows} period={range.period} />}

Table component:
  bg-canvas rounded-[16px] border border-hairline overflow-hidden

  Columns: Period | Revenue | Salary Paid | Expenses | Net Profit
  Header: bg-mist/60 Outfit 600 text-[11px] uppercase tracking-wide text-slate px-5 py-3

  Each row: font-mono text-[13px] px-5 py-3 border-b border-hairline last:border-0
    Period label: Outfit 500 text-ink (not mono — it's a label not raw data)
    Revenue/Salary/Expenses: font-mono text-ink "PKR {value.toLocaleString()}"
    Net Profit: font-mono font-medium
      color: value >= 0 ? text-[#0F9D66] : text-[#C8102E]

  Footer row (totals): bg-mist/40 border-t-2 border-hairline
    Outfit 700 text-[13px] "Total" + font-mono font-bold totals for each column

  Empty state: "No data available for this range" centered py-8 text-slate

════════════════════════════════════════════════════════
STEP 9 — FULL EDGE CASE PASS (apply across all of ReportsOverview.jsx)
════════════════════════════════════════════════════════

  1. Custom range spanning a period with zero invoices/salary/expenses at all
     → every card shows PKR 0, charts show empty states, no crashes.
  2. Custom range of a single day → daily granularity chart still renders
     (even if it's a single point — recharts needs >=2 points for a line,
     so if data.length === 1, render the StatCards + breakdown table but
     replace charts with "Select a wider range to see trend charts" message).
  3. net_profit exactly 0 → treat as non-negative (green/neutral, not red).
  4. Backend returns a 500 → generic error card, "Something went wrong
     generating this report. Please try again." + Retry.
  5. PDF export while summary is still loading → disable Export button
     until summary is loaded (prevents exporting stale/empty data).
  6. PDF export takes long (>5s) → button stays in loading state, no timeout
     assumption on frontend — let the request resolve or reject naturally.
  7. User rapidly clicks between period pills → cancel the in-flight request
     for the previous period using an AbortController on each fetch, so a
     slow "yearly" response can't overwrite a fast "daily" response that
     arrived after it.
  8. Switching tabs away from Reports and back → refetch (don't rely on
     stale state from a previous mount — no need for cross-tab caching in MVP).
  9. Negative expense or salary value from backend (data bug) → still render
     as-is, don't clamp to 0 silently — a negative number reaching the UI
     should be visible so it gets caught, not hidden.
  10. Currency formatting consistency: every PKR value across this entire
      page uses `new Intl.NumberFormat('en-PK').format(value)` — not manual
      comma insertion — so large numbers format identically everywhere.
```

---

# BACKEND REQUIREMENTS + API ROUTES
# (For your friend — map frontend → backend exactly)

```markdown
## Financial Reports Module — Backend Requirements

This module is READ-ONLY aggregation. It does not introduce new base models —
it queries Invoice, Payment (billing), SalaryRecord (salary), and Expense
(expenses module) and returns computed summaries. No new tables except an
optional cache table if performance requires it (not needed for MVP scale).

### Period Resolution (server-side, do not trust client dates for presets)

Given `period` query param, compute date_from/date_to server-side using
timezone.now() as the anchor — except when period="custom", in which case
use the client-supplied date_from/date_to (still validate: date_to >= date_from,
range <= 366 days, else 400).

  daily      → today (00:00 to 23:59)
  weekly     → last 7 days including today
  monthly    → current calendar month to date
  six_month  → last 6 calendar months
  yearly     → current calendar year to date
  custom     → client-provided date_from/date_to (validated)

### Endpoints

GET /api/reports/summary/
  Query: period, date_from?, date_to?
  Permission: IsAuthenticated + IsStaffMember (admin/receptionist only — reuse
    existing IsStaffMember permission class from appointments/permissions.py)
  Response:
  {
    "total_revenue": decimal,       // sum of paid Invoice.amount in range
    "total_salary": decimal,        // sum of SalaryRecord.calculated_amount in range
    "total_expenses": decimal,      // sum of Expense.amount in range
    "net_profit": decimal,          // total_revenue - total_salary - total_expenses
    "trend": [
      { "label": "Mon", "revenue": 12000, "salary": 4000, "expenses": 1500 },
      ...
    ],
    "expense_breakdown": [
      { "category": "Staff Salaries", "amount": 4000, "percentage": 57.1 },
      { "category": "Clinic Bills", "amount": 2000, "percentage": 28.6 },
      { "category": "Other", "amount": 1000, "percentage": 14.3 }
    ],
    "salary_vs_revenue": [
      { "label": "Mon", "revenue": 12000, "salary_cost": 4000, "ratio": 33.3 },
      ...
    ],
    "breakdown_rows": [
      { "period_label": "Week 1", "revenue": 45000, "salary": 15000,
        "expenses": 5000, "net_profit": 25000 },
      ...
    ]
  }
  "trend" and "salary_vs_revenue" granularity scales with period:
    daily → hourly buckets, weekly → daily buckets, monthly → daily buckets,
    six_month → monthly buckets, yearly → monthly buckets, custom → daily
    buckets if range <= 31 days else monthly buckets.
  "breakdown_rows" granularity: same bucket logic as trend.

GET /api/reports/revenue-trend/
  Same query params. Returns just the "trend" array in isolation
  (kept separate from /summary/ so the chart can be refetched independently
  if you later add real-time polling — not required for MVP, just don't
  couple the endpoint to the whole-page payload unnecessarily).
  Response: { "trend": [...] }

GET /api/reports/expense-breakdown/
  Same query params. Response: { "expense_breakdown": [...] }

GET /api/reports/salary-vs-revenue/
  Same query params. Response: { "salary_vs_revenue": [...] }

GET /api/reports/top-metrics/
  Same query params. Response:
  {
    "top_doctor_name": "Dr. Ahmed Raza",
    "top_doctor_revenue": 85000,
    "top_condition": "Hypertension",
    "top_expense_category": "Clinic Bills",
    "best_day": "12 Jan 2026",
    "best_day_amount": 22000,
    "avg_commission": 12500
  }
  Any field with no qualifying data → return null (frontend renders "—").

GET /api/reports/export-pdf/
  Query: period, date_from?, date_to?
  Permission: same as summary
  Generates a PDF using the SAME underlying summary computation as
  /api/reports/summary/ — do not duplicate the aggregation logic, extract
  it into a shared service function `compute_financial_summary(period, date_from, date_to)`
  used by both the JSON endpoint and the PDF renderer.
  PDF contents: MediFlow AI header/logo, date range, the 4 top stat numbers,
  a simple table version of breakdown_rows (ReportLab table, not a chart image
  — charts are unnecessary complexity for a v1 PDF export), footer with
  generated timestamp and generated-by user email.
  Response: application/pdf blob, filename via Content-Disposition header
  `MediFlow_Financial_Report_{period}_{date}.pdf`
  Error case: if summary computation raises → return 500 with JSON
  { "error": "Failed to generate report" } — NOT a broken/empty PDF blob,
  so the frontend's blob.type check (see exportPdf.js edge case) can catch it.

### Shared aggregation service (backend implementation note)

Create `reports/services.py` with:
  def resolve_date_range(period, date_from=None, date_to=None) -> (start, end)
  def compute_financial_summary(start, end) -> dict  (matches /summary/ shape)
  def compute_top_metrics(start, end) -> dict

Both the ViewSet actions and the PDF export call these — single source of truth,
so the numbers in the on-screen dashboard and the exported PDF can never diverge.

### Query performance notes

- total_revenue: Invoice.objects.filter(status='paid', paid_at__range=(start,end)).aggregate(Sum('amount'))
- total_salary: SalaryRecord.objects.filter(month__range=(start,end)).aggregate(Sum('calculated_amount'))
- total_expenses: Expense.objects.filter(date__range=(start,end)).aggregate(Sum('amount'))
- Use select_related/prefetch_related on doctor/patient FKs for top_doctor_name lookups
  to avoid N+1 queries when iterating grouped querysets.
- For six_month/yearly periods with daily-level source data, use Django's
  TruncMonth/TruncWeek/TruncDay + .annotate(period=TruncX('field')).values('period').annotate(total=Sum(...))
  rather than looping in Python.

### Permission matrix (consistent with Billing/Salary modules already built)

  admin        → full access to all /api/reports/* endpoints
  receptionist → full access to all /api/reports/* endpoints (same as admin — read-only, no risk)
  doctor       → 403 on every /api/reports/* endpoint, no exceptions
    (this module surfaces clinic-wide revenue and salary data — broader than
    a doctor's own numbers, which live in /api/salary/me/ instead)

### Dependency note

Expense model referenced above (Expense.amount, Expense.category, Expense.date)
does not exist yet in the codebase per current scope — it belongs to the
Expenses submodule which is still a placeholder on the frontend. Until that
model ships, /api/reports/* should treat total_expenses and expense_breakdown
as 0 / empty rather than erroring — add a feature flag or simple
try/except ImportError around the Expense query so Billing + Salary reporting
works standalone before Expenses is built.
```
