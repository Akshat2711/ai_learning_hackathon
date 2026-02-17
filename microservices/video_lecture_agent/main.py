from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from utils.router_logic import router

app = FastAPI(title="lecture teaching api")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # change to frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
async def health():
    return {"status": "running"}
