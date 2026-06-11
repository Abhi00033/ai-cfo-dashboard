from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Float,
    DateTime,
    ForeignKey
)

from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./ai_cfo.db"
)

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


class TransactionModel(Base):
    __tablename__ = "transactions"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    date = Column(
        DateTime,
        default=datetime.utcnow
    )

    amount = Column(Float)

    category = Column(String)

    description = Column(String)

    type = Column(String)  # income / expense

    customer_id = Column(
        Integer,
        ForeignKey("customers.id"),
        nullable=True
    )

    vendor_id = Column(
        Integer,
        ForeignKey("vendors.id"),
        nullable=True
    )


try:
    import models_accounting
except ImportError:
    pass


# Create tables
Base.metadata.create_all(bind=engine)


def get_db():

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()