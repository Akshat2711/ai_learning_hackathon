import os
import json
from google import genai
from dotenv import load_dotenv
from tools.prompt import PROMPT_TEMPLATE_DOUBT_CLEAR

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


async def solve_doubt(query: str,context:str) -> dict:
    prompt = PROMPT_TEMPLATE_DOUBT_CLEAR.format(context=context,query=query)

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
            config={"response_mime_type": "application/json"},
        )

        print(response)

        parsed = json.loads(response.text.strip())

        return {
            "resp": parsed.get("doubt_clear", ""),
            "status":200
        }

    except Exception as e:
        return {
            "doubt_clear": "",
            "status":500
        }
