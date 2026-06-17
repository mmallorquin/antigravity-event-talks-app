# 📋 BigQuery Release Notes Dashboard

A sleek, dark-mode web dashboard that fetches Google BigQuery's public release notes RSS feed and presents them as filterable, tweetable cards — all in real time.

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.1-000000?logo=flask&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔄 **Live RSS Feed** | Fetches the latest BigQuery release notes directly from Google's XML feed |
| 🃏 **Card-Based UI** | Each release note is displayed as an animated card with title, date, summary, and category badges |
| 🏷️ **Category Filters** | Dynamically generated filter chips (Feature, Changed, Fix, Deprecated) extracted from feed tags |
| 🐦 **Tweet Composer** | One-click tweet button that pre-fills a 280-character tweet with title, snippet, link, and hashtags |
| 💀 **Skeleton Loading** | Shimmer animation placeholders while data is being fetched |
| 🔔 **Toast Notifications** | Non-intrusive success/error messages |
| 📱 **Responsive Design** | Fully responsive layout optimized for mobile and desktop |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Client)                     │
│  index.html ← style.css + app.js                       │
│                                                         │
│  1. Page loads → fetchNotes() fires automatically       │
│  2. fetch('/api/notes') → receives JSON                 │
│  3. Renders cards, filter chips, metadata               │
│  4. "Tweet" button → opens twitter.com/intent/tweet     │
└──────────────┬──────────────────────────────────────────┘
               │ GET /api/notes
               ▼
┌──────────────────────────────────────┐
│         Flask Server (app.py)        │
│                                      │
│  GET /          → serves index.html  │
│  GET /api/notes → parse_feed()       │
│    ├─ requests.get(RSS_URL)          │
│    ├─ feedparser.parse(xml)          │
│    ├─ strip_html() for plain text    │
│    └─ return jsonify(entries)        │
└──────────────┬───────────────────────┘
               │ HTTP GET
               ▼
┌──────────────────────────────────────┐
│  Google Cloud RSS Feed               │
│  cloud.google.com/feeds/             │
│    bigquery-release-notes.xml        │
└──────────────────────────────────────┘
```

> **Why a server proxy?** Browsers block direct cross-origin XML requests (CORS). Flask fetches the feed server-side and serves it as clean JSON to the client.

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+**
- **pip** (Python package manager)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/mmallorquin/antigravity-event-talks-app.git
   cd antigravity-event-talks-app/bq-release-notes
   ```

2. **Create and activate a virtual environment**

   ```bash
   python3 -m venv venv
   source venv/bin/activate        # macOS / Linux
   # venv\Scripts\activate         # Windows
   ```

3. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

4. **Run the application**

   ```bash
   python app.py
   ```

5. **Open your browser** at [http://localhost:5000](http://localhost:5000)

---

## 🧰 Tech Stack

### Server

| Technology | Purpose |
|-----------|---------|
| [Flask](https://flask.palletsprojects.com/) | Lightweight web framework for routing and templating |
| [Requests](https://docs.python-requests.org/) | HTTP client for fetching the RSS feed |
| [Feedparser](https://feedparser.readthedocs.io/) | Universal RSS/Atom feed parser |

### Client

| Technology | Purpose |
|-----------|---------|
| Vanilla JavaScript | DOM manipulation, fetch API, event handling |
| CSS Custom Properties | Design system with dark-mode palette |
| [Inter Font](https://fonts.google.com/specimen/Inter) | Modern sans-serif typography |
| [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) | Monospace font for code snippets |

---

## 📂 Project Structure

```
bq-release-notes/
├── app.py                    # Flask server — routes + RSS parsing
├── requirements.txt          # Python dependencies
├── .gitignore                # Git ignore rules
├── README.md                 # This file
├── templates/
│   └── index.html            # Jinja2 template — UI shell
├── static/
│   ├── css/
│   │   └── style.css         # Design system (dark mode, animations)
│   └── js/
│       └── app.js            # Client logic (fetch, filter, render, tweet)
└── venv/                     # Virtual environment (git-ignored)
```

---

## 📡 API Reference

### `GET /api/notes`

Returns all BigQuery release notes from the RSS feed.

**Success Response** `200 OK`

```json
{
  "ok": true,
  "entries": [
    {
      "title": "BigQuery announces new SQL functions",
      "link": "https://cloud.google.com/bigquery/docs/release-notes#June_10_2025",
      "summary_html": "<p>New SQL functions...</p>",
      "summary_plain": "New SQL functions ARRAY_CONCAT_AGG...",
      "published": "June 10, 2025",
      "published_iso": "2025-06-10T00:00:00",
      "categories": ["FEATURE"]
    }
  ]
}
```

**Error Response** `502 Bad Gateway`

```json
{
  "ok": false,
  "error": "Connection timeout"
}
```

---

## 🎨 Design Highlights

- **Color palette** — Deep navy (`#0b0f1a`) with Google Blue (`#4285f4`) accents
- **Animated background** — Slow-drifting radial gradients for depth
- **Card animations** — Staggered fade-up entrance (`0.04s` delay per card)
- **Skeleton loading** — Shimmer effect while fetching data
- **Category badges** — Color-coded: 🟢 Feature, 🟡 Changed, 🔴 Fix, ⚪ Deprecated
- **Glassmorphism** — Subtle transparency and glow effects on hover

---

## 🛣️ Future Improvements

- [ ] **Server-side caching** — Add TTL-based caching to avoid hitting Google's feed on every request
- [ ] **Search** — Full-text search across release note titles and summaries
- [ ] **Pagination** — Load entries in batches for better performance
- [ ] **Date range filter** — Filter notes by date range
- [ ] **Dark/Light mode toggle** — User-selectable theme
- [ ] **Bookmarks** — Save interesting release notes locally

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">
  Built with ❤️ using Flask & Vanilla JS
</p>
