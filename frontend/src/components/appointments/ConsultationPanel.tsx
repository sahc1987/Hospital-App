import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Plus, Printer, Trash2, Play, CheckCircle2, FlaskConical, CalendarPlus } from 'lucide-react'
import { differenceInYears, differenceInMinutes, format, parseISO } from 'date-fns'
import { appointmentApi, labApi } from '@/api/endpoints'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import toast from 'react-hot-toast'
import type { Appointment, RxItem } from '@/types'

const h3 = 'mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted'
const fmt = (iso?: string | null, f = 'MMM d, yyyy h:mm a') => (iso ? format(parseISO(iso), f) : '—')
const emptyRx = (): RxItem => ({ medication: '', dosage: '', frequency: '', duration: '', instructions: '' })

/**
 * The doctor's view of a visit: patient context on the right, documentation & orders on the left.
 * `canDocument` = treating doctor or admin; everyone else (e.g. nurses) gets it read-only.
 */
export function ConsultationPanel({ appt, canDocument, onFollowUp, onDone }: {
  readonly appt: Appointment
  readonly canDocument: boolean
  readonly onFollowUp: (weeks: number) => void
  readonly onDone: () => void
}) {
  const qc = useQueryClient()
  const p = appt.patient
  const editable = canDocument && (appt.status === 'CHECKED_IN' || appt.status === 'IN_CONSULTATION')
  const inRoom = appt.status === 'IN_CONSULTATION'

  const { data: visit } = useQuery({
    queryKey: ['appointments', 'visit', appt.id],
    queryFn: async () => (await appointmentApi.visit(appt.id)).data.data,
  })
  const { data: past = [] } = useQuery({
    queryKey: ['appointments', 'visits', p.id],
    queryFn: async () => (await appointmentApi.patientVisits(p.id)).data.data,
  })
  const { data: labs = [] } = useQuery({
    queryKey: ['lab', 'patient', p.id],
    queryFn: async () => (await labApi.byPatient(p.id)).data.data.content,
  })

  const [diagnosis, setDiagnosis] = useState('')
  const [note, setNote] = useState('')
  const [rx, setRx] = useState<RxItem[]>([])
  // Seed the form once. Later refetches (after a lab order / Rx save) must not wipe unsaved typing.
  const seeded = useRef(false)
  useEffect(() => {
    if (!visit || seeded.current) return
    seeded.current = true
    setDiagnosis(visit.diagnosis ?? '')
    setNote(visit.visitNote ?? '')
    setRx(visit.prescription)
  }, [visit])

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['appointments'] })
    qc.invalidateQueries({ queryKey: ['today-appointments'] })
  }
  const saveNote = () => appointmentApi.saveVisit(appt.id, { diagnosis, visitNote: note })

  const start = useMutation({
    mutationFn: () => appointmentApi.changeStatus(appt.id, 'IN_CONSULTATION'),
    onSuccess: () => { refresh(); toast.success('Consultation started'); onDone() },
  })
  const save = useMutation({
    mutationFn: saveNote,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appointments', 'visit', appt.id] }); toast.success('Note saved') },
  })
  const complete = useMutation({
    mutationFn: async () => { await saveNote(); return appointmentApi.changeStatus(appt.id, 'COMPLETED') },
    onSuccess: () => { refresh(); qc.invalidateQueries({ queryKey: ['bills'] }); toast.success('Visit completed'); onDone() },
  })
  const saveRx = useMutation({
    mutationFn: () => appointmentApi.savePrescription(appt.id, rx.filter((r) => r.medication.trim())),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appointments', 'visit', appt.id] }); toast.success('Prescription saved') },
  })

  const age = p.dob ? differenceInYears(new Date(), parseISO(p.dob)) : null
  const waited = appt.checkedInAt && appt.startedAt ? differenceInMinutes(parseISO(appt.startedAt), parseISO(appt.checkedInAt)) : null

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* ── Visit ──────────────────────────────────────────────── */}
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

        <section aria-labelledby="doc-title">
          <h3 id="doc-title" className={h3}>Visit documentation</h3>
          {editable ? (
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
                  <Button onClick={() => complete.mutate()} loading={complete.isPending}
                    disabled={!diagnosis.trim() || !note.trim()} icon={<CheckCircle2 size={14} />}
                    title={!diagnosis.trim() || !note.trim() ? 'Diagnosis and visit note are required' : undefined}>
                    Complete visit
                  </Button>
                )}
              </div>
              {inRoom && (!diagnosis.trim() || !note.trim()) && (
                <p className="text-xs text-ink-muted">A diagnosis and a visit note are required to complete. The note locks after completion.</p>
              )}
            </div>
          ) : (
            <div className="space-y-2 rounded-xl bg-surface-alt p-4 text-sm">
              <p><span className="text-ink-muted">Diagnosis:</span> <strong>{visit?.diagnosis || '—'}</strong></p>
              <p className="whitespace-pre-wrap text-ink">{visit?.visitNote || <span className="text-ink-muted">No visit note.</span>}</p>
              {appt.status === 'COMPLETED' && <p className="text-xs text-ink-muted">Locked {fmt(appt.completedAt)}</p>}
            </div>
          )}
        </section>

        {appt.status === 'COMPLETED' && (
          <Addenda apptId={appt.id} entries={visit?.addenda ?? []} canAdd={canDocument} />
        )}

        <section aria-labelledby="rx-title">
          <div className="flex items-center justify-between">
            <h3 id="rx-title" className={h3}>Prescription</h3>
            {rx.some((r) => r.medication) && (
              <Button size="sm" variant="ghost" onClick={printRx} icon={<Printer size={13} />}>Print</Button>
            )}
          </div>
          {editable ? (
            <div className="space-y-2">
              {rx.map((r, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  {(['medication', 'dosage', 'frequency', 'duration'] as const).map((f) => (
                    <input key={f} aria-label={`${f} ${i + 1}`} placeholder={f[0].toUpperCase() + f.slice(1)}
                      className={`input ${f === 'medication' ? 'col-span-4' : 'col-span-2'}`} value={r[f] ?? ''}
                      onChange={(e) => setRx(rx.map((x, j) => (j === i ? { ...x, [f]: e.target.value } : x)))} />
                  ))}
                  <button type="button" onClick={() => setRx(rx.filter((_, j) => j !== i))} aria-label={`Remove line ${i + 1}`}
                    className="col-span-2 flex items-center justify-center rounded-xl text-ink-muted hover:bg-danger-light hover:text-danger-ink">
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                  <input aria-label={`instructions ${i + 1}`} placeholder="Instructions (e.g. after meals)"
                    className="input col-span-12" value={r.instructions ?? ''}
                    onChange={(e) => setRx(rx.map((x, j) => (j === i ? { ...x, instructions: e.target.value } : x)))} />
                </div>
              ))}
              <div className="flex justify-between">
                <Button size="sm" variant="ghost" onClick={() => setRx([...rx, emptyRx()])} icon={<Plus size={13} />}>Add medication</Button>
                <Button size="sm" variant="secondary" onClick={() => saveRx.mutate()} loading={saveRx.isPending}>Save prescription</Button>
              </div>
            </div>
          ) : rx.length === 0 ? <p className="text-sm text-ink-muted">None.</p> : <RxTable items={rx} />}
        </section>

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
            </div>
          </section>
        )}
      </div>

      {/* ── Patient context ───────────────────────────────────── */}
      <aside className="space-y-5 lg:col-span-2" aria-label="Patient context">
        <section className="rounded-2xl bg-surface-alt p-4">
          <p className="text-lg font-bold text-ink">{p.name}</p>
          <p className="text-sm text-ink-muted">
            {[age != null && `${age} y`, p.gender && p.gender.charAt(0) + p.gender.slice(1).toLowerCase(),
              p.bloodGroup && `Blood ${p.bloodGroup}`].filter(Boolean).join(' · ') || 'No demographics recorded'}
          </p>
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
          {past.filter((v) => v.id !== appt.id).length === 0 ? <p className="text-sm text-ink-muted">No documented visits.</p> : (
            <ol className="max-h-64 space-y-3 overflow-y-auto pr-1">
              {past.filter((v) => v.id !== appt.id).map((v) => (
                <li key={v.id} className="rounded-xl border border-border p-3 text-sm">
                  <p className="text-xs text-ink-muted">{fmt(v.appointment_date, 'MMM d, yyyy')} · {v.doctor}</p>
                  <p className="font-semibold text-ink">{v.diagnosis || '—'}</p>
                  {v.visit_note && <p className="line-clamp-3 whitespace-pre-wrap text-ink-muted">{v.visit_note}</p>}
                </li>
              ))}
            </ol>
          )}
        </section>

        <section aria-labelledby="labs-title">
          <h3 id="labs-title" className={h3}>Lab tests</h3>
          {labs.length === 0 ? <p className="text-sm text-ink-muted">None.</p> : (
            <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {labs.map((t) => (
                <li key={t.id} className="rounded-xl border border-border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-ink">{t.testName}</span>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="text-xs text-ink-muted">Ordered {fmt(t.orderedDate, 'MMM d, yyyy')}
                    {t.appointmentId === appt.id && ' · this visit'}</p>
                  {t.result?.resultData && <p className="mt-1 text-ink">{t.result.resultData}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>

    </div>
  )

  // ponytail: plain print window — no print CSS fighting the app/dialog DOM. Values are HTML-escaped.
  function printRx() {
    const esc = (s?: string | null) => (s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
    const rows = rx.filter((r) => r.medication).map((r) =>
      `<tr><td>${esc(r.medication)}</td><td>${esc(r.dosage)}</td><td>${esc(r.frequency)}</td><td>${esc(r.duration)}</td><td>${esc(r.instructions)}</td></tr>`).join('')
    const w = window.open('', '_blank', 'width=800,height=900')
    if (!w) { toast.error('Allow pop-ups to print'); return }
    w.document.write(`<!doctype html><title>Prescription — ${esc(p.name)}</title>
      <style>body{font:12pt system-ui,sans-serif;margin:2rem;color:#000}h1{font-size:18pt}table{border-collapse:collapse;width:100%;margin-top:1rem}
      th,td{border:1px solid #999;padding:.35rem .5rem;text-align:left}.sign{margin-top:3rem}</style>
      <h1>Prescription</h1>
      <p><b>Patient:</b> ${esc(p.name)}${age != null ? ` (${age} y)` : ''}${p.allergies ? ` — <b>Allergies:</b> ${esc(p.allergies)}` : ''}</p>
      <p><b>Prescriber:</b> ${esc(appt.doctor?.name)} · <b>Date:</b> ${esc(fmt(appt.appointmentDate, 'MMM d, yyyy'))}</p>
      ${visit?.diagnosis ? `<p><b>Diagnosis:</b> ${esc(visit.diagnosis)}</p>` : ''}
      <table><tr><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Instructions</th></tr>${rows}</table>
      <p class="sign">Signature: ______________________</p>`)
    w.document.close()
    w.focus()
    w.print()
  }
}

function RxTable({ items }: { readonly items: RxItem[] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="text-xs text-ink-muted">
        <tr><th className="py-1">Medication</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Instructions</th></tr>
      </thead>
      <tbody>
        {items.map((r, i) => (
          <tr key={i} className="border-t border-border">
            <td className="py-1.5 font-medium">{r.medication}</td><td>{r.dosage}</td><td>{r.frequency}</td>
            <td>{r.duration}</td><td>{r.instructions}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

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
      <h3 id="lab-title" className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">Order lab test</h3>
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
          {entries.map((e, i) => (
            <li key={i} className="text-sm">
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
