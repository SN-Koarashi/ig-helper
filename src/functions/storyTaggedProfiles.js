import { SVG, state } from "../settings";
import {
    logger, getStoryProgress, getStoryProgressIndex, updateLoadingBar
} from "../utils/general";
import {
    getHighlightStories, getMediaInfo, getReelsMedia, getStories, getUserId
} from "../utils/api";
import { _i18n } from "../utils/i18n";
import { IG_createDM } from "../utils/dialog";
/*! ESLINT IMPORT END !*/

const PROFILE_CACHE_MAX_AGE = 5 * 60 * 1000;
const MEDIA_INFO_CACHE_MAX_AGE = 5 * 60 * 1000;
const REELS_MEDIA_CACHE_MAX_AGE = 60 * 1000;
const STORY_TIMESTAMP_TOLERANCE = 5;
const USERNAME_PATTERN = /^[A-Za-z0-9._]{1,30}$/;
const TEXT_MENTION_PATTERN = /(^|\s)@([A-Za-z0-9._]{1,30})(?=$|\s|[.,:;!?)\]])/g;
const STORY_POSITION_SELECTOR = '.IG_DWSTORY_POSITION, .IG_DWHISTORY_POSITION';
const STORY_CONTROL_SELECTOR = '.IG_DWSTORY, .IG_DWSTORY_ALL, .IG_DWNEWTAB, .IG_DWSTORY_THUMBNAIL, .IG_DWHISTORY, .IG_DWHISTORY_ALL, .IG_DWHINEWTAB, .IG_DWHISTORY_THUMBNAIL, .IG_DWSTORY_TAGGED_PROFILES';
const STORY_TIMESTAMP_SELECTOR = 'time[datetime]';
const PROFILE_PATH_BLOCKLIST = new Set([
    'accounts', 'data', 'direct', 'explore', 'legal', 'p', 'popular', 'reel', 'reels', 'stories', 'web'
]);

/**
 * @typedef {Object} TaggedProfile
 * @property {String} username Instagram username.
 * @property {String} href Absolute Instagram profile URL.
 */

/**
 * @typedef {Object} TaggedProfileState
 * @property {?String} mediaId Active story media ID when available.
 * @property {?String} username Story or highlight owner's username.
 * @property {TaggedProfile[]} profiles Tagged or mentioned profiles.
 */

/**
 * @typedef {Object} VisibleTaggedProfiles
 * @property {TaggedProfile[]} directProfiles Profiles exposed through visible profile links.
 * @property {TaggedProfile[]} textProfiles Profiles detected from visible text-only mentions.
 */

/**
 * isUsername
 * @description Check whether a value is a possible Instagram username.
 *
 * @param  {*}  value
 * @return {Boolean}
 */
function isUsername(value) {
    return typeof value === 'string' && USERNAME_PATTERN.test(value);
}

/**
 * pushUniqueUsername
 * @description Add a username to an array when it is not already present.
 *
 * @param  {String[]}  usernames
 * @param  {?String}  username
 * @return {void}
 */
function pushUniqueUsername(usernames, username) {
    if (!isUsername(username)) return;

    const normalizedUsername = username.toLowerCase();
    if (!usernames.some(value => value.toLowerCase() === normalizedUsername)) {
        usernames.push(username);
    }
}

/**
 * getUsernameFromProfileHref
 * @description Resolve an Instagram profile username from a profile link.
 *
 * @param  {?String}  href
 * @return {?String}
 */
function getUsernameFromProfileHref(href) {
    if (!href) return null;

    try {
        const url = new URL(href, location.origin);
        const paths = url.pathname.split('/').filter(Boolean);
        const username = paths[0] || '';

        if (!/(^|\.)instagram\.com$/i.test(url.hostname)) return null;
        if (paths.length !== 1 || PROFILE_PATH_BLOCKLIST.has(username.toLowerCase())) return null;
        return isUsername(username) ? username : null;
    }
    catch {
        return null;
    }
}

/**
 * getActiveStoryScope
 * @description Get the visible story section associated with a control element.
 *
 * @param  {HTMLElement|JQuery|null}  scope
 * @return {JQuery}
 */
function getActiveStoryScope(scope) {
    const $scope = scope ? $(scope).closest('section:visible') : $();
    if ($scope.length) return $scope.first();

    return $('body > div section:visible').first();
}

/**
 * getCurrentStoryUsernameFromLocation
 * @description Get the regular story owner from the current URL.
 *
 * @return {?String}
 */
function getCurrentStoryUsernameFromLocation() {
    const paths = location.pathname.split('/').filter(Boolean);
    if (paths[0] !== 'stories' || paths[1] === 'highlights') return null;

    return isUsername(paths[1]) ? paths[1] : null;
}

/**
 * getCurrentStoryUsernameFromHeader
 * @description Get the story or highlight owner from the visible viewer header.
 *
 * @param  {HTMLElement|JQuery|null}  scope
 * @return {?String}
 */
