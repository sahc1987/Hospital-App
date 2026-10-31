import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Plus, Wrench, Pencil } from 'lucide-react'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { admissionApi, roomApi } from '@/api/endpoints'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { AdmitModal, type AdmitPreset } from '@/components/admissions/AdmitModal'
import { StayPanel } from '@/components/admissions/StayPanel'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/utils/cn'
import toast from 'react-hot-toast'
import type { Admission, BoardRoom, Room, RoomType, UserRole } from '@/types'

const MOVERS = new Set<UserRole>(['ADMIN', 'RECEPTIONIST', 'NURSE', 'DOCTOR'])
const TYPES: RoomType[] = ['GENERAL', 'PRIVATE', 'ICU', 'EMERGENCY', 'OT', 'MATERNITY']

/** Ward board: rooms by floor, each bed with its patient. Occupancy comes from admissions, never set by hand. */
export default function Rooms() {
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.user?.role) as UserRole | undefined
  const canAdmit = !!role && MOVERS.has(role)
  const canMaintain = role === 'ADMIN' || role === 'NURSE'
  const isAdmin = role === 'ADMIN'
  const [admit, setAdmit] = useState<AdmitPreset | null>(null)
  const [stay, setStay] = useState<Admission | null>(null)
  const [editing, setEditing] = useState<Partial<Room> | null>(null)

  const { data: board = [], isLoading } = useQuery({
    queryKey: ['rooms', 'board'],
    queryFn: async () => (await roomApi.board()).data.data,
    refetchInterval: 60_000,
  })
  const maintain = useMutation({
    mutationFn: (r: Room) => roomApi.updateStatus(r.id, r.status === 'MAINTENANCE' ? 'AVAILABLE' : 'MAINTENANCE'),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['rooms'] }); toast.success('Room updated') },
  })
  async function openStay(admissionId: number) {
    setStay((await admissionApi.get(admissionId)).data.data)
  }

  const beds = board.reduce((n, b) => n + b.room.capacity, 0)
  const used = board.reduce((n, b) => n + b.occupants.length, 0)
  const floors = [...new Set(board.map((b) => b.room.floor ?? 0))].sort((x, y) => x - y)

  return (
    <div className="space-y-6 motion-safe:animate-slide-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <dl className="flex flex-wrap gap-3">
          {[['Beds in use', `${used} / ${beds}`], ['Free beds', beds - used],
            ['Under maintenance', board.filter((b) => b.room.status === 'MAINTENANCE').length]].map(([k, v]) => (
            <div key={String(k)} className="card px-5 py-3">
              <dt className="text-xs text-ink-muted">{k}</dt>
              <dd className="text-2xl font-bold text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        {isAdmin && <Button icon={<Plus size={15} />} onClick={() => setEditing({ roomType: 'GENERAL', capacity: 1, dailyRate: 0 })}>Add room</Button>}
      </div>

      {isLoading ? <div className="card h-40 animate-pulse" /> : floors.map((floor) => (
        <section key={floor} aria-labelledby={`floor-${floor}`}>
          <h2 id={`floor-${floor}`} className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {floor ? 'Floor ' + String(floor) : 'No floor'}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {board.filter((b) => (b.room.floor ?? 0) === floor).map((b) => (
              <RoomCard key={b.room.id} b={b} canAdmit={canAdmit} canMaintain={canMaintain} isAdmin={isAdmin}
                onAdmit={() => setAdmit({ roomId: b.room.id })} onOpen={openStay}
                onMaintain={() => maintain.mutate(b.room)} onEdit={() => setEditing(b.room)} />
            ))}
          </div>
        </section>
      ))}

      {admit && <AdmitModal preset={admit} onClose={() => setAdmit(null)} />}
      <Modal open={!!stay} onClose={() => setStay(null)} title="Inpatient stay" size="full">
        {stay && <StayPanel admission={stay} onClose={() => setStay(null)} />}
      </Modal>
      {editing && <RoomForm room={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function badgeTone(maintenance: boolean, free: number): string {
  if (maintenance) return 'bg-warning-light text-warning-ink'
  return free === 0 ? 'bg-coral-light text-danger-ink' : 'bg-mint-light text-success-ink'
}

function RoomCard({ b, canAdmit, canMaintain, isAdmin, onAdmit, onOpen, onMaintain, onEdit }: {
  readonly b: BoardRoom; readonly canAdmit: boolean; readonly canMaintain: boolean; readonly isAdmin: boolean
  readonly onAdmit: () => void; readonly onOpen: (admissionId: number) => void
  readonly onMaintain: () => void; readonly onEdit: () => void
}) {
  const r = b.room
  const maintenance = r.status === 'MAINTENANCE'
  const free = maintenance ? 0 : r.capacity - b.occupants.length
  return (
    <article className={cn('card space-y-3 p-4', maintenance && 'bg-surface-alt')} aria-label={`Room ${r.roomNumber}`}>
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-ink">{r.roomNumber}</p>
          <p className="text-xs text-ink-muted">{r.roomType.toLowerCase()} · ${r.dailyRate}/night</p>
        </div>
        <span className={cn('rounded-md px-2 py-0.5 text-xs font-semibold', badgeTone(maintenance, free))}>
          {maintenance ? 'Maintenance' : `${b.occupants.length}/${r.capacity} beds`}
        </span>
      </header>

      <ul className="space-y-1.5">
        {b.occupants.map((o) => {
          const n = Math.max(0, differenceInCalendarDays(new Date(), parseISO(o.admission_date)))
          return (
            <li key={o.admission_id}>
              <button onClick={() => onOpen(o.admission_id)}
                className="flex w-full items-center justify-between gap-2 rounded-lg bg-primary-50 px-3 py-2 text-left text-sm hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 truncate font-medium text-primary-800">
                    {o.patient}
                    {o.alerts && <AlertTriangle size={13} className="shrink-0 text-danger-ink" aria-label="Clinical alerts" />}
                  </span>
                  <span className="block truncate text-xs text-ink-muted">{o.doctor}</span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-ink-muted">{n} night{n === 1 ? '' : 's'}</span>
              </button>
            </li>
          )
        })}
        {/* free beds are numbered after the occupied ones */}
        {Array.from({ length: free }, (_, i) => b.occupants.length + i + 1).map((bed) => (
          <li key={`bed-${bed}`}>
            {canAdmit ? (
              <button onClick={onAdmit}
                className="w-full rounded-lg border border-dashed border-primary-200 px-3 py-2 text-left text-sm text-primary-700 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                + Free bed — admit
              </button>
            ) : <p className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-ink-muted">Free bed</p>}
          </li>
        ))}
      </ul>

      {(isAdmin || (canMaintain && b.occupants.length === 0)) && (
        <footer className="flex justify-end gap-1">
          {canMaintain && b.occupants.length === 0 && (
            <Button size="sm" variant="ghost" icon={<Wrench size={13} />} onClick={onMaintain}>
              {maintenance ? 'End maintenance' : 'Maintenance'}
            </Button>
          )}
          {isAdmin && <Button size="sm" variant="ghost" icon={<Pencil size={13} />} onClick={onEdit} aria-label={`Edit room ${r.roomNumber}`} />}
        </footer>
      )}
    </article>
  )
}

function RoomForm({ room, onClose }: { readonly room: Partial<Room>; readonly onClose: () => void }) {
  const qc = useQueryClient()
  const [f, setF] = useState({
    roomNumber: room.roomNumber ?? '', roomType: room.roomType ?? 'GENERAL', floor: room.floor ?? '',
    capacity: room.capacity ?? 1, dailyRate: room.dailyRate ?? 0,
  })
  const save = useMutation({
    mutationFn: () => {
      const body = { ...f, floor: f.floor === '' ? undefined : Number(f.floor), capacity: Number(f.capacity), dailyRate: Number(f.dailyRate) }
      return room.id ? roomApi.update(room.id, body) : roomApi.create(body)
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['rooms'] }); toast.success(room.id ? 'Room updated' : 'Room added'); onClose() },
  })
  return (
    <Modal open onClose={onClose} title={room.id ? `Edit room ${room.roomNumber}` : 'Add room'} size="md">
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Room number" required value={f.roomNumber} onChange={(e) => setF({ ...f, roomNumber: e.target.value })} />
          <Select label="Type" required value={f.roomType} onChange={(e) => setF({ ...f, roomType: e.target.value as RoomType })}
            options={TYPES.map((t) => ({ value: t, label: t.charAt(0) + t.slice(1).toLowerCase() }))} />
          <Input label="Floor" type="number" value={f.floor} onChange={(e) => setF({ ...f, floor: e.target.value })} />
          <Input label="Beds (capacity)" type="number" min={1} max={50} required value={f.capacity}
            onChange={(e) => setF({ ...f, capacity: Number(e.target.value) })} />
          <Input label="Daily rate ($/night)" type="number" min={0} step="0.01" value={f.dailyRate}
            onChange={(e) => setF({ ...f, dailyRate: Number(e.target.value) })} />
        </div>
        <p className="text-xs text-ink-muted">1 bed = single-patient room. Capacity can't drop below the patients currently in the room.</p>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={save.isPending}>Save</Button>
        </div>
      </form>
    </Modal>
  )
}
