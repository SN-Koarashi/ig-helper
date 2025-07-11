/*  
──────────────────────────────────────────────────────────────
    📦  IMAGE CACHE (24h) + NETWORK SNIFFER
────────────────────────────────────────────────────────────── 
*/

import { IMAGE_CACHE_KEY, IMAGE_CACHE_MAX_AGE, state } from "../settings";
/*! ESLINT IMPORT END !*/

/**
 * purgeCache
 * @description purge image cache entries older than 24 hours.
 *
 * @return {void}
 */
export function purgeCache() {
    const now = Date.now();
    for (const id in state.GL_imageCache) {
        if ((now - state.GL_imageCache[id].ts) > IMAGE_CACHE_MAX_AGE) delete state.GL_imageCache[id];
    }
    GM_setValue(IMAGE_CACHE_KEY, state.GL_imageCache);
}


/**
 * mediaIdFromURL
 * @description Decode mediaId from ig_cache_key parameter that Instagram includes in the URL.
 *
 * @param  {string}  url
 * @return {?string}
 */
export function mediaIdFromURL(url) {
    try {
        const u = new URL(url);
        const key = u.searchParams.get('ig_cache_key');
        if (!key) return null;
        const b64 = key.split('.')[0];          // Part before “.3-ccb7…”
        return atob(b64);                       // e.g., “3670776772828545770”
    } catch { return null; }
}

/**
 * putInCache
 * @description Save URL to image cache.
 *
 * @param  {string}  mediaId
 * @param  {string}  url
 * @return {void}
 */
export function putInCache(mediaId, url) {
    if (!mediaId) return;
    state.GL_imageCache[mediaId] = { url, ts: Date.now() };
    GM_setValue(IMAGE_CACHE_KEY, state.GL_imageCache);
}

/**
 * getImageFromCache
 * @description Read image URL from cache; returns null if not found or expired.
 *
 * @param  {string}  mediaId
 * @return {?string}
 */
export function getImageFromCache(mediaId) {
    if (!mediaId) return null;
    const entry = state.GL_imageCache[mediaId];
    if (!entry) return null;
    if ((Date.now() - entry.ts) > IMAGE_CACHE_MAX_AGE) { delete state.GL_imageCache[mediaId]; return null; }
    return entry.url;
}

/**
 * registerPerformanceObserver
 * @description Register performance observer to document, captures any loaded image resource.
 *
 * @return {void}
 */
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