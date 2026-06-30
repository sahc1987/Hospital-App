import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
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
        <Route index            element={<Dashboard />} />
        <Route path="patients"      element={<Patients />} />
        <Route path="appointments"  element={<Appointments />} />
        <Route path="doctors"       element={<Doctors />} />
        <Route path="departments"   element={<Departments />} />
        <Route path="admissions"    element={<Admissions />} />
        <Route path="rooms"         element={<Rooms />} />
        <Route path="lab"           element={<Lab />} />
        <Route path="pharmacy"      element={<Pharmacy />} />
        <Route path="billing"       element={<Billing />} />
        <Route path="employees"     element={<Employees />} />
        <Route path="payroll"       element={<Payroll />} />
        <Route path="reports"       element={<Reports />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
