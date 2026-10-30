import logging
import uuid
import os
from datetime import datetime, timezone

import pymupdf
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel

from config import get_settings
from services.vectorstore import add_chunks, delete_document_chunks, get_document_chunk_count

logger = logging.getLogger("sovereign.documents")
router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_EXTENSIONS = {"pdf"}
MAX_SIZE_BYTES = 50 * 1024 * 1024


class DocumentMeta(BaseModel):
    id: str
    name: str
    type: str
    size: int
    pages: int
    chunks: int
    status: str
    uploaded_at: str
    indexed_at: str | None = None
    fail_reason: str | None = None
    path: str


class DocumentListResponse(BaseModel):
    documents: list[DocumentMeta]
    total: int


class UploadResponse(BaseModel):
    id: str
    name: str
    pages: int
    chunks: int
    status: str
    message: str


_store: list[DocumentMeta] = []


def _get_ext(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def _chunk_text(text: str, chunk_size: int, chunk_overlap: int) -> list[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start = end - chunk_overlap
        if start + chunk_overlap >= len(text):
            break
    return chunks


def _extract_pdf_text(pdf_bytes: bytes) -> tuple[str, list[dict]]:
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    pages_data = []
    full_text_parts = []
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()
        if text.strip():
            pages_data.append({"page": page_num + 1, "text": text})
            full_text_parts.append(text)
    doc.close()
    return "\n".join(full_text_parts), pages_data


def _build_chunks_from_pages(
    doc_id: str,
    filename: str,
    pages_data: list[dict],
    chunk_size: int,
    chunk_overlap: int,
) -> tuple[list[str], list[dict], list[str]]:
    all_texts = []
    all_metadatas = []
    all_ids = []
    chunk_idx = 0

    for page_info in pages_data:
        page_num = page_info["page"]
        page_text = page_info["text"]
        text_chunks = _chunk_text(page_text, chunk_size, chunk_overlap)

        for chunk_text in text_chunks:
            chunk_id = f"{doc_id}_chunk_{chunk_idx:04d}"
            all_texts.append(chunk_text)
            all_metadatas.append({
                "doc_id": doc_id,
                "document_name": filename,
                "page": page_num,
                "chunk_idx": chunk_idx,
            })
            all_ids.append(chunk_id)
            chunk_idx += 1

    return all_texts, all_metadatas, all_ids


@router.get("/", response_model=DocumentListResponse)
async def list_documents():
    return DocumentListResponse(documents=_store, total=len(_store))


@router.post("/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)):
    settings = get_settings()
    filename = file.filename or "unknown"
    ext = _get_ext(filename)

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '.{ext}'. Only PDF files are supported for RAG indexing.",
        )

    content = await file.read()
    if len(content) > MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds 50 MB limit ({len(content) / 1024 / 1024:.1f} MB).",
        )

    doc_id = f"doc-{uuid.uuid4().hex[:12]}"

    os.makedirs(settings.documents_dir, exist_ok=True)
    file_path = os.path.join(settings.documents_dir, f"{doc_id}_{filename}")
    with open(file_path, "wb") as f:
        f.write(content)

    try:
        full_text, pages_data = _extract_pdf_text(content)
        page_count = len(pages_data)

        if not full_text.strip():
            doc = DocumentMeta(
                id=doc_id, name=filename, type="PDF", size=len(content),
                pages=page_count, chunks=0, status="Failed",
                uploaded_at=datetime.now(timezone.utc).isoformat(),
                fail_reason="No extractable text found in PDF.",
                path=file_path,
            )
            _store.insert(0, doc)
            return UploadResponse(
                id=doc_id, name=filename, pages=page_count, chunks=0,
                status="Failed", message="No extractable text found in PDF.",
            )

        texts, metadatas, chunk_ids = _build_chunks_from_pages(
            doc_id, filename, pages_data, settings.chunk_size, settings.chunk_overlap,
        )

        add_chunks(doc_id, texts, metadatas, chunk_ids)

        doc = DocumentMeta(
            id=doc_id, name=filename, type="PDF", size=len(content),
            pages=page_count, chunks=len(chunk_ids), status="Indexed",
            uploaded_at=datetime.now(timezone.utc).isoformat(),
            indexed_at=datetime.now(timezone.utc).isoformat(),
            path=file_path,
        )
        _store.insert(0, doc)

        logger.info("Document indexed: %s (%d pages, %d chunks)", filename, page_count, len(chunk_ids))
        return UploadResponse(
            id=doc_id, name=filename, pages=page_count, chunks=len(chunk_ids),
            status="Indexed", message=f"Document indexed: {page_count} pages, {len(chunk_ids)} chunks.",
        )

    except Exception as e:
        logger.exception("Failed to process PDF: %s", filename)
        doc = DocumentMeta(
            id=doc_id, name=filename, type="PDF", size=len(content),
            pages=0, chunks=0, status="Failed",
            uploaded_at=datetime.now(timezone.utc).isoformat(),
            fail_reason=str(e), path=file_path,
        )
        _store.insert(0, doc)
        return UploadResponse(
            id=doc_id, name=filename, pages=0, chunks=0,
            status="Failed", message=f"Failed to process: {e}",
        )


@router.get("/{doc_id}", response_model=DocumentMeta)
async def get_document(doc_id: str):
    for doc in _store:
        if doc.id == doc_id:
            return doc
    raise HTTPException(status_code=404, detail="Document not found")


@router.delete("/{doc_id}")
async def delete_document(doc_id: str):
    global _store
    before = len(_store)
    _store = [d for d in _store if d.id != doc_id]
    if len(_store) == before:
        raise HTTPException(status_code=404, detail="Document not found")

    delete_document_chunks(doc_id)

    settings = get_settings()
    for f in os.listdir(settings.documents_dir):
        if f.startswith(doc_id):
            os.remove(os.path.join(settings.documents_dir, f))

    logger.info("Document deleted: %s", doc_id)
    return {"status": "deleted", "id": doc_id}
