import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'

import Avatar from '@shared/components/Avatar'
import CurrencyInput from '@shared/components/CurrencyInput'
import {
  ErrorBanner,
  FieldError,
  FieldLabel,
  FormField,
  FormSection,
  LoadingSpinner,
  getFieldClass,
} from '@shared/components/FormPrimitives'
import { useToast } from '@shared/components/Toast'
import { getBackendError } from '@shared/lib/records'
import { getDoctors, getStaff } from '@shared/services/api'
import {
  createSalaryConfig,
  getSalaryConfigs,
  updateSalaryConfig,
} from '@shared/services/billingApi'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function listFromResponse(response) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.results)) return response.results
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.data?.results)) return response.data.results
  return []
}

function fullName(person) {
  return (
    person?.full_name ||
    person?.name ||
    `${person?.first_name || ''} ${person?.last_name || ''}`.trim() ||
    person?.email ||
    'Unknown employee'
  )
}

function employeeRole(person, employeeType) {
  if (employeeType === 'doctor') {
    const specialization = Array.isArray(person?.specializations)
      ? person.specializations[0]
      : person?.specialization || person?.specializations

    return specialization || 'Doctor'
  }

  return person?.role || person?.title || 'Staff'
}

function normalizeDate(value) {
  if (!value) return today()
  const text = String(value)
  if (/^\d{4}-\d{2}$/.test(text)) return `${text}-01`
  return text.slice(0, 10)
}

function normalizeConfig(config) {
  if (!config) return null

  const commissionMode = Number(config.commission_per_appointment || 0) > 0 ? 'flat' : 'rate'

  return {
    ...config,
    base_salary: config.base_salary ?? config.fixed_amount ?? '',
    commission_mode: commissionMode,
    commission_per_appointment: config.commission_per_appointment ?? '',
    commission_rate: config.commission_rate ?? '',
    deductions: config.deductions ?? '',
    effective_from: normalizeDate(config.effective_from),
    allowances: config.allowances ?? '',
    notes: config.notes ?? '',
    salary_type: config.salary_type || 'fixed',
  }
}

function toFormValues(config) {
  return {
    allowances: config?.allowances ?? '',
    base_salary: config?.base_salary ?? '',
    commission_mode: config?.commission_mode || 'rate',
    commission_per_appointment: config?.commission_per_appointment ?? '',
    commission_rate: config?.commission_rate ?? '',
    deductions: config?.deductions ?? '',
    effective_from: config?.effective_from || today(),
    notes: config?.notes || '',
    salary_type: config?.salary_type || 'fixed',
  }
}

function getEmployeeId(person, employeeType) {
  return employeeType === 'staff'
    ? (person?.user_id ?? person?.id)
    : (person?.user_id ?? person?.id)
}

function SalaryTypeCard({
  checked,
  description,
  disabled = false,
  emoji,
  label,
  onSelect,
}) {
  return (
    <button
      className={[
        'min-h-[104px] rounded-[12px] border-2 p-4 text-left transition',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        checked ? 'border-brand bg-brand/5' : 'border-hairline bg-mist hover:bg-canvas',
      ].join(' ')}
      disabled={disabled}
      onClick={onSelect}
      type="button"
    >
      <span aria-hidden="true" className="mb-3 block text-[20px] leading-none">
        {emoji}
      </span>
      <span className="block text-[14px] font-semibold text-ink">{label}</span>
      <span className="mt-1 block text-[12px] font-normal text-slate">{description}</span>
    </button>
  )
}

