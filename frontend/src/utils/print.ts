// Print a standalone document (prescription, discharge summary) in its own window.
// A plain window avoids print-CSS fights with the app/dialog DOM; built via the DOM, not document.write.

/** HTML-escape a value for interpolation into print markup. */
export const esc = (s?: string | null) => (s ?? '').replace(/[&<>"']/g, (c) => `&#${c.codePointAt(0)};`)

const BASE_CSS = 'body{font:12pt system-ui,sans-serif;margin:2rem;color:#000}h1{font-size:18pt}p{margin:.4rem 0}'
  + 'table{border-collapse:collapse;width:100%;margin-top:1rem}th,td{border:1px solid #999;padding:.35rem .5rem;text-align:left}'
  + '.sign{margin-top:3rem}'

/** `body` must be built only from esc()-escaped values. Returns false when pop-ups are blocked. */
export function printHtml(title: string, body: string): boolean {
  const w = window.open('', '_blank', 'width=800,height=900')
  if (!w) return false
  w.document.title = title
  const style = w.document.createElement('style')
  style.textContent = BASE_CSS
  w.document.head.appendChild(style)
  w.document.body.innerHTML = body
  w.focus()
  w.print()
  return true
}
