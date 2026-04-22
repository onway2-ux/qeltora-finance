// ui.js — UI rendering & interactions
import { getCache } from './db.js';

// ── DASHBOARD ──
export function renderDashboard() {
  const cache = getCache();
  const websites = cache.websites;
  const earnings = cache.earnings;
  const crypto = cache.crypto;

  const now = new Date();
  const curMonth = now.getMonth();
  const curYear = now.getFullYear();

  // Total earnings
  let totalEarnings = 0;
  let monthlyEarnings = 0;
  Object.values(earnings).forEach(e => {
    totalEarnings += (e.total || 0);
    const d = new Date(e.date);
    if (d.getMonth() === curMonth && d.getFullYear() === curYear) {
      monthlyEarnings += (e.total || 0);
    }
  });

  // Crypto P/L
  let totalCryptoPL = 0;
  Object.values(crypto).forEach(c => {
    totalCryptoPL += (c.profitLoss || 0);
  });

  const totalWebsites = Object.keys(websites).length;

  return `
    <div class="dashboard-header">
      <h1><i class="fas fa-chart-line"></i> Dashboard</h1>
      <p class="subtitle">Welcome back! Here's your financial overview.</p>
    </div>
    <div class="cards-grid">
      <div class="stat-card card-earnings">
        <div class="card-icon"><i class="fas fa-coins"></i></div>
        <div class="card-info">
          <span class="card-label">Total Earnings</span>
          <span class="card-value">$${totalEarnings.toFixed(4)}</span>
        </div>
      </div>
      <div class="stat-card card-monthly">
        <div class="card-icon"><i class="fas fa-calendar-alt"></i></div>
        <div class="card-info">
          <span class="card-label">This Month</span>
          <span class="card-value">$${monthlyEarnings.toFixed(4)}</span>
        </div>
      </div>
      <div class="stat-card card-crypto">
        <div class="card-icon"><i class="fab fa-bitcoin"></i></div>
        <div class="card-info">
          <span class="card-label">Crypto P/L</span>
          <span class="card-value ${totalCryptoPL >= 0 ? 'positive' : 'negative'}">$${totalCryptoPL.toFixed(4)}</span>
        </div>
      </div>
      <div class="stat-card card-websites">
        <div class="card-icon"><i class="fas fa-globe"></i></div>
        <div class="card-info">
          <span class="card-label">Active Websites</span>
          <span class="card-value">${totalWebsites}</span>
        </div>
      </div>
    </div>
    <div class="dashboard-sections">
      <div class="dash-section">
        <h2><i class="fas fa-history"></i> Recent Earnings</h2>
        <div class="mini-table-wrap">
          ${renderRecentEarnings(earnings, websites)}
        </div>
      </div>
      <div class="dash-section">
        <h2><i class="fas fa-exchange-alt"></i> Recent Crypto</h2>
        <div class="mini-table-wrap">
          ${renderRecentCrypto(crypto)}
        </div>
      </div>
    </div>
    <div class="dash-section full-width">
      <h2><i class="fas fa-chart-bar"></i> Monthly Analytics</h2>
      <div class="analytics-grid">
        ${renderMonthlyAnalytics(earnings, crypto)}
      </div>
    </div>
  `;
}

function renderRecentEarnings(earnings, websites) {
  const arr = Object.entries(earnings).map(([id, e]) => ({ id, ...e }));
  arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const recent = arr.slice(0, 5);
  if (!recent.length) return '<p class="empty-msg">No earnings yet. Start adding!</p>';
  let html = '<table class="mini-table"><thead><tr><th>Date</th><th>Website</th><th>Amount</th><th>Total</th></tr></thead><tbody>';
  recent.forEach(e => {
    const wName = websites[e.websiteId]?.name || 'Unknown';
    html += `<tr><td>${e.date}</td><td>${esc(wName)}</td><td>${e.amount}</td><td>$${(e.total||0).toFixed(4)}</td></tr>`;
  });
  html += '</tbody></table>';
  return html;
}

