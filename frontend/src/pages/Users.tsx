import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, Search, Pencil, Trash2, ToggleLeft, ToggleRight,
  Stethoscope, UserCog, Link2, Link2Off,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { userApi, doctorApi, employeeApi, departmentApi } from '@/api/endpoints'
import type { SystemUser, UserRole, Department } from '@/types'
import { cn } from '@/utils/cn'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { Table } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge, roleTone } from '@/components/ui/Badge'

const STAFF_ICON = { DOCTOR: Stethoscope, EMPLOYEE: UserCog }

const rowBtn =
  'flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-alt hover:text-ink transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'

const createSchema = z.object({
  username:       z.string().min(3, 'Min 3 characters').max(50),
  password:       z.string().min(8, 'Min 8 characters'),
  email:          z.string().email('Invalid email'),
  fullName:       z.string().min(1, 'Full name required'),
  role:           z.enum(['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'LAB_TECH', 'PHARMACIST', 'HR']),
  // Staff profile fields — shown conditionally based on role
  specialization: z.string().optional(),
  licenseNumber:  z.string().optional(),
  phone:          z.string().optional(),
  departmentId:   z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(v)),
    z.number().optional()
  ),
  hireDate:       z.string().optional(),
})

const editSchema = createSchema.extend({
  password: z.string().min(8, 'Min 8 characters').or(z.literal('')).optional(),
})

type CreateForm = z.infer<typeof createSchema>
type EditForm   = z.infer<typeof editSchema>

