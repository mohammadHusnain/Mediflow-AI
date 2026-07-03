import { Navigate } from 'react-router-dom'

import { PUBLIC_ROUTES_FOR_TESTING } from '@shared/lib/testingAccess'
import { usePermission } from '@shared/lib/usePermission'

export function ModuleRoute({ action, children, module }) {
  const { can } = usePermission()

  if (PUBLIC_ROUTES_FOR_TESTING) {
    return children
  }

  if (!can(module, action)) {
    return <Navigate replace to="/not-available" />
  }

  return children
}

export default ModuleRoute
