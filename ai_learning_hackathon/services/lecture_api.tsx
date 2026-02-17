const BASE_URL = "https://ai-learning-hackathon.onrender.com";

export interface SummaryResponse {
  resp: string;
  images: string[];
  error?: string;
}

export async function summarizeText(text: string): Promise<SummaryResponse> {
  const res = await fetch(`${BASE_URL}/summarize_pages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  return res.json();
}
