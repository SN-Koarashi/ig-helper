
import {
    state, userIdCache, USER_ID_MAX_CACHE_ITEMS, USER_ID_CACHE_KEY
} from "../settings";
import { logger } from "./general";
import { resolveUserIdLive } from "./api";
import { initPersistentCache, setPersistentCache } from "./persistent_cache";
/*! ESLINT IMPORT END !*/

/**
 * findUsernameByUserId
 * @description Find which cached username currently owns a given user ID.
 *              A user ID may belong to at most one cached username.
 *
 * @param  {String|Number} userId
 * @param  {String=} excludeUsername - Username that is allowed to own this ID.
 * @return {?String}
 */
export function findUsernameByUserId(userId, excludeUsername = '') {
    if (!userId) return null;

    const targetId = String(userId).trim();
    const excluded = String(excludeUsername || '').trim().toLowerCase();

    for (const [cachedUsername, cachedUserId] of Object.entries(state.GL_userIdCache || {})) {
        if (String(cachedUserId) === targetId && cachedUsername.toLowerCase() !== excluded) {
            return cachedUsername;
        }
    }

    return null;
}

/**
 * removeUserIdCacheEntry
 * @description Remove a username -> user ID mapping from both caches.
 *
 * @param  {String} username
 * @return {Boolean}
 */
export function removeUserIdCacheEntry(username) {
    if (!username) return false;

    const normalizedUsername = String(username).trim().toLowerCase();
    if (!normalizedUsername) return false;

    const existed = Object.prototype.hasOwnProperty.call(state.GL_userIdCache || {}, normalizedUsername);

    if (existed) {
        delete state.GL_userIdCache[normalizedUsername];
        setPersistentCache(USER_ID_CACHE_KEY, state.GL_userIdCache);
    }

    userIdCache.delete(normalizedUsername);

    if (existed) {
        logger('removeUserIdCacheEntry()', `removed cached userId mapping for @${normalizedUsername}`);
    }

    return existed;
}

/**
 * putUserIdInCache
 * @description Save a resolved (username -> user id) mapping in both the in-memory
 *              userIdCache and the persistent USER_IDS_STORED bucket. Self-heals: if
 *              this user ID is currently assigned to a different username (Instagram
 *              reassigned the ID, or the username changed), that stale mapping is
 *              dropped and replaced, since every caller here supplies live/confirmed
 *              data (getUserId()'s live fetch, getStories()'s
 *              owner-mismatch refresh, reconcileOwnerFromApiResponse()). The persistent
 *              bucket is capped at USER_ID_MAX_CACHE_ITEMS entries; once full, a random
 *              existing entry is evicted to make room for the new one.
 *
 * @param  {String} username
 * @param  {String|Number} userId
 * @return {Boolean} True when the mapping was cached, false on invalid input.
 */
export function putUserIdInCache(username, userId) {
    if (!username || !userId) return false;

    const normalizedUsername = String(username).trim().toLowerCase();
    const normalizedUserId = String(userId).trim();
    if (!normalizedUsername || !normalizedUserId) return false;

    const existingUsername = findUsernameByUserId(normalizedUserId, normalizedUsername);
    if (existingUsername) {
        logger('putUserIdInCache()', `userId ${normalizedUserId} was assigned to @${existingUsername}; reassigning it to @${normalizedUsername}`);
        removeUserIdCacheEntry(existingUsername);
    }

    const isNewPersistentEntry = !state.GL_userIdCache[normalizedUsername];
    const keys = Object.keys(state.GL_userIdCache);
    if (isNewPersistentEntry && keys.length >= USER_ID_MAX_CACHE_ITEMS) {
        const randomUsername = keys[Math.floor(Math.random() * keys.length)];
        delete state.GL_userIdCache[randomUsername];
        userIdCache.delete(randomUsername);
    }

    state.GL_userIdCache[normalizedUsername] = normalizedUserId;
    userIdCache.set(normalizedUsername, { user: { id: normalizedUserId, pk: normalizedUserId } });
    setPersistentCache(USER_ID_CACHE_KEY, state.GL_userIdCache);

    return true;
}

/**
 * getPersistedUserId
 * @description Read-only lookup of the userId persisted for `username` in the
 *              persistent cache (USER_IDS_STORED), without touching the
 *              in-memory userIdCache Map.
 *
 * @param  {String} username
 * @return {?String}
 */
function getPersistedUserId(username) {
    const normalizedUsername = String(username || '').trim().toLowerCase();
    if (!normalizedUsername) return null;

    const persistedId = state.GL_userIdCache?.[normalizedUsername];
    return persistedId ? String(persistedId) : null;
}

