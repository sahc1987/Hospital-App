import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BedDouble, ChevronLeft, ChevronRight } from 'lucide-react'
import { roomApi } from '@/api/endpoints'
import { StatusBadge } from '@/components/ui/Badge'
import type { Room } from '@/types'

const roomTypeColors: Record<string, string> = {
  GENERAL:   'bg-blue-50 border-blue-100',
  PRIVATE:   'bg-purple-50 border-purple-100',
  ICU:       'bg-red-50 border-red-100',
  EMERGENCY: 'bg-orange-50 border-orange-100',
  OT:        'bg-yellow-50 border-yellow-100',
  MATERNITY: 'bg-pink-50 border-pink-100',
}

export default function Rooms() {
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['rooms', page],
    queryFn: () => roomApi.list(page),
  })

  const { data: statsData } = useQuery({
    queryKey: ['rooms-stats'],
    queryFn: () => roomApi.stats(),
  })

  const pageData = data?.data?.data
  const rooms = (pageData?.content ?? []) as Room[]
  const totalPages = pageData?.totalPages ?? 0
  const stats = statsData?.data?.data
  const available = stats?.available ?? 0
  const occupied  = stats?.occupied ?? 0
  const total     = stats?.total ?? 0

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Summary */}
      <div className="flex items-center gap-4">
        <div className="card flex items-center gap-3 flex-1">
          <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-success/10">
            <BedDouble size={18} className="text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold text-ink">{available}</p>
            <p className="text-xs text-ink-muted">Available</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 flex-1">
          <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-danger/10">
            <BedDouble size={18} className="text-danger" />
          </div>
          <div>
            <p className="text-2xl font-bold text-ink">{occupied}</p>
            <p className="text-xs text-ink-muted">Occupied</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 flex-1">
          <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-primary/10">
            <BedDouble size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-ink">{total}</p>
            <p className="text-xs text-ink-muted">Total Rooms</p>
          </div>
        </div>
      </div>

      {/* Room grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {rooms.map((room) => (
            <div
              key={room.id}
              className={`rounded-xl border p-3 transition-all hover:shadow-card-hover ${roomTypeColors[room.roomType] ?? 'bg-surface border-border'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold text-ink">{room.roomNumber}</p>
                <BedDouble size={14} className={room.status === 'AVAILABLE' ? 'text-success' : room.status === 'OCCUPIED' ? 'text-danger' : 'text-warning'} />
              </div>
              <p className="text-xs text-ink-muted mb-2">{room.roomType} · Fl. {room.floor ?? '?'}</p>
              <StatusBadge status={room.status} />
              <p className="text-xs text-ink-muted mt-2">${room.dailyRate}/day</p>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 0}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-ink-muted disabled:opacity-40 hover:bg-surface-card transition"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm text-ink-muted">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages - 1}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-ink-muted disabled:opacity-40 hover:bg-surface-card transition"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
