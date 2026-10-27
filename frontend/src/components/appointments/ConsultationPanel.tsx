import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Plus, Printer, Trash2, Play, CheckCircle2, FlaskConical, CalendarPlus, BedDouble } from 'lucide-react'
import { differenceInYears, differenceInMinutes, format, parseISO } from 'date-fns'
import { appointmentApi, labApi } from '@/api/endpoints'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { esc, printHtml } from '@/utils/print'
import toast from 'react-hot-toast'
import type { Appointment, Patient, PastVisit, LabTest, RxItem, Visit } from '@/types'

const h3 = 'mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted'
const fmt = (iso?: string | null, f = 'MMM d, yyyy h:mm a') => (iso ? format(parseISO(iso), f) : '—')

/** Prescription line + a client-only key, so React keeps inputs attached to the right row when one is removed. */
type RxRow = RxItem & { key: number }
let nextRxKey = 1
const toRow = (r: RxItem): RxRow => ({ ...r, key: nextRxKey++ })
const emptyRx = (): RxRow => toRow({ medication: '', dosage: '', frequency: '', duration: '', instructions: '' })
const stripKey = ({ key: _k, ...r }: RxRow): RxItem => r

const ageOf = (p: Patient) => (p.dob ? differenceInYears(new Date(), parseISO(p.dob)) : null)

/**
 * The doctor's view of a visit: patient context on the right, documentation & orders on the left.
 * `canDocument` = treating/covering doctor or admin; everyone else (e.g. nurses) gets it read-only.
 */
export function ConsultationPanel({ appt, canDocument, onFollowUp, onAdmit, onDone }: {
  readonly appt: Appointment
  readonly canDocument: boolean
  readonly onFollowUp: (weeks: number) => void
  readonly onAdmit: (diagnosis: string) => void
  readonly onDone: () => void
}) {
  const qc = useQueryClient()
  const editable = canDocument && (appt.status === 'CHECKED_IN' || appt.status === 'IN_CONSULTATION')
  const inRoom = appt.status === 'IN_CONSULTATION'

  const { data: visit } = useQuery({
    queryKey: ['appointments', 'visit', appt.id],
    queryFn: async () => (await appointmentApi.visit(appt.id)).data.data,
  })

  const [diagnosis, setDiagnosis] = useState('')
  const [note, setNote] = useState('')
  const [rx, setRx] = useState<RxRow[]>([])
  // Seed the form once. Later refetches (after a lab order / Rx save) must not wipe unsaved typing.
  const seeded = useRef(false)
  useEffect(() => {
    if (!visit || seeded.current) return
    seeded.current = true
    setDiagnosis(visit.diagnosis ?? '')
    setNote(visit.visitNote ?? '')
    setRx(visit.prescription.map(toRow))
  }, [visit])

  const start = useMutation({
    mutationFn: () => appointmentApi.changeStatus(appt.id, 'IN_CONSULTATION'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['today-appointments'] })
      toast.success('Consultation started')
      onDone()
    },
  })
  const waited = appt.checkedInAt && appt.startedAt
    ? differenceInMinutes(parseISO(appt.startedAt), parseISO(appt.checkedInAt)) : null

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-ink">
            <StatusBadge status={appt.status} />
            <span className="ml-2 text-ink-muted">
              {fmt(appt.appointmentDate)} · {appt.doctor?.name}
              {waited != null && ` · waited ${waited} min`}
            </span>
          </div>
          {canDocument && appt.status === 'CHECKED_IN' && (
            <Button onClick={() => start.mutate()} loading={start.isPending} icon={<Play size={14} />}>Start consultation</Button>
          )}
        </div>

        <Documentation appt={appt} visit={visit} editable={editable} inRoom={inRoom}
          diagnosis={diagnosis} setDiagnosis={setDiagnosis} note={note} setNote={setNote} onDone={onDone} />

        {appt.status === 'COMPLETED' && <Addenda apptId={appt.id} entries={visit?.addenda ?? []} canAdd={canDocument} />}

        <Prescription appt={appt} visit={visit} rows={rx} setRows={setRx} editable={editable} />

        {editable && <LabOrder appt={appt} />}

        {canDocument && (inRoom || appt.status === 'COMPLETED') && (
          <section aria-labelledby="fu-title">
            <h3 id="fu-title" className={h3}>Follow-up</h3>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 4].map((w) => (
                <Button key={w} size="sm" variant="secondary" onClick={() => onFollowUp(w)} icon={<CalendarPlus size={13} />}>
                  In {w} week{w > 1 ? 's' : ''}
                </Button>
              ))}
              <Button size="sm" variant="secondary" onClick={() => onAdmit(diagnosis || visit?.diagnosis || '')} icon={<BedDouble size={13} />}>
                Admit patient
              </Button>
            </div>
          </section>
        )}
      </div>

      <PatientContext patient={appt.patient} apptId={appt.id} />
    </div>
  )
}

