import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarDays, Clock, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { format, parseISO } from 'date-fns'
import { dashboardApi, appointmentApi, authApi, labApi, pharmacyApi, billingApi, payrollApi } from '@/api/endpoints'
import { useAuthStore } from '@/store/authStore'
import { canAccess } from '@/utils/permissions'
import { cn } from '@/utils/cn'
import { withDr } from '@/utils/names'
import type { Appointment, DashboardStats, UserRole } from '@/types'

// Recharts needs literal colors; these mirror tailwind tokens coral / mint / primary / pink.
const HEX = { coral: '#F26D6D', mint: '#1FA98F', primary: '#4C6FDB', pink: '#E86BC4' }

const reduceMotion = typeof window !== 'undefined'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const cardTitle = 'text-xs font-semibold uppercase tracking-wider text-ink-muted'

/** Today vs. the average of the previous days, in %; null when there's no baseline. */
function trendPct(series: number[]): number | null {
  if (series.length < 2) return null
  const prev = series.slice(0, -1)
  const avg = prev.reduce((a, b) => a + b, 0) / prev.length
  if (avg === 0) return null
  return Math.round(((series[series.length - 1] - avg) / avg) * 100)
}

function greeting(d = new Date()) {
  const h = d.getHours()
  if (h < 12) return 'Good morning'
  return h < 18 ? 'Good afternoon' : 'Good evening'
}

const signed = (n: number) => (n > 0 ? '+' : '') + n

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const user = useAuthStore((s) => s.user)
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => (await dashboardApi.stats()).data.data,
    refetchInterval: 60_000,
  })
  const { data: trends } = useQuery({
    queryKey: ['dashboard-trends'],
    queryFn: async () => (await dashboardApi.trends()).data.data,
    refetchInterval: 60_000,
  })
  const { data: today = [] } = useQuery({
    queryKey: ['today-appointments'],
    queryFn: async () => (await appointmentApi.today()).data.data,
  })
  // Lab, pharmacy and HR can't open Appointments, so its two cards would be noise for them
  const seesAppointments = !!user?.role && canAccess(user.role as UserRole, '/appointments')

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 motion-safe:animate-slide-up">
      <div className="space-y-6 xl:col-span-8">
        <WelcomeBanner name={user?.fullName ?? user?.username ?? ''} />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <TrendTile
            title="Admissions" tint="coral" to="/admissions"
            value={stats?.currentAdmissions} caption="patients admitted now"
            series={trends?.admissions} seriesLabel="new admissions"
          />
          <TrendTile
            title="Appointments" tint="mint" to="/appointments"
            value={stats?.todayAppointments} caption="scheduled today"
            series={trends?.appointments} seriesLabel="appointments"
          />
          <TrendTile
            title="Laboratory" tint="primary" to="/lab"
            value={stats?.pendingLabTests} caption="tests pending"
            series={trends?.labTests} seriesLabel="tests ordered"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <OccupancyCard
            occupied={stats?.occupiedRooms} available={stats?.availableRooms} total={stats?.totalRooms}
          />
          {seesAppointments && <AppointmentProgress appointments={today} />}
        </div>
      </div>

      <div className="space-y-6 xl:col-span-4">
        <NeedsAttention stats={stats} appointments={today} />
        {seesAppointments && <TodaySchedule appointments={today} />}
      </div>
    </div>
  )
}

// ─── Widgets ─────────────────────────────────────────────────────────────────

/** One line: the work below it gets the space (this page stays open all shift). */
function WelcomeBanner({ name }: { readonly name: string }) {
  const now = new Date()
  return (
    <section className="card-dark flex flex-wrap items-center justify-between gap-3 px-6 py-4" aria-labelledby="welcome-title">
      {/* h2: the Header already renders the page's h1 */}
      <h2 id="welcome-title" className="text-lg font-bold">
        {greeting(now)}{name ? `, ${name}` : ''}
      </h2>
      <p className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium">
        <CalendarDays size={14} aria-hidden="true" />
        <time dateTime={now.toISOString()}>{format(now, 'EEEE, MMM d, yyyy')}</time>
      </p>
    </section>
  )
}

/** Recharts clones this per point with cx/cy/index; only the last point gets a dot. */
function EndDot({ cx, cy, index, last, fill }: Readonly<{ cx?: number; cy?: number; index?: number; last: number; fill: string }>) {
  return index === last ? <circle cx={cx} cy={cy} r={3.5} fill={fill} /> : <g />
}

