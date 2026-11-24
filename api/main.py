import os, json, uuid, time
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from supabase import create_client
from google import genai
from google.genai import types

load_dotenv()
sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
ai = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
MODEL = os.environ["GEMINI_MODEL"]

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

CATEGORIES = ["pothole", "water_leak", "garbage", "streetlight", "drainage", "other"]
DEPARTMENTS = {
    "pothole": "Roads Department",
    "water_leak": "Water Board",
    "garbage": "Sanitation Department",
    "streetlight": "Electricity Board",
    "drainage": "Water Board",
    "other": "General Administration",
}

PROMPT = f"""You are a municipal infrastructure inspector. Analyze the image.
Return JSON only with these keys:
category (one of {CATEGORIES}), severity (integer 1-5),
severity_reason (one sentence), description (two sentences),
confidence (number 0-1).
Severity guide: 5 = immediate danger (open manhole, burst water main),
3 = significant but not dangerous, 1 = cosmetic.
If the image shows no infrastructure problem, use category "other" and confidence below 0.4."""

class Triage(BaseModel):
    category: str
    severity: int = Field(ge=1, le=5)
    severity_reason: str
    description: str
    confidence: float = Field(ge=0, le=1)

FALLBACK_MODELS = [m for m in [MODEL, os.environ.get("GEMINI_FALLBACK_MODEL")] if m]

def run_triage(img_bytes: bytes, mime: str) -> Triage:
    err = None
    for model in FALLBACK_MODELS:
        for attempt in range(4):
            try:
                r = ai.models.generate_content(
                    model=model,
                    contents=[types.Part.from_bytes(data=img_bytes, mime_type=mime), PROMPT],
                    config=types.GenerateContentConfig(response_mime_type="application/json"),
                )
                t = Triage(**json.loads(r.text))
                if t.category not in CATEGORIES:
                    t.category = "other"
                return t
            except Exception as e:
                err = e
                print(f"triage attempt {attempt + 1} on {model} failed: {str(e)[:120]}")
                time.sleep(2 * (attempt + 1))
    raise err

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/reports")
async def create_report(
    image: UploadFile = File(...),
    lat: float = Form(...),
    lng: float = Form(...),
    ward: Optional[str] = Form("Ward 1"),
):
    img = await image.read()
    mime = image.content_type or "image/jpeg"

    t = run_triage(img, mime)

    path = f"{uuid.uuid4()}.jpg"
    sb.storage.from_("reports").upload(path, img, {"content-type": mime})
    url = sb.storage.from_("reports").get_public_url(path)

    needs_review = t.confidence < 0.6
    row = {
        "category": t.category, "severity": t.severity,
        "severity_reason": t.severity_reason, "description": t.description,
        "confidence": t.confidence, "needs_review": needs_review,
        "media_url": url, "lat": lat, "lng": lng, "ward": ward,
        "department": None if needs_review else DEPARTMENTS[t.category],
        "status": "needs_review" if needs_review else "reported",
    }
    saved = sb.table("reports").insert(row).execute()
    return saved.data[0]

@app.get("/reports")
def list_reports():
    res = sb.table("reports").select("*").order("created_at", desc=True).limit(500).execute()
    return res.data
