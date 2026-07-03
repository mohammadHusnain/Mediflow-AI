import { Navigate } from 'react-router-dom'

import { PUBLIC_ROUTES_FOR_TESTING } from '@shared/lib/testingAccess'
import { usePermission } from '@shared/lib/usePermission'

export function AdminOnlyRoute({ children }) {
  const { isAdmin } = usePermission()

  if (PUBLIC_ROUTES_FOR_TESTING) {
    return children
  }

  if (!isAdmin) {
    return <Navigate replace to="/not-available" />
  }

  return children
}

export default AdminOnlyRoute
