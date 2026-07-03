export const EXPENSE_PERIODS = [
  { label: 'This Month', value: 'month' },
  { label: 'Last 6 Months', value: '6months' },
  { label: 'This Year', value: 'year' },
]

export function getExpensePeriodLabel(period) {
  return EXPENSE_PERIODS.find((item) => item.value === period)?.label || 'This Month'
}

export function normalizeExpensePeriod(period) {
  return EXPENSE_PERIODS.some((item) => item.value === period) ? period : 'month'
}
