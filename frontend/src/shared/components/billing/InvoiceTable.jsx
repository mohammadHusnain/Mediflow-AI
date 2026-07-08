import { Download, FileText, Pencil } from 'lucide-react'
import SkeletonRow from '@shared/components/SkeletonRow'
import Pagination from '@shared/components/Pagination'
import { PAGE_SIZE } from '@shared/lib/pagination'
import { formatCurrency } from '@shared/lib/currency'
import { downloadInvoicePDF } from '@shared/services/billingApi'
import StatusBadge from './StatusBadge'

export default function InvoiceTable({ invoices, loading, onView, onEdit, page, total, onPageChange }) {
  const handlePDF = async (inv) => {
    try {
      const res = await downloadInvoicePDF(inv.id)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = Object.assign(document.createElement('a'), {
        href: url,
        download: `invoice_${inv.invoice_number}.pdf`,
      })
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // silently fail
    }
  }

  return (
    <section className="overflow-hidden rounded-card bg-canvas shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead className="border-b border-hairline bg-mist">
            <tr>
              {['Invoice #', 'Patient', 'Doctor', 'Date', 'Total', 'Paid', 'Status', 'Actions'].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate"
                  scope="col"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <SkeletonRow columns={8} index={i} key={i} />
              ))
            ) : invoices.length === 0 ? (
              <tr>
                <td className="px-5 py-12 text-center" colSpan={8}>
                  <FileText aria-hidden="true" className="mx-auto mb-3 h-9 w-9 text-slate/30" />
                  <p className="text-[14px] font-semibold text-ink">No invoices found</p>
                  <p className="mt-1 text-[13px] font-normal text-slate">
                    Try adjusting your search or filters
                  </p>
                </td>
              </tr>
            ) : (
              invoices.map((inv, index) => (
                <tr
                  key={inv.id}
                  className="animate-fade-up border-b border-hairline transition-colors duration-100 last:border-0 hover:bg-brand-light/40"
                  style={{ animationDelay: `${index * 0.03}s` }}
                >
                  <td className="px-4 py-2.5 font-sans text-[12px] font-semibold text-brand">
                    {inv.invoice_number}
                  </td>
                  <td className="px-4 py-2.5 text-[14px] font-medium text-ink">
                    {inv.patient_name}
                  </td>
                  <td className="px-4 py-2.5 text-[13px] text-slate">
                    {inv.doctor_name || '—'}
                  </td>
                  <td className="px-4 py-2.5 font-sans text-[12px] text-slate">
                    {new Date(inv.invoice_date).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-2.5 font-sans text-[14px] font-medium text-ink">
                    {formatCurrency(inv.total_amount)}
                  </td>
                  <td className="px-4 py-2.5 font-sans text-[14px] font-medium text-green-700">
                    {formatCurrency(inv.amount_paid)}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onView(inv.id)}
                        className="rounded-lg border border-blue-200 bg-blue-50 p-1.5 text-blue-700 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                        title="View invoice"
                        type="button"
                      >
                        <span className="sr-only">View invoice</span>
                        <FileText aria-hidden="true" className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onEdit(inv)}
                        className="rounded-lg border border-amber-200 bg-amber-50 p-1.5 text-amber-700 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                        title="Edit invoice"
                        type="button"
                      >
                        <span className="sr-only">Edit invoice</span>
                        <Pencil aria-hidden="true" className="h-4 w-4" />
                      </button>
                  <button
                    onClick={() => handlePDF(inv)}
                    className="rounded-lg border border-green-200 bg-green-50 p-1.5 text-green-700 transition-colors hover:bg-green-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-300"
                    title="Download PDF"
                    type="button"
                  >
                    <span className="sr-only">Download PDF</span>
                    <Download aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination currentPage={page} onPageChange={onPageChange} totalCount={total} />
    </section>
  )
}