/**
 * isOwnerVerifiedThisSession
 * @description True when `username`'s userId is already trusted for the rest of
 *              the tab session: either resolved live this session (getUserId()
 *              sets no flag in that case), or already confirmed once against a
 *              real content API response after being promoted from the persistent
 *              cache (see `_needsOwnerVerification` below). False when the
 *              in-memory Map has no entry yet, or the entry still carries that flag.
 *
 * @param  {String} username
 * @return {Boolean}
 */
export function isOwnerVerifiedThisSession(username) {
    const normalizedUsername = String(username || '').trim().toLowerCase();
    if (!normalizedUsername) return false;

    const cached = userIdCache.get(normalizedUsername);
    return !!cached && !cached._needsOwnerVerification;
}

/**
 * markOwnerVerified
 * @description Clears the `_needsOwnerVerification` flag on a userIdCache Map
 *              entry, so later calls in the same tab session trust it without
 *              re-checking against a content API response. Stays cleared until
 *              the tab is refreshed, since userIdCache is a plain in-memory Map
 *              recreated empty on load.
 *
 * @param  {String} username
 * @return {void}
 */
export function markOwnerVerified(username) {
    const normalizedUsername = String(username || '').trim().toLowerCase();
    const cached = userIdCache.get(normalizedUsername);
    if (cached) delete cached._needsOwnerVerification;
}

/**
 * reconcileOwnerFromApiResponse
 * @description For endpoints that resolve content by shortcode/highlightId rather
 *              than by a cached userId (getPolarisPostRootQuery, getBlobMediaWithQueryID,
 *              getBlobMediaWithQueryHash, getHighlightStories), there is no "expected
 *              username" known before the request is made — the owner is only known
 *              once the response comes back. This uses that authoritative response to
 *              validate (and self-heal) the username -> userId cache, without ever
 *              blocking or re-fetching the content itself: the shortcode/highlightId
 *              already fully determines the correct resource regardless of any userId
 *              bookkeeping issue, so the caller should always proceed to serve it.
 *
 *              Skipped entirely when `username` is already trusted in the in-memory
 *              Map this session. Otherwise:
 *                - no persisted mapping yet for `username`, and its id is not claimed
 *                  by a different username either -> the response itself becomes the
 *                  new trusted baseline (same trust level as a fresh live resolution);
 *                - persisted mapping agrees with the response -> promoted to trusted
 *                  in the Map, persistent bucket left untouched;
 *                - persisted mapping disagrees (stale/reassigned id, or the id is
 *                  currently claimed by a different username) -> a fresh id is resolved
 *                  live for `username` (see resolveUserIdLive), the old conflicting
 *                  entries are dropped, and the corrected mapping is saved to both caches.
 *
 * @param  {String}        username - Owner username as reported by the API response.
 * @param  {String|Number}  userId  - Owner id as reported by the API response.
 * @return {Promise<void>}
 */
export async function reconcileOwnerFromApiResponse(username, userId) {
    if (!username || !userId) return;

    const normalizedUsername = String(username).trim().toLowerCase();
    if (!normalizedUsername) return;

    // The decision below depends on the persisted mapping, so wait until it is loaded.
    await initPersistentCache();

    if (isOwnerVerifiedThisSession(normalizedUsername)) return;

    const reportedId = String(userId).trim();
    const persistedId = getPersistedUserId(normalizedUsername);
    const collidingUsername = findUsernameByUserId(reportedId, normalizedUsername);

    const isConsistent = (!persistedId || persistedId === reportedId) && !collidingUsername;

    if (isConsistent) {
        if (!persistedId) {
            putUserIdInCache(normalizedUsername, reportedId);
        }
        else {
            markOwnerVerified(normalizedUsername);
        }
        return;
    }

    logger(
        'reconcileOwnerFromApiResponse()',
        `stale mapping for @${normalizedUsername} (cached: ${persistedId ?? 'none'}` +
        `${collidingUsername ? `, id ${reportedId} claimed by @${collidingUsername}` : ''}` +
        `, api reports: ${reportedId}) — refreshing`
    );

    try {
        const fresh = await resolveUserIdLive(normalizedUsername);
        const freshId = fresh?.user?.pk ?? fresh?.user?.id;
        if (!freshId) return;

        if (collidingUsername) removeUserIdCacheEntry(collidingUsername);
        removeUserIdCacheEntry(normalizedUsername);

        if (putUserIdInCache(normalizedUsername, freshId)) {
            userIdCache.set(normalizedUsername, fresh);
        }
    }
    catch (err) {
        logger('reconcileOwnerFromApiResponse()', `live refresh failed for @${normalizedUsername}`, err);
    }
}