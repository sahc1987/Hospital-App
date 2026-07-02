import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { canAccess } from '@/utils/permissions'
import type { UserRole } from '@/types'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Login from '@/pages/auth/Login'
import Dashboard from '@/pages/Dashboard'
import Patients from '@/pages/Patients'
import Appointments from '@/pages/Appointments'
import Doctors from '@/pages/Doctors'
import Departments from '@/pages/Departments'
import Admissions from '@/pages/Admissions'
import Rooms from '@/pages/Rooms'
import Lab from '@/pages/Lab'
import Pharmacy from '@/pages/Pharmacy'
import Billing from '@/pages/Billing'
import Employees from '@/pages/Employees'
import Payroll from '@/pages/Payroll'
import Reports from '@/pages/Reports'
import Users from '@/pages/Users'
import AccessMatrix from '@/pages/AccessMatrix'
import Profile from '@/pages/Profile'

function ProtectedRoute({ children }: Readonly<{ children: React.ReactNode }>) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function RoleRoute({ path, children }: Readonly<{ path: string; children: React.ReactNode }>) {
  const role = useAuthStore((s) => s.user?.role) as UserRole | undefined
  if (!role) return <Navigate to="/login" replace />
  if (!canAccess(role, path)) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />

        <Route path="patients"     element={<RoleRoute path="/patients"><Patients /></RoleRoute>} />
        <Route path="appointments" element={<RoleRoute path="/appointments"><Appointments /></RoleRoute>} />
        <Route path="doctors"      element={<RoleRoute path="/doctors"><Doctors /></RoleRoute>} />
        <Route path="departments"  element={<RoleRoute path="/departments"><Departments /></RoleRoute>} />
        <Route path="admissions"   element={<RoleRoute path="/admissions"><Admissions /></RoleRoute>} />
        <Route path="rooms"        element={<RoleRoute path="/rooms"><Rooms /></RoleRoute>} />
        <Route path="lab"          element={<RoleRoute path="/lab"><Lab /></RoleRoute>} />
        <Route path="pharmacy"     element={<RoleRoute path="/pharmacy"><Pharmacy /></RoleRoute>} />
        <Route path="billing"      element={<RoleRoute path="/billing"><Billing /></RoleRoute>} />
        <Route path="employees"    element={<RoleRoute path="/employees"><Employees /></RoleRoute>} />
        <Route path="payroll"      element={<RoleRoute path="/payroll"><Payroll /></RoleRoute>} />
        <Route path="reports"      element={<RoleRoute path="/reports"><Reports /></RoleRoute>} />
        <Route path="users"          element={<RoleRoute path="/users"><Users /></RoleRoute>} />
        <Route path="access-matrix" element={<RoleRoute path="/access-matrix"><AccessMatrix /></RoleRoute>} />
        {/* Profile is accessible to every authenticated user — no role restriction */}
        <Route path="profile" element={<Profile />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
