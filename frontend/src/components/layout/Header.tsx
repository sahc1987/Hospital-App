import { useState, useRef, useEffect } from 'react'
import { Search, Bell, Settings, CheckCheck, Trash2, Info, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useNotificationsStore } from '@/store/notificationsStore'
import type { AppNotification } from '@/store/notificationsStore'
import { cn } from '@/utils/cn'
import { canAccess } from '@/utils/permissions'
import type { UserRole } from '@/types'
import { formatDistanceToNow } from 'date-fns'

const routeTitles: Record<string, { title: string; subtitle: string }> = {
  '/':              { title: 'Dashboard',           subtitle: 'Overview of hospital operations' },
  '/patients':      { title: 'Patients',            subtitle: 'Manage patient records' },
  '/appointments':  { title: 'Appointments',        subtitle: 'Schedule and manage appointments' },
  '/doctors':       { title: 'Doctors',             subtitle: 'Medical staff directory' },
  '/departments':   { title: 'Departments',         subtitle: 'Hospital departments' },
  '/admissions':    { title: 'Admissions',          subtitle: 'OPD & IPD management' },
  '/rooms':         { title: 'Rooms',               subtitle: 'Room availability & assignments' },
  '/lab':           { title: 'Laboratory',          subtitle: 'Test orders and results' },
  '/pharmacy':      { title: 'Pharmacy',            subtitle: 'Medication & inventory' },
  '/billing':       { title: 'Billing',             subtitle: 'Bills and insurance claims' },
  '/employees':     { title: 'Employees',           subtitle: 'HR management' },
  '/payroll':       { title: 'Payroll',             subtitle: 'Salary and compensation' },
  '/reports':       { title: 'Reports & Analytics', subtitle: 'Hospital statistics and insights' },
  '/users':         { title: 'User Management',     subtitle: 'System accounts and roles' },
  '/access-matrix': { title: 'Access Matrix',       subtitle: 'Role-based access control' },
  '/profile':       { title: 'My Profile',          subtitle: 'Account information and security' },
}

const iconBtn =
  'relative flex h-11 w-11 items-center justify-center rounded-2xl bg-surface shadow-card hover:shadow-card-hover transition ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2'

function NotifIcon({ type }: { type: AppNotification['type'] }) {
  const cls = 'h-4 w-4 shrink-0'
  if (type === 'success') return <CheckCircle2 className={cn(cls, 'text-success')} />
  if (type === 'error')   return <XCircle      className={cn(cls, 'text-danger')} />
  if (type === 'warning') return <AlertTriangle className={cn(cls, 'text-warning')} />
  return <Info className={cn(cls, 'text-primary')} />
}

export default function Header() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { user }  = useAuthStore()
  const { items, markRead, markAllRead, clear } = useNotificationsStore()

  const [query, setQuery]       = useState('')
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  const page       = routeTitles[location.pathname] ?? { title: 'HMS', subtitle: '' }
  const unread     = items.filter((n) => !n.read).length

  // Close bell dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const canSearch = !!user && canAccess(user.role as UserRole, '/patients')

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    navigate(q ? `/patients?q=${encodeURIComponent(q)}` : '/patients')
  }

  function openBell() {
    setBellOpen((v) => !v)
  }

  function handleNotifClick(n: AppNotification) {
    markRead(n.id)
  }

  return (
    // Sits on the lavender canvas (no bar): floating search pill + square white icon buttons
    <header className="flex items-center justify-between px-6 pt-6 pb-2 gap-4 relative">
      {/* Page title */}
      <div>
        <h1 className="text-xl font-bold text-ink">{page.title}</h1>
        {page.subtitle && <p className="text-xs text-ink-muted mt-0.5">{page.subtitle}</p>}
      </div>

      {/* Search */}
      {/* Searches patients (name / phone / email) on the Patients page. Hidden for roles without it. */}
      {canSearch ? (
        <form role="search" onSubmit={submitSearch} className="relative flex-1 max-w-md">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search patients by name, phone or email…"
            aria-label="Search patients"
            className="w-full rounded-2xl bg-surface pl-5 pr-12 py-3 text-sm text-ink shadow-card placeholder:text-ink-muted outline-none focus:ring-2 focus:ring-primary/30 transition"
          />
          <button
            type="submit"
            aria-label="Search"
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-xl text-primary hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <Search size={16} aria-hidden="true" />
          </button>
        </form>
      ) : <div className="flex-1" />}

      {/* Actions */}
      <div className="flex items-center gap-2">

        {/* Notification bell */}
        <div ref={bellRef} className="relative">
          <button
            onClick={openBell}
            className={iconBtn}
            aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
            aria-expanded={bellOpen}
          >
            <Bell size={17} className="text-primary" aria-hidden="true" />
            {unread > 0 && (
              <span aria-hidden="true" className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-danger-ink text-[9px] font-bold text-white ring-2 ring-surface">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 top-14 z-50 w-80 rounded-card bg-surface shadow-card-hover overflow-hidden">
              {/* Bell header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div>
                  <p className="text-sm font-semibold text-ink">Notifications</p>
                  {unread > 0 && (
                    <p className="text-[11px] text-ink-subtle">{unread} unread</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unread > 0 && (
                    <button
                      onClick={markAllRead}
                      title="Mark all as read"
                      className="rounded-lg p-1.5 text-ink-subtle hover:bg-surface-alt hover:text-ink transition-colors"
                    >
                      <CheckCheck size={14} />
                    </button>
                  )}
                  {items.length > 0 && (
                    <button
                      onClick={clear}
                      title="Clear all"
                      className="rounded-lg p-1.5 text-ink-subtle hover:bg-danger/10 hover:text-danger transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Notification list */}
              <div className="max-h-80 overflow-y-auto">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-ink-subtle">
                    <Bell size={24} className="mb-2 opacity-30" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  items.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      className={cn(
                        'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-alt border-b border-border last:border-0',
                        !n.read && 'bg-primary/5',
                      )}
                    >
                      <NotifIcon type={n.type} />
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm truncate', n.read ? 'text-ink-subtle' : 'text-ink font-medium')}>
                          {n.title}
                        </p>
                        {n.message && (
                          <p className="text-xs text-ink-subtle truncate mt-0.5">{n.message}</p>
                        )}
                        <p className="text-[10px] text-ink-subtle mt-1">
                          {formatDistanceToNow(n.timestamp, { addSuffix: true })}
                        </p>
                      </div>
                      {!n.read && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Settings → profile */}
        <button onClick={() => navigate('/profile')} className={iconBtn} aria-label="Account settings">
          <Settings size={17} className="text-primary" aria-hidden="true" />
        </button>

        {/* Avatar → profile */}
        <button
          onClick={() => navigate('/profile')}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white font-semibold text-sm shadow-primary hover:bg-primary-600 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
          aria-label="My profile"
        >
          {user?.fullName?.charAt(0) ?? 'A'}
        </button>

      </div>
    </header>
  )
}
