/* =========================================================
   BigQuery Release Notes — Client-side logic
   ========================================================= */

const API = '/api/notes';

// DOM refs
const cardList      = document.getElementById('card-list');
const btnRefresh    = document.getElementById('btn-refresh');
const btnExport     = document.getElementById('btn-export');
const metaCount     = document.getElementById('meta-count');
const metaUpdated   = document.getElementById('meta-updated');
const filterBar     = document.getElementById('filter-bar');
const toast         = document.getElementById('toast');
const themeToggle   = document.getElementById('theme-toggle');
const searchInput   = document.getElementById('search-input');

let allEntries = [];
let activeFilter = 'all';
let searchQuery = '';

// ---------- Theme Toggle ---------------------------------------------------

function initTheme() {
  const saved = localStorage.getItem('bq-theme');
  if (saved === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  if (current === 'light') {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('bq-theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('bq-theme', 'light');
  }
}

// Apply saved theme immediately (before render)
initTheme();
themeToggle.addEventListener('click', toggleTheme);

// ---------- Fetch & Render --------------------------------------------------

async function fetchNotes() {
  btnRefresh.classList.add('btn-refresh--loading');
  btnRefresh.disabled = true;
  btnExport.disabled = true;
  showSkeleton();

  try {
    const res = await fetch(API);
    const data = await res.json();

    if (!data.ok) throw new Error(data.error || 'Unknown error');

    allEntries = data.entries;
    metaCount.textContent = allEntries.length;
    metaUpdated.textContent = new Date().toLocaleTimeString();

    buildFilterChips();
    applyFilters();
    btnExport.disabled = false;
    showToast(`Loaded ${allEntries.length} AI news articles`);
  } catch (err) {
    cardList.innerHTML = errorState(err.message);
  } finally {
    btnRefresh.classList.remove('btn-refresh--loading');
    btnRefresh.disabled = false;
  }
}

// ---------- Filter Chips ----------------------------------------------------

function buildFilterChips() {
  const cats = {};
  allEntries.forEach(e => {
    e.categories.forEach(c => {
      cats[c] = (cats[c] || 0) + 1;
    });
  });

  filterBar.innerHTML = '';
  addChip(`All (${allEntries.length})`, 'all', activeFilter === 'all');
  
  Object.keys(cats).sort().forEach(c => {
    addChip(`${c} (${cats[c]})`, c, activeFilter === c);
  });
}

function addChip(label, value, active) {
  const btn = document.createElement('button');
  btn.className = 'chip' + (active ? ' chip--active' : '');
  btn.textContent = label;
  btn.addEventListener('click', () => {
    activeFilter = value;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('chip--active'));
    btn.classList.add('chip--active');
    applyFilters();
  });
  filterBar.appendChild(btn);
}

// ---------- Apply Filters (Category + Search) -------------------------------

function applyFilters() {
  const filtered = getVisibleEntries();
  renderCards(filtered);
  metaCount.textContent = filtered.length;
}

function getVisibleEntries() {
  let filtered = allEntries;
  
  // Apply category filter
  if (activeFilter !== 'all') {
    filtered = filtered.filter(e => e.categories.includes(activeFilter));
  }
  
  // Apply search query filter
  if (searchQuery) {
    filtered = filtered.filter(e => 
      e.title.toLowerCase().includes(searchQuery) || 
      e.summary_plain.toLowerCase().includes(searchQuery)
    );
  }
  
  return filtered;
}

// ---------- Render Cards ----------------------------------------------------

function renderCards(entries) {
  if (!entries.length) {
    cardList.innerHTML = emptyState();
    return;
  }

  cardList.innerHTML = entries.map((entry, i) => {
    const badgesHTML = entry.categories.map(c => {
      const cls = badgeClass(c);
      return `<span class="badge ${cls}">${esc(c)}</span>`;
    }).join('');

    const tweetText = buildTweetText(entry);
    const tweetURL  = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

    const isLong = entry.summary_plain && entry.summary_plain.length > 180;
    const expandBtnHTML = isLong 
      ? `<button class="btn-toggle-expand" onclick="toggleCardExpand(this)" type="button">Show More</button>` 
      : '';

    return `
      <article class="card" style="animation-delay:${i * 0.04}s">
        <div class="card__top">
          <h2 class="card__title"><a href="${esc(entry.link)}" target="_blank" rel="noopener">${esc(entry.title)}</a></h2>
          <time class="card__date" datetime="${entry.published_iso}">${esc(entry.published)}</time>
        </div>
        <div class="card__body">${entry.summary_html}</div>
        ${expandBtnHTML}
        <div class="card__footer">
          <div class="card__categories">${badgesHTML}</div>
          <div class="card__actions">
            <button class="btn-copy" onclick="copyCard(this, ${i})" type="button" title="Copy to clipboard">
              <svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy
            </button>
            <a class="btn-tweet" href="${tweetURL}" target="_blank" rel="noopener" title="Tweet about this update">
              <svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              Tweet
            </a>
          </div>
        </div>
      </article>`;
  }).join('');
}

// ---------- Toggle Card Expand ----------------------------------------------

function toggleCardExpand(btn) {
  const card = btn.closest('.card');
  const body = card.querySelector('.card__body');
  const isExpanded = body.classList.toggle('card__body--expanded');
  btn.textContent = isExpanded ? 'Show Less' : 'Show More';
}

// ---------- Copy to Clipboard -----------------------------------------------

function copyCard(btn, index) {
  const entries = getVisibleEntries();
  const entry = entries[index];
  if (!entry) return;

  const text = `${entry.title}\n${entry.summary_plain}\n${entry.link}`;

  navigator.clipboard.writeText(text).then(() => {
    // Visual feedback
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '✓ Copied!';
    btn.classList.add('btn-copy--copied');
    showToast('Copied to clipboard!');

    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.classList.remove('btn-copy--copied');
    }, 2000);
  }).catch(() => {
    showToast('Failed to copy — try again');
  });
}

