import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ArrowRightLeft, LogOut, Printer, Pill, StopCircle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format, parseISO, differenceInYears } from 'date-fns'
import { admissionApi, authApi, roomApi } from '@/api/endpoints'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/utils/cn'
import toast from 'react-hot-toast'
import type { Admission, AdmissionEvent, MedOrder, StayRecord, UserRole } from '@/types'
import { esc, printHtml } from '@/utils/print'

const h3 = 'mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted'
const fmt = (iso?: string | null, f = 'MMM d, h:mm a') => (iso ? format(parseISO(iso), f) : '—')
const MOVERS = new Set<UserRole>(['ADMIN', 'RECEPTIONIST', 'NURSE', 'DOCTOR'])
const CLINICAL = new Set<UserRole>(['ADMIN', 'DOCTOR', 'NURSE'])
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/** Timeline label for a movement event. */
function eventLabel(e: AdmissionEvent): string {
  if (e.type === 'ADMITTED') return e.to_room ? 'Admitted to ' + e.to_room : 'Admitted'
  if (e.type === 'TRANSFER') return 'Transferred ' + (e.from_room ?? '—') + ' → ' + e.to_room
  return 'Discharged'
}
const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
type Tab = 'overview' | 'notes' | 'vitals' | 'meds'

/** One inpatient stay. Server enforces every rule; this only decides what to show. */
export function StayPanel({ admission, onClose }: { readonly admission: Admission; readonly onClose: () => void }) {
  const qc = useQueryClient()
  // Live copy: the prop is a snapshot from when the panel opened (stale after a transfer/discharge)
  const { data: a = admission } = useQuery({
    queryKey: ['admissions', 'one', admission.id],
    queryFn: async () => (await admissionApi.get(admission.id)).data.data,
    initialData: admission,
  })
  const role = useAuthStore((s) => s.user?.role) as UserRole | undefined
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: async () => (await authApi.me()).data.data })
  const { data: rec } = useQuery({
    queryKey: ['admissions', 'record', a.id],
    queryFn: async () => (await admissionApi.record(a.id)).data.data,
  })
  const [tab, setTab] = useState<Tab>('overview')

  const active = a.status === 'ADMITTED'
  const clinical = !!role && CLINICAL.has(role)
  const isDoctor = role === 'ADMIN' || role === 'DOCTOR'
  // Mirrors AdmissionService.requireAttending: attending doctor, or any doctor covering for one without a login
  const attending = role === 'ADMIN' || (role === 'DOCTOR' && (a.doctor?.hasLogin === false
    || (me?.linkedStaff?.type === 'DOCTOR' && me.linkedStaff.id === a.doctor?.id)))
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admissions'] })
    qc.invalidateQueries({ queryKey: ['rooms'] })
    qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
  }
  const p = a.patient
  const age = p.dob ? differenceInYears(new Date(), parseISO(p.dob)) : null

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-lg font-bold text-ink">{p.name}</p>
          <p className="text-sm text-ink-muted">
            {[age != null && `${age} y`, p.gender && p.gender.charAt(0) + p.gender.slice(1).toLowerCase(),
              p.bloodGroup && `Blood ${p.bloodGroup}`].filter(Boolean).join(' · ')}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
          {[['Status', <StatusBadge key="s" status={a.status} />], ['Room', a.room?.roomNumber ?? 'Pending bed'],
            ['Attending', a.doctor?.name], ['Stay', rec ? plural(rec.losDays, 'night') + ' · $' + rec.accruedCost : '…'],
          ].map(([k, v]) => (
            <div key={String(k)}><dt className="text-xs text-ink-muted">{k}</dt><dd className="font-medium text-ink">{v}</dd></div>
          ))}
        </dl>
      </div>
      {(p.allergies || p.conditions) && (
        <p className="flex flex-wrap items-center gap-2 rounded-xl bg-danger-light px-4 py-2 text-sm text-danger-ink" role="note">
          <AlertTriangle size={15} aria-hidden="true" />
          {p.allergies && <span><strong>Allergies:</strong> {p.allergies}</span>}
          {p.conditions && <span><strong>Conditions:</strong> {p.conditions}</span>}
        </p>
      )}

      {/* Tabs */}
      <fieldset className="flex flex-wrap gap-1 border-b border-border">
        <legend className="sr-only">Stay sections</legend>
        {([['overview', 'Overview'], ...(clinical ? [['notes', 'Progress notes'], ['vitals', 'Vitals'], ['meds', 'Medications']] : [])] as [Tab, string][])
          .map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} aria-pressed={tab === t}
              className={cn('-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                tab === t ? 'border-primary text-primary-700' : 'border-transparent text-ink-muted hover:text-ink')}>
              {label}
            </button>
          ))}
      </fieldset>

      {!rec ? <p className="text-sm text-ink-muted">Loading…</p> : (
        <>
          {tab === 'overview' && <Overview a={a} rec={rec} canMove={!!role && MOVERS.has(role) && active}
            canDischarge={attending && active} clinical={clinical} onChanged={refresh} onClose={onClose} />}
          {tab === 'notes' && <Notes id={a.id} rec={rec} active={active} />}
          {tab === 'vitals' && <Vitals id={a.id} rec={rec} active={active} />}
          {tab === 'meds' && <Meds id={a.id} rec={rec} active={active} canOrder={isDoctor} />}
        </>
      )}
    </div>
  )
}

