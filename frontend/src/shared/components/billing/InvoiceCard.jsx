const palette = {
  brand: 'from-brand to-brand-dark text-white',
  green: 'from-green-500 to-green-700 text-white',
  amber: 'from-amber-400 to-amber-600 text-white',
  slate: 'from-slate-100 to-slate-200 text-slate-800',
}

export default function InvoiceCard({ label, value, sub, color = 'brand', icon: Icon }) {
  return (
    <div className={`rounded-card bg-gradient-to-br p-5 shadow-card ${palette[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium opacity-80 uppercase tracking-wide">{label}</p>
          <p className="mt-1 font-sans text-[28px] font-bold">{value}</p>
          {sub && <p className="mt-0.5 text-[11px] opacity-70">{sub}</p>}
        </div>
        {Icon && <Icon size={24} className="opacity-30" />}
      </div>
    </div>
  )
}
