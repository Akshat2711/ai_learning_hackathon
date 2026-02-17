const BASE_URL = "http://127.0.0.1:8000";

export interface DoubtResponse {
  resp: string;
  status:number;
}

export async function Doubt_clear(query: string,context:string): Promise<DoubtResponse> {
  const res = await fetch(`${BASE_URL}/doubt_clear`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query,context }),
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  return res.json();
}