// The tint only tells the tiles apart; it says nothing about good or bad (the trend pill is neutral)
const tints = {
  coral:   { box: 'bg-coral-light',  hex: HEX.coral },
  mint:    { box: 'bg-mint-light',   hex: HEX.mint },
  primary: { box: 'bg-primary-50',   hex: HEX.primary },
} as const

/** Direction arrow + %: more admissions isn't "bad" and more appointments isn't "good", so no red/green. */
function TrendPill({ pct }: { readonly pct: number | null }) {
  const base = 'mt-2 inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-surface-alt px-2 py-0.5 text-[11px] font-medium text-ink-muted'
  if (pct === null) return <p className={base}>No baseline yet</p>
  let Icon = Minus
  if (pct > 0) Icon = ArrowUpRight
  else if (pct < 0) Icon = ArrowDownRight
  return (
    <p className={base} title="Today compared with the average of the previous 6 days">
      <Icon size={12} aria-hidden="true" />
      {signed(pct)}% vs 6-day avg
    </p>
  )
}

function TrendTile({ title, tint, to, value, caption, series, seriesLabel }: {
  readonly title: string
  readonly tint: keyof typeof tints
  /** Drill-down route: the whole tile links there; roles that can't open it don't get the tile. */
  readonly to: string
  readonly value?: number
  readonly caption: string
  readonly series?: number[]
  readonly seriesLabel: string
}) {
  const role = useAuthStore((s) => s.user?.role) as UserRole | undefined
  const t = tints[tint]
  const pct = series ? trendPct(series) : null
  const data = (series ?? []).map((v, i) => ({ i, v }))
  const last = data.length - 1
  if (!role || !canAccess(role, to)) return null // a number the role can't act on is noise

  return (
    <section
      className="card relative flex items-center gap-4 p-5 transition-shadow hover:shadow-card-hover focus-within:ring-2 focus-within:ring-primary/50"
      aria-label={title}
    >
      <div className={cn('h-20 w-20 shrink-0 rounded-xl px-1.5 py-3', t.box)}>
        <div className="h-full w-full" aria-hidden="true">
          {data.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <Line
                  type="monotone" dataKey="v" stroke={t.hex} strokeWidth={2} isAnimationActive={!reduceMotion}
                  dot={<EndDot last={last} fill={t.hex} />}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        {series && (
          <p className="sr-only">{seriesLabel} per day, last 7 days: {series.join(', ')}</p>
        )}
      </div>
      <div className="min-w-0">
        <h2 className={cardTitle}>
          {/* Stretched link: the ::after covers the whole card, so the tile is one big target */}
          <Link to={to} className="after:absolute after:inset-0 after:rounded-card focus-visible:outline-none">
            {title}<span className="sr-only">, open {title.toLowerCase()}</span>
          </Link>
        </h2>
        <p className="mt-1 text-2xl font-bold text-ink">{value ?? '—'}</p>
        <p className="text-xs text-ink-muted">{caption}</p>
        <TrendPill pct={pct} />
      </div>
    </section>
  )
}

function OccupancyCard({ occupied, available, total }: {
  readonly occupied?: number; readonly available?: number; readonly total?: number
}) {
  const pct = total ? Math.round(((occupied ?? 0) / total) * 100) : 0
  const maintenance = total != null ? total - (occupied ?? 0) - (available ?? 0) : undefined
  const rows = [
    { label: 'Occupied',    value: occupied },
    { label: 'Available',   value: available },
    { label: 'Maintenance', value: maintenance },
  ]
  return (
    <section className="card" aria-labelledby="occupancy-title">
      <h2 id="occupancy-title" className={cardTitle}>Room occupancy</h2>
      <div className="mt-5 flex flex-wrap items-center justify-around gap-6">
        <div className="relative grid place-items-center">
          <progress
            className="ring" max={100} value={pct} aria-labelledby="occupancy-title"
            style={{ '--value': pct } as React.CSSProperties}
          />
          <div className="absolute text-center" aria-hidden="true">
            <p className="text-3xl font-bold text-ink">{total ? `${pct}%` : '—'}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Occupied</p>
          </div>
        </div>
        <dl className="space-y-3 rounded-2xl bg-surface-alt px-5 py-4">
          {rows.map((r) => (
            // dt must precede dd; flex-col-reverse puts the number on top visually
            <div key={r.label} className="flex flex-col-reverse">
              <dt className="text-xs text-ink-muted">{r.label}</dt>
              <dd className="text-xl font-bold text-ink">{r.value ?? '—'}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

function AppointmentProgress({ appointments }: { readonly appointments: Appointment[] }) {
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.user?.role) as UserRole | undefined
  const total = appointments.length
  const count = (...s: Appointment['status'][]) => appointments.filter((a) => s.includes(a.status)).length
  // Same status colours as the schedule dots: done = mint, still to come = primary, lost = coral
  const bars = [
    { label: 'Completed',            value: count('COMPLETED'),            fill: HEX.mint },
    { label: 'Upcoming / waiting',   value: count('SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_CONSULTATION'), fill: HEX.primary },
    { label: 'Cancelled / no-show',  value: count('CANCELLED', 'NO_SHOW'), fill: HEX.coral },
  ]

  return (
    <section className="card flex flex-col" aria-labelledby="progress-title">
      <h2 id="progress-title" className={cardTitle}>Today's appointments</h2>
      {total === 0 ? (
        <p className="flex-1 py-8 text-center text-sm text-ink-muted">No appointments today.</p>
      ) : (
        <ul className="mt-5 flex-1 space-y-5">
          {bars.map((b, i) => {
            const pct = Math.round((b.value / total) * 100)
            const id = `appt-bar-${i}`
            return (
              <li key={b.label}>
                <div className="mb-2 flex justify-between text-sm">
                  <span id={id} className="text-ink">{b.label}</span>
                  <span className="font-semibold text-ink">{pct}%</span>
                </div>
                <progress
                  className="bar" max={total} value={b.value} aria-labelledby={id}
                  style={{ '--fill': b.fill } as React.CSSProperties}
                />
              </li>
            )
          })}
        </ul>
      )}
      {role && canAccess(role, '/appointments') && (
        <button
          onClick={() => navigate('/appointments')}
          className="mt-5 rounded-xl border-2 border-dashed border-primary-200 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          View all appointments
        </button>
      )}
    </section>
  )
}

type QueueItem = { key: number; label: string; detail: string }
const usd = (n: number) => `$${Number(n).toLocaleString()}`

/** The 5 oldest items for roles whose work is a list (doctors and nurses have Today's schedule).
 *  ponytail: oldest = lowest id (default sort) — pass an explicit sort if ids stop tracking dates. */
const QUEUES: Partial<Record<UserRole, { title: string; to: string; load: () => Promise<QueueItem[]> }>> = {
  LAB_TECH: { title: 'Oldest pending tests', to: '/lab', load: async () =>
    (await labApi.list(0, 5, ['ORDERED', 'COLLECTED', 'IN_PROGRESS'])).data.data.content
      .map((t) => ({ key: t.id, label: t.testName, detail: `${t.patient?.name ?? '—'} · ${t.status.toLowerCase().replace('_', ' ')}` })) },
  PHARMACIST: { title: 'Low stock', to: '/pharmacy', load: async () =>
    (await pharmacyApi.lowStock()).data.data.slice(0, 5)
      .map((i) => ({ key: i.id, label: i.name, detail: `${i.stockQuantity} left · reorder at ${i.reorderLevel}` })) },
  RECEPTIONIST: { title: 'Oldest unpaid bills', to: '/billing', load: async () =>
    (await billingApi.list(0, 5, ['PENDING', 'PARTIAL'])).data.data.content
      .map((b) => ({ key: b.id, label: b.patient?.name ?? '—', detail: `${usd(b.totalAmount - b.paidAmount)} due` })) },
  HR: { title: 'Unpaid payroll', to: '/payroll', load: async () =>
    (await payrollApi.list(0, false, 5)).data.data.content
      .map((p) => ({ key: p.id, label: p.employee?.name ?? '—', detail: `${p.month} · ${usd(p.netSalary)}` })) },
}

/** Per-role "what's waiting on me": counts from data the page already loads, each linking to its page,
 *  plus the role's oldest items when its work is a list (QUEUES). */
function NeedsAttention({ stats, appointments }: {
  readonly stats?: DashboardStats; readonly appointments: Appointment[]
}) {
  const role = useAuthStore((s) => s.user?.role) as UserRole | undefined
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: async () => (await authApi.me()).data.data })
  const ownDoctorId = me?.linkedStaff?.type === 'DOCTOR' ? me.linkedStaff.id : undefined
  // A doctor's queue is their own diary; everyone else sees the whole hospital's
  const mine = role === 'DOCTOR' ? appointments.filter((a) => a.doctor?.id === ownDoctorId) : appointments
  const count = (...s: Appointment['status'][]) => mine.filter((a) => s.includes(a.status)).length

  const rows = [
    { label: role === 'DOCTOR' ? 'Your patients waiting' : 'Patients waiting', value: count('CHECKED_IN'), to: '/appointments' },
    { label: 'Still to arrive today', value: count('SCHEDULED', 'CONFIRMED'), to: '/appointments' },
    { label: 'Lab tests pending',     value: stats?.pendingLabTests,   to: '/lab' },
    { label: 'Low-stock items',       value: stats?.lowStockItems,     to: '/pharmacy' },
    { label: 'Unpaid bills',          value: stats?.pendingBills,      to: '/billing' },
    { label: 'Inpatients',            value: stats?.currentAdmissions, to: '/admissions' },
    { label: 'Unpaid payroll',        value: stats?.unpaidPayroll,     to: '/payroll' },
  ].filter((r) => role && canAccess(role, r.to))
  const queue = role && QUEUES[role] && canAccess(role, QUEUES[role].to) ? QUEUES[role] : undefined
  const { data: items } = useQuery({ enabled: !!queue, queryKey: ['work-queue', role], queryFn: () => queue!.load() })

  return (
    <section className="card overflow-hidden p-0" aria-labelledby="attention-title">
      <div className="card-band">
        <h2 id="attention-title">Needs attention</h2>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-ink-muted">Nothing is waiting on you right now.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.label}>
              <Link to={r.to}
                className="flex items-center justify-between gap-3 px-5 py-3.5 text-sm transition-colors hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50">
                <span className="text-ink">{r.label}</span>
                <span className={cn('flex items-center gap-1 tabular-nums', r.value ? 'text-lg font-bold text-ink' : 'text-ink-muted')}>
                  {r.value ?? '—'}
                  <ArrowUpRight size={14} className="text-ink-subtle" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {queue && (
        <div className="border-t border-border px-5 pb-4 pt-3">
          <h3 className={cardTitle}>{queue.title}</h3>
          {items?.length === 0 && <p className="mt-2 text-sm text-ink-muted">All clear.</p>}
          <ul className="mt-2 space-y-2">
            {items?.map((i) => (
              <li key={i.key} className="text-sm">
                <p className="truncate font-medium text-ink">{i.label}</p>
                <p className="truncate text-xs text-ink-muted">{i.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function dotColor(s: Appointment['status']): string {
  if (s === 'COMPLETED') return 'bg-mint'
  return s === 'CANCELLED' || s === 'NO_SHOW' ? 'bg-coral' : 'bg-primary'
}

/** Today's appointments only (that's all /appointments/today returns), so no week strip that looks clickable. */
function TodaySchedule({ appointments }: { readonly appointments: Appointment[] }) {
  const now = new Date()
  const sorted = [...appointments].sort((a, b) => a.appointmentDate.localeCompare(b.appointmentDate))

  return (
    <section className="card overflow-hidden p-0" aria-labelledby="calendar-title">
      <div className="card-band">
        <h2 id="calendar-title">Today's schedule</h2>
        <span className="rounded-lg bg-white/20 px-2.5 py-1 normal-case tracking-normal">{format(now, 'EEE, MMM d')}</span>
      </div>

      <div className="px-5 pb-5 pt-2">
        {sorted.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">
            <Clock size={28} className="mx-auto mb-2 text-primary-200" aria-hidden="true" />
            No appointments today.
          </p>
        ) : (
          <ul className="mt-2 max-h-80 divide-y divide-dashed divide-border overflow-y-auto">
            {sorted.map((a) => (
              <li key={a.id} className="flex items-start gap-3 py-3">
                <time className="w-16 shrink-0 pt-0.5 text-xs tabular-nums text-ink-muted" dateTime={a.appointmentDate}>
                  {format(parseISO(a.appointmentDate), 'h:mm a')}
                </time>
                <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', dotColor(a.status))} aria-hidden="true" />
                <div className="min-w-0 text-sm">
                  <p className="truncate font-medium text-ink">{a.patient?.name ?? '—'}</p>
                  <p className="truncate text-xs text-ink-muted">
                    {withDr(a.doctor?.name)}{a.reason ? ` · ${a.reason}` : ''}
                    <span className="sr-only">, {a.status.toLowerCase().replace('_', ' ')}</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
