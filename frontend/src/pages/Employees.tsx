import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, UserCog } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { employeeApi, departmentApi } from '@/api/endpoints'
import { Table } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import toast from 'react-hot-toast'
import type { Employee } from '@/types'
import { format } from 'date-fns'

export default function Employees() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [deptId, setDeptId] = useState('')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['employees', search, page],
    queryFn: () => employeeApi.list(search || undefined, page),
  })

  const { data: depts } = useQuery({
    queryKey: ['departments', 'all'],
    queryFn: () => departmentApi.list(0, 200),
  })

  const { register, handleSubmit, reset } = useForm<Partial<Employee & { departmentId?: number; hireDate: string }>>()

  const createMutation = useMutation({
    mutationFn: (d: Partial<Employee & { departmentId?: number }>) =>
      employeeApi.create({ ...d, departmentId: deptId ? Number(deptId) : undefined }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Employee added')
      setShowModal(false)
      reset()
      setDeptId('')
    },
    onError: () => toast.error('Failed to add employee'),
  })

  const pageData = data?.data?.data
  const departments = depts?.data?.data?.content ?? []

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            placeholder="Search employees..." className="input pl-9" />
        </div>
        <Button onClick={() => { reset(); setDeptId(''); setShowModal(true) }} icon={<Plus size={15} />}>
          Add employee
        </Button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="border-b border-border px-6 py-4 flex items-center gap-3">
          <UserCog size={18} className="text-ink-muted" />
          <div>
            <h3 className="font-semibold text-ink">Employees</h3>
            <p className="text-xs text-ink-muted">{pageData?.totalElements ?? 0} staff members</p>
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
              key: 'name', header: 'Employee',
              render: (row) => {
                const e = row as unknown as Employee
                return (
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 flex items-center justify-center rounded-full bg-surface-dark text-white font-semibold text-sm">
                      {e.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{e.name}</p>
                      <p className="text-xs text-ink-muted">{e.email}</p>
                    </div>
                  </div>
                )
              },
            },
            {
              key: 'role', header: 'Role',
              render: (row) => <Badge variant="orange">{(row as unknown as Employee).role}</Badge>,
            },
            {
              key: 'department', header: 'Department',
              render: (row) => {
                const e = row as unknown as Employee
                return e.department ? e.department.name : '—'
              },
            },
            { key: 'phone', header: 'Phone',
              render: (row) => (row as unknown as Employee).phone ?? '—' },
            {
              key: 'hireDate', header: 'Hire Date',
              render: (row) => {
                const e = row as unknown as Employee
                return <span className="text-ink-muted">{format(new Date(e.hireDate), 'MMM d, yyyy')}</span>
              },
            },
          ]}
        />
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add employee" size="lg">
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name" {...register('name')} placeholder="John Smith" required />
            <Input label="Role / Position" {...register('role')} placeholder="Nurse" required />
            <Input label="Phone" {...register('phone')} placeholder="+1 234 567 8900" />
            <Input label="Email" type="email" {...register('email')} placeholder="employee@hospital.com" />
            <Input label="Hire Date" type="date" {...register('hireDate')} required />
            <Select label="Department" value={deptId} onChange={(e) => setDeptId(e.target.value)}
              options={departments.map((d) => ({ value: d.id, label: d.name }))} />
          </div>
          <Input label="Address" {...register('address')} placeholder="Street, City, Country" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Add employee</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
