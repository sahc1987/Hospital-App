import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { differenceInMinutes, format, parseISO } from 'date-fns'
import { dashboardApi, appointmentApi, authApi, labApi, pharmacyApi, billingApi, payrollApi } from '@/api/endpoints'
import { useAuthStore } from '@/store/authStore'
import { canAccess } from '@/utils/permissions'
import { cn } from '@/utils/cn'
import { withDr } from '@/utils/names'
import type { Appointment, AppointmentStatus, DashboardStats, DashboardTrends, UserRole } from '@/types'

/** Today vs. the average of the previous days, in %; null when there's no baseline. */
function trendPct(series: number[]): number | null {
  if (series.length < 2) return null
  const prev = series.slice(0, -1)
  const avg = prev.reduce((a, b) => a + b, 0) / prev.length
  if (avg === 0) return null
  return Math.round(((series[series.length - 1] - avg) / avg) * 100)
}

function greeting(d: Date) {
  const h = d.getHours()
  if (h < 12) return 'Good morning'
  return h < 18 ? 'Good afternoon' : 'Good evening'
}

/** Re-renders once a minute so the now-line and wait times move. */
function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])
  return now
}

// ponytail: naive hospital-local times are compared with the browser clock, so a viewer in another
// zone than TZ sees a shifted now-line and wait times; send "now" from the server if that matters.
const minOfDay = (iso: string) => { const d = parseISO(iso); return d.getHours() * 60 + d.getMinutes() }

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const user = useAuthStore((s) => s.user)
  const now = useNow()
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
    refetchInterval: 60_000,
  })
  // Lab, pharmacy and HR can't open Appointments, so the board would be noise for them
  const seesAppointments = !!user?.role && canAccess(user.role as UserRole, '/appointments')

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm text-ink-muted">
          <time dateTime={now.toISOString()}>{format(now, 'EEEE, MMMM d')}</time>
        </p>
        {/* h2: the Header already renders the page's h1 */}
        <h2 className="text-3xl font-extrabold tracking-tight text-ink">
          {greeting(now)}{user?.fullName || user?.username ? `, ${user.fullName ?? user.username}` : ''}
        </h2>
      </div>

      {seesAppointments && <ClinicBoard appointments={today} now={now} />}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7"><Worklist stats={stats} trends={trends} appointments={today} /></div>
        <div className="lg:col-span-5"><Rooms stats={stats} /></div>
      </div>
    </div>
  )
}

// ─── Clinic board ────────────────────────────────────────────────────────────

const SEEN    = { label: 'Seen',                 cls: 'bg-mint-bright text-mint-deep' }
const CONSULT = { label: 'In consultation',      cls: 'bg-white font-bold text-surface-dark' }
const WAITING = { label: 'Checked in, waiting',  cls: 'bg-warning-bright font-bold text-warning-deep' }
const BOOKED  = { label: 'Booked',               cls: 'border-[1.5px] border-primary-300 text-primary-100' }
const LOST    = { label: 'Cancelled or no-show', cls: 'border-[1.5px] border-dashed border-coral text-coral-light line-through' }
// Each look also differs in lightness or outline, so status never rests on hue alone
const LOOK: Record<AppointmentStatus, typeof SEEN> = {
  COMPLETED: SEEN, IN_CONSULTATION: CONSULT, CHECKED_IN: WAITING,
  SCHEDULED: BOOKED, CONFIRMED: BOOKED, CANCELLED: LOST, NO_SHOW: LOST,
}

