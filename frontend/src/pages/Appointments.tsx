import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, CalendarDays, List, ChevronLeft, ChevronRight, History } from 'lucide-react'
import { format, parseISO, startOfWeek, addDays, addWeeks, isToday } from 'date-fns'
import { appointmentApi, patientApi, doctorApi, authApi } from '@/api/endpoints'
import type { AppointmentFilters } from '@/api/endpoints'
import { Table } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Input'
import { StatusBadge } from '@/components/ui/Badge'
import { useAuthStore } from '@/store/authStore'
import { ConsultationPanel } from '@/components/appointments/ConsultationPanel'
import { cn } from '@/utils/cn'
import toast from 'react-hot-toast'
import type { Appointment, AppointmentStatus, Doctor, UserRole } from '@/types'

// ─── Rules (mirror of AppointmentService; the server is authoritative) ───────

const FRONT_DESK: UserRole[] = ['ADMIN', 'RECEPTIONIST', 'NURSE']
const NEXT: Record<AppointmentStatus, AppointmentStatus[]> = {
  SCHEDULED:  ['CONFIRMED', 'CHECKED_IN', 'NO_SHOW', 'CANCELLED'],
  CONFIRMED:  ['CHECKED_IN', 'NO_SHOW', 'CANCELLED'],
  CHECKED_IN: ['IN_CONSULTATION', 'CANCELLED'],
  IN_CONSULTATION: ['COMPLETED'],
  COMPLETED: [], CANCELLED: [], NO_SHOW: [],
}
const ACTION: Partial<Record<AppointmentStatus, string>> = {
  CONFIRMED: 'Confirm', CHECKED_IN: 'Check in', IN_CONSULTATION: 'Start consult', NO_SHOW: 'No-show', CANCELLED: 'Cancel',
}
const ALL_STATUSES: AppointmentStatus[] = ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED', 'NO_SHOW']
const ACTIVE: AppointmentStatus[] = ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_CONSULTATION', 'COMPLETED']
const CLINICAL: UserRole[] = ['ADMIN', 'DOCTOR', 'NURSE']
/** Statuses where opening the appointment shows the consultation (clinical) view. */
const VISIT_STATUSES: AppointmentStatus[] = ['CHECKED_IN', 'IN_CONSULTATION', 'COMPLETED']
const DAY = 'yyyy-MM-dd'
const isOpen = (s: AppointmentStatus) => s === 'SCHEDULED' || s === 'CONFIRMED'
const pretty = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace('_', ' ')
const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))

function useRules() {
  const role = useAuthStore((s) => s.user?.role) as UserRole | undefined
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: async () => (await authApi.me()).data.data })
  const ownDoctorId = me?.linkedStaff?.type === 'DOCTOR' ? me.linkedStaff.id : undefined
  const isOwn = (doctorId?: number) => ownDoctorId != null && doctorId === ownDoctorId
  const frontDesk = !!role && FRONT_DESK.includes(role)
  return {
    role, ownDoctorId, isDoctor: role === 'DOCTOR',
    canBook: (doctorId?: number) => frontDesk || (role === 'DOCTOR' && (doctorId == null ? !!ownDoctorId : isOwn(doctorId))),
    canDocument: (a: Appointment) => role === 'ADMIN' || isOwn(a.doctor?.id),
    showsVisit: (a: Appointment) => !!role && CLINICAL.includes(role) && VISIT_STATUSES.includes(a.status),
    actions: (a: Appointment): AppointmentStatus[] => NEXT[a.status].filter((to) => {
      if (to === 'COMPLETED') return false // completed from the consultation panel, which enforces the note
      const allowed = to === 'IN_CONSULTATION' ? role === 'ADMIN' || isOwn(a.doctor?.id) : frontDesk || isOwn(a.doctor?.id)
      const start = parseISO(a.appointmentDate)
      if (to === 'CHECKED_IN' && !isToday(start)) return false
      if (to === 'NO_SHOW' && start > new Date()) return false
      return allowed
    }),
  }
}

