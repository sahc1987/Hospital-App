import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Stethoscope, Phone, Mail, Pencil, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { doctorApi, departmentApi } from '@/api/endpoints'
import { Table } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import toast from 'react-hot-toast'
import type { Doctor } from '@/types'

export default function Doctors() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Doctor | null>(null)
  const [deptId, setDeptId] = useState('')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['doctors', search, page],
    queryFn: () => doctorApi.list(search || undefined, page),
  })

  const { data: depts } = useQuery({
    queryKey: ['departments', 'all'],
    queryFn: () => departmentApi.list(0, 200),
  })

  const { register, handleSubmit, reset, setValue } = useForm<Partial<Doctor>>()

  const saveMutation = useMutation({
    mutationFn: (d: Partial<Doctor>) =>
      editing
        ? doctorApi.update(editing.id, d, deptId ? Number(deptId) : undefined)
        : doctorApi.create(d, deptId ? Number(deptId) : undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctors'] })
      toast.success(editing ? 'Doctor updated' : 'Doctor added')
      setShowModal(false)
      setEditing(null)
      reset()
      setDeptId('')
    },
    onError: () => toast.error('Failed to save'),
  })

  const deleteMutation = useMutation({
    mutationFn: doctorApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['doctors'] }); toast.success('Doctor removed') },
  })

  function openEdit(d: Doctor) {
    setEditing(d)
    setValue('name', d.name)
    setValue('specialization', d.specialization)
    setValue('phone', d.phone)
    setValue('email', d.email)
    setValue('licenseNumber', d.licenseNumber)
    setDeptId(String(d.department?.id ?? ''))
    setShowModal(true)
  }

  const pageData = data?.data?.data
  const departments = depts?.data?.data?.content ?? []

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            placeholder="Search doctors..." className="input pl-9" />
        </div>
        <Button onClick={() => { setEditing(null); reset(); setDeptId(''); setShowModal(true) }} icon={<Plus size={15} />}>
          Add Doctor
        </Button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="border-b border-border px-6 py-4 flex items-center gap-3">
          <Stethoscope size={18} className="text-ink-muted" />
          <div>
            <h3 className="font-semibold text-ink">Medical Staff</h3>
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
                      <p className="font-medium">Dr. {d.name}</p>
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
                  : <span className="text-ink-subtle text-sm">—</span>
              },
            },
            {
              key: 'phone', header: 'Contact',
              render: (row) => {
                const d = row as unknown as Doctor
                return (
                  <div className="space-y-0.5">
                    {d.phone && <div className="flex items-center gap-1.5 text-xs"><Phone size={11} className="text-ink-subtle" />{d.phone}</div>}
                    {d.email && <div className="flex items-center gap-1.5 text-xs"><Mail size={11} className="text-ink-subtle" />{d.email}</div>}
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
                    <button onClick={() => openEdit(d)} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-surface-card text-ink-muted hover:text-primary transition">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => { if (confirm('Remove doctor?')) deleteMutation.mutate(d.id) }}
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

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Doctor' : 'Add Doctor'} size="lg">
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name" {...register('name')} placeholder="Dr. Jane Smith" required />
            <Input label="Specialization" {...register('specialization')} placeholder="Cardiology" />
            <Input label="Phone" {...register('phone')} placeholder="+1 234 567 8900" />
            <Input label="Email" type="email" {...register('email')} placeholder="doctor@hospital.com" />
            <Input label="License Number" {...register('licenseNumber')} placeholder="LIC-12345" />
            <Select
              label="Department"
              value={deptId}
              onChange={(e) => setDeptId(e.target.value)}
              options={departments.map((dep) => ({ value: dep.id, label: dep.name }))}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={saveMutation.isPending}>
              {editing ? 'Save Changes' : 'Add Doctor'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
