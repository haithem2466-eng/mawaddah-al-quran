// ==========================================================================
// db.js — thin promise wrapper around IndexedDB.
// Stores:
//   settings   { key: 'reader' | 'theme', value: {...} }
//   bookmarks  { id: 'surah:ayah', surah, ayah, surahName, createdAt }
//   notes      { id: 'surah:ayah', surah, ayah, text, updatedAt }
//   lastRead   { id: 'position', surah, ayah, scrollY, updatedAt }
// ==========================================================================

const DB_NAME = "quran-offline-db";
const DB_VERSION = 1;
const STORES = ["settings", "bookmarks", "notes", "lastRead"];

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB is not available in this browser."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: "id" });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx(storeName, mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const result = fn(store);
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const db = {
  async put(storeName, value) {
    const db_ = await openDb();
    const t = db_.transaction(storeName, "readwrite");
    t.objectStore(storeName).put(value);
    return new Promise((res, rej) => {
      t.oncomplete = () => res(value);
      t.onerror = () => rej(t.error);
    });
  },

  async get(storeName, id) {
    const db_ = await openDb();
    const t = db_.transaction(storeName, "readonly");
    const req = t.objectStore(storeName).get(id);
    return reqToPromise(req);
  },

  async getAll(storeName) {
    const db_ = await openDb();
    const t = db_.transaction(storeName, "readonly");
    const req = t.objectStore(storeName).getAll();
    return reqToPromise(req);
  },

  async delete(storeName, id) {
    const db_ = await openDb();
    const t = db_.transaction(storeName, "readwrite");
    t.objectStore(storeName).delete(id);
    return new Promise((res, rej) => {
      t.oncomplete = () => res(true);
      t.onerror = () => rej(t.error);
    });
  },

  async clear(storeName) {
    const db_ = await openDb();
    const t = db_.transaction(storeName, "readwrite");
    t.objectStore(storeName).clear();
    return new Promise((res, rej) => {
      t.oncomplete = () => res(true);
      t.onerror = () => rej(t.error);
    });
  }
};

// ---- Convenience helpers used throughout the app ----

export async function getSetting(key, fallback) {
  try {
    const row = await db.get("settings", key);
    return row ? row.value : fallback;
  } catch {
    return fallback;
  }
}

export async function setSetting(key, value) {
  return db.put("settings", { id: key, value });
}

export async function toggleBookmark(surah, ayah, surahName) {
  const id = `${surah}:${ayah}`;
  const existing = await db.get("bookmarks", id);
  if (existing) {
    await db.delete("bookmarks", id);
    return false;
  }
  await db.put("bookmarks", { id, surah, ayah, surahName, createdAt: Date.now() });
  return true;
}

export async function isBookmarked(surah, ayah) {
  const row = await db.get("bookmarks", `${surah}:${ayah}`);
  return !!row;
}

export async function saveNote(surah, ayah, text) {
  const id = `${surah}:${ayah}`;
  if (!text || !text.trim()) {
    await db.delete("notes", id);
    return null;
  }
  return db.put("notes", { id, surah, ayah, text: text.trim(), updatedAt: Date.now() });
}

export async function getNote(surah, ayah) {
  return db.get("notes", `${surah}:${ayah}`);
}

export async function saveLastRead(surah, ayah) {
  return db.put("lastRead", { id: "position", surah, ayah, updatedAt: Date.now() });
}

export async function getLastRead() {
  return db.get("lastRead", "position");
}