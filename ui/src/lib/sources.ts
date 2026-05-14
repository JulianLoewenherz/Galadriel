export const SOURCE_CONFIG: Record<string, { label: string; color: string }> = {
  googlecalendar: { label: "Calendar",  color: "#4285F4" },
  gmail:          { label: "Gmail",     color: "#EA4335" },
  googledrive:    { label: "Drive",     color: "#0F9D58" },
  github:         { label: "GitHub",    color: "#8B5CF6" },
  slack:          { label: "Slack",     color: "#E01E5A" },
  notion:         { label: "Notion",    color: "#9CA3AF" },
  spotify:        { label: "Spotify",   color: "#1DB954" },
  strava:         { label: "Strava",    color: "#FC4C02" },
  zoom:           { label: "Zoom",      color: "#2D8CFF" },
  discordbot:     { label: "Discord",   color: "#5865F2" },
  discord:        { label: "Discord",   color: "#5865F2" },
  twitter:        { label: "Twitter",   color: "#1DA1F2" },
  instagram:      { label: "Instagram", color: "#E1306C" },
}

export function getSource(toolkit: string) {
  return SOURCE_CONFIG[toolkit] ?? { label: toolkit, color: "#6B7280" }
}
