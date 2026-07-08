/* eslint-disable react-refresh/only-export-components -- Shares appointment form helpers with route pages. */
import { PaymentToggle } from './PaymentBadge'
import {
  FieldError,
  FormField,
  FormSection,
  getFieldClass,
} from '@shared/components/FormPrimitives'
import {
  getRecordId,
  getDoctorName,
  normalizeStringArray,
} from '@shared/lib/records'
import CurrencyInput from '@shared/components/CurrencyInput'
import TagInput from '@features/patients/components/TagInput'
import {
  getTemperatureWarning,
  validateBloodPressure,
  validateFutureDateTime,
} from '@shared/lib/validation'

export const EMPTY_APPOINTMENT_FORM = {
  doctor: '',
  appointment_dt: '',
  reason: '',
  current_condition: '',
  diagnosis: '',
  treatment_plan: '',
  medications_prescribed: [],
  consultation_fee: '',
  temperature: '',
  blood_pressure: '',
  notes: '',
  payment_status: 'unpaid',
  payment_method: '',
}

export function getAppointmentFormDefaults(appointment = null) {
  if (!appointment) {
    return EMPTY_APPOINTMENT_FORM
  }

  return {
    doctor:
      getRecordId(appointment.doctor) ??
      appointment.doctor ??
      '',
    appointment_dt: toDatetimeLocalValue(appointment.appointment_dt),
    reason: appointment.reason || '',
    current_condition: appointment.current_condition || '',
    diagnosis: appointment.diagnosis || '',
    treatment_plan: appointment.treatment_plan || '',
    medications_prescribed: normalizeStringArray(appointment.medications_prescribed || appointment.medications),
    consultation_fee: appointment.consultation_fee ?? '',
    temperature: appointment.temperature || '',
    blood_pressure: appointment.blood_pressure || '',
    notes: appointment.notes || appointment.additional_notes || '',
    payment_status: appointment.payment_status || 'unpaid',
    payment_method: appointment.payment_method || '',
  }
}

export function toAppointmentPayload(values) {
  return {
    doctor: values.doctor,
    appointment_dt: values.appointment_dt,
    reason: values.reason?.trim() || '',
    current_condition: values.current_condition?.trim() || '',
    diagnosis: values.diagnosis?.trim() || '',
    treatment_plan: values.treatment_plan?.trim() || '',
    medications_prescribed: normalizeStringArray(values.medications_prescribed),
    consultation_fee: values.consultation_fee ? Number(values.consultation_fee) : undefined,
    temperature: values.temperature ? String(values.temperature) : '',
    blood_pressure: values.blood_pressure?.trim() || '',
    notes: values.notes?.trim() || '',
    payment_status: values.payment_status || 'unpaid',
    payment_method: values.payment_method || '',
  }
}

export function toAppointmentBookingPayload(values) {
  const payload = toAppointmentPayload(values)

  delete payload.current_condition
  delete payload.diagnosis
  delete payload.treatment_plan
  delete payload.medications_prescribed

  return payload
}

export function toDatetimeLocalValue(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)

  return offsetDate.toISOString().slice(0, 16)
}

