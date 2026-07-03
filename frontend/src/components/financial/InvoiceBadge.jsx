const STATUS_STYLES = {
  cancelled: 'bg-[#F3F4F6] text-[#5B6472]',
  disbursed: 'bg-[#E3F7EC] text-[#0F9D66]',
  on_hold: 'bg-[#FCE4E8] text-[#C8102E]',
  overdue: 'bg-[#FCE4E8] text-[#C8102E]',
  paid: 'bg-[#E3F7EC] text-[#0F9D66]',
  partial: 'bg-[#E7EEFF] text-[#1D4ED8]',
  pending: 'bg-[#FEF3C7] text-[#B45309]',
  refunded: 'bg-[#EDE9FE] text-[#7C3AED]',
}

function formatStatusLabel(status) {
  const value = String(status || 'unknown').trim()

  if (!value) {
    return 'Unknown'
  }

  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default function InvoiceBadge({ className = '', status }) {
  const normalizedStatus = String(status || 'unknown').trim().toLowerCase()
  const style = STATUS_STYLES[normalizedStatus] || 'bg-[#F3F4F6] text-[#5B6472]'

  return (
    <span
      className={[
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
        style,
        className,
      ].join(' ')}
    >
      {formatStatusLabel(status)}
    </span>
  )
}
