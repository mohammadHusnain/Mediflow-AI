import { PAGE_SIZE } from './pagination'

const DEMO_ADDED_BY = 'MediFlow Admin'
const DEMO_EXPENSES_STORAGE_KEY = 'mediflow_demo_expenses_v1'
const DEMO_SALARIES_STORAGE_KEY = 'mediflow_demo_salary_records_v1'
let demoExpenses = null
let demoSalaryRecords = null

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function readStoredList(key) {
  if (typeof localStorage === 'undefined') {
    return null
  }

  try {
    const stored = localStorage.getItem(key)
    const parsed = stored ? JSON.parse(stored) : null

    return Array.isArray(parsed) ? parsed : null
  } catch {
    localStorage.removeItem(key)
    return null
  }
}

function writeStoredList(key, value) {
  if (typeof localStorage === 'undefined') {
    return
  }

  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Demo persistence is best-effort only.
  }
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10)
}

function toMonthKey(date) {
  return date.toISOString().slice(0, 7)
}

function dateInMonth(monthOffset, preferredDay) {
  const now = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0).getDate()
  const maxDay = monthOffset === 0 ? Math.min(now.getDate(), lastDay) : lastDay
  const day = Math.max(1, Math.min(preferredDay, maxDay))
  return toDateKey(new Date(now.getFullYear(), now.getMonth() + monthOffset, day))
}

function expenseMonthValue(expense) {
  return String(expense.expense_month || String(expense.expense_date || '').slice(5, 7)).padStart(2, '0')
}

function expenseYearValue(expense) {
  return String(expense.expense_year || String(expense.expense_date || '').slice(0, 4))
}

function expenseMonthKey(expense) {
  return `${expenseYearValue(expense)}-${expenseMonthValue(expense)}`
}

function dateForExpenseMonth(month, year, preferredDate = toDateKey(new Date())) {
  const monthValue = String(month || String(preferredDate).slice(5, 7) || new Date().getMonth() + 1).padStart(2, '0')
  const yearValue = String(year || String(preferredDate).slice(0, 4) || new Date().getFullYear())
  const maxDay = new Date(Number(yearValue), Number(monthValue), 0).getDate()
  const preferredDay = Number(String(preferredDate || '').slice(-2)) || 1
  const day = String(Math.max(1, Math.min(preferredDay, maxDay))).padStart(2, '0')

  return `${yearValue}-${monthValue}-${day}`
}

function resolveExpensePeriod(data = {}, fallbackDate = toDateKey(new Date())) {
  const fallback = String(fallbackDate || toDateKey(new Date()))
  const month = String(data.expense_month || fallback.slice(5, 7) || new Date().getMonth() + 1).padStart(2, '0')
  const year = String(data.expense_year || fallback.slice(0, 4) || new Date().getFullYear())

  return {
    date: dateForExpenseMonth(month, year, data.expense_date || fallback),
    month: Number(month),
    year: Number(year),
  }
}

function monthKeyForOffset(monthOffset) {
  return toMonthKey(new Date(new Date().getFullYear(), new Date().getMonth() + monthOffset, 1))
}

function getPeriodStart(period = 'month') {
  const now = new Date()

  if (period === 'year') {
    return new Date(now.getFullYear(), 0, 1)
  }

  if (period === '6months') {
    return new Date(now.getFullYear(), now.getMonth() - 5, 1)
  }

  return new Date(now.getFullYear(), now.getMonth(), 1)
}

function isInPeriod(dateValue, period = 'month') {
  const date = new Date(`${dateValue}T00:00:00`)
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

  return date >= getPeriodStart(period) && date <= end
}

function isMonthInPeriod(monthValue, period = 'month') {
  const date = new Date(`${monthValue}-01T00:00:00`)
  const start = getPeriodStart(period)
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth(), 1)

  return date >= new Date(start.getFullYear(), start.getMonth(), 1) && date <= end
}

function makeExpense(id, category, expenseName, description, amount, expenseType, monthOffset, day, status = 'recorded') {
  const expenseDate = dateInMonth(monthOffset, day)

  return {
    added_by: DEMO_ADDED_BY,
    amount,
    category,
    created_at: `${expenseDate}T09:30:00.000Z`,
    description,
    expense_date: expenseDate,
    expense_month: Number(expenseDate.slice(5, 7)),
    expense_name: expenseName,
    expense_type: expenseType,
    expense_year: Number(expenseDate.slice(0, 4)),
    id,
    status,
  }
}