// ---------- Export to CSV ---------------------------------------------------

function exportToCSV() {
  const entries = getVisibleEntries();
  if (!entries.length) {
    showToast('No entries to export');
    return;
  }

  const headers = ['Title', 'Published', 'Categories', 'Summary', 'Link'];
  const rows = entries.map(e => [
    csvEscape(e.title),
    csvEscape(e.published),
    csvEscape(e.categories.join('; ')),
    csvEscape(e.summary_plain),
    csvEscape(e.link)
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'bigquery-release-notes.csv';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast(`Exported ${entries.length} entries to CSV`);
}

function csvEscape(str) {
  if (str == null) return '""';
  const s = String(str);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// ---------- Tweet Helpers ---------------------------------------------------

function buildTweetText(entry) {
  const title = entry.title;
  const url   = entry.link;
  const plain = entry.summary_plain;

  // Compose under 280 chars: title + snippet + url + hashtag
  const suffix = `\n\n${url}\n#AI #ArtificialIntelligence #TechNews`;
  const budget = 280 - suffix.length - title.length - 5; // 5 for ": " and "…"
  const snippet = budget > 30 ? ': ' + plain.slice(0, budget) + '…' : '';
  return title + snippet + suffix;
}

// ---------- Badge Class Helper ----------------------------------------------

function badgeClass(cat) {
  const lc = cat.toLowerCase();
  if (lc.includes('model'))       return 'badge--feature';
  if (lc.includes('application')) return 'badge--changed';
  if (lc.includes('policy'))      return 'badge--fix';
  if (lc.includes('hardware'))    return 'badge--deprecated';
  return '';
}

// ---------- State Templates -------------------------------------------------

function showSkeleton() {
  cardList.innerHTML = `
    <div class="skeleton">
      ${Array(5).fill('<div class="skeleton__card"></div>').join('')}
    </div>`;
}

function emptyState() {
  return `
    <div class="state-box">
      <div class="state-box__icon">📭</div>
      <div class="state-box__title">No entries found</div>
      <div class="state-box__msg">Try resetting the filter or refreshing.</div>
    </div>`;
}

function errorState(msg) {
  return `
    <div class="state-box">
      <div class="state-box__icon">⚠️</div>
      <div class="state-box__title">Failed to load release notes</div>
      <div class="state-box__msg">${esc(msg)}</div>
    </div>`;
}

// ---------- Toast -----------------------------------------------------------

let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('toast--visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('toast--visible'), 2500);
}

// ---------- Util ------------------------------------------------------------

function esc(str) {
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}

// ---------- Init ------------------------------------------------------------

btnRefresh.addEventListener('click', fetchNotes);
btnExport.addEventListener('click', exportToCSV);

searchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value.toLowerCase().trim();
  applyFilters();
});

fetchNotes(); // load on page open
