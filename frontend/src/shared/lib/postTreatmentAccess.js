export const POST_TREATMENT_ROLES = {
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  RECEPTIONIST: 'receptionist',
}

export function normalizeRoleSlug(subject = {}) {
  const roleValue =
    typeof subject === 'string'
      ? subject
      : subject.role?.slug ||
        subject.role_slug ||
        subject.role ||
        subject.slug ||
        subject.name

  return String(roleValue || '').trim().toLowerCase()
}

export function getPostTreatmentUserId(subject = {}) {
  const user = subject.user || subject

  return user?.user_id ?? user?.doctor_id ?? user?.id ?? user?.pk
}

export function getPostTreatmentDoctorId(subject = {}) {
  const user = subject.user || subject

  return user?.doctor_id ?? user?.user_id ?? user?.id ?? user?.pk
}

export function canCreatePlan(subject) {
  return normalizeRoleSlug(subject) === POST_TREATMENT_ROLES.DOCTOR
}

export function canViewPlan() {
  return true
}

export function canEditPlan(subject, plan = {}) {
  return (
    normalizeRoleSlug(subject) === POST_TREATMENT_ROLES.DOCTOR &&
    String(plan.doctor_id) === String(getPostTreatmentDoctorId(subject)) &&
    plan.status === 'active'
  )
}

export function canViewAlerts(subject) {
  return [
    POST_TREATMENT_ROLES.ADMIN,
    POST_TREATMENT_ROLES.DOCTOR,
    POST_TREATMENT_ROLES.RECEPTIONIST,
  ].includes(normalizeRoleSlug(subject))
}

export function canAcknowledgeAlert(subject, alert = {}) {
  const role = normalizeRoleSlug(subject)

  return (
    role === POST_TREATMENT_ROLES.ADMIN ||
    (
      role === POST_TREATMENT_ROLES.DOCTOR &&
      String(alert.doctor_id) === String(getPostTreatmentDoctorId(subject))
    )
  )
}

export function canResolveAlert(subject, alert = {}) {
  return canAcknowledgeAlert(subject, alert)
}

export function canMarkCalled(subject, alert = {}) {
  return canAcknowledgeAlert(subject, alert)
}

export function canDoctorAccessPatient(subject, appointment = {}) {
  if (normalizeRoleSlug(subject) !== POST_TREATMENT_ROLES.DOCTOR) {
    return false
  }

  return String(appointment.doctor) === String(getPostTreatmentDoctorId(subject))
}
