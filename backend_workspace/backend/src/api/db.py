"""
Database session and Redis connection utilities.
Uses SQLAlchemy for PostgreSQL, aioredis for Redis pub/sub.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

import aioredis

DATABASE_URL = os.getenv("POSTGRES_URL", "postgresql://user:pass@localhost:5432/battleshipdb")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# PUBLIC_INTERFACE
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# PUBLIC_INTERFACE
async def get_redis():
    redis = await aioredis.create_redis_pool(REDIS_URL)
    try:
        yield redis
    finally:
        redis.close()
        await redis.wait_closed()