function renderRecentCrypto(crypto) {
  const arr = Object.entries(crypto).map(([id, c]) => ({ id, ...c }));
  arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const recent = arr.slice(0, 5);
  if (!recent.length) return '<p class="empty-msg">No crypto trades yet.</p>';
  let html = '<table class="mini-table"><thead><tr><th>Date</th><th>Coin</th><th>Qty</th><th>P/L</th></tr></thead><tbody>';
  recent.forEach(c => {
    const plClass = (c.profitLoss || 0) >= 0 ? 'positive' : 'negative';
    html += `<tr><td>${c.date}</td><td>${esc(c.coinName||'—')}</td><td>${c.quantity}</td><td class="${plClass}">$${(c.profitLoss||0).toFixed(4)}</td></tr>`;
  });
  html += '</tbody></table>';
  return html;
}

function renderMonthlyAnalytics(earnings, crypto) {
  const months = {};
  // last 6 months
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const label = d.toLocaleString('default', { month: 'short', year: 'numeric' });
    months[key] = { label, earnings: 0, crypto: 0 };
  }

  Object.values(earnings).forEach(e => {
    const key = e.date ? e.date.substring(0, 7) : '';
    if (months[key]) months[key].earnings += (e.total || 0);
  });

  Object.values(crypto).forEach(c => {
    const key = c.date ? c.date.substring(0, 7) : '';
    if (months[key]) months[key].crypto += (c.profitLoss || 0);
  });

  // Find max for bar scaling
  let maxVal = 1;
  Object.values(months).forEach(m => {
    maxVal = Math.max(maxVal, Math.abs(m.earnings), Math.abs(m.crypto));
  });

  let html = '';
  Object.values(months).forEach(m => {
    const ePct = Math.min(100, (Math.abs(m.earnings) / maxVal) * 100);
    const cPct = Math.min(100, (Math.abs(m.crypto) / maxVal) * 100);
    html += `
      <div class="analytics-month">
        <span class="month-label">${m.label}</span>
        <div class="bars">
          <div class="bar bar-earn" style="width:${ePct}%" title="Earnings: $${m.earnings.toFixed(2)}"></div>
          <div class="bar bar-crypto ${m.crypto >= 0 ? '' : 'bar-loss'}" style="width:${cPct}%" title="Crypto: $${m.crypto.toFixed(2)}"></div>
        </div>
        <div class="bar-legend">
          <small>E: $${m.earnings.toFixed(2)}</small>
          <small>C: $${m.crypto.toFixed(2)}</small>
        </div>
      </div>`;
  });
  return html;
}

// ── ADD WEBSITE ──
export function renderAddWebsite() {
  const cache = getCache();
  const websites = cache.websites;
  let tableRows = '';
  Object.entries(websites).forEach(([id, w]) => {
    tableRows += `
      <tr>
        <td>${esc(w.name)}</td>
        <td><span class="badge badge-${w.type}">${w.type}</span></td>
        <td class="actions-cell">
          <button class="btn-icon btn-edit" data-action="edit-website" data-id="${id}" title="Edit"><i class="fas fa-pen"></i></button>
          <button class="btn-icon btn-delete" data-action="delete-website" data-id="${id}" title="Delete"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`;
  });

  return `
    <div class="page-header">
      <h1><i class="fas fa-plus-circle"></i> Add Website</h1>
      <p class="subtitle">Manage your PTC websites</p>
    </div>
    <div class="form-card">
      <form id="websiteForm">
        <div class="form-group">
          <label for="wName"><i class="fas fa-globe"></i> Website Name</label>
          <input type="text" id="wName" placeholder="e.g. ySense, Cointiply" required>
        </div>
        <div class="form-group">
          <label for="wType"><i class="fas fa-tag"></i> Type</label>
          <select id="wType" required>
            <option value="">Select type</option>
            <option value="Crypto">Crypto</option>
            <option value="Coin">Coin</option>
          </select>
        </div>
        <input type="hidden" id="wEditId" value="">
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" id="wSubmitBtn"><i class="fas fa-save"></i> Save Website</button>
          <button type="button" class="btn btn-outline" id="wCancelBtn" style="display:none"><i class="fas fa-times"></i> Cancel</button>
        </div>
      </form>
    </div>
    <div class="table-card">
      <h2><i class="fas fa-list"></i> Your Websites (${Object.keys(websites).length})</h2>
      ${Object.keys(websites).length ? `
      <div class="table-responsive">
        <table class="data-table">
          <thead><tr><th>Name</th><th>Type</th><th>Actions</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>` : '<p class="empty-msg">No websites added yet.</p>'}
    </div>
  `;
}

