const PKR_FORMATTER = new Intl.NumberFormat('en-PK')

function numberValue(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function formatCurrency(value) {
  return `PKR ${PKR_FORMATTER.format(numberValue(value))}`
}

function total(rows, key) {
  return rows.reduce((sum, row) => sum + numberValue(row[key]), 0)
}

function NetProfitCell({ value, strong = false }) {
  return (
    <td className={`px-5 py-3 font-mono ${strong ? 'font-bold' : 'font-medium'} ${numberValue(value) >= 0 ? 'text-[#0F9D66]' : 'text-[#C8102E]'}`}>
      {formatCurrency(value)}
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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead className="bg-mist/60">
            <tr>
              {['Period', 'Revenue', 'Salary Paid', 'Expenses', 'Net Profit'].map((header) => (
                <th
                  className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate"
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
                <td className="px-5 py-3 text-[13px] font-medium text-ink">{row.label || '-'}</td>
                <td className="px-5 py-3 font-mono text-[13px] text-ink">{formatCurrency(row.revenue)}</td>
                <td className="px-5 py-3 font-mono text-[13px] text-ink">{formatCurrency(row.salary)}</td>
                <td className="px-5 py-3 font-mono text-[13px] text-ink">{formatCurrency(row.expenses)}</td>
                <NetProfitCell value={row.net_profit} />
              </tr>
            ))}
            <tr className="border-t-2 border-hairline bg-mist/40">
              <td className="px-5 py-3 text-[13px] font-bold text-ink">Total</td>
              <td className="px-5 py-3 font-mono text-[13px] font-bold text-ink">
                {formatCurrency(totals.revenue)}
              </td>
              <td className="px-5 py-3 font-mono text-[13px] font-bold text-ink">
                {formatCurrency(totals.salary)}
              </td>
              <td className="px-5 py-3 font-mono text-[13px] font-bold text-ink">
                {formatCurrency(totals.expenses)}
              </td>
              <NetProfitCell strong value={totals.net_profit} />
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}
