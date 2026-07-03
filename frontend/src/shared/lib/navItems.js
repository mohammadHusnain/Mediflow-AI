/* src/shared/lib/navItems.js - Computes permission-aware sidebar navigation. */
import {
  BarChart2,
  BarChart3,
  Briefcase,
  CalendarClock,
  LayoutDashboard,
  Receipt,
  ShieldCheck,
  Stethoscope,
  TrendingDown,
  UserCircle,
  Users,
  Wallet,
} from 'lucide-react'

export function getNavItems({ canRead, isAdmin, role, user }) {
  if (!role) {
    return []
  }

  const isDoctor = role.slug === 'doctor'
  const dashboardPath = isDoctor ? '/dashboard/doctor' : '/dashboard/general'
  const dashboardLabel = isDoctor ? 'My Dashboard' : 'Dashboard'
  const doctorId = user?.id ?? user?.doctor_id
  const doctorProfilePath = doctorId ? `/doctors/${doctorId}` : null

  const items = [
    {
      end: true,
      icon: LayoutDashboard,
      label: dashboardLabel,
      matchPaths: ['/dashboard/general', '/dashboard/admin', '/dashboard/doctor'],
      to: dashboardPath,
    },
  ]

  if (canRead('appointments')) {
    items.push({
      icon: CalendarClock,
      label: isDoctor ? 'My Appointments' : 'Appointments',
      to: '/appointments',
    })
  }

  if (canRead('patients')) {
    items.push({
      icon: Users,
      label: isDoctor ? 'My Patients' : 'Patients',
      to: '/patients',
    })
  }

  if (canRead('financial_reports') || isDoctor) {
    const financeChildren = isDoctor
      ? [
          {
            icon: Wallet,
            label: 'Salary',
            matchPaths: ['/financial-reports/salary'],
            to: '/financial-reports/salary',
          },
        ]
      : [
          {
            icon: Receipt,
            label: 'Billing',
            matchPaths: ['/financial-reports/billing'],
            to: '/financial-reports/billing/invoices',
          },
          {
            icon: Wallet,
            label: 'Salary',
            matchPaths: ['/financial-reports/salary'],
            to: '/financial-reports/salary',
          },
          {
            icon: BarChart2,
            label: 'Financial Reports',
            matchPaths: ['/financial-reports/reports'],
            to: '/financial-reports/reports',
          },
          {
            icon: TrendingDown,
            label: 'Expenses',
            matchPaths: ['/financial-reports/expenses'],
            to: '/financial-reports/expenses',
          },
        ]

    items.push({
      children: financeChildren,
      icon: BarChart3,
      label: 'Finances',
      matchPaths: ['/financial-reports'],
      to: '/financial-reports',
    })
  }

  if (canRead('doctors')) {
    items.push({ icon: Stethoscope, label: 'Doctors', to: '/doctors' })
  } else if (isDoctor && doctorProfilePath) {
    items.push({
      icon: UserCircle,
      label: 'My Profile',
      to: doctorProfilePath,
    })
  }

  if (canRead('staff')) {
    items.push({ icon: Briefcase, label: 'Staff', to: '/staff' })
  }

  if (canRead('reports')) {
    items.push({ icon: BarChart2, label: 'Reports', to: '/reports' })
  }

  if (isAdmin) {
    items.push({
      icon: ShieldCheck,
      label: 'Access Control',
      to: '/access-control',
    })
  }

  return items
}
