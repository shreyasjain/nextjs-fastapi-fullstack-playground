import json
import os
from datetime import datetime, timezone
from uuid import uuid4

import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException
import pymupdf
from openai import OpenAI
from pydantic import BaseModel
from sqlmodel import Session, select

from database import create_db_and_tables, Document, engine

load_dotenv()
app = FastAPI(title="AI Document Assistant")


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


client = OpenAI(api_key=os.getenv('LLM_API_KEY'))

# documents = {}


def split_into_chunks(text: str, chunk_size: int = 1000, overlap: int = 200):
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks


def create_embeddings(chunks: list[str]):
    response = client.embeddings.create(
        model='text-embedding-3-small',
        input=chunks
    )
    return [item.embedding for item in response.data]


def retrieve_chunks(question: str, document: dict, top_k: int = 3, threshold: float = 0.3):
    question_embeddings = create_embeddings([question])[0]

    chunks = document['chunks']
    embeddings = np.array(document['embeddings'])
    query = np.array(question_embeddings)

    similarities = (
            embeddings @ query / (np.linalg.norm(embeddings, axis=1) * np.linalg.norm(query))
    )

    top_indices = np.argsort(similarities)[-top_k:][::-1]

    return [
        {"chunk": chunks[i],
         "score": float(similarities[i]),
         "chunk_index": int(i)
         }
        for i in top_indices if similarities[i] > threshold]


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(400, 'Format Not Supported!')

    content = await file.read()

    try:
        with pymupdf.open(stream=content, filetype='pdf') as pdf:
            text = "\n".join(page.get_text() for page in pdf)
    except Exception:
        raise HTTPException(400, 'Invalid Content')

    if not text.strip():
        raise HTTPException(400, 'Text not extractable, or the file is empty.')

    file_id = str(uuid4())

    chunks = split_into_chunks(text)

    if not chunks:
        raise HTTPException(400, 'No text chunks generated')

    embeddings = create_embeddings(chunks)
    file_name = file.filename
    payload = Document(
        id=file_id,
        chunks=json.dumps(chunks),
        embeddings=json.dumps(embeddings),
        filename=file_name,
        uploaded_at=datetime.now(timezone.utc).isoformat()
    )

    with Session(engine) as session:
        session.add(payload)
        session.commit()

    # documents[file_id] = payload

    return {"id": file_id, "filename": file.filename, "uploaded_at": datetime.now(timezone.utc).isoformat()}


class AskRequest(BaseModel):
    document_id: str
    question: str


@app.post("/ask")
def ask_ai(data: AskRequest):
    with Session(engine) as session:
        document = session.get(Document, data.document_id)

    if document is None:
        raise HTTPException(404, 'Document not found.')

    document_data = {
        "chunks": json.dumps(document.chunks),
        "embeddings": json.dumps(document.chunks)
    }

    relevant_chunks = retrieve_chunks(data.question, document_data)

    if not relevant_chunks:
        return {"message": "I can't find any relavant information related to this.", "sources": []}

    context = '\n\n'.join(record['chunk'] for record in relevant_chunks)

    response = client.responses.create(
        model="gpt-6-luna",
        instructions=f'''
            Answer using the provided information only...
            If the answer is not present, say so.         
            ''',
        input=f'''
            Context:
            {context}
            \n
            Question: 
            {data.question}
            '''
    )

    return {
        "answer": response.output_text,
        "sources": [{
            "chunk_index": item["chunk_index"],
            "similarity_score": round(item["score"], 3),
            "text": item["chunk"]
        } for item in relevant_chunks
        ]
    }


@app.get("/documents")
def list_documents():
    with Session(engine) as session:
        documents = session.exec(select(Document)).all()

        return [{
            "id": doc.id,
            "file_name": doc.filename,
            "uploaded_at": doc.uploaded_at
        } for doc in documents]


@app.delete("/documents/{document_id}")
def delete_document(document_id: str):
    with Session(engine) as session:
        document = session.get(Document, document_id)
        if document is None:
            raise HTTPException(404, 'Document not found.')
        session.delete(document_id)
        session.commit()
        return {"message": "Document deleted successfully."}