function getCurrentStoryUsernameFromHeader(scope) {
    const $scope = getActiveStoryScope(scope);
    const username = $scope.find('header a[href]').map(function () {
        return getUsernameFromProfileHref($(this).attr('href'));
    }).get().find(Boolean);

    if (username) return username;

    const legacyUsername = $('body > div section._ac0a header._ac0k ._ac0l a + div a').first().text()?.trim();
    return isUsername(legacyUsername) ? legacyUsername : null;
}

/**
 * getCurrentStoryUsername
 * @description Resolve the current story or highlight owner's username.
 *
 * @param  {HTMLElement|JQuery|null}  scope
 * @return {?String}
 */
function getCurrentStoryUsername(scope) {
    return getCurrentStoryUsernameFromLocation() || getCurrentStoryUsernameFromHeader(scope);
}

/**
 * getCurrentStoryUsernameCandidates
 * @description Build a de-duplicated list of possible story owner usernames.
 *
 * @param  {?String}  preferredUsername
 * @param  {HTMLElement|JQuery|null}  scope
 * @return {String[]}
 */
function getCurrentStoryUsernameCandidates(preferredUsername, scope) {
    const usernames = [];

    pushUniqueUsername(usernames, preferredUsername);
    pushUniqueUsername(usernames, getCurrentStoryUsernameFromLocation());
    pushUniqueUsername(usernames, getCurrentStoryUsernameFromHeader(scope));

    return usernames;
}

/**
 * getCurrentHighlightIdFromLocation
 * @description Get the active highlight ID from the current URL.
 *
 * @return {?String}
 */
function getCurrentHighlightIdFromLocation() {
    const paths = location.pathname.split('/').filter(Boolean);
    const highlightId = paths[2] || '';

    return paths[0] === 'stories' && paths[1] === 'highlights' && /^\d{10,}$/.test(highlightId)
        ? highlightId
        : null;
}

/**
 * getCurrentStoryMediaIdFromLocation
 * @description Get the active regular-story media ID from the current URL.
 *
 * @return {?String}
 */
function getCurrentStoryMediaIdFromLocation() {
    if (getCurrentHighlightIdFromLocation()) return null;

    return location.pathname.split('/').filter(path => /^\d{10,}$/.test(path)).at(-1) || null;
}

/**
 * getVisibleStoryTimestamp
 * @description Get the visible story item's timestamp in seconds.
 *
 * @param  {HTMLElement|JQuery|null}  scope
 * @return {?Number}
 */
function getVisibleStoryTimestamp(scope) {
    const $scope = getActiveStoryScope(scope);
    const $time = $scope.find(STORY_TIMESTAMP_SELECTOR).filter(function () {
        const $this = $(this);
        return $this.is(':visible')
            && $this.closest('a[href^="/stories/highlights/"]').length === 0
            && $this.closest('[role="button"]').length === 0;
    }).first();

    if (!$time.length) return null;

    const timestamp = Math.floor(new Date($time.attr('datetime')).getTime() / 1000);
    return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
}

/**
 * getCurrentStoryIdentitySignature
 * @description Create a cache key for the currently visible story or highlight item.
 *
 * @param  {HTMLElement|JQuery|null}  scope
 * @return {String}
 */
function getCurrentStoryIdentitySignature(scope) {
    const username = getCurrentStoryUsernameCandidates(null, scope).join('|');
    const mediaId = getCurrentStoryMediaIdFromLocation() || '';
    const highlightId = getCurrentHighlightIdFromLocation() || '';
    const $controlRoot = scope ? $(scope).parent() : $();
    const positionText = ($controlRoot.find(STORY_POSITION_SELECTOR).first().text()
        || $(STORY_POSITION_SELECTOR).first().text()).trim();
    const visibleTimestamp = getVisibleStoryTimestamp(scope) || '';

    return [location.pathname, username, mediaId, highlightId, positionText, visibleTimestamp].join('::');
}

/**
 * getStoryItems
 * @description Extract story items from supported GraphQL and mobile API payload shapes.
 *
 * @param  {*}  source
 * @return {Object[]}
 */
function getStoryItems(source) {
    if (!source || typeof source !== 'object') return [];
    if (Array.isArray(source)) return source;
    if (Array.isArray(source.items)) return source.items;
    if (Array.isArray(source.reels_media?.[0]?.items)) return source.reels_media[0].items;
    if (Array.isArray(source.data?.reels_media?.[0]?.items)) return source.data.reels_media[0].items;

    const reels = source.reels || source.data?.reels || {};
    const reel = Object.values(reels).find(value => Array.isArray(value?.items));
    return reel?.items || [];
}

/**
 * getStorySourceOwnerUsername
 * @description Extract the story owner username from supported payload shapes.
 *
 * @param  {*}  source
 * @return {?String}
 */
function getStorySourceOwnerUsername(source) {
    const reels = source?.reels || source?.data?.reels || {};
    const reel = Object.values(reels).find(value => Array.isArray(value?.items));
    const username = source?.user?.username
        || source?.owner?.username
        || source?.reels_media?.[0]?.user?.username
        || source?.reels_media?.[0]?.owner?.username
        || source?.data?.reels_media?.[0]?.user?.username
        || source?.data?.reels_media?.[0]?.owner?.username
        || reel?.user?.username
        || reel?.owner?.username
        || '';

    return isUsername(username.trim()) ? username.trim() : null;
}

