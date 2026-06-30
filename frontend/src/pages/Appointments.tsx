import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, CalendarDays } from 'lucide-react'
import { appointmentApi, patientApi, doctorApi } from '@/api/endpoints'
import { Table } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Input'
import { StatusBadge } from '@/components/ui/Badge'
import toast from 'react-hot-toast'
import type { Appointment, AppointmentStatus } from '@/types'
import { format } from 'date-fns'

export default function Appointments() {
  const [page, setPage] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ patientId: '', doctorId: '', date: '', reason: '' })
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', page],
    queryFn: () => appointmentApi.list(page),
  })

  const { data: patientsRes } = useQuery({
    queryKey: ['patients-list'],
    queryFn: () => patientApi.list(undefined, 0, 100),
  })

  const { data: doctorsRes } = useQuery({
    queryKey: ['doctors-list'],
    queryFn: () => doctorApi.list(undefined, 0, 100),
  })

  const createMutation = useMutation({
    mutationFn: () => appointmentApi.create(
      Number(form.patientId), Number(form.doctorId), form.date, form.reason || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      toast.success('Appointment created')
      setShowModal(false)
      setForm({ patientId: '', doctorId: '', date: '', reason: '' })
    },
    onError: () => toast.error('Failed to create appointment'),
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: AppointmentStatus }) =>
      appointmentApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      toast.success('Status updated')
    },
  })

  const pageData = data?.data?.data
  const patients = patientsRes?.data?.data?.content ?? []
  const doctors = doctorsRes?.data?.data?.content ?? []

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as AppointmentStatus[]).map((s) => (
            <button key={s}
              className="badge bg-surface border border-border text-ink-muted hover:border-primary hover:text-primary transition text-xs">
              {s}
            </button>
          ))}
        </div>
        <Button onClick={() => setShowModal(true)} icon={<Plus size={15} />}>New Appointment</Button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="border-b border-border px-6 py-4 flex items-center gap-3">
          <CalendarDays size={18} className="text-ink-muted" />
          <div>
            <h3 className="font-semibold text-ink">Appointments</h3>
            <p className="text-xs text-ink-muted">{pageData?.totalElements ?? 0} total</p>
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
              key: 'patient',
              header: 'Patient',
              render: (row) => {
                const a = row as unknown as Appointment
                return (
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                      {a.patient?.name?.charAt(0) ?? '?'}
                    </div>
                    <span className="font-medium">{a.patient?.name ?? '—'}</span>
                  </div>
                )
              },
            },
            {
              key: 'doctor',
              header: 'Doctor',
              render: (row) => {
                const a = row as unknown as Appointment
                return (
                  <div>
                    <p className="text-sm">Dr. {a.doctor?.name ?? '—'}</p>
                    <p className="text-xs text-ink-muted">{a.doctor?.specialization}</p>
                  </div>
                )
              },
            },
            {
              key: 'appointmentDate',
              header: 'Date & Time',
              render: (row) => {
                const a = row as unknown as Appointment
                return (
                  <div>
                    <p className="text-sm">{format(new Date(a.appointmentDate), 'MMM d, yyyy')}</p>
                    <p className="text-xs text-ink-muted">{format(new Date(a.appointmentDate), 'h:mm a')}</p>
                  </div>
                )
              },
            },
            {
              key: 'reason',
              header: 'Reason',
              render: (row) => {
                const a = row as unknown as Appointment
                return <span className="text-sm text-ink-muted">{a.reason || '—'}</span>
              },
            },
            {
              key: 'status',
              header: 'Status',
              render: (row) => {
                const a = row as unknown as Appointment
                return <StatusBadge status={a.status} />
              },
            },
            {
              key: 'actions',
              header: '',
              render: (row) => {
                const a = row as unknown as Appointment
                if (a.status === 'COMPLETED' || a.status === 'CANCELLED') return null
                return (
                  <div className="flex gap-1">
                    {a.status === 'SCHEDULED' && (
                      <button
                        onClick={() => updateStatus.mutate({ id: a.id, status: 'CONFIRMED' })}
                        className="badge bg-success-light text-success hover:opacity-80 cursor-pointer transition text-xs">
                        Confirm
                      </button>
                    )}
                    {(a.status === 'SCHEDULED' || a.status === 'CONFIRMED') && (
                      <button
                        onClick={() => updateStatus.mutate({ id: a.id, status: 'COMPLETED' })}
                        className="badge bg-primary/10 text-primary hover:opacity-80 cursor-pointer transition text-xs">
                        Complete
                      </button>
                    )}
                  </div>
                )
              },
            },
          ]}
        />
      </div>

      {/* Create Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Appointment" size="md">
        <div className="space-y-4">
          <Select
            label="Patient"
            value={form.patientId}
            onChange={(e) => setForm({ ...form, patientId: e.target.value })}
            options={patients.map((p) => ({ value: p.id, label: p.name }))}
          />
          <Select
            label="Doctor"
            value={form.doctorId}
            onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
            options={doctors.map((d) => ({ value: d.id, label: `Dr. ${d.name}` }))}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink">Date & Time</label>
            <input
              type="datetime-local"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="input"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink">Reason (optional)</label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              rows={2}
              className="input resize-none"
              placeholder="Reason for visit..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!form.patientId || !form.doctorId || !form.date}
              loading={createMutation.isPending}
            >
              Book Appointment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
