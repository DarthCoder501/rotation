"""
Optional Python MCP gateway for Rotation.

Default production path runs tools inside Next.js `/api/mcp`.
Use this package when you want a separate process (Fly.io / Railway / local :8080).

Run:
  pip install -r requirements.txt
  export GEMINI_API_KEY=...
  uvicorn server:app --host 0.0.0.0 --port 8080
"""

from __future__ import annotations

import json
import os
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="rotation-mcp-gateway", version="0.1.0")

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")

WMO = {
    0: "Clear",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    71: "Light snow",
    73: "Snow",
    80: "Rain showers",
    95: "Thunderstorm",
}


class WeatherArgs(BaseModel):
    lat: float
    lon: float


class ShortlistItem(BaseModel):
    rank: int
    score: float
    perfume: str
    brand: str
    topNotes: str = ""
    middleNotes: str = ""
    baseNotes: str = ""
    mainAccord1: str = ""
    mainAccord2: str | None = None
    ratingValue: float


class Profile(BaseModel):
    likedAccords: list[str] = Field(default_factory=list)
    dislikedAccords: list[str] = Field(default_factory=list)
    likedBrands: list[str] = Field(default_factory=list)
    dislikedBrands: list[str] = Field(default_factory=list)


class Weather(BaseModel):
    tempC: float
    condition: str
    humidity: float


class PreferenceAnchors(BaseModel):
    dislike: int = 0
    softDislike: int = 25
    neutral: int = 50
    like: int = 75
    love: int = 100


class PreferenceModel(BaseModel):
    scale: str = "0-100"
    anchors: PreferenceAnchors = Field(default_factory=PreferenceAnchors)


class RecommendContext(BaseModel):
    userActivity: str
    weather: Weather
    profile: Profile
    shortlist: list[ShortlistItem]
    preferenceModel: PreferenceModel = Field(default_factory=PreferenceModel)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/mcp/tools/get_weather")
async def get_weather(args: WeatherArgs) -> dict[str, Any]:
    params = {
        "latitude": args.lat,
        "longitude": args.lon,
        "current": "temperature_2m,relative_humidity_2m,weather_code",
        "timezone": "auto",
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            "https://api.open-meteo.com/v1/forecast",
            params=params,
        )
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Open-Meteo request failed")

    current = response.json().get("current") or {}
    code = current.get("weather_code", 0)
    return {
        "tempC": round(float(current.get("temperature_2m", 0))),
        "humidity": round(float(current.get("relative_humidity_2m", 0))),
        "condition": WMO.get(code, f"Code {code}"),
    }


@app.post("/mcp/tools/synthesize_recommendation")
async def synthesize_recommendation(ctx: RecommendContext) -> dict[str, Any]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured")
    if not ctx.shortlist:
        raise HTTPException(status_code=400, detail="shortlist is empty")

    prompt = build_prompt(ctx)
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{GEMINI_MODEL}:generateContent?key={api_key}"
    )
    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.7,
            "responseMimeType": "application/json",
        },
    }

    async with httpx.AsyncClient(timeout=45.0) as client:
        response = await client.post(url, json=body)

    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Gemini request failed")

    payload = response.json()
    try:
        text = payload["candidates"][0]["content"]["parts"][0]["text"]
        parsed = json.loads(text)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Invalid Gemini payload: {exc}") from exc

    top = ctx.shortlist[0]
    return {
        "headline": parsed.get("headline") or top.perfume,
        "narrative": parsed.get("narrative") or f"{top.perfume} by {top.brand}.",
        "selectedPerfume": parsed.get("selectedPerfume") or top.perfume,
        "selectedBrand": parsed.get("selectedBrand") or top.brand,
        "accentAccord": parsed.get("accentAccord") or top.mainAccord1 or "amber",
        "palette": parsed.get("palette") or ["#D4AF58", "#121110", "#F5EDE0"],
    }


def build_prompt(ctx: RecommendContext) -> str:
    blocks = []
    for item in ctx.shortlist:
        secondary = f", {item.mainAccord2}" if item.mainAccord2 else ""
        blocks.append(
            f"""### #{item.rank}: {item.perfume} by {item.brand} (personalized ranker score: {item.score:.2f})
- Primary Accord: {item.mainAccord1}{secondary}
- Top: {item.topNotes} | Heart: {item.middleNotes} | Base: {item.baseNotes}
- Catalog rating: {item.ratingValue}
"""
        )

    likes = ", ".join(ctx.profile.likedAccords) or "none yet"
    dislikes = ", ".join(ctx.profile.dislikedAccords) or "none yet"
    anchors = ctx.preferenceModel.anchors

    return f"""You are a master perfumer. Select the best fragrance for today from the ML-pre-ranked candidates below.

## Context
- Activity/Mood: {ctx.userActivity}
- Weather: {ctx.weather.tempC}°C, {ctx.weather.condition}, {ctx.weather.humidity}% humidity
- Explicit likes: {likes}
- Explicit dislikes: {dislikes}

## Preference model
Shortlist order comes from a client-side online ranker trained on a continuous affinity scale (0–100):
- {anchors.dislike} = dislike
- {anchors.softDislike} = soft dislike
- {anchors.neutral} = neutral
- {anchors.like} = like
- {anchors.love} = love

## Ranker Shortlist
{''.join(blocks)}

## Instructions
1. Pick the SINGLE best match from these candidates only.
2. Prefer higher personalized ranker scores unless weather/activity clearly favors another entry.
3. Write 2-3 evocative sentences — sensory, not salesy.
4. Return valid JSON only with keys:
   headline, narrative, selectedPerfume, selectedBrand, accentAccord, palette
"""
