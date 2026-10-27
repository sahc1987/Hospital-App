import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, CalendarDays, Stethoscope, Building2,
  BedDouble, FlaskConical, Pill, DollarSign, UserCog, BarChart3,
  LogOut, HeartPulse, KeyRound, ShieldCheck, PanelLeftOpen, PanelLeftClose, X,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/endpoints'
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

const STORAGE_KEY = 'hms-sidebar-expanded'

function readExpanded(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === '1' } catch { return false }
}

type Tip = { label: string; top: number; left: number }

type RailButtonProps = Readonly<{ wide: boolean; onClick: () => void; icon: typeof X; label: string; expanded?: boolean }>

function RailButton({ wide, onClick, icon: Icon, label, expanded }: RailButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      aria-controls={expanded === undefined ? undefined : 'sidebar-nav'}
      className={cn(
        'mb-2 flex items-center gap-3 rounded-xl text-xs font-medium hover:bg-white/10 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
        wide ? 'mx-3 px-3 py-2' : 'mx-auto h-9 w-9 justify-center',
      )}
    >
      <Icon size={16} aria-hidden="true" />
      <span className={wide ? '' : 'sr-only'}>{label}</span>
    </button>
  )
}

/** `mobile`: rendered inside the phone drawer: always shows labels, and any navigation closes it. */
export default function Sidebar({ mobile = false, onClose }: Readonly<{ mobile?: boolean; onClose?: () => void }>) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const role = user?.role as UserRole | undefined
  const [expanded, setExpanded] = useState(readExpanded)
  const wide = mobile || expanded

  // One shared tooltip for the collapsed rail. position:fixed escapes the nav's overflow clipping.
  // WCAG 1.4.13: hoverable (no gap: padding sits inside the tip), dismissible (Escape), persistent.
  const [tip, setTip] = useState<Tip | null>(null)
  const hideTimer = useRef<number>()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setTip(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function toggle() {
    setExpanded((v) => {
      try { localStorage.setItem(STORAGE_KEY, v ? '0' : '1') } catch { /* storage blocked: session-only */ }
      return !v
    })
    setTip(null)
  }

  function showTip(label: string, el: HTMLElement) {
    if (wide) return
    window.clearTimeout(hideTimer.current)
    const r = el.getBoundingClientRect()
    setTip({ label, top: r.top + r.height / 2, left: r.right })
  }
  const hideTipSoon = () => { hideTimer.current = window.setTimeout(() => setTip(null), 120) }

  function handleLogout() {
    // Fire-and-forget: revoke tokens server-side, but never block leaving on it
    authApi.logout().catch(() => {})
    logout()
    toast.success('Logged out')
    navigate('/login')
  }

  const visibleGroups = navGroups
    .map((g) => ({ ...g, items: role ? g.items.filter((i) => canAccess(role, i.to)) : [] }))
    .filter((g) => g.items.length > 0)

  // Rail is primary-600 (not 500) so white text clears 4.5:1 at small sizes
  return (
    <aside
      className={cn(
        'flex flex-col rounded-[1.75rem] bg-primary-600 text-white shadow-primary flex-shrink-0',
        'motion-safe:transition-[width] motion-safe:duration-300',
        mobile ? 'm-3 w-64' : 'm-4 mr-0',
        !mobile && (expanded ? 'w-64' : 'w-[5.25rem]'),
      )}
    >
      {/* Brand */}
      <div className={cn('flex items-center gap-3 pt-6 pb-4', wide ? 'px-5' : 'justify-center')}>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15">
          <HeartPulse size={22} aria-hidden="true" />
        </div>
        {wide && (
          <div className="leading-tight">
            <p className="text-lg font-bold">HMS</p>
            <p className="text-[11px] text-white/85">Hospital System</p>
          </div>
        )}
      </div>

      {mobile
        ? <RailButton wide onClick={() => onClose?.()} icon={X} label="Close menu" />
        : <RailButton wide={expanded} onClick={toggle} icon={expanded ? PanelLeftClose : PanelLeftOpen}
            label={expanded ? 'Collapse menu' : 'Expand menu'} expanded={expanded} />}

      <nav id="sidebar-nav" aria-label="Main" className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4">
        {visibleGroups.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? 'mt-3' : ''}>
            {wide ? (
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/85">
                {group.label}
              </p>
            ) : (
              gi > 0 && <div className="mx-4 mb-3 h-px bg-white/20" aria-hidden="true" />
            )}
            <ul className="space-y-1" aria-label={wide ? undefined : group.label}>
              {group.items.map(({ to, icon: Icon, label }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={to === '/'}
                    onPointerEnter={(e) => showTip(label, e.currentTarget)}
                    onPointerLeave={hideTipSoon}
                    onFocus={(e) => showTip(label, e.currentTarget)}
                    onBlur={() => setTip(null)}
                    className={({ isActive }) => cn(
                      'flex items-center gap-3 rounded-xl text-sm font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
                      wide ? 'px-3 py-2.5' : 'mx-auto h-11 w-11 justify-center',
                      isActive ? 'bg-white text-primary-700 shadow-sm' : 'text-white hover:bg-white/10',
                    )}
                  >
                    <Icon size={18} aria-hidden="true" />
                    {/* Always in the a11y tree; visually shown only when expanded */}
                    <span className={wide ? 'flex-1 truncate' : 'sr-only'}>{label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer: profile + logout (always visible — it used to be hover-only) */}
      <div className={cn('flex gap-2 border-t border-white/15 p-3', wide ? 'items-center' : 'flex-col items-center')}>
        <button
          onClick={() => navigate('/profile')}
          className={cn(
            'flex min-w-0 items-center gap-3 rounded-xl p-1.5 hover:bg-white/10 transition-colors text-left',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
            wide && 'flex-1',
          )}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-primary-700 font-semibold text-sm" aria-hidden="true">
            {user?.fullName?.charAt(0) ?? 'U'}
          </span>
          <span className={wide ? 'min-w-0' : 'sr-only'}>
            <span className="block text-sm font-medium truncate">{user?.fullName ?? user?.username}</span>
            <span className="block text-[11px] text-white/85 capitalize">{user?.role?.toLowerCase().replace('_', ' ')}</span>
            <span className="sr-only">, open profile</span>
          </span>
        </button>
        <button
          onClick={handleLogout}
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl hover:bg-white/10 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
          )}
        >
          <LogOut size={17} aria-hidden="true" />
          <span className="sr-only">Log out</span>
        </button>
      </div>

      {tip && !wide && (
        // aria-hidden: duplicates the link's own (sr-only) label
        <div
          aria-hidden="true"
          onPointerEnter={() => window.clearTimeout(hideTimer.current)}
          onPointerLeave={() => setTip(null)}
          style={{ top: tip.top, left: tip.left }}
          className="fixed z-50 -translate-y-1/2 pl-3"
        >
          <div className="rounded-lg bg-surface-dark px-3 py-1.5 text-xs font-medium text-white shadow-card whitespace-nowrap">
            {tip.label}
          </div>
        </div>
      )}
    </aside>
  )
}
