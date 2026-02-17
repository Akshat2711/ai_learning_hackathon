import os
import json
from google import genai
from dotenv import load_dotenv
from tools.prompt import PROMPT_TEMPLATE
from tools.image_fetcher import fetch_images

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


async def generate_summary(text: str) -> dict:
    prompt = PROMPT_TEMPLATE.format(input_text=text)

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
            config={"response_mime_type": "application/json"},
        )

        print(response)

        parsed = json.loads(response.text.strip())

        images = []
        if parsed.get("image_needed", "").lower() == "yes":
            images = fetch_images(parsed.get("image_of", []))

        return {
            "resp": parsed.get("resp", ""),
            "images": images,
        }

    except Exception as e:
        return {
            "resp": "",
            "images": [],
            "error": str(e),
        }
