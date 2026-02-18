import os
import json
from google import genai
from dotenv import load_dotenv
from utils.chunker import chunk_text

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


PROMPT = """
Extract the most important academic topics from the text below.

Rules:
- Return only short topic names
- No explanation
- Avoid duplicates
- Max 3 topics per chunk

STRICT JSON:

{{ "topics": ["topic1", "topic2"] }}

Text:
{chunk}
"""


async def extract_topics(text: str):
    chunks = chunk_text(text)
    all_topics = set()

    for chunk in chunks:
        prompt = PROMPT.format(chunk=chunk)
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt,
            config={"response_mime_type": "application/json"},
        )

        try:
            parsed = json.loads(response.text)
            all_topics.update(parsed.get("topics", []))
        except Exception:
            continue

    return sorted(list(all_topics))
