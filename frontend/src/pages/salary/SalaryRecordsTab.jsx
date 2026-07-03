import { useState, useEffect, useCallback } from 'react'
import MonthYearPicker from '@shared/components/billing/MonthYearPicker'
import { formatCurrencyShort } from '@shared/lib/currency'
import { getSalaryRecords, updateSalaryRecord } from '@shared/services/billingApi'

const now = new Date()

const statusBadge = (s) => {
  const m = {
    pending: ['bg-amber-50 text-amber-700', 'Pending'],
    processed: ['bg-brand-light text-brand', 'Processed'],
    paid: ['bg-green-50 text-green-700', 'Paid'],
  }
  const [cls, lbl] = m[s] || m.pending
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${cls}`}>
      {lbl}
    </span>
  )
}

export default function SalaryRecordsTab() {
  const [period, setPeriod] = useState({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  })
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await getSalaryRecords({
        month: period.month,
        year: period.year,
      })
      setRecords(r.data.results ?? r.data)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    load()
  }, [load])

  const markPaid = async (id) => {
    await updateSalaryRecord(id, {
      status: 'paid',
      paid_on: new Date().toISOString().slice(0, 10),
    })
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="text-[16px] font-semibold text-ink">Payroll Records</h2>
        <MonthYearPicker value={period} onChange={setPeriod} />
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand/20 border-t-brand" />
        </div>
      ) : records.length === 0 ? (
        <section className="rounded-card bg-canvas p-10 text-center shadow-card">
          <p className="text-[14px] font-semibold text-slate">No records for this period</p>
        </section>
      ) : (
        <section className="overflow-hidden rounded-card bg-canvas shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left">
              <thead className="border-b border-hairline bg-mist">
                <tr>
                  {['Employee', 'Period', 'Type', 'Net Salary', 'Status', 'Actions'].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate"
                      scope="col"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr
                    key={r.id}
                    className="animate-fade-up border-b border-hairline transition-colors duration-100 last:border-0 hover:bg-brand-light/40"
                    style={{ animationDelay: `${i * 0.03}s` }}
                  >
                    <td className="px-5 py-4 text-[14px] font-medium text-ink">
                      {r.employee?.full_name}
                    </td>
                    <td className="px-5 py-4 font-sans text-[13px] text-slate">
                      {String(r.period_month).padStart(2, '0')}/{r.period_year}
                    </td>
                    <td className="px-5 py-4 text-[13px] capitalize text-slate">{r.salary_type}</td>
                    <td className="px-5 py-4 font-sans text-[14px] font-bold text-ink">
                      {formatCurrencyShort(r.net_salary)}
                    </td>
                    <td className="px-5 py-4">{statusBadge(r.status)}</td>
                    <td className="px-5 py-4">
                      {r.status === 'processed' && (
                        <button
                          onClick={() => markPaid(r.id)}
                          className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-[12px] font-medium text-green-700 transition-colors hover:bg-green-100"
                          type="button"
                        >
                          Mark Paid
                        </button>
                      )}
                      {r.status === 'paid' && (
                        <span className="text-[12px] text-slate">Paid {r.paid_on}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