export function AppointmentFields({
  doctors,
  errors,
  lockPaid = false,
  register,
  requireFuture = true,
  setValue,
  showMedicalNotes = true,
  watch,
  doctorOnly = false,
}) {
  const temperature = watch('temperature')
  const paymentStatus = watch('payment_status')
  const temperatureWarning = getTemperatureWarning(temperature)

  return (
    <>
    {!doctorOnly && (
    <FormSection title="Visit Details">
      <FormField error={errors.doctor?.message} label="Doctor">
        <select
          className={getFieldClass(errors.doctor?.message)}
          {...register('doctor', { required: 'Doctor is required.' })}
        >
          <option value="">Select doctor</option>
          {doctors.map((doctor) => (
            <option key={getRecordId(doctor)} value={getRecordId(doctor)}>
              {getDoctorName(doctor)}
            </option>
          ))}
        </select>
      </FormField>

      <FormField error={errors.appointment_dt?.message} label="Date & Time">
        <input
          className={getFieldClass(errors.appointment_dt?.message, 'font-sans')}
          type="datetime-local"
          {...register('appointment_dt', {
            validate: (value) =>
              requireFuture
                ? validateFutureDateTime(value) || true
                : value
                  ? true
                  : 'Date and time are required.',
          })}
        />
      </FormField>

      <div className="md:col-span-2">
        <FormField label="Reason for Visit" optional>
          <input
            className={getFieldClass(false)}
            placeholder="Routine check-in"
            type="text"
            {...register('reason')}
          />
        </FormField>
      </div>

      <FormField error={errors.temperature?.message} label="Temperature (C)" optional>
        <input
          className={getFieldClass(errors.temperature?.message, 'font-sans')}
          placeholder="37.2"
          step="0.1"
          type="number"
          {...register('temperature')}
        />
        <FieldError tone="warning">{temperatureWarning}</FieldError>
      </FormField>

      <FormField
        error={errors.blood_pressure?.message}
        hint="Format: 120/80"
        label="Blood Pressure"
        optional
      >
        <input
          className={getFieldClass(errors.blood_pressure?.message, 'font-sans')}
          placeholder="120/80"
          type="text"
          {...register('blood_pressure', {
            validate: (value) => validateBloodPressure(value) || true,
          })}
        />
      </FormField>

      <div className="md:col-span-2">
        <FormField label="Notes / Piece Field" optional>
          <textarea
            className={getFieldClass(false, 'min-h-[92px] resize-none')}
            placeholder="Free-form clinical notes"
            rows={3}
            {...register('notes')}
          />
        </FormField>
      </div>
    </FormSection>
    )}

    {showMedicalNotes ? (
    <FormSection title="Medical Notes">
      <div className="md:col-span-2">
        <FormField label="Current Medical Condition" optional>
          <textarea
            className={getFieldClass(false, 'min-h-[72px] resize-y')}
            placeholder="Patient's current condition and symptoms..."
            rows={2}
            {...register('current_condition')}
          />
        </FormField>
      </div>

      <div className="md:col-span-2">
        <FormField label="Diagnosis" optional>
          <textarea
            className={getFieldClass(false, 'min-h-[72px] resize-y')}
            placeholder="Doctor's diagnosis..."
            rows={2}
            {...register('diagnosis')}
          />
        </FormField>
      </div>

      <div className="md:col-span-2">
        <FormField label="Treatment Plan" optional>
          <textarea
            className={getFieldClass(false, 'min-h-[72px] resize-y')}
            placeholder="Prescribed treatment plan..."
            rows={2}
            {...register('treatment_plan')}
          />
        </FormField>
      </div>

      <div className="md:col-span-2">
        <FormField label="Medications Prescribed" optional>
          <TagInput
            placeholder="Type medication and press Enter"
            value={watch('medications_prescribed') || []}
            onChange={(nextValue) =>
              setValue('medications_prescribed', nextValue, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          />
        </FormField>
      </div>
    </FormSection>
    ) : null}

    {!doctorOnly && (
    <FormSection title="Payment">
      <FormField error={errors.consultation_fee?.message} label="Consultation Fee">
        <CurrencyInput
          inputClassName={errors.consultation_fee?.message ? 'border-[#C8102E] bg-[#FCE4E8]/50' : ''}
          placeholder="1500"
          {...register('consultation_fee', {
            validate: (value) => {
              const num = Number(value)
              if (!value || Number.isNaN(num) || num < 0) {
                return 'Consultation fee is required and must be at least 0.'
              }
              return true
            },
          })}
        />
      </FormField>

      <div className="md:col-span-2">
        <FormField label="Payment Status">
          <PaymentToggle
            lockPaid={lockPaid}
            onChange={(nextValue) =>
              setValue('payment_status', nextValue, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            value={paymentStatus}
          />
        </FormField>
      </div>

      <FormField label="Payment Method" optional>
        <select
          className={getFieldClass(false)}
          {...register('payment_method')}
        >
          <option value="">Select method</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="online">Online Transfer</option>
          <option value="insurance">Insurance</option>
        </select>
      </FormField>
    </FormSection>
    )}
    </>
  )
}

export default AppointmentFields
