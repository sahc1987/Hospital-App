import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Pencil, Mail, Clock } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns'
import { dashboardApi, appointmentApi, authApi } from '@/api/endpoints'
import { useAuthStore } from '@/store/authStore'
import { canAccess } from '@/utils/permissions'
import { ClinicianIllustration } from '@/components/ui/ClinicianIllustration'
import { cn } from '@/utils/cn'
import { withDr } from '@/utils/names'
import type { Appointment, UserRole } from '@/types'

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

/** "Dr. James Smith" → "Dr. Smith"; "Anna Thompson" → "Anna". */
function shortName(full?: string) {
  if (!full) return ''
  const parts = full.split(' ')
  return parts[0].startsWith('Dr') ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0]
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

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 motion-safe:animate-slide-up">
      <div className="space-y-6 xl:col-span-8">
        <WelcomeBanner name={shortName(user?.fullName ?? user?.username)} />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <TrendTile
            title="Admissions" tint="coral"
            value={stats?.currentAdmissions} caption="patients admitted now"
            series={trends?.admissions} seriesLabel="new admissions"
          />
          <TrendTile
            title="Appointments" tint="mint"
            value={stats?.todayAppointments} caption="scheduled today"
            series={trends?.appointments} seriesLabel="appointments"
          />
          <TrendTile
            title="Laboratory" tint="primary"
            value={stats?.pendingLabTests} caption="tests pending"
            series={trends?.labTests} seriesLabel="tests ordered"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <OccupancyCard
            occupied={stats?.occupiedRooms} available={stats?.availableRooms} total={stats?.totalRooms}
          />
          <AppointmentProgress appointments={today} />
        </div>
      </div>

      <div className="space-y-6 xl:col-span-4">
        <ProfileCard />
        <WeekCalendar appointments={today} />
      </div>
    </div>
  )
}

// ─── Widgets ─────────────────────────────────────────────────────────────────

function WelcomeBanner({ name }: { readonly name: string }) {
  const now = new Date()
  return (
    <section className="card-dark relative overflow-hidden p-0" aria-labelledby="welcome-title">
      {/* Topographic contour lines */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 600 220" preserveAspectRatio="none" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <path key={i} fill="none" stroke="white" strokeOpacity=".1" strokeWidth="1.5"
            d={`M${260 + i * 30} 0c-40 60 60 90 20 140s40 60 ${30 + i * 10} 80`} />
        ))}
        <path fill="none" stroke="white" strokeOpacity=".08" strokeWidth="1.5" d="M0 190c120-40 200 20 320-10" />
      </svg>

      <div className="relative flex min-h-[12rem] items-center">
        <div className="flex-1 p-8">
          <p className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium">
            <CalendarDays size={14} aria-hidden="true" />
            <time dateTime={now.toISOString()}>{format(now, 'MMM d, yyyy · h:mm a')}</time>
          </p>
          {/* h2: the Header already renders the page's h1 */}
          <h2 id="welcome-title" className="mt-6 text-2xl font-bold sm:text-3xl">
            {greeting(now)}{name ? `, ${name}` : ''}!
          </h2>
          <p className="mt-1 text-sm text-white">Have a nice {format(now, 'EEEE')}!</p>
        </div>
        <ClinicianIllustration className="hidden h-48 w-auto shrink-0 self-end md:block" />
      </div>
    </section>
  )
}

/** Recharts clones this per point with cx/cy/index; only the last point gets a dot. */
function EndDot({ cx, cy, index, last, fill }: Readonly<{ cx?: number; cy?: number; index?: number; last: number; fill: string }>) {
  return index === last ? <circle cx={cx} cy={cy} r={3.5} fill={fill} /> : <g />
}

const tints = {
  coral:   { box: 'bg-coral-light',  pill: 'bg-coral-light text-danger-ink',  hex: HEX.coral },
  mint:    { box: 'bg-mint-light',   pill: 'bg-mint-light text-success-ink',  hex: HEX.mint },
  primary: { box: 'bg-primary-50',   pill: 'bg-primary-50 text-primary-700',  hex: HEX.primary },
} as const

