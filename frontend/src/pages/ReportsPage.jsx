import { useState } from 'react'
import { BarChart2, Download, FileText, TrendingUp } from 'lucide-react'
import MonthYearPicker from '@shared/components/billing/MonthYearPicker'
import { formatCurrency, formatCurrencyShort } from '@shared/lib/currency'
import {
  getFinancialReportData,
  downloadFinancialReportPDF,
} from '@shared/services/billingApi'

const PERIODS = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
]

function StatCard({ context, icon: Icon, label, tone, value }) {
  const colors = {
    brand: 'bg-brand-light text-brand',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    slate: 'bg-slate-100 text-slate-600',
  }

  return (
    <section className="animate-fade-up rounded-card border border-hairline bg-canvas p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(20,24,31,0.07)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[36px] font-bold leading-none text-ink">{value}</p>
          <p className="mt-3 text-[13px] font-medium text-ink">{label}</p>
          <p className="mt-1 text-[12px] font-normal text-slate">{context}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors[tone]}`}>
          <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
        </div>
      </div>
    </section>
  )
}

export default function ReportsPage({ embedded = false }) {
  const [period, setPeriod] = useState('daily')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [monthYear, setMonthYear] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  })
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLoad = async () => {
    setLoading(true)
    setError('')
    setReport(null)
    try {
      const params = { period }
      if (period === 'daily' || period === 'weekly') {
        params.date = date
      } else {
        params.month = monthYear.month
        params.year = monthYear.year
      }
      const r = await getFinancialReportData(params)
      setReport(r.data)
    } catch {
      setError('Could not load report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      const params = { period }
      if (period === 'daily' || period === 'weekly') {
        params.date = date
      } else {
        params.month = monthYear.month
        params.year = monthYear.year
      }
      const res = await downloadFinancialReportPDF(params)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = Object.assign(document.createElement('a'), {
        href: url,
        download: `financial_report_${period}_${new Date().toISOString().split('T')[0]}.pdf`,
      })
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // silently fail
    }
  }

  return (
    <div className="space-y-5 animate-fade-up">
      {!embedded && (
        <div>
          <h1 className="text-[30px] font-extrabold text-ink">Financial Reports</h1>
          <p className="mt-2 text-[14px] leading-6 text-slate">
            Daily, weekly, and monthly revenue insights
          </p>
        </div>
      )}

      <section className="rounded-card bg-canvas p-4 shadow-card">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex rounded-control border border-hairline bg-mist p-1">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`rounded-control px-4 py-2 text-[13px] font-semibold transition ${
                  period === p.id
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-slate hover:text-ink'
                }`}
                type="button"
              >
                {p.label}
              </button>
            ))}
          </div>

          {period === 'monthly' ? (
            <MonthYearPicker value={monthYear} onChange={setMonthYear} />
          ) : (
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 rounded-control border border-hairline bg-canvas px-4 text-[14px] text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
          )}

          <button
            onClick={handleLoad}
            disabled={loading}
            className="primary-button inline-flex h-11 items-center rounded-control bg-brand px-5 text-[13px] font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
            type="button"
          >
            {loading ? 'Loading…' : 'Generate Report'}
          </button>

          {report && (
            <button
              onClick={handleDownloadPDF}
              className="inline-flex h-11 items-center gap-2 rounded-control border border-hairline px-4 text-[13px] font-medium text-slate transition hover:bg-mist hover:text-ink"
              type="button"
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              Download PDF
            </button>
          )}
        </div>
      </section>

      {error && (
        <section className="rounded-card bg-canvas p-10 text-center shadow-card">
          <BarChart2 aria-hidden="true" className="mx-auto mb-4 h-10 w-10 text-slate/30" />
          <h2 className="text-[16px] font-semibold text-ink">Something went wrong</h2>
          <p className="mt-1 text-[14px] text-slate">{error}</p>
          <button
            className="mt-5 rounded-control border border-hairline bg-canvas px-4 py-2 text-sm font-semibold text-slate transition hover:bg-mist hover:text-ink"
            onClick={handleLoad}
            type="button"
          >
            Try again
          </button>
        </section>
      )}

      {loading && (
        <div className="flex h-40 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand/20 border-t-brand" />
        </div>
      )}

      {report && (
        <>
          <div className="flex items-center gap-3">
            <h2 className="text-[20px] font-bold text-ink">{report.label}</h2>
            <span className="rounded-full bg-brand-light px-3 py-1 text-[11px] font-semibold text-brand">
              {report.period}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              context="paid invoices"
              icon={TrendingUp}
              label="Total Revenue"
              tone="green"
              value={formatCurrencyShort(report.total_revenue)}
            />
            <StatCard
              context={`${report.unpaid_count} unpaid`}
              icon={FileText}
              label="Outstanding"
              tone="amber"
              value={formatCurrencyShort(report.total_outstanding)}
            />
            <StatCard
              context="collection efficiency"
              icon={BarChart2}
              label="Collection Rate"
              tone={report.collection_rate >= 80 ? 'brand' : 'amber'}
              value={`${report.collection_rate}%`}
            />
            <StatCard
              context={`${report.paid_count} paid, ${report.partial_count} partial, ${report.void_count} void`}
              icon={FileText}
              label="Total Invoices"
              tone="slate"
              value={report.total_invoices}
            />
          </div>

          <section className="overflow-hidden rounded-card bg-canvas shadow-card">
            <div className="border-b border-hairline bg-mist px-5 py-3.5">
              <h3 className="text-[14px] font-semibold text-ink">Invoice Status Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px] border-collapse text-left">
                <thead className="border-b border-hairline bg-mist">
                  <tr>
                    {['Status', 'Count', 'Amount'].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate"
                        scope="col"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Paid', report.paid_count, report.total_revenue],
                    ['Unpaid', report.unpaid_count, report.total_outstanding],
                    ['Partial', report.partial_count, null],
                    ['Void', report.void_count, null],
                  ].map(([label, count, amount], i) => (
                    <tr
                      key={label}
                      className="animate-fade-up border-b border-hairline last:border-0"
                      style={{ animationDelay: `${i * 0.03}s` }}
                    >
                      <td className="px-5 py-3.5 text-[14px] font-medium text-ink">{label}</td>
                      <td className="px-5 py-3.5 font-sans text-[14px] text-ink">{count}</td>
                      <td className="px-5 py-3.5 font-sans text-[14px] text-slate">
                        {amount !== null ? formatCurrency(amount) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {Object.values(report.payment_methods).some((m) => m.count > 0) && (
            <section className="overflow-hidden rounded-card bg-canvas shadow-card">
              <div className="border-b border-hairline bg-mist px-5 py-3.5">
                <h3 className="text-[14px] font-semibold text-ink">Payment Method Breakdown (Paid)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[400px] border-collapse text-left">
                  <thead className="border-b border-hairline bg-mist">
                    <tr>
                      {['Method', 'Count', 'Amount'].map((h) => (
                        <th
                          key={h}
                          className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate"
                          scope="col"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(report.payment_methods)
                      .filter(([, d]) => d.count > 0)
                      .map(([method, data], i) => (
                        <tr
                          key={method}
                          className="animate-fade-up border-b border-hairline last:border-0"
                          style={{ animationDelay: `${i * 0.03}s` }}
                        >
                          <td className="px-5 py-3.5 text-[14px] capitalize text-ink">{method}</td>
                          <td className="px-5 py-3.5 font-sans text-[14px] text-ink">{data.count}</td>
                          <td className="px-5 py-3.5 font-sans text-[14px] text-slate">
                            {formatCurrency(data.amount)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {report.top_doctors.length > 0 && (
            <section className="overflow-hidden rounded-card bg-canvas shadow-card">
              <div className="border-b border-hairline bg-mist px-5 py-3.5">
                <h3 className="text-[14px] font-semibold text-ink">Top Doctors by Revenue</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[400px] border-collapse text-left">
                  <thead className="border-b border-hairline bg-mist">
                    <tr>
                      {['Doctor', 'Cases', 'Revenue'].map((h) => (
                        <th
                          key={h}
                          className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate"
                          scope="col"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.top_doctors.map((d, i) => (
                      <tr
                        key={d.name}
                        className="animate-fade-up border-b border-hairline last:border-0"
                        style={{ animationDelay: `${i * 0.03}s` }}
                      >
                        <td className="px-5 py-3.5 text-[14px] font-medium text-ink">{d.name}</td>
                        <td className="px-5 py-3.5 font-sans text-[14px] text-ink">{d.cases}</td>
                        <td className="px-5 py-3.5 font-sans text-[14px] text-brand">
                          {formatCurrency(d.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