// ── ADD EARNINGS ──
export function renderAddEarnings() {
  const cache = getCache();
  const websites = cache.websites;
  const today = new Date().toISOString().slice(0, 10);
  let websiteOptions = '<option value="">Select website</option>';
  Object.entries(websites).forEach(([id, w]) => {
    websiteOptions += `<option value="${id}">${esc(w.name)} (${w.type})</option>`;
  });

  return `
    <div class="page-header">
      <h1><i class="fas fa-dollar-sign"></i> Add Earnings</h1>
      <p class="subtitle">Log your daily PTC earnings</p>
    </div>
    <div class="form-card">
      <form id="earningsForm">
        <div class="form-row">
          <div class="form-group">
            <label for="eDate"><i class="fas fa-calendar"></i> Date</label>
            <input type="date" id="eDate" value="${today}" required>
          </div>
          <div class="form-group">
            <label for="eWebsite"><i class="fas fa-globe"></i> Website</label>
            <select id="eWebsite" required>${websiteOptions}</select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="eAmount"><i class="fas fa-coins"></i> Amount</label>
            <input type="number" id="eAmount" step="any" placeholder="e.g. 150" required>
          </div>
          <div class="form-group">
            <label for="eUnitPrice"><i class="fas fa-tag"></i> Unit Price ($)</label>
            <input type="number" id="eUnitPrice" step="any" placeholder="e.g. 0.0012" required>
          </div>
        </div>
        <div class="calc-preview">
          <span>Estimated Earning:</span>
          <span id="eCalcResult" class="calc-value">$0.0000</span>
        </div>
        <input type="hidden" id="eEditId" value="">
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" id="eSubmitBtn"><i class="fas fa-save"></i> Save Entry</button>
          <button type="button" class="btn btn-outline" id="eCancelBtn" style="display:none"><i class="fas fa-times"></i> Cancel</button>
        </div>
      </form>
    </div>
    ${!Object.keys(websites).length ? '<div class="info-banner"><i class="fas fa-info-circle"></i> Add a website first before logging earnings.</div>' : ''}
  `;
}

