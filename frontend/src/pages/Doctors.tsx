import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Stethoscope, Phone, Mail, Pencil, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { doctorApi, departmentApi } from '@/api/endpoints'
import { Table } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import toast from 'react-hot-toast'
import type { Doctor } from '@/types'
import { withDr } from '@/utils/names'

const WEEK = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
type DoctorForm = Partial<Doctor> & { days?: string[] }
const HOURS_DEFAULTS: DoctorForm = { workStart: '09:00', workEnd: '17:00', slotMinutes: 30, consultationFee: 0, days: WEEK.slice(0, 5) }

export default function Doctors() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Doctor | null>(null)
  const [deptId, setDeptId] = useState('')
  const [deleting, setDeleting] = useState<Doctor | null>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['doctors', search, page],
    queryFn: () => doctorApi.list(search || undefined, page),
  })

  const { data: depts } = useQuery({
    queryKey: ['departments', 'all'],
    queryFn: () => departmentApi.list(0, 200),
  })

  const { register, handleSubmit, reset, setValue } = useForm<DoctorForm>({ defaultValues: HOURS_DEFAULTS })

  const saveMutation = useMutation({
    mutationFn: ({ days, ...d }: DoctorForm) => {
      const body = { ...d, workDays: (days ?? []).join(','), slotMinutes: Number(d.slotMinutes),
        consultationFee: Number(d.consultationFee ?? 0) }
      const department = deptId ? Number(deptId) : undefined
      return editing ? doctorApi.update(editing.id, body, department) : doctorApi.create(body, department)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['doctors'] })
      toast.success(editing ? 'Doctor updated' : 'Doctor added')
      setShowModal(false)
      setEditing(null)
      reset(HOURS_DEFAULTS)
      setDeptId('')
    },
    // errors: the axios interceptor already toasts the server's message
  })

  const deleteMutation = useMutation({
    mutationFn: doctorApi.delete,
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['doctors'] }); toast.success('Doctor removed') },
    onSettled: () => setDeleting(null),
  })

  function openEdit(d: Doctor) {
    setEditing(d)
    setValue('name', d.name)
    setValue('specialization', d.specialization)
    setValue('phone', d.phone)
    setValue('email', d.email)
    setValue('licenseNumber', d.licenseNumber)
    setValue('workStart', d.workStart?.slice(0, 5))
    setValue('workEnd', d.workEnd?.slice(0, 5))
    setValue('slotMinutes', d.slotMinutes)
    setValue('consultationFee', d.consultationFee)
    setValue('days', d.workDays?.split(',') ?? [])
    setDeptId(String(d.department?.id ?? ''))
    setShowModal(true)
  }

  const pageData = data?.data?.data
  const departments = depts?.data?.data?.content ?? []

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            placeholder="Search doctors…" aria-label="Search doctors" className="input pl-9" />
        </div>
        <Button onClick={() => { setEditing(null); reset(HOURS_DEFAULTS); setDeptId(''); setShowModal(true) }} icon={<Plus size={15} />}>
          Add doctor
        </Button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="border-b border-border px-6 py-4 flex items-center gap-3">
          <Stethoscope size={18} className="text-ink-muted" />
          <div>
            <h3 className="font-semibold text-ink">Medical staff</h3>
            <p className="text-xs text-ink-muted">{pageData?.totalElements ?? 0} doctors</p>
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
              key: 'name', header: 'Doctor',
              render: (row) => {
                const d = row as unknown as Doctor
                return (
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 flex items-center justify-center rounded-full bg-surface-dark text-white font-semibold text-sm">
                      {d.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{withDr(d.name)}</p>
                      <p className="text-xs text-ink-muted">{d.specialization}</p>
                    </div>
                  </div>
                )
              },
            },
            {
              key: 'department', header: 'Department',
              render: (row) => {
                const d = row as unknown as Doctor
                return d.department
                  ? <span className="badge bg-primary/10 text-primary">{d.department.name}</span>
                  : <span className="text-ink-muted text-sm">—</span>
              },
            },
            {
              key: 'phone', header: 'Contact',
              render: (row) => {
                const d = row as unknown as Doctor
                return (
                  <div className="space-y-0.5">
                    {d.phone && <div className="flex items-center gap-1.5 text-xs"><Phone size={11} className="text-ink-muted" />{d.phone}</div>}
                    {d.email && <div className="flex items-center gap-1.5 text-xs"><Mail size={11} className="text-ink-muted" />{d.email}</div>}
                  </div>
                )
              },
            },
            {
              key: 'licenseNumber', header: 'License',
              render: (row) => {
                const d = row as unknown as Doctor
                return <span className="text-xs text-ink-muted font-mono">{d.licenseNumber || '—'}</span>
              },
            },
            {
              key: 'actions', header: '',
              render: (row) => {
                const d = row as unknown as Doctor
                return (
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => openEdit(d)} aria-label={`Edit ${withDr(d.name)}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface-card text-ink-muted hover:text-primary transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                      <Pencil size={14} aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => setDeleting(d)}
                      aria-label={`Remove ${withDr(d.name)}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-danger-light text-ink-muted hover:text-danger transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                )
              },
            },
          ]}
        />
      </div>

      <ConfirmDialog open={!!deleting} title={`Remove ${deleting ? withDr(deleting.name) : 'doctor'}?`} confirmLabel="Remove doctor"
        pending={deleteMutation.isPending} onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}>
        <p>This can't be undone. Doctors with appointments or visits can't be removed; their history is kept.</p>
      </ConfirmDialog>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit doctor' : 'Add doctor'} size="lg">
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full name" {...register('name')} placeholder="Dr. Jane Smith" required />
            <Input label="Specialization" {...register('specialization')} placeholder="Cardiology" />
            <Input label="Phone" {...register('phone')} placeholder="+1 234 567 8900" />
            <Input label="Email" type="email" {...register('email')} placeholder="doctor@hospital.com" />
            <Input label="License number" {...register('licenseNumber')} placeholder="LIC-12345" />
            <Select
              label="Department"
              value={deptId}
              onChange={(e) => setDeptId(e.target.value)}
              options={departments.map((dep) => ({ value: dep.id, label: dep.name }))}
            />
          </div>
          <fieldset className="space-y-3 rounded-xl bg-surface-alt p-4">
            <legend className="px-1 text-sm font-semibold text-ink">Working hours (bookable appointment slots)</legend>
            <div className="grid grid-cols-3 gap-4">
              <Input label="Start" type="time" required {...register('workStart')} />
              <Input label="End" type="time" required {...register('workEnd')} />
              <Input label="Slot length (min)" type="number" min={5} max={240} step={5} required {...register('slotMinutes')} />
            </div>
            <Input label="Consultation fee ($, billed on completion; 0 = no bill)" type="number" min={0} step="0.01"
              {...register('consultationFee')} />
            <fieldset className="flex flex-wrap gap-3">
              <legend className="sr-only">Working days</legend>
              {WEEK.map((day) => (
                <label key={day} className="flex items-center gap-1.5 text-sm text-ink">
                  <input type="checkbox" value={day} {...register('days')} className="h-4 w-4 accent-primary" />
                  {day.charAt(0) + day.slice(1).toLowerCase()}
                </label>
              ))}
            </fieldset>
          </fieldset>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={saveMutation.isPending}>
              {editing ? 'Save changes' : 'Add doctor'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
