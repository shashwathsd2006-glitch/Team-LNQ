import logging
import os
import chromadb
from chromadb.config import Settings as ChromaSettings
from sentence_transformers import SentenceTransformer

from config import get_settings

logger = logging.getLogger("sovereign.vectorstore")

_model: SentenceTransformer | None = None
_client: chromadb.ClientAPI | None = None
_collection: chromadb.Collection | None = None


def get_embedding_model() -> SentenceTransformer:
    global _model
    if _model is None:
        settings = get_settings()
        logger.info("Loading embedding model: %s", settings.embedding_model)
        _model = SentenceTransformer(settings.embedding_model)
        logger.info("Embedding model loaded")
    return _model


def get_chroma_collection() -> chromadb.Collection:
    global _client, _collection
    if _collection is None:
        settings = get_settings()
        os.makedirs(settings.chroma_dir, exist_ok=True)
        _client = chromadb.PersistentClient(
            path=settings.chroma_dir,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        _collection = _client.get_or_create_collection(
            name="industrial_documents",
            metadata={"hnsw:space": "cosine"},
        )
        logger.info("ChromaDB collection ready at %s", settings.chroma_dir)
    return _collection


def embed_texts(texts: list[str]) -> list[list[float]]:
    model = get_embedding_model()
    embeddings = model.encode(texts, show_progress_bar=False)
    return embeddings.tolist()


def add_chunks(
    doc_id: str,
    texts: list[str],
    metadatas: list[dict],
    ids: list[str],
):
    collection = get_chroma_collection()
    embeddings = embed_texts(texts)
    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=texts,
        metadatas=metadatas,
    )
    logger.info("Added %d chunks for document %s", len(texts), doc_id)


def query_chunks(query: str, top_k: int = 5, where: dict | None = None) -> dict:
    collection = get_chroma_collection()
    query_embedding = embed_texts([query])
    kwargs = {
        "query_embeddings": query_embedding,
        "n_results": top_k,
    }
    if where:
        kwargs["where"] = where
    results = collection.query(**kwargs)
    return results


def delete_document_chunks(doc_id: str):
    collection = get_chroma_collection()
    collection.delete(where={"doc_id": doc_id})
    logger.info("Deleted chunks for document %s", doc_id)


def get_document_chunk_count(doc_id: str) -> int:
    collection = get_chroma_collection()
    results = collection.get(where={"doc_id": doc_id})
    return len(results["ids"]) if results and results["ids"] else 0
