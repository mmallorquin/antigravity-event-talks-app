"""Flask application that fetches and serves AI and Machine Learning news."""

import html
import re
from datetime import datetime

import feedparser
import requests
from flask import Flask, jsonify, render_template

app = Flask(__name__)

# Fetch AI-related news search from Google News RSS
FEED_URL = "https://news.google.com/rss/search?q=Artificial+Intelligence&hl=en-US&gl=US&ceid=US:en"


def strip_html(text: str) -> str:
    """Remove HTML tags and decode entities for plain-text summaries."""
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def classify_entry(title: str, summary: str) -> list[str]:
    """Classify AI news articles into relevant category tags based on title/summary."""
    text = (title + " " + summary).lower()
    categories = []
    
    # 1. Models & GenAI
    if any(k in text for k in ["model", "llm", "gpt", "gemini", "claude", "llama", "generative", "neural", "deep learning", "transformer"]):
        categories.append("MODELS")
        
    # 2. Applications & Tools
    if any(k in text for k in ["app", "tool", "software", "product", "features", "devices", "integration", "search", "robot", "agent", "assistant"]):
        categories.append("APPLICATIONS")
        
    # 3. Hardware & Infrastructure
    if any(k in text for k in ["chip", "gpu", "tpu", "nvidia", "hardware", "server", "data center", "intel", "amd", "infrastructure"]):
        categories.append("HARDWARE")
        
    # 4. Business & Industry
    if any(k in text for k in ["startup", "funding", "valuation", "invest", "stock", "acquisition", "deal", "market", "revenue", "partner"]):
        categories.append("BUSINESS")
        
    # 5. Safety & Regulation
    if any(k in text for k in ["safety", "policy", "regulate", "regulation", "law", "ethics", "copyright", "sue", "court", "security", "privacy"]):
        categories.append("POLICY & SAFETY")
        
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
        # Extract a clean summary for tweet text
        raw_summary = entry.get("summary", entry.get("description", ""))
        plain_summary = strip_html(raw_summary)

        # Parse the published date
        published = ""
        published_iso = ""
        if hasattr(entry, "published_parsed") and entry.published_parsed:
            dt = datetime(*entry.published_parsed[:6])
            published = dt.strftime("%B %d, %Y")
            published_iso = dt.isoformat()
        elif hasattr(entry, "updated_parsed") and entry.updated_parsed:
            dt = datetime(*entry.updated_parsed[:6])
            published = dt.strftime("%B %d, %Y")
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
    """Return release notes as JSON."""
    try:
        entries = parse_feed()
        return jsonify({"ok": True, "entries": entries})
    except Exception as exc:  # noqa: BLE001
        return jsonify({"ok": False, "error": str(exc)}), 502


if __name__ == "__main__":
    app.run(debug=True, port=5001)