function makeDemoExpenses() {
  return [
    makeExpense(1, 'Rent', 'Monthly Clinic Rent', 'Main clinic floor monthly rent', 85000, 'operational', 0, 1),
    makeExpense(2, 'Electricity', 'Electricity Bill', 'Current month electricity bill', 32500, 'operational', 0, 2),
    makeExpense(3, 'Staff Salary', 'Staff Salary Payout', 'Reception and nursing salary payout', 62000, 'salary', 0, 3),
    makeExpense(4, 'Doctor Salary', 'Consultant Salary Payout', 'Consultant base salary payout', 98000, 'salary', -1, 28),
    makeExpense(5, 'Lab Supplies', 'Clinical Consumables', 'Gloves, syringes, and sample tubes', 18500, 'supplies', -1, 18),
    makeExpense(6, 'Furniture', 'Waiting Area Chairs', 'Waiting area chairs', 42000, 'equipment', -2, 12),
    makeExpense(7, 'Internet', 'Fiber Internet Bill', 'Fiber internet bill', 8500, 'operational', -2, 5),
    makeExpense(8, 'Cleaning Supplies', 'Sanitation Stock', 'Disinfectant and sanitation stock', 7400, 'supplies', -3, 22),
    makeExpense(9, 'Ultrasound Repair', 'Ultrasound Probe Service', 'Probe maintenance service', 67000, 'equipment', -4, 9),
    makeExpense(10, 'Security', 'Night Security Service', 'Night security service', 22000, 'operational', -5, 14),
    makeExpense(11, 'Software', 'Accounting Software', 'Accounting software subscription', 12000, 'other', -6, 7),
    makeExpense(12, 'Generator Fuel', 'Backup Fuel Purchase', 'Backup power fuel', 16500, 'operational', -7, 19),
    makeExpense(13, 'Stationery', 'Printed Forms', 'Forms and prescription pads', 5600, 'supplies', -8, 11),
    makeExpense(14, 'Equipment Calibration', 'Annual Calibration', 'Annual equipment calibration', 49000, 'equipment', -9, 21),
    makeExpense(15, 'Pharmacy Restock', 'Pharmacy Consumables', 'Basic consumables restock', 23500, 'supplies', -10, 16),
    makeExpense(16, 'Insurance', 'Asset Insurance', 'Clinic asset insurance', 31000, 'other', -11, 2),
  ]
}

function getExpenseStore() {
  if (!demoExpenses) {
    demoExpenses = readStoredList(DEMO_EXPENSES_STORAGE_KEY) || makeDemoExpenses()
  }

  return demoExpenses
}

function setExpenseStore(nextExpenses) {
  demoExpenses = nextExpenses
  writeStoredList(DEMO_EXPENSES_STORAGE_KEY, demoExpenses)
}

function makeSalaryRecord(id, employeeName, employeeType, role, monthOffset, amount, status, paidDay = 28) {
  const salaryMonth = monthKeyForOffset(monthOffset)

  return {
    amount,
    employee_name: employeeName,
    employee_type: employeeType,
    id,
    paid_date: status === 'paid' ? dateInMonth(monthOffset, paidDay) : null,
    role,
    salary_month: salaryMonth,
    status,
  }
}

function makeDemoSalaryRecords() {
  return [
    makeSalaryRecord(1, 'Nora Patel', 'doctor', 'Cardiologist', 0, 80000, 'pending'),
    makeSalaryRecord(2, 'Hamza Ali', 'doctor', 'General Physician', 0, 72000, 'paid', 3),
    makeSalaryRecord(3, 'Dana Teller', 'staff', 'Receptionist', 0, 30000, 'paid', 2),
    makeSalaryRecord(4, 'Mira Khan', 'staff', 'Nurse', 0, 38000, 'pending'),
    makeSalaryRecord(5, 'Nora Patel', 'doctor', 'Cardiologist', -1, 80000, 'paid'),
    makeSalaryRecord(6, 'Hamza Ali', 'doctor', 'General Physician', -1, 72000, 'paid'),
    makeSalaryRecord(7, 'Dana Teller', 'staff', 'Receptionist', -1, 30000, 'paid'),
    makeSalaryRecord(8, 'Mira Khan', 'staff', 'Nurse', -1, 38000, 'paid'),
    makeSalaryRecord(9, 'Nora Patel', 'doctor', 'Cardiologist', -2, 80000, 'paid'),
    makeSalaryRecord(10, 'Dana Teller', 'staff', 'Receptionist', -2, 30000, 'paid'),
  ]
}

