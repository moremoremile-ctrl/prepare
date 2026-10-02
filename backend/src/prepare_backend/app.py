"""Minimal application for checking frontend/backend connectivity."""

import os

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title=os.getenv("APP_NAME", "Prepare API"))


class HealthResponse(BaseModel):
    status: str


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok")
