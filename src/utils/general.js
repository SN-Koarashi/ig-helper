import { USER_SETTING, state, userIdCache, $body, SVG, LEGACY_SETTING_MIGRATIONS } from "../settings";
import { _i18n } from "./i18n";
import { getPostOwner, getUserId } from "./api";
import { getImageFromCache, mediaIdFromURL } from "./image_cache";
import { registerPostClickHandlers } from "../functions/post";
import { cleanupPostObservers, stopAllObservers, scheduleRouteCheck } from "../timer";
/*! ESLINT IMPORT END !*/

/**
 * isMacOS
 * @description Detect whether the current browser runs on macOS. Used to pick the
 *              correct modifier-key glyph in tooltips and hotkey labels.
 *
 * @return {boolean}
 */
export function isMacOS() {
    return /Macintosh|Mac OS/i.test(navigator.userAgent);
}

/**
 * getPlatformModifierKey
 * @description Return the display glyph for the Alt/Option modifier key, matching
 *              the current operating system's conventions.
 *
 * @return {string}
 */
export function getPlatformModifierKey() {
    return isMacOS() ? '⌥' : 'Alt';
}

/**
 * getStoryId
 * @description Obtain the media id through the resource URL.
 *
 * @param  {string}  url
 * @return {string}
 */
export function getStoryId(url) {
    let obj = new URL(url);
    let base64 = obj?.searchParams?.get('ig_cache_key')?.split('.').at(0);
    if (base64) {
        return atob(base64);
    }
    else {
        return null;
    }
}

/**
 * getAppID
 * @description Get Instagram App ID.
 *
 * @return {?string}
 */
export function getAppID() {
    let result = null;
    $('script[type="application/json"]').each(function () {
        const regexp = /"APP_ID":"([0-9]+)"/ig;
        const $this = $(this);
        const text = $this.text();
        const matcher = text.match(regexp);
        if (matcher != null && result == null) {
            result = [...text.matchAll(regexp)];
        }
    })

    return (result) ? result.at(0).at(-1) : null;
}

/**
 * getLSD
 * @description Get Instagram LSD.
 *
 * @return {?string}
 */
export function getLSD() {
    let result = null;
    $('script[type="application/json"][data-sjs]').each(function () {
        const regexp = /\["LSD",\[\],\{"token":"([0-9a-z_-]+)"\}/i;
        const $this = $(this);
        const text = $this.text();
        const matcher = text.match(regexp);
        if (matcher != null && result == null) {
            result = matcher[1];
        }
    })

    return result;
}

/**
 * getBloks
 * @description Get Instagram Bloks.
 *
 * @return {?string}
 */
export function getBloks() {
    let result = null;
    $('script[type="application/json"][data-sjs]').each(function () {
        const regexp = /"WebBloksVersioningID",\[\],\{"versioningID":"([0-9a-z_-]+)"\}/i;
        const $this = $(this);
        const text = $this.text();
        const matcher = text.match(regexp);
        if (matcher != null && result == null) {
            result = matcher[1];
        }
    })

    return result;
}

/**
 * getDTSG
 * @description Get Instagram DTSG.
 *
 * @return {?string}
 */
export function getDTSG() {
    let result = null;
    $('script[type="application/json"][data-sjs]').each(function () {
        const regexp = /"DTSGInitialData",\[\],\{"token":"([0-9a-z_:-]+)"\}/i;
        const $this = $(this);
        const text = $this.text();
        const matcher = text.match(regexp);
        if (matcher != null && result == null) {
            result = matcher[1];
        }
    })

    return result;
}

/**
 * getSiteData
 * @description Get Instagram SiteData.
 *
 * @return {?string}
 */
export function getSiteData() {
    let result = null;
    $('script[type="application/json"][data-sjs]').each(function () {
        const regexp = /"SiteData",\[\],\{/i;
        const $this = $(this);
        const text = $this.text();
        const matcher = text.match(regexp);
        if (matcher != null && result == null) {
            result = text;
        }
    })

    const siteData = result ? findConfig(JSON.parse(result), "SiteData") : null;
    return siteData;
}

/**
 * getJazoest
 * @description Get Instagram jazoest.
 *
 * @return {?string}
 */
export function getJazoest(fbDtsg) {
    if (!fbDtsg) return "";
    let sum = 0;
    for (let i = 0; i < fbDtsg.length; i++) {
        sum += fbDtsg.charCodeAt(i);
    }
    return "2" + sum;
}

/**
 * findConfig
 * @description Find the configuration object with the specified name in the given data structure.
 *
 * @return {?string}
 */
export function findConfig(data, name) {
    const stack = [data];
    while (stack.length) {
        const node = stack.pop();
        if (Array.isArray(node)) {
            if (node[0] === name && node.length >= 3 &&
                node[2] && typeof node[2] === "object" && !Array.isArray(node[2])) {
                return node[2];
            }
            stack.push(...node);
        } else if (node && typeof node === "object") {
            stack.push(...Object.values(node));
        }
    }
    return null;
}

/**
 * rand6
 * @description Generate a random 6-character string.
 *
 * @return {string}
 */
function rand6() {
    return Math.floor(Math.random() * 2 ** 31).toString(36).padStart(6, "0");
}


export function genWebSessionId() {
    return `${rand6()}:${rand6()}:${rand6()}`;
}

/**
 * getTimeElementBaseDateSource
 * @description Get the base date text source and cache key from a time element.
 *
 * @param  {JQuery}  $time
 * @return {{dateText: ?string, cacheKey: ?string}}
 */
function getTimeElementBaseDateSource($time) {
    const titleText = $time.attr('title')?.trim();
    if (titleText) {
        return {
            dateText: titleText,
            cacheKey: `title:${titleText}`
        };
    }

    const datetime = $time.attr('datetime')?.trim();
    if (datetime) {
        const date = new Date(datetime);
        if (!Number.isNaN(date.getTime())) {
            return {
                dateText: new Intl.DateTimeFormat(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                }).format(date),
                cacheKey: `datetime:${datetime}`
            };
        }
    }

    return {
        dateText: null,
        cacheKey: null
    };
}

/**
 * getTimeElementBaseDateText
 * @description Get the preserved absolute date text from a time element.
 *
 * @param  {JQuery}  $time
 * @return {?string}
 */
function getTimeElementBaseDateText($time) {
    const preservedText = $time.attr('data-ih-original-date')?.trim();
    const preservedKey = $time.attr('data-ih-original-date-key')?.trim();
    const { dateText, cacheKey } = getTimeElementBaseDateSource($time);

    if (preservedText && preservedKey && cacheKey && preservedKey === cacheKey) {
        return preservedText;
    }

    if (dateText && cacheKey) {
        $time.attr('data-ih-original-date', dateText);
        $time.attr('data-ih-original-date-key', cacheKey);
        return dateText;
    }

    return null;
}

/**
 * setTimeElementDateAndLocaleTime
 * @description Replace time element text with absolute date and localized time.
 *
 * @param  {JQuery}  $time
 * @return {void}
 */
export function setTimeElementDateAndLocaleTime($time) {
    if ($time == null || $time.length === 0) {
        return;
    }

    const datetime = $time.attr('datetime');
    if (!datetime) {
        return;
    }

    const date = new Date(datetime);
    if (Number.isNaN(date.getTime())) {
        return;
    }

    const dateText = getTimeElementBaseDateText($time);
    if (!dateText) {
        return;
    }

    const localeTime = new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit'
    }).format(date);

    if (!localeTime) {
        return;
    }

    const finalText = `${dateText} ${localeTime}`;

    if ($time.text()?.trim() !== finalText) {
        $time.text(finalText);
        $time.css('white-space', 'break-spaces');
    }
}

/**
 * getHighlightCurrentTimeElement
 * @description Get the publish time element in the current highlight view.
 *
 * @param  {JQuery}  $element
 * @return {JQuery}
 */
export function getHighlightCurrentTimeElement($element) {
    if ($element == null || $element.length === 0) {
        $element = $body;
    }

    let $section = $element.closest('section:visible');
    if ($section.length === 0) {
        $section = $('body > div section:visible').last();
    }

    if ($section.length === 0) {
        return $();
    }

    let $times = $section.find('time[datetime]').filter(function () {
        const $time = $(this);

        return (
            $time.is(':visible') &&
            $time.closest('a[href^="/stories/highlights/"]').length === 0 &&
            $time.closest('[role="button"]').length === 0
        );
    });

    if ($times.length === 0) {
        return $();
    }

    return $times.first();
}

/**
 * updateLoadingBar
 * @description Update loading state.
 *
 * FIX: this function previously manipulated Instagram's root application
 * container directly (div[id^="mount"] > div > div > div:first),
 * removing a layout class and increasing its z-index to 20000. If
 * updateLoadingBar(false) failed to run for any reason (for example, an
 * unexpected exception somewhere in the async download chain), Instagram's
 * container remained permanently in the "modified" state, which broke its
 * own click/key dispatch until refresh — exactly the freeze bug seen during
 * rapid navigation between stories.
 *
 * The function now uses a dedicated script element instead (see the CSS
 * for #IG_HELPER_LOADING_OVERLAY injected below), which has
 * pointer-events: none. This guarantees that, regardless of what happens
 * next (including if the "loading" state remains stuck at true for an
 * unexpected reason), the overlay can never intercept clicks or key presses —
 * at worst, a loading bar remains visible; the Instagram application itself
 * does not become blocked.
 *
 * @param  {Boolean}  isLoading - Check if loading state
 * @return {void}
 */
export function updateLoadingBar(isLoading) {
    let $overlay = $('#IG_HELPER_LOADING_OVERLAY');

    if ($overlay.length === 0) {
        $overlay = $('<div id="IG_HELPER_LOADING_OVERLAY"></div>').appendTo(document.body);
    }

    $overlay.toggleClass('is-active', !!isLoading);
}

/**
 * getStoryProgress
 * @description Get the story progress of the username (post several stories).
 *
 * @param  {String}  username - Get progress of username
 * @return {Object}
 */
