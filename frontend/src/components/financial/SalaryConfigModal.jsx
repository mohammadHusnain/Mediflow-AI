import { useEffect, useMemo, useState } from 'react'
import { DollarSign, Loader2, Percent, X } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'

import { translucentBackdropClass } from '@shared/components/FormPrimitives'
import { createSalaryConfig, updateSalaryConfig } from '@shared/services/billingApi'

function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

function threeMonthsAgo() {
  const date = new Date()
  date.setMonth(date.getMonth() - 3)
  return date.toISOString().slice(0, 7)
}

function getDefaultValues(staffMember) {
  const config = staffMember?.current_config || {}
  const role = String(staffMember?.role || '').toLowerCase()
  const type = role !== 'doctor' && config.salary_type === 'commission'
    ? 'fixed'
    : config.salary_type || 'fixed'
  const commissionMode = config.commission_rate > 0
    ? 'rate'
    : config.commission_per_appointment > 0
      ? 'flat'
      : 'rate'

  return {
    base_salary: config.base_salary ?? config.fixed_amount ?? '',
    commission_rate: config.commission_rate ?? '',
    commission_per_appointment: config.commission_per_appointment ?? '',
    commission_mode: commissionMode,
    effective_from: config.effective_from || currentMonth(),
    allowances: config.allowances ?? '',
    deductions: config.deductions ?? '',
    salary_type: type,
    notes: config.notes ?? '',
  }
}

function getApiError(error) {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.detail ||
    error?.message ||
    'Salary configuration could not be saved.'
  )
}

function FieldError({ message }) {
  if (!message) return null

  return <p className="mt-1 text-[12px] font-medium text-[#C8102E]">{message}</p>
}

function SalaryTypeCard({
  checked,
  description,
  disabled = false,
  icon: Icon,
  label,
  onSelect,
}) {
  return (
    <button
      className={[
        'min-h-[112px] rounded-[12px] border-2 p-4 text-left transition',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        checked ? 'border-brand bg-brand/5' : 'border-hairline bg-mist hover:bg-canvas',
      ].join(' ')}
      disabled={disabled}
      onClick={onSelect}
      type="button"
    >
      <Icon aria-hidden="true" className="mb-3 h-5 w-5 text-brand" />
      <p className="text-[14px] font-semibold text-ink">{label}</p>
      <p className="mt-1 text-[12px] font-normal text-slate">{description}</p>
    </button>
  )
}

