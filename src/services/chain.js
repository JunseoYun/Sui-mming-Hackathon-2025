// Chain side-effect helpers: serialization queue, retry, and local pending queues

let txQueue = Promise.resolve();

function tryAppendLog(appendFn, entry) {
  try {
    if (typeof appendFn === 'function') appendFn(entry);
  } catch (_) {}
}

export function createChainOps(appendChainLog) {
  const runSerialized = (name, fn) => {
    const next = txQueue
      .catch(() => {})
      .then(async () => {
        tryAppendLog(appendChainLog, { action: 'queue', status: 'start', name });
        try {
          const res = await fn();
          tryAppendLog(appendChainLog, { action: 'queue', status: 'success', name });
          return res;
        } catch (e) {
          tryAppendLog(appendChainLog, { action: 'queue', status: 'error', name, error: String(e?.message || e) });
          throw e;
        }
      });
    txQueue = next;
    return next;
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const isRetriableChainError = (err) => {
    const msg = String(err?.message || err || '');
    return /already locked|not available for consumption|rejected as invalid/i.test(msg);
  };

  const withRetry = async (actionName, fn, { attempts = 5, baseDelayMs = 400 } = {}) => {
    let lastErr;
    for (let i = 0; i < attempts; i++) {
      try {
        if (i > 0) tryAppendLog(appendChainLog, { action: actionName, status: 'retry', attempt: i });
        const res = await fn();
        if (i > 0) tryAppendLog(appendChainLog, { action: actionName, status: 'retry-success', attempt: i });
        await sleep(150);
        return res;
      } catch (e) {
        lastErr = e;
        if (!isRetriableChainError(e) || i === attempts - 1) throw e;
        const delay = baseDelayMs * Math.pow(2, i) + Math.floor(Math.random() * 150);
        await sleep(delay);
      }
    }
    throw lastErr;
  };

  const queueAndRetry = (name, fn, opts) => runSerialized(name, () => withRetry(name, fn, opts));

  return { runSerialized, withRetry, queueAndRetry };
}

// ----- Pending capture mint queue -----
const PENDING_MINT_KEY = 'blockmon_pending_capture_mints';

export function loadPendingMints() {
  try {
    const raw = localStorage.getItem(PENDING_MINT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (_) {
    return [];
  }
}

export function clearPendingMints() {
  try { localStorage.setItem(PENDING_MINT_KEY, JSON.stringify([])); } catch (_) {}
}

export function savePendingMints(arr) {
  try {
    localStorage.setItem(PENDING_MINT_KEY, JSON.stringify(arr || []));
  } catch (_) {}
}

function entriesEqual(a, b) {
  return a && b && a.monId === b.monId && a.name === b.name && a.hp === b.hp && a.str === b.str && a.dex === b.dex && a.con === b.con && a.int === b.int && a.wis === b.wis && a.cha === b.cha && a.skillName === b.skillName && a.skillDescription === b.skillDescription;
}

export function removeEntriesFromQueue(toRemove) {
  if (!toRemove?.length) return;
  const q = loadPendingMints();
  const remain = [];
  for (const qItem of q) {
    const idx = toRemove.findIndex((e) => entriesEqual(e, qItem));
    if (idx === -1) remain.push(qItem);
    else toRemove.splice(idx, 1);
  }
  savePendingMints(remain);
}

// ----- Pending burn queue -----
const PENDING_BURN_KEY = 'blockmon_pending_burn_ids';

export function loadPendingBurns() {
  try {
    const raw = localStorage.getItem(PENDING_BURN_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (_) { return []; }
}

export function savePendingBurns(arr) {
  try { localStorage.setItem(PENDING_BURN_KEY, JSON.stringify(arr || [])); } catch (_) {}
}

export function clearPendingBurns() {
  try { localStorage.setItem(PENDING_BURN_KEY, JSON.stringify([])); } catch (_) {}
}

export function enqueuePendingBurns(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return;
  const current = loadPendingBurns();
  const set = new Set(current);
  for (const id of ids) if (id) set.add(id);
  savePendingBurns(Array.from(set));
}

export function removeBurnIdsFromQueue(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return;
  const current = loadPendingBurns();
  const removeSet = new Set(ids);
  const remain = current.filter((id) => !removeSet.has(id));
  savePendingBurns(remain);
}


