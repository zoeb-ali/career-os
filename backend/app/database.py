"""
backend/app/database.py
────────────────────────
SQLAlchemy async engine and session factory.

Usage in endpoints:
    from app.database import get_db
    from sqlalchemy.ext.asyncio import AsyncSession

    @router.get("/jobs")
    async def get_jobs(db: AsyncSession = Depends(get_db)):
        ...

Usage in workers/scripts (sync):
    from app.database import get_sync_engine
    with get_sync_engine().connect() as conn:
        ...
"""
from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.engine import URL, Engine, make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings
from app.logger import get_logger

logger = get_logger("database")


# ── Async engine (used by FastAPI endpoints) ───────────────────────
def _make_async_url(url: str) -> tuple[URL, dict]:
    """
    Convert a sync Postgres URL into an asyncpg URL plus connect_args.

    asyncpg does not understand libpq query parameters such as
    ?sslmode=require&channel_binding=require (what Neon and most hosted
    providers put in their connection strings) and fails to connect if they
    are passed through. Strip them and translate sslmode into asyncpg's own
    `ssl` argument instead. Pooled endpoints (PgBouncer in transaction mode,
    e.g. Neon "-pooler" hosts) also need asyncpg's statement cache disabled.
    """
    u = make_url(url)
    query = dict(u.query)
    sslmode = query.pop("sslmode", None)
    query.pop("channel_binding", None)
    u = u.set(drivername="postgresql+asyncpg", query=query)

    connect_args: dict = {}
    if sslmode in ("require", "verify-ca", "verify-full", "prefer"):
        connect_args["ssl"] = "require"
    if u.host and "-pooler" in u.host:
        connect_args["statement_cache_size"] = 0
    return u, connect_args


_async_url, _async_connect_args = _make_async_url(settings.postgres_url)

engine = create_async_engine(
    _async_url,
    connect_args=_async_connect_args,
    echo=settings.is_development,   # log SQL in dev, not in prod
    pool_size=5,
    max_overflow=5,
    pool_pre_ping=True,             # check connection before use (Neon scales to zero)
    pool_recycle=300,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ── Sync engine (used by Celery tasks / Prefect flows / scripts) ───
# One process-wide engine with a small pool, reused across every task —
# NOT a fresh create_engine() per call. Each Engine owns its own connection
# pool that's never torn down until the process exits, so creating one per
# task invocation leaks connections and can exhaust Postgres max_connections
# under load (100 by default) once enough tasks have run.
@lru_cache(maxsize=1)
def get_sync_engine() -> Engine:
    return create_engine(
        settings.postgres_url,
        pool_size=5,
        max_overflow=5,
        pool_pre_ping=True,
        pool_recycle=1800,
    )


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models. Import this in every model file."""


async def get_db():
    """
    FastAPI dependency — yields an async database session.
    Automatically commits on success, rolls back on error.

    Usage:
        async def my_endpoint(db: AsyncSession = Depends(get_db)):
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception as exc:
            await session.rollback()
            logger.error(
                "Database session error — rolled back",
                extra={"extra": {"error": str(exc)}}
            )
            raise