export function SalaryConfigForm({
  cancelLabel = 'Cancel',
  onCancel,
  onSaved,
  staffMember,
  submitLabel = 'Save Salary Configuration',
}) {
  const [apiError, setApiError] = useState('')
  const [saving, setSaving] = useState(false)
  const {
    clearErrors,
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setValue,
    control,
    setError,
  } = useForm({ defaultValues: getDefaultValues(staffMember) })
  const salaryType = useWatch({ control, name: 'salary_type' })
  const effectiveFrom = useWatch({ control, name: 'effective_from' })
  const watchAll = useWatch({ control })
  const isDoctor = String(staffMember?.role || '').toLowerCase() === 'doctor'
  const retroactiveWarning = effectiveFrom && effectiveFrom < threeMonthsAgo()

  useEffect(() => {
    reset(getDefaultValues(staffMember))
    const timeoutId = window.setTimeout(() => setApiError(''), 0)
    return () => window.clearTimeout(timeoutId)
  }, [reset, staffMember])

  useEffect(() => {
    if (salaryType === 'fixed') {
      clearErrors(['commission_rate', 'commission_per_appointment'])
      return
    }

    clearErrors('base_salary')
  }, [clearErrors, salaryType])

  const staffLabel = staffMember?.name || 'this staff member'

  async function onSubmit(formValues) {
    if (!staffMember?.id) {
      setApiError('Please select a staff member first.')
      return
    }

    if (formValues.salary_type === 'commission' && formValues.commission_mode === 'rate') {
      const rate = Number(formValues.commission_rate)
      if (!formValues.commission_rate && formValues.commission_rate !== 0) {
        setError('commission_rate', { message: 'Commission rate is required' })
        return
      }
      if (rate < 0.1 || rate > 100) {
        setError('commission_rate', { message: 'Commission rate must be between 0.1% and 100%' })
        return
      }
    }

    if (formValues.salary_type === 'commission' && formValues.commission_mode === 'flat') {
      const amount = Number(formValues.commission_per_appointment)
      if (!formValues.commission_per_appointment && formValues.commission_per_appointment !== 0) {
        setError('commission_per_appointment', { message: 'Flat amount is required' })
        return
      }
      if (amount < 100) {
        setError('commission_per_appointment', { message: 'Minimum is PKR 100' })
        return
      }
    }

    setSaving(true)
    setApiError('')

    try {
      const payload = {
        employee_id: staffMember?.id,
        salary_type: formValues.salary_type,
        base_salary: Number(formValues.base_salary),
        allowances: Number(formValues.allowances || 0),
        deductions: Number(formValues.deductions || 0),
        effective_from: formValues.effective_from ? `${formValues.effective_from}-01` : '',
        notes: formValues.notes || '',
        commission_rate: formValues.salary_type === 'commission' && formValues.commission_mode === 'rate'
          ? Number(formValues.commission_rate)
          : 0,
        commission_per_appointment: formValues.salary_type === 'commission' && formValues.commission_mode === 'flat'
          ? Number(formValues.commission_per_appointment)
          : 0,
      }

      if (staffMember?.current_config?.id) {
        await updateSalaryConfig(staffMember.current_config.id, payload)
      } else {
        await createSalaryConfig(payload)
      }
      await onSaved?.()
    } catch (error) {
      setApiError(getApiError(error))
    } finally {
      setSaving(false)
    }
  }

  const baseSalaryRegistration = register('base_salary', {
    required: 'Base salary is required',
    min: { value: 1000, message: 'Minimum salary is PKR 1,000' },
  })
  const commissionRateRegistration = register('commission_rate')
  const commissionFlatRegistration = register('commission_per_appointment')

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <p className="text-[13px] font-medium text-ink">Salary Type <span className="text-[#C8102E]">*</span></p>
        <input className="sr-only" {...register('salary_type', { required: 'Please select a salary type' })} />
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SalaryTypeCard
            checked={salaryType === 'fixed'}
            description="Monthly fixed amount"
            icon={DollarSign}
            label="Fixed Salary"
            onSelect={() => setValue('salary_type', 'fixed', { shouldValidate: true })}
          />
          <SalaryTypeCard
            checked={salaryType === 'commission'}
            description="% of each consultation"
            disabled={!isDoctor}
            icon={Percent}
            label="Commission"
            onSelect={() => setValue('salary_type', 'commission', { shouldValidate: true })}
          />
        </div>
        {!isDoctor ? (
          <p className="mt-2 text-[12px] font-normal italic text-slate">
            Commission salary is available for doctors only.
          </p>
        ) : null}
        <FieldError message={errors.salary_type?.message} />
      </div>

      {salaryType === 'fixed' ? (
        <div>
            <label className="text-[13px] font-medium text-ink" htmlFor="base_salary">
            Monthly Fixed Amount (PKR) <span className="text-[#C8102E]">*</span>
          </label>
          <div className="relative mt-2">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[13px] font-medium text-slate">
              PKR
            </span>
            <input
              className="h-11 w-full rounded-control border border-hairline bg-canvas py-2 pl-14 pr-3 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
              id="base_salary"
              min="0"
              step="100"
              type="number"
              {...baseSalaryRegistration}
            />
          </div>
          <FieldError message={errors.base_salary?.message} />
        </div>
      ) : null}

      {salaryType === 'commission' ? (
        <>
          <div className="space-y-3 rounded-control bg-brand-light p-4">
            <p className="text-[12px] font-semibold text-brand">Commission Mode</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-[13px] cursor-pointer font-medium">
                <input
                  type="radio"
                  checked={watchAll.commission_mode === 'rate'}
                  onChange={() => setValue('commission_mode', 'rate', { shouldValidate: true })}
                />
                Rate (% of fee)
              </label>
              <label className="flex items-center gap-2 text-[13px] cursor-pointer font-medium">
                <input
                  type="radio"
                  checked={watchAll.commission_mode === 'flat'}
                  onChange={() => setValue('commission_mode', 'flat', { shouldValidate: true })}
                />
                Flat per appointment
              </label>
            </div>
          </div>

          {watchAll.commission_mode === 'rate' ? (
            <div>
              <label className="text-[13px] font-medium text-ink" htmlFor="commission_rate">
                Commission Rate (%) <span className="text-[#C8102E]">*</span>
              </label>
              <div className="relative mt-2">
                <input
                  className="h-11 w-full rounded-control border border-hairline bg-canvas py-2 pl-3 pr-10 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
                  id="commission_rate"
                  max="100"
                  min="0"
                  step="0.5"
                  type="number"
                  {...commissionRateRegistration}
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-medium text-slate">
                  %
                </span>
              </div>
              <p className="mt-1 text-[12px] font-normal italic text-slate">
                Applied to each appointment consultation fee
              </p>
              <FieldError message={errors.commission_rate?.message} />
            </div>
          ) : (
            <div>
              <label className="text-[13px] font-medium text-ink" htmlFor="commission_per_appointment">
                Flat Amount per Appointment (PKR) <span className="text-[#C8102E]">*</span>
              </label>
              <div className="relative mt-2">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[13px] font-medium text-slate">
                  PKR
                </span>
                <input
                  className="h-11 w-full rounded-control border border-hairline bg-canvas py-2 pl-14 pr-3 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
                  id="commission_per_appointment"
                  min="0"
                  step="100"
                  type="number"
                  {...commissionFlatRegistration}
                />
              </div>
              <p className="mt-1 text-[12px] font-normal italic text-slate">
                Paid per completed appointment
              </p>
              <FieldError message={errors.commission_per_appointment?.message} />
            </div>
          )}
        </>
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[13px] font-medium text-ink" htmlFor="allowances">
            Allowances (PKR)
          </label>
          <div className="relative mt-2">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[13px] font-medium text-slate">PKR</span>
            <input
              className="h-11 w-full rounded-control border border-hairline bg-canvas py-2 pl-14 pr-3 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
              id="allowances"
              min="0"
              step="100"
              type="number"
              {...register('allowances')}
            />
          </div>
        </div>
        <div>
          <label className="text-[13px] font-medium text-ink" htmlFor="deductions">
            Deductions (PKR)
          </label>
          <div className="relative mt-2">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[13px] font-medium text-slate">PKR</span>
            <input
              className="h-11 w-full rounded-control border border-hairline bg-canvas py-2 pl-14 pr-3 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
              id="deductions"
              min="0"
              step="100"
              type="number"
              {...register('deductions')}
            />
          </div>
        </div>
      </div>

      <div>
        <label className="text-[13px] font-medium text-ink" htmlFor="effective_from">
          Effective Salary Month <span className="text-[#C8102E]">*</span>
        </label>
        <input
          className="mt-2 h-11 w-full rounded-control border border-hairline bg-canvas px-3 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
          id="effective_from"
          type="month"
          {...register('effective_from', { required: 'Effective salary month is required' })}
        />
        <FieldError message={errors.effective_from?.message} />
        {retroactiveWarning ? (
          <p className="mt-2 rounded-[8px] bg-[#FEF3C7] px-3 py-2 text-[12px] font-normal text-[#B45309]">
            This change will apply retroactively to past records
          </p>
        ) : null}
      </div>

      {apiError ? (
        <div className="rounded-[10px] bg-[#FCE4E8] px-4 py-3 text-[13px] font-medium text-[#C8102E]">
          {apiError}
        </div>
      ) : null}

      <div>
        <label className="text-[13px] font-medium text-ink" htmlFor="salary_notes">
          Notes
        </label>
        <textarea
          className="mt-2 h-[72px] w-full resize-y rounded-control border border-hairline bg-canvas px-3 py-2 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
          id="salary_notes"
          placeholder="Optional notes..."
          {...register('notes')}
        />
      </div>

      <button
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-control bg-brand px-6 py-3 text-[14px] font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
        disabled={saving || !staffMember?.id}
        type="submit"
      >
        {saving ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
        {saving ? 'Saving...' : submitLabel}
      </button>

      {onCancel ? (
        <button
          className="mx-auto block text-[14px] font-medium text-slate transition hover:text-ink"
          onClick={onCancel}
          type="button"
        >
          {cancelLabel}
        </button>
      ) : null}

      {!staffMember?.id ? (
        <p className="text-center text-[12px] text-slate">Select {staffLabel} before saving.</p>
      ) : null}
    </form>
  )
}

export default function SalaryConfigModal({
  isOpen,
  onClose,
  onSaved,
  staffMember,
}) {
  const staffName = useMemo(
    () => staffMember?.name || 'this staff member',
    [staffMember],
  )

  if (!isOpen) {
    return null
  }

  async function handleSaved() {
    await onSaved?.()
    onClose?.()
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center px-4 py-6 ${translucentBackdropClass}`}
      onClick={onClose}
    >
      <section
        className="relative max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-[20px] border border-hairline bg-canvas p-8 shadow-[0_32px_80px_rgba(20,24,31,.2)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="absolute right-5 top-5 rounded-control p-1.5 text-slate transition hover:bg-mist hover:text-ink"
          onClick={onClose}
          type="button"
        >
          <span className="sr-only">Close salary configuration</span>
          <X aria-hidden="true" className="h-4 w-4" />
        </button>

        <header className="mb-6 pr-8">
          <h2 className="font-display text-[22px] text-ink">Configure Salary</h2>
          <p className="mt-1 text-[14px] font-normal text-slate">for {staffName}</p>
        </header>

        <SalaryConfigForm
          onCancel={onClose}
          onSaved={handleSaved}
          staffMember={staffMember}
        />
      </section>
    </div>
  )
}
