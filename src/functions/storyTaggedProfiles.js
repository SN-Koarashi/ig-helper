import { SVG, state } from "../settings";
import {
    logger, getAppID, getStoryProgress, getStoryProgressIndex, updateLoadingBar
} from "../utils/general";
import { getStories, getUserId } from "../utils/api";
import { _i18n } from "../utils/i18n";
import { IG_createDM } from "../utils/dialog";
/*! ESLINT IMPORT END !*/

const PROFILE_CACHE_MAX_AGE = 5 * 60 * 1000;
const CONTROL_SELECTOR = '.IG_DWSTORY, .IG_DWSTORY_ALL, .IG_DWNEWTAB, .IG_DWSTORY_THUMBNAIL, .IG_DWSTORY_TAGGED_PROFILES';

function isUsername(value) {
    return !!value && /^[A-Za-z0-9._]+$/.test(value);
}

function uniquePush(list, value) {
    if (value && !list.some(item => item.toLowerCase() === value.toLowerCase())) list.push(value);
}

function getUsernameFromProfileHref(href) {
    try {
        const url = new URL(href, location.origin);
        const blocked = ['accounts', 'data', 'direct', 'explore', 'legal', 'p', 'popular', 'reel', 'reels', 'stories', 'web'];
        const paths = url.pathname.split('/').filter(Boolean);

        if (!url.hostname.match(/(^|\.)instagram\.com$/i)) return null;
        if (paths.length !== 1 || blocked.includes(paths[0])) return null;
        return isUsername(paths[0]) ? paths[0] : null;
    }
    catch {
        return null;
    }
}

function getActiveStoryScope(scope) {
    const $scope = scope ? $(scope).closest('section:visible') : $();
    return $scope.length ? $scope.first() : $('body > div section:visible').first();
}

function getCurrentStoryUsernameFromLocation() {
    const paths = location.pathname.split('/').filter(Boolean);
    if (paths[0] !== 'stories' || paths[1] === 'highlights') return null;
    return isUsername(paths[1]) ? paths[1] : null;
}

function getCurrentStoryUsernameFromHeader(scope) {
    const $scope = getActiveStoryScope(scope);
    const username = $scope.find('header a[href]').map(function () {
        return getUsernameFromProfileHref($(this).attr('href'));
    }).get().filter(Boolean).at(0);

    if (username) return username;

    const legacyUsername = $('body > div section._ac0a header._ac0k ._ac0l a + div a').first().text()?.trim();
    return isUsername(legacyUsername) ? legacyUsername : null;
}

function getCurrentStoryUsername(scope) {
    return getCurrentStoryUsernameFromLocation() || getCurrentStoryUsernameFromHeader(scope);
}

function getCurrentStoryUsernameCandidates(preferredUsername, scope) {
    const usernames = [];
    [preferredUsername, getCurrentStoryUsernameFromLocation(), getCurrentStoryUsernameFromHeader(scope)]
        .forEach(username => { if (isUsername(username)) uniquePush(usernames, username); });
    return usernames;
}

function getCurrentStoryMediaIdFromLocation() {
    return location.pathname.split('/').filter(path => /^\d{10,}$/.test(path)).at(-1) || null;
}

function getCurrentStoryIdentitySignature(scope) {
    const username = getCurrentStoryUsernameCandidates(null, scope).join('|');
    const mediaId = getCurrentStoryMediaIdFromLocation() || '';
    const positionText = $('.IG_DWSTORY_POSITION').first().text().trim();
    return [location.pathname, username, mediaId, positionText].join('::');
}

function getStoryItems(source) {
    if (!source || typeof source !== 'object') return [];
    if (Array.isArray(source)) return source;
    if (Array.isArray(source.items)) return source.items;
    if (Array.isArray(source.reels_media?.[0]?.items)) return source.reels_media[0].items;
    if (Array.isArray(source.data?.reels_media?.[0]?.items)) return source.data.reels_media[0].items;

    const reel = Object.values(source.reels || source.data?.reels || {}).find(value => Array.isArray(value?.items));
    return reel?.items || [];
}

function getStoryItemIds(item) {
    const ids = [item?.id, item?.pk, item?.media_id, item?.mediaid]
        .filter(id => id != null)
        .map(id => `${id}`);

    ids.slice().forEach(id => uniquePush(ids, id.split('_')[0]));
    return ids;
}

