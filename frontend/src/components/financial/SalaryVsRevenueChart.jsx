import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const PKR_FORMATTER = new Intl.NumberFormat('en-PK')

const SERIES_LABELS = {
  revenue: 'Revenue',
  salary_cost: 'Salary',
}

function numberValue(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function formatCurrency(value) {
  return `PKR ${PKR_FORMATTER.format(numberValue(value))}`
}

function ratioColorClass(ratio) {
  if (ratio <= 40) return 'text-[#0F9D66]'
  if (ratio <= 60) return 'text-[#B45309]'
  return 'text-[#C8102E]'
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
            className="flex min-w-[180px] justify-between gap-6"
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

function getRatio(data) {
  const revenue = data.reduce((sum, row) => sum + numberValue(row.revenue), 0)
  const salary = data.reduce((sum, row) => sum + numberValue(row.salary_cost), 0)

  if (revenue > 0) {
    return Math.round((salary / revenue) * 100)
  }

  const ratios = data.map((row) => numberValue(row.ratio)).filter((value) => value !== 0)
  if (ratios.length === 0) return 0

  return Math.round(ratios.reduce((sum, value) => sum + value, 0) / ratios.length)
}

export default function SalaryVsRevenueChart({ data = [] }) {
  const ratio = getRatio(data)

  return (
    <div>
      <ResponsiveContainer height={300} width="100%">
        <BarChart data={data}>
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
          <Bar barSize={18} dataKey="revenue" fill="#4338CA" radius={[4, 4, 0, 0]} />
          <Bar barSize={18} dataKey="salary_cost" fill="#B45309" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 flex items-center justify-between rounded-[10px] bg-mist px-4 py-3">
        <span className="text-[13px] font-medium text-ink">Salary-to-Revenue Ratio</span>
        <span className={`font-display text-[20px] ${ratioColorClass(ratio)}`}>
          {ratio}%
        </span>
      </div>
    </div>
  )
}