// ─── Documentation ───────────────────────────────────────────────────────────

function Documentation({ appt, visit, editable, inRoom, diagnosis, setDiagnosis, note, setNote, onDone }: {
  readonly appt: Appointment; readonly visit?: Visit; readonly editable: boolean; readonly inRoom: boolean
  readonly diagnosis: string; readonly setDiagnosis: (v: string) => void
  readonly note: string; readonly setNote: (v: string) => void; readonly onDone: () => void
}) {
  const qc = useQueryClient()
  const saveNote = () => appointmentApi.saveVisit(appt.id, { diagnosis, visitNote: note })
  const save = useMutation({
    mutationFn: saveNote,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appointments', 'visit', appt.id] }); toast.success('Note saved') },
  })
  const complete = useMutation({
    mutationFn: async () => { await saveNote(); return appointmentApi.changeStatus(appt.id, 'COMPLETED') },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['today-appointments'] })
      qc.invalidateQueries({ queryKey: ['bills'] })
      toast.success('Visit completed')
      onDone()
    },
  })
  const missing = !diagnosis.trim() || !note.trim()

  if (!editable) {
    return (
      <section aria-labelledby="doc-title">
        <h3 id="doc-title" className={h3}>Visit documentation</h3>
        <div className="space-y-2 rounded-xl bg-surface-alt p-4 text-sm">
          <p><span className="text-ink-muted">Diagnosis:</span> <strong>{visit?.diagnosis || '—'}</strong></p>
          <p className="whitespace-pre-wrap text-ink">{visit?.visitNote || <span className="text-ink-muted">No visit note.</span>}</p>
          {appt.status === 'COMPLETED' && <p className="text-xs text-ink-muted">Locked {fmt(appt.completedAt)}</p>}
        </div>
      </section>
    )
  }
  return (
    <section aria-labelledby="doc-title">
      <h3 id="doc-title" className={h3}>Visit documentation</h3>
      <div className="space-y-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="c-dx" className="text-sm font-medium text-ink">Diagnosis</label>
          <input id="c-dx" className="input" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="c-note" className="text-sm font-medium text-ink">Visit note</label>
          <textarea id="c-note" rows={6} className="input" value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="History, examination, assessment, plan…" />
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => save.mutate()} loading={save.isPending}>Save draft</Button>
          {inRoom && (
            <Button onClick={() => complete.mutate()} loading={complete.isPending} disabled={missing}
              icon={<CheckCircle2 size={14} />} title={missing ? 'Diagnosis and visit note are required' : undefined}>
              Complete visit
            </Button>
          )}
        </div>
        {inRoom && missing && (
          <p className="text-xs text-ink-muted">A diagnosis and a visit note are required to complete. The note locks after completion.</p>
        )}
      </div>
    </section>
  )
}

// ─── Prescription ────────────────────────────────────────────────────────────

const RX_FIELDS = ['medication', 'dosage', 'frequency', 'duration'] as const