/**
 * getStoryItemIds
 * @description Get all media ID variants exposed by a story item.
 *
 * @param  {*}  item
 * @return {String[]}
 */
function getStoryItemIds(item) {
    const ids = [item?.id, item?.pk, item?.media_id, item?.mediaid]
        .filter(id => id != null)
        .map(id => `${id}`);

    ids.slice().forEach(id => {
        const baseId = id.split('_')[0];
        if (!ids.includes(baseId)) {
            ids.push(baseId);
        }
    });

    return ids;
}

/**
 * storyItemMatchesMediaId
 * @description Check whether a story item matches a media ID.
 *
 * @param  {*}  item
 * @param  {?String}  mediaId
 * @return {Boolean}
 */
function storyItemMatchesMediaId(item, mediaId) {
    return mediaId != null && getStoryItemIds(item).includes(`${mediaId}`);
}

/**
 * getVisibleStoryProgress
 * @description Read the active story position from the progress UI.
 *
 * @param  {?String}  username
 * @param  {HTMLElement|JQuery|null}  scope
 * @return {?Object}
 */
function getVisibleStoryProgress(username, scope) {
    const $header = getStoryProgress(username);
    const progress = getStoryProgressIndex($header);
    if (progress != null) return progress;

    const $controlRoot = scope ? $(scope).parent() : $();
    const positionText = ($controlRoot.find(STORY_POSITION_SELECTOR).first().text()
        || $(STORY_POSITION_SELECTOR).first().text()).trim();
    const match = positionText.match(/^(\d+)\s*\/\s*(\d+)$/);
    if (!match) return null;

    return {
        current: parseInt(match[1], 10),
        total: parseInt(match[2], 10)
    };
}

/**
 * resolveStoryItemByProgress
 * @description Resolve the active story item from the visible progress position.
 *
 * @param  {*}  source
 * @param  {?String}  username
 * @param  {HTMLElement|JQuery|null}  scope
 * @return {?Object}
 */
function resolveStoryItemByProgress(source, username, scope) {
    const items = getStoryItems(source);
    const progress = getVisibleStoryProgress(username, scope);

    if (!items.length || progress == null || !Number.isFinite(progress.current)) return null;
    if (Number.isFinite(progress.total) && progress.total !== items.length) return null;

    return items[progress.current - 1] || null;
}

/**
 * resolveStoryItemByVisibleTimestamp
 * @description Resolve the active story item by matching its visible timestamp.
 *
 * @param  {*}  source
 * @param  {HTMLElement|JQuery|null}  scope
 * @return {?Object}
 */
function resolveStoryItemByVisibleTimestamp(source, scope) {
    const items = getStoryItems(source);
    const visibleTimestamp = getVisibleStoryTimestamp(scope);

    if (!items.length || visibleTimestamp == null) return null;

    const bestMatch = items.reduce((best, item) => {
        const itemTimestamp = Number(item?.taken_at_timestamp || item?.taken_at || 0);
        if (!Number.isFinite(itemTimestamp) || itemTimestamp <= 0) return best;

        const difference = Math.abs(itemTimestamp - visibleTimestamp);
        return difference < best.difference ? { item, difference } : best;
    }, { item: null, difference: Infinity });

    return bestMatch.difference <= STORY_TIMESTAMP_TOLERANCE ? bestMatch.item : null;
}

/**
 * resolveCurrentStoryItem
 * @description Resolve the currently visible item from a story or highlight payload.
 *
 * @param  {*}  source
 * @param  {?String}  username
 * @param  {HTMLElement|JQuery|null}  scope
 * @return {?Object}
 */
function resolveCurrentStoryItem(source, username, scope) {
    const items = getStoryItems(source);
    if (!items.length) return null;

    const urlMediaId = getCurrentStoryMediaIdFromLocation();
    const urlItem = urlMediaId ? items.find(item => storyItemMatchesMediaId(item, urlMediaId)) : null;
    if (urlItem) return urlItem;

    const timestampItem = resolveStoryItemByVisibleTimestamp(source, scope);
    if (getCurrentHighlightIdFromLocation() && timestampItem) return timestampItem;

    return resolveStoryItemByProgress(source, username, scope) || timestampItem;
}

/**
 * getDataCacheBucket
 * @description Get or create a named bucket in the shared data cache.
 *
 * @param  {String}  name
 * @return {Object}
 */
function getDataCacheBucket(name) {
    if (state.GL_dataCache[name] == null) {
        state.GL_dataCache[name] = {};
    }
    return state.GL_dataCache[name];
}

/**
 * getStoryTaggedProfilesCache
 * @description Get or initialize the tagged-profiles cache namespace.
 *
 * @return {Object}
 */
