// db.js — Database operations
import { db, ref, set, push, get, update, remove, onValue, query, orderByChild } from './firebase.js';

// ── Local cache ──
let _cache = { websites: {}, earnings: {}, crypto: {} };
let _listeners = [];

export function getCache() { return _cache; }

// ── WEBSITES ──
export async function addWebsite(uid, data) {
  const r = push(ref(db, `users/${uid}/websites`));
  await set(r, {
    name: data.name,
    type: data.type,
    fixedPrice: data.fixedPrice || null,
    cryptoId: data.cryptoId || null,
    cryptoName: data.cryptoName || null,
    createdAt: Date.now()
  });
  return r.key;
}

export async function updateWebsite(uid, id, data) {
  await update(ref(db, `users/${uid}/websites/${id}`), data);
}

export async function deleteWebsite(uid, id) {
  await remove(ref(db, `users/${uid}/websites/${id}`));
}

export function listenWebsites(uid, cb) {
  const r = ref(db, `users/${uid}/websites`);
  const unsub = onValue(r, snap => {
    _cache.websites = snap.val() || {};
    cb(_cache.websites);
  });
  _listeners.push(unsub);
  return unsub;
}

// ── EARNINGS ──
export async function addEarning(uid, data) {
  const r = push(ref(db, `users/${uid}/earnings`));
  const entry = {
    date: data.date,
    websiteId: data.websiteId,
    amount: parseFloat(data.amount),
    unitPrice: parseFloat(data.unitPrice),
    total: parseFloat(data.amount) * parseFloat(data.unitPrice),
    createdAt: Date.now()
  };
  await set(r, entry);
  return r.key;
}

export async function updateEarning(uid, id, data) {
  data.total = parseFloat(data.amount) * parseFloat(data.unitPrice);
  await update(ref(db, `users/${uid}/earnings/${id}`), data);
}

export async function deleteEarning(uid, id) {
  await remove(ref(db, `users/${uid}/earnings/${id}`));
}

export function listenEarnings(uid, cb) {
  const r = ref(db, `users/${uid}/earnings`);
  const unsub = onValue(r, snap => {
    _cache.earnings = snap.val() || {};
    cb(_cache.earnings);
  });
  _listeners.push(unsub);
  return unsub;
}

// ── CRYPTO ──
export async function addCrypto(uid, data) {
  const r = push(ref(db, `users/${uid}/crypto`));
  const entry = {
    type: data.type, // buy or sell
    coinName: data.coinName || '',
    buyPrice: parseFloat(data.buyPrice) || 0,
    sellPrice: parseFloat(data.sellPrice) || 0,
    quantity: parseFloat(data.quantity),
    profitLoss: (parseFloat(data.sellPrice) - parseFloat(data.buyPrice)) * parseFloat(data.quantity),
    date: data.date,
    createdAt: Date.now()
  };
  await set(r, entry);
  return r.key;
}

export async function updateCrypto(uid, id, data) {
  data.profitLoss = (parseFloat(data.sellPrice) - parseFloat(data.buyPrice)) * parseFloat(data.quantity);
  await update(ref(db, `users/${uid}/crypto/${id}`), data);
}

export async function deleteCrypto(uid, id) {
  await remove(ref(db, `users/${uid}/crypto/${id}`));
}

export function listenCrypto(uid, cb) {
  const r = ref(db, `users/${uid}/crypto`);
  const unsub = onValue(r, snap => {
    _cache.crypto = snap.val() || {};
    cb(_cache.crypto);
  });
  _listeners.push(unsub);
  return unsub;
}

// ── CLEANUP ──
export function detachAll() {
  _listeners.forEach(fn => { if (typeof fn === 'function') fn(); });
  _listeners = [];
  _cache = { websites: {}, earnings: {}, crypto: {} };
}

// ── EXPORT DATA ──
export function exportAllData() {
  const blob = new Blob([JSON.stringify(_cache, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `qeltora_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
