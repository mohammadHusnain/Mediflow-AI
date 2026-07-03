/* src/app/App.jsx - Defines MediFlow portal routes. */
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import AppointmentBooking from '@features/appointments/pages/AppointmentBooking.jsx'
import AppointmentEdit from '@features/appointments/pages/AppointmentEdit.jsx'
import AppointmentView from '@features/appointments/pages/AppointmentView.jsx'
import Appointments from '@features/appointments/pages/Appointments.jsx'
import GeneralDashboard from '@features/dashboard/pages/AdminDashboard.jsx'
import DoctorDashboard from '@features/dashboard/pages/DoctorDashboard.jsx'
import AccessControl from '@features/access-control/pages/AccessControl.jsx'
import AddDoctor from '@features/doctors/pages/AddDoctor.jsx'
import DoctorView from '@features/doctors/pages/DoctorView.jsx'
import DoctorsList from '@features/doctors/pages/DoctorsList.jsx'
import EditDoctor from '@features/doctors/pages/EditDoctor.jsx'
import Reports from '@features/reports/pages/Reports.jsx'
import PatientFormPage from '@features/patients/pages/PatientFormPage.jsx'
import PatientView from '@features/patients/pages/PatientView.jsx'
import Patients from '@features/patients/pages/Patients.jsx'
import AddStaff from '@features/staff/pages/AddStaff.jsx'
import EditStaff from '@features/staff/pages/EditStaff.jsx'
import StaffList from '@features/staff/pages/StaffList.jsx'
import StaffView from '@features/staff/pages/StaffView.jsx'
import AdminOnlyRoute from '@shared/components/AdminOnlyRoute.jsx'
import ModuleRoute from '@shared/components/ModuleRoute.jsx'
import PortalLayout from '@shared/components/PortalLayout.jsx'
import ProtectedRoute from '@shared/components/ProtectedRoute.jsx'
import RootRedirect from '@shared/components/RootRedirect.jsx'
import { usePermission } from '@shared/lib/usePermission'
import { useAuth } from '@shared/context/AuthContext'
import ChangePassword from '../pages/ChangePassword.jsx'
import ExpenseFormPage from '../pages/expenses/ExpenseFormPage.jsx'
import FinancialReports from '../pages/FinancialReports.jsx'
import FinancialLayout, {
  FinancialReportsPlaceholder,
} from '../pages/financial/FinancialLayout.jsx'
import InvoiceDetail from '../pages/financial/billing/InvoiceDetail.jsx'
import InvoiceHistory from '../pages/financial/billing/InvoiceHistory.jsx'
import InvoiceList from '../pages/financial/billing/InvoiceList.jsx'
import PaymentRecords from '../pages/financial/billing/PaymentRecords.jsx'
import SalaryConfig from '../pages/financial/salary/SalaryConfig.jsx'
import SalaryHistory from '../pages/financial/salary/SalaryHistory.jsx'
import SalaryOverview from '../pages/financial/salary/SalaryOverview.jsx'
import Login from '../pages/Login.jsx'
import NotAvailable from '../pages/NotAvailable.jsx'
import NotFound from '../pages/NotFound.jsx'

function FinancialReportsRoute({ children }) {
  const location = useLocation()
  const { can, role } = usePermission()

  if (role?.slug === 'doctor') {
    if (location.pathname.startsWith('/financial-reports/salary')) {
      return children
    }

    return <Navigate replace to="/financial-reports/salary" />
  }

  if (!can('financial_reports', 'read')) {
    return <Navigate replace to="/not-available" />
  }

  return children
}

