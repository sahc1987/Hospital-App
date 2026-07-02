import { useState, useRef, useEffect } from 'react'
import { Search, Bell, Settings, Command, CheckCheck, Trash2, Info, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useNotificationsStore } from '@/store/notificationsStore'
import type { AppNotification } from '@/store/notificationsStore'
import { cn } from '@/utils/cn'
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

  function openBell() {
    setBellOpen((v) => !v)
  }

  function handleNotifClick(n: AppNotification) {
    markRead(n.id)
  }

  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-4 gap-4 relative">
      {/* Page title */}
      <div>
        <h1 className="text-xl font-bold text-ink">{page.title}</h1>
        {page.subtitle && <p className="text-xs text-ink-muted mt-0.5">{page.subtitle}</p>}
      </div>

      {/* Search */}
      <div className="relative flex-1 max-w-sm">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          className="w-full rounded-full border border-border bg-surface-card pl-9 pr-4 py-2 text-sm text-ink placeholder:text-ink-subtle outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-ink-subtle">
          <Command size={10} />
          <span className="text-[10px]">K</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">

        {/* Notification bell */}
        <div ref={bellRef} className="relative">
          <button
            onClick={openBell}
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface hover:bg-surface-card transition"
            title="Notifications"
          >
            <Bell size={16} className="text-ink-muted" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white ring-2 ring-surface">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl border border-border bg-surface shadow-xl overflow-hidden">
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
        <button
          onClick={() => navigate('/profile')}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface hover:bg-surface-card transition"
          title="Account settings"
        >
          <Settings size={16} className="text-ink-muted" />
        </button>

        {/* Avatar → profile */}
        <button
          onClick={() => navigate('/profile')}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm hover:bg-primary/20 transition"
          title="My profile"
        >
          {user?.fullName?.charAt(0) ?? 'A'}
        </button>

      </div>
    </header>
  )
}