export function getStoryProgress(username) {
    const lowerUsername = username?.toLowerCase();
    let $header = $('body > div section:visible a[href^="/' + (username) + '"] span').filter(function () {
        const $this = $(this);
        return $this.children().length === 0 && $this.find('svg').length === 0 && $this.text()?.toLowerCase() === lowerUsername;
    }).parents('div:not([class]):not([style])').filter(function () {
        return $(this).text()?.toLowerCase() !== lowerUsername
    }).filter(function () {
        return $(this).children().length > 1
    }).first();

    if ($header.length === 0) {
        $header = $('body > div section:visible a[href^="/' + (username) + '"]').filter(function () {
            return $(this).find('img').length > 0
        }).parents('div:not([class]):not([style])').filter(function () {
            return $(this).text()?.toLowerCase() !== lowerUsername
        }).filter(function () {
            return $(this).children().length > 1
        }).first();
    }

    return $header.children().filter(function () {
        return $(this).height() < 10
    }).first().children();
}

/**
 * getStoryProgressIndex
 * @description Get the current story index and total count from Instagram's progress bar.
 *
 * @param  {Object}  $header - Progress bar items returned by getStoryProgress
 * @return {?Object}
 */
export function getStoryProgressIndex($header) {
    let current = 0;
    let total = $header.length;

    if (total === 0) {
        return null;
    }

    $header.each(function (index) {
        if ($(this).children().length > 0) {
            current = index + 1;
        }
    });

    if (current === 0) {
        return null;
    }

    return { current, total };
}

/**
 * setStoryProgressIndexText
 * @description Render the current story index and total count.
 *
 * @param  {Object}  $element - Element to append the counter to
 * @param  {Object}  $header - Progress bar items returned by getStoryProgress
 * @param  {String}  className - Counter class name
 * @return {void}
 */
export function setStoryProgressIndexText($element, $header, className) {
    let progress = getStoryProgressIndex($header);

    if (progress == null) {
        // Don't tear the counter down reactively during transient header-detection
        // mid-transition — leave whatever's there untouched so it updates smoothly in-place.
        return;
    }

    if (progress.total < 2) {
        $element.find('.' + className).remove();
        return;
    }

    let $counter = $element.find('.' + className).first();
    let text = progress.current + '/' + progress.total;
    let title = _i18n('ITEM_POSITION')
        .replace('%CURRENT%', progress.current)
        .replace('%TOTAL%', progress.total);

    if ($counter.length === 0) {
        $counter = $('<div>').addClass(className);
        $element.append($counter);
    }

    if ($counter.text() !== text) {
        $counter.text(text);
    }

    if ($counter.attr('title') !== title) {
        $counter.attr('title', title);
    }

    if ($counter.attr('aria-label') !== title) {
        $counter.attr('aria-label', title);
    }
}

/**
 * setStoryProgressIndexByUsername
 * @description Render current story index and total count from a username.
 *
 * @param  {Object}  $element - Element to append the counter to
 * @param  {String}  username - Story owner's username
 * @param  {String}  className - Counter class name
 * @return {void}
 */
export function setStoryProgressIndexByUsername($element, username, className) {
    if ($element == null || $element.length === 0 || username == null) {
        return;
    }

    let $header = getStoryProgress(username);
    setStoryProgressIndexText($element, $header, className);
}

/**
 * getMediaIdOfStoryOrHighlightFromEmbeddedJSON
 * @description Reads the pk of the currently-viewed Story OR Highlight
 *              item straight out of Instagram's own server-rendered
 *              xdt_api__v1__feed__reels_media payload.
 *
 *              For Highlights, the embedded payload is accepted only
 *              when its highlight node id exactly matches the numeric
 *              highlight ID from the current /stories/highlights/<id>/ URL.
 *              This prevents a stale DOM payload from another highlight
 *              being used after client-side navigation.
 *
 *              For Stories, the existing reels_media[0].items shape
 *              remains supported.
 *
 * @param  {Number}  [itemIndex=0] - 0-based index of the Story/Highlight
 *                    item currently visible in the viewer (see
 *                    getCurrentStoryItemIndex()). Defaults to 0.
 * @param  {?String}  [expectedUsername=null] - Expected Story owner. On regular
 *                    Story pages, when omitted, it is derived from the current
 *                    /stories/<username>/... URL and must match the embedded
 *                    payload owner. Ignored for Highlights.
 * @return {?string}  pk of the embedded item, or null if absent/unparseable or
 *                    the Story owner does not match the current URL.
 */
export function getMediaIdOfStoryOrHighlightFromEmbeddedJSON(itemIndex = 0, expectedUsername = null) {
    const idx = Number.isInteger(itemIndex) && itemIndex >= 0 ? itemIndex : 0;
    const isHighlightPage = location.pathname.startsWith('/stories/highlights/');

    // For regular Stories, always derive the expected owner from the current
    // /stories/<username>/... URL when the caller did not provide one. This
    // prevents a stale embedded payload from another user's story tray from
    // being accepted merely because it contains a valid reels_media item.
    if (!isHighlightPage && !expectedUsername) {
        const pathParts = location.pathname.split('/').filter(Boolean);
        if (pathParts[0] === 'stories' && pathParts[1]) {
            expectedUsername = decodeURIComponent(pathParts[1]);
        }
    }
    const highlightId = isHighlightPage
        ? location.pathname.replace(/\/+$/, '').split('/').filter(Boolean).at(-1)
        : null;
    const expectedHighlightNodeId = /^\d+$/.test(highlightId || '')
        ? `highlight:${highlightId}`
        : null;

    function findKeyDeep(obj, key, depth = 12) {
        if (!obj || typeof obj !== 'object' || depth < 0) return undefined;
        if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key];

        for (const k in obj) {
            const val = obj[k];
            if (val && typeof val === 'object') {
                const found = findKeyDeep(val, key, depth - 1);
                if (found !== undefined) return found;
            }
        }

        return undefined;
    }

    /*
     * extractPkFromCompositeStoryId: some single-item Story payloads omit
     * "pk" entirely and only carry a composite "id" shaped like
     * "<pk>_<userId>" (e.g. "3980127151482536531_4032195876"). Returns
     * the numeric part before the first underscore, or null if the id
     * doesn't match that shape.
     */
    function extractPkFromCompositeStoryId(id) {
        if (typeof id !== 'string') return null;

        const underscorePos = id.indexOf('_');
        if (underscorePos === -1) return null;

        const candidate = id.slice(0, underscorePos);
        return /^\d+$/.test(candidate) ? candidate : null;
    }

    /*
     * getDirectItemPk: resolves an item's own "pk" (never item.user.pk).
     * Falls back to extractPkFromCompositeStoryId() whenever an item
     * has no "pk" of its own but does have a composite "id" — this
     * fallback only ever activates in the absence of a direct "pk", so
     * it applies the same way to both Stories and Highlights.
     */
    function getDirectItemPk(item) {
        if (!item || typeof item !== 'object') return null;
        if (Object.prototype.hasOwnProperty.call(item, 'pk')) return item.pk;

        return extractPkFromCompositeStoryId(item.id);
    }

    /*
     * countDirectItemPks: counts how many entries in the `items` array
     * resolve to a usable, item-level pk via getDirectItemPk() — i.e.
     * their OWN "pk" (deliberately ignoring anything nested deeper, like
     * item.user.pk), or the composite-id fallback above. Used to tell
     * whether the embedded payload actually reaches as far as the item
     * we need — IG's server-rendered payload is not guaranteed to
     * contain every item of a long Highlight/Story, so a raw
     * items.length check would still trust an array that looks
     * complete but silently stops short of the visible item.
     */
    function countDirectItemPks(items) {
        if (!Array.isArray(items)) return 0;
        return items.reduce((count, item) => (
            count + (getDirectItemPk(item) ? 1 : 0)
        ), 0);
    }

    /*
     * FIX (truncated data-sjs recovery): large Highlights (many items,
     * each with a huge video_dash_manifest) can get cut off mid-string
     * by IG's own rendering — the tag's real textContent.length ends up
     * shorter than its own data-content-len attribute says it should
     * be. JSON.parse() on such a tag always throws, even though the
     * item we actually need (index 0's pk) usually sits well BEFORE the
     * point of truncation. This does a narrow string-search recovery
     * for that one specific, common case — first item only, Highlight
     * pages only, since the node.id used to pick the right edge is also
     * near the front of the string. Anything else (itemIndex > 0, or a
     * truncated Story tag) safely returns null and falls through to
     * resolveMediaIdOfStoryOrHighlightByTimestamp() same as before.
     */
    function recoverFirstItemPkFromTruncatedHighlight(text, nodeIdMarker) {
        const nodePos = text.indexOf(nodeIdMarker);
        if (nodePos === -1) return null;

        const itemsMarker = '"items":[';
        const itemsPos = text.indexOf(itemsMarker, nodePos);
        if (itemsPos === -1) return null;

        const slice = text.slice(itemsPos + itemsMarker.length, itemsPos + itemsMarker.length + 200);
        const m = slice.match(/^\{"pk":"(\d+)"/);
        return m ? m[1] : null;
    }

    let result = null;

    $('script[type="application/json"][data-sjs]').each(function () {
        if (result) return;

        const text = $(this).text();
        if (!text.includes('xdt_api__v1__feed__reels_media')) return;

        try {
            const parsed = JSON.parse(text);
            const reelsMedia = findKeyDeep(parsed, isHighlightPage ? 'xdt_api__v1__feed__reels_media__connection' : 'xdt_api__v1__feed__reels_media')
                || findKeyDeep(parsed, 'xdt_api__v1__feed__reels_media')
                || findKeyDeep(parsed, 'xdt_api__v1__feed__reels_media__connection');
            if (!reelsMedia) return;

            let items = null;

            if (isHighlightPage) {
                // A Highlight payload may remain in the DOM after SPA navigation.
                // Accept it only when the embedded node belongs to the current URL.
                if (!expectedHighlightNodeId) return;

                const edges = reelsMedia?.edges;
                const matchingEdge = Array.isArray(edges)
                    ? edges.find(edge => String(edge?.node?.id ?? '') === expectedHighlightNodeId)
                    : null;

                if (!matchingEdge) {
                    logger('[getMediaIdOfStoryOrHighlightFromEmbeddedJSON]', 'stale/mismatched highlight node, expected:', expectedHighlightNodeId, 'edges:', edges?.map(e => e?.node?.id));
                    return;
                }

                items = matchingEdge.node?.items;
            }
            else {
                items = reelsMedia?.reels_media?.[0]?.items;

                const ownerUsername = reelsMedia?.reels_media?.[0]?.user?.username;
                if (expectedUsername) {
                    if (!ownerUsername || ownerUsername.toLowerCase() !== expectedUsername.toLowerCase()) {
                        logger('[getMediaIdOfStoryOrHighlightFromEmbeddedJSON]', 'stale/mismatched story owner, expected:', expectedUsername, 'got:', ownerUsername ?? null);
                        return;
                    }
                }
            }

            const pkCount = countDirectItemPks(items);

            if (idx >= pkCount) {
                logger('[getMediaIdOfStoryOrHighlightFromEmbeddedJSON]', 'payload incomplete: only', pkCount, 'direct pk(s) present, requested index:', idx);
                return;
            }

            const item = items[idx];
            const pk = getDirectItemPk(item);

            if (pk) result = String(pk);
        }
        catch (e) {
            const declaredLen = parseInt(this.getAttribute('data-content-len') || '', 10);
            const isTruncated = Number.isFinite(declaredLen) && text.length < declaredLen;

            logger('[getMediaIdOfStoryOrHighlightFromEmbeddedJSON]', isTruncated ? 'tag truncated:' : 'tag not parseable, len:', text.length, isTruncated ? `/ ${declaredLen}` : e.message);

            if (isTruncated && isHighlightPage && idx === 0 && expectedHighlightNodeId) {
                const recoveredPk = recoverFirstItemPkFromTruncatedHighlight(text, `"id":"${expectedHighlightNodeId}"`);
                if (recoveredPk) {
                    logger('[getMediaIdOfStoryOrHighlightFromEmbeddedJSON]', 'recovered pk from truncated tag:', recoveredPk);
                    result = recoveredPk;
                }
            }
        }
    });

    if (result) {
        logger('[getMediaIdOfStoryOrHighlightFromEmbeddedJSON]', 'found:', result, 'at index:', idx);
    }

    return result;
}

