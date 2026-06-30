import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DollarSign, Clock, CheckCircle2 } from 'lucide-react'
import { billingApi } from '@/api/endpoints'
import { Table } from '@/components/ui/Table'
import { StatusBadge } from '@/components/ui/Badge'
import { StatCard } from '@/components/ui/StatCard'
import type { Bill } from '@/types'
import { format } from 'date-fns'

export default function Billing() {
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['bills', page],
    queryFn: () => billingApi.list(page),
  })

  const pageData = data?.data?.data

  const totalRevenue = pageData?.content.reduce((s, b) => s + b.paidAmount, 0) ?? 0
  const pendingCount = pageData?.content.filter((b) => b.status === 'PENDING').length ?? 0
  const paidCount = pageData?.content.filter((b) => b.status === 'PAID').length ?? 0

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard dark title="Total Collected" value={`$${totalRevenue.toLocaleString()}`}
          icon={<DollarSign size={18} className="text-white" />} trend={5.6} />
        <StatCard title="Pending Bills" value={pendingCount}
          icon={<Clock size={18} />} />
        <StatCard title="Paid This Period" value={paidCount}
          icon={<CheckCircle2 size={18} />} accent />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign size={18} className="text-ink-muted" />
            <div>
              <h3 className="font-semibold text-ink">Bills</h3>
              <p className="text-xs text-ink-muted">{pageData?.totalElements ?? 0} total</p>
            </div>
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
              key: 'id', header: 'Bill #',
              render: (row) => <span className="font-mono text-sm font-medium text-ink">#{(row as unknown as Bill).id}</span>,
            },
            {
              key: 'patient', header: 'Patient',
              render: (row) => {
                const b = row as unknown as Bill
                return (
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                      {b.patient?.name?.charAt(0) ?? '?'}
                    </div>
                    <span className="font-medium">{b.patient?.name ?? '—'}</span>
                  </div>
                )
              },
            },
            {
              key: 'billDate', header: 'Date',
              render: (row) => {
                const b = row as unknown as Bill
                return <span className="text-sm text-ink-muted">{format(new Date(b.billDate), 'MMM d, yyyy')}</span>
              },
            },
            {
              key: 'totalAmount', header: 'Total',
              render: (row) => {
                const b = row as unknown as Bill
                return <span className="font-semibold">${b.totalAmount.toLocaleString()}</span>
              },
            },
            {
              key: 'paidAmount', header: 'Paid',
              render: (row) => {
                const b = row as unknown as Bill
                return <span className="font-semibold text-success">${b.paidAmount.toLocaleString()}</span>
              },
            },
            {
              key: 'status', header: 'Status',
              render: (row) => <StatusBadge status={(row as unknown as Bill).status} />,
            },
            {
              key: 'balance', header: 'Balance',
              render: (row) => {
                const b = row as unknown as Bill
                const balance = b.totalAmount - b.paidAmount - b.discount
                return balance > 0
                  ? <span className="font-semibold text-danger">${balance.toLocaleString()}</span>
                  : <span className="text-ink-subtle">—</span>
              },
            },
          ]}
        />
      </div>
    </div>
  )
}
