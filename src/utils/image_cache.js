/*  
──────────────────────────────────────────────────────────────
    📦  IMAGE CACHE (12h) + NETWORK SNIFFER
────────────────────────────────────────────────────────────── 
*/

import {
    IMAGE_CACHE_KEY, IMAGE_CACHE_MAX_AGE, IMAGE_MAX_CACHE_ITEMS, state, USER_SETTING, mediaCache
} from "../settings";
import { setPersistentCache } from "./persistent_cache";
/*! ESLINT IMPORT END !*/

/**
 * purgeCache
 * @description Purge image cache entries older than 12 hours.
 *
 * @return {void}
 */
export function purgeCache() {
    const now = Date.now();
    let changed = false;

    for (const id in state.GL_imageCache) {
        if ((now - state.GL_imageCache[id].ts) > IMAGE_CACHE_MAX_AGE) {
            delete state.GL_imageCache[id];
            changed = true;
        }
    }

    for (const [id, entry] of mediaCache) {
        if ((now - entry.ts) > IMAGE_CACHE_MAX_AGE) {
            mediaCache.delete(id);
        }
    }

    if (changed) {
        setPersistentCache(IMAGE_CACHE_KEY, state.GL_imageCache);
    }
}


/**
 * mediaIdFromURL
 * @description Decode mediaId from the ig_cache_key parameter that Instagram
 *              embeds in image resource URLs.
 *
 *              The base64-encoded key decodes to either:
 *                a) a single media pk (stories/highlights/profile items) — e.g.
 *                   "3670776772828545770" (19 digits);
 *                b) TWO concatenated ids for feed posts / reels — the media pk
 *                   followed by an internal image upload id, e.g.
 *                   "3953597008038636195" + "18015836522857835".
 *
 *              For the two-id form, only the first (media pk) part is returned
 *              so it matches the id the userscript queries the cache with
 *              (mda.pk / mediaItem.id / resource.pk).
 *
 *              IG media pks are globally unique across all media types (post,
 *              reel, story, highlight item) so the sliced 19-digit prefix
 *              cannot collide with a story id.
 *
 * @param  {string}  url
 * @return {?string}
 */
export function mediaIdFromURL(url) {
    if (!url || typeof url !== 'string') return null;
    try {
        const u = new URL(url);
        const key = u.searchParams.get('ig_cache_key');
        if (key) {
            const decoded = atob(key.split('.')[0]);   // Part before “.3-ccb7…”
            if (/^\d+$/.test(decoded)) {
                if (decoded.length > 19) return decoded.slice(0, 19);
                return decoded;
            }
            return decoded;
        }

        // Fallback: extract numeric media pk from filename in pathname
        // e.g. .../482025345_18037192348572835_3953597008038636195_n.jpg
        const filename = u.pathname.split('/').filter(Boolean).at(-1) || '';
        const nameNoExt = filename.split('.')[0] || '';
        const parts = nameNoExt.split('_');

        for (let i = parts.length - 1; i >= 0; i--) {
            if (/^3\d{18}$/.test(parts[i])) {
                return parts[i];
            }
        }
        for (let i = parts.length - 1; i >= 0; i--) {
            if (/^\d{17,20}$/.test(parts[i])) {
                return parts[i];
            }
        }
        return null;
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
    if (!mediaId || !url) return;

    const entry = { url, ts: Date.now() };
    const isNewPersistentEntry = !state.GL_imageCache[mediaId];

    // Keep the current session's hot cache independent from persistent storage.
    mediaCache.set(mediaId, entry);

    if (mediaCache.size > IMAGE_MAX_CACHE_ITEMS) {
        const oldestKey = mediaCache.keys().next().value;
        mediaCache.delete(oldestKey);
    }

    const keys = Object.keys(state.GL_imageCache);
    if (isNewPersistentEntry && keys.length >= IMAGE_MAX_CACHE_ITEMS) {
        // Linear scan for the oldest entry (no need to sort the whole list)
        let oldestId = keys[0];
        let oldestTs = state.GL_imageCache[oldestId]?.ts ?? 0;
        for (let i = 1; i < keys.length; i++) {
            const ts = state.GL_imageCache[keys[i]]?.ts ?? 0;
            if (ts < oldestTs) {
                oldestTs = ts;
                oldestId = keys[i];
            }
        }
        delete state.GL_imageCache[oldestId];
        mediaCache.delete(oldestId);
    }

    state.GL_imageCache[mediaId] = entry;
    setPersistentCache(IMAGE_CACHE_KEY, state.GL_imageCache);
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

    let entry = mediaCache.get(mediaId);

    if (!entry) {
        entry = state.GL_imageCache[mediaId];
    }

    if (!entry) return null;

    if ((Date.now() - entry.ts) > IMAGE_CACHE_MAX_AGE) {
        mediaCache.delete(mediaId);
        if (state.GL_imageCache[mediaId]) {
            delete state.GL_imageCache[mediaId];
            setPersistentCache(IMAGE_CACHE_KEY, state.GL_imageCache);
        }
        return null;
    }

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
                    // Ignore images that are ads
                    u.includes('_nc_ad') ||
                    u.match(/_[sp](\d+)x\1(?!\d)/)
                ) {
                    return;
                }

                const id = mediaIdFromURL(u);
                if (id && !mediaCache.has(id)) putInCache(id, u);
            }
        });
    });
    perfObs.observe({ entryTypes: ['resource'] });
}
