import { cn } from '@/utils/cn'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Column<T> {
  key: keyof T | string
  header: string
  render?: (row: T) => React.ReactNode
  className?: string
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField?: keyof T
  loading?: boolean
  emptyMessage?: string
  totalPages?: number
  currentPage?: number
  onPageChange?: (page: number) => void
}

const SKELETON_ROWS = [1, 2, 3, 4, 5]

export function Table<T extends Record<string, unknown>>({
  columns, data, keyField, loading, emptyMessage = 'No data found.',
  totalPages, currentPage = 0, onPageChange,
}: Readonly<TableProps<T>>) {
  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-card">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={cn('table-header whitespace-nowrap px-4 py-3 text-left', col.className)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && SKELETON_ROWS.map((n) => (
                <tr key={n} className="border-b border-border animate-pulse">
                  {columns.map((col) => (
                    <td key={String(col.key)} className="px-4 py-3">
                      <div className="h-4 rounded bg-surface-card" />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading && data.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-ink-muted">
                  {emptyMessage}
                </td>
              </tr>
            )}
            {!loading && data.map((row, i) => (
                <tr
                  key={keyField ? String(row[keyField]) : i}
                  className="border-b border-border last:border-0 hover:bg-surface-card/60 transition-colors"
                >
                  {columns.map((col) => (
                    // nowrap: on phones the table scrolls sideways instead of breaking every cell into 2–3 lines
                    <td key={String(col.key)} className={cn('whitespace-nowrap px-4 py-3 text-ink', col.className)}>
                      {col.render
                        ? col.render(row)
                        : String(row[col.key as keyof T] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages !== undefined && totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage === 0}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-ink-muted disabled:opacity-40 hover:bg-surface-card transition"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm text-ink-muted">
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-ink-muted disabled:opacity-40 hover:bg-surface-card transition"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
