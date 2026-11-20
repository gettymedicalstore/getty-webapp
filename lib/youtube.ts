const videoId = /^[A-Za-z0-9_-]{11}$/
const youtubeHosts = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
])
const embedHosts = new Set([
  "youtube.com",
  "www.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
])

function parseHttpsUrl(value: string): URL | null {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && !url.username && !url.password
      ? url
      : null
  } catch {
    return null
  }
}

export function isYouTubeVideoUrl(value: string): boolean {
  const url = parseHttpsUrl(value)
  if (!url) return false
  if (url.hostname === "youtu.be" || url.hostname === "www.youtu.be")
    return videoId.test(url.pathname.slice(1))
  if (!youtubeHosts.has(url.hostname)) return false
  if (url.pathname === "/watch")
    return videoId.test(url.searchParams.get("v") ?? "")
  const match = url.pathname.match(/^\/(?:shorts|live|embed)\/([^/]+)\/?$/)
  return Boolean(match && videoId.test(match[1]))
}

export function safeYouTubeEmbedUrl(
  value: string | null | undefined
): string | null {
  if (!value) return null
  const url = parseHttpsUrl(value)
  if (!url || !embedHosts.has(url.hostname)) return null
  const match = url.pathname.match(/^\/embed\/([^/]+)\/?$/)
  return match && videoId.test(match[1]) ? url.toString() : null
}
