import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Phone, Mail, Pencil, Trash2, CalendarDays } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { patientApi, appointmentApi } from '@/api/endpoints'
import { Table } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import toast from 'react-hot-toast'
import type { Appointment, Patient } from '@/types'
import { format, parseISO } from 'date-fns'

const reasonText = (a: Appointment) => (a.status === 'CANCELLED' ? 'Cancelled: ' + (a.cancelReason ?? '') : a.reason ?? '—')

/** Past and upcoming appointments for one patient, newest first. */
function PatientAppointments({ patientId }: { readonly patientId: number }) {
  const [page, setPage] = useState(0)
  const { data, isLoading } = useQuery({
    queryKey: ['appointments', 'patient', patientId, page],
    queryFn: async () => (await appointmentApi.byPatient(patientId, page)).data.data,
  })
  const now = new Date()
  return (
    <Table
      data={(data?.content ?? []) as unknown as Record<string, unknown>[]}
      loading={isLoading} keyField={'id' as never}
      totalPages={data?.totalPages} currentPage={page} onPageChange={setPage}
      emptyMessage="No appointments yet."
      columns={[
        { key: 'appointmentDate', header: 'When', render: (r) => {
          const d = parseISO(String(r.appointmentDate))
          return <span className={d > now ? 'font-semibold text-ink' : 'text-ink-muted'}>{format(d, 'MMM d, yyyy · h:mm a')}</span>
        } },
        { key: 'doctor', header: 'Doctor', render: (r) => (r.doctor as { name?: string } | null)?.name ?? '—' },
        { key: 'reason', header: 'Reason', render: (r) => reasonText(r as unknown as Appointment) },
        { key: 'status', header: 'Status', render: (r) => <StatusBadge status={String(r.status)} /> },
      ]}
    />
  )
}