// ─── Overview: timeline, transfer, discharge ─────────────────────────────────

function Overview({ a, rec, canMove, canDischarge, clinical, onChanged, onClose }: {
  readonly a: Admission; readonly rec: StayRecord; readonly canMove: boolean; readonly canDischarge: boolean
  readonly clinical: boolean; readonly onChanged: () => void; readonly onClose: () => void
}) {
  const [mode, setMode] = useState<'none' | 'transfer' | 'discharge'>('none')
  const moves = rec.events.filter((e) => e.type !== 'NOTE' && e.type !== 'ADDENDUM')

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <section aria-labelledby="tl-title">
        <h3 id="tl-title" className={h3}>Timeline</h3>
        <ol className="space-y-3 border-l-2 border-primary-100 pl-4">
          {moves.map((e) => (
            <li key={e.id} className="text-sm">
              <p className="font-medium text-ink">
                {eventLabel(e)}
              </p>
              {e.note && <p className="text-ink-muted">{e.note}</p>}
              <p className="text-xs text-ink-muted">{e.author} · {fmt(e.created_at, 'MMM d, yyyy h:mm a')}</p>
            </li>
          ))}
        </ol>
        {a.diagnosis && <p className="mt-3 text-sm"><span className="text-ink-muted">Admitting diagnosis:</span> {a.diagnosis}</p>}
      </section>

      <section className="space-y-4">
        {a.status !== 'ADMITTED' && clinical && (
          <div className="space-y-2 rounded-xl bg-surface-alt p-4 text-sm">
            <div className="flex items-center justify-between">
              <h3 className={h3}>Discharge summary</h3>
              <Button size="sm" variant="ghost" icon={<Printer size={13} />} onClick={() => printSummary(a, rec)}>Print</Button>
            </div>
            <p><span className="text-ink-muted">Final diagnosis:</span> <strong>{rec.finalDiagnosis}</strong></p>
            <p className="whitespace-pre-wrap">{rec.dischargeSummary}</p>
            {rec.dischargeInstructions && <p className="whitespace-pre-wrap"><span className="text-ink-muted">Instructions:</span> {rec.dischargeInstructions}</p>}
            {a.billId && <p className="text-xs text-ink-muted">Room charges billed as bill #{a.billId}.</p>}
          </div>
        )}
        {(canMove || canDischarge) && mode === 'none' && (
          <div className="flex flex-wrap gap-2">
            {canMove && <Button variant="secondary" icon={<ArrowRightLeft size={14} />} onClick={() => setMode('transfer')}>Transfer</Button>}
            {canDischarge && <Button icon={<LogOut size={14} />} onClick={() => setMode('discharge')}>Discharge</Button>}
          </div>
        )}
        {mode === 'transfer' && <TransferForm a={a} onDone={() => { setMode('none'); onChanged() }} onCancel={() => setMode('none')} />}
        {mode === 'discharge' && <DischargeForm a={a} onDone={() => { onChanged(); onClose() }} onCancel={() => setMode('none')} />}
      </section>
    </div>
  )
}

