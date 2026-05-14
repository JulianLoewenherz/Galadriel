import { existsSync, readFileSync, readdirSync } from "fs"
import { join } from "path"
import { integrations, type TimelineItem } from "../integrations/registry"

const DATA_DIR = join(import.meta.dir, "../../data/raw")

function buildTimeline(dateISO: string): TimelineItem[] {
  const dayDir = join(DATA_DIR, dateISO)
  if (!existsSync(dayDir)) {
    console.error(`No data for ${dateISO} — run the ingestion first.`)
    return []
  }

  const timeline: TimelineItem[] = []

  for (const integration of integrations) {
    const file = join(dayDir, `${integration.toolkit}.json`)
    if (!existsSync(file)) continue

    let raw: Record<string, unknown>
    try {
      raw = JSON.parse(readFileSync(file, "utf8"))
    } catch {
      console.warn(`  Could not parse ${file}`)
      continue
    }

    let items: ReturnType<typeof integration.extract>
    try {
      items = integration.extract(raw)
    } catch (err) {
      console.warn(`  [${integration.toolkit}] extract() threw: ${err}`)
      console.warn(`  Check the raw file: data/raw/${dateISO}/${integration.toolkit}.json`)
      continue
    }

    // Warn if the fetch succeeded but extract found nothing — likely a schema mismatch
    const anySucceeded = Object.values(raw).some(
      (r) => r != null && typeof r === "object" && (r as Record<string, unknown>).successful === true
    )
    if (items.length === 0 && anySucceeded) {
      console.warn(`  [${integration.toolkit}] fetch succeeded but extract() returned 0 items — schema may have changed`)
      console.warn(`  Check: data/raw/${dateISO}/${integration.toolkit}.json`)
    }

    for (const item of items) {
      timeline.push({ ...item, source: integration.toolkit })
    }
  }

  // Filter to the local calendar day — extract() functions can return items with
  // timestamps outside the target day (e.g. GitHub repos with all-time pushed_at).
  const dayStart = new Date(`${dateISO}T00:00:00`).getTime()
  const dayEnd   = new Date(`${dateISO}T23:59:59`).getTime()
  const filtered = timeline.filter((item) => {
    const ms = new Date(item.timestamp).getTime()
    return ms >= dayStart && ms <= dayEnd
  })

  // Sort by milliseconds — don't string-compare because some sources emit
  // local-with-offset (calendar: "T09:30:00-07:00") and others emit UTC ("T16:30:00Z").
  // String order would be wrong; new Date() normalises all ISO 8601 variants correctly.
  return filtered.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}

// ── CLI ───────────────────────────────────────────────────────────────────────

const dateISO = Bun.argv[2] ?? (() => {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`
})()

const timeline = buildTimeline(dateISO)

console.log(`\nTimeline for ${dateISO}  (${timeline.length} events)\n${"─".repeat(56)}`)

for (const item of timeline) {
  const time = new Date(item.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
  const src = `[${item.source}]`.padEnd(18)
  console.log(`${time}  ${src}  ${item.label}`)
}

console.log()

export { buildTimeline }
