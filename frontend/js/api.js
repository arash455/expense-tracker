// Helpers shared by every page.

const CATEGORIES = [
  'Food', 'Transport', 'Housing', 'Utilities', 'Shopping',
  'Health', 'Entertainment', 'Education', 'Other',
];

function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
}

function saveSession(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  location.href = 'index.html';
}

// Call the backend. Throws an Error with a readable message if something fails.
async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  // Free Render servers sleep when idle; tell the user if the first request is slow.
  const slowTimer = setTimeout(() => showNotice('Waking up the server… this can take up to a minute.'), 3000);

  let res;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Please check your connection and try again.');
  } finally {
    clearTimeout(slowTimer);
    hideNotice();
  }

  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && token) {
    logout(); // token expired or account removed: back to the login page
    return new Promise(() => {}); // never resolves, so no error pops up while redirecting
  }
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

// Redirect to the login page if nobody is logged in. Returns the fresh user.
async function requireLogin() {
  if (!getToken()) {
    location.href = 'index.html';
    return null;
  }
  const { user } = await api('/api/auth/me');
  saveSession(getToken(), user);
  return user;
}

function showNotice(text) {
  let el = document.getElementById('notice');
  if (!el) {
    el = document.createElement('div');
    el.id = 'notice';
    el.className = 'notice';
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.hidden = false;
}

function hideNotice() {
  const el = document.getElementById('notice');
  if (el) el.hidden = true;
}

function formatMoney(amount) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: CURRENCY }).format(amount);
}

// '2026-10-27' -> 'Oct 27, 2026'
function formatDate(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// '2026-10' -> 'October 2026'
function formatMonth(isoMonth) {
  const [y, m] = isoMonth.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
}

// Today's date as 'YYYY-MM-DD' in the user's own timezone
function todayISO() {
  return new Date().toLocaleDateString('en-CA');
}

// Always use this before putting user-typed text into innerHTML
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Renders a simple horizontal bar chart: [{ label, value }]
function renderBars(container, items, emptyText) {
  if (!items.length) {
    container.innerHTML = `<p class="muted">${emptyText}</p>`;
    return;
  }
  const max = Math.max(...items.map((i) => i.value));
  container.innerHTML = items
    .map(
      (i) => `
      <div class="bar-row">
        <span class="bar-label">${escapeHtml(i.label)}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${(i.value / max) * 100}%"></span></span>
        <span class="bar-value">${formatMoney(i.value)}</span>
      </div>`
    )
    .join('');
}