/**
 * getCurrentStoryItemIndex
 * @description Resolves the 0-based index of the Story/Highlight item
 *              currently visible in the viewer, read from Instagram's
 *              own progress-bar segments — the same data
 *              IG_DWSTORY_POSITION (setStoryProgressIndexText/
 *              getStoryProgressIndex) uses to show "current/total".
 *              Used so getMediaIdOfStoryOrHighlightFromEmbeddedJSON()
 *              picks the item matching what's on screen instead of
 *              always assuming the first one in the embedded payload.
 *
 * @param  {String}  username - Story/Highlight owner's username
 * @return {?Number}          - 0-based index, or null if undetermined
 *                    (no progress bar found — caller should fall back
 *                    to index 0)
 */
export function getCurrentStoryItemIndex(username) {
    const $header = getStoryProgress(username);
    const progress = getStoryProgressIndex($header);

    return progress ? progress.current - 1 : null;
}

/**
 * getVisibleStoryTimestamp
 * @description Captures the currently visible Story/Highlight <time datetime>
 *              value before any asynchronous API request can change the DOM.
 *              The captured Unix timestamp is later passed to the media-id
 *              resolver so it does not re-read a potentially changed Story.
 *
 * @return {?Number} Unix timestamp in seconds, or null if unavailable/invalid
 */
export function getVisibleStoryTimestamp() {
    const $time = $(
        'body > div section:visible time[datetime]'
    ).filter(function () {
        const $this = $(this);
        return (
            $this.is(':visible') &&
            $this.closest('a[href^="/stories/highlights/"]').length === 0 &&
            $this.closest('[role="button"]').length === 0
        );
    }).first();

    if ($time.length === 0) return null;

    const visibleTs = Math.floor(new Date($time.attr('datetime')).getTime() / 1000);
    return Number.isFinite(visibleTs) && visibleTs !== 0
        ? visibleTs
        : null;
}

/**
 * resolveMediaIdOfStoryOrHighlightByTimestamp
 * @description Identifies the currently visible Story or Highlight item by
 *              comparing a timestamp captured from the viewer DOM before
 *              the API request with the timestamps in the fetched items.
 *              More reliable than index-based DOM mapping because it does
 *              not depend on CSS class names or progress-bar structure.
 *
 * @param  {Object}  mediaResponse - Full getStories() / getHighlightStories() response
 * @param  {?Number} visibleTs     - Timestamp captured before the API request
 * @return {?String}                - Best-matching item id, or null if undetermined
 */
export function resolveMediaIdOfStoryOrHighlightByTimestamp(mediaResponse, visibleTs) {
    const items =
        mediaResponse?.data?.xdt_api__v1__feed__reels_media__connection?.edges?.[0]?.node?.items ||
        mediaResponse?.data?.xdt_api__v1__feed__reels_media?.reels_media?.[0]?.items ||
        mediaResponse?.data?.reels_media?.[0]?.items;
    if (!items || items.length === 0) return null;
    if (!Number.isFinite(visibleTs) || visibleTs === 0) return null;

    let bestId = null;
    let minDiff = Infinity;

    items.forEach(item => {
        const diff = Math.abs((item.taken_at_timestamp || item.taken_at || 0) - visibleTs);
        if (diff < minDiff) {
            minDiff = diff;
            bestId = item.pk ?? item.id;
        }
    });

    logger('[resolveMediaIdOfStoryOrHighlightByTimestamp]', 'best match:', bestId, 'diff(s):', minDiff);
    return bestId;  // always return best match, better than any index heuristic
}

/**
 * getVisibleImageMediaId
 * @description DOM-derived last-resort candidate: extracts a mediaId
 *              from the ig_cache_key query param of the currently-visible
 *              <img> in the Story/Highlight viewer (same technique v4
 *              used). Works for the visible resource regardless of
 *              whether it turns out to be a photo or a video item —
 *              IG still renders a poster-like <img> either way — so it
 *              is used by both onStory() and onHighlightsStory(), which
 *              each handle photo AND video items in one function.
 *              Tried only when both the DOM JSON fast path
 *              (getMediaIdOfStoryOrHighlightFromEmbeddedJSON) and
 *              resolveMediaIdOfStoryOrHighlightByTimestamp() found
 *              nothing.
 *
 * @return {?String} mediaId decoded from the visible <img>, or null if none found
 */
export function getVisibleImageMediaId() {
    let domSrcset = $('body > div section:visible img[referrerpolicy][class], body > div section:visible img[crossorigin][class]:not([alt])').attr('srcset')?.split(',')[0]?.split(' ')[0];

    let domLink = (domSrcset)
        ? domSrcset
        : $('body > div section:visible img[referrerpolicy][class], body > div section:visible img[crossorigin][class]:not([alt])').filter(function () {
            const $this = $(this);
            return $this.parents('a').length === 0 && $this.width() === $this.parent().width();
        }).attr('src');

    if (!domLink) {
        // _aa63 mean stories picture in stories page (not avatar)
        let $domElement = $('body > div section:visible img._aa63');
        domLink = ($domElement.attr('srcset'))
            ? $domElement.attr('srcset')?.split(',')[0]?.split(' ')[0]
            : $domElement.attr('src');
    }

    return domLink ? getStoryId(domLink) : null;
}

/**
 * getVisibleVideoPosterMediaIds
 * @description DOM-derived last-resort candidate(s): the currently-visible
 *              <video>'s <video src="blob:..."> has no ig_cache_key of
 *              its own, but its `poster` attribute IS a real IG image
 *              URL that does carry one, decoded via mediaIdFromURL()
 *              (same technique v4 used, and the same one onReels() uses
 *              for Reel thumbnails). Shared between onStoryThumbnail()
 *              and onHighlightsStoryThumbnail(), which both target VIDEO
 *              items specifically. Tried only when both the DOM JSON
 *              fast path (getMediaIdOfStoryOrHighlightFromEmbeddedJSON)
 *              and resolveMediaIdOfStoryOrHighlightByTimestamp() found
 *              nothing.
 *
 * @return {String[]} deduplicated mediaIds, in DOM order, decoded from
 *                    every currently-visible <video>'s poster (may be empty)
 */
export function getVisibleVideoPosterMediaIds() {
    const posterMediaIds = [];
    const seenIds = new Set();

    $('body > div section:visible video').each(function () {
        const poster = this.getAttribute('poster') || this.poster;
        if (!poster) return;

        const domMediaId = mediaIdFromURL(poster);
        if (!domMediaId || seenIds.has(domMediaId)) return;

        seenIds.add(domMediaId);
        posterMediaIds.push(domMediaId);
    });

    return posterMediaIds;
}

/**
 * markContainerPositioned / restoreMarkedContainers
 * @description FIX (freeze when story buttons spawn): onStory()
 *              used to unconditionally force position:relative on Instagram's
 *              NATIVE container (needed to absolutely position our buttons
 *              inside it) without ever restoring it.
 *              This meant that on EVERY navigation between stories, at the
 *              exact moment Instagram was building/rendering the container
 *              (i.e. the exact window described as "when the buttons spawn"),
 *              we changed its stacking context live — creating a real risk of
 *              colliding with Instagram's own invisible click zones
 *              (prev/next) if the change happened while Instagram was still
 *              initializing that element.
 *
 *              markContainerPositioned() applies position:relative ONLY
 *              if the element does not already have a computed position other
 *              than static (so we do not perform a redundant mutation every
 *              time), and marks the element as "ours" with an attribute.
 *              restoreMarkedContainers() restores those elements to their
 *              initial state — called at every point where we remove the
 *              buttons (including navigation between stories and leaving
 *              the page).
 *
 * @param  {jQuery}  $el
 * @return {void}
 */
