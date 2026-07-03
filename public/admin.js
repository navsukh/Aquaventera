const API = '/api/admin';
let currentEnqId = null;
let enqPage = 1;
let searchTimer = null;

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

function csrfHeaders() {
  const token = getCookie('XSRF-TOKEN');
  return token ? { 'x-csrf-token': token } : {};
}

// ═══════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════
let TOKEN = localStorage.getItem('av_admin_token');
let currentAdmin = localStorage.getItem('av_admin_user');
let currentUUID = null;
let enqTotal = 0;
let filterStatus = '';
let searchTimer = null;

const STATUSES = ['new','contacted','design_sent','approved','in_production','delivered','closed'];

// ═══════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+TOKEN } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch('/api'+path, opts);
  if (r.status === 401) { doLogout(); throw new Error('Unauthorised'); }
  return r.json();
}

// ═══════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════
async function doLogin() {
  const u = document.getElementById('login-u').value.trim();
  const p = document.getElementById('login-p').value;
  const err = document.getElementById('login-err');
  err.style.display = 'none';
  try {
    const r = await fetch('/api/admin/login', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ username:u, password:p })
    });
    const data = await r.json();
    if (!r.ok) { err.textContent = data.error; err.style.display='block'; return; }
    TOKEN = data.token;
    currentAdmin = data.username;
    localStorage.setItem('av_admin_token', TOKEN);
    localStorage.setItem('av_admin_user', currentAdmin);
    initApp();
  } catch { err.textContent = 'Connection error'; err.style.display='block'; }
}

document.addEventListener('keydown', e => { if (e.key === 'Enter' && document.getElementById('login-screen').style.display !== 'none') doLogin(); });

function doLogout() {
  TOKEN = null; localStorage.removeItem('av_admin_token'); localStorage.removeItem('av_admin_user');
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
}

function initApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('topbar-user').textContent = currentAdmin;
  loadDashboard();
}

if (TOKEN) initApp();

// ═══════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════
function showPage(name, navEl) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-'+name).classList.add('active');
  if (navEl) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    navEl.classList.add('active');
  }
}

function filterPage(status) {
  filterStatus = status;
  document.getElementById('status-filter').value = status;
  enqPage = 0;
  showPage('enquiries', null);
  loadEnquiries();
}

