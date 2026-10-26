import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, Search, Pencil, Trash2, ToggleLeft, ToggleRight,
  KeyRound, X, Stethoscope, UserCog, Link2, Link2Off,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { userApi, doctorApi, employeeApi, departmentApi } from '@/api/endpoints'
import type { SystemUser, UserRole, Department } from '@/types'
import { cn } from '@/utils/cn'

const ROLE_COLORS: Record<UserRole, string> = {
  ADMIN:        'bg-red-500/15 text-red-400',
  DOCTOR:       'bg-blue-500/15 text-blue-400',
  NURSE:        'bg-green-500/15 text-green-400',
  RECEPTIONIST: 'bg-yellow-500/15 text-yellow-400',
  LAB_TECH:     'bg-purple-500/15 text-purple-400',
  PHARMACIST:   'bg-teal-500/15 text-teal-400',
  HR:           'bg-orange-500/15 text-orange-400',
}

const STAFF_COLORS = {
  DOCTOR:   { badge: 'bg-blue-500/10 text-blue-400',   icon: Stethoscope },
  EMPLOYEE: { badge: 'bg-orange-500/10 text-orange-400', icon: UserCog },
}

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
      qc.invalidateQueries({ queryKey: ['users'] })
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
      qc.invalidateQueries({ queryKey: ['users'] })
      setModal(null)
      setEditing(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to update user'),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: number) => userApi.toggleActive(id),
    onSuccess: () => { toast.success('Status toggled'); qc.invalidateQueries({ queryKey: ['users'] }) },
    onError: () => toast.error('Failed to toggle status'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => userApi.delete(id),
    onSuccess: () => {
      toast.success('User deleted')
      qc.invalidateQueries({ queryKey: ['users'] })
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
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('Staff profile linked')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to link staff profile'),
  })

  const unlinkMutation = useMutation({
    mutationFn: (id: number) => userApi.unlinkStaff(id),
    onSuccess: (res) => {
      setEditing(res.data.data)
      qc.invalidateQueries({ queryKey: ['users'] })
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

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <KeyRound size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-ink">User Management</h1>
            <p className="text-sm text-ink-subtle">Manage system accounts and role assignments</p>
          </div>
        </div>
        <button
          onClick={() => { createForm.reset({ hireDate: new Date().toISOString().split('T')[0] }); setModal('create') }}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} />
          New User
        </button>
      </div>

      {/* ── Search ─────────────────────────────────────────────────── */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(0) }}
          placeholder="Search by name or username…"
          className="w-full rounded-xl border border-border bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-subtle focus:border-primary focus:outline-none"
        />
      </div>

      {/* ── Table ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden overflow-x-auto">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-ink-subtle">Loading…</div>
        ) : users.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-ink-subtle">No users found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt">
                <th className="px-4 py-3 text-left font-medium text-ink-subtle">User</th>
                <th className="px-4 py-3 text-left font-medium text-ink-subtle">Username</th>
                <th className="px-4 py-3 text-left font-medium text-ink-subtle">Role</th>
                <th className="px-4 py-3 text-left font-medium text-ink-subtle">Staff Profile</th>
                <th className="px-4 py-3 text-left font-medium text-ink-subtle">Status</th>
                <th className="px-4 py-3 text-left font-medium text-ink-subtle">Created</th>
                <th className="px-4 py-3 text-right font-medium text-ink-subtle">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => {
                const staff = user.linkedStaff
                const staffStyle = staff ? STAFF_COLORS[staff.type] : null
                return (
                  <tr key={user.id} className="hover:bg-surface-alt/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-semibold">
                          {user.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-ink">{user.fullName}</p>
                          <p className="text-xs text-ink-subtle">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-subtle font-mono text-xs">{user.username}</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-medium', ROLE_COLORS[user.role])}>
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {staff && staffStyle ? (
                        <span className={cn('inline-flex items-center gap-1.5 rounded-lg px-2.5 py-0.5 text-xs font-medium', staffStyle.badge)}>
                          <staffStyle.icon size={11} />
                          {staff.name}
                        </span>
                      ) : (
                        <span className="text-xs text-ink-subtle">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-medium',
                        user.active ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger',
                      )}>
                        {user.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-subtle text-xs">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggleMutation.mutate(user.id)}
                          title={user.active ? 'Deactivate' : 'Activate'}
                          className="rounded-lg p-1.5 text-ink-subtle hover:bg-surface-alt hover:text-ink transition-colors"
                        >
                          {user.active
                            ? <ToggleRight size={16} className="text-success" />
                            : <ToggleLeft  size={16} />}
                        </button>
                        <button
                          onClick={() => openEdit(user)}
                          title="Edit"
                          className="rounded-lg p-1.5 text-ink-subtle hover:bg-surface-alt hover:text-ink transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(user)}
                          title="Delete"
                          className="rounded-lg p-1.5 text-ink-subtle hover:bg-danger/10 hover:text-danger transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ─────────────────────────────────────────────── */}
      {total > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-border px-3 py-1.5 text-ink-subtle hover:bg-surface-alt disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-ink-subtle">Page {page + 1} of {total}</span>
          <button
            disabled={page + 1 >= total}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-border px-3 py-1.5 text-ink-subtle hover:bg-surface-alt disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {/* ── Create / Edit Modal ────────────────────────────────────── */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">
                {modal === 'create' ? 'Create User' : 'Edit User'}
              </h2>
              <button onClick={() => { setModal(null); setEditing(null) }} className="text-ink-subtle hover:text-ink">
                <X size={18} />
              </button>
            </div>

            {modal === 'create' ? (
              <form onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
                <UserFormFields form={createForm} isCreate departments={departments} />
                <ModalActions
                  onCancel={() => setModal(null)}
                  isPending={createMutation.isPending}
                  label="Create User"
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
                    label="Save Changes"
                  />
                </form>

                {/* ── Staff Profile Link ───────────────────────────── */}
                <div className="mt-5 border-t border-border pt-5 space-y-3">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-ink-subtle">
                    <Link2 size={12} />
                    Staff Profile Link
                  </p>

                  {editing?.linkedStaff ? (
                    <div className="flex items-center justify-between rounded-xl border border-border bg-surface-alt px-3 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        {editing.linkedStaff.type === 'DOCTOR'
                          ? <Stethoscope size={14} className="text-blue-400 shrink-0" />
                          : <UserCog     size={14} className="text-orange-400 shrink-0" />}
                        <span className="text-sm font-medium text-ink truncate">{editing.linkedStaff.name}</span>
                        <span className="text-xs text-ink-subtle shrink-0">
                          ({editing.linkedStaff.type === 'DOCTOR' ? 'Doctor' : 'Employee'})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => unlinkMutation.mutate(editing.id)}
                        disabled={unlinkMutation.isPending}
                        className="flex items-center gap-1 text-xs text-danger hover:text-danger/80 shrink-0 ml-3 disabled:opacity-50"
                      >
                        <Link2Off size={12} />
                        Unlink
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-ink-subtle">No staff profile linked to this account.</p>
                      <div className="flex gap-2">
                        <select
                          value={linkType}
                          onChange={(e) => { setLinkType(e.target.value as typeof linkType); setLinkStaffId('') }}
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
                        <button
                          type="button"
                          onClick={() => editing && linkMutation.mutate({
                            id: editing.id,
                            staffType: linkType,
                            staffId: Number(linkStaffId),
                          })}
                          disabled={linkMutation.isPending}
                          className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60"
                        >
                          <Link2 size={13} />
                          {linkMutation.isPending ? 'Linking…' : 'Link profile'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Delete Confirm ─────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold text-ink">Delete User</h2>
            <p className="mb-6 text-sm text-ink-subtle">
              Are you sure you want to delete{' '}
              <strong className="text-ink">{deleteTarget.fullName}</strong>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-border px-4 py-2 text-sm text-ink-subtle hover:bg-surface-alt">
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="rounded-xl bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-danger/90 disabled:opacity-60"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function UserFormFields({
  form,
  isCreate,
  departments = [],
}: {
  form: any
  isCreate: boolean
  departments?: Department[]
}) {
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
        <>
          <div className="border-t border-border pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-subtle flex items-center gap-1.5">
              <Stethoscope size={11} /> Doctor Profile
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
        </>
      )}

      {/* ── Employee-specific fields ── */}
      {isEmployee && (
        <>
          <div className="border-t border-border pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-subtle flex items-center gap-1.5">
              <UserCog size={11} /> Staff Profile
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
        </>
      )}
    </>
  )
}

function ModalActions({ onCancel, isPending, label }: { onCancel: () => void; isPending: boolean; label: string }) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <button type="button" onClick={onCancel}
        className="rounded-xl border border-border px-4 py-2 text-sm text-ink-subtle hover:bg-surface-alt">
        Cancel
      </button>
      <button type="submit" disabled={isPending}
        className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60">
        {isPending ? 'Saving…' : label}
      </button>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-ink-subtle">{label}</label>
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}

function inputCls(hasError: boolean) {
  return cn(
    'w-full rounded-xl border bg-surface-alt px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2',
    hasError
      ? 'border-danger focus:ring-danger/30'
      : 'border-border focus:border-primary focus:ring-primary/20',
  )
}
