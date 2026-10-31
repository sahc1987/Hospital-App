import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, AlertTriangle, Pill } from 'lucide-react'
import { pharmacyApi } from '@/api/endpoints'
import { Table } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import type { PharmacyItem } from '@/types'

export default function Pharmacy() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [restockItem, setRestockItem] = useState<PharmacyItem | null>(null)
  const [restockQty, setRestockQty] = useState('')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['pharmacy', search, page],
    queryFn: () => pharmacyApi.list(search || undefined, page),
  })

  const { data: lowStock } = useQuery({
    queryKey: ['pharmacy-low'],
    queryFn: () => pharmacyApi.lowStock(),
  })

  const { register, handleSubmit, reset } = useForm<Partial<PharmacyItem>>()

  const createMutation = useMutation({
    mutationFn: (d: Partial<PharmacyItem>) => pharmacyApi.create(d),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['pharmacy'] })
      toast.success('Item added')
      setShowModal(false)
      reset()
    },
  })

  const restockMutation = useMutation({
    mutationFn: ({ id, qty }: { id: number; qty: number }) => pharmacyApi.restock(id, qty),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['pharmacy'] })
      toast.success('Stock updated')
      setRestockItem(null)
      setRestockQty('')
    },
  })

  const pageData = data?.data?.data
  const lowStockItems = lowStock?.data?.data ?? []

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Low stock alert */}
      {lowStockItems.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-warning/10 border border-warning/20 px-4 py-3">
          <AlertTriangle size={16} className="text-warning-ink shrink-0" />
          <p className="text-sm text-ink">
            <span className="font-semibold">{lowStockItems.length} items</span> below reorder level:&nbsp;
            {lowStockItems.slice(0, 3).map((i) => i.name).join(', ')}
            {lowStockItems.length > 3 ? ` +${lowStockItems.length - 3} more` : ''}
          </p>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            placeholder="Search medications…" aria-label="Search medications" className="input pl-9" />
        </div>
        <Button onClick={() => setShowModal(true)} icon={<Plus size={15} />}>Add item</Button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="border-b border-border px-6 py-4 flex items-center gap-3">
          <Pill size={18} className="text-ink-muted" />
          <div>
            <h3 className="font-semibold text-ink">Pharmacy Inventory</h3>
            <p className="text-xs text-ink-muted">{pageData?.totalElements ?? 0} items</p>
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
              key: 'name', header: 'Medication',
              render: (row) => {
                const p = row as unknown as PharmacyItem
                return (
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-ink-muted">{p.category}</p>
                  </div>
                )
              },
            },
            { key: 'unitPrice', header: 'Unit Price',
              render: (row) => `$${(row as unknown as PharmacyItem).unitPrice}` },
            {
              key: 'stockQuantity', header: 'Stock',
              render: (row) => {
                const p = row as unknown as PharmacyItem
                const low = p.stockQuantity <= p.reorderLevel
                return (
                  <span className={`font-semibold ${low ? 'text-danger' : 'text-success-ink'}`}>
                    {p.stockQuantity}
                    {low && <AlertTriangle size={12} className="inline ml-1" />}
                  </span>
                )
              },
            },
            { key: 'reorderLevel', header: 'Reorder At',
              render: (row) => (row as unknown as PharmacyItem).reorderLevel },
            {
              key: 'actions', header: '',
              render: (row) => {
                const p = row as unknown as PharmacyItem
                return (
                  <Button variant="secondary" size="sm" onClick={() => setRestockItem(p)}>
                    Restock
                  </Button>
                )
              },
            },
          ]}
        />
      </div>

      {/* Add item modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add pharmacy item" size="md">
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Name" {...register('name')} placeholder="Paracetamol 500mg" required />
            <Input label="Category" {...register('category')} placeholder="Analgesic" />
            <Input label="Unit Price ($)" type="number" step="0.01" {...register('unitPrice', { valueAsNumber: true })} />
            <Input label="Stock Quantity" type="number" {...register('stockQuantity', { valueAsNumber: true })} />
            <Input label="Reorder Level" type="number" {...register('reorderLevel', { valueAsNumber: true })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Add item</Button>
          </div>
        </form>
      </Modal>

      {/* Restock modal */}
      <Modal open={!!restockItem} onClose={() => setRestockItem(null)} title={`Restock: ${restockItem?.name}`} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">Current stock: <strong>{restockItem?.stockQuantity}</strong></p>
          <Input label="Quantity to add" type="number" value={restockQty}
            onChange={(e) => setRestockQty(e.target.value)} placeholder="50" />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setRestockItem(null)}>Cancel</Button>
            <Button
              onClick={() => restockItem && restockMutation.mutate({ id: restockItem.id, qty: Number(restockQty) })}
              disabled={!restockQty || Number(restockQty) <= 0}
              loading={restockMutation.isPending}
            >
              Update Stock
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