export function markContainerPositioned($el) {
    if (!$el || $el.length === 0) {
        return;
    }

    $el.each(function () {
        const $this = $(this);

        if ($this.attr('data-ihelper-owns-position') === '1') {
            return;
        }

        if ($this.css('position') === 'static') {
            $this.attr('data-ihelper-owns-position', '1');
            $this.css('position', 'relative');
        }
    });
}

export function restoreMarkedContainers() {
    $('[data-ihelper-owns-position="1"]').each(function () {
        $(this).css('position', '').removeAttr('data-ihelper-owns-position');
    });
}

/**
 * getHighlightButtonContainer
 * @description Resolve the container element where onHighlightsStory(false)
 *              attaches the .IG_DWHISTORY button, using the same fallback chain
 *              onHighlightsStory() uses. Extracted for the same reason as
 *              getStoryButtonContainer() below: so the persistent watcher
 *              (startStoryObserver) and onHighlightsStory() can never
 *              disagree about where the button belongs.
 *
 *              Note: position:relative is applied only on the "single story
 *              layout mode" fallback branch, matching the original inline
 *              logic exactly (the section._ac0a branch and the div-layout-mode
 *              branch never had it applied either) — this is a preserved quirk
 *              of the original code, not a new behavior.
 *
 * @return {jQuery}  Empty jQuery object if no container is currently resolvable.
 */
export function getHighlightButtonContainer() {
    let $element = null;

    // Default detector (section layout mode)
    if ($('body > div section._ac0a').length > 0) {
        $element = $('body > div section:visible._ac0a');
    }
    else {
        $element = $('body > div section:visible > div > div[style]:not([class])');
        markContainerPositioned($element);
    }

    // Detector for div layout mode
    if ($element.length === 0) {
        let $$element = $('body > div div:not([hidden]) section:visible > div div[class][style] > div[style]:not([class])');
        let nowSize = 0;

        $$element.each(function () {
            const $this = $(this);
            const width = $this.width();

            if (width > nowSize) {
                nowSize = width;
                $element = $this.children('div').first();
            }
        });
    }

    return $element != null ? $element.first() : $();
}

/**
 * getStoryButtonContainer
 * @description Resolve the container element where onStory(false) attaches the
 *              .IG_DWSTORY button, using the same fallback chain onStory() uses.
 *              Extracted so the persistent watcher (startStoryObserver)
 *              can watch/verify the exact container, instead of the whole mount tree,
 *              and so onStory() and the watcher can never disagree about where the
 *              button belongs.
 *
 * @return {jQuery}  Empty jQuery object if no container is currently resolvable.
 */
export function getStoryButtonContainer() {
    let $element = null;

    // Default detector (section layout mode)
    if ($('body > div section._ac0a').length > 0) {
        $element = $('body > div section:visible._ac0a');
    }
    // detector (single story layout mode)
    else {
        $element = $('body > div section:visible > div > div[style]:not([class])');
    }

    if ($element.length === 0) {
        $element = $('div[id^="mount"] section > div > a[href="/"]').parent().parent().parent().find('section:visible > div > div[style]:not([class])');
    }

    if ($element.length === 0) {
        $element = $('div[id^="mount"] section > div > a[href="/"]').parent().parent().parent().find('section:visible > div div[style]:not([class]) > div:not([data-visualcompletion="loading-state"])');
    }

    if ($element.length === 0) {
        $element = $('div[id^="mount"] section > div a[href="/"]').parents('section:visible').find('div[style]:not([class])');
    }

    // Detecter for div layout mode
    if ($element.length === 0) {
        let $$element = $('body > div div:not([hidden]) section:visible > div div[class][style] > div[style]:not([class])');
        let nowSize = 0;

        $$element.each(function () {
            const $this = $(this);
            const width = $this.width();

            if (width > nowSize) {
                nowSize = width;
                $element = $this.children('div').first();
            }
        });
    }

    return $element != null ? $element.first() : $();
}

/**
 * updateStoryThumbnailButton
 * @description Smoothly manages the presence of the story video thumbnail button.
 *              Keeps the button intact across video-to-video transitions to eliminate
 *              flicker, and fades it out smoothly when the active story is an image.
 *
 * @return {void}
 */
export function updateStoryThumbnailButton() {
    let $container = $('.IG_DWSTORY').parent();

    if ($container.length === 0) {
        $container = getStoryButtonContainer().first();
    }

    if ($container.length === 0) {
        return;
    }

    const $section = $container.closest('section:visible');
    const $scope = $section.length ? $section : $('body > div section:visible');

    // Treat presence of the volume slider or a visible video element as active video content
    const hasVideo = $scope.find('[role="slider"]').length > 0 || $scope.find('video').filter(function () {
        return $(this).is(':visible') && this.getClientRects().length > 0;
    }).length > 0;

    const $thumb = $('.IG_DWSTORY_THUMBNAIL');

    if (hasVideo) {
        if ($thumb.length === 0) {
            markContainerPositioned($container);

            $container.append(
                `<div data-ih-locale-title="VIDEO_THUMBNAIL" title="${_i18n("VIDEO_THUMBNAIL")}" class="IG_DWSTORY_THUMBNAIL">${SVG.THUMBNAIL}</div>`
            );
        } else {
            $thumb.stop(true, true).show();
        }
    } else {
        // Active story is an image -> remove any stale thumbnail.
        $thumb.remove();
    }
}

/**
 * updateHighlightThumbnailButton
 * @description Smoothly manages the presence of the highlight video thumbnail button.
 *              Keeps the button intact across video-to-video transitions to eliminate
 *              flicker, and fades it out smoothly when the active highlight is an image.
 *
 * @return {void}
 */
export function updateHighlightThumbnailButton() {
    let $container = $('.IG_DWHISTORY').parent();

    if ($container.length === 0) {
        $container = getHighlightButtonContainer().first();
    }

    if ($container.length === 0) {
        return;
    }

    const $section = $container.closest('section:visible');
    const $scope = $section.length ? $section : $('body > div section:visible');

    // Treat presence of the volume slider or a visible video element as active video content
    const hasVideo = $scope.find('[role="slider"]').length > 0 || $scope.find('video').filter(function () {
        return $(this).is(':visible') && this.getClientRects().length > 0;
    }).length > 0;

    const $thumb = $('.IG_DWHISTORY_THUMBNAIL');

    if (hasVideo) {
        if ($thumb.length === 0) {
            markContainerPositioned($container);

            $container.append(
                `<div data-ih-locale-title="VIDEO_THUMBNAIL" title="${_i18n("VIDEO_THUMBNAIL")}" class="IG_DWHISTORY_THUMBNAIL">${SVG.THUMBNAIL}</div>`
            );
        } else {
            $thumb.stop(true, true).show();
        }
    } else {
        // Active highlight is an image -> remove any stale thumbnail.
        $thumb.remove();
    }
}

/**
 * setDownloadProgress
 * @description Show and set download circle progress.
 *
 * @param  {Integer}  now
 * @param  {Integer}  total
 * @return {Void}
 */
export function setDownloadProgress(now, total) {
    // OPTIMIZATION: cache the circle wrapper lookup
    const $circle = $('.circle_wrapper');
    if ($circle.length) {
        $circle.find('span').text(`${now}/${total}`);

        if (now >= total) {
            $circle.fadeOut(250, function () {
                $(this).remove();
            });
        }
    }
    else {
        $body.append(`<div class="circle_wrapper"><circle></circle><span>${now}/${total}</span></div>`);
    }
}

/**
 * saveFiles
 * @description Download the specified media URL to the computer.
 *
 * @param  {String}  downloadLink
 * @param  {Object}  metadata
 * @param  {String}  metadata.username
 * @param  {String}  metadata.sourceType
 * @param  {Integer}  metadata.timestamp
 * @param  {String}  metadata.filetype
 * @param  {String}  metadata.shortcode
 * @param  {Integer|null}  metadata.index
 * @param  {String|null}  metadata.uid
 * @return {Promise}
 */
export function saveFiles(downloadLink, metadata) {
    return new Promise(resolve => {
        setTimeout(() => {
            updateLoadingBar(true);

            const downloadName = getSaveFileName(downloadLink, metadata);
            const { filetype, shortcode, sourceType } = metadata;

            // JPEG photos that need their EXIF rewritten must go through fetch()
            const needsExifRewrite =
                USER_SETTING.MODIFY_RESOURCE_EXIF &&
                filetype === 'jpg' &&
                shortcode &&
                sourceType === 'photo';

            if (USER_SETTING.USE_EXTERNAL_DOWNLOAD_MODE && !needsExifRewrite) {
                GM_download({
                    url: downloadLink,
                    name: downloadName,
                    onload: () => {
                        updateLoadingBar(false);
                        resolve(true);
                    },
                    // eslint-disable-next-line no-unused-vars
                    onerror: (err) => {
                        updateLoadingBar(false);
                        resolve(true);
                    },
                });
            }
            else {
                fetch(downloadLink)
                    .then(res => res.blob())
                    .then(dwel => {
                        updateLoadingBar(false);
                        return createSaveFileElement(downloadLink, dwel, metadata);
                    })
                    .then(() => resolve(true))
                    .catch(err => {
                        updateLoadingBar(false);
                        console.error('saveFiles failed:', err);
                        resolve(false);
                    });
            }
        }, 50);
    });
}

/**
 * fetchArrayBuffer
 * @description Download URL as ArrayBuffer.
 *
 * @param {string} url
 * @return {Promise<ArrayBuffer>}
 */
async function fetchArrayBuffer(url) {
    updateLoadingBar(true);
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.arrayBuffer();
    } finally {
        updateLoadingBar(false);
    }
}

