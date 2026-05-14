import { execSync } from "child_process"
import { mkdirSync, readFileSync, writeFileSync } from "fs"
import { join } from "path"
import { integrations } from "../integrations/registry"

const DATA_DIR = join(import.meta.dir, "../../data/raw")

// ── Composio helpers ─────────────────────────────────────────────────────────

function stripAnsi(s: string): string {
  return s.replace(/\x1B\[[0-9;]*[mGKHFJ]/g, "").replace(/\x1B\][^\x07]*\x07/g, "")
}

function parseComposioJson(raw: string): Record<string, unknown> {
  const clean = stripAnsi(raw).trim()
  const start = clean.indexOf("{")
  if (start < 0) throw new Error(`No JSON in output:\n${clean.slice(0, 200)}`)
  return JSON.parse(clean.slice(start))
}

const EXEC_OPTS = { encoding: "utf8" as const, maxBuffer: 10 * 1024 * 1024, stdio: ["pipe", "pipe", "pipe"] as ["pipe", "pipe", "pipe"] }

function isConnected(toolkit: string): boolean {
  try {
    const out = execSync(`composio link ${toolkit} --list`, EXEC_OPTS)
    return (parseComposioJson(out).total as number) > 0
  } catch {
    return false
  }
}

function execute(slug: string, params: Record<string, unknown>): Record<string, unknown> {
  const json = JSON.stringify(params).replace(/'/g, "'\\''")
  const out = execSync(`composio execute "${slug}" -d '${json}'`, EXEC_OPTS)
  const result = parseComposioJson(out)
  // Composio offloads large responses to a temp file
  if (result.storedInFile && result.outputFilePath) {
    return JSON.parse(readFileSync(result.outputFilePath as string, "utf8"))
  }
  return result
}

// ── Runner ────────────────────────────────────────────────────────────────────

const dateISO = Bun.argv[2] ?? (() => {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`
})()

const outDir = join(DATA_DIR, dateISO)
mkdirSync(outDir, { recursive: true })

console.log(`\nGaladriel ingestion — ${dateISO}`)
console.log("─".repeat(48))

const notConnected: string[] = []

for (const integration of integrations) {
  const label = integration.displayName.padEnd(22)

  if (!isConnected(integration.toolkit)) {
    console.log(`${label}· not connected`)
    notConnected.push(integration.toolkit)
    continue
  }

  const calls = integration.fetch(dateISO)
  const results: Record<string, unknown> = {}

  for (const call of calls) {
    try {
      results[call.slug] = execute(call.slug, call.params)
    } catch (err) {
      results[call.slug] = { error: String(err) }
    }
  }

  const outFile = join(outDir, `${integration.toolkit}.json`)
  writeFileSync(outFile, JSON.stringify(results, null, 2))
  console.log(`${label}✓  data/raw/${dateISO}/${integration.toolkit}.json`)
}

// ── Connection guide ──────────────────────────────────────────────────────────

if (notConnected.length > 0) {
  console.log(`\nTo connect more integrations, run:`)
  for (const tk of notConnected) {
    console.log(`  composio link ${tk}`)
  }
  console.log(`\nThen re-run:  bun run src/ingestion/runner.ts`)
}

console.log(`\nDone.\n`)
