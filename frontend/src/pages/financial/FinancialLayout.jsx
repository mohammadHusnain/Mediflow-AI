import { Construction } from 'lucide-react'
import { NavLink, Outlet, useLocation, useOutletContext } from 'react-router-dom'

import { useAuth } from '@shared/context/AuthContext'

const PRIMARY_TABS = [
  { label: 'Billing', match: '/financial-reports/billing', to: '/financial-reports/billing/invoices' },
  { label: 'Salary', match: '/financial-reports/salary', to: '/financial-reports/salary' },
  { label: 'Expenses', match: '/financial-reports/expenses', to: '/financial-reports/expenses' },
  { label: 'Reports', match: '/financial-reports/reports', to: '/financial-reports/reports' },
]

const BILLING_TABS = [
  { label: 'Appointment Invoices', to: '/financial-reports/billing/invoices' },
  { label: 'Payment Records', to: '/financial-reports/billing/payments' },
  { label: 'Invoice History', to: '/financial-reports/billing/history' },
]

const SALARY_TABS = [
  { label: 'Overview', to: '/financial-reports/salary' },
  { label: 'Salary Config', to: '/financial-reports/salary/config' },
  { label: 'Salary History', to: '/financial-reports/salary/history' },
]

function tabClass(active) {
  return [
    'inline-flex min-w-[132px] items-center justify-center whitespace-nowrap border-b-2 px-5 py-4 text-center text-[15px] font-bold transition',
    active
      ? 'border-brand text-brand'
      : 'border-transparent text-slate hover:text-ink',
  ].join(' ')
}

function subTabClass({ isActive }) {
  return [
    'rounded-control px-3 py-2 text-[13px] transition',
    isActive
      ? 'bg-brand/10 font-semibold text-brand'
      : 'font-medium text-slate hover:bg-mist hover:text-ink',
  ].join(' ')
}

export function SalaryPlaceholder() {
  return (
    <section className="mx-auto flex min-h-[360px] max-w-2xl items-center justify-center rounded-[16px] border border-hairline bg-canvas p-8 text-center shadow-card">
      <div>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-brand/10 text-brand">
          <Construction aria-hidden="true" className="h-6 w-6" />
        </div>
        <h2 className="text-[18px] font-semibold text-ink">Salary module coming soon</h2>
        <p className="mt-2 text-[14px] text-slate">
          Fixed salary, commission salary, configuration, and history will live here.
        </p>
      </div>
    </section>
  )
}

export default function FinancialLayout() {
  const location = useLocation()
  const outletContext = useOutletContext()
  const { role } = useAuth()
  const billingActive = location.pathname.startsWith('/financial-reports/billing')
  const salaryActive = location.pathname.startsWith('/financial-reports/salary')
  const isDoctor = role?.slug === 'doctor'
  const primaryTabs = isDoctor
    ? PRIMARY_TABS.filter((tab) => tab.match === '/financial-reports/salary')
    : PRIMARY_TABS
  const salaryTabs = isDoctor
    ? SALARY_TABS.filter((tab) => tab.to !== '/financial-reports/salary/config')
    : SALARY_TABS

  return (
    <div className="animate-fade-up">
      <div className="sticky top-16 z-10 -mx-4 -mt-4 border-b border-hairline bg-canvas md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-8">
        <nav className="mx-auto flex max-w-[1200px] justify-start gap-0 overflow-x-auto px-6 sm:justify-center">
          {primaryTabs.map((tab) => (
            <NavLink
              className={() => tabClass(location.pathname.startsWith(tab.match))}
              key={tab.to}
              to={tab.to}
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {billingActive ? (
        <div className="mx-auto mt-6 flex max-w-[1200px] flex-wrap gap-2 px-1">
          {BILLING_TABS.map((tab) => (
            <NavLink className={subTabClass} key={tab.to} to={tab.to}>
              {tab.label}
            </NavLink>
          ))}
        </div>
      ) : null}

      {salaryActive ? (
        <div className="mx-auto mt-6 flex max-w-[1200px] flex-wrap gap-2 px-1">
          {salaryTabs.map((tab) => (
            <NavLink
              className={({ isActive }) =>
                subTabClass({
                  isActive: tab.to === '/financial-reports/salary'
                    ? location.pathname === tab.to
                    : isActive,
                })}
              end={tab.to === '/financial-reports/salary'}
              key={tab.to}
              to={tab.to}
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
      ) : null}

      <div className="mx-auto max-w-[1200px] py-6">
        <Outlet context={outletContext} />
      </div>
    </div>
  )
}
