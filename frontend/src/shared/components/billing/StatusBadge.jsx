const cfg = {
  paid:    { label:'Paid',    bg:'bg-green-50',  text:'text-green-700',  dot:'bg-green-500'  },
  unpaid:  { label:'Unpaid',  bg:'bg-rose-50',   text:'text-rose-700',   dot:'bg-rose-500'   },
  partial: { label:'Partial', bg:'bg-amber-50',  text:'text-amber-700',  dot:'bg-amber-500'  },
  void:    { label:'Void',    bg:'bg-slate-100', text:'text-slate-500',  dot:'bg-slate-400'  },
}

export default function StatusBadge({ status }) {
  const c = cfg[status] || cfg.unpaid
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  )
}
