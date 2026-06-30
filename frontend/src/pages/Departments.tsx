import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Building2, Pencil, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { departmentApi } from '@/api/endpoints'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import toast from 'react-hot-toast'
import type { Department } from '@/types'

export default function Departments() {
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentApi.list(),
  })

  const { register, handleSubmit, reset, setValue } = useForm<Partial<Department>>()

  const saveMutation = useMutation({
    mutationFn: (d: Partial<Department>) =>
      editing ? departmentApi.update(editing.id, d) : departmentApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] })
      toast.success(editing ? 'Department updated' : 'Department created')
      setShowModal(false)
      setEditing(null)
      reset()
    },
    onError: () => toast.error('Failed to save department'),
  })

  const deleteMutation = useMutation({
    mutationFn: departmentApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); toast.success('Department deleted') },
  })

  const departments = data?.data?.data ?? []

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div />
        <Button onClick={() => { setEditing(null); reset(); setShowModal(true) }} icon={<Plus size={15} />}>
          Add Department
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
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    setEditing(dept)
                    setValue('name', dept.name)
                    setValue('description', dept.description)
                    setShowModal(true)
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface border border-border text-ink-muted hover:text-primary transition"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => { if (confirm(`Delete ${dept.name}?`)) deleteMutation.mutate(dept.id) }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface border border-border text-ink-muted hover:text-danger transition"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditing(null) }}
        title={editing ? 'Edit Department' : 'New Department'} size="sm">
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          <Input label="Department Name" {...register('name')} placeholder="Cardiology" required />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink">Description</label>
            <textarea {...register('description')} rows={3}
              placeholder="Brief description..." className="input resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={saveMutation.isPending}>
              {editing ? 'Save' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