function getSalaryStore() {
  if (!demoSalaryRecords) {
    demoSalaryRecords = readStoredList(DEMO_SALARIES_STORAGE_KEY) || makeDemoSalaryRecords()
  }

  return demoSalaryRecords
}

function setSalaryStore(nextRecords) {
  demoSalaryRecords = nextRecords
  writeStoredList(DEMO_SALARIES_STORAGE_KEY, demoSalaryRecords)
}

function makeRevenueMonth(monthOffset, amount, count, unpaidAmount = 0, unpaidCount = 0) {
  return {
    amount,
    count,
    month: monthKeyForOffset(monthOffset),
    unpaid_amount: unpaidAmount,
    unpaid_count: unpaidCount,
  }
}

function makeDemoRevenue() {
  return [
    makeRevenueMonth(0, 248500, 63, 26000, 7),
    makeRevenueMonth(-1, 334000, 84, 18000, 5),
    makeRevenueMonth(-2, 296500, 75, 42000, 9),
    makeRevenueMonth(-3, 312000, 78, 12000, 3),
    makeRevenueMonth(-4, 271000, 68, 24000, 6),
    makeRevenueMonth(-5, 258000, 64, 16000, 4),
    makeRevenueMonth(-6, 221000, 55, 35000, 8),
    makeRevenueMonth(-7, 244000, 61, 18000, 5),
    makeRevenueMonth(-8, 235500, 59, 22000, 6),
    makeRevenueMonth(-9, 268000, 67, 14000, 4),
    makeRevenueMonth(-10, 229000, 57, 30000, 7),
    makeRevenueMonth(-11, 251500, 62, 20000, 5),
  ]
}

function normalizeCategoryFilter(category) {
  return String(category || '').trim().toLowerCase()
}

function getFilteredExpenses(params = {}) {
  const period = params.month || params.year || params.date_from || params.date_to ? '' : params.period || 'month'
  const search = String(params.search || '').trim().toLowerCase()
  const category = normalizeCategoryFilter(params.category)
  const expenseType = String(params.expense_type || '').trim().toLowerCase()
  const month = params.month ? String(params.month).padStart(2, '0') : ''
  const year = params.year ? String(params.year) : ''
  const dateFrom = String(params.date_from || '')
  const dateTo = String(params.date_to || '')

  return getExpenseStore()
    .filter((expense) => !period || isInPeriod(expense.expense_date, period))
    .filter((expense) => !month || expenseMonthValue(expense) === month)
    .filter((expense) => !year || expenseYearValue(expense) === year)
    .filter((expense) => !dateFrom || expense.expense_date >= dateFrom)
    .filter((expense) => !dateTo || expense.expense_date <= dateTo)
    .filter((expense) => {
      if (!search) return true

      return [expense.category, expense.description, expense.expense_name]
        .some((field) => String(field || '').toLowerCase().includes(search))
    })
    .filter((expense) => {
      if (!category) return true
      return expense.category.toLowerCase() === category
    })
    .filter((expense) => {
      if (!expenseType) return true
      return expense.expense_type === expenseType
    })
    .sort((left, right) =>
      expenseMonthKey(right).localeCompare(expenseMonthKey(left)) ||
      right.expense_date.localeCompare(left.expense_date)
    )
}

export function getDemoExpenses(params = {}) {
  const page = Math.max(1, Number(params.page || 1))
  const pageSize = Math.max(1, Number(params.page_size || PAGE_SIZE))
  const filteredExpenses = getFilteredExpenses(params)
  const start = (page - 1) * pageSize
  const periodTotal = filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0)

  return {
    count: filteredExpenses.length,
    next: start + pageSize < filteredExpenses.length ? page + 1 : null,
    period_total: periodTotal,
    previous: page > 1 ? page - 1 : null,
    results: clone(filteredExpenses.slice(start, start + pageSize)),
  }
}

export function getDemoExpenseById(id) {
  const expense = getExpenseStore().find((candidate) => String(candidate.id) === String(id))

  if (!expense) {
    const error = new Error('Expense not found.')
    error.response = { data: { detail: 'Expense not found.' }, status: 404 }
    throw error
  }

  return clone(expense)
}

