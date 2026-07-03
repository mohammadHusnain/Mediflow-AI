const TYPE_STYLES = {
  commission: {
    className: 'bg-[#EDE9FE] text-[#7C3AED]',
    label: 'Commission',
  },
  fixed: {
    className: 'bg-[#E7EEFF] text-[#1D4ED8]',
    label: 'Fixed',
  },
  mixed: {
    className: 'bg-[#E3F7EC] text-[#0F9D66]',
    label: 'Mixed',
  },
}

export default function SalaryBadge({ className = '', type }) {
  const meta = TYPE_STYLES[String(type || '').toLowerCase()] || {
    className: 'bg-[#F3F4F6] text-[#5B6472]',
    label: 'Not Set',
  }

  return (
    <span
      className={[
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
        meta.className,
        className,
      ].join(' ')}
    >
      {meta.label}
    </span>
  )
}
