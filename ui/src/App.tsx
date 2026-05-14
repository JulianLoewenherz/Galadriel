import { useEffect, useState } from "react"
import { buildTimeline, type TimelineItem } from "./lib/timeline"
import { Timeline } from "./components/Timeline"

function todayISO(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`
}

function offsetDate(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T12:00:00`)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export default function App() {
  const [dateISO, setDateISO] = useState("2026-05-13")
  const [items, setItems] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    buildTimeline(dateISO).then((result) => {
      setItems(result)
      setLoading(false)
    })
  }, [dateISO])

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <span className="text-sm font-semibold tracking-wide text-gray-200">Galadriel</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDateISO(d => offsetDate(d, -1))}
            className="text-gray-500 hover:text-gray-200 transition-colors text-lg leading-none"
          >
            ←
          </button>
          <span className="text-xs font-mono text-gray-400 w-24 text-center">{dateISO}</span>
          <button
            onClick={() => setDateISO(d => offsetDate(d, 1))}
            disabled={dateISO >= todayISO()}
            className="text-gray-500 hover:text-gray-200 transition-colors disabled:opacity-30 text-lg leading-none"
          >
            →
          </button>
        </div>
        <button
          onClick={() => setDateISO(todayISO())}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          today
        </button>
      </header>

      {/* Timeline */}
      <main className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-600 text-sm">
            Loading…
          </div>
        ) : (
          <Timeline items={items} dateISO={dateISO} />
        )}
      </main>
    </div>
  )
}
