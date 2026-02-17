from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from tools.topics_agent import extract_topics
from tools.yt_search import search_youtube_videos

app = FastAPI(title="PDF Topic Extractor API")


class PDFText(BaseModel):
    text: str


@app.post("/extract_topics")
async def topics(data: PDFText):
    if not data.text.strip():
        raise HTTPException(status_code=400, detail="Empty text")

    topics = await extract_topics(data.text)

    videos = search_youtube_videos(topics)

    return {
        "topics": topics,
        "videos": videos
    }


@app.get("/")
async def health():
    return {"status": "running"}