// ── CRYPTO TRACKER ──
export function renderCryptoTracker() {
  const cache = getCache();
  const crypto = cache.crypto;
  const today = new Date().toISOString().slice(0, 10);

  let tableRows = '';
  const arr = Object.entries(crypto).map(([id, c]) => ({ id, ...c }));
  arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  arr.forEach(c => {
    const plClass = (c.profitLoss || 0) >= 0 ? 'positive' : 'negative';
    tableRows += `
      <tr>
        <td>${c.date}</td>
        <td>${esc(c.coinName||'—')}</td>
        <td>$${(c.buyPrice||0).toFixed(4)}</td>
        <td>$${(c.sellPrice||0).toFixed(4)}</td>
        <td>${c.quantity}</td>
        <td class="${plClass}">$${(c.profitLoss||0).toFixed(4)}</td>
        <td class="actions-cell">
          <button class="btn-icon btn-edit" data-action="edit-crypto" data-id="${c.id}" title="Edit"><i class="fas fa-pen"></i></button>
          <button class="btn-icon btn-delete" data-action="delete-crypto" data-id="${c.id}" title="Delete"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`;
  });

  return `
    <div class="page-header">
      <h1><i class="fab fa-bitcoin"></i> Crypto Tracker</h1>
      <p class="subtitle">Track your crypto buy/sell profit & loss</p>
    </div>
    <div class="form-card">
      <form id="cryptoForm">
        <div class="form-row">
          <div class="form-group">
            <label for="cDate"><i class="fas fa-calendar"></i> Date</label>
            <input type="date" id="cDate" value="${today}" required>
          </div>
          <div class="form-group">
            <label for="cCoin"><i class="fas fa-coins"></i> Coin Name</label>
            <input type="text" id="cCoin" placeholder="e.g. BTC, ETH" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="cBuy"><i class="fas fa-arrow-down"></i> Buy Price ($)</label>
            <input type="number" id="cBuy" step="any" placeholder="0.00" required>
          </div>
          <div class="form-group">
            <label for="cSell"><i class="fas fa-arrow-up"></i> Sell Price ($)</label>
            <input type="number" id="cSell" step="any" placeholder="0.00" required>
          </div>
          <div class="form-group">
            <label for="cQty"><i class="fas fa-sort-numeric-up"></i> Quantity</label>
            <input type="number" id="cQty" step="any" placeholder="0" required>
          </div>
        </div>
        <div class="calc-preview">
          <span>Estimated P/L:</span>
          <span id="cCalcResult" class="calc-value">$0.0000</span>
        </div>
        <input type="hidden" id="cEditId" value="">
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" id="cSubmitBtn"><i class="fas fa-save"></i> Save Trade</button>
          <button type="button" class="btn btn-outline" id="cCancelBtn" style="display:none"><i class="fas fa-times"></i> Cancel</button>
        </div>
      </form>
    </div>
    <div class="table-card">
      <h2><i class="fas fa-list"></i> Trade History (${arr.length})</h2>
      ${arr.length ? `
      <div class="table-responsive">
        <table class="data-table">
          <thead><tr><th>Date</th><th>Coin</th><th>Buy</th><th>Sell</th><th>Qty</th><th>P/L</th><th>Actions</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>` : '<p class="empty-msg">No trades recorded yet.</p>'}
    </div>
  `;
}