export default function Patients() {
  // Search lives in the URL (?q=) so the header search can deep-link here
  const [params, setParams] = useSearchParams()
  const search = params.get('q') ?? ''
  const setSearch = (q: string) => setParams(q ? { q } : {}, { replace: true })
  const [page, setPage] = useState(0)
  useEffect(() => setPage(0), [search])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Patient | null>(null)
  const [historyFor, setHistoryFor] = useState<Patient | null>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['patients', search, page],
    queryFn: () => patientApi.list(search || undefined, page),
  })

  const saveMutation = useMutation({
    mutationFn: (d: Partial<Patient>) =>
      editing ? patientApi.update(editing.id, d) : patientApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients'] })
      toast.success(editing ? 'Patient updated' : 'Patient created')
      setShowModal(false)
      setEditing(null)
      reset()
    },
    onError: () => toast.error('Failed to save patient'),
  })

  const deleteMutation = useMutation({
    mutationFn: patientApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients'] })
      toast.success('Patient deleted')
    },
  })

  const { register, handleSubmit, reset, setValue } = useForm<Partial<Patient>>()

  function openEdit(p: Patient) {
    setEditing(p)
    setValue('name', p.name)
    setValue('phone', p.phone)
    setValue('email', p.email)
    setValue('gender', p.gender)
    setValue('dob', p.dob)
    setValue('address', p.address)
    setValue('bloodGroup', p.bloodGroup)
    setValue('allergies', p.allergies)
    setValue('conditions', p.conditions)
    setShowModal(true)
  }

  function openCreate() {
    setEditing(null)
    reset()
    setShowModal(true)
  }

  const pageData = data?.data?.data

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patients..."
            aria-label="Search patients"
            className="input pl-9"
          />
        </div>
        <Button onClick={openCreate} icon={<Plus size={15} />}>Add Patient</Button>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-ink">Patient Registry</h3>
            <p className="text-xs text-ink-muted mt-0.5">
              {pageData?.totalElements ?? 0} total patients
            </p>
          </div>
        </div>

        <Table
          data={(pageData?.content ?? []) as unknown as Record<string, unknown>[]}
          loading={isLoading}
          keyField={'id' as never}
          totalPages={pageData?.totalPages}
          currentPage={page}
          onPageChange={setPage}
          columns={[
            {
              key: 'name',
              header: 'Patient',
              render: (row) => {
                const p = row as unknown as Patient
                return (
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 flex items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs shrink-0">
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-ink">{p.name}</p>
                      <p className="text-xs text-ink-muted">{p.bloodGroup ? `Blood: ${p.bloodGroup}` : 'N/A'}</p>
                    </div>
                  </div>
                )
              },
            },
            {
              key: 'gender',
              header: 'Gender',
              render: (row) => {
                const p = row as unknown as Patient
                return p.gender ? <Badge>{p.gender}</Badge> : <span className="text-ink-subtle">—</span>
              },
            },
            {
              key: 'phone',
              header: 'Contact',
              render: (row) => {
                const p = row as unknown as Patient
                return (
                  <div className="space-y-0.5">
                    {p.phone && <div className="flex items-center gap-1.5 text-xs"><Phone size={11} className="text-ink-subtle" />{p.phone}</div>}
                    {p.email && <div className="flex items-center gap-1.5 text-xs"><Mail size={11} className="text-ink-subtle" />{p.email}</div>}
                  </div>
                )
              },
            },
            {
              key: 'dob',
              header: 'Date of Birth',
              render: (row) => {
                const p = row as unknown as Patient
                return p.dob ? format(new Date(p.dob), 'MMM d, yyyy') : '—'
              },
            },
            {
              key: 'createdAt',
              header: 'Registered',
              render: (row) => {
                const p = row as unknown as Patient
                return <span className="text-ink-muted">{format(new Date(p.createdAt), 'MMM d, yyyy')}</span>
              },
            },
            {
              key: 'actions',
              header: '',
              render: (row) => {
                const p = row as unknown as Patient
                return (
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => setHistoryFor(p)} aria-label={`Appointment history for ${p.name}`}
                      className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-surface-card text-ink-muted hover:text-primary transition">
                      <CalendarDays size={13} aria-hidden="true" />
                    </button>
                    <button onClick={() => openEdit(p)} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-surface-card text-ink-muted hover:text-primary transition">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => { if (confirm('Delete patient?')) deleteMutation.mutate(p.id) }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-danger-light text-ink-muted hover:text-danger transition">
                      <Trash2 size={13} />
                    </button>
                  </div>
                )
              },
            },
          ]}
        />
      </div>

      <Modal open={!!historyFor} onClose={() => setHistoryFor(null)}
        title={`Appointments — ${historyFor?.name ?? ''}`} size="xl">
        {historyFor && <PatientAppointments patientId={historyFor.id} />}
      </Modal>

      {/* Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setEditing(null) }}
        title={editing ? 'Edit Patient' : 'New Patient'} size="lg">
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name" {...register('name')} placeholder="John Doe" required />
            <Input label="Date of Birth" type="date" {...register('dob')} />
            <Select label="Gender" {...register('gender')}
              options={[{ value: 'MALE', label: 'Male' }, { value: 'FEMALE', label: 'Female' }, { value: 'OTHER', label: 'Other' }]} />
            <Select label="Blood Group" {...register('bloodGroup')}
              options={['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((v) => ({ value: v, label: v }))} />
            <Input label="Phone" {...register('phone')} placeholder="+1 234 567 8900" />
            <Input label="Email" type="email" {...register('email')} placeholder="patient@email.com" />
          </div>
          <Input label="Address" {...register('address')} placeholder="Street, City, Country" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Allergies" {...register('allergies')} placeholder="e.g. Penicillin, peanuts" />
            <Input label="Chronic conditions" {...register('conditions')} placeholder="e.g. Type 2 diabetes, asthma" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={saveMutation.isPending}>
              {editing ? 'Save Changes' : 'Create Patient'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
