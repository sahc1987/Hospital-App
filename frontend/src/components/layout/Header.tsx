import { useState } from 'react'
import { Search, Bell, Settings, Command } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

const routeTitles: Record<string, { title: string; subtitle: string }> = {
  '/':            { title: 'Dashboard',          subtitle: 'Overview of hospital operations' },
  '/patients':    { title: 'Patients',           subtitle: 'Manage patient records' },
  '/appointments':{ title: 'Appointments',       subtitle: 'Schedule and manage appointments' },
  '/doctors':     { title: 'Doctors',            subtitle: 'Medical staff directory' },
  '/departments': { title: 'Departments',        subtitle: 'Hospital departments' },
  '/admissions':  { title: 'Admissions',         subtitle: 'OPD & IPD management' },
  '/rooms':       { title: 'Rooms',              subtitle: 'Room availability & assignments' },
  '/lab':         { title: 'Laboratory',         subtitle: 'Test orders and results' },
  '/pharmacy':    { title: 'Pharmacy',           subtitle: 'Medication & inventory' },
  '/billing':     { title: 'Billing',            subtitle: 'Bills and insurance claims' },
  '/employees':   { title: 'Employees',          subtitle: 'HR management' },
  '/payroll':     { title: 'Payroll',            subtitle: 'Salary and compensation' },
  '/reports':     { title: 'Reports & Analytics', subtitle: 'Hospital statistics and insights' },
}

export default function Header() {
  const location = useLocation()
  const { user } = useAuthStore()
  const [query, setQuery] = useState('')
  const page = routeTitles[location.pathname] ?? { title: 'HMS', subtitle: '' }

  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-4 gap-4">
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
        {/* Notifications */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface hover:bg-surface-card transition">
          <Bell size={16} className="text-ink-muted" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-surface" />
        </button>

        {/* Settings */}
        <button className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface hover:bg-surface-card transition">
          <Settings size={16} className="text-ink-muted" />
        </button>

        {/* Avatar */}
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm cursor-pointer">
          {user?.fullName?.charAt(0) ?? 'A'}
        </div>
      </div>
    </header>
  )
}
