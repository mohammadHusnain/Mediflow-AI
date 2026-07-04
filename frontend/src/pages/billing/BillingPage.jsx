import { useState, useEffect, useCallback } from 'react'
import { AlertCircle, Clock, Receipt, TrendingUp } from 'lucide-react'
import InvoiceTable from '@shared/components/billing/InvoiceTable'
import InvoiceDrawer from '@shared/components/billing/InvoiceDrawer'
import { usePermission } from '@shared/lib/usePermission'
import { formatCurrencyShort } from '@shared/lib/currency'
import {
  getBillingDashboard,
  getInvoices,
} from '@shared/services/billingApi'

function StatCard({ context, icon: Icon, label, tone, value }) {
  const colors = {
    brand: 'bg-brand-light text-brand',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    slate: 'bg-slate-100 text-slate-600',
  }

  return (
    <section className="animate-fade-up rounded-card border border-hairline bg-canvas p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(20,24,31,0.07)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[36px] font-bold leading-none text-ink">{value}</p>
          <p className="mt-3 text-[13px] font-medium text-ink">{label}</p>
          <p className="mt-1 text-[12px] font-normal text-slate">{context}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors[tone]}`}>
          <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
        </div>
      </div>
    </section>
  )
}

export default function BillingPage() {
  const { isAdmin } = usePermission()
  const [dash, setDash] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [drawerId, setDrawerId] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [d, i] = await Promise.all([
        getBillingDashboard(),
        getInvoices({
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          page,
        }),
      ])
      setDash(d.data)
      const results = i.data.results ?? i.data
      setInvoices(Array.isArray(results) ? results : [])
      setTotal(i.data.count ?? 0)
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, page])

  useEffect(() => {
    const timeoutId = window.setTimeout(load, 0)
    return () => window.clearTimeout(timeoutId)
  }, [load])

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-[30px] font-extrabold text-ink">Billing</h1>
        <p className="mt-2 text-[14px] leading-6 text-slate">
          Manage invoices and payment records
        </p>
      </div>

      {dash && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            context="in the system"
            icon={Receipt}
            label="Total Invoices"
            tone="slate"
            value={dash.total_invoices}
          />
          <StatCard
            context="from paid invoices"
            icon={TrendingUp}
            label="Total Revenue"
            tone="green"
            value={formatCurrencyShort(dash.total_revenue)}
          />
          <StatCard
            context={`${dash.unpaid_count} unpaid`}
            icon={AlertCircle}
            label="Outstanding"
            tone="amber"
            value={formatCurrencyShort(dash.total_unpaid)}
          />
          <StatCard
            context="this page"
            icon={Clock}
            label="Partially Paid"
            tone="brand"
            value={formatCurrencyShort(dash.total_partial)}
          />
        </div>
      )}

      <section className="rounded-card bg-canvas p-4 shadow-card">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search invoice #, patient name…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="flex-1 min-w-[200px] h-11 rounded-control border border-hairline bg-canvas px-4 text-[14px] font-normal text-ink outline-none placeholder:text-slate/60 focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="h-11 rounded-control border border-hairline bg-canvas px-4 text-[14px] font-normal text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          >
            <option value="">All Statuses</option>
            {['unpaid', 'paid', 'partial', 'void'].map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </section>

      <InvoiceTable
        invoices={invoices}
        loading={loading}
        page={page}
        total={total}
        onPageChange={setPage}
        onView={(id) => setDrawerId(id)}
        onEdit={(inv) => setDrawerId(inv.id)}
      />

      {drawerId && (
        <InvoiceDrawer
          invoiceId={drawerId}
          isAdmin={isAdmin}
          onClose={() => setDrawerId(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