function getStoryTaggedProfilesCache() {
    if (state.GL_dataCache.storyTaggedProfiles == null) {
        state.GL_dataCache.storyTaggedProfiles = {};
    }

    const cache = state.GL_dataCache.storyTaggedProfiles;
    cache.profiles ??= {};
    cache.mediaInfo ??= {};
    cache.reelsMedia ??= {};
    cache.requests ??= {};

    return cache;
}

/**
 * getStoryTaggedProfilesBucket
 * @description Get or create a tagged-profiles data bucket.
 *
 * @param  {String}  name
 * @return {Object}
 */
function getStoryTaggedProfilesBucket(name) {
    const cache = getStoryTaggedProfilesCache();
    cache[name] ??= {};
    return cache[name];
}

/**
 * getStoryTaggedProfilesRequestBucket
 * @description Get or create an in-flight request bucket.
 *
 * @param  {String}  name
 * @return {Object}
 */
function getStoryTaggedProfilesRequestBucket(name) {
    const requests = getStoryTaggedProfilesCache().requests;
    requests[name] ??= {};
    return requests[name];
}

/**
 * getCachedValue
 * @description Return a cached value or de-duplicate its in-flight producer request.
 *
 * @param  {Object}  bucket
 * @param  {Object}  requestBucket
 * @param  {String|Number}  key
 * @param  {Function}  producer
 * @param  {?Number}  maxAge - Optional cache lifetime in milliseconds
 * @return {Promise<*>}
 */
function getCachedValue(bucket, requestBucket, key, producer, maxAge = null) {
    const originalKey = `${key}`;
    const normalizedKey = originalKey.toLowerCase();
    const hasNormalizedValue = Object.prototype.hasOwnProperty.call(bucket, normalizedKey);
    const hasOriginalValue = Object.prototype.hasOwnProperty.call(bucket, originalKey);

    if (hasNormalizedValue || hasOriginalValue) {
        const cacheKey = hasNormalizedValue ? normalizedKey : originalKey;
        const cached = bucket[cacheKey];

        if (maxAge == null) {
            return Promise.resolve(cached);
        }
        if (cached?.createdAt && Date.now() - cached.createdAt <= maxAge) {
            return Promise.resolve(cached.value);
        }

        delete bucket[normalizedKey];
        delete bucket[originalKey];
    }
    if (requestBucket[normalizedKey]) return requestBucket[normalizedKey];

    requestBucket[normalizedKey] = Promise.resolve()
        .then(producer)
        .then(result => {
            const cached = maxAge == null ? result : {
                value: result,
                createdAt: Date.now()
            };

            bucket[normalizedKey] = cached;
            if (originalKey !== normalizedKey) {
                bucket[originalKey] = cached;
            }
            return result;
        })
        .finally(() => {
            delete requestBucket[normalizedKey];
        });

    return requestBucket[normalizedKey];
}

/**
 * getCachedStories
 * @description Get a regular-story payload from cache or the existing story API flow.
 *
 * @param  {String}  username
 * @return {Promise<Object>}
 */
async function getCachedStories(username) {
    return getCachedValue(
        getDataCacheBucket('stories'),
        getStoryTaggedProfilesRequestBucket('stories'),
        username,
        async () => {
            const userInfo = await getUserId(username);
            return getStories(userInfo.user.pk);
        }
    );
}

/**
 * getCachedHighlightStories
 * @description Get a highlight payload from cache or the existing highlight API flow.
 *
 * @param  {String}  highlightId
 * @return {Promise<Object>}
 */
async function getCachedHighlightStories(highlightId) {
    return getCachedValue(
        getDataCacheBucket('highlights'),
        getStoryTaggedProfilesRequestBucket('highlights'),
        highlightId,
        () => getHighlightStories(highlightId)
    );
}

/**
 * getCachedMediaInfo
 * @description Get media-info fallback data for a story item.
 *
 * @param  {String}  mediaId
 * @return {Promise<Object>}
 */
async function getCachedMediaInfo(mediaId) {
    return getCachedValue(
        getStoryTaggedProfilesBucket('mediaInfo'),
        getStoryTaggedProfilesRequestBucket('mediaInfo'),
        mediaId,
        () => getMediaInfo(mediaId, true),
        MEDIA_INFO_CACHE_MAX_AGE
    );
}

/**
 * getCachedReelsMedia
 * @description Get the mobile reels-media fallback for a regular-story owner.
 *
 * @param  {String}  username
 * @return {Promise<Object>}
 */
async function getCachedReelsMedia(username) {
    return getCachedValue(
        getStoryTaggedProfilesBucket('reelsMedia'),
        getStoryTaggedProfilesRequestBucket('reelsMedia'),
        username,
        async () => {
            const userInfo = await getUserId(username);
            return getReelsMedia(userInfo.user.pk);
        },
        REELS_MEDIA_CACHE_MAX_AGE
    );
}

/**
 * getMentionUsername
 * @description Extract a username from supported mention object shapes.
 *
 * @param  {*}  mention
 * @return {?String}
 */
