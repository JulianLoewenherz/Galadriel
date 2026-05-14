import { EventRow } from "./EventRow"
import type { TimelineItem } from "../lib/timeline"

interface Props {
  items: TimelineItem[]
  dateISO: string
}

export function Timeline({ items, dateISO }: Props) {
  const date = new Date(`${dateISO}T12:00:00`)
  const label = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-600">
        <p className="text-sm">No data for {label}</p>
        <p className="text-xs mt-1">Run the ingestion first: bun run src/ingestion/runner.ts</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="px-6 py-4 border-b border-white/[0.06]">
        <h2 className="text-xs font-medium uppercase tracking-widest text-gray-500">{label}</h2>
        <p className="text-xs text-gray-600 mt-0.5">{items.length} events</p>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {items.map((item, i) => (
          <EventRow key={i} item={item} />
        ))}
      </div>
    </div>
  )
}