// ═══════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════
async function loadDashboard() {
  const data = await api('GET', '/admin/dashboard');

  // Stats
  const counts = {};
  data.statusCounts.forEach(r => counts[r.status] = r.count);
  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card gold"><p class="stat-label">Total Enquiries</p><p class="stat-value">${data.total}</p><p class="stat-sub">All time</p></div>
    <div class="stat-card"><p class="stat-label">This Month</p><p class="stat-value">${data.thisMonth}</p><p class="stat-sub">New commissions</p></div>
    <div class="stat-card"><p class="stat-label">Awaiting Reply</p><p class="stat-value">${counts.new||0}</p><p class="stat-sub">New enquiries</p></div>
    <div class="stat-card"><p class="stat-label">In Production</p><p class="stat-value">${(counts.in_production||0)+(counts.approved||0)}</p><p class="stat-sub">Active orders</p></div>
  `;

  // Recent table
  document.getElementById('recent-body').innerHTML = data.recent.length
    ? data.recent.map(e => `<tr onclick="loadDetail('${e.uuid}')" style="cursor:pointer;">
        <td><span class="tbl-ref">AV-${e.uuid.slice(0,8).toUpperCase()}</span></td>
        <td><span class="tbl-name">${esc(e.full_name)}</span></td>
        <td><span class="tbl-email">${esc(e.email)}</span></td>
        <td>${e.bottle_size||'—'}</td>
        <td>${e.guest_count||'—'}</td>
        <td><span class="badge badge-${e.status}">${e.status}</span></td>
        <td style="color:var(--muted);font-size:11px;">${e.created_at.slice(0,10)}</td>
      </tr>`).join('')
    : `<tr><td colspan="7"><div class="empty"><p class="empty-ico">✉</p><p class="empty-t">No enquiries yet</p></div></td></tr>`;
}

// ═══════════════════════════════════════════════
// ENQUIRIES LIST
// ═══════════════════════════════════════════════
async function loadEnquiries() {
  const q = document.getElementById('search-in')?.value || '';
  const status = document.getElementById('status-filter')?.value || '';
  const url = `/admin/enquiries?page=${enqPage}&limit=20${q?'&q='+encodeURIComponent(q):''}`;
  document.getElementById('enq-body').innerHTML = `<tr><td colspan="9" class="loading"><span class="spinner"></span>Loading…</td></tr>`;

  const data = await api('GET', url);
  enqTotal = data.total;
  let rows = data.enquiries;
  if (status) rows = rows.filter(r => r.status === status);

  document.getElementById('enq-sub').textContent = `${enqTotal} total enquiries${q?' · search: "'+q+'"':''}`;
  document.getElementById('enq-body').innerHTML = rows.length
    ? rows.map(e => `<tr onclick="loadDetail('${e.uuid}')" style="cursor:pointer;">
        <td><span class="tbl-ref">AV-${e.uuid.slice(0,8).toUpperCase()}</span></td>
        <td><span class="tbl-name">${esc(e.full_name)}</span></td>
        <td><span class="tbl-email">${esc(e.email)}<br/>${e.phone?esc(e.phone):''}</span></td>
        <td style="font-size:11px;">${e.wedding_date||'—'}</td>
        <td>${e.bottle_size||'—'}</td>
        <td>${e.guest_count||'—'}</td>
        <td style="font-size:11px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${e.engraving_text||'—'}</td>
        <td><span class="badge badge-${e.status}">${e.status}</span></td>
        <td style="color:var(--muted);font-size:11px;">${e.created_at.slice(0,10)}</td>
      </tr>`).join('')
    : `<tr><td colspan="9"><div class="empty"><p class="empty-ico">✉</p><p class="empty-t">No enquiries found</p></div></td></tr>`;

  // Pagination
  const totalPages = Math.ceil(enqTotal / 20);
  let pgHtml = '';
  if (totalPages > 1) {
    if (enqPage > 0) pgHtml += `<button class="pg-btn" onclick="enqPage--;loadEnquiries()">←</button>`;
    pgHtml += `<span class="pg-info">Page ${enqPage+1} of ${totalPages}</span>`;
    if (enqPage < totalPages-1) pgHtml += `<button class="pg-btn" onclick="enqPage++;loadEnquiries()">→</button>`;
  }
  document.getElementById('enq-pagination').innerHTML = pgHtml;
}

function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { enqPage = 0; loadEnquiries(); }, 350);
}

// ═══════════════════════════════════════════════
// ENQUIRY DETAIL
// ═══════════════════════════════════════════════
async function loadDetail(uuid) {
  currentUUID = uuid;
  showPage('detail', null);
  document.getElementById('detail-title').textContent = 'Loading…';

  const data = await api('GET', `/admin/enquiry/${uuid}`);
  const e = data.enquiry;

  document.getElementById('detail-title').textContent = e.full_name;
  document.getElementById('detail-sub').textContent = `AV-${e.uuid.slice(0,8).toUpperCase()} · Submitted ${e.created_at.slice(0,10)}`;

  const dr = (l,v) => v ? `<div class="detail-row"><span class="detail-lbl">${l}</span><span class="detail-val">${esc(v)}</span></div>` : '';

  document.getElementById('detail-contact').innerHTML =
    dr('Email', e.email) + dr('Phone', e.phone) + dr('WhatsApp', e.whatsapp);

  document.getElementById('detail-wedding').innerHTML =
    dr('Wedding Date', e.wedding_date) + dr('Guest Count', e.guest_count) +
    dr('Venue', e.venue_name) + dr('City', e.venue_city);

  document.getElementById('detail-order').innerHTML =
    dr('Bottle Size', e.bottle_size) + dr('Cap Finish', e.cap_finish) +
    dr('Engraving', e.engraving_text) + dr('Style', e.engraving_style) +
    dr('Packaging', e.packaging) + (e.quoted_price ? dr('Quoted Price', '₹'+Number(e.quoted_price).toLocaleString('en-IN')) : '');

  document.getElementById('detail-vision').textContent = e.vision_notes || 'No notes provided.';

  // Status selector
  document.getElementById('detail-status-sel').innerHTML =
    STATUSES.map(s => `<option value="${s}"${e.status===s?' selected':''}>${s.replace(/_/g,' ')}</option>`).join('');
  document.getElementById('detail-notes').value = e.notes || '';
  document.getElementById('quote-price').value = e.quoted_price || '';

  // Activity
  document.getElementById('detail-activity').innerHTML = data.activity.length
    ? data.activity.map(a => `<div class="activity-item">
        <div class="act-dot"></div>
        <div><p class="act-action">${esc(a.action.replace(/_/g,' '))}</p>
        <p class="act-meta">${a.created_at.slice(0,16)} · ${a.actor||'system'}${a.detail?' · '+esc(a.detail.slice(0,60)):''}</p></div>
      </div>`).join('')
    : `<p style="font-size:11px;color:var(--muted);">No activity yet.</p>`;
}

async function saveStatus() {
  const status = document.getElementById('detail-status-sel').value;
  await api('PATCH', `/admin/enquiry/${currentUUID}`, { status });
  toast('Status updated');
  loadDetail(currentUUID);
}
async function saveNotes() {
  const notes = document.getElementById('detail-notes').value;
  await api('PATCH', `/admin/enquiry/${currentUUID}`, { notes });
  toast('Notes saved');
}
async function saveQuote() {
  const quoted_price = parseFloat(document.getElementById('quote-price').value);
  if (isNaN(quoted_price)) { toast('Enter a valid amount', true); return; }
  await api('PATCH', `/admin/enquiry/${currentUUID}`, { quoted_price });
  toast('Quote saved');
}
async function sendProof() {
  const proof_url = document.getElementById('proof-url').value.trim();
  const r = await api('POST', `/admin/enquiry/${currentUUID}/send-proof`, { proof_url });
  if (r.success) { toast('Design proof email sent'); loadDetail(currentUUID); }
  else toast(r.error || 'Failed to send', true);
}

// ═══════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════
function exportCSV() {
  const a = document.createElement('a');
  a.href = '/api/admin/export';
  a.setAttribute('Authorization', 'Bearer '+TOKEN);
  // Trigger via fetch then download
  fetch('/api/admin/export', { headers:{ Authorization:'Bearer '+TOKEN } })
    .then(r => r.blob())
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url;
      a.download=`aquaventera-enquiries-${new Date().toISOString().slice(0,10)}.csv`;
      a.click(); URL.revokeObjectURL(url);
    });
}

// ═══════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

let toastTimer;
function toast(msg, isError=false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast' + (isError ? ' error' : '');
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const H = () => ({ 'Content-Type': 'application/json', ...csrfHeaders() });

function toast(msg, type='ok') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'show ' + type;
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.className = ''; }, 3200);
}

async function doLogin() {
  const email = document.getElementById('li-email').value.trim();
  const password = document.getElementById('li-pass').value;
  const err = document.getElementById('li-err');
  if (err) err.style.display = 'none';

  try {
    const r = await fetch(API + '/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: Object.assign({ 'Content-Type': 'application/json' }, csrfHeaders()),
      body: JSON.stringify({ email, password })
    });
    const d = await r.json();

    if (!r.ok) {
      if (err) {
        err.textContent = d.error || 'Login failed';
        err.style.display = 'block';
      }
      return;
    }

    const adminFoot = document.getElementById('admin-foot');
    if (adminFoot) adminFoot.textContent = d.email || email;
    showDashboard();
  } catch (e) {
    if (err) {
      err.textContent = 'Connection failed';
      err.style.display = 'block';
    }
  }
}

function doLogout() {
  fetch(API + '/logout', {
    method: 'POST',
    credentials: 'same-origin',
    headers: csrfHeaders()
  }).finally(() => {
    const dashboard = document.getElementById('dashboard');
    const loginPage = document.getElementById('login-page');
    if (dashboard) dashboard.style.display = 'none';
    if (loginPage) loginPage.style.display = 'flex';
  });
}

async function tryResumeSession() {
  try {
    const r = await fetch(API + '/dashboard', {
      credentials: 'same-origin',
      headers: H()
    });
    if (!r.ok) throw new Error('No active session');
    const d = await r.json();
    if (d.adminName) {
      const adminFoot = document.getElementById('admin-foot');
      if (adminFoot) adminFoot.textContent = d.adminName;
    }
    showDashboard();
  } catch (err) {
    // leave login page visible
  }
}

function initAdmin() {
  const loginForm = document.getElementById('login-form');
  const passInput = document.getElementById('li-pass');
  const dashboard = document.getElementById('dashboard');

  if (loginForm) {
    loginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      doLogin();
    });
  }

  if (passInput) {
    passInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        doLogin();
      }
    });
  }

  const searchInput = document.getElementById('enq-search');
  if (searchInput) {
    searchInput.addEventListener('input', debounceSearch);
  }

  const statusFilter = document.getElementById('enq-status-filter');
  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      enqPage = 1;
      loadEnquiries();
    });
  }

  const navItems = document.querySelectorAll('[data-page]');
  navItems.forEach(item => {
    item.addEventListener('click', () => showPage(item.dataset.page));
  });

  const logoutButton = document.getElementById('logout-btn');
  if (logoutButton) logoutButton.addEventListener('click', doLogout);

  const saveButton = document.getElementById('modal-save-btn');
  if (saveButton) saveButton.addEventListener('click', saveEnquiry);

  const cancelButton = document.getElementById('modal-cancel-btn');
  if (cancelButton) cancelButton.addEventListener('click', closeModal);

  const deleteButton = document.getElementById('modal-delete-btn');
  if (deleteButton) deleteButton.addEventListener('click', deleteEnquiry);

  const changePasswordBtn = document.getElementById('pw-change-btn');
  if (changePasswordBtn) changePasswordBtn.addEventListener('click', changePassword);

  if (dashboard) dashboard.style.display = 'none';
  const loginPage = document.getElementById('login-page');
  if (loginPage) loginPage.style.display = 'flex';
  tryResumeSession();
}

function showDashboard() {
  const loginPage = document.getElementById('login-page');
  const dashboard = document.getElementById('dashboard');
  if (loginPage) loginPage.style.display = 'none';
  if (dashboard) dashboard.style.display = 'flex';
  loadOverview();
}

const pageTitles = { 'p-overview': 'Overview', 'p-enquiries': 'All Enquiries', 'p-activity': 'Activity Log', 'p-settings': 'Settings' };
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('[data-page]').forEach(n => n.classList.remove('active'));
  const page = document.getElementById(id);
  if (page) page.classList.add('active');
  const navItem = document.querySelector(`[data-page="${id}"]`);
  if (navItem) navItem.classList.add('active');
  const title = document.getElementById('page-title');
  if (title) title.textContent = pageTitles[id] || 'Overview';
  if (id === 'p-enquiries') loadEnquiries();
  if (id === 'p-activity') loadActivity();
}

async function loadOverview() {
  const r = await fetch(API + '/dashboard', { credentials: 'same-origin', headers: H() });
  if (r.status === 401) { doLogout(); return; }
  const d = await r.json();
  if (d.adminName) {
    const adminFoot = document.getElementById('admin-foot');
    if (adminFoot) adminFoot.textContent = d.adminName;
  }

  document.getElementById('st-total').textContent = d.stats.total;
  document.getElementById('st-new').textContent = d.stats.new_count;
  document.getElementById('st-confirmed').textContent = d.stats.confirmed_count;
  document.getElementById('st-week').textContent = d.stats.week_count;
  document.getElementById('st-today-sub').textContent = d.stats.today_count + ' today';
  document.getElementById('new-badge').textContent = d.stats.new_count + ' new';

  const sizeChart = document.getElementById('size-chart');
  const maxSz = Math.max(...d.bySize.map(x => x.count), 1);
  if (sizeChart) {
    sizeChart.innerHTML = d.bySize.map(s => `
      <div class="bar-item">
        <span class="bar-lbl">${escapeHtml(s.bottle_size || 'Unspecified')}</span>
        <div class="bar-track"><div class="bar-fill" data-fill="${Math.round(s.count / maxSz * 100)}"></div></div>
        <span class="bar-val">${s.count}</span>
      </div>`).join('') || '<p class="no-data">No data yet</p>';
    sizeChart.querySelectorAll('.bar-fill').forEach(el => {
      el.style.width = el.dataset.fill + '%';
    });
  }

  const statusChart = document.getElementById('status-chart');
  const statuses = [
    { k: 'new_count', l: 'New', c: '#64b4ff' },
    { k: 'in_review_count', l: 'In Review', c: '#ffc83c' },
    { k: 'quoted_count', l: 'Quoted', c: '#C9A84C' },
    { k: 'confirmed_count', l: 'Confirmed', c: '#50c878' },
    { k: 'fulfilled_count', l: 'Fulfilled', c: 'rgba(180,255,180,.7)' },
    { k: 'cancelled_count', l: 'Cancelled', c: 'rgba(255,100,100,.7)' }
  ];
  const maxSt = Math.max(...statuses.map(s => d.stats[s.k] || 0), 1);
  if (statusChart) {
    statusChart.innerHTML = statuses.map(s => `
      <div class="bar-item">
        <span class="bar-lbl">${s.l}</span>
        <div class="bar-track"><div class="bar-fill status-fill" data-fill="${Math.round((d.stats[s.k] || 0) / maxSt * 100)}" data-color="${s.c}"></div></div>
        <span class="bar-val">${d.stats[s.k] || 0}</span>
      </div>`).join('');
    statusChart.querySelectorAll('.status-fill').forEach(el => {
      el.style.width = el.dataset.fill + '%';
      el.style.background = el.dataset.color;
    });
  }

  const recentTbody = document.getElementById('recent-tbody');
  if (recentTbody) {
    recentTbody.innerHTML = d.recent.map(e => `
      <tr>
        <td><span class="ref-badge">${escapeHtml(e.ref)}</span></td>
        <td>${escapeHtml(e.name)}</td>
        <td class="td-muted">${escapeHtml(e.email)}</td>
        <td class="td-muted">${escapeHtml(e.wedding_date || '—')}</td>
        <td>${escapeHtml(e.bottle_size || '—')}</td>
        <td>${pill(e.status)}</td>
        <td><button class="act-btn view-enquiry" type="button" data-enqid="${e.id}">View</button></td>
      </tr>`).join('');
  }
}

async function loadEnquiries() {
  const search = document.getElementById('enq-search')?.value || '';
  const status = document.getElementById('enq-status-filter')?.value || 'all';
  const r = await fetch(`${API}/enquiries?page=${enqPage}&limit=20&search=${encodeURIComponent(search)}&status=${status}`, { credentials: 'same-origin', headers: H() });
  if (r.status === 401) { doLogout(); return; }
  const d = await r.json();

  const tbody = document.getElementById('enq-tbody');
  if (tbody) {
    tbody.innerHTML = d.rows.map(e => `
      <tr>
        <td><span class="ref-badge">${escapeHtml(e.ref)}</span></td>
        <td>${escapeHtml(e.name)}</td>
        <td class="td-muted small-text">${escapeHtml(e.email)}</td>
        <td class="td-muted">${escapeHtml(e.wedding_date || '—')}</td>
        <td>${escapeHtml(e.guest_count || '—')}</td>
        <td>${escapeHtml(e.bottle_size || '—')}</td>
        <td>${pill(e.status)}</td>
        <td class="td-muted small-text">${escapeHtml((e.created_at || '').slice(0, 10))}</td>
        <td><button class="act-btn view-enquiry" type="button" data-enqid="${e.id}">View</button></td>
      </tr>`).join('') || '<tr><td colspan="9" class="no-results">No enquiries found</td></tr>';
  }

  const pages = Math.ceil(d.total / d.limit);
  const pagEl = document.getElementById('enq-pag');
  if (pagEl) {
    let pagHtml = '';
    for (let i = 1; i <= pages; i++) {
      pagHtml += `<button class="pag-btn${i===enqPage?' active':''}" type="button" data-page="${i}">${i}</button>`;
    }
    pagEl.innerHTML = pagHtml + `<span class="pag-info">${d.total} total</span>`;
    pagEl.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        enqPage = Number(btn.dataset.page);
        loadEnquiries();
      });
    });
  }
}

function goPage(p) { enqPage = p; loadEnquiries(); }
function debounceSearch() { clearTimeout(searchTimer); searchTimer = setTimeout(() => { enqPage = 1; loadEnquiries(); }, 380); }

async function loadActivity() {
  const r = await fetch(API + '/activity', { credentials: 'same-origin', headers: H() });
  const d = await r.json();
  const activityList = document.getElementById('activity-list');
  if (activityList) {
    activityList.innerHTML = d.map(a => `
      <div class="log-item">
        <div class="log-dot"></div>
        <div class="detail-flex">
          <p class="log-act">${escapeHtml(a.action.replace(/_/g, ' '))}${a.enquiry_name ? ' — <strong>' + escapeHtml(a.enquiry_name) + '</strong> (' + escapeHtml(a.ref) + ')' : ''}</p>
          ${a.detail ? `<p class="detail-note-small">${escapeHtml(a.detail)}</p>` : ''}
        </div>
        <span class="log-time">${escapeHtml((a.created_at || '').slice(0, 16).replace('T', ' '))}</span>
      </div>`).join('') || '<p class="no-data">No activity yet</p>';
  }
}

async function openModal(id) {
  currentEnqId = id;
  const r = await fetch(`${API}/enquiries/${id}`, { credentials: 'same-origin', headers: H() });
  const d = await r.json();

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  setText('modal-name', d.name);
  const statusEl = document.getElementById('modal-status');
  if (statusEl) statusEl.value = d.status;
  const notesEl = document.getElementById('modal-notes');
  if (notesEl) notesEl.value = d.notes || '';
  const priceEl = document.getElementById('modal-price');
  if (priceEl) priceEl.value = d.quoted_price || '';
  setText('modal-vision', d.vision || 'No vision provided.');

  const customItems = [
    ['Script Choice', d.script_choice],
    ['Palette', d.palette],
    ['Packaging', d.packaging],
    ['Custom Message', d.custom_message]
  ].filter(([, value]) => value);
  const modalCustom = document.getElementById('modal-custom');
  if (modalCustom) {
    if (customItems.length) {
      modalCustom.innerHTML = customItems.map(([label, value]) => `
        <div class="detail-field detail-field-sm">
          <p class="detail-lbl">${escapeHtml(label)}</p>
          <p class="detail-val">${escapeHtml(value)}</p>
        </div>`).join('');
    } else {
      modalCustom.innerHTML = '<p class="detail-note-small">No additional customisation details were provided.</p>';
    }
  }

  const files = d.files || [];
  const modalFiles = document.getElementById('modal-files');
  if (modalFiles) {
    if (files.length) {
      modalFiles.innerHTML = `<div class="gallery-grid">${files.map(file => {
        const isImage = (file.mime_type || '').startsWith('image/');
        const filename = file.original_name || file.filename;
        const safeFilename = escapeHtml(filename);
        const safeMime = escapeHtml(file.mime_type || 'Attachment');
        const href = file.url || `/uploads/${encodeURIComponent(file.filename)}`;
        return `
          <div class="gallery-item">
            <button class="gallery-thumb-button" type="button" data-file-href="${escapeHtml(href)}" data-file-name="${safeFilename}">
              ${isImage ? '<span class="gallery-thumb-label">Preview</span>' : 'PDF / File'}
            </button>
            <div class="gallery-meta">
              <div class="filename">${safeFilename}</div>
              <div>${safeMime}</div>
            </div>
            <button class="gallery-link" type="button" data-file-href="${escapeHtml(href)}" data-file-name="${safeFilename}">Open / Download</button>
          </div>`;
      }).join('')}</div>`;
    } else {
      modalFiles.innerHTML = '<p class="detail-note-small">No attachments uploaded.</p>';
    }
  }

  const details = [
    { l: 'Reference', v: d.ref },
    { l: 'Email', v: d.email },
    { l: 'Phone', v: d.phone || '—' },
    { l: 'Wedding Date', v: d.wedding_date || '—' },
    { l: 'Guest Count', v: d.guest_count || '—' },
    { l: 'Bottle Size', v: d.bottle_size || '—' },
    { l: 'Cap Finish', v: d.cap_finish || '—' },
    { l: 'Engraving', v: d.engraving_text || '—' },
    { l: 'Submitted', v: (d.created_at || '').slice(0, 16).replace('T', ' ') }
  ];
  const modalDetails = document.getElementById('modal-details');
  if (modalDetails) {
    modalDetails.innerHTML = details.map(f => `
      <div class="detail-field">
        <p class="detail-lbl">${escapeHtml(f.l)}</p>
        <p class="detail-val">${escapeHtml(f.v)}</p>
      </div>`).join('');
  }

  const modalLog = document.getElementById('modal-log');
  if (modalLog) {
    modalLog.innerHTML = (d.log || []).slice(0, 6).map(a => `
      <div class="log-item">
        <div class="log-dot"></div>
        <div class="detail-flex">
          <p class="log-act">${escapeHtml(a.action.replace(/_/g, ' '))}</p>
          ${a.detail ? `<p class="detail-note-small">${escapeHtml(a.detail)}</p>` : ''}
        </div>
        <span class="log-time">${escapeHtml((a.created_at || '').slice(0, 16).replace('T', ' '))}</span>
      </div>`).join('') || '<p class="no-data">No log entries</p>';
  }

  const modal = document.getElementById('enq-modal');
  if (modal) modal.classList.add('open');
}

function closeModal() {
  const modal = document.getElementById('enq-modal');
  if (modal) modal.classList.remove('open');
  currentEnqId = null;
}

async function saveEnquiry() {
  if (!currentEnqId) return;
  const body = {
    status: document.getElementById('modal-status').value,
    notes: document.getElementById('modal-notes').value,
    quoted_price: document.getElementById('modal-price').value || null
  };
  const r = await fetch(`${API}/enquiries/${currentEnqId}`, {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: H(),
    body: JSON.stringify(body)
  });
  if (r.ok) {
    toast('Enquiry updated successfully');
    closeModal();
    loadOverview();
    if (document.getElementById('p-enquiries')?.classList.contains('active')) loadEnquiries();
  } else {
    toast('Update failed', 'err');
  }
}

async function deleteEnquiry() {
  if (!currentEnqId || !confirm('Permanently delete this enquiry?')) return;
  const r = await fetch(`${API}/enquiries/${currentEnqId}`, {
    method: 'DELETE',
    credentials: 'same-origin',
    headers: H()
  });
  if (r.ok) {
    toast('Deleted');
    closeModal();
    loadOverview();
    loadEnquiries();
  } else {
    toast('Delete failed', 'err');
  }
}

async function changePassword() {
  const cur = document.getElementById('pw-cur').value;
  const nw = document.getElementById('pw-new').value;
  const r = await fetch(API + '/change-password', {
    method: 'POST',
    credentials: 'same-origin',
    headers: H(),
    body: JSON.stringify({ current: cur, newPassword: nw })
  });
  const d = await r.json();
  if (r.ok) {
    toast('Password updated');
    document.getElementById('pw-cur').value = '';
    document.getElementById('pw-new').value = '';
  } else {
    toast(d.error || 'Failed', 'err');
  }
}

function pill(s) {
  const c = { new: 'pill-new', in_review: 'pill-review', quoted: 'pill-quoted', confirmed: 'pill-confirmed', fulfilled: 'pill-fulfilled', cancelled: 'pill-cancelled' };
  return `<span class="pill ${c[s] || ''}">${escapeHtml(String(s).replace('_', ' '))}</span>`;
}

async function openProtected(href, filename) {
  try {
    const r = await fetch(href, { credentials: 'same-origin', headers: H() });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      toast(err.error || 'Unable to fetch file', 'err');
      return;
    }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (!w) {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'file';
      a.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
  } catch (e) {
    toast('Failed to fetch file', 'err');
  }
}

function attachDelegatedEvents() {
  const enqTables = document.getElementById('enq-tbody');
  if (enqTables) {
    enqTables.addEventListener('click', (event) => {
      const btn = event.target.closest('.view-enquiry');
      if (btn) {
        const id = Number(btn.dataset.enqid);
        if (id) openModal(id);
      }
    });
  }

  const recentTable = document.getElementById('recent-tbody');
  if (recentTable) {
    recentTable.addEventListener('click', (event) => {
      const btn = event.target.closest('.view-enquiry');
      if (btn) {
        const id = Number(btn.dataset.enqid);
        if (id) openModal(id);
      }
    });
  }

  const modalFiles = document.getElementById('modal-files');
  if (modalFiles) {
    modalFiles.addEventListener('click', (event) => {
      const target = event.target.closest('[data-file-href]');
      if (!target) return;
      const href = target.dataset.fileHref;
      const name = target.dataset.fileName;
      if (href) openProtected(href, name);
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initAdmin();
    attachDelegatedEvents();
  });
} else {
  initAdmin();
  attachDelegatedEvents();
}
window.addEventListener('load', async () => {
  await fetch('/api/admin/csrf', {
    credentials: 'include'
  });
});