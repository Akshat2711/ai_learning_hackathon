from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from tools.lecture_agent import generate_summary
from tools.doubt_agent import solve_doubt

router = APIRouter()


class InputText(BaseModel):
    text: str

class DoubtText(BaseModel):
    query:str
    context:str

@router.post("/summarize_pages")
async def summarize(data: InputText):
    if not data.text.strip():
        raise HTTPException(status_code=400, detail="Empty text")

    result = await generate_summary(data.text)
    return result



@router.post("/doubt_clear")
async def doubt_clear(data: DoubtText):
    if not data.query.strip():
        raise HTTPException(status_code=400, detail="Empty text")

    print(DoubtText)
    result = await solve_doubt(data.query,data.context)
    return result