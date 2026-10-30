import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from services.ollama import router as ollama_router
from services.documents import router as documents_router
from services.rag import router as rag_router
from services.vision import router as vision_router
from services.maintenance_agent import router as agent_router
from services.router import router as model_router
from services.security import router as security_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("sovereign")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logger.info("SOVEREIGN AI backend starting")
    logger.info("Ollama URL: %s | Model: %s", settings.ollama_base_url, settings.ollama_model)
    yield
    logger.info("SOVEREIGN AI backend shutting down")


app = FastAPI(
    title="SOVEREIGN AI",
    description="On-premise AI backend for industrial document intelligence",
    version="0.1.0",
    lifespan=lifespan,
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ollama_router)
app.include_router(documents_router)
app.include_router(rag_router)
app.include_router(vision_router)
app.include_router(agent_router)
app.include_router(model_router)
app.include_router(security_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "sovereign-ai", "version": "0.1.0"}