export function getDemoExpenseCategories() {
  const categoryMap = getExpenseStore().reduce((map, expense) => {
    const key = expense.category.toLowerCase()
    const current = map.get(key) || { count: 0, name: expense.category }
    current.count += 1
    map.set(key, current)
    return map
  }, new Map())

  return clone([...categoryMap.values()].sort((left, right) => left.name.localeCompare(right.name)))
}

export function createDemoExpense(data = {}) {
  const expenses = getExpenseStore()
  const amount = Number(data.amount)
  const period = resolveExpensePeriod(data)
  const nextExpense = {
    added_by: DEMO_ADDED_BY,
    amount: Number.isFinite(amount) ? Number(amount.toFixed(2)) : 0,
    category: String(data.category || '').trim(),
    created_at: new Date().toISOString(),
    description: String(data.description || '').trim(),
    expense_date: period.date,
    expense_month: period.month,
    expense_name: String(data.expense_name || data.name || data.category || '').trim(),
    expense_type: data.expense_type || 'other',
    expense_year: period.year,
    id: Math.max(0, ...expenses.map((expense) => Number(expense.id) || 0)) + 1,
    status: data.status || 'recorded',
  }

  setExpenseStore([nextExpense, ...expenses])
  return clone(nextExpense)
}

export function updateDemoExpense(id, data = {}) {
  let updatedExpense = null
  const nextExpenses = getExpenseStore().map((expense) => {
    if (String(expense.id) !== String(id)) {
      return expense
    }

    const amount = Number(data.amount)
    const period = resolveExpensePeriod(data, expense.expense_date)
    updatedExpense = {
      ...expense,
      amount: Number.isFinite(amount) ? Number(amount.toFixed(2)) : expense.amount,
      category: String(data.category || expense.category).trim(),
      description: String(data.description ?? expense.description).trim(),
      expense_date: period.date,
      expense_month: period.month,
      expense_name: String(data.expense_name || data.name || expense.expense_name || expense.category).trim(),
      expense_type: data.expense_type || expense.expense_type,
      expense_year: period.year,
      status: data.status || expense.status || 'recorded',
    }

    return updatedExpense
  })

  if (!updatedExpense) {
    const error = new Error('Expense not found.')
    error.response = { data: { detail: 'Expense not found.' }, status: 404 }
    throw error
  }

  setExpenseStore(nextExpenses)
  return clone(updatedExpense)
}

export function deleteDemoExpense(id) {
  const expenses = getExpenseStore()
  const target = expenses.find((expense) => String(expense.id) === String(id))

  if (!target) {
    const error = new Error('Expense not found.')
    error.response = { data: { detail: 'Expense not found.' }, status: 404 }
    throw error
  }

  setExpenseStore(expenses.filter((expense) => String(expense.id) !== String(id)))
  return { id }
}

function getRevenueForMonth(month) {
  return makeDemoRevenue().find((item) => item.month === month) || {
    amount: 0,
    count: 0,
    month,
    unpaid_amount: 0,
    unpaid_count: 0,
  }
}

function getMonthsForPeriod(period = 'month') {
  const count = period === 'year' ? 12 : period === '6months' ? 6 : 1
  return Array.from({ length: count }, (_, index) => monthKeyForOffset(index - count + 1))
}

function getWeeklyBreakdown(periodExpenses) {
  const weekLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4']
  const weeklyRevenue = [64000, 72500, 58000, 54000]

  return weekLabels.map((label, index) => {
    const minDay = index * 7 + 1
    const maxDay = index === 3 ? 31 : minDay + 6
    const expenses = periodExpenses.filter((expense) => {
      const day = Number(expense.expense_date.slice(-2))
      return day >= minDay && day <= maxDay
    })

    return {
      expenses: expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
      month: label,
      revenue: weeklyRevenue[index] || 0,
      salary: expenses
        .filter((expense) => expense.expense_type === 'salary')
        .reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    }
  }).filter((item) => item.expenses > 0 || item.revenue > 0)
}

