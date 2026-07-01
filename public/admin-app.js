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

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const H = () => ({ 'Content-Type': 'application/json', ...csrfHeaders() });

function toast(msg, type = 'ok') {
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

  document.querySelectorAll('.nav-item[data-page]').forEach((item) => {
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

  const modalCloseBtn = document.getElementById('modal-close-btn');
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);

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
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  document.querySelectorAll('.nav-item[data-page]').forEach((n) => n.classList.remove('active'));
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
  const maxSz = Math.max(...d.bySize.map((x) => x.count), 1);
  if (sizeChart) {
    sizeChart.innerHTML = d.bySize.map((s) => `
      <div class="bar-item">
        <span class="bar-lbl">${escapeHtml(s.bottle_size || 'Unspecified')}</span>
        <div class="bar-track"><div class="bar-fill" data-fill="${Math.round(s.count / maxSz * 100)}"></div></div>
        <span class="bar-val">${s.count}</span>
      </div>`).join('') || '<p class="no-data">No data yet</p>';
    sizeChart.querySelectorAll('.bar-fill').forEach((el) => {
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
  const maxSt = Math.max(...statuses.map((s) => d.stats[s.k] || 0), 1);
  if (statusChart) {
    statusChart.innerHTML = statuses.map((s) => `
      <div class="bar-item">
        <span class="bar-lbl">${s.l}</span>
        <div class="bar-track"><div class="bar-fill status-fill" data-fill="${Math.round((d.stats[s.k] || 0) / maxSt * 100)}" data-color="${s.c}"></div></div>
        <span class="bar-val">${d.stats[s.k] || 0}</span>
      </div>`).join('');
    statusChart.querySelectorAll('.status-fill').forEach((el) => {
      el.style.width = el.dataset.fill + '%';
      el.style.background = el.dataset.color;
    });
  }

  const recentTbody = document.getElementById('recent-tbody');
  if (recentTbody) {
    recentTbody.innerHTML = d.recent.map((e) => `
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
    tbody.innerHTML = d.rows.map((e) => `
      <tr>
        <td><span class="ref-badge">${escapeHtml(e.ref)}</span></td>
        <td>${escapeHtml(e.name)}</td>
        <td class="td-muted">${escapeHtml(e.email)}</td>
        <td class="td-muted">${escapeHtml(e.wedding_date || '—')}</td>
        <td>${escapeHtml(e.guest_count || '—')}</td>
        <td>${escapeHtml(e.bottle_size || '—')}</td>
        <td>${pill(e.status)}</td>
        <td class="td-muted">${escapeHtml((e.created_at || '').slice(0, 10))}</td>
        <td><button class="act-btn" type="button" data-enqid="${e.id}">View</button></td>
      </tr>`).join('') || '<tr><td colspan="9" class="no-results">No enquiries found</td></tr>';
  }

  const pages = Math.ceil(d.total / d.limit);
  let pagHtml = '';
  for (let i = 1; i <= pages; i++) {
    pagHtml += `<button class="pag-btn${i === enqPage ? ' active' : ''}" type="button" data-page-num="${i}">${i}</button>`;
  }
  const pag = document.getElementById('enq-pag');
  if (pag) {
    pag.innerHTML = pagHtml + `<span class="pag-info">${d.total} total</span>`;
    pag.querySelectorAll('[data-page-num]').forEach((btn) => {
      btn.addEventListener('click', () => {
        enqPage = Number(btn.dataset.pageNum);
        loadEnquiries();
      });
    });
  }
}

function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    enqPage = 1;
    loadEnquiries();
  }, 380);
}

async function loadActivity() {
  const r = await fetch(API + '/activity', { credentials: 'same-origin', headers: H() });
  const d = await r.json();
  const list = document.getElementById('activity-list');
  if (list) {
    list.innerHTML = d.map((a) => `
      <div class="log-item">
        <div class="log-dot"></div>
        <div class="flex-grow">
          <p class="log-act">${escapeHtml(a.action.replace(/_/g, ' '))}${a.enquiry_name ? ` — <strong>${escapeHtml(a.enquiry_name)}</strong> (${escapeHtml(a.ref)})` : ''}</p>
          ${a.detail ? `<p class="detail-note-small">${escapeHtml(a.detail)}</p>` : ''}
        </div>
        <span class="log-time">${escapeHtml((a.created_at || '').slice(0, 16).replace('T', ' '))}</span>
      </div>`).join('') || '<p class="no-results">No activity yet</p>';
  }
}

async function openModal(id) {
  currentEnqId = id;
  const r = await fetch(`${API}/enquiries/${id}`, { credentials: 'same-origin', headers: H() });
  const d = await r.json();

  document.getElementById('modal-name').textContent = d.name;
  document.getElementById('modal-status').value = d.status;
  document.getElementById('modal-notes').value = d.notes || '';
  document.getElementById('modal-price').value = d.quoted_price || '';
  document.getElementById('modal-vision').textContent = d.vision || 'No vision provided.';

  const customItems = [
    ['Script Choice', d.script_choice],
    ['Palette', d.palette],
    ['Packaging', d.packaging],
    ['Custom Message', d.custom_message],
  ].filter(([, value]) => value);
  document.getElementById('modal-custom').innerHTML = customItems.length ? customItems.map(([label, value]) => `<div class="detail-field detail-field-sm"><p class="detail-lbl">${escapeHtml(label)}</p><p class="detail-val">${escapeHtml(value)}</p></div>`).join('') : '<p class="detail-note">No additional customisation details were provided.</p>';

  const files = d.files || [];
  document.getElementById('modal-files').innerHTML = files.length ? `<div class="gallery-grid">${files.map((file) => {
    const isImage = (file.mime_type || '').startsWith('image/');
    const filename = file.original_name || file.filename;
    const safeFilename = escapeHtml(filename);
    const safeMime = escapeHtml(file.mime_type || 'Attachment');
    const href = `/uploads/${encodeURIComponent(file.filename)}`;
    const safeHref = escapeHtml(href);
    return `<div class="gallery-item">
      <div class="gallery-thumb" role="button" tabindex="0" data-open-file="${safeHref}" data-file-name="${safeFilename}">${isImage ? '<span class="gallery-thumb-label">Preview</span>' : 'PDF / File'}</div>
      <div class="gallery-meta">
        <div class="filename">${safeFilename}</div>
        <div>${safeMime}</div>
      </div>
      <a class="gallery-link" href="#" data-open-file="${safeHref}" data-file-name="${safeFilename}">Open / Download</a>
    </div>`;
  }).join('')}</div>` : '<p class="detail-note">No attachments uploaded.</p>';

  document.getElementById('modal-details').innerHTML = [
    { l: 'Reference', v: d.ref }, { l: 'Email', v: d.email }, { l: 'Phone', v: d.phone || '—' },
    { l: 'Wedding Date', v: d.wedding_date || '—' }, { l: 'Guest Count', v: d.guest_count || '—' },
    { l: 'Bottle Size', v: d.bottle_size || '—' }, { l: 'Cap Finish', v: d.cap_finish || '—' },
    { l: 'Engraving', v: d.engraving_text || '—' }, { l: 'Submitted', v: (d.created_at || '').slice(0, 16).replace('T', ' ') },
  ].map((f) => `<div class="detail-field"><p class="detail-lbl">${escapeHtml(f.l)}</p><p class="detail-val">${escapeHtml(f.v)}</p></div>`).join('');

  document.getElementById('modal-log').innerHTML = (d.log || []).slice(0, 6).map((a) => `
    <div class="log-item">
      <div class="log-dot"></div>
      <div class="flex-grow"><p class="log-act">${escapeHtml(a.action.replace(/_/g, ' '))}</p>${a.detail ? `<p class="detail-note-small">${escapeHtml(a.detail)}</p>` : ''}</div>
      <span class="log-time">${escapeHtml((a.created_at || '').slice(0, 16).replace('T', ' '))}</span>
    </div>`).join('') || '<p class="detail-note">No log entries</p>';

  document.getElementById('enq-modal').classList.add('open');
}

function closeModal() {
  document.getElementById('enq-modal').classList.remove('open');
  currentEnqId = null;
}

async function saveEnquiry() {
  if (!currentEnqId) return;
  const body = {
    status: document.getElementById('modal-status').value,
    notes: document.getElementById('modal-notes').value,
    quoted_price: document.getElementById('modal-price').value || null,
  };
  const r = await fetch(`${API}/enquiries/${currentEnqId}`, { method: 'PATCH', credentials: 'same-origin', headers: H(), body: JSON.stringify(body) });
  if (r.ok) {
    toast('Enquiry updated successfully');
    closeModal();
    loadOverview();
    if (document.getElementById('p-enquiries').classList.contains('active')) loadEnquiries();
  } else {
    toast('Update failed', 'err');
  }
}

async function deleteEnquiry() {
  if (!currentEnqId || !confirm('Permanently delete this enquiry?')) return;
  const r = await fetch(`${API}/enquiries/${currentEnqId}`, { method: 'DELETE', credentials: 'same-origin', headers: H() });
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
  const r = await fetch(API + '/change-password', { method: 'POST', credentials: 'same-origin', headers: H(), body: JSON.stringify({ current: cur, newPassword: nw }) });
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
      const a = document.createElement('a'); a.href = url; a.download = filename || 'file'; a.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
  } catch (e) {
    toast('Failed to fetch file', 'err');
  }
}

document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-open-file]');
  if (target) {
    event.preventDefault();
    openProtected(target.dataset.openFile, target.dataset.fileName);
  }
});

document.addEventListener('DOMContentLoaded', initAdmin);
