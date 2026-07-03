import { useState } from 'react'
import MonthYearPicker from '@shared/components/billing/MonthYearPicker'
import { formatCurrencyShort } from '@shared/lib/currency'
import { getSalaryPreview, processSalary } from '@shared/services/billingApi'

const now = new Date()

export default function PayrollTab() {
  const [period, setPeriod] = useState({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  })
  const [preview, setPreview] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const handlePreview = async () => {
    setLoading(true)
    setMsg('')
    try {
      const r = await getSalaryPreview(period.month, period.year)
      setPreview(r.data)
      setSelected(new Set())
    } finally {
      setLoading(false)
    }
  }

  const toggleAll = (e) =>
    setSelected(
      e.target.checked
        ? new Set(preview.filter((p) => !p.already_processed).map((p) => p.employee_id))
        : new Set(),
    )

  const toggle = (id) =>
    setSelected((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  const handleProcess = async () => {
    if (!selected.size) return
    setLoading(true)
    try {
      const r = await processSalary({
        month: period.month,
        year: period.year,
        employee_ids: [...selected],
      })
      setMsg(`Payroll processed for ${r.data.created} employee(s). ${r.data.skipped} skipped.`)
      handlePreview()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <h2 className="text-[16px] font-semibold text-ink">Process Monthly Payroll</h2>

      <section className="flex flex-wrap items-center gap-4 rounded-card bg-canvas p-4 shadow-card">
        <MonthYearPicker value={period} onChange={setPeriod} />
        <button
          onClick={handlePreview}
          disabled={loading}
          className="primary-button inline-flex h-10 items-center rounded-control bg-brand px-5 text-[13px] font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          type="button"
        >
          {loading ? 'Loading…' : 'Preview Payroll'}
        </button>
      </section>

      {msg && (
        <section className="rounded-card border border-green-200 bg-green-50 px-4 py-3 text-[13px] font-medium text-green-700">
          {msg}
        </section>
      )}

      {preview.length > 0 && (
        <>
          <section className="overflow-hidden rounded-card bg-canvas shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead className="border-b border-hairline bg-mist">
                  <tr>
                    <th className="px-5 py-3.5">
                      <input type="checkbox" onChange={toggleAll} />
                    </th>
                    {['Employee', 'Role', 'Type', 'Base', 'Commission', 'Net Salary', 'Status'].map((h) => (
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
                  {preview.map((p) => (
                    <tr
                      key={p.employee_id}
                      className={`border-b border-hairline transition-colors last:border-0 hover:bg-brand-light/40 ${
                        p.already_processed ? 'opacity-50' : ''
                      }`}
                    >
                      <td className="px-5 py-4">
                        <input
                          type="checkbox"
                          disabled={p.already_processed}
                          checked={selected.has(p.employee_id)}
                          onChange={() => toggle(p.employee_id)}
                        />
                      </td>
                      <td className="px-5 py-4 text-[14px] font-medium text-ink">
                        {p.employee_name}
                      </td>
                      <td className="px-5 py-4 text-[13px] capitalize text-slate">{p.role}</td>
                      <td className="px-5 py-4 text-[13px] capitalize text-slate">{p.salary_type}</td>
                      <td className="px-5 py-4 font-sans text-[13px] text-ink">
                        {formatCurrencyShort(p.base_salary)}
                      </td>
                      <td className="px-5 py-4 font-sans text-[13px] text-brand">
                        {p.commission_earned > 0
                          ? `${formatCurrencyShort(p.commission_earned)} (${p.appointments_count} appts)`
                          : '—'}
                      </td>
                      <td className="px-5 py-4 font-sans text-[14px] font-bold text-ink">
                        {formatCurrencyShort(p.net_salary)}
                      </td>
                      <td className="px-5 py-4">
                        {p.already_processed ? (
                          <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700">
                            Processed
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="flex justify-end">
            <button
              onClick={handleProcess}
              disabled={!selected.size || loading}
              className="primary-button inline-flex h-10 items-center rounded-control bg-green-600 px-6 text-[13px] font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
              type="button"
            >
              Process Selected ({selected.size})
            </button>
          </div>
        </>
      )}
    </div>
  )
}
