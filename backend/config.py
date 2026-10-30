import os
import json
import logging
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

logger = logging.getLogger("sovereign.config")

# Force re-read of .env to pick up changes without restarting
load_dotenv(override=True)


class Settings(BaseSettings):
    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "qwen3-coder:latest"
    ollama_timeout: int = 600
    cors_origins: list[str] = ["http://localhost:3000"]
    embedding_model: str = "all-MiniLM-L6-v2"
    chroma_dir: str = "data/chroma"
    documents_dir: str = "data/documents"
    chunk_size: int = 1000
    chunk_overlap: int = 200
    top_k: int = 5
    vision_model: str = "llava:latest"
    max_image_bytes: int = 20 * 1024 * 1024  # 20 MB

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


def get_settings() -> Settings:
    return Settings()