function TrendTile({ title, tint, value, caption, series, seriesLabel }: {
  readonly title: string
  readonly tint: keyof typeof tints
  readonly value?: number
  readonly caption: string
  readonly series?: number[]
  readonly seriesLabel: string
}) {
  const t = tints[tint]
  const pct = series ? trendPct(series) : null
  const data = (series ?? []).map((v, i) => ({ i, v }))
  const last = data.length - 1

  return (
    <section className="card flex items-center gap-4 p-5" aria-label={title}>
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
        <h2 className={cardTitle}>{title}</h2>
        <p className="mt-1 text-2xl font-bold text-ink">{value ?? '—'}</p>
        <p className="text-xs text-ink-muted">{caption}</p>
        <p
          className={cn('mt-2 inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium', t.pill)}
          title="Today compared with the average of the previous 6 days"
        >
          {pct === null ? 'No baseline yet' : signed(pct) + '% vs avg'}
        </p>
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
  const bars = [
    { label: 'Completed',            value: count('COMPLETED'),            fill: HEX.primary },
    { label: 'Upcoming / waiting',   value: count('SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_CONSULTATION'), fill: HEX.coral },
    { label: 'Cancelled / no-show',  value: count('CANCELLED', 'NO_SHOW'), fill: HEX.pink },
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

const activeLabel = (active: boolean) => (active ? 'Active' : 'Inactive')
function staffLabel(type?: string): string {
  if (type === 'DOCTOR') return 'Doctor'
  return type ? 'Employee' : 'None'
}

function ProfileCard() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await authApi.me()).data.data,
  })
  const role = user?.role?.toLowerCase().replace('_', ' ')
  const facts = [
    { label: 'Member since', value: me?.createdAt ? format(parseISO(me.createdAt), 'MMM yyyy') : '—' },
    { label: 'Status',       value: me ? activeLabel(me.active) : '—' },
    { label: 'Staff record', value: me ? staffLabel(me.linkedStaff?.type) : '—' },
  ]

  return (
    <section className="card overflow-hidden p-0" aria-labelledby="profile-title">
      <div className="card-band">
        <h2 id="profile-title">My profile</h2>
        <button
          onClick={() => navigate('/profile')}
          aria-label="Edit profile"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <Pencil size={14} aria-hidden="true" />
        </button>
      </div>
      <div className="p-5">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-50 text-2xl font-bold text-primary-700 ring-4 ring-primary-100" aria-hidden="true">
            {user?.fullName?.charAt(0) ?? 'U'}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-ink">{user?.fullName ?? user?.username}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{role}</p>
            <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-ink-muted">
              <Mail size={13} className="shrink-0 text-primary" aria-hidden="true" />
              <span className="truncate">{user?.email}</span>
            </p>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-3 divide-x divide-border border-t border-border pt-4 text-center">
          {facts.map((f) => (
            <div key={f.label} className="px-2">
              <dt className="text-[11px] text-ink-muted">{f.label}</dt>
              <dd className="mt-1 text-sm font-bold text-ink">{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

function dotColor(s: Appointment['status']): string {
  if (s === 'COMPLETED') return 'bg-mint'
  return s === 'CANCELLED' || s === 'NO_SHOW' ? 'bg-coral' : 'bg-primary'
}

function WeekCalendar({ appointments }: { readonly appointments: Appointment[] }) {
  const now = new Date()
  const week = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(now), i))
  const sorted = [...appointments].sort((a, b) => a.appointmentDate.localeCompare(b.appointmentDate))

  return (
    <section className="card overflow-hidden p-0" aria-labelledby="calendar-title">
      <div className="card-band">
        <h2 id="calendar-title">This week</h2>
        <span className="rounded-lg bg-white/20 px-2.5 py-1 normal-case tracking-normal">{format(now, 'MMMM yyyy')}</span>
      </div>

      {/* Display only: other days' schedules aren't loaded, so these aren't buttons */}
      <ol className="grid grid-cols-7 gap-1 bg-primary-50 px-3 py-3 text-center">
        {week.map((d) => {
          const isToday = isSameDay(d, now)
          return (
            <li
              key={d.toISOString()}
              aria-current={isToday ? 'date' : undefined}
              className={cn('rounded-xl py-2', isToday ? 'bg-primary text-white shadow-primary' : 'text-ink')}
            >
              <span className={cn('block text-[11px]', isToday ? 'text-white' : 'text-ink-muted')}>{format(d, 'EEE')}</span>
              <span className="block text-lg font-semibold">{format(d, 'd')}</span>
            </li>
          )
        })}
      </ol>

      <div className="px-5 pb-5 pt-4">
        <h3 className={cardTitle}>{format(now, 'MMMM d')}</h3>
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