function storyItemMatchesMediaId(item, mediaId) {
    return mediaId != null && getStoryItemIds(item).includes(`${mediaId}`);
}

function resolveStoryItemByProgress(source, username) {
    const items = getStoryItems(source);
    if (!items.length) return null;

    const $header = getStoryProgress(username);
    let progress = getStoryProgressIndex($header);

    if (progress == null) {
        const match = $('.IG_DWSTORY_POSITION').first().text().trim().match(/^(\d+)\s*\/\s*(\d+)$/);
        if (match) progress = { current: parseInt(match[1], 10), total: parseInt(match[2], 10) };
    }

    if (progress == null || !Number.isFinite(progress.current)) return null;
    if (Number.isFinite(progress.total) && progress.total !== items.length) return null;
    return items[progress.current - 1] || null;
}

function resolveStoryMediaIdByVisibleTimestamp(source) {
    const items = getStoryItems(source);
    const $time = $('body > div section:visible time[datetime]').filter(function () {
        return $(this).is(':visible') && $(this).closest('a[href^="/stories/highlights/"]').length === 0 && $(this).closest('[role="button"]').length === 0;
    }).first();

    if (!items.length || !$time.length) return null;

    const visibleTs = Math.floor(new Date($time.attr('datetime')).getTime() / 1000);
    if (!Number.isFinite(visibleTs) || visibleTs === 0) return null;

    return items.reduce((best, item) => {
        const diff = Math.abs((item.taken_at_timestamp || item.taken_at || 0) - visibleTs);
        return diff < best.diff ? { id: getStoryItemIds(item)[0], diff } : best;
    }, { id: null, diff: Infinity }).id;
}

function resolveCurrentStoryItem(source, username) {
    const items = getStoryItems(source);
    if (!items.length) return null;

    const urlId = getCurrentStoryMediaIdFromLocation();
    const urlItem = urlId ? items.find(item => storyItemMatchesMediaId(item, urlId)) : null;
    if (urlItem) return urlItem;

    const progressItem = resolveStoryItemByProgress(source, username);
    if (progressItem) return progressItem;

    const timestampId = resolveStoryMediaIdByVisibleTimestamp(source);
    return timestampId ? items.find(item => storyItemMatchesMediaId(item, timestampId)) || null : null;
}

function requestJSON(url, options = {}) {
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: 'GET',
            url,
            headers: options.headers || {},
            onload(response) {
                try {
                    if (options.requireSameUrl && response.finalUrl !== url) {
                        reject(new Error(`Request was redirected to "${response.finalUrl}".`));
                        return;
                    }
                    resolve(JSON.parse(response.response));
                }
                catch (err) { reject(err); }
            },
            onerror: reject
        });
    });
}

function getDataCacheBucket(name) {
    if (state.GL_dataCache[name] == null) state.GL_dataCache[name] = {};
    return state.GL_dataCache[name];
}

function getStoryTaggedProfilesCache() {
    if (state.GL_dataCache.storyTaggedProfiles == null) state.GL_dataCache.storyTaggedProfiles = {};

    const cache = state.GL_dataCache.storyTaggedProfiles;
    if (cache.profiles == null) cache.profiles = {};
    if (cache.mediaInfo == null) cache.mediaInfo = {};
    if (cache.reelsMedia == null) cache.reelsMedia = {};
    if (cache.requests == null) cache.requests = {};

    return cache;
}

function getStoryTaggedProfilesBucket(name) {
    const cache = getStoryTaggedProfilesCache();
    if (cache[name] == null) cache[name] = {};
    return cache[name];
}

function getStoryTaggedProfilesRequestBucket(name) {
    const requests = getStoryTaggedProfilesCache().requests;
    if (requests[name] == null) requests[name] = {};
    return requests[name];
}

function cacheValue(bucket, requestBucket, key, producer) {
    const originalKey = `${key}`;
    const cacheKey = originalKey.toLowerCase();

    if (bucket[cacheKey] || bucket[originalKey]) return bucket[cacheKey] || bucket[originalKey];
    if (requestBucket[cacheKey]) return requestBucket[cacheKey];

    requestBucket[cacheKey] = Promise.resolve()
        .then(producer)
        .then(result => {
            bucket[cacheKey] = result;
            bucket[originalKey] = result;
            return result;
        })
        .finally(() => {
            delete requestBucket[cacheKey];
        });

    return requestBucket[cacheKey];
}

