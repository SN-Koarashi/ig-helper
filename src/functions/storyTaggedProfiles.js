import { SVG, state } from "../settings";
import {
    logger, getStoryProgress, getStoryProgressIndex, updateLoadingBar,
    getMediaIdOfStoryOrHighlightFromEmbeddedJSON, getCurrentStoryItemIndex,
    getHighlightCurrentTimeElement
} from "../utils/general";
import { getHighlightStories, getStories, getUserId } from "../utils/api";
import { _i18n } from "../utils/i18n";
import { IG_createDM } from "../utils/dialog";
/*! ESLINT IMPORT END !*/

const PROFILE_CACHE_MAX_AGE = 5 * 60 * 1000;
const STORY_TIMESTAMP_TOLERANCE = 5;
const STORY_POSITION_SELECTOR = '.IG_DWSTORY_POSITION, .IG_DWHISTORY_POSITION';

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
 * pushUniqueUsername
 * @description Add a username to an array when it is not already present.
 *
 * @param  {String[]}  usernames - List of usernames to append to
 * @param  {?String}  username - Username to add
 * @return {void}
 */
function pushUniqueUsername(usernames, username) {
    if (typeof username !== 'string' || !username) return;

    const normalizedUsername = username.toLowerCase();
    if (!usernames.some(value => value.toLowerCase() === normalizedUsername)) {
        usernames.push(username);
    }
}

/**
 * getActiveStoryScope
 * @description Get the visible story section associated with a control element.
 *
 * @param  {HTMLElement|JQuery|null}  scope - Element inside the story viewer
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

    return paths[1] || null;
}

/**
 * getCurrentStoryUsernameCandidates
 * @description Build a de-duplicated list of possible story owner usernames.
 *
 * @param  {?String}  preferredUsername - Username to place first
 * @return {String[]}
 */
