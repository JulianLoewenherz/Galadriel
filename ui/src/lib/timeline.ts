import { invoke } from "@tauri-apps/api/core"
import { integrations, type TimelineItem } from "@galadriel/integrations/registry"

async function readDataFile(date: string, toolkit: string): Promise<Record<string, unknown> | null> {
  try {
    const text = await invoke<string>("read_data_file", { date, toolkit })
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return null
  }
}

export async function buildTimeline(dateISO: string): Promise<TimelineItem[]> {
  const timeline: TimelineItem[] = []

  for (const integration of integrations) {
    const raw = await readDataFile(dateISO, integration.toolkit)
    if (!raw) continue

    const items = integration.extract(raw)
    for (const item of items) {
      timeline.push({ ...item, source: integration.toolkit })
    }
  }

  const dayStart = new Date(`${dateISO}T00:00:00`).getTime()
  const dayEnd   = new Date(`${dateISO}T23:59:59`).getTime()

  return timeline
    .filter(item => {
      const ms = new Date(item.timestamp).getTime()
      return ms >= dayStart && ms <= dayEnd
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}

export type { TimelineItem }
