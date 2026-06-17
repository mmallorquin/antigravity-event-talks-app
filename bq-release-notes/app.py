"""Flask application that fetches and serves BigQuery release notes."""

import html
import re
from datetime import datetime

import feedparser
import requests
from flask import Flask, jsonify, render_template

app = Flask(__name__)

FEED_URL = "https://cloud.google.com/feeds/bigquery-release-notes.xml"


def strip_html(text: str) -> str:
    """Remove HTML tags and decode entities for plain-text summaries."""
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def parse_feed() -> list[dict]:
    """Fetch the BigQuery release notes XML feed and return parsed entries."""
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

        # Determine category / release type
        categories = []
        if hasattr(entry, "tags"):
            categories = [tag.term for tag in entry.tags]

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
