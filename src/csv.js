// CSV building + browser download, kept out of the component so the formatting
// can be tested without a DOM.

export const CSV_HEAD =
  ['Name', 'Roll', 'Department', 'Year', 'Branch', 'Section', 'In', 'Out', 'Hours']

/**
 * "2026-08-08T11:20:00Z" -> "2026-08-08 16:50:00" in the viewer's timezone.
 * Excel does not parse ISO-8601 with a Z suffix, and reporting hours in UTC
 * when the club runs on IST would shift evening shifts onto the wrong day.
 */
export function localStamp(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
         `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

// Quote every field: names contain commas, and a bare comma splits the column.
// A literal quote is escaped by doubling it, per RFC 4180.
const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`

export function toCsv(rows) {
  const body = (rows ?? []).map(r => [
    r.name, r.roll, r.dept, r.year, r.branch, r.section,
    localStamp(r.punched_in),
    localStamp(r.punched_out),
    r.punched_out ? (r.hours ?? '') : 'STILL IN',
  ].map(esc).join(','))
  return [CSV_HEAD.map(esc).join(','), ...body].join('\r\n')
}

/**
 * Trigger a file download.
 *
 * Two things here are load-bearing:
 *  - the anchor must be IN the document; Firefox ignores .click() on a
 *    detached element, so the download silently never starts;
 *  - revokeObjectURL must be deferred. Revoking synchronously after .click()
 *    can invalidate the blob before the browser has begun reading it, which
 *    produces either nothing at all or a 0-byte file.
 */
export function download(filename, text, mime = 'text/csv;charset=utf-8') {
  // BOM so Excel opens UTF-8 correctly instead of mangling non-ASCII names
  const blob = new Blob(['﻿' + text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 1000)
}
