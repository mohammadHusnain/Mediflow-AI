import CurrencyDisplay from '@shared/components/CurrencyDisplay'

function numberValue(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function total(rows, key) {
  return rows.reduce((sum, row) => sum + numberValue(row[key]), 0)
}

const STATUS_STYLES = {
  synced: 'border-brand/15 bg-brand-light text-brand',
  pending: 'border-[#F59E0B]/20 bg-[#FEF3C7] text-[#B45309]',
  empty: 'border-hairline bg-mist text-slate',
}

function statusForAmount(value, emptyLabel = 'No data') {
  return numberValue(value) > 0
    ? { label: 'Synced', tone: 'synced' }
    : { label: emptyLabel, tone: 'empty' }
}

function StatusChip({ status }) {
  return (
    <span
      className={[
        'inline-flex h-6 items-center rounded-full border px-2.5 text-[11px] font-semibold',
        STATUS_STYLES[status.tone] || STATUS_STYLES.empty,
      ].join(' ')}
    >
      {status.label}
    </span>
  )
}

function SourceCell({ amount, emptyLabel }) {
  const status = statusForAmount(amount, emptyLabel)

  return (
    <td className="px-4 py-3">
      <div className="flex min-w-[140px] flex-col gap-1.5">
        <StatusChip status={status} />
        <span className="font-mono text-[13px] font-medium text-ink">
          <CurrencyDisplay amount={amount} />
        </span>
      </div>
    </td>
  )
}

function NetProfitCell({ value, strong = false }) {
  return (
    <td className={`px-4 py-3 font-mono ${strong ? 'font-bold' : 'font-medium'} ${numberValue(value) >= 0 ? 'text-[#0F9D66]' : 'text-[#C8102E]'}`}>
      <CurrencyDisplay amount={value} />
    </td>
  )
}

export default function ReportsBreakdownTable({ period, rows = [] }) {
  if (rows.length === 0) {
    return (
      <section className="rounded-[16px] border border-hairline bg-canvas py-8 text-center text-[14px] text-slate">
        No data available for this range
      </section>
    )
  }

  const totals = {
    expenses: total(rows, 'expenses'),
    net_profit: total(rows, 'net_profit'),
    revenue: total(rows, 'revenue'),
    salary: total(rows, 'salary'),
  }

  return (
    <section className="overflow-hidden rounded-[16px] border border-hairline bg-canvas">
      <div className="flex flex-col gap-1 border-b border-hairline px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-[16px] font-semibold text-ink">Billing, Salary & Expenses Report</h3>
          <p className="mt-1 text-[12px] font-medium text-slate">Synced status by period</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-left">
          <thead className="bg-mist/60">
            <tr>
              {['Period', 'Billing', 'Salary', 'Expenses', 'Net Profit'].map((header) => (
                <th
                  className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate"
                  key={header}
                  scope="col"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr className="border-b border-hairline last:border-0" key={`${period}-${row.label || index}`}>
                <td className="px-4 py-3 text-[13px] font-medium text-ink">{row.label || '-'}</td>
                <SourceCell amount={row.revenue} emptyLabel="No billing" />
                <SourceCell amount={row.salary} emptyLabel="No salary" />
                <SourceCell amount={row.expenses} emptyLabel="No expenses" />
                <NetProfitCell value={row.net_profit} />
              </tr>
            ))}
            <tr className="border-t-2 border-hairline bg-mist/40">
              <td className="px-4 py-3 text-[13px] font-bold text-ink">Total</td>
              <SourceCell amount={totals.revenue} emptyLabel="No billing" />
              <SourceCell amount={totals.salary} emptyLabel="No salary" />
              <SourceCell amount={totals.expenses} emptyLabel="No expenses" />
              <NetProfitCell strong value={totals.net_profit} />
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}
