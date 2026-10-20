from __future__ import annotations
from contextlib import asynccontextmanager
from datetime import date
import hmac
import os
from pathlib import Path
from typing import Literal
from uuid import uuid4
from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field, field_validator
from .catalogue import CATALOGUE, SOURCE, business_status, menu_search, quote_lines, recommend
from .storage import CateringStore, IdempotencyConflict

class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")
class Line(StrictModel):
    item_id: str = Field(min_length=1, max_length=60, pattern=r"^[a-z0-9-]+$")
    quantity: int = Field(strict=True, ge=1, le=20)
class Quote(StrictModel):
    lines: list[Line] = Field(min_length=1, max_length=20)
class Preferences(StrictModel):
    query: str = Field(default="", max_length=100)
    diet: Literal["all", "raw", "cooked", "vegetarian"] = "all"
    budget_cents: int | None = Field(default=None, strict=True, ge=0, le=100000)
class Inquiry(StrictModel):
    name: str = Field(min_length=2, max_length=80)
    email: str = Field(min_length=5, max_length=160, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    guests: int = Field(strict=True, ge=2, le=200)
    event_date: date
    notes: str = Field(default="", max_length=1000)
    @field_validator("name", "notes", mode="before")
    @classmethod
    def trim_text(cls, value):
        if not isinstance(value, str):
            return value
        value = value.strip()
        if "\x00" in value:
            raise ValueError("Invalid text")
        return value
    @field_validator("event_date")
    @classmethod
    def not_past(cls, value):
        if value < date.today():
            raise ValueError("Choose today or a future date")
        return value

def create_app(database=None, admin_token=None):
    database = database or os.getenv("SUSHI_DATABASE", ".state/sushi-sei.db")
    admin_token = admin_token if admin_token is not None else os.getenv("SUSHI_ADMIN_TOKEN", "")
    @asynccontextmanager
    async def lifespan(app):
        app.state.store = CateringStore(database)
        yield
    app = FastAPI(title="Sushi Sei Express · Portfolio API", version="1.0.0", lifespan=lifespan)
    origins = os.getenv("SUSHI_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in origins if o.strip()],
                       allow_methods=["GET", "POST"], allow_headers=["Content-Type", "Idempotency-Key", "Authorization"])
    @app.middleware("http")
    async def response_headers(request, call_next):
        length = request.headers.get("content-length", "0")
        if length.isdigit() and int(length) > 64000:
            from fastapi.responses import JSONResponse
            return JSONResponse({"detail": "Request too large"}, status_code=413)
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response
    @app.get("/api/health")
    def health():
        return {"status": "ok", "mode": "portfolio-demo", "python_backend": True}
    @app.get("/api/restaurant")
    def restaurant():
        return {**SOURCE, "status": business_status(), "demo": True}
    @app.get("/api/menu")
    def menu(q: str = Query(default="", max_length=100),
             category: Literal["all", "signature", "cooked", "vegetarian"] = "all",
             diet: Literal["all", "raw", "cooked", "vegetarian"] = "all"):
        return {**{k: v for k, v in CATALOGUE.items() if k != "items"},
                "items": menu_search(q, category, diet)}
    @app.post("/api/quote")
    def quote(body: Quote):
        try:
            return quote_lines([line.model_dump() for line in body.lines])
        except ValueError as error:
            raise HTTPException(422, str(error)) from error
    @app.post("/api/recommend")
    def finder(body: Preferences):
        return recommend(**body.model_dump())
    @app.post("/api/catering", status_code=201)
    def catering(body: Inquiry, idempotency_key: str | None = Header(default=None)):
        key = idempotency_key or str(uuid4())
        if len(key) > 80 or not all(c.isalnum() or c in "-_" for c in key):
            raise HTTPException(422, "Invalid request key")
        try:
            identifier, created = app.state.store.create(body.model_dump(mode="json"), key)
        except IdempotencyConflict as error:
            raise HTTPException(409, str(error)) from error
        return {"id": identifier, "created": created, "status": "demo_received",
                "sent_to_restaurant": False,
                "message": "Saved in this portfolio demo only. Call Sushi Sei Express to arrange real catering."}
    @app.get("/api/catering")
    def inbox(authorization: str | None = Header(default=None)):
        if not admin_token:
            raise HTTPException(403, "The demo inbox is disabled")
        if not authorization or not hmac.compare_digest(authorization, "Bearer " + admin_token):
            raise HTTPException(401, "An administrator token is required")
        return {"items": app.state.store.list_recent()}
    frontend = Path(__file__).resolve().parents[2] / "frontend" / "dist"
    if frontend.is_dir():
        app.mount("/", StaticFiles(directory=str(frontend), html=True), name="frontend")
    return app
app = create_app()