async function getCachedStories(username) {
    return cacheValue(getDataCacheBucket('stories'), getStoryTaggedProfilesRequestBucket('stories'), username, async () => {
        const userInfo = await getUserId(username);
        return getStories(userInfo.user.pk);
    });
}

async function getCachedMediaInfo(mediaId) {
    return cacheValue(getStoryTaggedProfilesBucket('mediaInfo'), getStoryTaggedProfilesRequestBucket('mediaInfo'), mediaId, () => requestJSON(`https://i.instagram.com/api/v1/media/${mediaId}/info/`, {
        headers: { 'User-Agent': window.navigator.userAgent, Accept: '*/*', 'X-IG-App-ID': getAppID() },
        requireSameUrl: true
    }));
}

async function getCachedReelsMedia(username) {
    return cacheValue(getStoryTaggedProfilesBucket('reelsMedia'), getStoryTaggedProfilesRequestBucket('reelsMedia'), username, async () => {
        const userInfo = await getUserId(username);
        return requestJSON(`https://i.instagram.com/api/v1/feed/reels_media/?reel_ids=${userInfo.user.pk}`, {
            headers: { 'User-Agent': window.navigator.userAgent, Accept: '*/*', 'X-IG-App-ID': getAppID() },
            requireSameUrl: true
        });
    });
}

function getMentionUsername(mention) {
    return (mention?.username || mention?.user?.username || mention?.profile?.username || mention?.profile_user?.username
        || mention?.tappable_user?.username || mention?.ig_mention?.username || mention?.profile_owner?.username || '').trim();
}

function addTaggedProfile(profiles, mention, excludeUsername) {
    const username = getMentionUsername(mention);
    if (!isUsername(username)) return;
    if (excludeUsername && username.toLowerCase() === excludeUsername.toLowerCase()) return;

    profiles[username] = {
        username,
        href: `https://www.instagram.com/${username}/`
    };
}

function hasBlockedProfileContext(path) {
    return path.some(key => `${key}`.match(/music|audio|artist|song|sound|feed_media|media_attributions|attribution|owner|viewer/i));
}

function hasMentionContext(path) {
    return !hasBlockedProfileContext(path) && path.some(key => `${key}`.match(/mention|mentions|tappable|sticker|tag|usertags|bloks/i));
}

function extractStoryTaggedProfiles(item, excludeUsername) {
    const profiles = {};

    function walk(source, path = []) {
        if (!source || typeof source !== 'object') return;

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
    return Object.values(profiles);
}

function rectanglesOverlap(left, right) {
    return !!left && !!right && left.width > 0 && left.height > 0 && right.width > 0 && right.height > 0
        && left.right >= right.left && left.left <= right.right && left.bottom >= right.top && left.top <= right.bottom;
}

function getLargestVisibleStoryMediaRect($scope) {
    let mediaRect = null;
    let mediaArea = 0;

    $scope.find('video:visible, img[referrerpolicy]:visible').each(function () {
        const rect = this.getBoundingClientRect?.();
        const area = rect ? rect.width * rect.height : 0;
        if (area > mediaArea) {
            mediaArea = area;
            mediaRect = rect;
        }
    });

    return mediaRect;
}

function extractVisibleStoryTaggedProfiles(excludeUsername, button) {
    const profiles = {};
    const $button = $(button);
    const $sectionScope = $button.closest('section:visible');
    const $scope = $sectionScope.length ? $sectionScope : $button.parent();
    const mediaRect = getLargestVisibleStoryMediaRect($scope);

    if (!$scope.length) return [];

    $scope.find('a[href]:visible').each(function () {
        if ($(this).closest(CONTROL_SELECTOR).length) return;

        const username = getUsernameFromProfileHref($(this).attr('href'));
        const rect = this.getBoundingClientRect?.();
        if (username && (!mediaRect || !rect || rectanglesOverlap(rect, mediaRect))) {
            addTaggedProfile(profiles, { username }, excludeUsername);
        }
    });

    if (mediaRect) {
        $scope.find('span:visible, div:visible').each(function () {
            const rect = this.getBoundingClientRect?.();
            const text = ($(this).text() || '').trim();
            if (!text || text.length > 120 || !rectanglesOverlap(rect, mediaRect)) return;

            let match = null;
            const pattern = /(^|\s)@([A-Za-z0-9._]{2,30})(?=$|\s|[.,:;!?)\]])/g;
            while ((match = pattern.exec(text)) !== null) addTaggedProfile(profiles, { username: match[2] }, excludeUsername);
        });
    }

    return Object.values(profiles);
}

