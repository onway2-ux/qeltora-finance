// app.js — Main application controller
import { onAuth, logout, currentUser } from './auth.js';
import {
  listenWebsites, listenEarnings, listenCrypto, detachAll,
  addWebsite, updateWebsite, deleteWebsite,
  addEarning, updateEarning, deleteEarning,
  addCrypto, updateCrypto, deleteCrypto,
  exportAllData, getCache
} from './db.js';
import {
  renderDashboard, renderAddWebsite, renderAddEarnings,
  renderCryptoTracker, renderHistory, renderSettings,
  renderLiveCrypto,
  showToast, showConfirm
} from './ui.js';

let uid = null;
let currentPage = 'dashboard';

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  onAuth(user => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    uid = user.uid;
    document.getElementById('userEmail').textContent = user.email;
    initListeners();
    initNavigation();
    initMobileMenu();
    loadTheme();
    navigateTo('dashboard');
  });
});

// ── Firebase Listeners ──
function initListeners() {
  listenWebsites(uid, () => { if (currentPage === 'dashboard' || currentPage === 'websites') rerender(); });
  listenEarnings(uid, () => { if (currentPage === 'dashboard' || currentPage === 'earnings' || currentPage === 'history') rerender(); });
  listenCrypto(uid, () => { if (currentPage === 'dashboard' || currentPage === 'crypto' || currentPage === 'history') rerender(); });
}

// ── Navigation ──
function initNavigation() {
  document.querySelectorAll('[data-page]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      navigateTo(link.dataset.page);
      // Close mobile sidebar
      document.querySelector('.sidebar').classList.remove('open');
      document.querySelector('.sidebar-overlay').classList.remove('show');
    });
  });

  // Logout button in sidebar
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    const res = await logout();
    if (res.success) {
      detachAll();
      window.location.href = 'login.html';
    }
  });
}

function navigateTo(page) {
  currentPage = page;
  // Update active nav
  document.querySelectorAll('[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  rerender();
}

function rerender() {
  const main = document.getElementById('mainContent');
  main.style.opacity = '0';
  main.style.transform = 'translateY(10px)';

  setTimeout(() => {
    switch (currentPage) {
      case 'dashboard': main.innerHTML = renderDashboard(); break;
      case 'websites': main.innerHTML = renderAddWebsite(); bindWebsiteEvents(); break;
      case 'earnings': main.innerHTML = renderAddEarnings(); bindEarningsEvents(); break;
      case 'crypto': main.innerHTML = renderCryptoTracker(); bindCryptoEvents(); break;
      case 'livecrypto': main.innerHTML = renderLiveCrypto(); bindLiveCryptoEvents(); break;
      case 'history': main.innerHTML = renderHistory(); bindHistoryEvents(); break;
      case 'settings': main.innerHTML = renderSettings(); bindSettingsEvents(); break;
    }
    requestAnimationFrame(() => {
      main.style.opacity = '1';
      main.style.transform = 'translateY(0)';
    });
  }, 150);
}

// ── Mobile Menu ──
function initMobileMenu() {
  const burger = document.getElementById('menuBurger');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  
  burger.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
  });
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  });
}

let cachedCoinList = null;
async function fetchCoinList() {
  if (cachedCoinList) return cachedCoinList;
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/coins/list');
    cachedCoinList = await res.json();
    return cachedCoinList;
  } catch (err) {
    return [];
  }
}

