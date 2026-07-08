import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

import { formatCurrencyAmount } from '@shared/lib/currency'

const COLORS = ['#4338CA', '#7C3AED', '#B45309', '#5B6472']

function numberValue(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function formatCurrency(value) {
  return formatCurrencyAmount(numberValue(value))
}

function CustomPieTooltip({ active, payload }) {
  if (!active || !payload?.length) {
    return null
  }

  const entry = payload[0]?.payload

  return (
    <div className="rounded-[8px] bg-ink px-3 py-2 shadow-lg">
      <p className="text-[12px] font-medium text-white">{entry?.category || '-'}</p>
      <p className="font-mono text-[12px] text-white/80">
        {formatCurrency(entry?.amount)}
      </p>
    </div>
  )
}

export default function ExpenseBreakdownChart({ data = [] }) {
  const total = data.reduce((sum, entry) => sum + numberValue(entry.amount), 0)

  return (
    <div>
      <div className="relative">
        <ResponsiveContainer height={280} width="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              innerRadius={65}
              nameKey="category"
              outerRadius={95}
              paddingAngle={2}
            >
              {data.map((entry, index) => (
                <Cell fill={COLORS[index % COLORS.length]} key={entry.category || index} />
              ))}
            </Pie>
            <Tooltip content={<CustomPieTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="font-display text-[20px] text-ink">{formatCurrency(total)}</p>
            <p className="text-[11px] font-normal text-slate">Total</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-4">
        {data.map((entry, index) => (
          <div className="flex items-center gap-2" key={entry.category || index}>
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-[13px] font-medium text-ink">{entry.category || '-'}</span>
            <span className="text-[12px] font-normal text-slate">
              ({numberValue(entry.percentage)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
