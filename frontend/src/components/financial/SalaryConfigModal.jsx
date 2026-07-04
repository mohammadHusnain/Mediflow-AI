import { useEffect, useMemo, useState } from 'react'
import { DollarSign, Loader2, Percent, X } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'

import { translucentBackdropClass } from '@shared/components/FormPrimitives'
import { upsertSalaryConfig } from '@shared/services/salaryApi'

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

  return {
    commission_base: config.commission_base || 'consultation_fee',
    commission_rate: config.commission_rate ?? '',
    effective_from: config.effective_from || currentMonth(),
    fixed_amount: config.fixed_amount ?? '',
    salary_type: type,
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
  } = useForm({ defaultValues: getDefaultValues(staffMember) })
  const salaryType = useWatch({ control, name: 'salary_type' })
  const effectiveFrom = useWatch({ control, name: 'effective_from' })
  const isDoctor = String(staffMember?.role || '').toLowerCase() === 'doctor'
  const retroactiveWarning = effectiveFrom && effectiveFrom < threeMonthsAgo()

  useEffect(() => {
    reset(getDefaultValues(staffMember))
    const timeoutId = window.setTimeout(() => setApiError(''), 0)
    return () => window.clearTimeout(timeoutId)
  }, [reset, staffMember])

  useEffect(() => {
    if (salaryType === 'fixed') {
      clearErrors(['commission_rate', 'commission_base'])
      return
    }

    clearErrors('fixed_amount')
  }, [clearErrors, salaryType])

  const staffLabel = staffMember?.name || 'this staff member'

  async function onSubmit(values) {
    setSaving(true)
    setApiError('')

    try {
      await upsertSalaryConfig({
        commission_base: values.salary_type === 'commission' ? values.commission_base : undefined,
        commission_rate: values.salary_type === 'commission' ? Number(values.commission_rate) : undefined,
        effective_from: values.effective_from,
        fixed_amount: values.salary_type === 'fixed' ? Number(values.fixed_amount) : undefined,
        salary_type: values.salary_type,
        user_id: staffMember?.id,
      })
      await onSaved?.()
    } catch (error) {
      setApiError(getApiError(error))
    } finally {
      setSaving(false)
    }
  }

  const fixedRegistration = register('fixed_amount', {
    validate: (value) => {
      if (salaryType !== 'fixed') return true

      const amount = Number(value)
      if (!value && value !== 0) return 'Monthly fixed amount is required'
      if (amount < 1000) return 'Minimum salary is PKR 1,000'
      if (amount > 10000000) return 'Please verify this amount'
      return true
    },
  })
  const commissionRateRegistration = register('commission_rate', {
    validate: (value) => {
      if (salaryType !== 'commission') return true

      const rate = Number(value)
      if (!value && value !== 0) return 'Commission rate is required'
      if (rate < 0.1) return 'Commission rate must be at least 0.1%'
      if (rate > 100) return 'Commission rate cannot exceed 100%'
      return true
    },
  })

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
            <label className="text-[13px] font-medium text-ink" htmlFor="fixed_amount">
            Monthly Fixed Amount (PKR) <span className="text-[#C8102E]">*</span>
          </label>
          <div className="relative mt-2">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[13px] font-medium text-slate">
              PKR
            </span>
            <input
              className="h-11 w-full rounded-control border border-hairline bg-canvas py-2 pl-14 pr-3 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
              id="fixed_amount"
              min="0"
              step="100"
              type="number"
              {...fixedRegistration}
            />
          </div>
          <FieldError message={errors.fixed_amount?.message} />
        </div>
      ) : null}

      {salaryType === 'commission' ? (
        <>
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

          <div>
            <label className="text-[13px] font-medium text-ink" htmlFor="commission_base">
              Calculate commission from <span className="text-[#C8102E]">*</span>
            </label>
            <select
              className="mt-2 h-11 w-full rounded-control border border-hairline bg-canvas px-3 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
              id="commission_base"
              {...register('commission_base', {
                validate: (value) =>
                  salaryType !== 'commission' || value ? true : 'Commission base is required',
              })}
            >
              <option value="consultation_fee">Consultation Fee (per appointment)</option>
              <option value="monthly_revenue">Monthly Revenue Total</option>
            </select>
            <FieldError message={errors.commission_base?.message} />
          </div>
        </>
      ) : null}

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
