
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import create_db_and_tables
from projects.ai_document_analyzer import router as analyzer_router
from projects.ai_research_agent import router as research_router
from projects.ai_customer_support import router as customer_support_router

app = FastAPI(title="AI Projects API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://main.d2tx2imibbofgx.amplifyapp.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyzer_router)
app.include_router(research_router)
app.include_router(customer_support_router)


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


@app.get("/")
def home():
    return {"message": "AI Projects API is running"}
