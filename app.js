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

// ── WEBSITE EVENTS ──
function bindWebsiteEvents() {
  const form = document.getElementById('websiteForm');
  const editIdInput = document.getElementById('wEditId');
  const cancelBtn = document.getElementById('wCancelBtn');
  const submitBtn = document.getElementById('wSubmitBtn');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('wName').value.trim();
    const type = document.getElementById('wType').value;
    const editId = editIdInput.value;

    try {
      if (editId) {
        await updateWebsite(uid, editId, { name, type });
        showToast('Website updated!');
      } else {
        await addWebsite(uid, { name, type });
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

// ── Theme ──
function loadTheme() {
  const dark = localStorage.getItem('qeltora-dark');
  if (dark === '1') document.body.classList.add('dark-mode');
}
