import { getSource } from "../lib/sources"
import type { TimelineItem } from "../lib/timeline"

interface Props {
  item: TimelineItem
}

export function EventRow({ item }: Props) {
  const src = getSource(item.source)
  const time = new Date(item.timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })

  return (
    <div className="flex items-start gap-4 px-6 py-3 hover:bg-white/[0.03] transition-colors group">
      {/* Time */}
      <span className="w-20 shrink-0 text-right text-xs font-mono text-gray-500 pt-0.5">
        {time}
      </span>

      {/* Source dot */}
      <div
        className="w-2 h-2 rounded-full shrink-0 mt-1.5"
        style={{ backgroundColor: src.color }}
      />

      {/* Source label + event label */}
      <div className="flex-1 min-w-0">
        <span
          className="text-[10px] font-medium uppercase tracking-wider mr-2"
          style={{ color: src.color }}
        >
          {src.label}
        </span>
        <span className="text-sm text-gray-300 truncate">{item.label}</span>
      </div>
    </div>
  )
}
