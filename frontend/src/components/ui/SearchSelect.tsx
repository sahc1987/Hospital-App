import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions, Field, Label } from '@headlessui/react'
import { ChevronsUpDown, Loader2 } from 'lucide-react'

interface SearchSelectProps<T extends { id: number }> {
  label: string
  value: T | null
  onChange: (v: T | null) => void
  /** Server-side search; called with the debounced query ('' = first page). */
  search: (q: string) => Promise<T[]>
  /** Query-key prefix for the cache, e.g. 'patient-search'. */
  queryKey: string
  display: (v: T) => string
  /** Second line in each option (DOB, phone, specialty…), to tell same-named records apart. */
  detail?: (v: T) => string | undefined
  placeholder?: string
  disabled?: boolean
}

/** Searchable picker for large server-side lists (replaces capped native selects). */
export function SearchSelect<T extends { id: number }>({
  label, value, onChange, search, queryKey, display, detail, placeholder, disabled,
}: Readonly<SearchSelectProps<T>>) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 250)
    return () => window.clearTimeout(t)
  }, [query])

  const { data = [], isFetching } = useQuery({
    queryKey: [queryKey, debounced],
    queryFn: () => search(debounced),
    enabled: !disabled,
    staleTime: 30_000,
  })

  return (
    <Field disabled={disabled} className="flex flex-col gap-1.5">
      <Label className="text-sm font-medium text-ink">{label}</Label>
      <Combobox value={value} onChange={onChange} onClose={() => setQuery('')} by="id" immediate>
        <div className="relative">
          <ComboboxInput
            className="input pr-10 disabled:cursor-not-allowed disabled:opacity-70"
            displayValue={(v: T | null) => (v ? display(v) : '')}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            autoComplete="off"
          />
          <ComboboxButton className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-subtle">
            {isFetching
              ? <Loader2 size={15} className="animate-spin" aria-hidden="true" />
              : <ChevronsUpDown size={15} aria-hidden="true" />}
          </ComboboxButton>
        </div>
        <ComboboxOptions
          anchor="bottom start"
          // --anchor-max-height: Headless UI sets max-height inline when anchored, so max-h-* would be ignored
          className="z-[60] w-[var(--input-width)] overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-card-hover [--anchor-gap:4px] [--anchor-max-height:16rem] empty:invisible"
        >
          {!isFetching && data.length === 0 && (
            <p className="px-3 py-2 text-sm text-ink-muted">
              {debounced ? `No matches for "${debounced}".` : 'No records yet.'}
            </p>
          )}
          {data.map((item) => (
            <ComboboxOption
              key={item.id}
              value={item}
              className="cursor-pointer rounded-lg px-3 py-2 text-sm text-ink data-[focus]:bg-primary-50 data-[selected]:font-semibold"
            >
              <span className="block truncate">{display(item)}</span>
              {detail?.(item) && <span className="block truncate text-xs text-ink-muted">{detail(item)}</span>}
            </ComboboxOption>
          ))}
        </ComboboxOptions>
      </Combobox>
    </Field>
  )
}
