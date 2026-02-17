PROMPT_TEMPLATE = """
This text is from a textbook.

Your task:
- Create a concise summary
- Explain clearly in an interesting way
- Include real-world examples inside the explanation
- Combine everything into ONE explanation string

Additionally:
If an image would help understanding,
set image_needed="yes" and describe useful images.
Otherwise set image_needed="no" and keep image_of empty.

STRICT JSON FORMAT ONLY:

{{
  "resp": "full explanation + summary + examples combined",
  "image_needed": "yes" | "no",
  "image_of": ["description if image needed"]
}}

Text:
{input_text}
"""
