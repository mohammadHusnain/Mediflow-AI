const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']

export default function MonthYearPicker({ value, onChange }) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  const selectClass = 'px-3 py-2.5 border border-hairline rounded-control text-[13px] bg-canvas text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20'

  return (
    <div className="flex items-center gap-3">
      <select
        value={value.month}
        onChange={(e) => onChange({ ...value, month: +e.target.value })}
        className={selectClass}
      >
        {MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>{m}</option>
        ))}
      </select>
      <select
        value={value.year}
        onChange={(e) => onChange({ ...value, year: +e.target.value })}
        className={selectClass}
      >
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  )
}
