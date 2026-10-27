import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BedDouble, Plus, AlertTriangle } from 'lucide-react'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { admissionApi } from '@/api/endpoints'
import { Table } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge } from '@/components/ui/Badge'
import { AdmitModal } from '@/components/admissions/AdmitModal'
import { StayPanel } from '@/components/admissions/StayPanel'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/utils/cn'
import type { Admission, AdmissionStatus, UserRole } from '@/types'

const MOVERS: UserRole[] = ['ADMIN', 'RECEPTIONIST', 'NURSE', 'DOCTOR']

export default function Admissions() {
  const role = useAuthStore((s) => s.user?.role) as UserRole | undefined
  const [status, setStatus] = useState<AdmissionStatus>('ADMITTED')
  const [page, setPage] = useState(0)
  const [admitting, setAdmitting] = useState(false)
  const [open, setOpen] = useState<Admission | null>(null)
  useEffect(() => setPage(0), [status])

  const { data, isLoading } = useQuery({
    queryKey: ['admissions', status, page],
    queryFn: async () => (await admissionApi.list(status, page)).data.data,
  })

  return (
    <div className="space-y-5 motion-safe:animate-slide-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-surface p-1 shadow-card" role="group" aria-label="Stays">
          {([['ADMITTED', 'Current patients'], ['DISCHARGED', 'Discharged']] as const).map(([s, label]) => (
            <button key={s} onClick={() => setStatus(s)} aria-pressed={status === s}
              className={cn('rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                status === s ? 'bg-primary text-white' : 'text-ink-muted hover:text-ink')}>
              {label}
            </button>
          ))}
        </div>
        {role && MOVERS.includes(role) && (
          <Button onClick={() => setAdmitting(true)} icon={<Plus size={15} />}>Admit patient</Button>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <BedDouble size={18} className="text-ink-muted" aria-hidden="true" />
          <div>
            <h3 className="font-semibold text-ink">{status === 'ADMITTED' ? 'Current inpatients' : 'Discharged stays'}</h3>
            <p className="text-xs text-ink-muted">{data?.totalElements ?? 0} total</p>
          </div>
        </div>

        <Table
          data={(data?.content ?? []) as unknown as Record<string, unknown>[]}
          loading={isLoading}
          keyField={'id' as never}
          totalPages={data?.totalPages}
          currentPage={page}
          onPageChange={setPage}
          emptyMessage={status === 'ADMITTED' ? 'No patients admitted.' : 'No discharged stays.'}
          columns={[
            { key: 'patient', header: 'Patient', render: (row) => {
              const a = row as unknown as Admission
              return (
                <span className="flex items-center gap-2 font-medium">
                  {a.patient?.name ?? '—'}
                  {(a.patient?.allergies || a.patient?.conditions) && (
                    <AlertTriangle size={14} className="text-danger-ink" aria-label="Has clinical alerts" />
                  )}
                </span>
              )
            } },
            { key: 'room', header: 'Room', render: (row) => {
              const a = row as unknown as Admission
              return a.room ? `${a.room.roomNumber} · ${a.room.roomType.toLowerCase()}` : <span className="text-warning-ink">Pending bed</span>
            } },
            { key: 'doctor', header: 'Attending', render: (row) => (row as unknown as Admission).doctor?.name ?? '—' },
            { key: 'admissionDate', header: 'Admitted', render: (row) => {
              const a = row as unknown as Admission
              const end = a.dischargeDate ? parseISO(a.dischargeDate) : new Date()
              const n = Math.max(0, differenceInCalendarDays(end, parseISO(a.admissionDate)))
              return (
                <div>
                  <p className="text-sm">{format(parseISO(a.admissionDate), 'MMM d, yyyy')}</p>
                  <p className="text-xs text-ink-muted">{n} night{n === 1 ? '' : 's'}{a.dischargeDate && ` · out ${format(parseISO(a.dischargeDate), 'MMM d')}`}</p>
                </div>
              )
            } },
            { key: 'status', header: 'Status', render: (row) => <StatusBadge status={(row as unknown as Admission).status} /> },
            { key: 'actions', header: '', render: (row) => (
              <Button size="sm" variant="secondary" onClick={() => setOpen(row as unknown as Admission)}>Open stay</Button>
            ) },
          ]}
        />
      </div>

      {admitting && <AdmitModal preset={{}} onClose={() => setAdmitting(false)} />}
      <Modal open={!!open} onClose={() => setOpen(null)} title="Inpatient stay" size="full">
        {open && <StayPanel admission={open} onClose={() => setOpen(null)} />}
      </Modal>
    </div>
  )
}
