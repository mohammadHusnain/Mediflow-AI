/* src/features/doctors/pages/AddDoctor.jsx - Add new doctor form. */
import { useEffect, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import DoctorFormFields from '@features/doctors/components/DoctorFormFields'
import AccountCreatedModal from '@shared/components/AccountCreatedModal'
import {
  ErrorBanner,
  FieldLabel,
  LoadingSpinner,
} from '@shared/components/FormPrimitives'
import { useToast } from '@shared/components/Toast'
import { getBackendError, getRecordId } from '@shared/lib/records'
import { usePermission } from '@shared/lib/usePermission'
import { validateEmail, validatePhone } from '@shared/lib/validation'
import { createDoctor } from '@shared/services/api'
import { createSalaryConfig } from '@shared/services/billingApi'
import { CURRENCIES } from '@shared/lib/currency'

const INITIAL_FORM_DATA = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  qualifications: [],
  specializations: [],
  experience_years: 0,
  shift_start: '09:00',
  shift_end: '17:00',
  status: 'active',
  join_date: new Date().toISOString().split('T')[0],
  salary_type: 'commission',
  base_salary: '',
  salary_commission_mode: 'rate',
  salary_commission_rate: '',
  salary_commission_per_appointment: '',
  salary_allowances: '',
  salary_deductions: '',
  salary_effective_from: new Date().toISOString().split('T')[0],
}

const TOUCHED_ALL = {
  email: true,
  experience_years: true,
  first_name: true,
  join_date: true,
  last_name: true,
  phone: true,
  qualifications: true,
  shift_end: true,
  shift_start: true,
  specializations: true,
  status: true,
  base_salary: true,
  salary_type: true,
  salary_effective_from: true,
}

function validateDoctorForm(data) {
  const errors = {}
  const firstName = String(data.first_name || '').trim()
  const lastName = String(data.last_name || '').trim()
  const trimmedEmail = String(data.email || '').trim()
  const phoneError = validatePhone(data.phone)
  const experience = Number(data.experience_years)

  if (!firstName) {
    errors.first_name = 'First name is required'
  }

  if (!lastName) {
    errors.last_name = 'Last name is required'
  }

  const emailError = validateEmail(trimmedEmail)

  if (emailError) {
    errors.email = emailError
  }

  if (phoneError) {
    errors.phone = phoneError
  }

  if (!data.qualifications?.length) {
    errors.qualifications = 'At least one qualification is required'
  }

  if (!data.specializations?.length) {
    errors.specializations = 'At least one specialization is required'
  }

  if (!Number.isFinite(experience)) {
    errors.experience_years = 'Experience is required'
  } else if (experience < 0) {
    errors.experience_years = 'Cannot be negative'
  }

  if (!data.shift_start) {
    errors.shift_start = 'Shift start time is required'
  }

  if (!data.shift_end) {
    errors.shift_end = 'Shift end time is required'
  }

  if (data.shift_start && data.shift_end && data.shift_end === data.shift_start) {
    errors.shift_end = 'End time must be different from start time'
  }

  if (!data.status) {
    errors.status = 'Status is required'
  }

  if (!data.join_date) {
    errors.join_date = 'Join date is required'
  } else if (data.join_date > new Date().toISOString().split('T')[0]) {
    errors.join_date = 'Join date cannot be in the future'
  }

  return errors
}

function prepareDoctorPayload(data) {
  return {
    email: String(data.email || '').trim(),
    experience_years: Number(data.experience_years),
    first_name: String(data.first_name || '').trim(),
    last_name: String(data.last_name || '').trim(),
    phone: String(data.phone || '').trim(),
    qualification_ids: data.qualifications.map((item) => item.id),
    specializations: data.specializations.map((item) => item.trim()),
    shift_end: data.shift_end,
    shift_start: data.shift_start,
    status: data.status,
    join_date: data.join_date,
  }
}