/** Today's appointments as one lane per doctor on a time axis, plus who is in the waiting room. */
function ClinicBoard({ appointments, now }: { readonly appointments: Appointment[]; readonly now: Date }) {
  const count = (...s: AppointmentStatus[]) => appointments.filter((a) => s.includes(a.status)).length
  const startH = Math.min(7, ...appointments.map((a) => Math.floor(minOfDay(a.appointmentDate) / 60)))
  const endH = Math.max(19, ...appointments.map((a) => Math.ceil((minOfDay(a.appointmentDate) + a.durationMinutes) / 60)))
  const start = startH * 60
  const span = endH * 60 - start
  const at = (m: number) => `${((m - start) / span) * 100}%`
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const showNow = nowMin >= start && nowMin <= endH * 60
  const hours = Array.from({ length: endH - startH + 1 }, (_, i) => startH + i)

  const byDoctor = new Map<number, Appointment[]>()
  for (const a of appointments) byDoctor.set(a.doctor?.id ?? 0, [...(byDoctor.get(a.doctor?.id ?? 0) ?? []), a])
  const lanes = [...byDoctor.values()].sort((x, y) => (x[0].doctor?.name ?? '').localeCompare(y[0].doctor?.name ?? ''))

  const waiting = appointments
    .filter((a) => a.status === 'CHECKED_IN')
    .map((a) => ({ a, mins: a.checkedInAt ? Math.max(0, differenceInMinutes(now, parseISO(a.checkedInAt))) : null }))
    .sort((x, y) => (y.mins ?? -1) - (x.mins ?? -1))

  return (
    <section aria-labelledby="board-title" className="rounded-[1.375rem] bg-surface-dark p-6 text-white">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="board-title" className="text-xl font-bold">Today's clinics</h2>
        <p className="text-sm text-primary-200">
          {appointments.length} booked, {count('COMPLETED')} seen, {count('SCHEDULED', 'CONFIRMED')} still to arrive
        </p>
      </div>

      {appointments.length === 0 ? (
        <p className="py-8 text-center text-primary-100">No appointments are booked for today.</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[56rem]">
            <div className="relative ml-40 h-6" aria-hidden="true">
              {hours.map((h) => (
                <span key={h} className="absolute -translate-x-1/2 whitespace-nowrap text-xs text-primary-200 first:translate-x-0 last:-translate-x-full"
                  style={{ left: at(h * 60) }}>
                  {format(new Date(2000, 0, 1, h), 'h a')}
                </span>
              ))}
              {showNow && (
                <span className="absolute -translate-x-1/2 rounded-md bg-white px-1.5 text-xs font-bold leading-[18px] text-surface-dark" style={{ left: at(nowMin) }}>
                  {format(now, 'h:mm')}
                </span>
              )}
            </div>

            <ul className="space-y-2">
              {lanes.map((list) => {
                const d = list[0].doctor
                return (
                  <li key={d?.id ?? 0} className="flex">
                    <div className="w-40 shrink-0 py-1.5 pr-3">
                      <p className="truncate font-bold">{withDr(d?.name)}</p>
                      <p className="truncate text-sm text-primary-200">{d?.hasLogin === false ? 'Covering, no login' : d?.specialization}</p>
                    </div>
                    <div className="relative h-[3.25rem] flex-1 rounded-[10px] bg-white/5"
                      style={{ backgroundImage: `repeating-linear-gradient(to right, rgb(255 255 255 / .1) 0 1px, transparent 1px ${100 / (endH - startH)}%)` }}>
                      <ul aria-label={`${withDr(d?.name)}, ${list.length} appointments`}>
                        {list.map((a) => {
                          const look = LOOK[a.status]
                          const label = `${format(parseISO(a.appointmentDate), 'h:mm a')}, ${a.patient?.name ?? '—'}, ${look.label}`
                          return (
                            <li key={a.id} title={label}
                              className={cn('absolute inset-y-1.5 flex items-center overflow-hidden rounded-lg px-1.5 text-xs', look.cls)}
                              style={{ left: `calc(${at(minOfDay(a.appointmentDate))} + 2px)`, width: `calc(${(a.durationMinutes / span) * 100}% - 4px)` }}>
                              <span className="sr-only">{label}</span>
                              <span aria-hidden="true" className="truncate">{a.patient?.name.split(' ').pop()}</span>
                            </li>
                          )
                        })}
                      </ul>
                      {showNow && <div aria-hidden="true" className="absolute -inset-y-1.5 -ml-px w-0.5 rounded bg-white" style={{ left: at(nowMin) }} />}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-primary-100">
        {[SEEN, CONSULT, WAITING, BOOKED, LOST].map((l) => (
          <li key={l.label} className="flex items-center gap-2">
            <span aria-hidden="true" className={cn('h-3.5 w-[22px] rounded', l.cls)} />{l.label}
          </li>
        ))}
      </ul>

      {waiting.length > 0 && (
        <div className="mt-5 border-t border-white/15 pt-4">
          <h3 className="mb-3 font-bold">In the waiting room</h3>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(15.5rem,1fr))] gap-2.5">
            {waiting.map(({ a, mins }) => (
              <li key={a.id}>
                <Link to="/appointments"
                  className="flex min-h-[3.75rem] items-center justify-between gap-3 rounded-2xl bg-warning-bright px-3.5 py-2.5 text-warning-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{a.patient?.name ?? '—'}</span>
                    <span className="block text-sm">{withDr(a.doctor?.name)}, booked {format(parseISO(a.appointmentDate), 'h:mm a')}</span>
                  </span>
                  {mins !== null && (
                    <span className="shrink-0 text-right">
                      <span className="block text-2xl font-extrabold leading-none">{mins}</span>
                      <span className="block text-xs">min waiting</span>
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

// ─── Worklist ────────────────────────────────────────────────────────────────

function Spark({ series }: { readonly series: number[] }) {
  const max = Math.max(...series)
  const min = Math.min(...series)
  const pts = series.map((v, i) => [4 + (i * 88) / (series.length - 1), 24 - ((v - min) / (max - min || 1)) * 20])
  const [cx, cy] = pts[pts.length - 1]
  return (
    <svg width="96" height="28" viewBox="0 0 96 28" aria-hidden="true" className="text-primary-400">
      <polyline points={pts.join(' ')} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="3" className="fill-primary-600" />
    </svg>
  )
}

function trendText(label: string, series?: number[]) {
  const pct = series ? trendPct(series) : null
  if (pct === null) return undefined
  if (pct === 0) return `${label} level with the 6-day average`
  return `${label} ${pct > 0 ? 'up' : 'down'} ${Math.abs(pct)}% on the 6-day average`
}

type QueueItem = { key: number; label: string; detail: string }
const usd = (n: number) => `$${Number(n).toLocaleString()}`

/** The 5 oldest items for roles whose work is a list (doctors and nurses have the board).
 *  ponytail: oldest = lowest id (default sort) — pass an explicit sort if ids stop tracking dates. */
const QUEUES: Partial<Record<UserRole, { title: string; to: string; load: () => Promise<QueueItem[]> }>> = {
  LAB_TECH: { title: 'Oldest pending tests', to: '/lab', load: async () =>
    (await labApi.list(0, 5, ['ORDERED', 'COLLECTED', 'IN_PROGRESS'])).data.data.content
      .map((t) => ({ key: t.id, label: t.testName, detail: `${t.patient?.name ?? '—'}, ${t.status.toLowerCase().replace('_', ' ')}` })) },
  PHARMACIST: { title: 'Low stock', to: '/pharmacy', load: async () =>
    (await pharmacyApi.lowStock()).data.data.slice(0, 5)
      .map((i) => ({ key: i.id, label: i.name, detail: `${i.stockQuantity} left, reorder at ${i.reorderLevel}` })) },
  RECEPTIONIST: { title: 'Oldest unpaid bills', to: '/billing', load: async () =>
    (await billingApi.list(0, 5, ['PENDING', 'PARTIAL'])).data.data.content
      .map((b) => ({ key: b.id, label: b.patient?.name ?? '—', detail: `${usd(b.totalAmount - b.paidAmount)} due` })) },
  HR: { title: 'Unpaid payroll', to: '/payroll', load: async () =>
    (await payrollApi.list(0, false, 5)).data.data.content
      .map((p) => ({ key: p.id, label: p.employee?.name ?? '—', detail: `${p.month}, ${usd(p.netSalary)}` })) },
}

/** Per-role "what's waiting on me": each count links to its page, with a 7-day trend where one exists,
 *  plus the role's oldest items when its work is a list (QUEUES). */
function Worklist({ stats, trends, appointments }: {
  readonly stats?: DashboardStats; readonly trends?: DashboardTrends; readonly appointments: Appointment[]
}) {
  const role = useAuthStore((s) => s.user?.role) as UserRole | undefined
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: async () => (await authApi.me()).data.data })
  const ownDoctorId = me?.linkedStaff?.type === 'DOCTOR' ? me.linkedStaff.id : undefined
  // A doctor's queue is their own diary; everyone else sees the whole hospital's
  const mine = role === 'DOCTOR' ? appointments.filter((a) => a.doctor?.id === ownDoctorId) : appointments
  const count = (...s: AppointmentStatus[]) => mine.filter((a) => s.includes(a.status)).length

  const rows = [
    { label: role === 'DOCTOR' ? 'Your patients waiting' : 'Patients waiting', value: count('CHECKED_IN'), to: '/appointments' },
    { label: 'Still to arrive today', value: count('SCHEDULED', 'CONFIRMED'), to: '/appointments', series: trends?.appointments, of: 'Appointments' },
    { label: 'Lab tests pending',     value: stats?.pendingLabTests,   to: '/lab', series: trends?.labTests, of: 'Tests ordered' },
    { label: 'Low-stock items',       value: stats?.lowStockItems,     to: '/pharmacy' },
    { label: 'Unpaid bills',          value: stats?.pendingBills,      to: '/billing' },
    { label: 'Inpatients',            value: stats?.currentAdmissions, to: '/admissions', series: trends?.admissions, of: 'New admissions' },
    { label: 'Unpaid payroll',        value: stats?.unpaidPayroll,     to: '/payroll' },
  ].filter((r) => role && canAccess(role, r.to))
  const queue = role && QUEUES[role] && canAccess(role, QUEUES[role].to) ? QUEUES[role] : undefined
  const { data: items } = useQuery({ enabled: !!queue, queryKey: ['work-queue', role], queryFn: () => queue!.load() })

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface" aria-labelledby="work-title">
      <h2 id="work-title" className="px-5 pb-2.5 pt-4 text-lg font-bold text-ink">Your worklist</h2>
      {rows.length === 0 ? (
        <p className="border-t border-border px-5 py-8 text-center text-sm text-ink-muted">Nothing is waiting on you right now.</p>
      ) : (
        <ul>
          {rows.map((r) => (
            <li key={r.label} className="border-t border-border">
              <Link to={r.to}
                className="grid min-h-16 grid-cols-[minmax(0,1fr)_6rem_4.5rem] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
                <span>
                  <span className="block font-semibold text-ink">{r.label}</span>
                  {r.of && <span className="block text-sm text-ink-muted">{trendText(r.of, r.series)}</span>}
                </span>
                <span>{r.series && r.series.length > 1 && <Spark series={r.series} />}</span>
                <span className={cn('text-right tabular-nums', r.value ? 'text-3xl font-extrabold text-ink' : 'text-xl text-ink-muted')}>
                  {r.value ?? '—'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {queue && (
        <div className="border-t border-border px-5 pb-4 pt-3">
          <h3 className="text-sm font-semibold text-ink">{queue.title}</h3>
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

// ─── Rooms ───────────────────────────────────────────────────────────────────

/** One cell per room, sorted by state: stats carry counts only, not which room is which. */
function Rooms({ stats }: { readonly stats?: DashboardStats }) {
  const role = useAuthStore((s) => s.user?.role) as UserRole | undefined
  const occupied = stats?.occupiedRooms ?? 0
  const available = stats?.availableRooms ?? 0
  const total = stats?.totalRooms ?? 0
  const maintenance = Math.max(0, total - occupied - available)
  const cells = [
    ...Array<string>(occupied).fill('bg-primary-600'),
    ...Array<string>(available).fill('border-2 border-primary-300 bg-surface'),
    ...Array<string>(maintenance).fill('bg-warning'),
  ]
  const legend = [
    { label: 'Occupied', value: occupied, cls: 'bg-primary-600' },
    { label: 'Available', value: available, cls: 'border-2 border-primary-300' },
    { label: 'Maintenance', value: maintenance, cls: 'bg-warning' },
  ]

  return (
    <section className="rounded-2xl border border-border bg-surface px-5 pb-5 pt-4" aria-labelledby="rooms-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="rooms-title" className="text-lg font-bold text-ink">Rooms</h2>
        {role && canAccess(role, '/rooms') && <Link to="/rooms" className="text-sm font-semibold text-primary-700 hover:underline">Open rooms</Link>}
      </div>
      <p className="mb-4 mt-1 text-sm text-ink-muted">
        <strong className="text-3xl font-extrabold text-ink">{stats ? occupied : '—'}</strong> of {total} occupied
      </p>
      {total > 0 && (
        <ul aria-label={`${occupied} occupied, ${available} available, ${maintenance} in maintenance`} className="grid grid-cols-9 gap-1.5">
          {cells.map((cls, i) => <li key={i} aria-hidden="true" className={cn('aspect-square rounded-md', cls)} />)}
        </ul>
      )}
      <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-muted">
        {legend.map((l) => (
          <div key={l.label} className="flex items-center gap-2">
            <span aria-hidden="true" className={cn('h-3 w-3 rounded-sm', l.cls)} />
            <dt>{l.label}</dt>
            <dd className="font-bold text-ink">{l.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