export default function SalaryFormPage({ mode = 'add' }) {
  const { employeeId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitError, setSubmitError] = useState('')
  const isEdit = mode === 'edit'
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError,
    setValue,
  } = useForm({ defaultValues: toFormValues(null) })
  const salaryType = useWatch({ control, name: 'salary_type' }) || 'fixed'
  const commissionMode = useWatch({ control, name: 'commission_mode' }) || 'rate'
  const isDoctor = String(employee?.employee_type || '').toLowerCase() === 'doctor' ||
    String(employee?.role || '').toLowerCase() === 'doctor'

  const loadEmployee = useCallback(async () => {
    setLoading(true)
    setSubmitError('')

    try {
      const [doctorsRes, staffRes, configsRes] = await Promise.all([
        getDoctors(),
        getStaff(),
        getSalaryConfigs(),
      ])
      const configs = listFromResponse(configsRes)
      const configById = new Map()
      const configByEmail = new Map()

      configs.forEach((config) => {
        const employeeConfigId = config.employee?.id || config.employee_id || config.user_id || config.staff_id
        const email = String(config.employee?.email || config.email || '').toLowerCase()
        const normalized = normalizeConfig(config)

        if (employeeConfigId) configById.set(String(employeeConfigId), normalized)
        if (email) configByEmail.set(email, normalized)
      })

      const people = [
        ...listFromResponse(doctorsRes).map((person) => ({ person, type: 'doctor' })),
        ...listFromResponse(staffRes).map((person) => ({ person, type: 'staff' })),
      ]
      const match = people.find(({ person, type }) => String(getEmployeeId(person, type)) === String(employeeId))

      if (!match) {
        setEmployee(null)
        setSubmitError('Employee could not be found.')
        return
      }

      const id = getEmployeeId(match.person, match.type)
      const email = String(match.person.email || match.person.user?.email || '').toLowerCase()
      const config = configById.get(String(id)) || (email ? configByEmail.get(email) : null) || null
      const nextEmployee = {
        config,
        email: match.person.email || match.person.user?.email || '',
        employee_type: match.type,
        id,
        name: fullName(match.person),
        role: employeeRole(match.person, match.type),
      }

      setEmployee(nextEmployee)
      reset(toFormValues(config))
    } catch (error) {
      setSubmitError(getBackendError(error, 'Salary details could not be loaded.'))
      setEmployee(null)
    } finally {
      setLoading(false)
    }
  }, [employeeId, reset])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadEmployee, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadEmployee])

  async function onSubmit(values) {
    if (!employee) return

    setSubmitError('')
    const salaryTypeValue = String(values.salary_type || 'fixed')
    const commissionModeValue = String(values.commission_mode || 'rate')

    if (salaryTypeValue === 'commission' && !isDoctor) {
      setError('salary_type', {
        type: 'manual',
        message: 'Commission salary is available for doctors only',
      })
      return
    }

    if (salaryTypeValue === 'commission' && commissionModeValue === 'rate') {
      const rate = Number(values.commission_rate)

      if (!Number.isFinite(rate) || rate <= 0 || rate > 100) {
        setError('commission_rate', {
          type: 'manual',
          message: 'Commission rate must be between 0.1% and 100%',
        })
        return
      }
    }

    if (salaryTypeValue === 'commission' && commissionModeValue === 'flat') {
      const flatAmount = Number(values.commission_per_appointment)

      if (!Number.isFinite(flatAmount) || flatAmount <= 0) {
        setError('commission_per_appointment', {
          type: 'manual',
          message: 'Flat amount must be greater than zero',
        })
        return
      }
    }

    try {
      const payload = {
        allowances: Number(values.allowances) || 0,
        base_salary: Number(values.base_salary),
        commission_per_appointment:
          salaryTypeValue === 'commission' && commissionModeValue === 'flat'
            ? Number(values.commission_per_appointment)
            : 0,
        commission_rate:
          salaryTypeValue === 'commission' && commissionModeValue === 'rate'
            ? Number(values.commission_rate)
            : 0,
        deductions: Number(values.deductions) || 0,
        effective_from: values.effective_from,
        employee_id: employee.id,
        notes: values.notes || '',
        salary_type: salaryTypeValue,
      }

      if (employee.config?.id) {
        await updateSalaryConfig(employee.config.id, payload)
      } else {
        await createSalaryConfig(payload)
      }

      toast.success(isEdit ? 'Salary updated' : 'Salary configured')
      navigate('/financial-reports/salary')
    } catch (error) {
      setSubmitError(getBackendError(error, 'Salary could not be saved.'))
    }
  }

  return (
    <div className="animate-fade-up">
      <div className="mx-auto max-w-2xl rounded-card bg-canvas p-5 shadow-card sm:p-6">
        <div className="mb-5">
          <button
            className="mb-3 inline-flex items-center gap-2 text-[13px] font-semibold text-slate transition hover:text-ink"
            onClick={() => navigate('/financial-reports/salary')}
            type="button"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back
          </button>
          <h1 className="text-[22px] font-bold leading-tight text-ink">
            {isEdit ? 'Edit Salary' : 'Add Salary'}
          </h1>
        </div>

        {loading ? (
          <div className="flex h-44 items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            {employee ? (
              <section className="rounded-[14px] border border-hairline bg-mist px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar name={employee.name} size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-ink">{employee.name}</p>
                    <p className="truncate text-[13px] text-slate">{employee.role}</p>
                  </div>
                </div>
              </section>
            ) : null}

            <FormSection title="Salary Details">
              <div className="md:col-span-2">
                <FieldLabel error={errors.salary_type?.message} label="Salary Type" />
                <div>
                  <input
                    className="sr-only"
                    type="hidden"
                    {...register('salary_type', { required: 'Please select a salary type' })}
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <SalaryTypeCard
                      checked={salaryType === 'fixed'}
                      description="Monthly fixed amount"
                      emoji="💼"
                      label="Fixed Salary"
                      onSelect={() =>
                        setValue('salary_type', 'fixed', {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    />
                    <SalaryTypeCard
                      checked={salaryType === 'commission'}
                      description="Base salary plus appointment commission"
                      disabled={!isDoctor}
                      emoji="📈"
                      label="Commission"
                      onSelect={() =>
                        setValue('salary_type', 'commission', {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    />
                  </div>
                  {!isDoctor ? (
                    <p className="mt-2 text-[12px] font-normal italic text-slate">
                      Commission salary is available for doctors only.
                    </p>
                  ) : null}
                  <FieldError>{errors.salary_type?.message}</FieldError>
                </div>
              </div>

              <FormField error={errors.base_salary?.message} label="Base Salary">
                <CurrencyInput
                  inputClassName={errors.base_salary?.message ? 'border-[#C8102E] bg-[#FCE4E8]/50' : ''}
                  placeholder="0.00"
                  {...register('base_salary', {
                    required: 'Base salary is required',
                    min: { value: 1, message: 'Base salary must be greater than zero' },
                    valueAsNumber: true,
                  })}
                />
              </FormField>

              {salaryType === 'commission' ? (
                <>
                  <div className="md:col-span-2">
                    <FieldLabel label="Commission Mode" />
                    <div>
                      <input
                        className="sr-only"
                        type="hidden"
                        {...register('commission_mode')}
                      />
                      <div className="rounded-control bg-brand-light p-4">
                        <div className="flex flex-wrap gap-4">
                          <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-ink">
                            <input
                              checked={commissionMode === 'rate'}
                              onChange={() =>
                                setValue('commission_mode', 'rate', {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                })
                              }
                              type="radio"
                            />
                            Rate (% of fee)
                          </label>
                          <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-ink">
                            <input
                              checked={commissionMode === 'flat'}
                              onChange={() =>
                                setValue('commission_mode', 'flat', {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                })
                              }
                              type="radio"
                            />
                            Flat per appointment
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {commissionMode === 'rate' ? (
                    <FormField error={errors.commission_rate?.message} label="Commission Rate (%)">
                      <div className="relative">
                        <input
                          className={getFieldClass(
                            errors.commission_rate?.message,
                            'pr-10 font-sans',
                          )}
                          max="100"
                          min="0"
                          placeholder="15"
                          step="0.5"
                          type="number"
                          {...register('commission_rate')}
                        />
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-medium text-slate">
                        %
                      </span>
                    </div>
                    </FormField>
                  ) : (
                    <FormField
                      error={errors.commission_per_appointment?.message}
                      label="Flat per Appointment"
                    >
                      <CurrencyInput
                        inputClassName={
                          errors.commission_per_appointment?.message
                            ? 'border-[#C8102E] bg-[#FCE4E8]/50'
                            : ''
                        }
                        placeholder="0.00"
                        {...register('commission_per_appointment')}
                      />
                    </FormField>
                  )}
                </>
              ) : null}

              <FormField label="Allowances" optional>
                <CurrencyInput placeholder="0.00" {...register('allowances')} />
              </FormField>

              <FormField label="Deductions" optional>
                <CurrencyInput placeholder="0.00" {...register('deductions')} />
              </FormField>

              <FormField error={errors.effective_from?.message} label="Effective From">
                <input
                  className={getFieldClass(errors.effective_from?.message)}
                  type="date"
                  {...register('effective_from', { required: 'Effective date is required' })}
                />
              </FormField>

              <div className="md:col-span-2">
                <FormField label="Notes" optional>
                  <textarea
                    className={getFieldClass(false, 'min-h-[76px] resize-y')}
                    placeholder="Optional salary notes"
                    rows={2}
                    {...register('notes')}
                  />
                </FormField>
              </div>
            </FormSection>

            <ErrorBanner message={submitError} />

            <div className="flex justify-end gap-3">
              <button
                className="rounded-control border border-hairline bg-canvas px-4 py-2.5 text-[13px] font-semibold text-slate transition hover:bg-mist hover:text-ink"
                disabled={isSubmitting}
                onClick={() => navigate('/financial-reports/salary')}
                type="button"
              >
                Cancel
              </button>
              <button
                className="primary-button inline-flex min-w-[128px] items-center justify-center rounded-control bg-brand px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting || !employee}
                type="submit"
              >
                {isSubmitting ? <LoadingSpinner light /> : 'Save Salary'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