function getMentionUsername(mention) {
    const username = mention?.username
        || mention?.user?.username
        || mention?.profile?.username
        || mention?.profile_user?.username
        || mention?.tappable_user?.username
        || mention?.ig_mention?.username
        || mention?.profile_owner?.username
        || '';

    return isUsername(username.trim()) ? username.trim() : null;
}

/**
 * addTaggedProfile
 * @description Add a valid tagged profile to a de-duplicated profile map.
 *
 * @param  {Map<String, TaggedProfile>}  profiles
 * @param  {*}  mention
 * @param  {?String}  excludeUsername
 * @return {void}
 */
function addTaggedProfile(profiles, mention, excludeUsername) {
    const username = getMentionUsername(mention);
    if (!username) return;
    if (excludeUsername && username.toLowerCase() === excludeUsername.toLowerCase()) return;

    const normalizedUsername = username.toLowerCase();
    if (!profiles.has(normalizedUsername)) {
        profiles.set(normalizedUsername, {
            username,
            href: `https://www.instagram.com/${username}/`
        });
    }
}

/**
 * hasBlockedProfileContext
 * @description Check whether a payload path describes non-profile attribution data.
 *
 * @param  {String[]}  path
 * @return {Boolean}
 */
function hasBlockedProfileContext(path) {
    return path.some(key => /music|audio|artist|song|sound|feed_media|media_attributions|attribution|owner|viewer/i.test(`${key}`));
}

/**
 * hasMentionContext
 * @description Check whether a payload path can contain story mention metadata.
 *
 * @param  {String[]}  path
 * @return {Boolean}
 */
function hasMentionContext(path) {
    return !hasBlockedProfileContext(path)
        && path.some(key => /mention|tappable|sticker|tag|usertags|bloks/i.test(`${key}`));
}

/**
 * extractStoryTaggedProfiles
 * @description Recursively extract tagged or mentioned profiles from a story item.
 *
 * @param  {*}  item
 * @param  {?String}  excludeUsername
 * @return {TaggedProfile[]}
 */
function extractStoryTaggedProfiles(item, excludeUsername) {
    const profiles = new Map();
    const visited = new WeakSet();

    /**
     * Walk nested story metadata while preserving the current property path.
     *
     * @param  {*}  source
     * @param  {String[]}  path
     * @return {void}
     */
    function walk(source, path = []) {
        if (!source || typeof source !== 'object' || visited.has(source)) return;
        visited.add(source);

        Object.keys(source).forEach(key => {
            const value = source[key];
            const nextPath = path.concat(key);

            if (key === 'ig_mention' && !hasBlockedProfileContext(nextPath)) {
                addTaggedProfile(profiles, value, excludeUsername);
                return;
            }
            if (value && typeof value === 'object' && getMentionUsername(value) && hasMentionContext(nextPath)) {
                addTaggedProfile(profiles, value, excludeUsername);
            }

            walk(value, nextPath);
        });
    }

    walk(item);
    return Array.from(profiles.values());
}

/**
 * rectanglesOverlap
 * @description Check whether two DOM rectangles overlap.
 *
 * @param  {?DOMRect}  left
 * @param  {?DOMRect}  right
 * @return {Boolean}
 */
function rectanglesOverlap(left, right) {
    return Boolean(left && right
        && left.width > 0 && left.height > 0
        && right.width > 0 && right.height > 0
        && left.right >= right.left
        && left.left <= right.right
        && left.bottom >= right.top
        && left.top <= right.bottom);
}

/**
 * getLargestVisibleStoryMediaRect
 * @description Get the largest visible image or video rectangle in a story scope.
 *
 * @param  {JQuery}  $scope
 * @return {?DOMRect}
 */
function getLargestVisibleStoryMediaRect($scope) {
    let mediaRect = null;
    let mediaArea = 0;

    $scope.find('video:visible, img[referrerpolicy]:visible, img[crossorigin]:visible').each(function () {
        const rect = this.getBoundingClientRect?.();
        const area = rect ? rect.width * rect.height : 0;

        if (area > mediaArea) {
            mediaArea = area;
            mediaRect = rect;
        }
    });

    return mediaRect;
}

/**
 * extractVisibleStoryTaggedProfiles
 * @description Extract direct profile links and text-only @mentions over the active story media.
 *
 * @param  {?String}  excludeUsername
 * @param  {HTMLElement}  button
 * @return {VisibleTaggedProfiles}
 */
