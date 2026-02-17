from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from tools.lecture_agent import generate_summary

router = APIRouter()


class InputText(BaseModel):
    text: str


@router.post("/summarize_pages")
async def summarize(data: InputText):
    if not data.text.strip():
        raise HTTPException(status_code=400, detail="Empty text")

    result = await generate_summary(data.text)
    return result