function Prescription({ appt, visit, rows, setRows, editable }: {
  readonly appt: Appointment; readonly visit?: Visit; readonly rows: RxRow[]
  readonly setRows: (r: RxRow[]) => void; readonly editable: boolean
}) {
  const qc = useQueryClient()
  const saveRx = useMutation({
    mutationFn: () => appointmentApi.savePrescription(appt.id, rows.filter((r) => r.medication.trim()).map(stripKey)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appointments', 'visit', appt.id] }); toast.success('Prescription saved') },
  })
  const update = (key: number, patch: Partial<RxItem>) => setRows(rows.map((x) => (x.key === key ? { ...x, ...patch } : x)))
  const filled = rows.filter((r) => r.medication)

  function print() {
    const p = appt.patient
    const age = ageOf(p)
    const patientLine = esc(p.name) + (age == null ? '' : ` (${age} y)`)
      + (p.allergies ? ' — <b>Allergies:</b> ' + esc(p.allergies) : '')
    const dx = visit?.diagnosis ? '<p><b>Diagnosis:</b> ' + esc(visit.diagnosis) + '</p>' : ''
    const lines = filled.map((r) => '<tr>' + [r.medication, r.dosage, r.frequency, r.duration, r.instructions]
      .map((v) => '<td>' + esc(v) + '</td>').join('') + '</tr>').join('')
    const ok = printHtml('Prescription — ' + p.name,
      '<h1>Prescription</h1>'
      + '<p><b>Patient:</b> ' + patientLine + '</p>'
      + '<p><b>Prescriber:</b> ' + esc(appt.doctor?.name) + ' · <b>Date:</b> ' + esc(fmt(appt.appointmentDate, 'MMM d, yyyy')) + '</p>'
      + dx
      + '<table><tr><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Instructions</th></tr>' + lines + '</table>'
      + '<p class="sign">Signature: ______________________</p>')
    if (!ok) toast.error('Allow pop-ups to print')
  }

  let body: React.ReactNode
  if (editable) {
    body = (
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.key} className="grid grid-cols-12 gap-2">
            {RX_FIELDS.map((f) => (
              <input key={f} aria-label={`${f} ${i + 1}`} placeholder={f[0].toUpperCase() + f.slice(1)}
                className={f === 'medication' ? 'input col-span-4' : 'input col-span-2'} value={r[f] ?? ''}
                onChange={(e) => update(r.key, { [f]: e.target.value })} />
            ))}
            <button type="button" onClick={() => setRows(rows.filter((x) => x.key !== r.key))} aria-label={`Remove line ${i + 1}`}
              className="col-span-2 flex items-center justify-center rounded-xl text-ink-muted hover:bg-danger-light hover:text-danger-ink">
              <Trash2 size={14} aria-hidden="true" />
            </button>
            <input aria-label={`instructions ${i + 1}`} placeholder="Instructions (e.g. after meals)"
              className="input col-span-12" value={r.instructions ?? ''} onChange={(e) => update(r.key, { instructions: e.target.value })} />
          </div>
        ))}
        <div className="flex justify-between">
          <Button size="sm" variant="ghost" onClick={() => setRows([...rows, emptyRx()])} icon={<Plus size={13} />}>Add medication</Button>
          <Button size="sm" variant="secondary" onClick={() => saveRx.mutate()} loading={saveRx.isPending}>Save prescription</Button>
        </div>
      </div>
    )
  } else if (rows.length === 0) {
    body = <p className="text-sm text-ink-muted">None.</p>
  } else {
    body = <RxTable items={rows} />
  }

  return (
    <section aria-labelledby="rx-title">
      <div className="flex items-center justify-between">
        <h3 id="rx-title" className={h3}>Prescription</h3>
        {filled.length > 0 && <Button size="sm" variant="ghost" onClick={print} icon={<Printer size={13} />}>Print</Button>}
      </div>
      {body}
    </section>
  )
}

