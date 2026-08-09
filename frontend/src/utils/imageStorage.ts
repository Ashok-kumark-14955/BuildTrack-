/**
 * imageStorage.ts
 *
 * Lightweight IndexedDB helpers so that drawing images (which can be many MB)
 * are stored locally in the browser instead of being Base64-encoded and
 * persisted on the backend DataStore (which has tight size limits).
 *
 * Usage:
 *   const key = 'drawing-<uuid>';
 *   await saveImage(key, dataUrl);          // persist
 *   const src = await loadImage(key);       // retrieve → data URL | null
 *   await resolveFileUrl('idb://key');      // auto-detects idb:// prefix
 *   await resolveFileUrl('data:...');       // passes through unchanged
 *   await resolveFileUrl('/uploads/...');   // passes through unchanged
 */

// Use the same DB connection as browserDb.ts (single source of truth for the
// schema) so this file can't drift to a stale DB_VERSION and trigger a
// VersionError once browserDb.ts upgrades the shared database.
import { openBuildTrackDb } from './browserDb';

const STORE = 'images';
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

/** Convert a File/Blob to a base64 data URL. */
export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Persist a data URL under the given key in IndexedDB. */
export async function saveImage(key: string, dataUrl: string): Promise<void> {
  const db = await openBuildTrackDb();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req   = store.put(dataUrl, key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

/** Retrieve a previously-saved data URL. Returns null if not found. */
export async function loadImage(key: string): Promise<string | null> {
  const db = await openBuildTrackDb();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const req   = store.get(key);
    req.onsuccess = () => resolve((req.result as string) ?? null);
    req.onerror   = () => reject(req.error);
  });
}

/** Delete a stored image (e.g. when the drawing is deleted). */
export async function deleteImage(key: string): Promise<void> {
  const db = await openBuildTrackDb();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req   = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

/**
 * Resolve any fileUrl to something an <img> or Konva.Image can consume:
 *   - "idb://<key>"   → looks up the data URL from IndexedDB
 *   - "data:..."      → returned as-is
 *   - anything else   → returned as-is (relative/absolute HTTP URL)
 */
export async function resolveFileUrl(url: string): Promise<string | null> {
  if (!url) return null;

  if (url.startsWith('idb://')) {
    const key = url.slice('idb://'.length);
    return loadImage(key); // may be null if IDB was cleared
  }

  if (url.startsWith('/')) {
    return `${API_BASE}${url}`;
  }

  // data URL or HTTP(S) URL — pass through
  return url;
}