function extractVisibleStoryTaggedProfiles(excludeUsername, button) {
    const directProfiles = new Map();
    const textProfiles = new Map();
    const $button = $(button);
    const $sectionScope = $button.closest('section:visible');
    const $scope = $sectionScope.length ? $sectionScope : $button.parent();

    if (!$scope.length) return { directProfiles: [], textProfiles: [] };

    const mediaRect = getLargestVisibleStoryMediaRect($scope);

    $scope.find('a[href]:visible').each(function () {
        if ($(this).closest(STORY_CONTROL_SELECTOR).length) return;

        const username = getUsernameFromProfileHref($(this).attr('href'));
        const rect = this.getBoundingClientRect?.();
        if (username && (!mediaRect || !rect || rectanglesOverlap(rect, mediaRect))) {
            addTaggedProfile(directProfiles, { username }, excludeUsername);
        }
    });

    if (mediaRect) {
        $scope.find('span:visible, div:visible').each(function () {
            if ($(this).closest(STORY_CONTROL_SELECTOR).length) return;

            const rect = this.getBoundingClientRect?.();
            const text = ($(this).text() || '').trim();
            if (!text || text.length > 120 || !rectanglesOverlap(rect, mediaRect)) return;

            TEXT_MENTION_PATTERN.lastIndex = 0;
            let match = null;
            while ((match = TEXT_MENTION_PATTERN.exec(text)) !== null) {
                addTaggedProfile(textProfiles, { username: match[2] }, excludeUsername);
            }
        });
    }

    for (const key of directProfiles.keys()) {
        textProfiles.delete(key);
    }
    return {
        directProfiles: Array.from(directProfiles.values()),
        textProfiles: Array.from(textProfiles.values())
    };
}

/**
 * createTaggedProfileStateFromSource
 * @description Build tagged-profile state from a story or highlight payload.
 *
 * @param  {*}  source
 * @param  {?String}  username
 * @param  {HTMLElement|JQuery|null}  scope
 * @return {TaggedProfileState}
 */
function createTaggedProfileStateFromSource(source, username, scope) {
    const ownerUsername = getStorySourceOwnerUsername(source) || username || null;
    const item = resolveCurrentStoryItem(source, ownerUsername, scope);
    const mediaId = item ? getStoryItemIds(item)[0] : getCurrentStoryMediaIdFromLocation();

    return {
        mediaId: mediaId || null,
        profiles: extractStoryTaggedProfiles(item, ownerUsername),
        username: ownerUsername
    };
}

/**
 * createTaggedProfileStateFromMediaInfo
 * @description Build tagged-profile state from a media-info payload.
 *
 * @param  {*}  mediaInfo
 * @param  {String}  mediaId
 * @param  {?String}  username
 * @return {TaggedProfileState}
 */
function createTaggedProfileStateFromMediaInfo(mediaInfo, mediaId, username) {
    const item = (mediaInfo?.items || []).find(value => storyItemMatchesMediaId(value, mediaId))
        || mediaInfo?.items?.[0]
        || null;

    return {
        mediaId,
        profiles: extractStoryTaggedProfiles(item, username),
        username
    };
}

/**
 * mergeFallbackState
 * @description Merge newly resolved identifiers into a fallback state.
 *
 * @param  {TaggedProfileState}  fallbackState
 * @param  {TaggedProfileState}  nextState
 * @return {TaggedProfileState}
 */
function mergeFallbackState(fallbackState, nextState) {
    return {
        mediaId: nextState.mediaId || fallbackState.mediaId,
        profiles: fallbackState.profiles,
        username: nextState.username || fallbackState.username
    };
}

/**
 * resolveCurrentStoryTaggedProfiles
 * @description Resolve tagged profiles through DOM, cached payload, media-info, and reels-media fallbacks.
 *
 * @param  {?String}  username
 * @param  {HTMLElement}  button
 * @return {Promise<TaggedProfileState>}
 */
