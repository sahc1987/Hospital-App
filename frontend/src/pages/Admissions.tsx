import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BedDouble } from 'lucide-react'
import { admissionApi } from '@/api/endpoints'
import { Table } from '@/components/ui/Table'
import { StatusBadge } from '@/components/ui/Badge'
import type { Admission } from '@/types'
import { format } from 'date-fns'

export default function Admissions() {
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['admissions', page],
    queryFn: () => admissionApi.list(page),
  })

  const pageData = data?.data?.data

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="card p-0 overflow-hidden">
        <div className="border-b border-border px-6 py-4 flex items-center gap-3">
          <BedDouble size={18} className="text-ink-muted" />
          <div>
            <h3 className="font-semibold text-ink">Admissions (OPD / IPD)</h3>
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
              key: 'patient', header: 'Patient',
              render: (row) => {
                const a = row as unknown as Admission
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
              key: 'doctor', header: 'Doctor',
              render: (row) => {
                const a = row as unknown as Admission
                return `Dr. ${a.doctor?.name ?? '—'}`
              },
            },
            {
              key: 'room', header: 'Room',
              render: (row) => {
                const a = row as unknown as Admission
                return a.room ? (
                  <span className="badge bg-surface-card border border-border text-ink">
                    {a.room.roomNumber} · {a.room.roomType}
                  </span>
                ) : '—'
              },
            },
            {
              key: 'admissionDate', header: 'Admitted',
              render: (row) => {
                const a = row as unknown as Admission
                return <span className="text-ink-muted">{format(new Date(a.admissionDate), 'MMM d, yyyy')}</span>
              },
            },
            {
              key: 'dischargeDate', header: 'Discharged',
              render: (row) => {
                const a = row as unknown as Admission
                return a.dischargeDate
                  ? <span className="text-ink-muted">{format(new Date(a.dischargeDate), 'MMM d, yyyy')}</span>
                  : <span className="badge bg-primary/10 text-primary">Active</span>
              },
            },
            {
              key: 'status', header: 'Status',
              render: (row) => <StatusBadge status={(row as unknown as Admission).status} />,
            },
          ]}
        />
      </div>
    </div>
  )
}