function profileStateFromSource(source, username) {
    const item = resolveCurrentStoryItem(source, username);
    const mediaId = item ? getStoryItemIds(item)[0] : getCurrentStoryMediaIdFromLocation();
    const profiles = extractStoryTaggedProfiles(item, username);

    return { mediaId, profiles, username };
}

function profileStateFromMediaInfo(mediaInfo, mediaId, username) {
    const item = (mediaInfo?.items || []).find(value => storyItemMatchesMediaId(value, mediaId)) || mediaInfo?.items?.[0] || null;
    const profiles = extractStoryTaggedProfiles(item, username);
    return { mediaId, profiles, username };
}

async function getCurrentStoryTaggedProfileState(username, button) {
    const usernames = getCurrentStoryUsernameCandidates(username, button);
    const mediaId = getCurrentStoryMediaIdFromLocation();
    const activeUsername = usernames[0] || username || null;
    let fallbackState = { mediaId, profiles: [], username: activeUsername };

    const visibleProfiles = extractVisibleStoryTaggedProfiles(activeUsername, button);
    if (visibleProfiles.length) return { mediaId, profiles: visibleProfiles, username: activeUsername };

    for (const candidateUsername of usernames) {
        try {
            const result = await getCachedStories(candidateUsername);
            const storyState = profileStateFromSource(result, candidateUsername);

            if (!fallbackState.mediaId && storyState.mediaId) fallbackState = { ...fallbackState, mediaId: storyState.mediaId, username: storyState.username };
            if (storyState.profiles.length) return storyState;
        }
        catch (err) {
            logger('getCurrentStoryTaggedProfileState()', err);
        }
    }

    if (mediaId) {
        try {
            const result = await getCachedMediaInfo(mediaId);
            const mediaInfoState = profileStateFromMediaInfo(result, mediaId, activeUsername);

            if (!fallbackState.mediaId && mediaInfoState.mediaId) fallbackState = { ...fallbackState, mediaId: mediaInfoState.mediaId };
            if (mediaInfoState.profiles.length) return mediaInfoState;
        }
        catch (err) {
            logger('getCurrentStoryTaggedProfileState()', err);
        }
    }

    for (const candidateUsername of usernames) {
        try {
            const result = await getCachedReelsMedia(candidateUsername);
            const reelsMediaState = profileStateFromSource(result, candidateUsername);

            if (!fallbackState.mediaId && reelsMediaState.mediaId) fallbackState = { ...fallbackState, mediaId: reelsMediaState.mediaId, username: reelsMediaState.username };
            if (reelsMediaState.profiles.length) return reelsMediaState;
        }
        catch (err) {
            logger('getCurrentStoryTaggedProfileState()', err);
        }
    }

    return fallbackState;
}

function getProfileCache() {
    return getStoryTaggedProfilesBucket('profiles');
}

function getCachedProfileState(identitySignature) {
    const cached = identitySignature ? getProfileCache()[identitySignature] : null;
    if (!cached) return null;
    if (!cached.profiles?.length || Date.now() - cached.createdAt > PROFILE_CACHE_MAX_AGE) {
        delete getProfileCache()[identitySignature];
        return null;
    }
    return cached;
}

function setCachedProfileState(identitySignature, profileState) {
    if (!identitySignature || !profileState?.profiles?.length) return;
    getProfileCache()[identitySignature] = {
        mediaId: profileState.mediaId || '',
        username: profileState.username || '',
        profiles: profileState.profiles.map(profile => ({ username: profile.username, href: profile.href || `https://www.instagram.com/${profile.username}/` })),
        createdAt: Date.now()
    };
}