/**
 * parseDashManifest
 * @description Parse Instagram Stories GraphQL video_dash_manifest (MPD XML).
 *              Returns best video/audio representation URLs.
 *
 * @param  {string} mpdXml
 * @return {{ video: any|null, audio: any|null }}
 */
function parseDashManifest(mpdXml) {
    try {
        if (!mpdXml || typeof mpdXml !== 'string') return { video: null, audio: null };

        const xml = new DOMParser().parseFromString(mpdXml, 'application/xml');
        if (xml.querySelector('parsererror')) return { video: null, audio: null };

        const reps = Array.from(xml.querySelectorAll('Representation'));
        const candidates = reps.map((rep) => {
            const base = rep.querySelector('BaseURL')?.textContent?.trim();
            if (!base) return null;

            const set = rep.closest('AdaptationSet');
            const mimeType = rep.getAttribute('mimeType') || set?.getAttribute('mimeType') || '';
            const contentType = set?.getAttribute('contentType') || '';
            const codecs = rep.getAttribute('codecs') || set?.getAttribute('codecs') || '';
            const bandwidth = parseInt(rep.getAttribute('bandwidth') || '0', 10) || 0;
            const width = parseInt(rep.getAttribute('width') || '0', 10) || 0;
            const height = parseInt(rep.getAttribute('height') || '0', 10) || 0;
            const id = rep.getAttribute('id') || '';

            return { id, url: base, mimeType, contentType, codecs, bandwidth, width, height };
        }).filter(Boolean);

        const isVideo = (c) => ((c.contentType || '').includes('video') || (c.mimeType || '').startsWith('video'));
        const isAudio = (c) => ((c.contentType || '').includes('audio') || (c.mimeType || '').startsWith('audio'));

        const bestVideo = candidates
            .filter(isVideo)
            .sort((a, b) => (b.height - a.height) || (b.bandwidth - a.bandwidth) || (b.width - a.width))[0] || null;

        const bestAudio = candidates
            .filter(isAudio)
            .sort((a, b) => (b.bandwidth - a.bandwidth))[0] || null;

        return { video: bestVideo, audio: bestAudio };
    } catch (e) {
        logger('[DASH]', 'parseDashManifest() error:', e);
        return { video: null, audio: null };
    }
}

/**
 * muxDashVideoAudioToMp4
 * @description Mux DASH video+audio into one MP4 using Mediabunny (demux + mux).
 *
 * @param {ArrayBuffer} videoBuf
 * @param {ArrayBuffer} audioBuf
 * @return {Promise<ArrayBuffer>}
 */
async function muxDashVideoAudioToMp4(videoBuf, audioBuf) {
    const MB = Mediabunny;

    const videoInput = new MB.Input({
        formats: [MB.MP4],
        source: new MB.BufferSource(videoBuf),
    });
    const audioInput = new MB.Input({
        formats: [MB.MP4],
        source: new MB.BufferSource(audioBuf),
    });

    const vTrack = await videoInput.getPrimaryVideoTrack();
    if (!vTrack || !vTrack.codec) throw new Error('No video track found');

    const aTrack = await audioInput.getPrimaryAudioTrack();
    if (!aTrack || !aTrack.codec) throw new Error('No audio track found');

    const vSink = new MB.EncodedPacketSink(vTrack);
    const aSink = new MB.EncodedPacketSink(aTrack);

    const output = new MB.Output({
        format: new MB.Mp4OutputFormat({ fastStart: 'in-memory' }),
        target: new MB.BufferTarget(),
    });

    const vSource = new MB.EncodedVideoPacketSource(vTrack.codec);
    const aSource = new MB.EncodedAudioPacketSource(aTrack.codec);

    output.addVideoTrack(vSource, { rotation: vTrack.rotation || 0 });
    output.addAudioTrack(aSource);

    await output.start();

    const vDecoderConfig = await vTrack.getDecoderConfig();
    const aDecoderConfig = await aTrack.getDecoderConfig();

    const vMeta = vDecoderConfig ? { decoderConfig: vDecoderConfig } : undefined;
    const aMeta = aDecoderConfig ? { decoderConfig: aDecoderConfig } : undefined;

    const vIter = vSink.packets();
    const aIter = aSink.packets();

    let vNext = await vIter.next();
    let aNext = await aIter.next();
    let vSentMeta = false;
    let aSentMeta = false;

    while (!vNext.done || !aNext.done) {
        const takeVideo = (() => {
            if (vNext.done) return false;
            if (aNext.done) return true;
            return vNext.value.timestamp <= aNext.value.timestamp;
        })();

        if (takeVideo) {
            await vSource.add(vNext.value, vSentMeta ? undefined : vMeta);
            vSentMeta = true;
            vNext = await vIter.next();
        } else {
            await aSource.add(aNext.value, aSentMeta ? undefined : aMeta);
            aSentMeta = true;
            aNext = await aIter.next();
        }
    }

    await output.finalize();

    const outBuf = output.target.buffer;
    if (outBuf instanceof ArrayBuffer) return outBuf;
    if (outBuf && outBuf.buffer) {
        return outBuf.buffer.slice(outBuf.byteOffset, outBuf.byteOffset + outBuf.byteLength);
    }
    throw new Error('Unexpected output buffer type');
}

async function downloadDashStreams(videoUrl, audioUrl, username, sourceType, timestamp, shortcode, thumbnailURL) {
    logger('[DASH]', 'downloadDashStreams()', {
        videoUrl: videoUrl,
        audioUrl: audioUrl || null,
        sourceType,
        shortcode
    });

    if (!audioUrl) {
        logger('[DASH]', 'Downloaded DASH video only (no audio rep / has_audio=false).');
        await saveFiles(videoUrl, {
            username,
            sourceType,
            timestamp,
            filetype: 'mp4',
            shortcode,
            thumbnailURL
        });
        return true;
    }

    try {
        logger('[DASH]', 'Fetching DASH streams for mux...');
        const [vBuf, aBuf] = await Promise.all([
            fetchArrayBuffer(videoUrl),
            fetchArrayBuffer(audioUrl)
        ]);

        logger('[DASH]', 'Muxing DASH video+audio into one MP4 (mp4box main thread)...');
        const mergedBuf = await muxDashVideoAudioToMp4(vBuf, aBuf);
        const mergedBlob = new Blob([mergedBuf], { type: 'video/mp4' });

        await createSaveFileElement(videoUrl, mergedBlob, { username, sourceType, timestamp, filetype: 'mp4', shortcode, thumbnailURL });
        logger('[DASH]', 'Merged MP4 download triggered.');
        return true;
    } catch (e) {
        logger('[DASH]', 'Mux failed -> fallback to separate downloads', e?.message || e);
        await saveFiles(videoUrl, {
            username,
            sourceType,
            timestamp,
            filetype: 'mp4',
            shortcode,
            thumbnailURL
        });
        // Same base name as the video (extension aside) is intentional here,
        // consistent with how these two fallback downloads already shared a
        // base name under AUTO_RENAME before this setting existed.
        await saveFiles(audioUrl, {
            username,
            sourceType,
            timestamp,
            filetype: 'm4a',
            shortcode,
            thumbnailURL
        });
        return true;
    }
}

/**
 * tryHandleDashFromMediaItem
 * @description Centralized DASH handling for Instagram Stories GraphQL items.
 *              Uses video_dash_manifest when present.
 *              Picks best video by resolution (height/width), then bandwidth.
 *              Audio is optional.
 *
 * @param   {Object}                    args
 * @param   {Object}                    args.mediaItem   - Instagram Stories GraphQL item.
 * @param   {string}                    args.username
 * @param   {string}                    args.sourceType
 * @param   {number}                    args.timestamp
 * @param   {string}                    args.shortcode
 * @param   {boolean}                   args.isPreview   - true = new tab; false = download.
 * @param   {number=}                   args.index
 * @return  {Promise<boolean>} true if DASH path handled it, false to let caller fallback.
 */
export async function tryHandleDashFromMediaItem({
    mediaItem,
    username,
    sourceType,
    timestamp,
    shortcode,
    isPreview,
    index
}) {
    try {
        const dashEnabled =
            USER_SETTING.PREFER_DASH_MANIFEST_FOR_STORIES_AND_HIGHLIGHTS ||
            USER_SETTING.NEW_TAB_OPEN_HIGHEST_VIDEO_VIA_GRAPHQL;
        if (!dashEnabled) return false;

        if (!mediaItem?.video_dash_manifest) {
            logger('[DASH]', 'No video_dash_manifest available; falling back to progressive video_versions[0]', { apiKind: 'reels_media' });
            return false;
        }
        if (!mediaItem?.video_versions) return false;

        const best = parseDashManifest(mediaItem.video_dash_manifest);
        const vUrl = best?.video?.url || '';
        const aUrl = best?.audio?.url || '';

        if (!vUrl) {
            return false;
        }

        const thumbnailURL = mediaItem?.image_versions2?.candidates?.[0]?.url || mediaItem?.display_url || mediaItem?.display_resources?.[0]?.src;

        logger('[DASH]', 'best reps selected', {
            apiKind: 'reels_media',
            video: best.video ? { height: best.video.height, width: best.video.width, bandwidth: best.video.bandwidth, codecs: best.video.codecs } : null,
            audio: best.audio ? { bandwidth: best.audio.bandwidth, codecs: best.audio.codecs } : '(none)'
        });

        if (isPreview) {
            // When "open highest-quality video in new tab (no
            // audio)" option is on, open the highest-bitrate video-only track;
            // otherwise fall back to the standard preview URL (video_versions[0]).
            const openHighestVideoOnly = USER_SETTING.NEW_TAB_OPEN_HIGHEST_VIDEO_VIA_GRAPHQL;

            if (openHighestVideoOnly) {
                logger('[DASH]', 'preview -> open highest-quality VIDEO-ONLY track (no audio)');
                openNewTab(vUrl);
            } else {
                const fallbackUrl = mediaItem.video_versions?.[0]?.url || vUrl;
                logger('[DASH]', 'preview -> open progressive video_versions[0] (default)');
                openNewTab(fallbackUrl);
            }
            return true;
        }

        if (!aUrl) {
            logger('[DASH]', 'download mode -> VIDEO-ONLY DASH (no audio rep)');
            await saveFiles(vUrl, {
                username,
                sourceType,
                timestamp,
                filetype: 'mp4',
                shortcode,
                index,
                thumbnailURL
            });
            return true;
        }

        logger('[DASH]', 'download mode -> DASH video+audio');
        await downloadDashStreams(vUrl, aUrl, username, sourceType, timestamp, shortcode, thumbnailURL);
        return true;
    } catch (e) {
        logger('[DASH]', 'tryHandleDashFromMediaItem failed -> fallback', e?.message || e);
        return false;
    }
}

