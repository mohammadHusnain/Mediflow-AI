import { useState, useEffect } from 'react'
import { Download, Pencil } from 'lucide-react'
import Drawer from '@shared/components/Drawer'
import {
  FormField,
  FormSection,
  getFieldClass,
  LoadingSpinner,
} from '@shared/components/FormPrimitives'
import { formatCurrency } from '@shared/lib/currency'
import { getInvoice, updateInvoice, downloadInvoicePDF } from '@shared/services/billingApi'
import StatusBadge from './StatusBadge'

export default function InvoiceDrawer({ invoiceId, isAdmin, onClose, onSaved }) {
  const [inv, setInv] = useState(null)
  const [editing, setEdit] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getInvoice(invoiceId)
      .then((r) => {
        setInv(r.data)
        setForm(r.data)
      })
      .finally(() => setLoading(false))
  }, [invoiceId])

  const handleDownload = async () => {
    try {
      const res = await downloadInvoicePDF(invoiceId)
      const url = URL.createObjectURL(
        new Blob([res.data], { type: 'application/pdf' }),
      )
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

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateInvoice(invoiceId, {
        invoice_date: form.invoice_date,
        consultation_fee: form.consultation_fee,
        discount: form.discount,
        tax_percent: form.tax_percent,
        additional_charges: form.additional_charges,
        additional_charges_note: form.additional_charges_note,
        amount_paid: form.amount_paid,
        status: form.status,
        payment_method: form.payment_method,
        payment_date: form.payment_date,
        notes: form.notes,
      })
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const field = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  return (
    <Drawer
      open={!!invoiceId}
      onClose={onClose}
      title={`#${inv?.invoice_number || '...'}`}
      subtitle={inv ? `${inv.patient?.full_name || ''}` : ''}
      widthClass="max-w-[540px]"
      footer={
        isAdmin ? (
          <div className="flex gap-3">
            {editing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="primary-button inline-flex flex-1 h-10 items-center justify-center rounded-control bg-brand text-[13px] font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
                  type="button"
                >
                  {saving ? <LoadingSpinner light /> : 'Save Changes'}
                </button>
                <button
                  onClick={() => setEdit(false)}
                  className="inline-flex h-10 items-center rounded-control border border-hairline px-4 text-[13px] font-medium text-slate transition hover:bg-mist"
                  type="button"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleDownload}
                  className="inline-flex h-10 items-center gap-2 rounded-control border border-hairline px-4 text-[13px] font-medium text-slate transition hover:bg-mist"
                  type="button"
                >
                  <Download aria-hidden="true" className="h-4 w-4" />
                  Download PDF
                </button>
                <button
                  onClick={() => setEdit(true)}
                  className="inline-flex h-10 items-center gap-2 rounded-control bg-brand-light px-4 text-[13px] font-semibold text-brand transition hover:bg-brand/10"
                  type="button"
                >
                  <Pencil aria-hidden="true" className="h-4 w-4" />
                  Edit Invoice
                </button>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={handleDownload}
            className="inline-flex h-10 items-center gap-2 rounded-control border border-hairline px-4 text-[13px] font-medium text-slate transition hover:bg-mist"
            type="button"
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            Download PDF
          </button>
        )
      }
    >
      {loading || !inv ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand/20 border-t-brand" />
        </div>
      ) : editing ? (
        <div className="space-y-5">
          <FormSection title="Invoice Details">
            <FormField label="Invoice Date">
              <input
                type="date"
                value={form.invoice_date || ''}
                onChange={field('invoice_date')}
                className={getFieldClass('')}
              />
            </FormField>

            <FormField label="Consultation Fee">
              <input
                type="number"
                min="0"
                value={form.consultation_fee || ''}
                onChange={field('consultation_fee')}
                className={getFieldClass('')}
              />
            </FormField>

            <FormField label="Discount" optional>
              <input
                type="number"
                min="0"
                value={form.discount || ''}
                onChange={field('discount')}
                className={getFieldClass('')}
              />
            </FormField>

            <FormField label="Tax %" optional>
              <input
                type="number"
                min="0"
                value={form.tax_percent || ''}
                onChange={field('tax_percent')}
                className={getFieldClass('')}
              />
            </FormField>

            <FormField label="Additional Charges" optional>
              <input
                type="number"
                min="0"
                value={form.additional_charges || ''}
                onChange={field('additional_charges')}
                className={getFieldClass('')}
              />
            </FormField>

            <FormField label="Additional Charges Note" optional>
              <input
                type="text"
                value={form.additional_charges_note || ''}
                onChange={field('additional_charges_note')}
                className={getFieldClass('')}
              />
            </FormField>
          </FormSection>

          <FormSection title="Payment">
            <FormField label="Amount Paid">
              <input
                type="number"
                min="0"
                value={form.amount_paid || ''}
                onChange={field('amount_paid')}
                className={getFieldClass('')}
              />
            </FormField>

            <FormField label="Status">
              <select
                value={form.status || 'unpaid'}
                onChange={field('status')}
                className={getFieldClass('')}
              >
                {['unpaid', 'paid', 'partial', 'void'].map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Payment Method" optional>
              <select
                value={form.payment_method || ''}
                onChange={field('payment_method')}
                className={getFieldClass('')}
              >
                <option value="">— None —</option>
                {[
                  ['cash', 'Cash'],
                  ['card', 'Card'],
                  ['online', 'Online Transfer'],
                  ['insurance', 'Insurance'],
                ].map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Payment Date" optional>
              <input
                type="date"
                value={form.payment_date || ''}
                onChange={field('payment_date')}
                className={getFieldClass('')}
              />
            </FormField>
          </FormSection>

          <FormSection title="Notes" optional>
            <div className="md:col-span-2">
              <FormField label="Notes" optional>
                <textarea
                  value={form.notes || ''}
                  onChange={field('notes')}
                  rows={3}
                  className={getFieldClass('', 'min-h-[72px] resize-y')}
                />
              </FormField>
            </div>
          </FormSection>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <StatusBadge status={inv.status} />
          </div>

          <FormSection title="Patient">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Name" required={false}>
                <p className="text-[14px] font-medium text-ink">{inv.patient?.full_name || '—'}</p>
              </FormField>
              <FormField label="Phone" required={false}>
                <p className="text-[14px] text-slate">{inv.patient?.phone || '—'}</p>
              </FormField>
            </div>
            <FormField label="Address" required={false}>
              <p className="text-[14px] text-slate">{inv.patient?.address || '—'}</p>
            </FormField>
          </FormSection>

          <FormSection title="Appointment">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Date" required={false}>
                <p className="text-[14px] text-slate">{inv.appointment_info?.appointment_date || '—'}</p>
              </FormField>
              <FormField label="Time" required={false}>
                <p className="text-[14px] text-slate">{inv.appointment_info?.appointment_time || '—'}</p>
              </FormField>
              <FormField label="Doctor" required={false}>
                <p className="text-[14px] font-medium text-ink">{inv.appointment_info?.doctor_name || '—'}</p>
              </FormField>
              <FormField label="Reason" required={false}>
                <p className="text-[14px] text-slate">{inv.appointment_info?.reason || '—'}</p>
              </FormField>
            </div>
          </FormSection>

          <FormSection title="Fee Breakdown">
            <div className="overflow-hidden rounded-card border border-hairline">
              {[
                ['Consultation Fee', formatCurrency(inv.consultation_fee)],
                inv.additional_charges > 0 && [
                  inv.additional_charges_note || 'Additional Charges',
                  formatCurrency(inv.additional_charges),
                ],
                inv.discount > 0 && ['Discount', `- ${formatCurrency(inv.discount)}`],
              ]
                .filter(Boolean)
                .map(([k, v], idx) => (
                  <div
                    key={idx}
                    className="flex justify-between px-5 py-3 odd:bg-mist"
                  >
                    <span className="text-[13px] text-slate">{k}</span>
                    <span className="font-sans text-[13px] text-ink">{v}</span>
                  </div>
                ))}
              <div className="flex justify-between bg-brand px-5 py-3 font-bold text-white">
                <span className="text-[13px]">Total</span>
                <span className="font-sans text-[13px]">{formatCurrency(inv.total_amount)}</span>
              </div>
              <div className="flex justify-between bg-green-50 px-5 py-3">
                <span className="text-[13px] text-green-700">Amount Paid</span>
                <span className="font-sans text-[13px] font-semibold text-green-700">
                  {formatCurrency(inv.amount_paid)}
                </span>
              </div>
              <div
                className={`flex justify-between px-5 py-3 font-bold ${
                  inv.balance_due > 0 ? 'bg-rose-50 text-rose-600' : 'bg-green-50 text-green-700'
                }`}
              >
                <span className="text-[13px]">Balance Due</span>
                <span className="font-sans text-[13px]">{formatCurrency(inv.balance_due)}</span>
              </div>
            </div>
          </FormSection>

          {(inv.payment_method || inv.payment_date) && (
            <FormSection title="Payment">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Method" required={false}>
                  <p className="text-[14px] capitalize text-slate">{inv.payment_method || '—'}</p>
                </FormField>
                <FormField label="Date" required={false}>
                  <p className="text-[14px] text-slate">{inv.payment_date || '—'}</p>
                </FormField>
              </div>
            </FormSection>
          )}

          {inv.notes && (
            <FormSection title="Notes">
              <p className="text-[14px] leading-relaxed text-slate">{inv.notes}</p>
            </FormSection>
          )}
        </div>
      )}
    </Drawer>
  )
}