async function resolveCurrentStoryTaggedProfiles(username, button) {
    const usernames = getCurrentStoryUsernameCandidates(username, button);
    const mediaId = getCurrentStoryMediaIdFromLocation();
    const highlightId = getCurrentHighlightIdFromLocation();
    const activeUsername = usernames[0] || username || null;
    let fallbackState = { mediaId, profiles: [], username: activeUsername };
    let hasResolvedSource = false;
    let lastError = null;

    const { directProfiles, textProfiles } = extractVisibleStoryTaggedProfiles(activeUsername, button);
    if (directProfiles.length && !highlightId) {
        const directState = { mediaId, profiles: directProfiles, username: activeUsername };
        logger('[taggedProfiles]', 'source: dom');
        return directState;
    }

    if (highlightId) {
        try {
            const highlightPayload = await getCachedHighlightStories(highlightId);
            hasResolvedSource = true;
            const highlightState = createTaggedProfileStateFromSource(highlightPayload, activeUsername, button);
            fallbackState = mergeFallbackState(fallbackState, highlightState);

            if (directProfiles.length) {
                const directState = {
                    mediaId: highlightState.mediaId || fallbackState.mediaId,
                    profiles: directProfiles,
                    username: highlightState.username || activeUsername
                };
                logger('[taggedProfiles]', 'source: dom');
                return directState;
            }
            if (highlightState.profiles.length) {
                logger('[taggedProfiles]', 'source: highlight');
                return highlightState;
            }

            if (highlightState.mediaId) {
                const mediaInfo = await getCachedMediaInfo(highlightState.mediaId);
                hasResolvedSource = true;
                const mediaInfoState = createTaggedProfileStateFromMediaInfo(
                    mediaInfo,
                    highlightState.mediaId,
                    highlightState.username || activeUsername
                );

                if (mediaInfoState.profiles.length) {
                    logger('[taggedProfiles]', 'source: media-info');
                    return mediaInfoState;
                }
            }
        }
        catch (err) {
            lastError = err;
            logger('[taggedProfiles]', 'highlight lookup failed', err);
        }

        if (directProfiles.length) {
            const directState = { ...fallbackState, profiles: directProfiles };
            logger('[taggedProfiles]', 'source: dom');
            return directState;
        }
        if (textProfiles.length) {
            const textState = { ...fallbackState, profiles: textProfiles };
            logger('[taggedProfiles]', 'source: text');
            return textState;
        }
        if (!hasResolvedSource && lastError) throw lastError;
        logger('[taggedProfiles]', 'empty');
        return fallbackState;
    }

    for (const candidateUsername of usernames) {
        try {
            const storyPayload = await getCachedStories(candidateUsername);
            hasResolvedSource = true;
            const storyState = createTaggedProfileStateFromSource(storyPayload, candidateUsername, button);
            fallbackState = mergeFallbackState(fallbackState, storyState);

            if (storyState.profiles.length) {
                logger('[taggedProfiles]', 'source: story');
                return storyState;
            }
        }
        catch (err) {
            lastError = err;
            logger('[taggedProfiles]', 'story lookup failed', err);
        }
    }

    if (mediaId) {
        try {
            const mediaInfo = await getCachedMediaInfo(mediaId);
            hasResolvedSource = true;
            const mediaInfoState = createTaggedProfileStateFromMediaInfo(mediaInfo, mediaId, activeUsername);
            fallbackState = mergeFallbackState(fallbackState, mediaInfoState);

            if (mediaInfoState.profiles.length) {
                logger('[taggedProfiles]', 'source: media-info');
                return mediaInfoState;
            }
        }
        catch (err) {
            lastError = err;
            logger('[taggedProfiles]', 'media-info lookup failed', err);
        }
    }

    for (const candidateUsername of usernames) {
        try {
            const reelsMediaPayload = await getCachedReelsMedia(candidateUsername);
            hasResolvedSource = true;
            const reelsMediaState = createTaggedProfileStateFromSource(reelsMediaPayload, candidateUsername, button);
            fallbackState = mergeFallbackState(fallbackState, reelsMediaState);

            if (reelsMediaState.profiles.length) {
                logger('[taggedProfiles]', 'source: reels-media');
                return reelsMediaState;
            }
        }
        catch (err) {
            lastError = err;
            logger('[taggedProfiles]', 'reels-media lookup failed', err);
        }
    }

    if (textProfiles.length) {
        const textState = { ...fallbackState, profiles: textProfiles };
        logger('[taggedProfiles]', 'source: text');
        return textState;
    }
    if (!hasResolvedSource && lastError) throw lastError;
    logger('[taggedProfiles]', 'empty');
    return fallbackState;
}

/**
 * getProfileCache
 * @description Get the final tagged-profile result cache.
 *
 * @return {Object}
 */
function getProfileCache() {
    return getStoryTaggedProfilesBucket('profiles');
}

/**
 * getCachedProfileState
 * @description Get a non-expired final tagged-profile result.
 *
 * @param  {String}  identitySignature
 * @return {?TaggedProfileState}
 */
function getCachedProfileState(identitySignature) {
    const profileCache = getProfileCache();
    const cached = identitySignature ? profileCache[identitySignature] : null;
    if (!cached) return null;

    const cacheAge = Date.now() - cached.createdAt;
    if (!cached.profiles?.length || cacheAge > PROFILE_CACHE_MAX_AGE) {
        delete profileCache[identitySignature];
        logger('[taggedProfiles]', cached.profiles?.length ? 'cache expired' : 'cache invalid');
        return null;
    }

    logger('[taggedProfiles]', 'cache hit');
    return cached;
}

/**
 * setCachedProfileState
 * @description Cache a successful final tagged-profile result.
 *
 * @param  {String}  identitySignature
 * @param  {TaggedProfileState}  profileState
 * @return {void}
 */
function setCachedProfileState(identitySignature, profileState) {
    if (!identitySignature || !profileState) return;

    const profileCache = getProfileCache();
    const profiles = profileState.profiles || [];
    if (!profiles.length) {
        delete profileCache[identitySignature];
        return;
    }

    profileCache[identitySignature] = {
        mediaId: profileState.mediaId || '',
        username: profileState.username || '',
        profiles: profiles.map(profile => ({
            username: profile.username,
            href: profile.href || `https://www.instagram.com/${profile.username}/`
        })),
        createdAt: Date.now()
    };
}

/**
 * createTaggedProfileLink
 * @description Create a popup link for one tagged profile.
 *
 * @param  {TaggedProfile}  profile
 * @return {JQuery}
 */
function createTaggedProfileLink(profile) {
    return $('<a />', {
        class: 'IG_TAGGED_PROFILE_LINK',
        href: profile.href,
        target: '_blank',
        rel: 'noopener noreferrer',
        'aria-label': `@${profile.username}`
    })
        .append($('<span />', { class: 'IG_TAGGED_PROFILE_USERNAME', text: `@${profile.username}` }))
        .append($('<span />', {
            class: 'IG_TAGGED_PROFILE_OPEN',
            html: SVG.NEW_TAB,
            'aria-hidden': 'true'
        }));
}

