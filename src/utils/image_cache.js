/*  
──────────────────────────────────────────────────────────────
    📦  IMAGE CACHE (12h) + NETWORK SNIFFER
────────────────────────────────────────────────────────────── 
*/

import { IMAGE_CACHE_KEY, IMAGE_CACHE_MAX_AGE, IMAGE_MAX_CACHE_ITEMS, state, USER_SETTING } from "../settings";
/*! ESLINT IMPORT END !*/

let mediaCacheDirty = false;
let mediaCacheSaveTimer = null;

/**
 * purgeCache
 * @description Purge image cache entries older than 12 hours.
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
 * getVisibleMediaIdFromArticle
 * @description Extract mediaId of the currently visible resource inside a post.
 *              Reads srcset/src of the visible <img> and decodes ig_cache_key.
 *
 * @param  {JQuery<HTMLElement>}  $article
 * @return {?string}
 */
function getVisibleMediaIdFromArticle($article) {
    if (!$article || $article.length === 0) return null;

    // Try the currently visible <li> item first (carousel case)
    let $visibleImg = $article.find(resourceCountSelector)
        .filter(function () {
            const rect = this.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
        })
        .find('img[srcset], img[src]')
        .filter(function () {
            const $img = $(this);
            return ($img.attr('alt') || '').length > 0;
        })
        .first();

    // Fallback: single-image post
    if ($visibleImg.length === 0) {
        $visibleImg = $article.find('img[srcset], img[src]').filter(function () {
            const $img = $(this);
            return ($img.attr('alt') || '').length > 0 && $img.width() > 100;
        }).first();
    }

    if ($visibleImg.length === 0) return null;

    const srcset = $visibleImg.attr('srcset');
    const url = (srcset ? srcset.split(',').pop().trim().split(' ')[0] : $visibleImg.attr('src'));
    if (!url) return null;

    return mediaIdFromURL(url);
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

    const keys = Object.keys(state.GL_imageCache);
    if (keys.length >= IMAGE_MAX_CACHE_ITEMS) {
        keys.sort((a, b) => state.GL_imageCache[a].ts - state.GL_imageCache[b].ts);
        delete state.GL_imageCache[keys[0]];
    }

    mediaCacheDirty = true;
    state.GL_imageCache[mediaId] = { url, ts: Date.now() };

    if (!mediaCacheSaveTimer) {
        mediaCacheSaveTimer = setTimeout(() => {
            if (mediaCacheDirty) {
                GM_setValue(IMAGE_CACHE_KEY, state.GL_imageCache);
                mediaCacheDirty = false;
            }
            mediaCacheSaveTimer = null;
        }, 500); // write in script storage per 500 ms
    }
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
        if (!USER_SETTING.CAPTURE_IMAGE_VIA_MEDIA_CACHE) return;

        list.getEntries().forEach(entry => {
            if (entry.initiatorType === 'img') {
                const u = entry.name;

                if (
                    !(u.includes('_e35') || u.includes('_e15') || u.includes('.webp?')) ||
                    u.includes('_e35_s') ||
                    u.match(/_[sp](\d+)x\1(?!\d)/)
                ) {
                    return;
                }

                const id = mediaIdFromURL(u);
                if (id && !state.GL_imageCache[id]) putInCache(id, u);
            }
        });
    });
    perfObs.observe({ entryTypes: ['resource'] });
}