/**
 * triggerDownload
 * @description Trigger download from Blob with filename.
 *
 * @param {Blob} blob
 * @param {string} filename
 */
export function triggerDownload(blob, filename) {
    return new Promise(resolve => {
        const url = URL.createObjectURL(blob);

        if (USER_SETTING.USE_EXTERNAL_DOWNLOAD_MODE) {
            GM_download({
                url: url,
                name: filename,
                onload: () => {
                    URL.revokeObjectURL(url);
                    resolve();
                },
                onerror: () => {
                    URL.revokeObjectURL(url);
                    resolve();
                },
            });
        }
        else {
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            link.rel = "noopener";
            link.style.display = "none";
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
                // eslint-disable-next-line no-unused-vars
                try { document.body.removeChild(link); } catch (e) { /* noop */ }
                URL.revokeObjectURL(url);
                resolve();
            }, 250);
        }
    });
}

/**
 * getSaveFileName
 * @description Get the file name for downloaded media according to the user settings and resource information.
 *
 * @param  {String}  downloadLink
 * @param  {Object}  metadata
 * @param  {String}  metadata.username
 * @param  {String}  metadata.sourceType
 * @param  {Integer}  metadata.timestamp
 * @param  {String}  metadata.filetype
 * @param  {String}  metadata.shortcode
 * @param  {Integer|null}  metadata.index
 * @param  {String|null}  metadata.uid
 * @return {String}  The generated filename
 */
export function getSaveFileName(downloadLink, metadata) {
    let { username, sourceType, timestamp, filetype, shortcode, index, uid, thumbnailURL } = metadata;

    /*
     * MATCH_VIDEO_FILENAME_TO_THUMBNAIL: for video files (and the .m4a
     * fallback saved when DASH mux fails), derive the filename from the
     * video's own thumbnail URL instead of the rename template, taking
     * priority over AUTO_RENAME/RENAME_PUBLISH_DATE. ThumbnailURL is
     * whatever the caller resolved directly from the API response/DOM.
     * If it's missing for any reason, this falls through unchanged to
     * the normal naming logic below.
     */
    if (USER_SETTING.MATCH_VIDEO_FILENAME_TO_THUMBNAIL && (filetype === 'mp4' || filetype === 'm4a') && thumbnailURL) {
        const thumbnailName = new URL(thumbnailURL).pathname.split('/').at(-1).split('.').slice(0, -1).join('.');
        return username + '_' + thumbnailName + '.' + filetype;
    }

    timestamp = parseInt(timestamp.toString().padEnd(13, '0'));
    index = (index != null) ? index : 0;

    const date = new Date(timestamp);

    const original_name = new URL(downloadLink).pathname.split('/').at(-1).split('.').slice(0, -1).join('.');
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    const second = date.getSeconds().toString().padStart(2, '0');

    var filename = state.fileRenameFormat.replace(/%([^%]+)%/g, (match, content) => {
        return `%${content.toUpperCase()}%`;
    });

    var replacements = {
        '%USERNAME%': username,
        '%SOURCE_TYPE%': sourceType,
        '%SHORTCODE%': shortcode || '',
        '%YEAR%': year,
        '%2-YEAR%': year.substr(-2),
        '%MONTH%': month,
        '%DAY%': day,
        '%HOUR%': hour,
        '%MINUTE%': minute,
        '%SECOND%': second,
        '%ORIGINAL_NAME%': original_name,
        '%ORIGINAL_NAME_FIRST%': original_name.split('_').at(0),
        '%INDEX%': index.toString(),
        '%UID%': uid || '',
    };

    // eslint-disable-next-line no-useless-escape
    filename = filename.replace(/%[\w\-]+%/g, function (str) {
        if (replacements[str] == null) {
            return str;
        }

        return replacements[str];
    });

    const originally = username + '_' + original_name + '.' + filetype;
    const downloadName = USER_SETTING.AUTO_RENAME ? filename + '.' + filetype : originally;

    return downloadName;
}


/**
 * createSaveFileElement
 * @description Download the specified media with link element.
 *
 * @param  {String}  downloadLink
 * @param  {Object}  object
 * @param  {Object}  metadata
 * @param  {String}  metadata.username
 * @param  {String}  metadata.sourceType
 * @param  {Integer}  metadata.timestamp
 * @param  {String}  metadata.filetype
 * @param  {String}  metadata.shortcode
 * @param  {Integer|null}  metadata.index
 * @param  {String|null}  metadata.uid
 * @return {void}
 */
export async function createSaveFileElement(downloadLink, object, metadata) {
    let { username, sourceType, filetype, shortcode } = metadata;

    if (metadata.uid == null) {
        username = metadata.username;
        if (!userIdCache.has(username)) {
            userIdCache.set(username, getUserId(username));
        }
        try {
            const userInfo = await userIdCache.get(username);
            metadata.uid = userInfo?.user?.id ?? null;
            // eslint-disable-next-line no-unused-vars
        } catch (err) {
            userIdCache.delete(username);
            metadata.uid = null;
        }
    }

    const downloadName = getSaveFileName(downloadLink, metadata);

    if (
        USER_SETTING.MODIFY_RESOURCE_EXIF &&
        filetype === 'jpg' &&
        shortcode &&
        sourceType === 'photo' &&
        (object.type === 'image/jpeg' || object.type === 'image/webp')
    ) {
        try {
            const newBlob = await changeExifData(object, metadata);
            await triggerDownload(newBlob, downloadName);
        } catch (err) {
            console.error('Failed to strip EXIF and/or attach post URL to EXIF.', err);
            await triggerDownload(object, downloadName);
        }
        return;
    }
    else {
        await triggerDownload(object, downloadName);
    }
}

/**
 * changeExifData
 * @description Strips EXIF metadata and attaches post URLs to the EXIF of downloaded image resources.
 *
 * @param  {Object}  blob
 * @param  {Object}  metadata
 * @param  {String}  metadata.username
 * @param  {String}  metadata.sourceType
 * @param  {Integer}  metadata.timestamp
 * @param  {String}  metadata.filetype
 * @param  {String}  metadata.shortcode
 * @param  {Integer|null}  metadata.index
 * @param  {String}  metadata.uid
 * @return {Blob}
 */
