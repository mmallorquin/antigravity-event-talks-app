/* =========================================================
   BigQuery Release Notes — Client-side logic
   ========================================================= */

const API = '/api/notes';

// DOM refs
const cardList      = document.getElementById('card-list');
const btnRefresh    = document.getElementById('btn-refresh');
const metaCount     = document.getElementById('meta-count');
const metaUpdated   = document.getElementById('meta-updated');
const filterBar     = document.getElementById('filter-bar');
const toast         = document.getElementById('toast');

let allEntries = [];
let activeFilter = 'all';

// ---------- Fetch & Render --------------------------------------------------

async function fetchNotes() {
  btnRefresh.classList.add('btn-refresh--loading');
  btnRefresh.disabled = true;
  showSkeleton();

  try {
    const res = await fetch(API);
    const data = await res.json();

    if (!data.ok) throw new Error(data.error || 'Unknown error');

    allEntries = data.entries;
    metaCount.textContent = allEntries.length;
    metaUpdated.textContent = new Date().toLocaleTimeString();

    buildFilterChips();
    renderCards(allEntries);
    showToast(`Loaded ${allEntries.length} release notes`);
  } catch (err) {
    cardList.innerHTML = errorState(err.message);
  } finally {
    btnRefresh.classList.remove('btn-refresh--loading');
    btnRefresh.disabled = false;
  }
}

// ---------- Filter Chips ----------------------------------------------------

function buildFilterChips() {
  const cats = new Set();
  allEntries.forEach(e => e.categories.forEach(c => cats.add(c)));
  const sorted = [...cats].sort();

  filterBar.innerHTML = '';
  addChip('All', 'all', true);
  sorted.forEach(c => addChip(c, c, false));
}

function addChip(label, value, active) {
  const btn = document.createElement('button');
  btn.className = 'chip' + (active ? ' chip--active' : '');
  btn.textContent = label;
  btn.addEventListener('click', () => {
    activeFilter = value;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('chip--active'));
    btn.classList.add('chip--active');
    const filtered = value === 'all'
      ? allEntries
      : allEntries.filter(e => e.categories.includes(value));
    renderCards(filtered);
  });
  filterBar.appendChild(btn);
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

    return `
      <article class="card" style="animation-delay:${i * 0.04}s">
        <div class="card__top">
          <h2 class="card__title"><a href="${esc(entry.link)}" target="_blank" rel="noopener">${esc(entry.title)}</a></h2>
          <time class="card__date" datetime="${entry.published_iso}">${esc(entry.published)}</time>
        </div>
        <div class="card__body">${entry.summary_html}</div>
        <div class="card__footer">
          <div class="card__categories">${badgesHTML}</div>
          <a class="btn-tweet" href="${tweetURL}" target="_blank" rel="noopener" title="Tweet about this update">
            <svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            Tweet
          </a>
        </div>
      </article>`;
  }).join('');
}

// ---------- Tweet Helpers ---------------------------------------------------

function buildTweetText(entry) {
  const title = entry.title;
  const url   = entry.link;
  const plain = entry.summary_plain;

  // Compose under 280 chars: title + snippet + url + hashtag
  const suffix = `\n\n${url}\n#BigQuery #GoogleCloud`;
  const budget = 280 - suffix.length - title.length - 5; // 5 for ": " and "…"
  const snippet = budget > 30 ? ': ' + plain.slice(0, budget) + '…' : '';
  return title + snippet + suffix;
}

// ---------- Badge Class Helper ----------------------------------------------

function badgeClass(cat) {
  const lc = cat.toLowerCase();
  if (lc.includes('feature') || lc.includes('added'))       return 'badge--feature';
  if (lc.includes('change') || lc.includes('update'))       return 'badge--changed';
  if (lc.includes('fix') || lc.includes('issue') || lc.includes('bug')) return 'badge--fix';
  if (lc.includes('deprecat') || lc.includes('breaking'))   return 'badge--deprecated';
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
fetchNotes(); // load on page open