export function AddDoctor() {
  const navigate = useNavigate()
  const toast = useToast()
  const { isAdmin } = usePermission()
  const [data, setData] = useState(INITIAL_FORM_DATA)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [generalError, setGeneralError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdAccount, setCreatedAccount] = useState(null)

  useEffect(() => {
    if (!isAdmin) {
      navigate('/not-available', { replace: true })
    }
  }, [isAdmin, navigate])

  function handleChange(event) {
    const { name, value } = event.target
    setData((currentData) => ({
      ...currentData,
      [name]: value,
    }))
    setGeneralError('')

    if (errors[name]) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        [name]: '',
      }))
    }
  }

  function handleBlur(event) {
    const { name } = event.target
    setTouched((currentTouched) => ({
      ...currentTouched,
      [name]: true,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = validateDoctorForm(data)
    setTouched(TOUCHED_ALL)

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setIsSubmitting(true)

    try {
      const response = await createDoctor(prepareDoctorPayload(data))
      const doctorId = getRecordId(response)

      await createSalaryIfNeeded(doctorId)

      if (response?.email_sent === false) {
        toast.warning(
          'Profile created but email delivery failed. Share credentials manually.',
        )
        window.setTimeout(() => {
          navigate(doctorId ? `/doctors/${doctorId}` : '/doctors', { replace: true })
        }, 2000)
        return
      }

      setCreatedAccount({
        email: String(data.email || '').trim(),
        fullName: [data.first_name, data.last_name].filter(Boolean).join(' '),
        id: doctorId,
      })
    } catch (error) {
      const message = getBackendError(error, 'Doctor could not be created.')
      toast.error(message)
      setGeneralError(message)
      setErrors(error?.response?.data || { general: 'Doctor could not be created.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function createSalaryIfNeeded(employeeId) {
    const baseSalary = Number(data.base_salary)
    if (!baseSalary || !employeeId) return

    const salaryData = {
      employee_id: employeeId,
      salary_type: data.salary_type || 'commission',
      base_salary: baseSalary,
      allowances: Number(data.salary_allowances) || 0,
      deductions: Number(data.salary_deductions) || 0,
      effective_from: data.salary_effective_from || new Date().toISOString().split('T')[0],
    }

    if (salaryData.salary_type === 'commission') {
      if ((data.salary_commission_mode || 'rate') === 'rate') {
        salaryData.commission_rate = Number(data.salary_commission_rate) || 0
        salaryData.commission_per_appointment = 0
      } else {
        salaryData.commission_rate = 0
        salaryData.commission_per_appointment = Number(data.salary_commission_per_appointment) || 0
      }
    }

    try {
      await createSalaryConfig(salaryData)
    } catch {
      // salary creation is optional, don't block
    }
  }

  return (
    <div className="mx-auto max-w-2xl animate-fade-up">
      <div className="mb-6 flex items-center gap-3">
        <button
          className="rounded-control p-2 text-slate transition hover:bg-canvas hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
          onClick={() => navigate('/doctors')}
          type="button"
        >
          <span className="sr-only">Back to doctors</span>
          <ChevronLeft aria-hidden="true" className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-[28px] font-bold text-ink">Add Doctor</h1>
          <p className="mt-0.5 text-[13px] text-slate">
            Add a new doctor to the clinical team
          </p>
        </div>
      </div>

      <form
        className="space-y-6 rounded-card bg-canvas p-6 shadow-card"
        noValidate
        onSubmit={handleSubmit}
      >
        <DoctorFormFields
          data={data}
          errors={errors}
          onBlur={handleBlur}
          onChange={handleChange}
          touched={touched}
        />

        <div className="space-y-4 border-t border-hairline pt-5">
          <h3 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
            <span>Salary Configuration</span>
            <span className="text-[12px] font-normal text-slate">optional</span>
          </h3>

          <label className="block">
            <FieldLabel label="Currency" optional />
            <select
              className="w-full rounded-control border border-hairline bg-mist px-3 py-2.5 text-[13px] text-ink outline-none focus:border-brand"
              name="salary_currency"
              onBlur={handleBlur}
              onChange={handleChange}
              value={data.salary_currency || 'PKR'}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.symbol} {c.code} - {c.name}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <FieldLabel label="Salary Type" optional />
            <select
              className="w-full rounded-control border border-hairline bg-mist px-3 py-2.5 text-[13px] text-ink outline-none focus:border-brand"
              name="salary_type"
              onBlur={handleBlur}
              onChange={handleChange}
              value={data.salary_type || 'commission'}
            >
              <option value="fixed">Fixed</option>
              <option value="commission">Commission-Based</option>
            </select>
          </label>

          <label className="block">
            <FieldLabel label="Base Salary" optional />
            <input
              className="w-full rounded-control border border-hairline bg-mist px-3 py-2.5 text-[13px] text-ink outline-none font-sans focus:border-brand"
              min="0"
              name="base_salary"
              onBlur={handleBlur}
              onChange={handleChange}
              placeholder="50000"
              type="number"
              value={data.base_salary || ''}
            />
          </label>

          {(data.salary_type || 'commission') === 'commission' ? (
            <div className="space-y-3 p-4 rounded-control bg-brand-light">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                  <input type="radio" name="salary_commission_mode"
                    checked={(data.salary_commission_mode || 'rate') === 'rate'}
                    onChange={() => handleChange({ target: { name: 'salary_commission_mode', value: 'rate' } })} />
                  Rate (% of fee)
                </label>
                <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                  <input type="radio" name="salary_commission_mode"
                    checked={data.salary_commission_mode === 'flat'}
                    onChange={() => handleChange({ target: { name: 'salary_commission_mode', value: 'flat' } })} />
                  Flat per appointment
                </label>
              </div>
              {(data.salary_commission_mode || 'rate') === 'rate' ? (
                <label className="block">
                  <FieldLabel label="Commission Rate (%)" optional />
                  <input
                    className="w-full rounded-control border border-hairline bg-mist px-3 py-2.5 text-[13px] text-ink outline-none font-sans focus:border-brand"
                    min="0" max="100" name="salary_commission_rate" onBlur={handleBlur} onChange={handleChange}
                    placeholder="15" type="number" value={data.salary_commission_rate || ''} />
                </label>
              ) : (
                <label className="block">
                  <FieldLabel label="Flat per Appointment" optional />
                  <input
                    className="w-full rounded-control border border-hairline bg-mist px-3 py-2.5 text-[13px] text-ink outline-none font-sans focus:border-brand"
                    min="0" name="salary_commission_per_appointment" onBlur={handleBlur} onChange={handleChange}
                    placeholder="500" type="number" value={data.salary_commission_per_appointment || ''} />
                </label>
              )}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <FieldLabel label="Allowances" optional />
              <input
                className="w-full rounded-control border border-hairline bg-mist px-3 py-2.5 text-[13px] text-ink outline-none font-sans focus:border-brand"
                min="0" name="salary_allowances" onBlur={handleBlur} onChange={handleChange}
                placeholder="5000" type="number" value={data.salary_allowances || ''} />
            </label>
            <label className="block">
              <FieldLabel label="Deductions" optional />
              <input
                className="w-full rounded-control border border-hairline bg-mist px-3 py-2.5 text-[13px] text-ink outline-none font-sans focus:border-brand"
                min="0" name="salary_deductions" onBlur={handleBlur} onChange={handleChange}
                placeholder="2000" type="number" value={data.salary_deductions || ''} />
            </label>
          </div>

          <label className="block">
            <FieldLabel label="Effective From" optional />
            <input
              className="w-full rounded-control border border-hairline bg-mist px-3 py-2.5 text-[13px] text-ink outline-none focus:border-brand"
              name="salary_effective_from" onBlur={handleBlur} onChange={handleChange}
              type="date" value={data.salary_effective_from || new Date().toISOString().split('T')[0]} />
          </label>
        </div>

        <ErrorBanner message={generalError} />

        <div className="flex gap-3 pt-4">
          <button
            className="flex-1 rounded-control border border-hairline px-4 py-2.5 text-[13px] font-medium text-slate transition hover:bg-mist hover:text-ink"
            onClick={() => navigate('/doctors')}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex flex-1 items-center justify-center rounded-control bg-brand px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? <LoadingSpinner light /> : 'Add Doctor'}
          </button>
        </div>
      </form>

      {createdAccount ? (
        <AccountCreatedModal
          email={createdAccount.email}
          entityLabel="Doctor"
          fullName={createdAccount.fullName}
          onViewProfile={() =>
            navigate(
              createdAccount.id ? `/doctors/${createdAccount.id}` : '/doctors',
              { replace: true },
            )
          }
        />
      ) : null}
    </div>
  )
}

export default AddDoctor
