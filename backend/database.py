
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlmodel import SQLModel, Field, Session

load_dotenv()


class Document(SQLModel, table=True):
    id: str = Field(primary_key=True)
    uploaded_at: str
    filename: str
    chunks: str
    embeddings: str


DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

connect_args = (
    {"check_same_thread": False}
    if DATABASE_URL.startswith("sqlite")
    else {}
)

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)


def get_session():
    with Session(engine) as session:
        yield session


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
