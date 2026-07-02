import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, CalendarDays, Stethoscope, Building2,
  BedDouble, FlaskConical, Pill, DollarSign, UserCog, BarChart3,
  LogOut, ChevronRight, HeartPulse, Shield, KeyRound, ShieldCheck
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useAuthStore } from '@/store/authStore'
import { canAccess } from '@/utils/permissions'
import type { UserRole } from '@/types'
import toast from 'react-hot-toast'

const navGroups = [
  {
    label: 'Overview',
    items: [
      { to: '/',        icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/reports', icon: BarChart3,        label: 'Reports & Analytics' },
    ],
  },
  {
    label: 'Clinical',
    items: [
      { to: '/patients',     icon: Users,        label: 'Patients' },
      { to: '/appointments', icon: CalendarDays, label: 'Appointments' },
      { to: '/admissions',   icon: BedDouble,    label: 'OPD / IPD' },
      { to: '/doctors',      icon: Stethoscope,  label: 'Doctors' },
      { to: '/departments',  icon: Building2,    label: 'Departments' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/lab',      icon: FlaskConical, label: 'Laboratory' },
      { to: '/pharmacy', icon: Pill,         label: 'Pharmacy' },
      { to: '/rooms',    icon: BedDouble,    label: 'Rooms' },
      { to: '/billing',  icon: DollarSign,   label: 'Billing & Insurance' },
    ],
  },
  {
    label: 'HR',
    items: [
      { to: '/employees', icon: UserCog,   label: 'Employees' },
      { to: '/payroll',   icon: DollarSign, label: 'Payroll' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/users',         icon: KeyRound,    label: 'User Management' },
      { to: '/access-matrix', icon: ShieldCheck, label: 'Access Matrix' },
    ],
  },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const role = user?.role as UserRole | undefined

  function handleLogout() {
    logout()
    toast.success('Logged out')
    navigate('/login')
  }

  return (
    <aside className="flex h-screen w-64 flex-col bg-surface-dark text-white overflow-hidden flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border-dark">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
          <HeartPulse size={20} className="text-white" />
        </div>
        <div>
          <p className="font-bold text-sm leading-none">HMS</p>
          <p className="text-[11px] text-ink-subtle mt-0.5">Hospital System</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navGroups.map((group) => {
          const visibleItems = role
            ? group.items.filter((item) => canAccess(role, item.to))
            : []
          if (visibleItems.length === 0) return null
          return (
            <div key={group.label}>
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-subtle">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {visibleItems.map(({ to, icon: Icon, label }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={to === '/'}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                          isActive
                            ? 'bg-primary/15 text-primary'
                            : 'text-zinc-400 hover:bg-white/5 hover:text-white',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon size={16} className={isActive ? 'text-primary' : ''} />
                          <span className="flex-1">{label}</span>
                          {isActive && <ChevronRight size={14} className="text-primary" />}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-border-dark p-3">
        <div className="flex items-center gap-3 rounded-xl p-3 hover:bg-white/5 transition-all group">
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-3 flex-1 min-w-0 text-left"
            title="My profile"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary font-semibold text-sm">
              {user?.fullName?.charAt(0) ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.fullName ?? user?.username}</p>
              <p className="text-[11px] text-zinc-500 capitalize">{user?.role?.toLowerCase().replace('_', ' ')}</p>
            </div>
          </button>
          <button
            onClick={handleLogout}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-danger shrink-0"
            title="Logout"
          >
            <LogOut size={15} />
          </button>
        </div>

        <div className="mt-1 flex items-center gap-1.5 px-3">
          <Shield size={11} className="text-zinc-600" />
          <span className="text-[10px] text-zinc-600">HIPAA / GDPR Ready</span>
        </div>
      </div>
    </aside>
  )
}
