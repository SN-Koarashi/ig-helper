/*  
──────────────────────────────────────────────────────────────
    📦  IMAGE CACHE (24h) + NETWORK SNIFFER
────────────────────────────────────────────────────────────── 
*/

import { IMAGE_CACHE_KEY, IMAGE_CACHE_MAX_AGE, state } from "../settings";
/*! ESLINT IMPORT END !*/

/* purge entries older than 24 h */
export function purgeCache() {
    const now = Date.now();
    for (const id in state.GL_imageCache) {
        if ((now - state.GL_imageCache[id].ts) > IMAGE_CACHE_MAX_AGE) delete state.GL_imageCache[id];
    }
    GM_setValue(IMAGE_CACHE_KEY, state.GL_imageCache);
}

/* Decode mediaId from ig_cache_key parameter that Instagram includes in the URL */
export function mediaIdFromURL(url) {
    try {
        const u = new URL(url);
        const key = u.searchParams.get('ig_cache_key');
        if (!key) return null;
        const b64 = key.split('.')[0];          // Part before “.3-ccb7…”
        return atob(b64);                       // e.g., “3670776772828545770”
    } catch { return null; }
}

/* Save to cache */
export function putInCache(mediaId, url) {
    if (!mediaId) return;
    state.GL_imageCache[mediaId] = { url, ts: Date.now() };
    GM_setValue(IMAGE_CACHE_KEY, state.GL_imageCache);
}

/* Read from cache; returns null if not found or expired */
export function getImageFromCache(mediaId) {
    if (!mediaId) return null;
    const entry = state.GL_imageCache[mediaId];
    if (!entry) return null;
    if ((Date.now() - entry.ts) > IMAGE_CACHE_MAX_AGE) { delete state.GL_imageCache[mediaId]; return null; }
    return entry.url;
}

/* ── NETWORK SNIFFER – captures any loaded <img> resource ── */
export function registerPerformanceObserver() {
    const perfObs = new PerformanceObserver(list => {
        list.getEntries().forEach(entry => {
            if (entry.initiatorType === 'img') {
                const u = entry.name;
                if (!(u.includes('_e35') || u.includes('.webp?efg=')) || u.includes('_e35_p') || u.includes('_e35_s')) return;
                const id = mediaIdFromURL(u);
                if (id && !state.GL_imageCache[id]) putInCache(id, u);
            }
        });
    });
    perfObs.observe({ entryTypes: ['resource'] });
}