function showStoryTaggedProfilesDialog(profiles, mediaId) {
    $('.IG_POPUP_DIG').remove();
    IG_createDM(false, false);
    $('.IG_POPUP_DIG #post_info').text(`${_i18n('TAGGED_PROFILES')}: ${mediaId || '-'}`);

    const $body = $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY');
    $body.empty();

    if (!profiles.length) {
        $body.append($('<div />', { class: 'IG_TAGGED_PROFILE_EMPTY', text: _i18n('NO_TAGGED_PROFILES') }));
        return;
    }

    profiles.forEach(profile => {
        $('<a />', {
            class: 'IG_TAGGED_PROFILE_LINK',
            href: profile.href,
            target: '_blank',
            rel: 'noopener noreferrer'
        }).append($('<span />', { class: 'IG_TAGGED_PROFILE_USERNAME', text: `@${profile.username}` })).appendTo($body);
    });
}

export async function onStoryTaggedProfiles(button) {
    const username = getCurrentStoryUsername(button) || $(button).attr('data-story-owner') || null;
    const identitySignature = getCurrentStoryIdentitySignature(button);

    if (!username && !getCurrentStoryMediaIdFromLocation()) {
        showStoryTaggedProfilesDialog([], null);
        return;
    }

    const cached = getCachedProfileState(identitySignature);
    if (cached) {
        showStoryTaggedProfilesDialog(cached.profiles, cached.mediaId);
        return;
    }

    updateLoadingBar(true);
    try {
        const state = await getCurrentStoryTaggedProfileState(username, button);
        setCachedProfileState(identitySignature, state);
        showStoryTaggedProfilesDialog(state.profiles, state.mediaId);
    }
    catch (err) {
        logger('onStoryTaggedProfiles()', err);
        showStoryTaggedProfilesDialog([], getCurrentStoryMediaIdFromLocation());
    }
    finally {
        updateLoadingBar(false);
    }
}

function getStoryTaggedProfilesButtonLayout($element) {
    const hasStorySection = $element.children('section[class]').length > 0;
    const primaryRight = hasStorySection ? '6px' : '-40px';
    const secondaryRight = hasStorySection ? '-24px' : '-70px';
    const rows = ['15px', '47px', '79px'];
    const occupied = new Set();

    const markIfVisible = (selector, slot) => {
        const $control = $element.find(selector).first();
        if ($control.length > 0 && $control.css('display') !== 'none') occupied.add(slot);
    };

    markIfVisible('.IG_DWSTORY', 'primary:0');
    markIfVisible('.IG_DWNEWTAB', 'primary:1');
    markIfVisible('.IG_DWSTORY_THUMBNAIL', 'primary:2');
    markIfVisible('.IG_DWSTORY_ALL', 'secondary:0');
    markIfVisible('.IG_DWSTORY_POSITION', 'secondary:1');

    const hasSecondaryControls = occupied.has('secondary:0') || occupied.has('secondary:1');
    const slots = hasSecondaryControls
        ? ['secondary:0', 'secondary:1', 'secondary:2', 'primary:0', 'primary:1', 'primary:2']
        : ['primary:0', 'primary:1', 'primary:2', 'secondary:0', 'secondary:1', 'secondary:2'];
    const [column, row] = (slots.find(slot => !occupied.has(slot)) || 'secondary:2').split(':');

    return {
        right: column === 'primary' ? primaryRight : secondaryRight,
        top: rows[Number(row)] || rows[2]
    };
}

export function setStoryTaggedProfilesButton($element, username) {
    if ($element == null || $element.length === 0) return;

    let $button = $element.find('.IG_DWSTORY_TAGGED_PROFILES').first();
    if ($button.length === 0) {
        $button = $(`<div data-ih-locale-title="TAGGED_PROFILES" title="${_i18n('TAGGED_PROFILES')}" class="IG_DWSTORY_TAGGED_PROFILES">${SVG.TAGGED_PROFILES}</div>`);
        $element.append($button);
    }

    const layout = getStoryTaggedProfilesButtonLayout($element);
    const resolvedUsername = username || getCurrentStoryUsername($button.get(0));
    const mediaId = getCurrentStoryMediaIdFromLocation();

    $button
        .attr('data-story-owner', resolvedUsername || '')
        .attr('data-media-id', mediaId || '')
        .css({
            position: 'absolute',
            right: layout.right,
            top: layout.top,
            width: '28px',
            height: '28px',
            padding: '2px',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fff',
            borderRadius: '5px',
            color: '#000',
            cursor: 'pointer',
            lineHeight: '0',
            zIndex: 5
        });
}
