
import {
    state,
    PERSISTENT_CACHE_DB_NAME, PERSISTENT_CACHE_DB_VERSION, PERSISTENT_CACHE_STORE_NAME,
    PERSISTENT_CACHE_FLUSH_DELAY, PERSISTENT_CACHE_BINDINGS, persistentCacheStore
} from "../settings";
import { logger } from "./general";
/*! ESLINT IMPORT END !*/

/*
──────────────────────────────────────────────────────────────
       PERSISTENT CACHE MANAGER (IndexedDB)
──────────────────────────────────────────────────────────────

    Single access point for the persistent *caches* (PERSISTENT_CACHE_BINDINGS).
    User settings are NOT managed here and stay in GM_setValue.

    - getPersistentCache() is synchronous and served from an in-memory mirror.
    - setPersistentCache() updates the mirror immediately; every change made in
      the same PERSISTENT_CACHE_FLUSH_DELAY window is written in one transaction.
    - initPersistentCache() loads the stored caches and puts them into their
      `state` fields. Entries added before it settles are merged with the stored
      ones (session entries win), so nothing captured early is lost.
    - On first run, the old GM_setValue copy is moved into IndexedDB once, then
      replaced by {} so the userscript manager stops preloading it on every page.
    - If IndexedDB cannot be used, the caches fall back to GM_setValue as before.
*/

/**
 * idbRequest
 * @description Wrap an IDBRequest into a Promise.
 *
 * @param  {IDBRequest} request
 * @return {Promise<any>}
 */
function idbRequest(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * idbTransactionDone
 * @description Resolve once a transaction has committed, reject if it fails or aborts.
 *
 * @param  {IDBTransaction} transaction
 * @return {Promise<void>}
 */
function idbTransactionDone(transaction) {
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error ?? new Error('Transaction aborted'));
    });
}

/**
 * openDB
 * @description Open (or create on first run) the IG_HELPER IndexedDB database.
 *              The connection closes itself when another tab upgrades the schema;
 *              getPersistentCacheDB() reopens it on the next access.
 *
 * @return {Promise<IDBDatabase>}
 */
export function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(PERSISTENT_CACHE_DB_NAME, PERSISTENT_CACHE_DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(PERSISTENT_CACHE_STORE_NAME)) {
                db.createObjectStore(PERSISTENT_CACHE_STORE_NAME, { keyPath: 'id' });
            }
        };

        request.onsuccess = () => {
            const db = request.result;
            const forget = () => {
                if (persistentCacheStore.db === db) persistentCacheStore.db = null;
            };
            db.onversionchange = () => {
                db.close();
                forget();
            };
            db.onclose = forget;
            resolve(db);
        };
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error('IndexedDB open blocked by another tab'));
    });
}

/**
 * getPersistentCacheDB
 * @description Return the shared connection, opening it if needed.
 *
 * @return {Promise<IDBDatabase>}
 */
async function getPersistentCacheDB() {
    if (!persistentCacheStore.db) {
        persistentCacheStore.db = await openDB();
    }
    return persistentCacheStore.db;
}

/**
 * mergeCacheEntries
 * @description Merge stored cache entries with entries added during this session.
 *              Session entries win on conflict.
 *
 * @param  {any} stored
 * @param  {any} session
 * @return {any}
 */
function mergeCacheEntries(stored, session) {
    const isPlainObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);

    if (!isPlainObject(stored)) return session;
    if (!isPlainObject(session)) return stored;
    return { ...stored, ...session };
}

/**
 * initPersistentCache
 * @description Load every persistent cache from IndexedDB (moving the old
 *              GM_setValue copy over on first run) and put each one into its
 *              `state` field. Safe to call many times: every call returns the
 *              same promise. Never rejects; on failure it falls back to GM storage.
 *
 * @return {Promise<'indexeddb'|'gm'>} The backend in use.
 */
