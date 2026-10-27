import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FlaskConical } from 'lucide-react'
import { labApi } from '@/api/endpoints'
import { Table } from '@/components/ui/Table'
import { StatusBadge } from '@/components/ui/Badge'
import type { LabTest } from '@/types'
import { format } from 'date-fns'
import { withDr } from '@/utils/names'

export default function Lab() {
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['lab-tests', page],
    queryFn: () => labApi.list(page),
  })

  const pageData = data?.data?.data

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="card p-0 overflow-hidden">
        <div className="border-b border-border px-6 py-4 flex items-center gap-3">
          <FlaskConical size={18} className="text-ink-muted" />
          <div>
            <h3 className="font-semibold text-ink">Laboratory Tests</h3>
            <p className="text-xs text-ink-muted">{pageData?.totalElements ?? 0} tests</p>
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
              key: 'testName', header: 'Test',
              render: (row) => {
                const t = row as unknown as LabTest
                return <span className="font-medium">{t.testName}</span>
              },
            },
            {
              key: 'patient', header: 'Patient',
              render: (row) => {
                const t = row as unknown as LabTest
                return (
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                      {t.patient?.name?.charAt(0) ?? '?'}
                    </div>
                    <span>{t.patient?.name ?? '—'}</span>
                  </div>
                )
              },
            },
            {
              key: 'doctor', header: 'Ordered By',
              render: (row) => {
                const t = row as unknown as LabTest
                return withDr(t.doctor?.name)
              },
            },
            {
              key: 'orderedDate', header: 'Ordered',
              render: (row) => {
                const t = row as unknown as LabTest
                return <span className="text-ink-muted">{format(new Date(t.orderedDate), 'MMM d, yyyy')}</span>
              },
            },
            {
              key: 'status', header: 'Status',
              render: (row) => <StatusBadge status={(row as unknown as LabTest).status} />,
            },
          ]}
        />
      </div>
    </div>
  )
}
