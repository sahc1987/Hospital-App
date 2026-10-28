import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Phone, Mail, Pencil, Trash2, CalendarDays, CalendarPlus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isAxiosError } from 'axios'
import { patientApi, appointmentApi } from '@/api/endpoints'
import { Table } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { useAuthStore } from '@/store/authStore'
import { canAccess } from '@/utils/permissions'
import toast from 'react-hot-toast'
import type { Appointment, Patient, UserRole } from '@/types'
import { format, parseISO } from 'date-fns'

const reasonText = (a: Appointment) => (a.status === 'CANCELLED' ? 'Cancelled: ' + (a.cancelReason ?? '') : a.reason ?? '—')
const BOOKERS = new Set<UserRole>(['ADMIN', 'RECEPTIONIST', 'NURSE', 'DOCTOR'])
const iconBtn = 'flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'

// Empty inputs become undefined, so the API never gets "" for an enum or date
const optional = <T extends z.ZodTypeAny>(s: T) => z.preprocess((v) => (v === '' ? undefined : v), s.optional())
const schema = z.object({
  name: z.string().trim().min(1, "Enter the patient's full name"),
  dob: optional(z.string().refine((v) => v <= format(new Date(), 'yyyy-MM-dd'), "Date of birth can't be in the future")),
  gender: optional(z.enum(['MALE', 'FEMALE', 'OTHER'])),
  bloodGroup: optional(z.string()),
  // Forgiving: any mix of digits, spaces, +, -, ( ), dots, as long as there are at least 7 digits
  phone: optional(z.string().trim().refine((v) => /^[\d\s+().-]+$/.test(v) && v.replace(/\D/g, '').length >= 7,
    'Enter a phone number with at least 7 digits')),
  email: optional(z.string().trim().email('Enter an email like name@example.com')),
  address: optional(z.string()),
  allergies: optional(z.string()),
  conditions: optional(z.string()),
})
type PatientForm = z.infer<typeof schema>

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
  const [deleting, setDeleting] = useState<Patient | null>(null)
  const qc = useQueryClient()
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.user?.role) as UserRole | undefined
  const canBook = !!role && BOOKERS.has(role) && canAccess(role, '/appointments')

  const { data, isLoading } = useQuery({
    queryKey: ['patients', search, page],
    queryFn: () => patientApi.list(search || undefined, page),
  })

  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<PatientForm>({
    resolver: zodResolver(schema),
  })

  function closeModal() {
    setShowModal(false)
    setEditing(null)
    reset({})
  }

  const saveMutation = useMutation({
    mutationFn: (d: PatientForm) =>
      editing ? patientApi.update(editing.id, d as Partial<Patient>) : patientApi.create(d as Partial<Patient>),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['patients'] })
      toast.success(editing ? 'Patient updated' : 'Patient added')
      closeModal()
    },
    // Field errors from the server go next to their inputs; anything else the interceptor already toasts
    onError: (e) => {
      const fields: Record<string, string> | undefined = isAxiosError(e) ? e.response?.data?.fields : undefined
      Object.entries(fields ?? {}).forEach(([k, msg]) => setError(k as keyof PatientForm, { message: msg }))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: patientApi.delete,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['patients'] })
      toast.success('Patient deleted')
    },
    // 409 (patient has history): the interceptor toasts the server's explanation
    onSettled: () => setDeleting(null),
  })

  function openEdit(p: Patient) {
    setEditing(p)
    reset({
      name: p.name, phone: p.phone ?? '', email: p.email ?? '', gender: p.gender, dob: p.dob ?? '',
      address: p.address ?? '', bloodGroup: p.bloodGroup ?? '', allergies: p.allergies ?? '', conditions: p.conditions ?? '',
    })
    setShowModal(true)
  }

  function openCreate() {
    setEditing(null)
    reset({})
    setShowModal(true)
  }

  const pageData = data?.data?.data

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone or email…"
            aria-label="Search patients"
            className="input pl-9"
          />
        </div>
        <Button onClick={openCreate} icon={<Plus size={15} />}>Add patient</Button>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-ink">Patient registry</h3>
            <p className="text-xs text-ink-muted mt-0.5">
              {search
                ? `${pageData?.totalElements ?? 0} matching "${search}"`
                : `${pageData?.totalElements ?? 0} total patients`}
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
          emptyMessage={search
            ? `No patients match "${search}". Check the spelling, or add them as a new patient.`
            : 'No patients yet. Use "Add patient" to register the first one.'}
          columns={[
            {
              key: 'name',
              header: 'Patient',
              render: (row) => {
                const p = row as unknown as Patient
                return (
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 flex items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs shrink-0" aria-hidden="true">
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-ink">{p.name}</p>
                      {p.bloodGroup && <p className="text-xs text-ink-muted">Blood: {p.bloodGroup}</p>}
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
                    {p.phone && <div className="flex items-center gap-1.5 text-xs"><Phone size={11} className="text-ink-subtle" aria-hidden="true" />{p.phone}</div>}
                    {p.email && <div className="flex items-center gap-1.5 text-xs"><Mail size={11} className="text-ink-subtle" aria-hidden="true" />{p.email}</div>}
                  </div>
                )
              },
            },
            {
              key: 'dob',
              header: 'Date of birth',
              render: (row) => {
                const p = row as unknown as Patient
                return p.dob ? format(parseISO(p.dob), 'MMM d, yyyy') : '—'
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
                  <div className="flex items-center gap-1 justify-end">
                    {canBook && (
                      <Button size="sm" variant="secondary" icon={<CalendarPlus size={13} aria-hidden="true" />}
                        onClick={() => navigate(`/appointments?book=${p.id}`)}>
                        Book<span className="sr-only"> appointment for {p.name}</span>
                      </Button>
                    )}
                    <button onClick={() => setHistoryFor(p)} aria-label={`Appointment history for ${p.name}`}
                      className={`${iconBtn} hover:bg-surface-card hover:text-primary`}>
                      <CalendarDays size={14} aria-hidden="true" />
                    </button>
                    <button onClick={() => openEdit(p)} aria-label={`Edit ${p.name}`}
                      className={`${iconBtn} hover:bg-surface-card hover:text-primary`}>
                      <Pencil size={14} aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => setDeleting(p)}
                      aria-label={`Delete ${p.name}`}
                      className={`${iconBtn} hover:bg-danger-light hover:text-danger`}>
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                )
              },
            },
          ]}
        />
      </div>

      <ConfirmDialog open={!!deleting} title={`Delete ${deleting?.name ?? 'patient'}?`} confirmLabel="Delete patient"
        pending={deleteMutation.isPending} onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}>
        <p>This can't be undone. Patients with visits, admissions or bills can't be deleted; their history is kept.</p>
      </ConfirmDialog>

      <Modal open={!!historyFor} onClose={() => setHistoryFor(null)}
        title={`Appointments — ${historyFor?.name ?? ''}`} size="xl">
        {historyFor && <PatientAppointments patientId={historyFor.id} />}
      </Modal>

      {/* Modal */}
      <Modal open={showModal} onClose={closeModal} title={editing ? 'Edit patient' : 'Add patient'} size="lg">
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Full name" {...register('name')} error={errors.name?.message} autoComplete="off" />
            <Input label="Date of birth" type="date" max={format(new Date(), 'yyyy-MM-dd')} {...register('dob')} error={errors.dob?.message} />
            <Select label="Gender" {...register('gender')} error={errors.gender?.message}
              options={[{ value: 'MALE', label: 'Male' }, { value: 'FEMALE', label: 'Female' }, { value: 'OTHER', label: 'Other' }]} />
            <Select label="Blood group" {...register('bloodGroup')} error={errors.bloodGroup?.message}
              options={['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((v) => ({ value: v, label: v }))} />
            <Input label="Phone" type="tel" {...register('phone')} error={errors.phone?.message} placeholder="+1 234 567 8900" />
            <Input label="Email" type="email" {...register('email')} error={errors.email?.message} placeholder="patient@email.com" />
          </div>
          <Input label="Address" {...register('address')} error={errors.address?.message} placeholder="Street, City, Country" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Allergies" {...register('allergies')} error={errors.allergies?.message} placeholder="e.g. Penicillin, peanuts" />
            <Input label="Chronic conditions" {...register('conditions')} error={errors.conditions?.message} placeholder="e.g. Type 2 diabetes, asthma" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={saveMutation.isPending}>
              {editing ? 'Save changes' : 'Add patient'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