function FinancialIndexRedirect() {
  const location = useLocation()
  const { role } = useAuth()
  const searchParams = new URLSearchParams(location.search)

  if (role?.slug === 'doctor') {
    return <Navigate replace to="/financial-reports/salary" />
  }

  if (searchParams.get('tab') === 'report') {
    return <Navigate replace to="/financial-reports/expenses?tab=report" />
  }

  return <Navigate replace to="/financial-reports/billing/invoices" />
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/not-available" element={<NotAvailable />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/change-password" element={<ChangePassword />} />

        <Route element={<PortalLayout />}>
            <Route
              path="/dashboard/general"
              element={<GeneralDashboard />}
            />
            <Route
              path="/dashboard/admin"
              element={<Navigate replace to="/dashboard/general" />}
            />
            <Route path="/dashboard/doctor" element={<DoctorDashboard />} />

            <Route
              path="/appointments"
              element={
                <ModuleRoute action="read" module="appointments">
                  <Appointments />
                </ModuleRoute>
              }
            />
            <Route
              path="/appointments/book"
              element={
                <AdminOnlyRoute>
                  <AppointmentBooking />
                </AdminOnlyRoute>
              }
            />
            <Route
              path="/appointments/:id"
              element={
                <ModuleRoute action="read" module="appointments">
                  <AppointmentView />
                </ModuleRoute>
              }
            />
            <Route
              path="/appointments/:id/edit"
              element={<AppointmentEdit />}
            />

            <Route
              path="/patients"
              element={
                <ModuleRoute action="read" module="patients">
                  <Patients />
                </ModuleRoute>
              }
            />
            <Route
              path="/patients/new"
              element={
                <AdminOnlyRoute>
                  <PatientFormPage mode="add" />
                </AdminOnlyRoute>
              }
            />
            <Route
              path="/patients/:id"
              element={
                <ModuleRoute action="read" module="patients">
                  <PatientView />
                </ModuleRoute>
              }
            />
            <Route
              path="/patients/:id/edit"
              element={
                <ModuleRoute action="write" module="patients">
                  <PatientFormPage mode="edit" />
                </ModuleRoute>
              }
            />

            <Route
              path="/doctors"
              element={
                <ModuleRoute action="read" module="doctors">
                  <DoctorsList />
                </ModuleRoute>
              }
            />
            <Route
              path="/doctors/new"
              element={
                <AdminOnlyRoute>
                  <AddDoctor />
                </AdminOnlyRoute>
              }
            />
            <Route
              path="/doctors/:id"
              element={<DoctorView />}
            />
            <Route
              path="/doctors/:id/edit"
              element={
                <AdminOnlyRoute>
                  <EditDoctor />
                </AdminOnlyRoute>
              }
            />

            <Route
              path="/staff"
              element={
                <ModuleRoute action="read" module="staff">
                  <StaffList />
                </ModuleRoute>
              }
            />
            <Route
              path="/staff/new"
              element={
                <AdminOnlyRoute>
                  <AddStaff />
                </AdminOnlyRoute>
              }
            />
            <Route
              path="/staff/:id"
              element={
                <ModuleRoute action="read" module="staff">
                  <StaffView />
                </ModuleRoute>
              }
            />
            <Route
              path="/staff/:id/edit"
              element={
                <ModuleRoute action="write" module="staff">
                  <EditStaff />
                </ModuleRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ModuleRoute action="read" module="reports">
                  <Reports />
                </ModuleRoute>
              }
            />
            <Route
              path="/access-control"
              element={
                <AdminOnlyRoute>
                  <AccessControl />
                </AdminOnlyRoute>
              }
            />
            <Route
              path="/billing"
              element={<Navigate replace to="/financial-reports/billing/invoices" />}
            />
            <Route
              path="/salary"
              element={<Navigate replace to="/financial-reports/salary" />}
            />
            <Route
              path="/financial-reports"
              element={
                <FinancialReportsRoute>
                  <FinancialLayout />
                </FinancialReportsRoute>
              }
            >
              <Route index element={<FinancialIndexRedirect />} />
              <Route
                path="billing"
                element={<Navigate replace to="/financial-reports/billing/invoices" />}
              />
              <Route path="billing/invoices" element={<InvoiceList />} />
              <Route path="billing/invoices/:id" element={<InvoiceDetail />} />
              <Route path="billing/payments" element={<PaymentRecords />} />
              <Route path="billing/history" element={<InvoiceHistory />} />
              <Route path="salary" element={<SalaryOverview />} />
              <Route path="salary/config" element={<SalaryConfig />} />
              <Route path="salary/history" element={<SalaryHistory />} />
              <Route path="reports" element={<FinancialReportsPlaceholder />} />
              <Route path="expenses" element={<FinancialReports />} />
              <Route path="expenses/add" element={<ExpenseFormPage mode="add" />} />
              <Route path="expenses/:id/edit" element={<ExpenseFormPage mode="edit" />} />
            </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