async function changeExifData(blob, metadata) {
    const concat = (...arr) => {
        const len = arr.reduce((s, a) => s + a.length, 0);
        const out = new Uint8Array(len);
        let p = 0;
        for (const a of arr) {
            out.set(a, p);
            p += a.length;
        }
        return out;
    };
    const u32le = v => {
        const b = new Uint8Array(4);
        new DataView(b.buffer).setUint32(0, v, true);
        return b;
    };
    const u16le = v => {
        const b = new Uint8Array(2);
        new DataView(b.buffer).setUint16(0, v, true);
        return b;
    };
    const enc = s => new TextEncoder().encode(s);
    const encUtf16le = s => {
        const out = new Uint8Array(s.length * 2);
        for (let i = 0; i < s.length; i++) {
            const code = s.charCodeAt(i);
            out[i * 2] = code & 0xFF;
            out[i * 2 + 1] = (code >> 8) & 0xFF;
        }
        return out;
    };
    const formatExifDate = ts => {
        let parsed = Number(ts);
        if (!Number.isFinite(parsed)) {
            parsed = Date.now();
        }
        if (parsed < 1e12) {
            parsed *= 1000;
        }

        const date = new Date(parsed);
        if (Number.isNaN(date.getTime())) {
            return '1970:01:01 00:00:00';
        }

        const y = String(date.getFullYear()).padStart(4, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');
        const ss = String(date.getSeconds()).padStart(2, '0');
        return `${y}:${m}:${d} ${hh}:${mm}:${ss}`;
    };
    const makeIFDEntry = (tag, type, count, valueOrOffset) =>
        concat(u16le(tag), u16le(type), u32le(count), u32le(valueOrOffset));
    const fourCC = (dv, o) =>
        String.fromCharCode(dv.getUint8(o), dv.getUint8(o + 1), dv.getUint8(o + 2), dv.getUint8(o + 3));

    const head = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
    const isJPEG = head[0] === 0xFF && head[1] === 0xD8;
    const isWEBP = head.length >= 12 &&
        String.fromCharCode(...head.subarray(0, 4)) === 'RIFF' &&
        String.fromCharCode(...head.subarray(8, 12)) === 'WEBP';
    if (!isJPEG && !isWEBP) throw new Error('Not a JPEG or WEBP');

    const exifDateString = `${formatExifDate(metadata.timestamp)}\0`;
    const username = `${(metadata.username || 'unknown').toString()}\0`;
    const url = `https://www.instagram.com/p/${metadata.shortcode}/`;
    const commentUrl = `https://www.instagram.com/uid/${metadata.uid || 'unknown'}`;

    const dateBytes = enc(exifDateString);
    const artistBytes = enc(username);
    const keywordBytes = encUtf16le(`${url}\0`);
    const xpCommentBytes = encUtf16le(`${commentUrl}\0`);

    const exifPrefix = enc('Exif\0\0');
    const tiffHeader = Uint8Array.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00]);

    const ifd0Count = 4;
    const exifIfdCount = 1;

    const ifd0Size = 2 + (ifd0Count * 12) + 4;
    const exifIfdOffset = 8 + ifd0Size;
    const exifIfdSize = 2 + (exifIfdCount * 12) + 4;
    const dataStartOffset = 8 + ifd0Size + exifIfdSize;

    const artistOffset = dataStartOffset;
    const keywordOffset = artistOffset + artistBytes.length;
    const xpCommentOffset = keywordOffset + keywordBytes.length;
    const dateOffset = xpCommentOffset + xpCommentBytes.length;

    const ifd0 = concat(
        u16le(ifd0Count),
        makeIFDEntry(0x013B, 2, artistBytes.length, artistOffset),                 // Artist
        makeIFDEntry(0x8769, 4, 1, exifIfdOffset),                                 // Exif Offset
        makeIFDEntry(0x9C9C, 1, xpCommentBytes.length, xpCommentOffset),           // XPComment
        makeIFDEntry(0x9C9E, 1, keywordBytes.length, keywordOffset),               // XPKeywords
        u32le(0)
    );

    const exifIfd = concat(
        u16le(exifIfdCount),
        makeIFDEntry(0x9003, 2, dateBytes.length, dateOffset),
        u32le(0)
    );

    const tiffBody = concat(tiffHeader, ifd0, exifIfd, artistBytes, keywordBytes, xpCommentBytes, dateBytes);

    if (isJPEG) {
        const ab = await blob.arrayBuffer();
        const dv = new DataView(ab);
        const app1Body = concat(exifPrefix, tiffBody);
        const app1Header = new Uint8Array(4);
        new DataView(app1Header.buffer).setUint16(0, 0xFFE1);
        new DataView(app1Header.buffer).setUint16(2, app1Body.length + 2);
        const newAPP1 = concat(app1Header, app1Body);

        const parts = [new Uint8Array(ab, 0, 2)];
        let off = 2,
            added = false;
        while (off < dv.byteLength) {
            const marker = dv.getUint16(off);
            if ((marker & 0xFF00) !== 0xFF00) break;
            if (marker === 0xFFDA) {
                if (!added) parts.push(newAPP1);
                parts.push(new Uint8Array(ab, off));
                break;
            }
            const len = dv.getUint16(off + 2) + 2;
            if (marker === 0xFFE1) {
                off += len;
                continue;
            }
            parts.push(new Uint8Array(ab, off, len));
            off += len;
        }
        const total = parts.reduce((s, a) => s + a.length, 0);
        const out = new Uint8Array(total);
        let p = 0;
        parts.forEach(a => {
            out.set(a, p);
            p += a.length;
        });
        return new Blob([out], {
            type: 'image/jpeg'
        });
    }

    const ab = await blob.arrayBuffer();
    const dv = new DataView(ab);
    const chunks = [];
    let vp8xIdx = -1;
    let offset = 12;
    while (offset < dv.byteLength) {
        const cc = fourCC(dv, offset);
        const sz = dv.getUint32(offset + 4, true);
        const pad = sz & 1;
        const full = 8 + sz + pad;
        if (cc !== 'EXIF' && cc !== 'XMP ') {
            chunks.push(new Uint8Array(ab, offset, full));
            if (cc === 'VP8X') vp8xIdx = chunks.length - 1;
        }
        offset += full;
    }
    let exifChunk = concat(
        enc('EXIF'),
        u32le(exifPrefix.length + tiffBody.length),
        exifPrefix,
        tiffBody
    );
    if (exifChunk.length & 1) exifChunk = concat(exifChunk, Uint8Array.of(0));
    if (vp8xIdx !== -1) {
        const vp8x = new Uint8Array(chunks[vp8xIdx]);
        vp8x[8] |= 0x10;
        chunks[vp8xIdx] = vp8x;
        chunks.splice(vp8xIdx + 1, 0, exifChunk);
    } else {
        chunks.push(exifChunk);
    }
    const payload = chunks.reduce((s, c) => s + c.length, 0);
    const riffHeader = concat(enc('RIFF'), u32le(payload + 4), enc('WEBP'));
    const finalBuf = concat(riffHeader, ...chunks);
    return new Blob([finalBuf], {
        type: 'image/webp'
    });
}

/**
 * triggerLinkElement
 * @description Trigger the link element to start downloading or previewing the resource.
 *
 * @param  {Object}   element     - The element containing resource link metadata.
 * @param  {Boolean}  [isPreview] - True to preview in a new tab instead of downloading.
 * @return {void}
 */
export async function triggerLinkElement($element, isPreview = false) {
    try {
        const $el = $($element);

        let date = new Date().getTime();
        let timestamp = Math.floor(date / 1000);
        let username = $el.data('username') ? $el.data('username') : state.GL_username;
        let index = parseInt($el.attr('data-globalindex') || 0, 10) || 0;

        if (!username && $el.data('path')) {
            logger('catching owner name from shortcode', $el.data('href'));
            username = await getPostOwner($el.data('path')).catch(err => {
                logger('get username failed, replace with default string, error message', err?.message);
                return null;
            });
        }

        if (username == null) username = 'NONE';

        if (USER_SETTING.RENAME_PUBLISH_DATE && $el.attr('datetime')) {
            timestamp = parseInt($el.attr('datetime'), 10) || timestamp;
        }

        const mediaId = $el.attr('media-id') || $el.attr('data-media-id') || null;
        const sourceType = $el.data('name');
        const filetype = $el.data('type') || 'jpg';
        const shortcode = $el.data('path');
        const href = $el.data('href');
        // Every video entry in these popup/batch lists renders its own thumbnail
        // as the <img> inside the same <a> (see the .videoThumbnail button, which
        // already reads this exact same src to download it directly).
        const thumbnailURL = filetype === 'mp4' ? $el.find('img').first().attr('src') : undefined;

        const downloadOnly = !isPreview;

        if (!isPreview && index < 0) {
            alert(_i18n('NO_CHECK_RESOURCE'));
            return;
        }

        if (USER_SETTING.CAPTURE_IMAGE_VIA_MEDIA_CACHE) {
            const cached = getImageFromCache(mediaId);

            if (cached && filetype !== 'mp4') {
                if (!downloadOnly && isPreview) {
                    openNewTab(cached);
                } else {
                    await saveFiles(cached, {
                        username,
                        sourceType,
                        timestamp,
                        filetype: filetype || 'jpg',
                        shortcode,
                        index
                    });
                }
                return;
            }
        }

        if (href) {
            if (!downloadOnly && isPreview) {
                openNewTab(replaceSameOriginHost(href));
            } else {
                await saveFiles(href, {
                    username,
                    sourceType,
                    timestamp,
                    filetype,
                    shortcode,
                    index,
                    thumbnailURL
                });
            }
            return;
        }

        alert('Cannot find download URL.');
    } catch (err) {
        console.error('Occur error in triggerLinkElement:', err);
        logger('Occur error in triggerLinkElement:', err);
    }
}

/**
 * replaceSameOriginHost
 * @description Replace the host of the URL to bypass the same-origin policy for certain video resources that cannot be downloaded directly.
 *
 * @param  {string}  url
 * @return {string}
 */
export function replaceSameOriginHost(url) {
    // replace https://instagram.ftpe8-2.fna.fbcdn.net/ to https://scontent.cdninstagram.com/ becase of same origin policy (some video)
    var urlObj = new URL(url);
    urlObj.host = 'scontent.cdninstagram.com';

    return urlObj.href;
}

/**
 * checkingScriptUpdate
 * @description Check if there is a new version of the script and push notification.
 *
 * @param  {Integer}  interval
 * @return {void}
 */
export function checkingScriptUpdate(interval) {
    if (!USER_SETTING.CHECK_FOR_UPDATE) return;

    const check_timestamp = GM_getValue('G_CHECK_TIMESTAMP') ?? new Date().getTime();
    const now_time = new Date().getTime();

    if (now_time > (parseInt(check_timestamp) + (interval * 1000))) {
        GM_setValue('G_CHECK_TIMESTAMP', new Date().getTime());
        callNotification();
    }
}

/**
 * callNotification
 * @description Call desktop notification by browser.
 *
 * @return {void}
 */
export function callNotification() {
    const currentVersion = GM_info.script.version;
    const remoteScriptURL = 'https://raw.githubusercontent.com/SN-Koarashi/ig-helper/refs/heads/master/main.js';

    GM_xmlhttpRequest({
        method: "GET",
        url: remoteScriptURL,
        onload: function (response) {
            const remoteScript = response.responseText;
            const match = remoteScript.match(/\/\/\s+@version\s+([0-9.\-a-zA-Z]+)/i);

            if (match && match[1]) {
                const remoteVersion = match[1];
                logger('Current version: ', currentVersion, '|', 'Remote version: ', remoteVersion);

                if (remoteVersion !== currentVersion) {
                    GM_notification({
                        text: _i18n("NOTICE_UPDATE_CONTENT"),
                        title: _i18n("NOTICE_UPDATE_TITLE"),
                        tag: 'ig_helper_notice',
                        highlight: true,
                        timeout: 5000,
                        zombieTimeout: 5000,
                        image: "https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://www.instagram.com&size=64",
                        onclick: (event) => {
                            event?.preventDefault();
                            var w = GM_openInTab(GM_info.script.downloadURL);
                            setTimeout(() => {
                                w.close();
                            }, 250);
                        }
                    });
                } else {
                    logger('there is no new update');
                }
            } else {
                console.error('Could not find version in the remote script.');
            }
        }
    });
}

/**
 * openNewTab
 * @description Open URL in new tab.
 *
 * @param  {String}  link
 * @return {void}
 */
export function openNewTab(link) {
    var a = document.createElement('a');
    a.href = link;
    a.target = '_blank';

    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => { updateLoadingBar(false); }, 125);
}

/**
 * reloadScript
 * @description Reset all injected UI and state, then re-run the route handler
 *              (replaces the old "re-register main timer" behavior).
 *
 * @return {void}
 */