function getCurrentStoryUsernameCandidates(preferredUsername) {
    const usernames = [];

    pushUniqueUsername(usernames, preferredUsername);
    pushUniqueUsername(usernames, getCurrentStoryUsernameFromLocation());

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
 * getVisibleTaggedStoryTimestamp
 * @description Get the visible story item's timestamp in seconds.
 *
 * @param  {HTMLElement|JQuery|null}  scope - Element inside the story viewer
 * @return {?Number}
 */
function getVisibleTaggedStoryTimestamp(scope) {
    const $scope = getActiveStoryScope(scope);
    const $time = $scope.length ? getHighlightCurrentTimeElement($scope) : $();

    if (!$time.length) return null;

    const timestamp = Math.floor(new Date($time.attr('datetime')).getTime() / 1000);
    return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
}

/**
 * getStoryPositionText
 * @description Read the visible "current / total" position text near a story control.
 *
 * @param  {HTMLElement|JQuery|null}  scope - Element inside the story controls
 * @return {String}
 */
function getStoryPositionText(scope) {
    const $controlRoot = scope ? $(scope).parent() : $();
    return ($controlRoot.find(STORY_POSITION_SELECTOR).first().text()
        || $(STORY_POSITION_SELECTOR).first().text()).trim();
}

/**
 * getCurrentStoryIdentitySignature
 * @description Create a cache key for the currently visible story or highlight item.
 *
 * @param  {HTMLElement|JQuery|null}  scope - Tagged-profiles button element
 * @return {String}
 */
function getCurrentStoryIdentitySignature(scope) {
    const username = getCurrentStoryUsernameCandidates($(scope).attr('data-story-owner')).join('|');
    const mediaId = getCurrentStoryMediaIdFromLocation() || '';
    const highlightId = getCurrentHighlightIdFromLocation() || '';
    const positionText = getStoryPositionText(scope);
    const visibleTimestamp = getVisibleTaggedStoryTimestamp(scope) || '';

    return [location.pathname, username, mediaId, highlightId, positionText, visibleTimestamp].join('::');
}

/**
 * getGraphQLReel
 * @description Get the Story or Highlight reel from the existing GraphQL responses.
 *
 * @param  {*}  source - Story or Highlight GraphQL response
 * @return {?Object}
 */
function getGraphQLReel(source) {
    return source?.data?.xdt_api__v1__feed__reels_media?.reels_media?.[0]
        || source?.data?.xdt_api__v1__feed__reels_media__connection?.edges?.[0]?.node
        || null;
}

/**
 * getStoryItems
 * @description Read the items from a Story or Highlight GraphQL reel.
 *
 * @param  {*}  source - Story or Highlight GraphQL response
 * @return {?Object[]}
 */
function getStoryItems(source) {
    const items = getGraphQLReel(source)?.items;
    return Array.isArray(items) ? items : null;
}

/**
 * getStorySourceOwnerUsername
 * @description Read the owner from a Story or Highlight GraphQL reel.
 *
 * @param  {*}  source - Story or Highlight GraphQL response
 * @return {?String}
 */
function getStorySourceOwnerUsername(source) {
    const reel = getGraphQLReel(source);
    const username = reel?.user?.username || reel?.owner?.username;
    return typeof username === 'string' ? username : null;
}

/**
 * getStoryItemIds
 * @description Get all media ID variants exposed by a story item.
 *
 * @param  {*}  item - Story item from the reel
 * @return {String[]}
 */
function getStoryItemIds(item) {
    const ids = [item?.id, item?.pk]
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
 * @param  {*}  item - Story item from the reel
 * @param  {?String}  mediaId - Media ID to compare against
 * @return {Boolean}
 */
function storyItemMatchesMediaId(item, mediaId) {
    return mediaId != null && getStoryItemIds(item).includes(`${mediaId}`);
}

/**
 * getVisibleStoryProgress
 * @description Read the active story position from the progress UI.
 *
 * @param  {?String}  username - Story owner's username
 * @param  {HTMLElement|JQuery|null}  scope - Element inside the story controls
 * @return {?Object}
 */
function getVisibleStoryProgress(username, scope) {
    const $header = getStoryProgress(username);
    const progress = getStoryProgressIndex($header);
    if (progress != null) return progress;

    const match = getStoryPositionText(scope).match(/^(\d+)\s*\/\s*(\d+)$/);
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
 * @param  {*}  source - Story or Highlight GraphQL response
 * @param  {?String}  username - Story owner's username
 * @param  {HTMLElement|JQuery|null}  scope - Element inside the story controls
 * @return {?Object}
 */
function resolveStoryItemByProgress(source, username, scope) {
    const items = getStoryItems(source);
    const progress = getVisibleStoryProgress(username, scope);

    if (!items?.length || progress == null || !Number.isFinite(progress.current)) return null;
    if (Number.isFinite(progress.total) && progress.total !== items.length) return null;

    return items[progress.current - 1] || null;
}

/**
 * resolveStoryItemByVisibleTimestamp
 * @description Resolve the active story item by matching its visible timestamp.
 *
 * @param  {*}  source - Story or Highlight GraphQL response
 * @param  {HTMLElement|JQuery|null}  scope - Element inside the story viewer
 * @return {?Object}
 */
function resolveStoryItemByVisibleTimestamp(source, scope) {
    const items = getStoryItems(source);
    const visibleTimestamp = getVisibleTaggedStoryTimestamp(scope);

    if (!items?.length || visibleTimestamp == null) return null;

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
 * @param  {*}  source - Story or Highlight GraphQL response
 * @param  {?String}  username - Story owner's username
 * @param  {HTMLElement|JQuery|null}  scope - Element inside the story viewer
 * @return {?Object}
 */
function resolveCurrentStoryItem(source, username, scope) {
    const items = getStoryItems(source);
    if (!items?.length) return null;

    const urlMediaId = getCurrentStoryMediaIdFromLocation();
    if (urlMediaId) {
        const matchingItem = items.find(item => storyItemMatchesMediaId(item, urlMediaId));
        if (matchingItem) return matchingItem;

        if (items.some(item => getStoryItemIds(item).length)) return null;
    }

    const embeddedMediaId = getMediaIdOfStoryOrHighlightFromEmbeddedJSON(
        getCurrentStoryItemIndex(username) ?? 0, username
    );
    const embeddedItem = embeddedMediaId
        ? items.find(item => storyItemMatchesMediaId(item, embeddedMediaId))
        : null;
    if (embeddedItem) return embeddedItem;

    const timestampItem = resolveStoryItemByVisibleTimestamp(source, scope);
    if (getCurrentHighlightIdFromLocation() && timestampItem) return timestampItem;

    return resolveStoryItemByProgress(source, username, scope) || timestampItem;
}

/**
 * getCachedValue
 * @description Reuse upstream's cache and deduplicate in-flight GraphQL requests.
 *
 * @param  {Object}  bucket - Data cache bucket, e.g. state.GL_dataCache.stories
 * @param  {Object}  requestBucket - Map of in-flight requests for the same bucket
 * @param  {String}  key - Cache key, used as-is like story.js / highlight.js
 * @param  {Function}  producer - Fetches the value on a cache miss
 * @return {Promise<*>}
 */
function getCachedValue(bucket, requestBucket, key, producer) {
    if (Object.prototype.hasOwnProperty.call(bucket, key)) {
        return Promise.resolve(bucket[key]);
    }
    if (requestBucket[key]) return requestBucket[key];

    requestBucket[key] = Promise.resolve()
        .then(producer)
        .then(result => {
            bucket[key] = result;
            return result;
        })
        .finally(() => {
            delete requestBucket[key];
        });

    return requestBucket[key];
}

/**
 * getCachedStories
 * @description Get a regular-story payload from cache or the existing story API flow.
 *
 * @param  {String}  username - Story owner's username
 * @return {Promise<Object>}
 */
async function getCachedStories(username) {
    return getCachedValue(
        state.GL_dataCache.stories,
        state.GL_dataCache.storyTaggedProfiles.requests.stories,
        username,
        async () => {
            const userInfo = await getUserId(username);
            const userId = userInfo?.user?.pk ?? userInfo?.user?.id;
            if (!userId) throw new Error(`Could not resolve user ID for @${username}`);
            return getStories(String(userId), username);
        }
    );
}

/**
 * getCachedHighlightStories
 * @description Get a highlight payload from cache or the existing highlight API flow.
 *
 * @param  {String}  highlightId - Highlight ID from the URL
 * @return {Promise<Object>}
 */
async function getCachedHighlightStories(highlightId) {
    return getCachedValue(
        state.GL_dataCache.highlights,
        state.GL_dataCache.storyTaggedProfiles.requests.highlights,
        highlightId,
        async () => {
            const response = await getHighlightStories(highlightId);
            const items = response?.data?.xdt_api__v1__feed__reels_media__connection?.edges?.[0]?.node?.items;
            if (Array.isArray(items)) items.reverse();
            return response;
        }
    );
}

/**
 * extractStoryTaggedProfiles
 * @description Extract GraphQL mention stickers from the currently selected item.
 *
 * @param  {*}  item - Active story item
 * @param  {?String}  excludeUsername - Username to leave out, usually the story owner
 * @return {TaggedProfile[]}
 */
function extractStoryTaggedProfiles(item, excludeUsername) {
    const profiles = new Map();
    const stickers = Array.isArray(item?.story_bloks_stickers) ? item.story_bloks_stickers : [];

    // GraphQL: items[index].story_bloks_stickers[].bloks_sticker.sticker_data.ig_mention.username
    for (const sticker of stickers) {
        const username = sticker?.bloks_sticker?.sticker_data?.ig_mention?.username;
        if (typeof username !== 'string' || !username || username.toLowerCase() === excludeUsername?.toLowerCase()) continue;

        const key = username.toLowerCase();
        if (!profiles.has(key)) {
            profiles.set(key, {
                username,
                href: `https://www.instagram.com/${encodeURIComponent(username)}/`
            });
        }
    }
    return Array.from(profiles.values());
}

/**
 * createTaggedProfileStateFromSource
 * @description Build tagged-profile state from a story or highlight payload.
 *
 * @param  {*}  source - Story or Highlight GraphQL response
 * @param  {?String}  username - Expected story owner's username
 * @param  {HTMLElement|JQuery|null}  scope - Element inside the story viewer
 * @return {?TaggedProfileState}
 */
function createTaggedProfileStateFromSource(source, username, scope) {
    const sourceUsername = getStorySourceOwnerUsername(source);
    if (sourceUsername && username && sourceUsername.toLowerCase() !== username.toLowerCase()) {
        throw new Error(`Story owner mismatch: expected @${username}, got @${sourceUsername}`);
    }
    const ownerUsername = sourceUsername || username || null;
    const item = resolveCurrentStoryItem(source, ownerUsername, scope);
    if (!item) return null;

    const itemId = item?.pk ?? getStoryItemIds(item)[0];
    const mediaId = itemId ? `${itemId}`.split('_')[0] : getCurrentStoryMediaIdFromLocation();

    return {
        mediaId: mediaId || null,
        profiles: extractStoryTaggedProfiles(item, ownerUsername),
        username: ownerUsername
    };
}

/**
 * resolveHighlightTaggedProfiles
 * @description Look up mention stickers for the active Highlight using GraphQL.
 *
 * @param  {String}  highlightId - Highlight ID from the URL
 * @param  {?String}  activeUsername - Expected highlight owner's username
 * @param  {HTMLElement}  button - Tagged-profiles button element
 * @return {Promise<TaggedProfileState>}
 */
async function resolveHighlightTaggedProfiles(highlightId, activeUsername, button) {
    const payload = await getCachedHighlightStories(highlightId);
    const result = createTaggedProfileStateFromSource(payload, activeUsername, button);
    if (!result) throw new Error('Could not identify active highlight item');

    logger('resolveHighlightTaggedProfiles', result.profiles.length ? 'source: highlight' : 'empty');
    return result;
}

/**
 * resolveRegularStoryTaggedProfiles
 * @description Look up mention stickers for the active Story using GraphQL.
 *
 * @param  {String[]}  usernames - Candidate story owner usernames, tried in order
 * @param  {?String}  mediaId - Media ID from the URL, used when the item has none
 * @param  {HTMLElement}  button - Tagged-profiles button element
 * @return {Promise<TaggedProfileState>}
 */
async function resolveRegularStoryTaggedProfiles(usernames, mediaId, button) {
    let emptyState = null;
    let lastError = null;

    for (const candidateUsername of usernames) {
        try {
            const payload = await getCachedStories(candidateUsername);
            const result = createTaggedProfileStateFromSource(payload, candidateUsername, button);
            if (!result) continue;

            if (result.profiles.length) {
                logger('resolveRegularStoryTaggedProfiles', 'source: story');
                return result;
            }
            emptyState = { ...result, mediaId: result.mediaId || mediaId };
        }
        catch (err) {
            lastError = err;
            logger('resolveRegularStoryTaggedProfiles', 'story lookup failed', err);
        }
    }

    if (emptyState) {
        logger('resolveRegularStoryTaggedProfiles', 'empty');
        return emptyState;
    }
    throw lastError || new Error('Could not identify active story item');
}

/**
 * resolveCurrentStoryTaggedProfiles
 * @description Use the existing GraphQL response for Stories and Highlights.
 *
 * @param  {?String}  username - Story owner's username
 * @param  {HTMLElement}  button - Tagged-profiles button element
 * @return {Promise<TaggedProfileState>}
 */
async function resolveCurrentStoryTaggedProfiles(username, button) {
    const usernames = getCurrentStoryUsernameCandidates(username);
    const activeUsername = usernames[0] || username || null;
    const highlightId = getCurrentHighlightIdFromLocation();

    if (highlightId) {
        return resolveHighlightTaggedProfiles(highlightId, activeUsername, button);
    }
    return resolveRegularStoryTaggedProfiles(usernames, getCurrentStoryMediaIdFromLocation(), button);
}

/**
 * getCachedProfileState
 * @description Get a non-expired final tagged-profile result.
 *
 * @param  {String}  identitySignature - Key from getCurrentStoryIdentitySignature()
 * @return {?TaggedProfileState}
 */
function getCachedProfileState(identitySignature) {
    const profileCache = state.GL_dataCache.storyTaggedProfiles.profiles;
    const cached = identitySignature ? profileCache[identitySignature] : null;
    if (!cached) return null;

    const cacheAge = Date.now() - cached.createdAt;
    if (!cached.profiles?.length || cacheAge > PROFILE_CACHE_MAX_AGE) {
        delete profileCache[identitySignature];
        logger('getCachedProfileState', cached.profiles?.length ? 'cache expired' : 'cache invalid');
        return null;
    }

    logger('getCachedProfileState', 'cache hit');
    return cached;
}

/**
 * setCachedProfileState
 * @description Cache a successful final tagged-profile result.
 *
 * @param  {String}  identitySignature - Key from getCurrentStoryIdentitySignature()
 * @param  {TaggedProfileState}  profileState - Resolved result to cache
 * @return {void}
 */
function setCachedProfileState(identitySignature, profileState) {
    if (!identitySignature || !profileState) return;

    const profileCache = state.GL_dataCache.storyTaggedProfiles.profiles;
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
 * @param  {TaggedProfile}  profile - Profile to link to
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
 * @param  {TaggedProfile[]}  profiles - Profiles to list
 * @param  {?String}  [mediaId=null] - Media ID shown in the dialog header
 * @param  {?String}  [errorMessage=null] - Error shown instead of the list
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
        $('<section />', { class: 'IG_TAGGED_PROFILE_META' })
            .append($('<p />', { class: 'IG_TAGGED_PROFILE_MEDIA_ID' })
                .append($('<span />', { text: `${_i18n('MEDIA_ID')}:` }))
                .append($('<code />', { text: displayMediaId })))
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
 * @param  {HTMLElement}  button - Clicked tagged-profiles button
 * @return {Promise<void>}
 */
export async function onStoryTaggedProfiles(button) {
    const username = getCurrentStoryUsernameFromLocation() || $(button).attr('data-story-owner') || null;
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
            logger('onStoryTaggedProfiles', 'Discarded stale story result after navigation.');
            return;
        }

        setCachedProfileState(identitySignature, profileState);
        showStoryTaggedProfilesDialog(profileState.profiles, profileState.mediaId);
    }
    catch (err) {
        logger('onStoryTaggedProfiles', err);

        if (getCurrentStoryIdentitySignature(button) !== identitySignature) {
            logger('onStoryTaggedProfiles','Discarded stale story error after navigation.');
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
 * @param  {JQuery}  $element - Story control container to append the button to
 * @param  {?String}  username - Story owner's username
 * @return {void}
 */
export function setStoryTaggedProfilesButton($element, username) {
    if ($element == null || !$element.length) return;

    let $button = $element.find('.IG_DWSTORY_TAGGED_PROFILES').first();
    if (!$button.length) {
        $button = createStoryTaggedProfilesButton();
        $element.append($button);
    }

    const resolvedUsername = username || getCurrentStoryUsernameFromLocation();
    $button.attr('data-story-owner', resolvedUsername || '');
}
