import { useState, useEffect } from 'react'
import {
  FormField,
  getFieldClass,
  translucentBackdropClass,
} from '@shared/components/FormPrimitives'
import { formatCurrencyShort } from '@shared/lib/currency'
import {
  getSalaryConfigs,
  createSalaryConfig,
  updateSalaryConfig,
} from '@shared/services/billingApi'

const EMPTY = {
  salary_type: 'fixed',
  base_salary: 0,
  commission_rate: 0,
  commission_per_appointment: 0,
  allowances: 0,
  deductions: 0,
  effective_from: '',
  notes: '',
  commission_mode: 'rate',
}

export default function SalaryConfigTab() {
  const [configs, setConfigs] = useState([])
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const r = await getSalaryConfigs()
      setConfigs(r.data.results ?? r.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openNew = () => setEditing({ ...EMPTY, employee_id: '' })
  const openEdit = (c) =>
    setEditing({
      id: c.id,
      employee_id: c.employee?.id,
      salary_type: c.salary_type,
      base_salary: c.base_salary,
      commission_rate: c.commission_rate,
      commission_per_appointment: c.commission_per_appointment,
      allowances: c.allowances,
      deductions: c.deductions,
      effective_from: c.effective_from,
      notes: c.notes,
      commission_mode: c.commission_rate > 0 ? 'rate' : 'flat',
    })

  const handleSave = async () => {
    const payload = {
      employee_id: editing.employee_id,
      salary_type: editing.salary_type,
      base_salary: editing.base_salary,
      allowances: editing.allowances,
      deductions: editing.deductions,
      effective_from: editing.effective_from,
      notes: editing.notes,
      commission_rate: editing.commission_mode === 'rate' ? editing.commission_rate : 0,
      commission_per_appointment: editing.commission_mode === 'flat' ? editing.commission_per_appointment : 0,
    }
    editing.id
      ? await updateSalaryConfig(editing.id, payload)
      : await createSalaryConfig(payload)
    setEditing(null)
    load()
  }

  const f = (key) => (e) => setEditing((prev) => ({ ...prev, [key]: e.target.value }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-semibold text-ink">Salary Configurations</h2>
        <button
          onClick={openNew}
          className="primary-button inline-flex h-10 items-center rounded-control bg-brand px-4 text-[13px] font-semibold text-white transition hover:bg-brand-dark"
          type="button"
        >
          + Add Config
        </button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand/20 border-t-brand" />
        </div>
      ) : configs.length === 0 ? (
        <section className="rounded-card bg-canvas p-10 text-center shadow-card">
          <p className="text-[14px] font-semibold text-slate">No salary configurations yet</p>
          <p className="mt-1 text-[13px] text-slate">Click "+ Add Config" to set up an employee salary.</p>
        </section>
      ) : (
        <section className="overflow-hidden rounded-card bg-canvas shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead className="border-b border-hairline bg-mist">
                <tr>
                  {['Employee', 'Role', 'Type', 'Base Salary', 'Commission', 'Actions'].map((h) => (
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
                {configs.map((c, i) => (
                  <tr
                    key={c.id}
                    className="animate-fade-up border-b border-hairline transition-colors duration-100 last:border-0 hover:bg-brand-light/40"
                    style={{ animationDelay: `${i * 0.03}s` }}
                  >
                    <td className="px-5 py-4 text-[14px] font-medium text-ink">
                      {c.employee?.full_name}
                    </td>
                    <td className="px-5 py-4 text-[13px] capitalize text-slate">
                      {c.employee?.role}
                    </td>
                    <td className="px-5 py-4 text-[13px] capitalize text-slate">
                      {c.salary_type}
                    </td>
                    <td className="px-5 py-4 font-sans text-[14px] font-medium text-ink">
                      {formatCurrencyShort(c.base_salary)}
                    </td>
                    <td className="px-5 py-4 text-[13px] text-slate">
                      {c.salary_type === 'commission'
                        ? c.commission_rate > 0
                          ? `${c.commission_rate}%`
                          : `${formatCurrencyShort(c.commission_per_appointment)}/appt`
                        : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => openEdit(c)}
                        className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[12px] font-medium text-amber-700 transition-colors hover:bg-amber-100"
                        type="button"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {editing && (
        <div
          className={`fixed inset-0 z-[80] flex items-center justify-center px-4 ${translucentBackdropClass}`}
          onClick={() => setEditing(null)}
        >
          <div
            className="w-full max-w-md animate-scale-in rounded-card border border-hairline bg-canvas p-6 shadow-[0_16px_60px_rgba(20,24,31,0.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-5 text-[20px] font-bold text-ink">
              {editing.id ? 'Edit' : 'New'} Salary Config
            </h2>

            <div className="space-y-5">
              <FormField label="Salary Type">
                <select
                  value={editing.salary_type}
                  onChange={f('salary_type')}
                  className={getFieldClass('')}
                >
                  <option value="fixed">Fixed</option>
                  <option value="commission">Commission-Based (doctors only)</option>
                </select>
              </FormField>

              <FormField label="Base Salary">
                <input
                  type="number"
                  min="0"
                  value={editing.base_salary}
                  onChange={f('base_salary')}
                  className={getFieldClass('')}
                />
              </FormField>

              {editing.salary_type === 'commission' && (
                <div className="space-y-3 rounded-control bg-brand-light p-4">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                      <input
                        type="radio"
                        checked={editing.commission_mode === 'rate'}
                        onChange={() => setEditing((p) => ({ ...p, commission_mode: 'rate' }))}
                      />
                      Rate (% of fee)
                    </label>
                    <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                      <input
                        type="radio"
                        checked={editing.commission_mode === 'flat'}
                        onChange={() => setEditing((p) => ({ ...p, commission_mode: 'flat' }))}
                      />
                      Flat per appointment
                    </label>
                  </div>
                  {editing.commission_mode === 'rate' ? (
                    <FormField label="Commission Rate (%)">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editing.commission_rate}
                        onChange={f('commission_rate')}
                        className={getFieldClass('')}
                      />
                    </FormField>
                  ) : (
                    <FormField label="Flat Amount per Appointment">
                      <input
                        type="number"
                        min="0"
                        value={editing.commission_per_appointment}
                        onChange={f('commission_per_appointment')}
                        className={getFieldClass('')}
                      />
                    </FormField>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Allowances" optional>
                  <input
                    type="number"
                    min="0"
                    value={editing.allowances}
                    onChange={f('allowances')}
                    className={getFieldClass('')}
                  />
                </FormField>
                <FormField label="Deductions" optional>
                  <input
                    type="number"
                    min="0"
                    value={editing.deductions}
                    onChange={f('deductions')}
                    className={getFieldClass('')}
                  />
                </FormField>
              </div>

              <FormField label="Effective From">
                <input
                  type="date"
                  value={editing.effective_from}
                  onChange={f('effective_from')}
                  className={getFieldClass('')}
                />
              </FormField>

              <FormField label="Notes" optional>
                <textarea
                  value={editing.notes}
                  onChange={f('notes')}
                  rows={2}
                  className={getFieldClass('', 'min-h-[72px] resize-y')}
                />
              </FormField>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEditing(null)}
                className="rounded-control border border-hairline px-4 py-2.5 text-[13px] font-medium text-slate transition hover:bg-mist"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="primary-button inline-flex items-center rounded-control bg-brand px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-brand-dark"
                type="button"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
