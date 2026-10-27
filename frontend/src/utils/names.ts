/** Doctor display name. Stored names may already carry the title ("Dr. James Smith"), so only add it when missing. */
export function withDr(name?: string) {
  if (!name) return '—'
  return name.startsWith('Dr') ? name : 'Dr. ' + name
}