export function reloadScript() {
    clearInterval(state.GL_repeat);
    clearInterval(state.GL_dialogTimer);
    clearInterval(state.GL_profileTimer);
    clearInterval(state.GL_reelsTimer);
    cleanupPostObservers();

    // OPTIMIZATION: use cached $body and combine .off() calls
    $body.off('.igHelperPost');
    state.bodyEventsRegistered = false;

    $('.button_wrapper').remove();
    $('.IG_DWPROFILE, .IG_DWPROFILE, .IG_DWSTORY, .IG_DWSTORY_ALL, .IG_DWSTORY_THUMBNAIL, .IG_DWSTORY_POSITION, .IG_DWNEWTAB, .IG_DWHISTORY, .IG_DWHISTORY_ALL, .IG_DWHINEWTAB, .IG_DWHISTORY_THUMBNAIL, .IG_DWHISTORY_POSITION, .IG_REELS, .IG_REELS_NEWTAB, .IG_REELS_THUMBNAIL').remove();
    restoreMarkedContainers();
    $('[data-snig]').removeAttr('data-snig');

    state.pageLoaded = false;
    state.firstStarted = false;
    state.currentURL = location.href;
    stopAllObservers();

    // Re-register delegated click handlers
    registerPostClickHandlers();

    // Re-run the route handler (also reconnects the right observer)
    scheduleRouteCheck();

    logger('script reload completed');
}

/**
 * sanitizeForLog
 * @description Convert DOM nodes and jQuery objects into short strings, so the
 *              in-memory log never keeps detached DOM trees alive.
 *
 * @param  {*}  item
 * @return {*}
 */
function sanitizeForLog(item) {
    if (item == null) return item;
    if (item instanceof jQuery) {
        const el = item[0];
        return `[jQuery: ${el ? el.tagName + (el.id ? '#' + el.id : '') + (el.className ? '.' + String(el.className).trim().split(/\s+/).slice(0, 3).join('.') : '') : 'empty'}]`;
    }
    if (item instanceof Element) {
        return `[Element: ${item.tagName}${item.id ? '#' + item.id : ''}${item.className ? '.' + String(item.className).trim().split(/\s+/).slice(0, 3).join('.') : ''}]`;
    }
    return item;
}

/**
 * logger
 * @description Event record.
 *
 * @return {void}
 */
export function logger(...messages) {
    var dd = new Date();
    state.GL_logger.push({
        time: dd.getTime(),
        content: messages.map(sanitizeForLog)
    });

    if (state.GL_logger.length > 200) {
        state.GL_logger.splice(0, state.GL_logger.length - 200);
    }

    console.log(`[${dd.toISOString()}]`, ...messages);
}

/**
 * initSettings
 * @description Initialize preferences.
 *
 * @return {void}
 */
export function initSettings() {
    for (const [legacyName, currentName] of Object.entries(LEGACY_SETTING_MIGRATIONS)) {
        const legacyValue = GM_getValue(legacyName);
        if (GM_getValue(currentName) == null && typeof legacyValue === 'boolean') {
            GM_setValue(currentName, legacyValue);
        }
    }

    for (let name in USER_SETTING) {
        if (GM_getValue(name) != null && typeof GM_getValue(name) === 'boolean') {
            USER_SETTING[name] = GM_getValue(name);

            if (name === "MODIFY_VIDEO_VOLUME" && GM_getValue(name) !== true) {
                state.videoVolume = 1;
            }
        }
    }
}


/**
 * toggleVolumeSilder
 * @description Toggle display of custom volume slider.
 *
 * @param  {object}  $videos
 * @param  {object}  $buttonParent
 * @param  {string}  loggerType
 * @param  {string}  customClass
 * @return {void}
 */
export function toggleVolumeSilder($videos, $buttonParent, loggerType, customClass = "") {
    // Set initial volume listener only once per video
    $videos.each(function () {
        const $this = $(this);
        $this.one('play playing', function () {
            if (!$this.data('volume-slider')) {
                $this.data('volume-slider', true);
                this.volume = state.videoVolume;
                //logger(`(${loggerType})`, 'video volume changed #volume-slider');
            }
        });
    });

    if ($buttonParent.find('div.volume_slider').length > 0) {
        return;
    }

    const $newSlider = $('<div class="volume_slider ' + customClass + '" />');
    $buttonParent.append($newSlider);

    $newSlider.append('<div><input type="range" max="1" min="0" step="0.05" value="' + state.videoVolume + '" /></div>');
    const $sliderInput = $newSlider.find('input');

    const syncSliderUI = (val) => {
        const percent = (val * 100) + '%';
        $sliderInput.val(val);
        $sliderInput.attr('style', '--ig-track-progress: ' + percent);
    };

    const applyVolumeToVideos = (val) => {
        state.videoVolume = val;
        GM_setValue('G_VIDEO_VOLUME', val);

        $videos.each(function () {
            //logger(`(${loggerType})`, 'video volume changed #slider');
            this.volume = val;
        });
    };

    syncSliderUI(state.videoVolume);

    $sliderInput.on('input', function () {
        const val = parseFloat(this.value);
        syncSliderUI(val);
        applyVolumeToVideos(val);
    });

    $sliderInput.on('mouseenter', function () {
        syncSliderUI(state.videoVolume);
    });

    $newSlider.on('click', function (e) {
        e.stopPropagation();
        e.preventDefault();
    });
}

/**
 * triggerReactClickHandler
 * @description Trigger the React synthetic onClick handler bound to the given DOM
 *              node. Locates the internal __reactProps* or __reactEventHandlers*
 *              key React attaches to each fiber-linked node and calls onClick with
 *              a minimal synthetic event.
 *
 * @param  {HTMLElement}  el
 * @return {void}
 */
export function triggerReactClickHandler(el) {
    const reactKey = Object.keys(el).find(k => k.startsWith('__reactProps') || k.startsWith('__reactEventHandlers'));
    const props = el[reactKey];

    if (props && typeof props.onClick === 'function') {
        const mockEvent = {
            target: el,
            currentTarget: el,
            preventDefault: () => { },
            stopPropagation: () => { },
            nativeEvent: new MouseEvent('click')
        };

        props.onClick(mockEvent);
    } else {
        logger('No React click handler found for the element:', el);
    }
};

export function getCookie(name) {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
}

// /**
//  * getPointerElement
//  * @description Get the element at the pointer position and check if it is the target element or if it is covered by another element.
//  *
//  * @param {JQuery<HTMLElement>} $target
//  * @param {number} clientX
//  * @param {number} clientY
//  */
// export function getPointerElement($target, clientX, clientY) {
//     let element = $target.get(0);
//     const rect = element.getBoundingClientRect();

//     const viewportWidth = window.innerWidth;
//     const viewportHeight = window.innerHeight;

//     const visibleX = Math.max(rect.left, 0) + (Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0)) / 2;
//     const visibleY = Math.max(rect.top, 0) + (Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0)) / 2;

//     if (visibleX < 0 || visibleX > viewportWidth || visibleY < 0 || visibleY > viewportHeight) {
//         if (clientX == null || clientY == null) {
//             return { self: false, topElement: null, target: $target, error: 'out_of_viewport', rect };
//         }
//     }

//     const topElement = document.elementFromPoint(clientX || visibleX, clientY || visibleY);

//     if ($(topElement).height() > document.body.clientHeight) {
//         return { self: false, topElement: null, target: $target, error: 'oversize_element', rect };
//     }

//     if ($(topElement).width() < 100 || $(topElement).height() < 100) {
//         return { self: false, topElement: null, target: $target, error: 'small_element', rect };
//     }

//     if (topElement && topElement !== element && !element.contains(topElement)) {
//         if ($(topElement).find($target).length > 0) {
//             // return { self: false, topElement, target: $target };
//             return { self: false, topElement: null, target: $target, error: 'covered_by_element', rect };
//         }

//         if ($(topElement).width() != $target.width() || $(topElement).height() != $target.height()) {
//             return { self: false, topElement: null, target: $target, error: 'different_dimensions', rect };
//         }


//         // return { self: false, topElement: null, target: $target, error: 'none_of_element', rect };
//         return { self: false, topElement, target: $target };
//     } else {
//         return { self: true, topElement, target: $target };
//     }
// }

/**
 * updatePopupSelectionSummary
 * @description Updates selection summary text and dynamically manages the
 *              enabled/disabled states of the batch download buttons in the popup dialog.
 *
 * @param {string|JQuery} [root='.IG_POPUP_DIG'] - Selector or jQuery object for the popup root.
 * @return {void}
 */
export function updatePopupSelectionSummary(root = '.IG_POPUP_DIG') {
    const $root = (typeof root === 'string') ? $(root) : root;
    if (!$root || $root.length === 0) return;

    const $items = $root.find('.IG_POPUP_DIG_BODY .inner_box');
    const total = $items.length;
    const selected = $items.filter(':checked').length;
    const isLoading = $root.find('#_SNLOAD').length > 0;

    $root.find('#batch_download_direct').prop('disabled', isLoading || total === 0);
    $root.find('#batch_download_selected').prop('disabled', isLoading || selected === 0);

    const $titleCheckbox = $root.find('.IG_POPUP_DIG_TITLE .checkbox');
    const $countSpan = $titleCheckbox.find('.item-count');
    if ($titleCheckbox.length === 0 || $countSpan.length === 0) return;

    $titleCheckbox.find('input').prop('checked', total > 0 && selected === total);

    const formatCount = (count, singularKey, pluralKey) => {
        const key = count === 1 ? singularKey : pluralKey;
        const template = _i18n(key);
        return (typeof template === 'string')
            ? template.replace('%COUNT%', count)
            : String(count);
    };

    const totalLabel = formatCount(total, 'ITEM_COUNT_SINGULAR', 'ITEM_COUNT_PLURAL');
    const selectedLabel = formatCount(selected, 'SELECTED_COUNT_SINGULAR', 'SELECTED_COUNT_PLURAL');

    $countSpan.text(` (${selectedLabel} / ${totalLabel})`);
}
