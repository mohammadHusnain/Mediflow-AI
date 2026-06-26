/* src/shared/lib/chatRbac.js - Frontend chat role filtering rules. */
export const CHAT_ROLES = {
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  RECEPTIONIST: 'receptionist',
}

const PORTAL_CHAT_ROLES = [
  CHAT_ROLES.ADMIN,
  CHAT_ROLES.DOCTOR,
  CHAT_ROLES.RECEPTIONIST,
]

function roleSlug(value) {
  const rawRole = value?.role ?? value

  if (rawRole && typeof rawRole === 'object') {
    return String(rawRole.slug || rawRole.name || '').trim().toLowerCase()
  }

  return String(rawRole || '').trim().toLowerCase()
}

function userId(value) {
  return value?.user_id ?? value?.id ?? value?.pk ?? value?.uuid
}

export function getDMableRoles() {
  return PORTAL_CHAT_ROLES
}

export function getGroupableRoles(userRole) {
  const map = {
    [CHAT_ROLES.ADMIN]: PORTAL_CHAT_ROLES,
    [CHAT_ROLES.DOCTOR]: [CHAT_ROLES.DOCTOR, CHAT_ROLES.RECEPTIONIST],
    [CHAT_ROLES.RECEPTIONIST]: [CHAT_ROLES.RECEPTIONIST, CHAT_ROLES.DOCTOR],
  }

  return map[roleSlug(userRole)] || []
}

export function canCreateGroup(user) {
  return PORTAL_CHAT_ROLES.includes(roleSlug(user))
}

export function filterDMableUsers(users = [], currentUser = {}) {
  const allowedRoles = getDMableRoles(currentUser.role)
  const currentUserId = userId(currentUser)

  return users.filter((candidate) => {
    const candidateId = userId(candidate)

    return (
      candidateId !== undefined &&
      String(candidateId) !== String(currentUserId) &&
      allowedRoles.includes(roleSlug(candidate))
    )
  })
}

export function filterGroupableUsers(users = [], currentUser = {}) {
  const allowedRoles = getGroupableRoles(currentUser.role)
  const currentUserId = userId(currentUser)

  return users.filter((candidate) => {
    const candidateId = userId(candidate)

    return (
      candidateId !== undefined &&
      String(candidateId) !== String(currentUserId) &&
      allowedRoles.includes(roleSlug(candidate))
    )
  })
}

export function getChatRoleLabel(role) {
  const slug = roleSlug(role)

  if (slug === CHAT_ROLES.ADMIN) return 'Admin'
  if (slug === CHAT_ROLES.DOCTOR) return 'Doctor'
  if (slug === CHAT_ROLES.RECEPTIONIST) return 'Receptionist'

  return 'Staff'
}
