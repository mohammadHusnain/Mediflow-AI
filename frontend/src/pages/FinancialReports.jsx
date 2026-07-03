import { useMemo } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import PeriodToggle from '../components/expenses/PeriodToggle.jsx'
import { normalizeExpensePeriod } from '../components/expenses/periods.js'
import ReportsPage from './ReportsPage.jsx'
import ExpensesTab from './expenses/ExpensesTab.jsx'

const TABS = [
  { id: 'expenses', label: 'Expenses' },
  { id: 'report', label: 'Revenue Report' },
]

export default function FinancialReports() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const period = normalizeExpensePeriod(searchParams.get('period'))
  const activeTab = searchParams.get('tab') === 'report' ? 'report' : 'expenses'

  const tabSearch = useMemo(() => {
    const params = new URLSearchParams(searchParams)

    if (activeTab === 'expenses') {
      params.set('period', period)
      params.delete('tab')
    }

    return params
  }, [activeTab, period, searchParams])

  function handlePeriodChange(nextPeriod) {
    const params = new URLSearchParams(searchParams)
    params.set('period', nextPeriod)
    params.delete('tab')
    setSearchParams(params)
  }

  function handleTabChange(tabId) {
    if (tabId === 'report') {
      navigate('/financial-reports/expenses?tab=report')
      return
    }

    const params = new URLSearchParams(tabSearch)
    params.delete('tab')
    navigate(`/financial-reports/expenses?${params.toString()}`)
  }

  return (
    <div className="animate-fade-up space-y-5">
      <section className="overflow-hidden rounded-card bg-canvas shadow-card">
        <div className="flex flex-col gap-3 border-b border-hairline px-5 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex gap-0">
            {TABS.map((tab) => {
              const active = tab.id === activeTab

              return (
                <button
                  className={[
                    'h-11 border-b-2 px-5 text-[14px] font-medium transition',
                    active
                      ? 'border-brand font-semibold text-brand'
                      : 'border-transparent text-slate hover:text-ink',
                  ].join(' ')}
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  type="button"
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {activeTab === 'expenses' ? (
            <PeriodToggle onChange={handlePeriodChange} value={period} />
          ) : null}
        </div>

        {activeTab === 'expenses' ? (
          <div className="bg-mist/40 px-4 py-5 md:px-6 lg:px-8">
            <ExpensesTab key={`${location.pathname}-${period}`} period={period} />
          </div>
        ) : (
          <div className="bg-mist/40 px-4 py-5 md:px-6 lg:px-8">
            <ReportsPage embedded />
          </div>
        )}
      </section>
    </div>
  )
}
