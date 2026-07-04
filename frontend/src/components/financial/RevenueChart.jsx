import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const PKR_FORMATTER = new Intl.NumberFormat('en-PK')

const SERIES_LABELS = {
  expenses: 'Expenses',
  revenue: 'Revenue',
  salary: 'Salary',
}

function numberValue(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function formatCurrency(value) {
  return `PKR ${PKR_FORMATTER.format(numberValue(value))}`
}

function CustomTooltip({ active, label, payload }) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className="rounded-[10px] bg-ink px-4 py-3 shadow-lg">
      <p className="mb-2 text-[12px] font-medium text-white/60">{label}</p>
      <div className="space-y-1">
        {payload.map((item) => (
          <div
            className="flex min-w-[190px] justify-between gap-6"
            key={item.dataKey}
          >
            <span className="text-[13px] font-normal text-white">
              {SERIES_LABELS[item.dataKey] || item.name || item.dataKey}
            </span>
            <span className="font-mono text-[13px] font-medium text-white">
              {formatCurrency(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function RevenueChart({ data = [] }) {
  return (
    <ResponsiveContainer height={340} width="100%">
      <LineChart data={data}>
        <CartesianGrid stroke="#E4E8EB" strokeDasharray="3 3" vertical={false} />
        <XAxis
          axisLine={{ stroke: '#E4E8EB' }}
          dataKey="label"
          tick={{ fontFamily: 'Outfit', fontSize: 12, fill: '#5B6472' }}
          tickLine={false}
        />
        <YAxis
          axisLine={false}
          tick={{ fontFamily: 'Outfit', fontSize: 12, fill: '#5B6472' }}
          tickFormatter={(value) => `${(numberValue(value) / 1000).toFixed(0)}k`}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          dataKey="revenue"
          dot={false}
          stroke="#4338CA"
          strokeWidth={2.5}
          type="monotone"
        />
        <Line
          dataKey="salary"
          dot={false}
          stroke="#B45309"
          strokeDasharray="4 3"
          strokeWidth={2}
          type="monotone"
        />
        <Line
          dataKey="expenses"
          dot={false}
          stroke="#C8102E"
          strokeDasharray="4 3"
          strokeWidth={2}
          type="monotone"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
