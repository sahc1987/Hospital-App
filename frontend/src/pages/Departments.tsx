import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Building2, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { departmentApi } from '@/api/endpoints'
import { Button } from '@/components/ui/Button'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import toast from 'react-hot-toast'
import type { Department } from '@/types'

export default function Departments() {
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [page, setPage] = useState(0)
  const [deleting, setDeleting] = useState<Department | null>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['departments', page],
    queryFn: () => departmentApi.list(page),
  })

  const { register, handleSubmit, reset, setValue } = useForm<Partial<Department>>()

  const saveMutation = useMutation({
    mutationFn: (d: Partial<Department>) =>
      editing ? departmentApi.update(editing.id, d) : departmentApi.create(d),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['departments'] })
      toast.success(editing ? 'Department updated' : 'Department created')
      setShowModal(false)
      setEditing(null)
      reset()
    },
    // errors: the axios interceptor already toasts the server's message
  })

  const deleteMutation = useMutation({
    mutationFn: departmentApi.delete,
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['departments'] }); toast.success('Department deleted') },
    onSettled: () => setDeleting(null),
  })

  const pageData = data?.data?.data
  const departments = pageData?.content ?? []
  const totalPages = pageData?.totalPages ?? 0

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div />
        <Button onClick={() => { setEditing(null); reset(); setShowModal(true) }} icon={<Plus size={15} />}>
          Add department
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {departments.map((dept) => (
            <div key={dept.id} className="card group relative hover:shadow-card-hover transition-shadow">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mb-3">
                <Building2 size={18} className="text-primary" />
              </div>
              <h3 className="font-semibold text-ink">{dept.name}</h3>
              {dept.description && (
                <p className="text-xs text-ink-muted mt-1 line-clamp-2">{dept.description}</p>
              )}
              {/* focus-within: keyboard users see the actions too, not only mouse hover */}
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    setEditing(dept)
                    setValue('name', dept.name)
                    setValue('description', dept.description)
                    setShowModal(true)
                  }}
                  aria-label={`Edit ${dept.name}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface border border-border text-ink-muted hover:text-primary transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Pencil size={13} aria-hidden="true" />
                </button>
                <button
                  onClick={() => setDeleting(dept)}
                  aria-label={`Delete ${dept.name}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface border border-border text-ink-muted hover:text-danger transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Trash2 size={13} aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 0}
            aria-label="Previous page"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-ink-muted disabled:opacity-40 hover:bg-surface-card transition"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm text-ink-muted">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages - 1}
            aria-label="Next page"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-ink-muted disabled:opacity-40 hover:bg-surface-card transition"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      <ConfirmDialog open={!!deleting} title={`Delete ${deleting?.name ?? 'department'}?`} confirmLabel="Delete department"
        pending={deleteMutation.isPending} onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}>
        <p>This can't be undone.</p>
      </ConfirmDialog>

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditing(null) }}
        title={editing ? 'Edit department' : 'Add department'} size="sm">
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          <Input label="Department name" {...register('name')} placeholder="Cardiology" required />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="dept-description" className="text-sm font-medium text-ink">Description</label>
            <textarea id="dept-description" {...register('description')} rows={3}
              placeholder="Brief description..." className="input resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={saveMutation.isPending}>
              {editing ? 'Save changes' : 'Add department'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