export function initPersistentCache() {
    if (persistentCacheStore.readyPromise) return persistentCacheStore.readyPromise;

    persistentCacheStore.readyPromise = (async () => {
        const keys = Object.keys(PERSISTENT_CACHE_BINDINGS);
        let stored = {};

        try {
            if (typeof indexedDB === 'undefined') {
                throw new Error('IndexedDB is not available');
            }

            const db = await getPersistentCacheDB();
            const readStore = db.transaction(PERSISTENT_CACHE_STORE_NAME, 'readonly')
                .objectStore(PERSISTENT_CACHE_STORE_NAME);
            const records = await Promise.all(keys.map((key) => idbRequest(readStore.get(key))));

            const migrated = [];
            keys.forEach((key, i) => {
                if (records[i] !== undefined) {
                    stored[key] = records[i].value;
                    return;
                }

                const legacyValue = GM_getValue(key);
                if (legacyValue !== undefined) {
                    stored[key] = legacyValue;
                    migrated.push(key);
                }
            });

            if (migrated.length > 0) {
                const transaction = db.transaction(PERSISTENT_CACHE_STORE_NAME, 'readwrite');
                const writeStore = transaction.objectStore(PERSISTENT_CACHE_STORE_NAME);
                const now = Date.now();

                for (const key of migrated) {
                    writeStore.put({ id: key, value: stored[key], updatedAt: now });
                }
                await idbTransactionDone(transaction);

                // Only release the GM copy once IndexedDB has committed it.
                for (const key of migrated) {
                    GM_setValue(key, {});
                }
                logger('initPersistentCache()', `moved ${migrated.join(', ')} from GM storage to IndexedDB`);
            }

            persistentCacheStore.backend = 'indexeddb';
        }
        catch (err) {
            logger('initPersistentCache()', 'IndexedDB unavailable, falling back to GM storage', err);
            persistentCacheStore.backend = 'gm';
            stored = {};
            for (const key of keys) {
                stored[key] = GM_getValue(key);
            }
        }

        // Put each cache into its state field. This runs synchronously, so no
        // write can slip in between reading the session entries and replacing them.
        for (const key of keys) {
            const field = PERSISTENT_CACHE_BINDINGS[key];
            const session = state[field];
            const hasSessionEntries = !!session && Object.keys(session).length > 0;
            const merged = (stored[key] === undefined) ? session : mergeCacheEntries(stored[key], session);

            state[field] = merged;
            persistentCacheStore.values.set(key, merged);
            if (hasSessionEntries) persistentCacheStore.pending.add(key);
        }

        // Best effort: persist pending writes before the tab goes away.
        window.addEventListener('pagehide', () => flushPersistentCache());
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') flushPersistentCache();
        });

        if (persistentCacheStore.pending.size > 0) schedulePersistentCacheFlush();

        return persistentCacheStore.backend;
    })();

    return persistentCacheStore.readyPromise;
}

/**
 * setPersistentCache
 * @description Update the in-memory value right away and queue a batched write.
 *
 * @param  {string} key
 * @param  {any}    value - Must be structured-cloneable.
 * @return {void}
 */
export function setPersistentCache(key, value) {
    persistentCacheStore.values.set(key, value);
    persistentCacheStore.pending.add(key);
    schedulePersistentCacheFlush();
}

/**
 * schedulePersistentCacheFlush
 * @description Debounce writes so a burst of changes becomes one transaction.
 *
 * @return {void}
 */
function schedulePersistentCacheFlush() {
    if (persistentCacheStore.flushTimer) return;

    persistentCacheStore.flushTimer = setTimeout(() => {
        persistentCacheStore.flushTimer = null;
        flushPersistentCache();
    }, PERSISTENT_CACHE_FLUSH_DELAY);
}

/**
 * flushPersistentCache
 * @description Write every pending change now. Flushes run one after another,
 *              never in parallel. Starts initPersistentCache() if needed.
 *
 * @return {Promise<boolean>} False when the write failed (the keys stay queued).
 */
export function flushPersistentCache() {
    if (persistentCacheStore.flushTimer) {
        clearTimeout(persistentCacheStore.flushTimer);
        persistentCacheStore.flushTimer = null;
    }

    persistentCacheStore.flushChain = persistentCacheStore.flushChain.then(writePendingPersistentCache);
    return persistentCacheStore.flushChain;
}

/**
 * writePendingPersistentCache
 * @description Write the pending keys to the active backend. The value written is
 *              the latest one in memory, so changes made after set() are included.
 *              On failure, the keys are queued again for the next flush.
 *
 * @return {Promise<boolean>}
 */
async function writePendingPersistentCache() {
    await initPersistentCache();
    if (persistentCacheStore.pending.size === 0) return true;

    const batch = [...persistentCacheStore.pending];
    persistentCacheStore.pending.clear();

    try {
        if (persistentCacheStore.backend === 'indexeddb') {
            const db = await getPersistentCacheDB();
            const transaction = db.transaction(PERSISTENT_CACHE_STORE_NAME, 'readwrite');
            const store = transaction.objectStore(PERSISTENT_CACHE_STORE_NAME);
            const now = Date.now();

            for (const key of batch) {
                store.put({ id: key, value: persistentCacheStore.values.get(key), updatedAt: now });
            }
            await idbTransactionDone(transaction);
        }
        else {
            for (const key of batch) {
                GM_setValue(key, persistentCacheStore.values.get(key));
            }
        }

        return true;
    }
    catch (err) {
        // The connection may be dead; reopen it on the next attempt.
        persistentCacheStore.db = null;
        for (const key of batch) {
            persistentCacheStore.pending.add(key);
        }

        logger('flushPersistentCache()', `write failed, ${batch.length} key(s) queued again`, err);
        return false;
    }
}