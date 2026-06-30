import { useQuery } from '@tanstack/react-query'
import {
  Users, CalendarDays, BedDouble, FlaskConical, DollarSign,
  Pill, UserCog, TrendingUp, Clock
} from 'lucide-react'
import { dashboardApi, appointmentApi } from '@/api/endpoints'
import { StatCard } from '@/components/ui/StatCard'
import { StatusBadge } from '@/components/ui/Badge'
import { format } from 'date-fns'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'

const mockRevenue = [
  { month: 'Jan', revenue: 42000 },
  { month: 'Feb', revenue: 55000 },
  { month: 'Mar', revenue: 48000 },
  { month: 'Apr', revenue: 63000 },
  { month: 'May', revenue: 58000 },
  { month: 'Jun', revenue: 71000 },
]

export default function Dashboard() {
  const { data: statsRes, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.stats(),
    refetchInterval: 60_000,
  })

  const { data: todayRes } = useQuery({
    queryKey: ['today-appointments'],
    queryFn: () => appointmentApi.today(),
  })

  const stats = statsRes?.data?.data
  const todayAppts = todayRes?.data?.data ?? []

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Top stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          dark
          title="Total Patients"
          value={isLoading ? '—' : stats?.totalPatients.toLocaleString() ?? '—'}
          icon={<Users size={18} className="text-white" />}
          trend={3.1}
        />
        <StatCard
          title="Today's Appointments"
          value={isLoading ? '—' : stats?.todayAppointments ?? '—'}
          icon={<CalendarDays size={18} />}
          accent
        />
        <StatCard
          dark
          title="Current Admissions"
          value={isLoading ? '—' : stats?.currentAdmissions ?? '—'}
          icon={<BedDouble size={18} className="text-white" />}
        />
        <StatCard
          title="Monthly Revenue"
          value={isLoading ? '—' : `$${((stats?.monthlyRevenue ?? 0) / 1000).toFixed(1)}k`}
          icon={<DollarSign size={18} />}
          trend={5.4}
          accent
        />
      </div>

      {/* Second stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Available Rooms"   value={stats?.availableRooms ?? '—'}    icon={<BedDouble size={18} />} />
        <StatCard title="Pending Lab Tests" value={stats?.pendingLabTests ?? '—'}   icon={<FlaskConical size={18} />} />
        <StatCard title="Low Stock Items"   value={stats?.lowStockItems ?? '—'}     icon={<Pill size={18} />} />
        <StatCard title="Total Employees"   value={stats?.totalEmployees ?? '—'}    icon={<UserCog size={18} />} />
      </div>

      {/* Charts + Today's schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-ink">Revenue Overview</h3>
              <p className="text-xs text-ink-muted mt-0.5">Monthly hospital revenue</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-success font-medium">
              <TrendingUp size={13} />
              <span>+18.3% vs last year</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={mockRevenue}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#F45D22" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#F45D22" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#71717A' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#71717A' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip
                contentStyle={{ border: 'none', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }}
                formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#F45D22" strokeWidth={2}
                fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: '#F45D22' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quick stats dark card */}
        <div className="card-dark space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Key Metrics</h3>
            <span className="text-xs text-zinc-500">Today</span>
          </div>

          {[
            { label: 'Doctors on duty',    value: stats?.totalDoctors ?? 0,     color: 'bg-primary' },
            { label: 'Pending bills',       value: stats?.pendingBills ?? 0,     color: 'bg-warning' },
            { label: 'Occupied rooms',      value: (stats?.totalPatients ?? 0) - (stats?.availableRooms ?? 0), color: 'bg-danger' },
            { label: 'Lab tests in progress', value: stats?.pendingLabTests ?? 0, color: 'bg-info' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`h-2 w-2 rounded-full ${item.color}`} />
                <span className="text-sm text-zinc-400">{item.label}</span>
              </div>
              <span className="text-sm font-semibold text-white">{item.value}</span>
            </div>
          ))}

          <div className="border-t border-border-dark pt-4 mt-4">
            <p className="text-xs text-zinc-500 mb-2">Staff Overview</p>
            <div className="flex items-center gap-1.5">
              <div className="h-2 flex-1 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: '68%' }} />
              </div>
              <span className="text-xs text-zinc-400 shrink-0">68% capacity</span>
            </div>
          </div>
        </div>
      </div>

      {/* Today's appointments */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-ink">Today's Schedule</h3>
            <p className="text-xs text-ink-muted mt-0.5">{format(new Date(), 'EEEE, MMMM d yyyy')}</p>
          </div>
          <span className="badge bg-primary/10 text-primary">{todayAppts.length} appointments</span>
        </div>

        {todayAppts.length === 0 ? (
          <div className="py-10 text-center text-ink-muted text-sm">
            <Clock size={32} className="mx-auto mb-2 opacity-30" />
            No appointments scheduled for today.
          </div>
        ) : (
          <div className="space-y-2">
            {todayAppts.slice(0, 8).map((apt) => (
              <div
                key={apt.id}
                className="flex items-center gap-4 rounded-xl border border-border px-4 py-3 hover:bg-surface-card transition-colors"
              >
                <div className="h-9 w-9 flex items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">
                  {apt.patient?.name?.charAt(0) ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{apt.patient?.name ?? '—'}</p>
                  <p className="text-xs text-ink-muted">Dr. {apt.doctor?.name ?? '—'}</p>
                </div>
                <p className="text-xs text-ink-muted shrink-0">
                  {format(new Date(apt.appointmentDate), 'h:mm a')}
                </p>
                <StatusBadge status={apt.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