export default function Users() {
  const qc = useQueryClient()
  const [q, setQ]           = useState('')
  const [page, setPage]     = useState(0)
  const [modal, setModal]   = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing]       = useState<SystemUser | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SystemUser | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<SystemUser | null>(null)

  // Link-section state (inside edit modal)
  const [linkType, setLinkType]     = useState<'DOCTOR' | 'EMPLOYEE' | ''>('')
  const [linkStaffId, setLinkStaffId] = useState<number | ''>('')

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['users', q, page],
    queryFn:  () => userApi.list(q || undefined, page).then((r) => r.data.data),
  })

  const { data: departments = [] } = useQuery({
    queryKey: ['departments', 'all'],
    queryFn:  () => departmentApi.list(0, 200).then((r) => r.data.data.content),
    enabled:  modal === 'create',
    staleTime: 300_000,
  })

  const { data: doctorsData } = useQuery({
    queryKey: ['doctors-all'],
    queryFn:  () => doctorApi.list(undefined, 0, 200).then((r) => r.data.data.content),
    enabled:  modal === 'edit' && linkType === 'DOCTOR',
    staleTime: 60_000,
  })

  const { data: employeesData } = useQuery({
    queryKey: ['employees-all'],
    queryFn:  () => employeeApi.list(undefined, 0, 200).then((r) => r.data.data.content),
    enabled:  modal === 'edit' && linkType === 'EMPLOYEE',
    staleTime: 60_000,
  })

  // ── Forms ─────────────────────────────────────────────────────────────────
  const createForm = useForm<CreateForm>({ resolver: zodResolver(createSchema) })
  const editForm   = useForm<EditForm>({   resolver: zodResolver(editSchema) })

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (d: CreateForm) => userApi.create(d),
    onSuccess: () => {
      toast.success('User created')
      void qc.invalidateQueries({ queryKey: ['users'] })
      setModal(null)
      createForm.reset()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to create user'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: EditForm }) =>
      userApi.update(id, { ...data, password: data.password || undefined }),
    onSuccess: () => {
      toast.success('User updated')
      void qc.invalidateQueries({ queryKey: ['users'] })
      setModal(null)
      setEditing(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to update user'),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: number) => userApi.toggleActive(id),
    onSuccess: () => {
      toast.success('Status toggled')
      void qc.invalidateQueries({ queryKey: ['users'] })
      setDeactivateTarget(null)
    },
    onError: () => toast.error('Failed to toggle status'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => userApi.delete(id),
    onSuccess: () => {
      toast.success('User deleted')
      void qc.invalidateQueries({ queryKey: ['users'] })
      setDeleteTarget(null)
    },
    onError: () => toast.error('Failed to delete user'),
  })

  const linkMutation = useMutation({
    mutationFn: ({ id, staffType, staffId }: { id: number; staffType: string; staffId: number }) =>
      userApi.linkStaff(id, staffType, staffId),
    onSuccess: (res) => {
      setEditing(res.data.data)
      setLinkType('')
      setLinkStaffId('')
      void qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('Staff profile linked')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to link staff profile'),
  })

  const unlinkMutation = useMutation({
    mutationFn: (id: number) => userApi.unlinkStaff(id),
    onSuccess: (res) => {
      setEditing(res.data.data)
      void qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('Staff profile unlinked')
    },
    onError: () => toast.error('Failed to unlink staff profile'),
  })

  // ── Handlers ──────────────────────────────────────────────────────────────
  function openEdit(user: SystemUser) {
    setEditing(user)
    editForm.reset({
      username: user.username,
      email:    user.email,
      fullName: user.fullName,
      role:     user.role,
      password: '',
    })
    setLinkType('')
    setLinkStaffId('')
    setModal('edit')
  }

  const users = data?.content ?? []
  const total = data?.totalPages ?? 0

  return (
    <div className="space-y-6">

      {/* ── Search + add (the page title lives in Header) ──────────── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-full max-w-sm">
          <Input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0) }}
            placeholder="Search by name or username…"
            aria-label="Search users"
            icon={<Search size={15} aria-hidden="true" />}
          />
        </div>
        <Button
          onClick={() => { createForm.reset({ hireDate: new Date().toISOString().split('T')[0] }); setModal('create') }}
          icon={<Plus size={16} aria-hidden="true" />}
        >
          Add user
        </Button>
      </div>

      {/* ── Table ──────────────────────────────────────────────────── */}
      <Table
        columns={userColumns({
          // Deactivating locks someone out mid-shift, so it confirms; reactivating doesn't
          onToggle: (u) => (u.active ? setDeactivateTarget(u) : toggleMutation.mutate(u.id)),
          onEdit: openEdit,
          onDelete: setDeleteTarget,
        })}
        data={users as unknown as Record<string, unknown>[]}
        keyField={'id' as never}
        loading={isLoading}
        emptyMessage="No users found."
        totalPages={total}
        currentPage={page}
        onPageChange={setPage}
      />

      {/* ── Create / Edit Modal ────────────────────────────────────── */}
      {(modal === 'create' || modal === 'edit') && (
        <Modal open onClose={() => { setModal(null); setEditing(null) }}
          title={modal === 'create' ? 'Add user' : 'Edit user'} size="md">
            {modal === 'create' ? (
              <form onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
                <UserFormFields form={createForm} isCreate departments={departments} />
                <ModalActions
                  onCancel={() => setModal(null)}
                  isPending={createMutation.isPending}
                  label="Create user"
                />
              </form>
            ) : (
              <>
                <form
                  onSubmit={editForm.handleSubmit((d) => updateMutation.mutate({ id: editing!.id, data: d }))}
                  className="space-y-4"
                >
                  <UserFormFields form={editForm} isCreate={false} />
                  <ModalActions
                    onCancel={() => { setModal(null); setEditing(null) }}
                    isPending={updateMutation.isPending}
                    label="Save changes"
                  />
                </form>

                {/* ── Staff Profile Link ───────────────────────────── */}
                <div className="mt-5 border-t border-border pt-5 space-y-3">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-ink-muted">
                    <Link2 size={12} aria-hidden="true" />
                    Staff Profile Link
                  </p>

                  {editing?.linkedStaff ? (
                    <div className="flex items-center justify-between rounded-xl border border-border bg-surface-alt px-3 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        {editing.linkedStaff.type === 'DOCTOR'
                          ? <Stethoscope size={14} className="text-info-ink shrink-0" aria-hidden="true" />
                          : <UserCog     size={14} className="text-primary-700 shrink-0" aria-hidden="true" />}
                        <span className="text-sm font-medium text-ink truncate">{editing.linkedStaff.name}</span>
                        <span className="text-xs text-ink-muted shrink-0">
                          ({editing.linkedStaff.type === 'DOCTOR' ? 'Doctor' : 'Employee'})
                        </span>
                      </div>
                      <Button
                        type="button" variant="ghost" size="sm"
                        onClick={() => unlinkMutation.mutate(editing.id)}
                        loading={unlinkMutation.isPending}
                        icon={<Link2Off size={12} aria-hidden="true" />}
                        className="ml-3 shrink-0 text-danger-ink hover:text-danger-ink"
                      >
                        Unlink
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-ink-muted">No staff profile linked to this account.</p>
                      <div className="flex gap-2">
                        <select
                          value={linkType}
                          onChange={(e) => { setLinkType(e.target.value as typeof linkType); setLinkStaffId('') }}
                          aria-label="Staff profile type"
                          className={inputCls(false)}
                        >
                          <option value="">Select type…</option>
                          <option value="DOCTOR">Doctor</option>
                          <option value="EMPLOYEE">Employee</option>
                        </select>
                        {linkType && (
                          <select
                            value={linkStaffId}
                            onChange={(e) => setLinkStaffId(Number(e.target.value))}
                            aria-label="Staff member"
                            className={inputCls(false)}
                          >
                            <option value="">Select person…</option>
                            {(linkType === 'DOCTOR' ? doctorsData : employeesData)?.map((s) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                      {linkType && linkStaffId !== '' && (
                        <Button
                          type="button" size="sm"
                          onClick={() => editing && linkMutation.mutate({
                            id: editing.id,
                            staffType: linkType,
                            staffId: Number(linkStaffId),
                          })}
                          loading={linkMutation.isPending}
                          icon={<Link2 size={13} aria-hidden="true" />}
                        >
                          Link profile
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
        </Modal>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete user"
        confirmLabel="Delete user"
        pending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onClose={() => setDeleteTarget(null)}
      >
        <p>
          Delete <strong>{deleteTarget?.fullName}</strong>? This can't be undone.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={!!deactivateTarget}
        title="Deactivate user"
        confirmLabel="Deactivate"
        pending={toggleMutation.isPending}
        onConfirm={() => deactivateTarget && toggleMutation.mutate(deactivateTarget.id)}
        onClose={() => setDeactivateTarget(null)}
      >
        <p>
          <strong>{deactivateTarget?.fullName}</strong> will be signed out and can't log in until reactivated.
        </p>
      </ConfirmDialog>
    </div>
  )
}

// ─── Users table ──────────────────────────────────────────────────────────────

type RowActions = Readonly<{ onToggle: (u: SystemUser) => void; onEdit: (u: SystemUser) => void; onDelete: (u: SystemUser) => void }>

const asUser = (r: Record<string, unknown>) => r as unknown as SystemUser

function userColumns({ onToggle, onEdit, onDelete }: RowActions) {
  return [
    {
      key: 'fullName', header: 'User',
      render: (r: Record<string, unknown>) => {
        const user = asUser(r)
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 text-primary-700 text-xs font-semibold" aria-hidden="true">
              {user.fullName.charAt(0)}
            </div>
            <div>
              <p className="font-medium text-ink">{user.fullName}</p>
              <p className="text-xs text-ink-muted">{user.email}</p>
            </div>
          </div>
        )
      },
    },
    { key: 'username', header: 'Username', className: 'font-mono text-xs text-ink-muted' },
    {
      key: 'role', header: 'Role',
      render: (r: Record<string, unknown>) => {
        const { role } = asUser(r)
        return <Badge className={roleTone[role]}>{role.replace('_', ' ')}</Badge>
      },
    },
    {
      key: 'linkedStaff', header: 'Staff profile',
      render: (r: Record<string, unknown>) => {
        const staff = asUser(r).linkedStaff
        if (!staff) return <span className="text-xs text-ink-muted">—</span>
        const Icon = STAFF_ICON[staff.type]
        return (
          <Badge variant={staff.type === 'DOCTOR' ? 'info' : 'orange'} className="gap-1.5">
            <Icon size={11} aria-hidden="true" />
            {staff.name}
          </Badge>
        )
      },
    },
    {
      key: 'active', header: 'Status',
      render: (r: Record<string, unknown>) => asUser(r).active
        ? <Badge variant="success">Active</Badge>
        : <Badge variant="danger">Inactive</Badge>,
    },
    {
      key: 'createdAt', header: 'Created', className: 'text-xs text-ink-muted',
      render: (r: Record<string, unknown>) => new Date(asUser(r).createdAt).toLocaleDateString(),
    },
    {
      key: 'actions', header: 'Actions', className: 'text-right',
      render: (r: Record<string, unknown>) => {
        const user = asUser(r)
        return (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => onToggle(user)}
              title={user.active ? 'Deactivate' : 'Activate'}
              aria-label={(user.active ? 'Deactivate ' : 'Activate ') + user.username}
              className={rowBtn}
            >
              {user.active
                ? <ToggleRight size={18} className="text-success-ink" aria-hidden="true" />
                : <ToggleLeft  size={18} aria-hidden="true" />}
            </button>
            <button type="button" onClick={() => onEdit(user)} title="Edit" aria-label={'Edit ' + user.username} className={rowBtn}>
              <Pencil size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(user)}
              title="Delete" aria-label={'Delete ' + user.username}
              className={cn(rowBtn, 'hover:bg-danger-light hover:text-danger-ink')}
            >
              <Trash2 size={15} aria-hidden="true" />
            </button>
          </div>
        )
      },
    },
  ]
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function UserFormFields({
  form,
  isCreate,
  departments = [],
}: Readonly<{
  form: any
  isCreate: boolean
  departments?: Department[]
}>) {
  const { register, watch, formState: { errors } } = form
  const role = isCreate ? (watch('role') as UserRole | '') : ''
  const isDoctor   = role === 'DOCTOR'
  const isEmployee = !isDoctor && role !== 'ADMIN' && role !== ''

  return (
    <>
      <Field label="Full Name" error={errors.fullName?.message}>
        <input {...register('fullName')} placeholder="John Doe" className={inputCls(!!errors.fullName)} />
      </Field>
      <Field label="Username" error={errors.username?.message}>
        <input {...register('username')} placeholder="john_doe" className={inputCls(!!errors.username)} />
      </Field>
      <Field label="Email" error={errors.email?.message}>
        <input {...register('email')} type="email" placeholder="john@hospital.com" className={inputCls(!!errors.email)} />
      </Field>
      <Field
        label={isCreate ? 'Password' : 'Password (leave blank to keep current)'}
        error={errors.password?.message}
      >
        <input
          {...register('password')}
          type="password"
          placeholder={isCreate ? 'Min 8 characters' : '••••••••'}
          className={inputCls(!!errors.password)}
        />
      </Field>
      <Field label="Role" error={errors.role?.message}>
        <select {...register('role')} className={inputCls(!!errors.role)}>
          <option value="">Select a role…</option>
          {(['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'LAB_TECH', 'PHARMACIST', 'HR'] as const).map((r) => (
            <option key={r} value={r}>{r.replace('_', ' ')}</option>
          ))}
        </select>
      </Field>

      {/* ── Doctor-specific fields ── */}
      {isDoctor && (
          <div className="border-t border-border pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-muted flex items-center gap-1.5">
              <Stethoscope size={11} aria-hidden="true" /> Doctor Profile
            </p>
            <div className="space-y-3">
              <Field label="Specialization" error={errors.specialization?.message}>
                <input {...register('specialization')} placeholder="e.g. Cardiology" className={inputCls(false)} />
              </Field>
              <Field label="License Number" error={errors.licenseNumber?.message}>
                <input {...register('licenseNumber')} placeholder="e.g. MD-12345" className={inputCls(false)} />
              </Field>
              <Field label="Phone" error={errors.phone?.message}>
                <input {...register('phone')} placeholder="+1 555 000 0000" className={inputCls(false)} />
              </Field>
              <Field label="Department" error={errors.departmentId?.message}>
                <select {...register('departmentId')} className={inputCls(false)}>
                  <option value="">No department</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
            </div>
          </div>
      )}

      {/* ── Employee-specific fields ── */}
      {isEmployee && (
          <div className="border-t border-border pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-muted flex items-center gap-1.5">
              <UserCog size={11} aria-hidden="true" /> Staff Profile
            </p>
            <div className="space-y-3">
              <Field label="Phone" error={errors.phone?.message}>
                <input {...register('phone')} placeholder="+1 555 000 0000" className={inputCls(false)} />
              </Field>
              <Field label="Department" error={errors.departmentId?.message}>
                <select {...register('departmentId')} className={inputCls(false)}>
                  <option value="">No department</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
              <Field label="Hire Date" error={errors.hireDate?.message}>
                <input {...register('hireDate')} type="date" className={inputCls(false)} />
              </Field>
            </div>
          </div>
      )}
    </>
  )
}

function ModalActions({ onCancel, isPending, label }: Readonly<{ onCancel: () => void; isPending: boolean; label: string }>) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      <Button type="submit" loading={isPending}>{label}</Button>
    </div>
  )
}

function Field({ label, error, children }: Readonly<{ label: string; error?: string; children: React.ReactNode }>) {
  return (
    <div className="space-y-1">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-ink">{label}</span>
        {children}
      </label>
      {error && <p className="text-xs text-danger-ink">{error}</p>}
    </div>
  )
}

function inputCls(hasError: boolean) {
  return cn('input', hasError && 'border-danger focus:border-danger focus:ring-danger/20')
}
