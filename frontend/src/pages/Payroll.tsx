import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DollarSign, CheckCircle2 } from 'lucide-react'
import { payrollApi } from '@/api/endpoints'
import { Table } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import toast from 'react-hot-toast'
import type { Payroll } from '@/types'

export default function PayrollPage() {
  const [page, setPage] = useState(0)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['payroll', page],
    queryFn: () => payrollApi.list(page),
  })

  const markPaidMutation = useMutation({
    mutationFn: payrollApi.markPaid,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll'] }); toast.success('Marked as paid') },
  })

  const pageData = data?.data?.data
  const totalPayout = pageData?.content.reduce((s, p) => s + p.netSalary, 0) ?? 0

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Summary */}
      <div className="card-dark flex items-center justify-between p-5 rounded-2xl">
        <div>
          <p className="text-sm text-white/80">Total Payroll This Month</p>
          <p className="text-3xl font-bold text-white mt-1">${totalPayout.toLocaleString()}</p>
        </div>
        <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-primary/20">
          <DollarSign size={22} className="text-primary" />
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="border-b border-border px-6 py-4">
          <h3 className="font-semibold text-ink">Payroll Records</h3>
          <p className="text-xs text-ink-muted">{pageData?.totalElements ?? 0} records</p>
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
              key: 'employee', header: 'Employee',
              render: (row) => {
                const p = row as unknown as Payroll
                return (
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 flex items-center justify-center rounded-full bg-surface-dark text-white text-xs font-semibold">
                      {p.employee?.name?.charAt(0) ?? '?'}
                    </div>
                    <div>
                      <p className="font-medium">{p.employee?.name ?? '—'}</p>
                      <p className="text-xs text-ink-muted">{p.employee?.role}</p>
                    </div>
                  </div>
                )
              },
            },
            { key: 'month', header: 'Month',
              render: (row) => <span className="badge bg-surface-card border border-border">{(row as unknown as Payroll).month}</span> },
            { key: 'basicSalary', header: 'Basic',
              render: (row) => `$${(row as unknown as Payroll).basicSalary.toLocaleString()}` },
            { key: 'allowances', header: 'Allowances',
              render: (row) => `+$${(row as unknown as Payroll).allowances.toLocaleString()}` },
            { key: 'deductions', header: 'Deductions',
              render: (row) => <span className="text-danger">-${(row as unknown as Payroll).deductions.toLocaleString()}</span> },
            { key: 'netSalary', header: 'Net',
              render: (row) => <span className="font-semibold text-ink">${(row as unknown as Payroll).netSalary.toLocaleString()}</span> },
            {
              key: 'paid', header: 'Status',
              render: (row) => {
                const p = row as unknown as Payroll
                return p.paid
                  ? <Badge variant="success"><CheckCircle2 size={11} className="inline mr-1" />Paid</Badge>
                  : <Badge variant="warning">Pending</Badge>
              },
            },
            {
              key: 'actions', header: '',
              render: (row) => {
                const p = row as unknown as Payroll
                if (p.paid) return null
                return (
                  <Button size="sm" variant="dark"
                    onClick={() => markPaidMutation.mutate(p.id)}
                    loading={markPaidMutation.isPending}>
                    Mark Paid
                  </Button>
                )
              },
            },
          ]}
        />
      </div>
    </div>
  )
}
