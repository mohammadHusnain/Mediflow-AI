import { useState } from 'react'
import SalaryConfigTab from './SalaryConfigTab'
import PayrollTab from './PayrollTab'
import SalaryRecordsTab from './SalaryRecordsTab'

const TABS = [
  { id: 'config', label: 'Salary Config' },
  { id: 'payroll', label: 'Payroll' },
  { id: 'records', label: 'Records' },
]

export default function SalaryPage() {
  const [tab, setTab] = useState('config')

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-[30px] font-extrabold text-ink">Salary Management</h1>
        <p className="mt-2 text-[14px] text-slate">
          Configure salaries and process monthly payroll
        </p>
      </div>

      <div className="border-b border-hairline flex">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-3 text-[13px] font-medium transition-all border-b-2 -mb-px ${
              tab === t.id
                ? 'border-brand text-brand font-semibold'
                : 'border-transparent text-slate hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'config' && <SalaryConfigTab />}
      {tab === 'payroll' && <PayrollTab />}
      {tab === 'records' && <SalaryRecordsTab />}
    </div>
  )
}
