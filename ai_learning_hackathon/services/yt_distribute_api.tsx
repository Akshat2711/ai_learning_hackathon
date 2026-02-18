// ─── Types ────────────────────────────────────────────────────────────────────
export interface SummaryResponse {
  resp: string;
  images: string[];
}

export interface VideoResult {
  topic: string;
  title: string;
  url: string;
  channel: string;
  thumbnail: string;
}

export interface VideoRecommendationsResponse {
  topics: string[];
  videos: VideoResult[];
}

// ─── Config ───────────────────────────────────────────────────────────────────
const API_BASE = "https://yt-distributor.onrender.com";

// ─── summarizeText ─────────────────────────────────────────────────────────────
/**
 * Sends raw page text to the backend and returns a summarized response
 * along with any extracted image URLs.
 */
export async function summarizeText(text: string): Promise<SummaryResponse> {
  const res = await fetch(`${API_BASE}/api/summarize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `HTTP ${res.status}`);
  }

  return res.json() as Promise<SummaryResponse>;
}

// ─── getVideoRecommendations ──────────────────────────────────────────────────
/**
 * Sends the current page text to the backend which extracts key topics
 * and returns relevant YouTube video recommendations.
 *
 * Expected backend response shape:
 * {
 *   topics: string[],           // e.g. ["Memory Management", "OS"]
 *   videos: [{
 *     topic: string,
 *     title: string,
 *     url: string,              // YouTube URL
 *     channel: string,
 *     thumbnail: string,        // YouTube thumbnail URL
 *   }]
 * }
 */
export async function getVideoRecommendations(
  pageText: string
): Promise<VideoRecommendationsResponse> {
  const res = await fetch(`${API_BASE}/extract_topics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: pageText }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `HTTP ${res.status}`);
  }

  return res.json() as Promise<VideoRecommendationsResponse>;
}