// ── WEBSITE EVENTS ──
function bindWebsiteEvents() {
  const form = document.getElementById('websiteForm');
  const editIdInput = document.getElementById('wEditId');
  const cancelBtn = document.getElementById('wCancelBtn');
  const submitBtn = document.getElementById('wSubmitBtn');
  
  const wType = document.getElementById('wType');
  const fixedPriceGroup = document.getElementById('wFixedPriceGroup');
  const cryptoGroup = document.getElementById('wCryptoSelectGroup');
  const cryptoSearch = document.getElementById('wCryptoSearch');
  const datalist = document.getElementById('cryptoList');

  if (datalist) {
    fetchCoinList().then(list => {
      let html = '';
      // Limit to 2000 to prevent datalist DOM freeze while capturing all major coins
      list.slice(0, 2000).forEach(c => html += `<option value="${c.name}" data-id="${c.id}"></option>`);
      datalist.innerHTML = html;
    });
  }

  wType.addEventListener('change', () => {
    if (wType.value === 'Coin') { fixedPriceGroup.style.display = 'block'; cryptoGroup.style.display = 'none'; }
    else if (wType.value === 'Crypto') { fixedPriceGroup.style.display = 'none'; cryptoGroup.style.display = 'block'; }
    else { fixedPriceGroup.style.display = 'none'; cryptoGroup.style.display = 'none'; }
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('wName').value.trim();
    const type = wType.value;
    const fixedPrice = document.getElementById('wFixedPrice').value || null;
    let cryptoId = null;
    let cryptoName = null;

    if (type === 'Crypto') {
      const searchVal = cryptoSearch.value;
      const opt = Array.from(datalist.options).find(o => o.value === searchVal);
      if (opt) { cryptoId = opt.getAttribute('data-id'); cryptoName = searchVal; }
      else { cryptoId = searchVal.toLowerCase().replace(/\s+/g,'-'); cryptoName = searchVal; }
    }
    const editId = editIdInput.value;

    try {
      const payload = { name, type, fixedPrice, cryptoId, cryptoName };
      if (editId) {
        await updateWebsite(uid, editId, payload);
        showToast('Website updated!');
      } else {
        await addWebsite(uid, payload);
        showToast('Website added!');
      }
      form.reset();
      editIdInput.value = '';
      cancelBtn.style.display = 'none';
      submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Website';
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  cancelBtn.addEventListener('click', () => {
    form.reset();
    editIdInput.value = '';
    cancelBtn.style.display = 'none';
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Website';
  });

  // Delegate edit/delete
  document.getElementById('mainContent').addEventListener('click', async e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === 'edit-website') {
      const w = getCache().websites[id];
      if (!w) return;
      document.getElementById('wName').value = w.name;
      document.getElementById('wType').value = w.type;
      editIdInput.value = id;
      cancelBtn.style.display = '';
      submitBtn.innerHTML = '<i class="fas fa-pen"></i> Update Website';
      form.scrollIntoView({ behavior: 'smooth' });
    }
    if (action === 'delete-website') {
      const ok = await showConfirm('Delete this website? This cannot be undone.');
      if (ok) {
        await deleteWebsite(uid, id);
        showToast('Website deleted.');
      }
    }
  });
}

// ── EARNINGS EVENTS ──
function bindEarningsEvents() {
  const form = document.getElementById('earningsForm');
  const editIdInput = document.getElementById('eEditId');
  const cancelBtn = document.getElementById('eCancelBtn');
  const submitBtn = document.getElementById('eSubmitBtn');
  const amountEl = document.getElementById('eAmount');
  const priceEl = document.getElementById('eUnitPrice');
  const calcEl = document.getElementById('eCalcResult');

  // Live calc
  const calc = () => {
    const a = parseFloat(amountEl.value) || 0;
    const p = parseFloat(priceEl.value) || 0;
    const total = a * p;
    calcEl.textContent = `$${total.toFixed(4)}`;
    calcEl.className = `calc-value ${total > 0 ? 'positive' : ''}`;
  };
  amountEl.addEventListener('input', calc);
  priceEl.addEventListener('input', calc);

  const eWebsite = document.getElementById('eWebsite');
  eWebsite.addEventListener('change', async () => {
    const opt = eWebsite.options[eWebsite.selectedIndex];
    if (!opt || !opt.value) return;
    const isFixed = opt.getAttribute('data-fixed');
    const isCrypto = opt.getAttribute('data-crypto');
    
    if (isFixed && isFixed !== 'null') {
      priceEl.value = isFixed;
      calc();
    } else if (isCrypto && isCrypto !== 'null') {
      priceEl.placeholder = 'Fetching...';
      try {
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${isCrypto}&vs_currencies=usd`);
        const data = await res.json();
        if (data[isCrypto]) {
          priceEl.value = data[isCrypto].usd;
          calc();
        }
      } catch (e) { console.error('Failed fetch'); }
      priceEl.placeholder = 'e.g. 0.0012';
    }
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
      date: document.getElementById('eDate').value,
      websiteId: document.getElementById('eWebsite').value,
      amount: amountEl.value,
      unitPrice: priceEl.value
    };
    const editId = editIdInput.value;
    try {
      if (editId) {
        await updateEarning(uid, editId, data);
        showToast('Earning updated!');
      } else {
        await addEarning(uid, data);
        showToast('Earning added!');
      }
      form.reset();
      editIdInput.value = '';
      cancelBtn.style.display = 'none';
      submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Entry';
      calcEl.textContent = '$0.0000';
      document.getElementById('eDate').value = new Date().toISOString().slice(0,10);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  cancelBtn.addEventListener('click', () => {
    form.reset();
    editIdInput.value = '';
    cancelBtn.style.display = 'none';
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Entry';
    calcEl.textContent = '$0.0000';
    document.getElementById('eDate').value = new Date().toISOString().slice(0,10);
  });
}

// ── CRYPTO EVENTS ──
function bindCryptoEvents() {
  const form = document.getElementById('cryptoForm');
  const editIdInput = document.getElementById('cEditId');
  const cancelBtn = document.getElementById('cCancelBtn');
  const submitBtn = document.getElementById('cSubmitBtn');
  const buyEl = document.getElementById('cBuy');
  const sellEl = document.getElementById('cSell');
  const qtyEl = document.getElementById('cQty');
  const calcEl = document.getElementById('cCalcResult');

  const calc = () => {
    const b = parseFloat(buyEl.value) || 0;
    const s = parseFloat(sellEl.value) || 0;
    const q = parseFloat(qtyEl.value) || 0;
    const pl = (s - b) * q;
    calcEl.textContent = `$${pl.toFixed(4)}`;
    calcEl.className = `calc-value ${pl >= 0 ? 'positive' : 'negative'}`;
  };
  buyEl.addEventListener('input', calc);
  sellEl.addEventListener('input', calc);
  qtyEl.addEventListener('input', calc);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
      date: document.getElementById('cDate').value,
      coinName: document.getElementById('cCoin').value.trim(),
      buyPrice: buyEl.value,
      sellPrice: sellEl.value,
      quantity: qtyEl.value,
      type: 'trade'
    };
    const editId = editIdInput.value;
    try {
      if (editId) {
        await updateCrypto(uid, editId, data);
        showToast('Trade updated!');
      } else {
        await addCrypto(uid, data);
        showToast('Trade added!');
      }
      form.reset();
      editIdInput.value = '';
      cancelBtn.style.display = 'none';
      submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Trade';
      calcEl.textContent = '$0.0000';
      document.getElementById('cDate').value = new Date().toISOString().slice(0,10);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  cancelBtn.addEventListener('click', () => {
    form.reset();
    editIdInput.value = '';
    cancelBtn.style.display = 'none';
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Trade';
    calcEl.textContent = '$0.0000';
    document.getElementById('cDate').value = new Date().toISOString().slice(0,10);
  });

  // Delegate edit/delete for crypto table
  document.getElementById('mainContent').addEventListener('click', async e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === 'edit-crypto') {
      const c = getCache().crypto[id];
      if (!c) return;
      document.getElementById('cDate').value = c.date;
      document.getElementById('cCoin').value = c.coinName || '';
      buyEl.value = c.buyPrice;
      sellEl.value = c.sellPrice;
      qtyEl.value = c.quantity;
      editIdInput.value = id;
      cancelBtn.style.display = '';
      submitBtn.innerHTML = '<i class="fas fa-pen"></i> Update Trade';
      calc();
      form.scrollIntoView({ behavior: 'smooth' });
    }
    if (action === 'delete-crypto') {
      const ok = await showConfirm('Delete this trade?');
      if (ok) {
        await deleteCrypto(uid, id);
        showToast('Trade deleted.');
      }
    }
  });
}

// ── HISTORY EVENTS ──
function bindHistoryEvents() {
  const dateFilter = document.getElementById('filterDate');
  const websiteFilter = document.getElementById('filterWebsite');
  const typeFilter = document.getElementById('filterType');
  const clearBtn = document.getElementById('clearFilters');
  const table = document.getElementById('historyTable');

  function applyFilters() {
    if (!table) return;
    const rows = table.querySelectorAll('tbody tr');
    const dVal = dateFilter.value;
    const wVal = websiteFilter.value;
    const tVal = typeFilter.value;

    rows.forEach(row => {
      let show = true;
      if (dVal && row.dataset.date !== dVal) show = false;
      if (wVal && row.dataset.website !== wVal) show = false;
      if (tVal && row.dataset.type !== tVal) show = false;
      row.style.display = show ? '' : 'none';
    });
  }

  if (dateFilter) dateFilter.addEventListener('change', applyFilters);
  if (websiteFilter) websiteFilter.addEventListener('change', applyFilters);
  if (typeFilter) typeFilter.addEventListener('change', applyFilters);
  if (clearBtn) clearBtn.addEventListener('click', () => {
    dateFilter.value = '';
    websiteFilter.value = '';
    typeFilter.value = '';
    applyFilters();
  });

  // Delegate edit/delete
  document.getElementById('mainContent').addEventListener('click', async e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === 'edit-earning') {
      navigateTo('earnings');
      setTimeout(() => {
        const entry = getCache().earnings[id];
        if (!entry) return;
        document.getElementById('eDate').value = entry.date;
        document.getElementById('eWebsite').value = entry.websiteId;
        document.getElementById('eAmount').value = entry.amount;
        document.getElementById('eUnitPrice').value = entry.unitPrice;
        document.getElementById('eEditId').value = id;
        document.getElementById('eCancelBtn').style.display = '';
        document.getElementById('eSubmitBtn').innerHTML = '<i class="fas fa-pen"></i> Update Entry';
      }, 300);
    }
    if (action === 'edit-crypto') {
      navigateTo('crypto');
      setTimeout(() => {
        const entry = getCache().crypto[id];
        if (!entry) return;
        document.getElementById('cDate').value = entry.date;
        document.getElementById('cCoin').value = entry.coinName || '';
        document.getElementById('cBuy').value = entry.buyPrice;
        document.getElementById('cSell').value = entry.sellPrice;
        document.getElementById('cQty').value = entry.quantity;
        document.getElementById('cEditId').value = id;
        document.getElementById('cCancelBtn').style.display = '';
        document.getElementById('cSubmitBtn').innerHTML = '<i class="fas fa-pen"></i> Update Trade';
      }, 300);
    }
    if (action === 'delete-earning') {
      const ok = await showConfirm('Delete this earning entry?');
      if (ok) { await deleteEarning(uid, id); showToast('Entry deleted.'); }
    }
    if (action === 'delete-crypto') {
      const ok = await showConfirm('Delete this trade?');
      if (ok) { await deleteCrypto(uid, id); showToast('Trade deleted.'); }
    }
  });
}

// ── SETTINGS EVENTS ──
function bindSettingsEvents() {
  document.getElementById('darkModeToggle').addEventListener('change', e => {
    document.body.classList.toggle('dark-mode', e.target.checked);
    localStorage.setItem('qeltora-dark', e.target.checked ? '1' : '0');
  });
  document.getElementById('exportBtn').addEventListener('click', () => {
    exportAllData();
    showToast('Data exported successfully!');
  });
  document.getElementById('logoutBtnSettings').addEventListener('click', async () => {
    const res = await logout();
    if (res.success) { detachAll(); window.location.href = 'login.html'; }
  });
}

// ── LIVE CRYPTO ──
function bindLiveCryptoEvents() {
  const content = document.getElementById('liveCryptoContent');
  const searchInput = document.getElementById('liveCryptoSearch');
  const btnSearch = document.getElementById('btnSearchCrypto');
  const btnRefresh = document.getElementById('btnRefreshCrypto');

  const renderTable = (coins) => {
    if (!coins.length) {
      content.innerHTML = '<p class="empty-msg">No coins found.</p>';
      return;
    }
    let rows = '';
    coins.forEach(c => {
      const pChange = c.price_change_percentage_24h || 0;
      const pcClass = pChange >= 0 ? 'positive' : 'negative';
      rows += `
        <tr>
          <td><div style="display:flex;align-items:center;gap:8px;"><img src="${c.image || ''}" width="20" height="20" onerror="this.style.display='none'"> <strong>${c.name}</strong> <small>(${c.symbol.toUpperCase()})</small></div></td>
          <td>$${(c.current_price || 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:6})}</td>
          <td class="${pcClass}">${pChange.toFixed(2)}%</td>
          <td>$${(c.market_cap || 0).toLocaleString()}</td>
        </tr>
      `;
    });
    content.innerHTML = `
      <div class="table-responsive">
        <table class="data-table">
          <thead><tr><th>Coin</th><th>Price</th><th>24h Change</th><th>Market Cap</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  };

  const fetchMarkets = async (ids = '') => {
    content.innerHTML = '<div class="loading-state" style="display:flex; justify-content:center; align-items:center; height:200px;"><i class="fas fa-spinner fa-spin fa-2x" style="color:var(--accent-primary);"></i></div>';
    try {
      const url = ids 
        ? `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc`
        : `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1`;
      const res = await fetch(url);
      const data = await res.json();
      renderTable(data);
    } catch(err) {
      content.innerHTML = '<p class="empty-msg" style="color:red;">Error fetching data. Rate limit reached?</p>';
    }
  };

  const attemptSearch = async () => {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) return fetchMarkets();
    content.innerHTML = '<div class="loading-state" style="display:flex; justify-content:center; align-items:center; height:200px;"><i class="fas fa-spinner fa-spin fa-2x" style="color:var(--accent-primary);"></i></div>';
    try {
      const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${q}`);
      const data = await res.json();
      if (data.coins && data.coins.length > 0) {
        const ids = data.coins.slice(0, 50).map(c => c.id).join(',');
        fetchMarkets(ids);
      } else {
        content.innerHTML = '<p class="empty-msg">No coins found for this search.</p>';
      }
    } catch(err) {
      content.innerHTML = '<p class="empty-msg" style="color:red;">Search API error. Too many requests?</p>';
    }
  };

  btnRefresh.addEventListener('click', () => { searchInput.value = ''; fetchMarkets(); });
  btnSearch.addEventListener('click', attemptSearch);
  searchInput.addEventListener('keypress', e => { if(e.key === 'Enter') attemptSearch(); });

  fetchMarkets();
}

// ── Theme ──
function loadTheme() {
  const dark = localStorage.getItem('qeltora-dark');
  if (dark === '1') document.body.classList.add('dark-mode');
}