type BookingState = { appt?: Appointment; doctorId?: number; patientId?: number; date?: string; time?: string }

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Appointments() {
  const rules = useRules()
  const qc = useQueryClient()
  const [view, setView] = useState<'list' | 'week'>('list')
  const [mine, setMine] = useState(true) // only applies to doctors
  const [booking, setBooking] = useState<BookingState | null>(null)
  const [cancelling, setCancelling] = useState<Appointment | null>(null)
  const [details, setDetails] = useState<Appointment | null>(null)

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors-list'],
    // ponytail: first 100 doctors — switch to a search box past that
    queryFn: async () => (await doctorApi.list(undefined, 0, 100)).data.data.content,
  })

  const status = useMutation({
    mutationFn: ({ a, to, note }: { a: Appointment; to: AppointmentStatus; note?: string }) =>
      appointmentApi.changeStatus(a.id, to, note),
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['today-appointments'] })
      toast.success(`Marked ${pretty(v.to).toLowerCase()}`)
      setCancelling(null)
    },
    // errors: the axios interceptor already toasts the server's message
  })

  function act(a: Appointment, to: AppointmentStatus) {
    if (to === 'CANCELLED') setCancelling(a)
    else status.mutate({ a, to })
  }

  const actions = (a: Appointment) => (
    <div className="flex flex-wrap gap-1">
      {rules.actions(a).map((to) => (
        <Button key={to} size="sm" variant={to === 'CANCELLED' || to === 'NO_SHOW' ? 'ghost' : 'secondary'}
          onClick={() => act(a, to)} disabled={status.isPending}>
          {ACTION[to]}
        </Button>
      ))}
      {isOpen(a.status) && rules.canBook(a.doctor?.id) && (
        <Button size="sm" variant="ghost" onClick={() => setBooking({ appt: a, doctorId: a.doctor.id })}>Reschedule</Button>
      )}
      {rules.showsVisit(a) && (
        <Button size="sm" variant={a.status === 'IN_CONSULTATION' && rules.canDocument(a) ? 'primary' : 'secondary'}
          onClick={() => setDetails(a)}>
          {a.status === 'COMPLETED' ? 'View visit' : 'Open visit'}
        </Button>
      )}
      <Button size="sm" variant="ghost" onClick={() => setDetails(a)} aria-label={`Details for ${a.patient?.name}`}>
        <History size={14} aria-hidden="true" />
      </Button>
    </div>
  )

  return (
    <div className="space-y-5 motion-safe:animate-slide-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-surface p-1 shadow-card" role="group" aria-label="View">
          {([['list', List, 'List'], ['week', CalendarDays, 'Week']] as const).map(([v, Icon, label]) => (
            <button key={v} onClick={() => setView(v)} aria-pressed={view === v}
              className={cn('flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                view === v ? 'bg-primary text-white' : 'text-ink-muted hover:text-ink')}>
              <Icon size={15} aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {rules.isDoctor && view === 'list' && (
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)}
                className="h-4 w-4 accent-primary" />
              Only my appointments
            </label>
          )}
          {rules.canBook() && (
            <Button onClick={() => setBooking({ doctorId: rules.isDoctor ? rules.ownDoctorId : undefined })}
              icon={<Plus size={15} />}>
              New appointment
            </Button>
          )}
        </div>
      </div>

      {view === 'list'
        ? <ListView doctors={doctors} mine={rules.isDoctor && mine} actions={actions} />
        : <WeekView doctors={doctors} defaultDoctorId={rules.ownDoctorId} canBook={rules.canBook}
            onBook={(doctorId, date, time) => setBooking({ doctorId, date, time })} onOpen={setDetails} />}

      {booking && <BookingModal state={booking} doctors={doctors} lockDoctor={rules.isDoctor && !FRONT_DESK.includes(rules.role!)}
        onClose={() => setBooking(null)} />}

      <Modal open={!!cancelling} onClose={() => setCancelling(null)} title="Cancel appointment" size="md">
        {cancelling && (
          <CancelForm appt={cancelling} pending={status.isPending}
            onSubmit={(note) => status.mutate({ a: cancelling, to: 'CANCELLED', note })}
            onClose={() => setCancelling(null)} />
        )}
      </Modal>

      <Modal open={!!details} onClose={() => setDetails(null)}
        title={details && rules.showsVisit(details) ? 'Consultation' : 'Appointment details'}
        size={details && rules.showsVisit(details) ? 'full' : 'lg'}>
        {details && (rules.showsVisit(details)
          ? <ConsultationPanel appt={details} canDocument={rules.canDocument(details)} onDone={() => setDetails(null)}
              onFollowUp={(weeks) => {
                setBooking({ patientId: details.patient.id, doctorId: details.doctor.id,
                  date: format(addWeeks(parseISO(details.appointmentDate), weeks), DAY) })
                setDetails(null)
              }} />
          : <DetailsPanel appt={details} editable={isOpen(details.status) && rules.canBook(details.doctor?.id)}
              onSaved={() => setDetails(null)} />)}
      </Modal>
    </div>
  )
}

// ─── List ────────────────────────────────────────────────────────────────────

const RANGES = { upcoming: 'Upcoming', today: 'Today', past: 'Past', all: 'All dates' } as const

function ListView({ doctors, mine, actions }: {
  readonly doctors: Doctor[]; readonly mine: boolean; readonly actions: (a: Appointment) => React.ReactNode
}) {
  const [range, setRange] = useState<keyof typeof RANGES>('upcoming')
  const [statuses, setStatuses] = useState<AppointmentStatus[]>([])
  const [doctorId, setDoctorId] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  useEffect(() => setPage(0), [range, statuses, doctorId, q, mine])

  const today = format(new Date(), DAY)
  const filters: AppointmentFilters = {
    page, size: 20, mine, q: q || undefined, status: statuses,
    doctorId: !mine && doctorId ? Number(doctorId) : undefined,
    ...(range === 'upcoming' && { from: today, sort: 'appointmentDate,asc' }),
    ...(range === 'today' && { from: today, to: today, sort: 'appointmentDate,asc' }),
    ...(range === 'past' && { to: format(addDays(new Date(), -1), DAY), sort: 'appointmentDate,desc' }),
    ...(range === 'all' && { sort: 'appointmentDate,desc' }),
  }
  const { data, isLoading } = useQuery({
    queryKey: ['appointments', 'list', filters],
    queryFn: async () => (await appointmentApi.list(filters)).data.data,
  })
  const toggle = (s: AppointmentStatus) =>
    setStatuses((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))

  return (
    <div className="card space-y-4 p-0 overflow-hidden">
      <div className="flex flex-wrap items-end gap-3 px-6 pt-5">
        <div className="w-40">
          <Select label="Dates" value={range} onChange={(e) => setRange(e.target.value as keyof typeof RANGES)}
            options={Object.entries(RANGES).map(([value, label]) => ({ value, label }))} />
        </div>
        {!mine && (
          <div className="w-56">
            <Select label="Doctor" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}
              options={doctors.map((d) => ({ value: d.id, label: d.name }))} />
          </div>
        )}
        <div className="flex w-56 flex-col gap-1.5">
          <label htmlFor="appt-q" className="text-sm font-medium text-ink">Patient</label>
          <input id="appt-q" type="search" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name…" className="input" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 px-6" role="group" aria-label="Filter by status">
        {ALL_STATUSES.map((s) => (
          <button key={s} onClick={() => toggle(s)} aria-pressed={statuses.includes(s)}
            className={cn('rounded-lg px-3 py-1 text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              statuses.includes(s) ? 'bg-primary text-white' : 'bg-primary-50 text-primary-700 hover:bg-primary-100')}>
            {pretty(s)}
          </button>
        ))}
        {statuses.length > 0 && (
          <button onClick={() => setStatuses([])} className="px-2 text-xs text-ink-muted underline">Clear</button>
        )}
      </div>

      <Table
        data={(data?.content ?? []) as unknown as Record<string, unknown>[]}
        loading={isLoading}
        keyField={'id' as never}
        totalPages={data?.totalPages}
        currentPage={page}
        onPageChange={setPage}
        emptyMessage="No appointments match these filters."
        columns={[
          { key: 'appointmentDate', header: 'When', render: (row) => {
            const a = row as unknown as Appointment
            const d = parseISO(a.appointmentDate)
            return (
              <div>
                <p className="text-sm font-medium">{format(d, 'EEE, MMM d, yyyy')}</p>
                <p className="text-xs text-ink-muted">{format(d, 'h:mm a')} · {a.durationMinutes} min</p>
              </div>
            )
          } },
          { key: 'patient', header: 'Patient', render: (row) => (row as unknown as Appointment).patient?.name ?? '—' },
          { key: 'doctor', header: 'Doctor', render: (row) => {
            const a = row as unknown as Appointment
            return (
              <div>
                <p className="text-sm">{a.doctor?.name ?? '—'}</p>
                <p className="text-xs text-ink-muted">{a.doctor?.specialization}</p>
              </div>
            )
          } },
          { key: 'reason', header: 'Reason', render: (row) => {
            const a = row as unknown as Appointment
            return <span className="text-sm text-ink-muted">{a.status === 'CANCELLED' ? `Cancelled: ${a.cancelReason ?? '—'}` : a.reason || '—'}</span>
          } },
          { key: 'status', header: 'Status', render: (row) => <StatusBadge status={(row as unknown as Appointment).status} /> },
          { key: 'actions', header: '', render: (row) => actions(row as unknown as Appointment) },
        ]}
      />
    </div>
  )
}

// ─── Week calendar ───────────────────────────────────────────────────────────

function WeekView({ doctors, defaultDoctorId, canBook, onBook, onOpen }: {
  readonly doctors: Doctor[]
  readonly defaultDoctorId?: number
  readonly canBook: (doctorId?: number) => boolean
  readonly onBook: (doctorId: number, date: string, time: string) => void
  readonly onOpen: (a: Appointment) => void
}) {
  const [doctorId, setDoctorId] = useState<number | undefined>(defaultDoctorId)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const doctor = doctors.find((d) => d.id === (doctorId ?? doctors[0]?.id))
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const { data } = useQuery({
    enabled: !!doctor,
    queryKey: ['appointments', 'week', doctor?.id, format(weekStart, DAY)],
    queryFn: async () => (await appointmentApi.list({
      doctorId: doctor!.id, from: format(weekStart, DAY), to: format(addDays(weekStart, 6), DAY),
      status: ACTIVE, size: 500, sort: 'appointmentDate,asc',
    })).data.data.content,
  })

  const times = useMemo(() => {
    if (!doctor) return []
    const out: string[] = []
    for (let m = minutes(doctor.workStart); m + doctor.slotMinutes <= minutes(doctor.workEnd); m += doctor.slotMinutes) {
      out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
    }
    return out
  }, [doctor])
  // ponytail: bookings placed by exact start time; legacy off-grid times don't show here (they do in List)
  const byStart = new Map((data ?? []).map((a) => [a.appointmentDate.slice(0, 16), a]))
  const now = new Date()
  const works = (d: Date) => !!doctor?.workDays.includes(format(d, 'EEE').toUpperCase())
  const bookable = !!doctor && canBook(doctor.id)

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-64">
          <Select label="Doctor" value={doctor?.id ?? ''} onChange={(e) => setDoctorId(Number(e.target.value))}
            options={doctors.map((d) => ({ value: d.id, label: d.name }))} />
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setWeekStart((w) => addWeeks(w, -1))} aria-label="Previous week">
            <ChevronLeft size={15} aria-hidden="true" />
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>This week</Button>
          <Button size="sm" variant="secondary" onClick={() => setWeekStart((w) => addWeeks(w, 1))} aria-label="Next week">
            <ChevronRight size={15} aria-hidden="true" />
          </Button>
          <span className="ml-2 text-sm font-semibold text-ink">
            {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </span>
        </div>
      </div>
      {doctor && (
        <p className="text-xs text-ink-muted">
          Hours {doctor.workStart.slice(0, 5)}–{doctor.workEnd.slice(0, 5)} · {doctor.slotMinutes}-minute slots · {doctor.workDays.split(',').join(', ')}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-1 text-xs">
          <caption className="sr-only">Weekly schedule for {doctor?.name}</caption>
          <thead>
            <tr>
              <th scope="col" className="w-16" />
              {days.map((d) => (
                <th key={d.toISOString()} scope="col" aria-current={isToday(d) ? 'date' : undefined}
                  className={cn('rounded-lg py-2 font-semibold', isToday(d) ? 'bg-primary text-white' : 'text-ink-muted')}>
                  {format(d, 'EEE d')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {times.map((t) => (
              <tr key={t}>
                <th scope="row" className="pr-2 text-right font-normal tabular-nums text-ink-muted">{t}</th>
                {days.map((d) => {
                  const key = `${format(d, DAY)}T${t}`
                  const a = byStart.get(key)
                  const start = parseISO(`${key}:00`)
                  if (!works(d)) return <td key={key} className="rounded-lg bg-surface-alt" aria-label="Not working" />
                  if (a) {
                    return (
                      <td key={key}>
                        <button onClick={() => onOpen(a)}
                          className={cn('w-full truncate rounded-lg px-2 py-1.5 text-left font-medium',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                            a.status === 'COMPLETED' ? 'bg-mint-light text-success-ink'
                              : a.status === 'CHECKED_IN' || a.status === 'IN_CONSULTATION' ? 'bg-primary text-white'
                              : 'bg-primary-100 text-primary-800')}>
                          {a.patient?.name}
                          <span className="sr-only">, {format(start, 'EEEE h:mm a')}, {pretty(a.status)}</span>
                        </button>
                      </td>
                    )
                  }
                  const free = start > now
                  return (
                    <td key={key}>
                      {free && bookable ? (
                        <button onClick={() => onBook(doctor!.id, format(d, DAY), t)}
                          className="w-full rounded-lg border border-dashed border-primary-200 py-1.5 text-primary-700 opacity-60 hover:bg-primary-50 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
                          <span aria-hidden="true">+</span>
                          <span className="sr-only">Book {format(start, 'EEEE MMM d, h:mm a')}</span>
                        </button>
                      ) : <span className="block py-1.5" />}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Book / reschedule ───────────────────────────────────────────────────────

function BookingModal({ state, doctors, lockDoctor, onClose }: {
  readonly state: BookingState; readonly doctors: Doctor[]; readonly lockDoctor: boolean; readonly onClose: () => void
}) {
  const qc = useQueryClient()
  const appt = state.appt
  const [patientId, setPatientId] = useState(state.patientId ? String(state.patientId) : '')
  const [doctorId, setDoctorId] = useState(state.doctorId ? String(state.doctorId) : '')
  const [date, setDate] = useState(state.date ?? '')
  const [slot, setSlot] = useState(state.date && state.time ? `${state.date}T${state.time}:00` : '')
  const [reason, setReason] = useState('')

  const { data: patients = [] } = useQuery({
    enabled: !appt,
    queryKey: ['patients-list'],
    // ponytail: first 100 patients — switch to a search box past that
    queryFn: async () => (await patientApi.list(undefined, 0, 100)).data.data.content,
  })
  const { data: slots, isFetching } = useQuery({
    enabled: !!doctorId && !!date,
    queryKey: ['appointments', 'slots', doctorId, date],
    queryFn: async () => (await appointmentApi.slots(Number(doctorId), date)).data.data,
  })

  const save = useMutation({
    mutationFn: () => appt
      ? appointmentApi.update(appt.id, { appointmentDate: slot })
      : appointmentApi.create(Number(patientId), Number(doctorId), slot, reason || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['today-appointments'] })
      toast.success(appt ? 'Appointment rescheduled' : 'Appointment booked')
      onClose()
    },
    onError: () => qc.invalidateQueries({ queryKey: ['appointments', 'slots'] }), // slot may have just gone
  })

  return (
    <Modal open onClose={onClose} title={appt ? 'Reschedule appointment' : state.patientId ? 'Book follow-up' : 'New appointment'} size="lg">
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
        {appt ? (
          <p className="rounded-xl bg-surface-alt p-3 text-sm text-ink">
            <strong>{appt.patient?.name}</strong> with {appt.doctor?.name}<br />
            <span className="text-ink-muted">Currently {format(parseISO(appt.appointmentDate), 'EEE, MMM d · h:mm a')}</span>
          </p>
        ) : (
          <>
            <Select label="Patient" required value={patientId} disabled={!!state.patientId} onChange={(e) => setPatientId(e.target.value)}
              options={patients.map((p) => ({ value: p.id, label: p.name }))} />
            <Select label="Doctor" required value={doctorId} disabled={lockDoctor}
              onChange={(e) => { setDoctorId(e.target.value); setSlot('') }}
              options={doctors.map((d) => ({ value: d.id, label: `${d.name}${d.specialization ? ` — ${d.specialization}` : ''}` }))} />
          </>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="appt-date" className="text-sm font-medium text-ink">Date</label>
          <input id="appt-date" type="date" required className="input" min={format(new Date(), DAY)} value={date}
            onChange={(e) => { setDate(e.target.value); setSlot('') }} />
        </div>

        {doctorId && date && (
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-ink">Available times</legend>
            {isFetching ? <p className="text-sm text-ink-muted">Loading…</p>
              : !slots?.length ? <p className="text-sm text-ink-muted">No free slots that day (doctor off, fully booked, or past).</p>
              : (
                <div className="flex flex-wrap gap-2">
                  {slots.map((s) => (
                    <button key={s} type="button" onClick={() => setSlot(s)} aria-pressed={slot === s}
                      className={cn('rounded-lg px-3 py-1.5 text-sm font-medium tabular-nums transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                        slot === s ? 'bg-primary text-white' : 'bg-primary-50 text-primary-700 hover:bg-primary-100')}>
                      {format(parseISO(s), 'h:mm a')}
                    </button>
                  ))}
                </div>
              )}
          </fieldset>
        )}

        {!appt && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="appt-reason" className="text-sm font-medium text-ink">Reason (optional)</label>
            <textarea id="appt-reason" rows={2} className="input resize-none" value={reason}
              onChange={(e) => setReason(e.target.value)} placeholder="Reason for visit…" />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
          <Button type="submit" disabled={!slot || (!appt && !patientId)} loading={save.isPending}>
            {appt ? 'Reschedule' : 'Book appointment'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Cancel / details ────────────────────────────────────────────────────────

function CancelForm({ appt, pending, onSubmit, onClose }: {
  readonly appt: Appointment; readonly pending: boolean
  readonly onSubmit: (note: string) => void; readonly onClose: () => void
}) {
  const [note, setNote] = useState('')
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(note.trim()) }}>
      <p className="text-sm text-ink">
        {appt.patient?.name} with {appt.doctor?.name}, {format(parseISO(appt.appointmentDate), 'EEE, MMM d · h:mm a')}.
        The slot becomes free again; the appointment stays in the record.
      </p>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cancel-note" className="text-sm font-medium text-ink">Reason (required)</label>
        <textarea id="cancel-note" required rows={3} className="input resize-none" value={note}
          onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onClose}>Keep appointment</Button>
        <Button type="submit" variant="danger" disabled={!note.trim()} loading={pending}>Cancel appointment</Button>
      </div>
    </form>
  )
}

function DetailsPanel({ appt, editable, onSaved }: {
  readonly appt: Appointment; readonly editable: boolean; readonly onSaved: () => void
}) {
  const qc = useQueryClient()
  const [reason, setReason] = useState(appt.reason ?? '')
  const [notes, setNotes] = useState(appt.notes ?? '')
  const { data: history = [] } = useQuery({
    queryKey: ['appointments', 'history', appt.id],
    queryFn: async () => (await appointmentApi.history(appt.id)).data.data,
  })
  const save = useMutation({
    mutationFn: () => appointmentApi.update(appt.id, { reason, notes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appointments'] }); toast.success('Saved'); onSaved() },
  })
  const start = parseISO(appt.appointmentDate)

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3 text-sm">
        {[
          ['Patient', appt.patient?.name], ['Doctor', appt.doctor?.name],
          ['When', `${format(start, 'EEE, MMM d, yyyy · h:mm a')} (${appt.durationMinutes} min)`],
          ['Status', pretty(appt.status)],
          ...(appt.cancelReason ? [['Cancel reason', appt.cancelReason]] : []),
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-ink-muted">{k}</dt>
            <dd className="font-medium text-ink">{v ?? '—'}</dd>
          </div>
        ))}
      </dl>

      {editable ? (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="d-reason" className="text-sm font-medium text-ink">Reason</label>
            <textarea id="d-reason" rows={2} className="input resize-none" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="d-notes" className="text-sm font-medium text-ink">Notes</label>
            <textarea id="d-notes" rows={3} className="input resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex justify-end"><Button type="submit" loading={save.isPending}>Save changes</Button></div>
        </form>
      ) : (
        <div className="space-y-1 text-sm">
          <p><span className="text-ink-muted">Reason:</span> {appt.reason || '—'}</p>
          <p><span className="text-ink-muted">Notes:</span> {appt.notes || '—'}</p>
        </div>
      )}

      <section aria-labelledby="hist-title">
        <h3 id="hist-title" className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">History</h3>
        {history.length === 0 ? <p className="text-sm text-ink-muted">No recorded changes (booked before history tracking).</p> : (
          <ol className="space-y-2 border-l-2 border-primary-100 pl-4">
            {history.map((h, i) => (
              <li key={i} className="text-sm">
                <p className="text-ink">
                  {h.action === 'STATUS' ? `${pretty(h.from_status!)} → ${pretty(h.to_status!)}` : pretty(h.action)}
                  {h.note && <span className="text-ink-muted"> — {h.note}</span>}
                </p>
                <p className="text-xs text-ink-muted">{h.changed_by} · {format(parseISO(h.changed_at), 'MMM d, yyyy h:mm a')}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
