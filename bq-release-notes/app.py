"""Flask application that fetches and serves AI and Machine Learning news in Spanish."""

import html
import re
from datetime import datetime

import feedparser
import requests
from flask import Flask, jsonify, render_template

app = Flask(__name__)

# Fetch global AI-related news in Spanish from Google News RSS
FEED_URL = "https://news.google.com/rss/search?q=Inteligencia+Artificial&hl=es-419&gl=US&ceid=US:es-419"

MONTHS_ES = {
    1: "enero", 2: "febrero", 3: "marzo", 4: "abril", 5: "mayo", 6: "junio",
    7: "julio", 8: "agosto", 9: "septiembre", 10: "octubre", 11: "noviembre", 12: "diciembre"
}


def strip_html(text: str) -> str:
    """Remove HTML tags and decode entities for plain-text summaries."""
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def classify_entry(title: str, summary: str) -> list[str]:
    """Classify AI news articles into relevant Spanish category tags."""
    text = (title + " " + summary).lower()
    categories = []
    
    # 1. Models & GenAI
    model_keywords = [
        "model", "llm", "gpt", "gemini", "claude", "llama", "generative", "neural", "deep learning", "transformer",
        "modelo", "generativo", "generativa", "neuronal", "aprendizaje profundo", "transformador"
    ]
    if any(k in text for k in model_keywords):
        categories.append("MODELOS")
        
    # 2. Applications & Tools
    app_keywords = [
        "app", "tool", "software", "product", "features", "devices", "integration", "search", "robot", "agent", "assistant",
        "aplicación", "aplicacion", "herramienta", "producto", "dispositivo", "integración", "integracion", "búsqueda", "busqueda", "robot", "agente", "asistente"
    ]
    if any(k in text for k in app_keywords):
        categories.append("APLICACIONES")
        
    # 3. Hardware & Infrastructure
    hardware_keywords = [
        "chip", "gpu", "tpu", "nvidia", "hardware", "server", "data center", "intel", "amd", "infrastructure",
        "servidor", "centro de datos", "infraestructura", "procesador"
    ]
    if any(k in text for k in hardware_keywords):
        categories.append("HARDWARE")
        
    # 4. Business & Industry
    business_keywords = [
        "startup", "funding", "valuation", "invest", "stock", "acquisition", "deal", "market", "revenue", "partner",
        "inversión", "inversion", "invertir", "acciones", "mercado", "ingresos", "adquisición", "adquisicion", "acuerdo", "socio", "financiación", "financiacion", "millones"
    ]
    if any(k in text for k in business_keywords):
        categories.append("NEGOCIOS")
        
    # 5. Safety & Regulation
    safety_keywords = [
        "safety", "policy", "regulate", "regulation", "law", "ethics", "copyright", "sue", "court", "security", "privacy",
        "seguridad", "política", "politica", "regular", "regulación", "regulacion", "ley", "ética", "etica", "derechos de autor", "demanda", "tribunal", "privacidad", "gobierno"
    ]
    if any(k in text for k in safety_keywords):
        categories.append("SEGURIDAD Y POLÍTICA")
        
    if not categories:
        categories.append("GENERAL")
        
    return categories


def parse_feed() -> list[dict]:
    """Fetch the AI news XML feed and return parsed, classified entries."""
    resp = requests.get(FEED_URL, timeout=15)
    resp.raise_for_status()
    feed = feedparser.parse(resp.text)

    entries = []
    for entry in feed.entries:
        # Extract a clean summary
        raw_summary = entry.get("summary", entry.get("description", ""))
        plain_summary = strip_html(raw_summary)

        # Parse the published date
        published = ""
        published_iso = ""
        if hasattr(entry, "published_parsed") and entry.published_parsed:
            dt = datetime(*entry.published_parsed[:6])
            published = f"{dt.day} de {MONTHS_ES[dt.month]} de {dt.year}"
            published_iso = dt.isoformat()
        elif hasattr(entry, "updated_parsed") and entry.updated_parsed:
            dt = datetime(*entry.updated_parsed[:6])
            published = f"{dt.day} de {MONTHS_ES[dt.month]} de {dt.year}"
            published_iso = dt.isoformat()

        # Classify the entry into tags
        categories = classify_entry(entry.get("title", ""), plain_summary)

        entries.append(
            {
                "title": entry.get("title", "Untitled"),
                "link": entry.get("link", "#"),
                "summary_html": raw_summary,
                "summary_plain": plain_summary[:280],  # tweet-length slice
                "published": published,
                "published_iso": published_iso,
                "categories": categories,
            }
        )
    return entries


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    """Serve the main page."""
    return render_template("index.html")


@app.route("/api/notes")
def api_notes():
    """Return AI news as JSON."""
    try:
        entries = parse_feed()
        return jsonify({"ok": True, "entries": entries})
    except Exception as exc:  # noqa: BLE001
        return jsonify({"ok": False, "error": str(exc)}), 502


if __name__ == "__main__":
    app.run(debug=True, port=5001)
