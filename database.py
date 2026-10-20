from sqlalchemy import create_engine
from sqlmodel import SQLModel, Field, Session


class Document(SQLModel, table=True):
    id: str = Field(primary_key=True)
    uploaded_at: str
    filename: str
    chunks: str
    embeddings: str

engine = create_engine(
    "sqlite:///documents.db",
    connect_args={"check_same_thread": False}
)

def get_session():
    with Session(engine) as session:
        yield session


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)