function getMonthlyBreakdown(period, periodExpenses) {
  if (period === 'month') {
    return getWeeklyBreakdown(periodExpenses)
  }

  return getMonthsForPeriod(period).map((month) => {
    const expenses = periodExpenses.filter((expense) => expenseMonthKey(expense) === month)
    const revenue = getRevenueForMonth(month)

    return {
      expenses: expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
      month,
      revenue: Number(revenue.amount || 0),
      salary: expenses
        .filter((expense) => expense.expense_type === 'salary')
        .reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    }
  })
}

export function getDemoExpenseSummary(period = 'month') {
  const expenses = getExpenseStore().filter((expense) => isInPeriod(expense.expense_date, period))
  const revenueMonths = makeDemoRevenue().filter((item) => isMonthInPeriod(item.month, period))
  const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0)
  const totalPatientRevenue = revenueMonths.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const categoryMap = new Map()
  const typeMap = new Map()

  expenses.forEach((expense) => {
    const category = categoryMap.get(expense.category) || {
      amount: 0,
      category: expense.category,
      count: 0,
    }
    category.amount += Number(expense.amount || 0)
    category.count += 1
    categoryMap.set(expense.category, category)

    const typeAmount = typeMap.get(expense.expense_type) || 0
    typeMap.set(expense.expense_type, typeAmount + Number(expense.amount || 0))
  })

  return clone({
    category_breakdown: [...categoryMap.values()].sort((left, right) => right.amount - left.amount),
    expense_type_breakdown: [...typeMap.entries()].map(([type, amount]) => ({ amount, type })),
    monthly_breakdown: getMonthlyBreakdown(period, expenses),
    net: totalPatientRevenue - totalExpenses,
    period,
    total_equipment: expenses
      .filter((expense) => expense.expense_type === 'equipment')
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    total_expenses: totalExpenses,
    total_operational: expenses
      .filter((expense) => expense.expense_type === 'operational')
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    total_other: expenses
      .filter((expense) => expense.expense_type === 'other' || expense.expense_type === 'supplies')
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    total_patient_revenue: totalPatientRevenue,
    total_salary: expenses
      .filter((expense) => expense.expense_type === 'salary')
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
  })
}

export function getDemoSalaryRecords(params = {}) {
  const page = Math.max(1, Number(params.page || 1))
  const pageSize = Math.max(1, Number(params.page_size || PAGE_SIZE))
  const period = params.period || 'month'
  const records = getSalaryStore()
    .filter((record) => isMonthInPeriod(record.salary_month, period))
    .sort((left, right) => right.salary_month.localeCompare(left.salary_month))
  const start = (page - 1) * pageSize

  return {
    count: records.length,
    next: start + pageSize < records.length ? page + 1 : null,
    previous: page > 1 ? page - 1 : null,
    results: clone(records.slice(start, start + pageSize)),
  }
}

export function markDemoSalaryPaid(id) {
  let updatedRecord = null
  const nextRecords = getSalaryStore().map((record) => {
    if (String(record.id) !== String(id)) {
      return record
    }

    updatedRecord = {
      ...record,
      paid_date: toDateKey(new Date()),
      status: 'paid',
    }

    return updatedRecord
  })

  if (!updatedRecord) {
    const error = new Error('Salary record not found.')
    error.response = { data: { detail: 'Salary record not found.' }, status: 404 }
    throw error
  }

  setSalaryStore(nextRecords)
  return clone(updatedRecord)
}

export function getDemoPatientRevenue(period = 'month') {
  const revenue = makeDemoRevenue().filter((item) => isMonthInPeriod(item.month, period))
  const totalRevenue = revenue.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const unpaidAmount = revenue.reduce((sum, item) => sum + Number(item.unpaid_amount || 0), 0)
  const unpaidCount = revenue.reduce((sum, item) => sum + Number(item.unpaid_count || 0), 0)

  return clone({
    monthly: period === 'month'
      ? [
          { amount: 64000, count: 16, month: 'Week 1' },
          { amount: 72500, count: 19, month: 'Week 2' },
          { amount: 58000, count: 14, month: 'Week 3' },
          { amount: 54000, count: 14, month: 'Week 4' },
        ]
      : revenue.map((item) => ({
          amount: item.amount,
          count: item.count,
          month: item.month,
        })).reverse(),
    paid_count: revenue.reduce((sum, item) => sum + Number(item.count || 0), 0),
    period,
    total_revenue: totalRevenue,
    unpaid_amount: unpaidAmount,
    unpaid_count: unpaidCount,
  })
}