/**
 * showStoryTaggedProfilesDialog
 * @description Show tagged profiles in an IG Helper popup dialog.
 *
 * @param  {TaggedProfile[]}  profiles
 * @param  {?String}  mediaId
 * @param  {?String}  errorMessage
 * @return {void}
 */
function showStoryTaggedProfilesDialog(profiles, mediaId = null, errorMessage = null) {
    $('.IG_POPUP_DIG').remove();
    IG_createDM(false, false);

    const $dialog = $('.IG_POPUP_DIG').last().addClass('IG_TAGGED_PROFILES_DIALOG');
    const $main = $dialog.find('.IG_POPUP_DIG_MAIN').attr({
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': _i18n('TAGGED_PROFILES')
    });
    const $body = $main.find('.IG_POPUP_DIG_BODY').empty();
    const displayMediaId = mediaId ? `${mediaId}`.split('_')[0] : '-';

    $dialog.find('#post_info').text(_i18n('TAGGED_PROFILES'));
    $body.append(
        $('<p />', { class: 'IG_TAGGED_PROFILE_MEDIA_ID' })
            .append($('<span />', { text: `${_i18n('MEDIA_ID')}:` }))
            .append($('<code />', { text: displayMediaId }))
    );

    if (errorMessage || !profiles.length) {
        $body.append($('<p />', {
            class: `IG_TAGGED_PROFILE_EMPTY${errorMessage ? ' IG_TAGGED_PROFILE_ERROR' : ''}`,
            role: errorMessage ? 'alert' : 'status',
            text: errorMessage || _i18n('NO_TAGGED_PROFILES')
        }));
        return;
    }

    const $list = $('<ul />', {
        class: 'IG_TAGGED_PROFILE_LIST',
        'aria-label': _i18n('TAGGED_PROFILES')
    });
    profiles.forEach(profile => {
        $('<li />')
            .append(createTaggedProfileLink(profile))
            .appendTo($list);
    });
    $body.append($list);
}

/**
 * onStoryTaggedProfiles
 * @description Resolve and display tagged profiles for the active story item.
 *
 * @param  {HTMLElement}  button
 * @return {Promise<void>}
 */
export async function onStoryTaggedProfiles(button) {
    const username = getCurrentStoryUsername(button) || $(button).attr('data-story-owner') || null;
    const identitySignature = getCurrentStoryIdentitySignature(button);

    if (!username && !getCurrentStoryMediaIdFromLocation() && !getCurrentHighlightIdFromLocation()) {
        showStoryTaggedProfilesDialog([], getCurrentStoryMediaIdFromLocation());
        return;
    }

    const cached = getCachedProfileState(identitySignature);
    if (cached) {
        showStoryTaggedProfilesDialog(cached.profiles, cached.mediaId);
        return;
    }

    updateLoadingBar(true);
    try {
        const profileState = await resolveCurrentStoryTaggedProfiles(username, button);
        const currentIdentitySignature = getCurrentStoryIdentitySignature(button);

        if (currentIdentitySignature !== identitySignature) {
            logger('onStoryTaggedProfiles()', 'Discarded stale story result after navigation.');
            return;
        }

        setCachedProfileState(identitySignature, profileState);
        showStoryTaggedProfilesDialog(profileState.profiles, profileState.mediaId);
    }
    catch (err) {
        logger('onStoryTaggedProfiles()', err);

        if (getCurrentStoryIdentitySignature(button) !== identitySignature) {
            logger('onStoryTaggedProfiles()', 'Discarded stale story error after navigation.');
            return;
        }

        showStoryTaggedProfilesDialog(
            [],
            getCurrentStoryMediaIdFromLocation(),
            _i18n('TAGGED_PROFILES_LOAD_FAILED')
        );
    }
    finally {
        updateLoadingBar(false);
    }
}

/**
 * createStoryTaggedProfilesButton
 * @description Create the tagged-profiles story control.
 *
 * @return {JQuery}
 */
function createStoryTaggedProfilesButton() {
    return $('<div />', {
        class: 'IG_DWSTORY_TAGGED_PROFILES',
        title: _i18n('TAGGED_PROFILES'),
        'data-ih-locale-title': 'TAGGED_PROFILES',
        html: SVG.TAGGED_PROFILES
    });
}

/**
 * setStoryTaggedProfilesButton
 * @description Add or update the tagged-profiles control in a story viewer.
 *
 * @param  {JQuery}  $element
 * @param  {?String}  username
 * @return {void}
 */
export function setStoryTaggedProfilesButton($element, username) {
    if ($element == null || !$element.length) return;

    let $button = $element.find('.IG_DWSTORY_TAGGED_PROFILES').first();
    if (!$button.length) {
        $button = createStoryTaggedProfilesButton();
        $element.append($button);
    }

    const resolvedUsername = username || getCurrentStoryUsername($button.get(0));
    $button.attr('data-story-owner', resolvedUsername || '');
}
