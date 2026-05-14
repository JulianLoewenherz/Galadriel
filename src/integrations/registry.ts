export type ComposioCall = {
  slug: string
  params: Record<string, unknown>
}

// A single event on the timeline, extracted from a raw Composio result.
// All integrations produce this shape — it's the only normalization needed for sorting.
export type TimelineItem = {
  timestamp: string   // ISO 8601 — all Composio timestamps are this format, directly sortable
  source: string      // toolkit slug, filled in by the runner
  label: string       // human-readable event description
  url: string         // display_url — always present in Composio items, links back to source
  raw: unknown        // original Composio item, kept intact for LLM analysis
}

export type Integration = {
  toolkit: string      // composio slug — passed to `composio link <toolkit>`
  displayName: string
  fetch: (dateISO: string) => ComposioCall[]
  // extract() maps raw Composio JSON → timeline items.
  // Each integration knows its own timestamp field and label field.
  // Returns [] if the response has no items or an unrecognized shape.
  extract: (raw: Record<string, unknown>) => Omit<TimelineItem, "source">[]
}

// ── User config ───────────────────────────────────────────────────────────────
// Fill in handles for integrations that need them to fetch your content.
export const USER_HANDLES = {
  twitter: "YOUR_TWITTER_HANDLE",  // e.g. "janedoe" — without the @
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function dayBounds(dateISO: string): { start: string; end: string } {
  return {
    start: new Date(`${dateISO}T00:00:00`).toISOString(),
    end: new Date(`${dateISO}T23:59:59`).toISOString(),
  }
}

function dayBoundsMs(dateISO: string): { start: number; end: number } {
  return {
    start: new Date(`${dateISO}T00:00:00`).getTime(),
    end: new Date(`${dateISO}T23:59:59`).getTime(),
  }
}

function dayBoundsSec(dateISO: string): { start: number; end: number } {
  const ms = dayBoundsMs(dateISO)
  return { start: Math.floor(ms.start / 1000), end: Math.floor(ms.end / 1000) }
}

// Safe nested get — returns undefined instead of throwing
function get(obj: unknown, ...keys: string[]): unknown {
  let cur = obj
  for (const k of keys) {
    if (cur == null || typeof cur !== "object") return undefined
    cur = (cur as Record<string, unknown>)[k]
  }
  return cur
}

function arr(val: unknown): unknown[] {
  return Array.isArray(val) ? val : []
}

// ── Integrations ──────────────────────────────────────────────────────────────
// To add a new integration: append one object below.
//   toolkit  → the slug passed to `composio link <toolkit>`
//   fetch()  → returns Composio tool calls for the day
//   extract() → maps raw response → TimelineItem[]
//
// Finding the right fields: run `composio execute <SLUG> --get-schema` or check
// a raw file in data/raw/<date>/<toolkit>.json after a successful fetch.

export const integrations: Integration[] = [

  // ── Calendar & scheduling ────────────────────────────────────────────────

  {
    toolkit: "googlecalendar",
    displayName: "Google Calendar",
    fetch(dateISO) {
      const { start, end } = dayBounds(dateISO)
      return [{
        slug: "GOOGLECALENDAR_EVENTS_LIST_ALL_CALENDARS",
        params: { time_min: start, time_max: end, single_events: true, response_detail: "minimal", max_results_per_calendar: 100 },
      }]
    },
    extract(raw) {
      // summary_view is returned for minimal detail mode; falls back to events[]
      const items = arr(get(raw, "GOOGLECALENDAR_EVENTS_LIST_ALL_CALENDARS", "data", "summary_view"))
        .concat(arr(get(raw, "GOOGLECALENDAR_EVENTS_LIST_ALL_CALENDARS", "data", "events")))
      const seen = new Set<string>()
      return items.flatMap((e) => {
        const id = (get(e, "event_id") ?? get(e, "id")) as string | undefined
        if (!id || seen.has(id)) return []
        seen.add(id)
        const timestamp = (get(e, "start") as string | undefined) ?? ""
        if (!timestamp) return []
        return [{ timestamp, label: (get(e, "title") ?? get(e, "summary") ?? "Calendar event") as string, url: (get(e, "display_url") ?? "") as string, raw: e }]
      })
    },
  },

  {
    toolkit: "zoom",
    displayName: "Zoom",
    fetch(dateISO) {
      const { start, end } = dayBounds(dateISO)
      return [{
        slug: "ZOOM_LIST_MEETINGS",
        params: { type: "scheduled", from: start.split("T")[0], to: end.split("T")[0], page_size: 50 },
      }]
    },
    extract(raw) {
      const items = arr(get(raw, "ZOOM_LIST_MEETINGS", "data", "meetings"))
      return items.map((m) => ({
        timestamp: (get(m, "start_time") ?? "") as string,
        label: `Zoom: ${get(m, "topic") ?? "Meeting"}`,
        url: (get(m, "join_url") ?? get(m, "display_url") ?? "") as string,
        raw: m,
      })).filter((x) => x.timestamp)
    },
  },

  // ── Email & messaging ────────────────────────────────────────────────────

  {
    toolkit: "gmail",
    displayName: "Gmail",
    fetch(dateISO) {
      // Gmail's after:/before: operators are UTC-based, so pass Unix timestamps
      // of local-midnight boundaries so the query matches the user's actual calendar day.
      const startSec = Math.floor(new Date(`${dateISO}T00:00:00`).getTime() / 1000)
      const endSec   = Math.floor(new Date(`${dateISO}T23:59:59`).getTime() / 1000)
      return [{
        slug: "GMAIL_FETCH_EMAILS",
        params: {
          query: `after:${startSec} before:${endSec} category:primary`,
          user_id: "me",
          max_results: 100,
          include_payload: false,
          ids_only: false,
          include_spam_trash: false,
        },
      }]
    },
    extract(raw) {
      const items = arr(get(raw, "GMAIL_FETCH_EMAILS", "data", "messages"))
      return items.map((m) => ({
        timestamp: (get(m, "messageTimestamp") ?? "") as string,
        label: (get(m, "subject") ?? "Email") as string,
        url: (get(m, "display_url") ?? "") as string,
        raw: m,
      })).filter((x) => x.timestamp)
    },
  },

  {
    toolkit: "slack",
    displayName: "Slack",
    fetch(dateISO) {
      return [{
        slug: "SLACK_SEARCH_MESSAGES",
        params: { query: `after:${dateISO} before:${dateISO}`, count: 100, sort: "timestamp", sort_dir: "asc" },
      }]
    },
    extract(raw) {
      const items = arr(get(raw, "SLACK_SEARCH_MESSAGES", "data", "messages", "matches"))
      return items.map((m) => {
        // Slack ts is a Unix float string like "1715000000.000100"
        const ts = get(m, "ts") as string | undefined
        const timestamp = ts ? new Date(parseFloat(ts) * 1000).toISOString() : ""
        return {
          timestamp,
          label: `Slack: ${(get(m, "text") as string ?? "").slice(0, 80)}`,
          url: (get(m, "permalink") ?? get(m, "display_url") ?? "") as string,
          raw: m,
        }
      }).filter((x) => x.timestamp)
    },
  },

  {
    toolkit: "discordbot",
    displayName: "Discord",
    fetch(_dateISO) {
      return [{ slug: "DISCORD_LIST_MY_GUILDS", params: {} }]
    },
    extract(raw) {
      // Initial call only lists guilds — messages come from follow-up channel calls.
      // Items here are guild objects, not messages; we surface them as context, not timeline events.
      const guilds = arr(get(raw, "DISCORD_LIST_MY_GUILDS", "data", "details") ?? get(raw, "DISCORD_LIST_MY_GUILDS", "data", "guilds"))
      return guilds.map((g) => ({
        timestamp: new Date().toISOString(), // guilds have no timestamp — placeholder
        label: `Discord guild: ${get(g, "name") ?? "unknown"}`,
        url: (get(g, "display_url") ?? "") as string,
        raw: g,
      }))
    },
  },

  // ── Code & work ──────────────────────────────────────────────────────────

  {
    toolkit: "github",
    displayName: "GitHub",
    fetch(dateISO) {
      const { start, end } = dayBounds(dateISO)
      return [
        // Gets repos sorted by push time — extract() filters to those pushed today.
        // GITHUB_LIST_COMMITS requires owner+repo and must be called per-repo;
        // that multi-step logic lives outside the basic fetch (future enhancement).
        { slug: "GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER", params: { per_page: 50, page: 1, sort: "pushed" } },
        // List commits on the authenticated user's personal repos pushed today
        { slug: "GITHUB_LIST_COMMITS", params: { owner: "", repo: "", since: start, until: end, per_page: 50 } },
      ]
    },
    extract(raw) {
      // Repos pushed on this day act as a proxy for code activity
      const repos = arr(get(raw, "GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER", "data", "repositories"))
      const repoItems = repos
        .filter((r) => {
          const pushed = get(r, "pushed_at") as string | undefined
          return pushed != null
        })
        .map((r) => ({
          timestamp: get(r, "pushed_at") as string,
          label: `GitHub push: ${get(r, "full_name") ?? get(r, "name") ?? "repo"}`,
          url: (get(r, "html_url") ?? get(r, "display_url") ?? "") as string,
          raw: r,
        }))

      // Commits (populated once per-repo calls are wired up)
      const commits = arr(get(raw, "GITHUB_LIST_COMMITS", "data", "details") ?? get(raw, "GITHUB_LIST_COMMITS", "data", "commits"))
      const commitItems = commits.map((c) => ({
        timestamp: (get(c, "commit", "author", "date") ?? get(c, "commit", "committer", "date") ?? "") as string,
        label: `Commit: ${(get(c, "commit", "message") as string ?? "").split("\n")[0].slice(0, 80)}`,
        url: (get(c, "html_url") ?? get(c, "display_url") ?? "") as string,
        raw: c,
      })).filter((x) => x.timestamp)

      return [...repoItems, ...commitItems]
    },
  },

  {
    toolkit: "notion",
    displayName: "Notion",
    fetch(_dateISO) {
      return [{
        slug: "NOTION_SEARCH_NOTION_PAGE",
        params: { query: "", sort: { direction: "descending", timestamp: "last_edited_time" }, page_size: 20 },
      }]
    },
    extract(raw) {
      const items = arr(get(raw, "NOTION_SEARCH_NOTION_PAGE", "data", "results"))
      return items.map((p) => {
        const titleArr = arr(get(p, "properties", "title", "title") ?? get(p, "properties", "Name", "title"))
        const title = (get(titleArr[0], "plain_text") ?? get(p, "url") ?? "Notion page") as string
        return {
          timestamp: (get(p, "last_edited_time") ?? "") as string,
          label: `Notion: ${title}`,
          url: (get(p, "url") ?? get(p, "display_url") ?? "") as string,
          raw: p,
        }
      }).filter((x) => x.timestamp)
    },
  },

  {
    toolkit: "googledrive",
    displayName: "Google Drive",
    fetch(dateISO) {
      // Drive interprets bare datetime strings as UTC, so use UTC-converted bounds.
      const { start, end } = dayBounds(dateISO)
      return [{
        slug: "GOOGLEDRIVE_FIND_FILE",
        params: {
          q: `modifiedTime > '${start}' and modifiedTime < '${end}'`,
          pageSize: 50,
          orderBy: "modifiedTime desc",
        },
      }]
    },
    extract(raw) {
      const items = arr(get(raw, "GOOGLEDRIVE_FIND_FILE", "data", "files"))
      return items.map((f) => ({
        timestamp: (get(f, "modifiedTime") ?? "") as string,
        label: `Edited: ${get(f, "name") ?? "Document"}`,
        url: (get(f, "display_url") ?? get(f, "webViewLink") ?? "") as string,
        raw: f,
      })).filter((x) => x.timestamp)
    },
  },

  // ── Music & activity ─────────────────────────────────────────────────────

  {
    toolkit: "spotify",
    displayName: "Spotify",
    fetch(dateISO) {
      const { start } = dayBoundsMs(dateISO)
      return [{ slug: "SPOTIFY_GET_RECENTLY_PLAYED_TRACKS", params: { limit: 50, after: start } }]
    },
    extract(raw) {
      const items = arr(get(raw, "SPOTIFY_GET_RECENTLY_PLAYED_TRACKS", "data", "items"))
      return items.map((item) => ({
        timestamp: (get(item, "played_at") ?? "") as string,
        label: `Played: ${get(item, "track", "name") ?? "Track"} — ${get(item, "track", "artists", "0", "name") ?? ""}`,
        url: (get(item, "track", "external_urls", "spotify") ?? get(item, "display_url") ?? "") as string,
        raw: item,
      })).filter((x) => x.timestamp)
    },
  },

  {
    toolkit: "strava",
    displayName: "Strava",
    fetch(dateISO) {
      const { start, end } = dayBoundsSec(dateISO)
      return [{ slug: "STRAVA_LIST_ATHLETE_ACTIVITIES", params: { after: start, before: end, per_page: 30 } }]
    },
    extract(raw) {
      // Strava returns activities under data.details (not data directly)
      const items = arr(get(raw, "STRAVA_LIST_ATHLETE_ACTIVITIES", "data", "details"))
      return items.map((a) => ({
        timestamp: (get(a, "start_date") ?? "") as string,
        label: `${get(a, "type") ?? "Activity"}: ${get(a, "name") ?? "Workout"}`,
        url: (get(a, "display_url") ?? "") as string,
        raw: a,
      })).filter((x) => x.timestamp)
    },
  },

  // ── Social ───────────────────────────────────────────────────────────────

  {
    toolkit: "twitter",
    displayName: "Twitter",
    fetch(dateISO) {
      const { start, end } = dayBounds(dateISO)
      return [{
        slug: "TWITTER_FULL_ARCHIVE_SEARCH",
        params: {
          query: `from:${USER_HANDLES.twitter} -is:retweet`,
          start_time: start,
          end_time: end,
          max_results: 100,
          tweet_fields: "created_at,text",
        },
      }]
    },
    extract(raw) {
      const items = arr(get(raw, "TWITTER_FULL_ARCHIVE_SEARCH", "data", "data"))
      return items.map((t) => ({
        timestamp: (get(t, "created_at") ?? "") as string,
        label: ((get(t, "text") as string) ?? "Tweet").slice(0, 120),
        url: `https://x.com/${USER_HANDLES.twitter}/status/${(get(t, "id") as string) ?? ""}`,
        raw: t,
      })).filter((x) => x.timestamp)
    },
  },

  {
    // Requires an Instagram Business or Creator account linked via Facebook Page.
    // Personal accounts are not accessible via the Instagram Graph API.
    toolkit: "instagram",
    displayName: "Instagram",
    fetch(dateISO) {
      const { start, end } = dayBoundsSec(dateISO)
      return [{
        slug: "INSTAGRAM_GET_IG_USER_MEDIA",
        params: {
          ig_user_id: "me",
          since: start,
          until: end,
          fields: "id,caption,media_type,permalink,timestamp",
          limit: 50,
        },
      }]
    },
    extract(raw) {
      const items = arr(get(raw, "INSTAGRAM_GET_IG_USER_MEDIA", "data", "data"))
      return items.map((m) => {
        const type = (get(m, "media_type") as string ?? "POST")
        const caption = ((get(m, "caption") as string) ?? "").slice(0, 80)
        const typeLabel = type === "VIDEO" ? "Reel/Video" : "Post"
        return {
          timestamp: (get(m, "timestamp") ?? "") as string,
          label: `${typeLabel}${caption ? `: ${caption}` : ""}`,
          url: (get(m, "permalink") ?? get(m, "display_url") ?? "") as string,
          raw: m,
        }
      }).filter((x) => x.timestamp)
    },
  },
]