function RxTable({ items }: { readonly items: RxRow[] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="text-xs text-ink-muted">
        <tr><th className="py-1">Medication</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Instructions</th></tr>
      </thead>
      <tbody>
        {items.map((r) => (
          <tr key={r.key} className="border-t border-border">
            <td className="py-1.5 font-medium">{r.medication}</td><td>{r.dosage}</td><td>{r.frequency}</td>
            <td>{r.duration}</td><td>{r.instructions}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ─── Patient context ─────────────────────────────────────────────────────────

function PatientContext({ patient: p, apptId }: { readonly patient: Patient; readonly apptId: number }) {
  const { data: past = [] } = useQuery({
    queryKey: ['appointments', 'visits', p.id],
    queryFn: async () => (await appointmentApi.patientVisits(p.id)).data.data,
  })
  const { data: labs = [] } = useQuery({
    queryKey: ['lab', 'patient', p.id],
    queryFn: async () => (await labApi.byPatient(p.id)).data.data.content,
  })
  const age = ageOf(p)
  const demographics = [age != null && `${age} y`, p.gender && p.gender.charAt(0) + p.gender.slice(1).toLowerCase(),
    p.bloodGroup && `Blood ${p.bloodGroup}`].filter(Boolean).join(' · ')
  const previous = past.filter((v) => v.id !== apptId)

  return (
    <aside className="space-y-5 lg:col-span-2" aria-label="Patient context">
      <section className="rounded-2xl bg-surface-alt p-4">
        <p className="text-lg font-bold text-ink">{p.name}</p>
        <p className="text-sm text-ink-muted">{demographics || 'No demographics recorded'}</p>
        {p.phone && <p className="text-sm text-ink-muted">{p.phone}</p>}
      </section>

      {(p.allergies || p.conditions) && (
        <section className="rounded-2xl bg-danger-light p-4 text-sm text-danger-ink" aria-label="Clinical alerts">
          <p className="mb-1 flex items-center gap-1.5 font-semibold"><AlertTriangle size={15} aria-hidden="true" /> Alerts</p>
          {p.allergies && <p><strong>Allergies:</strong> {p.allergies}</p>}
          {p.conditions && <p><strong>Conditions:</strong> {p.conditions}</p>}
        </section>
      )}

      <section aria-labelledby="past-title">
        <h3 id="past-title" className={h3}>Previous visits</h3>
        {previous.length === 0 ? <p className="text-sm text-ink-muted">No documented visits.</p> : <PastVisits visits={previous} />}
      </section>

      <section aria-labelledby="labs-title">
        <h3 id="labs-title" className={h3}>Lab tests</h3>
        {labs.length === 0 ? <p className="text-sm text-ink-muted">None.</p> : <LabList labs={labs} apptId={apptId} />}
      </section>
    </aside>
  )
}

function PastVisits({ visits }: { readonly visits: PastVisit[] }) {
  return (
    <ol className="max-h-64 space-y-3 overflow-y-auto pr-1">
      {visits.map((v) => (
        <li key={v.id} className="rounded-xl border border-border p-3 text-sm">
          <p className="text-xs text-ink-muted">{fmt(v.appointment_date, 'MMM d, yyyy')} · {v.doctor}</p>
          <p className="font-semibold text-ink">{v.diagnosis || '—'}</p>
          {v.visit_note && <p className="line-clamp-3 whitespace-pre-wrap text-ink-muted">{v.visit_note}</p>}
        </li>
      ))}
    </ol>
  )
}

function LabList({ labs, apptId }: { readonly labs: LabTest[]; readonly apptId: number }) {
  return (
    <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
      {labs.map((t) => (
        <li key={t.id} className="rounded-xl border border-border p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-ink">{t.testName}</span>
            <StatusBadge status={t.status} />
          </div>
          <p className="text-xs text-ink-muted">Ordered {fmt(t.orderedDate, 'MMM d, yyyy')}
            {t.appointmentId === apptId && ' · this visit'}</p>
          {t.result?.resultData && <p className="mt-1 text-ink">{t.result.resultData}</p>}
        </li>
      ))}
    </ul>
  )
}

// ─── Orders & addenda ────────────────────────────────────────────────────────

function LabOrder({ appt }: { readonly appt: Appointment }) {
  const qc = useQueryClient()
  const [test, setTest] = useState('')
  const [notes, setNotes] = useState('')
  const order = useMutation({
    mutationFn: () => labApi.create({ patientId: appt.patient.id, doctorId: appt.doctor.id, testName: test.trim(),
      notes: notes || undefined, appointmentId: appt.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lab'] })
      qc.invalidateQueries({ queryKey: ['appointments', 'visit', appt.id] })
      toast.success('Lab test ordered')
      setTest(''); setNotes('')
    },
  })
  return (
    <section aria-labelledby="lab-title">
      <h3 id="lab-title" className={h3}>Order lab test</h3>
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); order.mutate() }}>
        <input aria-label="Test name" required placeholder="Test (e.g. CBC, HbA1c)" className="input flex-1 min-w-[10rem]"
          value={test} onChange={(e) => setTest(e.target.value)} />
        <input aria-label="Lab notes" placeholder="Notes (optional)" className="input flex-1 min-w-[10rem]"
          value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Button type="submit" variant="secondary" loading={order.isPending} disabled={!test.trim()} icon={<FlaskConical size={13} />}>
          Order
        </Button>
      </form>
    </section>
  )
}

function Addenda({ apptId, entries, canAdd }: {
  readonly apptId: number; readonly entries: { note: string | null; changed_by: string; changed_at: string }[]; readonly canAdd: boolean
}) {
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const add = useMutation({
    mutationFn: () => appointmentApi.addendum(apptId, text.trim()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appointments', 'visit', apptId] }); toast.success('Addendum added'); setText('') },
  })
  return (
    <section aria-labelledby="add-title">
      <h3 id="add-title" className={h3}>Addenda</h3>
      {entries.length > 0 && (
        <ol className="mb-3 space-y-2 border-l-2 border-primary-100 pl-4">
          {entries.map((e) => (
            <li key={`${e.changed_at}-${e.changed_by}`} className="text-sm">
              <p className="whitespace-pre-wrap text-ink">{e.note}</p>
              <p className="text-xs text-ink-muted">{e.changed_by} · {fmt(e.changed_at)}</p>
            </li>
          ))}
        </ol>
      )}
      {canAdd && (
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); add.mutate() }}>
          <input aria-label="Addendum" required className="input flex-1" placeholder="Add a correction or late finding…"
            value={text} onChange={(e) => setText(e.target.value)} />
          <Button type="submit" variant="secondary" loading={add.isPending} disabled={!text.trim()}>Add</Button>
        </form>
      )}
    </section>
  )
}