function TransferForm({ a, onDone, onCancel }: { readonly a: Admission; readonly onDone: () => void; readonly onCancel: () => void }) {
  const [roomId, setRoomId] = useState('')
  const [note, setNote] = useState('')
  const { data: board = [] } = useQuery({ queryKey: ['rooms', 'board'], queryFn: async () => (await roomApi.board()).data.data })
  const free = board.filter((b) => b.room.id !== a.room?.id && b.room.status !== 'MAINTENANCE' && b.occupants.length < b.room.capacity)
  const move = useMutation({
    mutationFn: () => admissionApi.transfer(a.id, Number(roomId), note || undefined),
    onSuccess: () => { toast.success('Patient transferred'); onDone() },
  })
  return (
    <form className="space-y-3 rounded-xl border border-border p-4" onSubmit={(e) => { e.preventDefault(); move.mutate() }}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="tr-room" className="text-sm font-medium text-ink">Move to</label>
        <select id="tr-room" required className="input" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
          <option value="">Select a room with a free bed…</option>
          {free.map((b) => (
            <option key={b.room.id} value={b.room.id}>
              {b.room.roomNumber} · {b.room.roomType.toLowerCase()} · {b.room.capacity - b.occupants.length}/{b.room.capacity} free
            </option>
          ))}
        </select>
      </div>
      <input aria-label="Reason" className="input" placeholder="Reason (e.g. step-down from ICU)" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={!roomId} loading={move.isPending}>Transfer</Button>
      </div>
    </form>
  )
}

