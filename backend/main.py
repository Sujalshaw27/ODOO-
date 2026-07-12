from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.config import settings
import app.models  # noqa: F401 - ensures all models are registered on Base.metadata

from app.routers import (
    auth,
    departments,
    categories,
    users,
    assets,
    allocations,
    bookings,
    maintenance,
    dashboard,
    notifications,
    audits,
    reports,
)

app = FastAPI(
    title="AssetFlow API",
    description="Enterprise Asset & Resource Management System",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    # For a hackathon we create tables directly rather than running Alembic migrations.
    Base.metadata.create_all(bind=engine)


@app.get("/")
def root():
    return {"status": "ok", "service": "AssetFlow API"}


@app.get("/api/health")
def health_check():
    return {"status": "healthy"}


app.include_router(auth.router)
app.include_router(departments.router)
app.include_router(categories.router)
app.include_router(users.router)
app.include_router(assets.router)
app.include_router(allocations.router)
app.include_router(bookings.router)
app.include_router(maintenance.router)
app.include_router(dashboard.router)
app.include_router(notifications.router)
app.include_router(notifications.logs_router)
app.include_router(audits.router)
app.include_router(reports.router)