// ── HISTORY ──
export function renderHistory() {
  const cache = getCache();
  const websites = cache.websites;
  const earnings = cache.earnings;
  const crypto = cache.crypto;

  // Build unified entries
  const all = [];
  Object.entries(earnings).forEach(([id, e]) => {
    all.push({ id, category: 'Earning', date: e.date, detail: websites[e.websiteId]?.name || 'Unknown', amount: `$${(e.total||0).toFixed(4)}`, raw: e, type: 'earning' });
  });
  Object.entries(crypto).forEach(([id, c]) => {
    const plClass = (c.profitLoss || 0) >= 0 ? 'positive' : 'negative';
    all.push({ id, category: 'Crypto', date: c.date, detail: c.coinName || '—', amount: `<span class="${plClass}">$${(c.profitLoss||0).toFixed(4)}</span>`, raw: c, type: 'crypto' });
  });
  all.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Website options for filter
  let wsOptions = '<option value="">All Websites</option>';
  Object.entries(websites).forEach(([id, w]) => {
    wsOptions += `<option value="${id}">${esc(w.name)}</option>`;
  });

  let tableRows = '';
  all.forEach(row => {
    tableRows += `
      <tr data-type="${row.type}" data-date="${row.date}" data-website="${row.type === 'earning' ? row.raw.websiteId : ''}">
        <td>${row.date}</td>
        <td><span class="badge badge-${row.category}">${row.category}</span></td>
        <td>${esc(row.detail)}</td>
        <td>${row.amount}</td>
        <td class="actions-cell">
          <button class="btn-icon btn-edit" data-action="edit-${row.type}" data-id="${row.id}" title="Edit"><i class="fas fa-pen"></i></button>
          <button class="btn-icon btn-delete" data-action="delete-${row.type}" data-id="${row.id}" title="Delete"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`;
  });

  return `
    <div class="page-header">
      <h1><i class="fas fa-history"></i> Full History</h1>
      <p class="subtitle">View and manage all your records</p>
    </div>
    <div class="filter-bar">
      <div class="filter-group">
        <label><i class="fas fa-search"></i></label>
        <input type="date" id="filterDate" placeholder="Filter by date">
      </div>
      <div class="filter-group">
        <select id="filterWebsite">${wsOptions}</select>
      </div>
      <div class="filter-group">
        <select id="filterType">
          <option value="">All Types</option>
          <option value="earning">Earnings</option>
          <option value="crypto">Crypto</option>
        </select>
      </div>
      <button class="btn btn-sm btn-outline" id="clearFilters"><i class="fas fa-times"></i> Clear</button>
    </div>
    <div class="table-card">
      <h2><i class="fas fa-table"></i> Records (${all.length})</h2>
      ${all.length ? `
      <div class="table-responsive">
        <table class="data-table" id="historyTable">
          <thead><tr><th>Date</th><th>Type</th><th>Detail</th><th>Amount</th><th>Actions</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>` : '<p class="empty-msg">No records found.</p>'}
    </div>
  `;
}

// ── SETTINGS ──
export function renderSettings() {
  const isDark = document.body.classList.contains('dark-mode');
  return `
    <div class="page-header">
      <h1><i class="fas fa-cog"></i> Settings</h1>
      <p class="subtitle">Configure your app preferences</p>
    </div>
    <div class="settings-grid">
      <div class="setting-card">
        <div class="setting-info">
          <i class="fas fa-moon"></i>
          <div>
            <h3>Dark Mode</h3>
            <p>Toggle between light and dark theme</p>
          </div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="darkModeToggle" ${isDark ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div class="setting-card">
        <div class="setting-info">
          <i class="fas fa-download"></i>
          <div>
            <h3>Export Data</h3>
            <p>Download all your data as JSON</p>
          </div>
        </div>
        <button class="btn btn-primary btn-sm" id="exportBtn"><i class="fas fa-file-export"></i> Export</button>
      </div>
      <div class="setting-card">
        <div class="setting-info">
          <i class="fas fa-sign-out-alt"></i>
          <div>
            <h3>Logout</h3>
            <p>Sign out from your account</p>
          </div>
        </div>
        <button class="btn btn-danger btn-sm" id="logoutBtnSettings"><i class="fas fa-power-off"></i> Logout</button>
      </div>
    </div>
    <div class="app-info-card">
      <p class="app-brand"><i class="fas fa-chart-pie"></i> QELTORA Finance Tracker</p>
      <p class="app-version">Version 1.0.0</p>
    </div>
  `;
}

// ── Toast notification ──
export function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';
  toast.innerHTML = `<i class="fas fa-${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ── Confirm dialog ──
export function showConfirm(message) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-dialog">
        <div class="confirm-icon"><i class="fas fa-exclamation-triangle"></i></div>
        <p>${message}</p>
        <div class="confirm-actions">
          <button class="btn btn-outline" id="confirmNo">Cancel</button>
          <button class="btn btn-danger" id="confirmYes">Delete</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
    overlay.querySelector('#confirmYes').onclick = () => { overlay.remove(); resolve(true); };
    overlay.querySelector('#confirmNo').onclick = () => { overlay.remove(); resolve(false); };
  });
}

// ── Escape HTML ──
function esc(str) {
  const el = document.createElement('span');
  el.textContent = str || '';
  return el.innerHTML;
}