function DischargeForm({ a, onDone, onCancel }: { readonly a: Admission; readonly onDone: () => void; readonly onCancel: () => void }) {
  const [finalDiagnosis, setFinalDiagnosis] = useState(a.diagnosis ?? '')
  const [summary, setSummary] = useState('')
  const [instructions, setInstructions] = useState('')
  const go = useMutation({
    mutationFn: () => admissionApi.discharge(a.id, { finalDiagnosis, summary, instructions: instructions || undefined }),
    onSuccess: (r) => {
      toast.success(r.data.data.billId ? `Discharged — bill #${r.data.data.billId} created` : 'Patient discharged')
      onDone()
    },
  })
  return (
    <form className="space-y-3 rounded-xl border border-border p-4" onSubmit={(e) => { e.preventDefault(); go.mutate() }}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="dc-dx" className="text-sm font-medium text-ink">Final diagnosis</label>
        <input id="dc-dx" required className="input" value={finalDiagnosis} onChange={(e) => setFinalDiagnosis(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="dc-sum" className="text-sm font-medium text-ink">Summary (course &amp; treatment)</label>
        <textarea id="dc-sum" required rows={4} className="input" value={summary} onChange={(e) => setSummary(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="dc-ins" className="text-sm font-medium text-ink">Take-home instructions</label>
        <textarea id="dc-ins" rows={2} className="input" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
      </div>
      <p className="text-xs text-ink-muted">The summary locks after discharge (addenda only). Room nights are billed automatically.</p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={!finalDiagnosis.trim() || !summary.trim()} loading={go.isPending}>Discharge patient</Button>
      </div>
    </form>
  )
}

// ─── Progress notes ──────────────────────────────────────────────────────────

function Notes({ id, rec, active }: { readonly id: number; readonly rec: StayRecord; readonly active: boolean }) {
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const notes = rec.events.filter((e) => e.type === 'NOTE' || e.type === 'ADDENDUM').reverse()
  const add = useMutation({
    mutationFn: () => admissionApi.note(id, text.trim()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admissions', 'record', id] }); setText(''); toast.success(active ? 'Note added' : 'Addendum added') },
  })
  return (
    <div className="space-y-4">
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); add.mutate() }}>
        <textarea aria-label={active ? 'Progress note' : 'Addendum'} rows={2} className="input flex-1" value={text}
          placeholder={active ? 'Progress note…' : 'Addendum to the closed stay…'} onChange={(e) => setText(e.target.value)} />
        <Button type="submit" disabled={!text.trim()} loading={add.isPending}>Add</Button>
      </form>
      {notes.length === 0 ? <p className="text-sm text-ink-muted">No notes yet.</p> : (
        <ol className="space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="rounded-xl border border-border p-3 text-sm">
              <p className="text-xs text-ink-muted">{n.type === 'ADDENDUM' ? 'Addendum · ' : ''}{n.author} · {fmt(n.created_at, 'MMM d, yyyy h:mm a')}</p>
              <p className="whitespace-pre-wrap text-ink">{n.note}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

// ─── Vitals ──────────────────────────────────────────────────────────────────

const VITALS = [
  ['tempC', 'Temp °C', 'temp_c', '0.1'], ['systolic', 'Systolic', 'systolic', '1'], ['diastolic', 'Diastolic', 'diastolic', '1'],
  ['pulse', 'Pulse', 'pulse', '1'], ['respRate', 'Resp/min', 'resp_rate', '1'], ['spo2', 'SpO₂ %', 'spo2', '1'], ['pain', 'Pain 0–10', 'pain', '1'],
] as const

function Vitals({ id, rec, active }: { readonly id: number; readonly rec: StayRecord; readonly active: boolean }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Record<string, string>>({})
  const rows = rec.vitals ?? []
  const save = useMutation({
    mutationFn: () => admissionApi.vitals(id, Object.fromEntries(
      Object.entries(form).filter(([, v]) => v !== '').map(([k, v]) => [k, Number(v)]))),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admissions', 'record', id] }); setForm({}); toast.success('Vitals recorded') },
  })
  const chart = rows.map((v) => ({ t: fmt(v.recorded_at), temp: v.temp_c, pulse: v.pulse, spo2: v.spo2 }))

  return (
    <div className="space-y-5">
      {active && (
        <form className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
          {VITALS.map(([k, label, , step]) => (
            <div key={k} className="flex flex-col gap-1">
              <label htmlFor={`v-${k}`} className="text-xs text-ink-muted">{label}</label>
              <input id={`v-${k}`} type="number" step={step} className="input px-2" value={form[k] ?? ''}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            </div>
          ))}
          <div className="flex items-end">
            <Button type="submit" className="w-full" loading={save.isPending}
              disabled={!Object.values(form).some((v) => v !== '')}>Record</Button>
          </div>
        </form>
      )}
      {rows.length === 0 ? <p className="text-sm text-ink-muted">No vitals recorded.</p> : (
        <>
          <div className="h-48" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E8F5" vertical={false} />
                <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#646C8F' }} />
                <YAxis yAxisId="l" domain={[34, 41]} tick={{ fontSize: 10, fill: '#646C8F' }} />
                <YAxis yAxisId="r" orientation="right" domain={[40, 160]} tick={{ fontSize: 10, fill: '#646C8F' }} />
                <Tooltip />
                <Line yAxisId="l" dataKey="temp" name="Temp °C" stroke="#F26D6D" strokeWidth={2} connectNulls isAnimationActive={!reduceMotion} />
                <Line yAxisId="r" dataKey="pulse" name="Pulse" stroke="#4C6FDB" strokeWidth={2} connectNulls isAnimationActive={!reduceMotion} />
                <Line yAxisId="r" dataKey="spo2" name="SpO₂" stroke="#1FA98F" strokeWidth={2} connectNulls isAnimationActive={!reduceMotion} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Vitals history</caption>
              <thead className="text-xs text-ink-muted">
                <tr><th scope="col" className="py-1">Time</th>{VITALS.map(([k, label]) => <th key={k} scope="col">{label}</th>)}<th scope="col">By</th></tr>
              </thead>
              <tbody>
                {[...rows].reverse().map((v) => (
                  <tr key={v.id} className="border-t border-border">
                    <td className="py-1.5 tabular-nums">{fmt(v.recorded_at)}</td>
                    {VITALS.map(([k, , col]) => <td key={k} className="tabular-nums">{v[col] ?? '—'}</td>)}
                    <td className="text-ink-muted">{v.author}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Medications & administration record ─────────────────────────────────────

function Meds({ id, rec, active, canOrder }: {
  readonly id: number; readonly rec: StayRecord; readonly active: boolean; readonly canOrder: boolean
}) {
  const qc = useQueryClient()
  const [m, setM] = useState({ medication: '', dosage: '', route: '', frequency: '' })
  const reload = () => qc.invalidateQueries({ queryKey: ['admissions', 'record', id] })
  const order = useMutation({
    mutationFn: () => admissionApi.orderMed(id, m),
    onSuccess: () => { reload(); setM({ medication: '', dosage: '', route: '', frequency: '' }); toast.success('Medication ordered') },
  })
  const orders = rec.medications ?? []

  return (
    <div className="space-y-5">
      {active && canOrder && (
        <form className="grid grid-cols-2 gap-2 sm:grid-cols-5" onSubmit={(e) => { e.preventDefault(); order.mutate() }}>
          {(['medication', 'dosage', 'route', 'frequency'] as const).map((f) => (
            <input key={f} aria-label={f} required={f === 'medication'} placeholder={f === 'route' ? 'Route (PO, IV…)' : f[0].toUpperCase() + f.slice(1)}
              className={cn('input', f === 'medication' && 'col-span-2 sm:col-span-1')} value={m[f]} onChange={(e) => setM({ ...m, [f]: e.target.value })} />
          ))}
          <Button type="submit" icon={<Pill size={14} />} loading={order.isPending} disabled={!m.medication.trim()}>Order</Button>
        </form>
      )}
      {orders.length === 0 ? <p className="text-sm text-ink-muted">No medications ordered.</p> : (
        <ul className="space-y-3">
          {orders.map((o) => <MedRow key={o.id} o={o} active={active && !o.stopped_at} canStop={canOrder} onChange={reload} />)}
        </ul>
      )}
    </div>
  )
}

function MedRow({ o, active, canStop, onChange }: {
  readonly o: MedOrder; readonly active: boolean; readonly canStop: boolean; readonly onChange: () => void
}) {
  const [note, setNote] = useState('')
  const give = useMutation({
    mutationFn: (status: 'GIVEN' | 'HELD' | 'REFUSED') => admissionApi.administer(o.id, status, note || undefined),
    onSuccess: (_r, s) => { onChange(); setNote(''); toast.success(`Dose ${s.toLowerCase()}`) },
  })
  const stop = useMutation({ mutationFn: () => admissionApi.stopMed(o.id), onSuccess: () => { onChange(); toast.success('Medication stopped') } })
  const last = o.administrations[0]

  return (
    <li className={cn('rounded-xl border border-border p-3 text-sm', !active && 'opacity-70')}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-ink">{o.medication} <span className="font-normal text-ink-muted">{[o.dosage, o.route, o.frequency].filter(Boolean).join(' · ')}</span></p>
          <p className="text-xs text-ink-muted">
            Ordered by {o.ordered_by} {fmt(o.ordered_at)}{o.stopped_at && ' · stopped by ' + o.stopped_by + ' ' + fmt(o.stopped_at)}
          </p>
          <p className="text-xs text-ink-muted">
            {last ? doseLine(last, 'Last: ') : 'No doses recorded'}
          </p>
        </div>
        {active && (
          <div className="flex flex-wrap items-center gap-1">
            <input aria-label={`Note for ${o.medication}`} className="input w-40 py-1.5 text-xs" placeholder="Note (held/refused)"
              value={note} onChange={(e) => setNote(e.target.value)} />
            <Button size="sm" onClick={() => give.mutate('GIVEN')} loading={give.isPending}>Given</Button>
            <Button size="sm" variant="secondary" onClick={() => give.mutate('HELD')} disabled={!note.trim()}>Held</Button>
            <Button size="sm" variant="secondary" onClick={() => give.mutate('REFUSED')} disabled={!note.trim()}>Refused</Button>
            {canStop && <Button size="sm" variant="ghost" icon={<StopCircle size={13} />} onClick={() => stop.mutate()}>Stop</Button>}
          </div>
        )}
      </div>
      {o.administrations.length > 1 && (
        <details className="mt-2 text-xs text-ink-muted">
          <summary className="cursor-pointer">All {o.administrations.length} doses</summary>
          <ul className="mt-1 space-y-0.5">
            {o.administrations.map((d) => <li key={d.given_at + d.given_by}>{doseLine(d)}</li>)}
          </ul>
        </details>
      )}
    </li>
  )
}

type Dose = MedOrder['administrations'][number]
/** "given by nurse_ali Oct 26, 9:49 PM — note" */
function doseLine(d: Dose, prefix = ''): string {
  return prefix + d.status.toLowerCase() + ' by ' + d.given_by + ' ' + fmt(d.given_at) + (d.note ? ' — ' + d.note : '')
}

function printSummary(a: Admission, rec: StayRecord) {
  const para = (label: string, value?: string | null) =>
    '<p><b>' + label + ':</b><br>' + esc(value).replace(/\n/g, '<br>') + '</p>'
  const allergies = a.patient.allergies ? ' — <b>Allergies:</b> ' + esc(a.patient.allergies) : ''
  const ok = printHtml('Discharge summary — ' + a.patient.name,
    '<h1>Discharge summary</h1>'
    + '<p><b>Patient:</b> ' + esc(a.patient.name) + allergies + '</p>'
    + '<p><b>Admitted:</b> ' + esc(fmt(a.admissionDate, 'MMM d, yyyy')) + ' · <b>Discharged:</b> '
    + esc(fmt(a.dischargeDate, 'MMM d, yyyy')) + ' · ' + plural(rec.losDays, 'night') + '</p>'
    + '<p><b>Attending:</b> ' + esc(a.doctor?.name) + '</p>'
    + '<p><b>Final diagnosis:</b> ' + esc(rec.finalDiagnosis) + '</p>'
    + para('Summary', rec.dischargeSummary)
    + (rec.dischargeInstructions ? para('Instructions', rec.dischargeInstructions) : '')
    + '<p class="sign">Signature: ______________________</p>')
  if (!ok) toast.error('Allow pop-ups to print')
}
