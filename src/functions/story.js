import { USER_SETTING, SVG, state } from "../settings";
import {
    updateLoadingBar, setDownloadProgress,
    saveFiles, getStoryProgress, openNewTab, logger,
    getStoryId,
    tryHandleDashFromMediaItem,
    updatePopupSelectionSummary,
    setStoryProgressIndexText,
    setStoryProgressIndexByUsername,
    getVisibleStoryTimestamp, getCurrentStoryItemIndex,
    getMediaIdOfStoryOrHighlightFromEmbeddedJSON, getVisibleImageMediaId,
    resolveMediaIdOfStoryOrHighlightByTimestamp, getStoryButtonContainer,
    markContainerPositioned, updateStoryThumbnailButton, getVisibleVideoPosterMediaIds
} from "../utils/general";
import { getUserId, getStories, getStoriesGraphQL, isReelsMediaVideo } from "../utils/api";
import { _i18n } from "../utils/i18n";
import { getImageFromCache, mediaIdFromURL } from "../utils/image_cache";
import { IG_createDM } from "../utils/dialog";
/*! ESLINT IMPORT END !*/

/**
 * createStoryListDOM
 * @description Create a list of story items in the popup dialog.
 *
 * @param  {Object}  obj   - Reel media response data
 * @param  {String}  type  - Source type ('stories' or 'highlights')
 * @return {void}
 */
export async function createStoryListDOM(obj, type) {
    try {
        $('.IG_POPUP_DIG #post_info').text(`${type} ID: ${obj.id}`);
        const selector = '.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY';
        const $selector = $(selector);

        // Remove loading indicator once data is ready
        $selector.find('#_SNLOAD').remove();

        const items = obj.items;

        items.forEach((item, idx) => {
            let date = new Date().getTime();
            let timestamp = Math.floor(date / 1000);
            let username = obj?.user?.username || obj?.owner?.username;

            if (USER_SETTING.RENAME_PUBLISH_DATE) {
                timestamp = item.taken_at_timestamp || item.taken_at;
            }

            item.image_versions2.candidates.sort(function (a, b) {
                if (a.width < b.width) return 1;
                if (a.width > b.width) return -1;
                return 0;
            });

            if (item.is_video || item.video_versions != null) {
                $selector.append(`<a media-id="${item.id}" datetime="${timestamp}" data-blob="true" data-needed="direct" data-name="${type}" data-type="mp4" data-username="${username}" data-path="${item.id}" data-globalIndex="${idx + 1}" href="javascript:;" data-href="${item.video_versions[0].url}"><img width="100" src="${item.image_versions2.candidates[0].url}" /><br/>- <span data-ih-locale-title="VID">${_i18n("VID")}</span> ${idx} -</a>`);
            }
            else {
                $selector.append(`<a media-id="${item.id}" datetime="${timestamp}" data-blob="true" data-needed="direct" data-name="${type}" data-type="jpg" data-username="${username}" data-path="${item.id}" data-globalIndex="${idx + 1}" href="javascript:;" data-href="${item.image_versions2.candidates[0].url}"><img width="100" src="${item.image_versions2.candidates[0].url}" /><br/>- <span data-ih-locale-title="IMG">${_i18n("IMG")}</span> ${idx} -</a>`);
            }
        });

        $selector.find('a').each(function () {
            const $a = $(this);
            $a.wrap('<div></div>');
            $a.before('<label class="inner_box_wrapper"><input class="inner_box" type="checkbox"><span></span></label>');
            $a.after(`<div data-ih-locale-title="NEW_TAB" title="${_i18n("NEW_TAB")}" class="newTab">${SVG.NEW_TAB}</div>`);

            if ($a.data('type') == 'mp4') {
                $a.after(`<div data-ih-locale-title="VIDEO_THUMBNAIL" title="${_i18n("VIDEO_THUMBNAIL")}" class="videoThumbnail">${SVG.THUMBNAIL}</div>`);
            }
        });

        // Single source of truth: activates BATCH_DOWNLOAD_DIRECT (since total > 0)
        // and keeps BATCH_DOWNLOAD_SELECTED disabled until an item is checked
        updatePopupSelectionSummary();
        updateLoadingBar(false);
    }
    catch (err) {
        console.error('createStoryListDOM()', err);
        $('.IG_POPUP_DIG #_SNLOAD').text('Failed to load items.');
        updateLoadingBar(false);
    }
}

/**
 * onStoryAll
 * @description Trigger user's story all download event.
 *
 * @return {void}
 */
export async function onStoryAll() {
    updateLoadingBar(true);

    let date = new Date().getTime();
    let timestamp = Math.floor(date / 1000);
    let username = $("body > div section._ac0a header._ac0k ._ac0l a + div a").first().text() || location.pathname.split("/").filter(s => s.length > 0).at(1);

    // Open popup immediately with loading indicator when not in direct download mode
    if (!USER_SETTING.DIRECT_DOWNLOAD_STORY) {
        IG_createDM(false, true);
        $('.IG_POPUP_DIG #post_info').text(`Story: @${username}`);
        $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY').append('<p id="_SNLOAD">' + _i18n("LOAD_BLOB_MULTIPLE") + '</p>');
        updatePopupSelectionSummary();
    }

    try {
        let userInfo = await getUserId(username);
        let userId = userInfo.user.pk;
        let stories = await getStories(userId, username);

        if (USER_SETTING.DIRECT_DOWNLOAD_STORY) {
            let complete = 0;
            const items = stories.data.xdt_api__v1__feed__reels_media.reels_media[0].items;
            const totalItems = items.length;
            setDownloadProgress(complete, totalItems);

            items.forEach((item, idx) => {
                setTimeout(() => {
                    if (USER_SETTING.RENAME_PUBLISH_DATE) {
                        timestamp = item.taken_at_timestamp || item.taken_at;
                    }

                    item.image_versions2.candidates.sort(function (a, b) {
                        if (a.width < b.width) return 1;
                        if (a.width > b.width) return -1;
                        return 0;
                    });

                    if (item.is_video || item.video_versions != null) {
                        saveFiles(item.video_versions[0].url, {
                            username,
                            sourceType: "stories",
                            timestamp,
                            filetype: 'mp4',
                            shortcode: item.id,
                            thumbnailURL: item.image_versions2?.candidates?.[0]?.url
                        }).then(() => {
                            setDownloadProgress(++complete, totalItems);
                        });
                    }
                    else {
                        saveFiles(item.image_versions2.candidates[0].url, {
                            username,
                            sourceType: "stories",
                            timestamp,
                            filetype: 'jpg',
                            shortcode: item.id
                        }).then(() => {
                            setDownloadProgress(++complete, totalItems);
                        });
                    }
                }, 100 * idx);
            });
        }
        else {
            createStoryListDOM(stories.data.xdt_api__v1__feed__reels_media.reels_media[0], 'stories');
        }
    }
    catch (err) {
        logger('onStoryAll', 'Failed to fetch stories', err);
        $('.IG_POPUP_DIG #_SNLOAD').text('Failed to load stories.');
        updateLoadingBar(false);
    }
}

/**
 * onStory
 * @description Trigger user's story download event or button display event.
 *
 * @param  {Boolean}  isDownload - Check if it is a download operation
 * @param  {Boolean}  isForce - Force a fresh Instagram Stories GraphQL tray fetch
 *                    instead of reusing state.GL_dataCache.stories. Does
 *                    NOT bypass the persistent media cache — a cached
 *                    resource is still served with no API call at all.
 * @param  {Boolean}  isPreview - Check if it is need to open new tab
 * @return {void}
 */
export async function onStory(isDownload, isForce, isPreview, isInternalRetry) {
    var username = $("body > div section._ac0a header._ac0k ._ac0l a + div a").first().text() || location.pathname.split("/").filter(s => s.length > 0).at(1);

    if (isDownload) {
        // FIX (freeze during rapid story navigation): a simple mutex
        // prevents two concurrent downloads from overlapping (rapid clicks
        // + Alt+S on successive stories). isInternalRetry=true is used only
        // by this function's own internal retries (see below) and does not
        // re-acquire the mutex / loading bar, preventing a self-deadlock.
        if (!isInternalRetry) {
            if (state.storyDownloadInProgress) {
                logger('onStory', 'Download already in progress, ignoring additional call');
                return;
            }

            state.storyDownloadInProgress = true;
            updateLoadingBar(true);
        }

        let date = new Date().getTime();
        let timestamp = Math.floor(date / 1000);

        // FIX: the entire download logic is now wrapped in a
        // try/catch/finally. Previously, an unexpected exception anywhere in this
        // long chain (e.g. userInfo being null during rate limiting) could skip
        // updateLoadingBar(false) permanently, leaving it stuck. The loading bar
        // and mutex are now guaranteed to reset regardless of how the function
        // exits.
        try {
            if ((USER_SETTING.FORCE_GRAPHQL_QUERY_FOR_STORIES_AND_HIGHLIGHTS || (isPreview && USER_SETTING.NEW_TAB_ALWAYS_FORCE_GRAPHQL_IN_STORIES_AND_HIGHLIGHTS)) && !state.tempFetchGraphQLUnavailable) {
                let mediaId = null;

                const urlID = location.pathname
                    .split('/')
                    .filter(s => s.length > 0 && /^\d{10,}$/.test(s))
                    .at(-1);

                /*
             * Candidate mediaId gathering, run BEFORE any Instagram Stories GraphQL
             * call, in priority order:
             *   1) numeric mediaId embedded in the Story URL (urlID)
             *   2) DOM JSON fast path — mandatory whenever the URL
             *      carries no numeric mediaId. Reads the pk straight out
             *      of IG's own embedded reels_media payload
             *      (getMediaIdOfStoryOrHighlightFromEmbeddedJSON), so it
             *      works for video Stories too (unlike the ig_cache_key
             *      technique below, which needs an <img>).
             *   3) resolveMediaIdOfStoryOrHighlightByTimestamp() — tried
             *      further below, once the Instagram Stories GraphQL response is
             *      available (it needs the fetched items to compare
             *      timestamps against, so it cannot run in this
             *      pre-fetch section).
             *   4) DOM-derived id from the currently visible <img>, via
             *      its `ig_cache_key` query param (getVisibleImageMediaId(),
             *      same technique v4 used) — last-resort local fallback
             *      for picture Stories, tried further below only once
             *      steps 1-3 all yielded nothing.
             *
             * candidateIds here is used ONLY for the local media-cache
             * lookup right below — it intentionally also includes the
             * step-4 candidate (domMediaId), since checking the cache is
             * a pure optimization independent of resolution priority: if
             * ANY candidate is already cached, we can avoid the Reels
             * Media API call entirely, regardless of that candidate's
             * priority. Priority order only matters for which candidate
             * becomes the AUTHORITATIVE mediaId when nothing is cached
             * (see below) — there, domMediaId (step 4) is deliberately
             * excluded, and is only used after step 3 fails post-fetch.
             *
             * FIX (domJsonMediaId gated on CAPTURE_IMAGE_VIA_MEDIA_CACHE):
             * candidate gathering now always runs, even with that setting
             * off. Reading the DOM JSON fast path (2) is strictly more
             * precise than the progress-bar position match done further
             * below (last resolution step) — it's a real pk from IG's own
             * payload, not an inferred DOM index — so there's no reason
             * to withhold it just because caching is disabled. Only the
             * actual cache lookup (which candidate, if any, is already
             * downloaded) stays behind that setting; the mediaId itself,
             * when resolvable, is used either way. No media-type test is
             * done for the cache lookup: if a candidate is cached, that
             * cached resource is served regardless of whether the Story
             * is currently an image or a video. Only if none of the
             * candidates are cached (or caching is off) do we fall
             * through to getUserId()/getStoriesGraphQL() below.
             *
             * FIX (isForce bypassed the cache): this must run regardless
             * of isForce. isForce=true (e.g. .IG_DWNEWTAB, which calls
             * onStory(true, true, true)) means "force a fresh tray fetch
             * below, don't reuse state.GL_dataCache.stories" — it never
             * meant "skip a resource we already have cached". Gating this
             * check on !isForce made New Tab always hit the Reels Media
             * API even when the exact mediaId was already cached.
             */
                const candidateIds = [];
                let domJsonMediaId = null;
                let domMediaId = null;
                const visibleStoryTimestamp = getVisibleStoryTimestamp();

                if (urlID) {
                    candidateIds.push(urlID);
                }
                else {
                    // FIX (always read reels_media[0].items[0]): the embedded
                    // payload lists ALL of the user's story items, but only the
                    // one matching the visible progress-bar segment
                    // (IG_DWSTORY_POSITION, e.g. "1/2") is the one actually on
                    // screen. Resolve that index first so multi-story trays
                    // don't always resolve to the first item.
                    const storyItemIndex = getCurrentStoryItemIndex(username);
                    domJsonMediaId = getMediaIdOfStoryOrHighlightFromEmbeddedJSON(storyItemIndex ?? 0, username);
                    if (domJsonMediaId) candidateIds.push(domJsonMediaId);

                    domMediaId = getVisibleImageMediaId();
                    if (domMediaId) candidateIds.push(domMediaId);
                }

                const currentStoryHasVideo = $('body > div section:visible video[playsinline]').length > 0;

                if (USER_SETTING.CAPTURE_IMAGE_VIA_MEDIA_CACHE) {
                    for (const candidateId of candidateIds) {
                        const cached = getImageFromCache(candidateId);

                        if (cached && !currentStoryHasVideo) {
                            logger("[Restore Cached onStory]", candidateId);

                            if (isPreview) {
                                openNewTab(cached);
                            }
                            else {
                                saveFiles(cached, {
                                    username,
                                    sourceType: "stories",
                                    timestamp,
                                    filetype: 'jpg',
                                    shortcode: candidateId
                                });
                            }

                            return;
                        }
                    }

                    /*
                 * Nothing cached — keep the best AUTHORITATIVE local
                 * candidate (if any) as a known mediaId for the Reels
                 * Media API fallback below, so it isn't re-derived from
                 * scratch. domMediaId (step 4, the ig_cache_key trick)
                 * is deliberately NOT considered here — see the
                 * resolution-priority note above.
                 */
                    if (urlID) {
                        mediaId = urlID;
                    }
                    else if (domJsonMediaId) {
                        mediaId = domJsonMediaId;
                    }
                }
                else if (domJsonMediaId) {
                    /*
                 * CAPTURE_IMAGE_VIA_MEDIA_CACHE off — no cache lookup, but
                 * we already have a precise pk straight from IG's own
                 * embedded reels_media JSON. Use it directly instead of
                 * falling through to the resolution chain below, which
                 * only kicks in once resolveMediaIdOfStoryOrHighlightByTimestamp()
                 * and domMediaId (step 4) also fail to resolve anything.
                 */
                    mediaId = domJsonMediaId;
                }

                /*
             * Instagram Stories GraphQL path. Only reached once the cache
             * verification step above found nothing cached (or
             * CAPTURE_IMAGE_VIA_MEDIA_CACHE is off).
             */
                let stories;

                /*
             * Session tray cache. getStoriesGraphQL() has no caching of its own,
             * so state.GL_dataCache.stories[username] — the same in-session
             * tray cache used by the highlights branches above — is reused
             * here, avoiding a re-fetch when the tray for this username was
             * already fetched in the current session and isForce was not
             * requested.
             */
                if (!isForce && state.GL_dataCache.stories[username]) {
                    logger('[Instagram Stories GraphQL]', 'Fetch from memory cache:', username);
                    stories = state.GL_dataCache.stories[username];
                }
                else {
                    try {
                        const userInfo = await getUserId(username);
                        const userId = userInfo?.user?.pk ?? userInfo?.user?.id;

                        if (!userId) {
                            throw new Error(`Could not resolve userId for @${username}`);
                        }

                        stories = await getStoriesGraphQL(String(userId), username);

                        // Persist the freshly-fetched tray so subsequent onStory() calls
                        // for the same username reuse it instead of re-hitting the API.
                        state.GL_dataCache.stories[username] = stories;
                    }
                    catch (err) {
                        logger('[Instagram Stories GraphQL]', 'getStories() failed', err);

                        if (USER_SETTING.FALLBACK_TO_BLOB_FETCH_IF_STORIES_GRAPHQL_UNAVAILABLE) {
                            state.tempFetchGraphQLUnavailable = true;
                            await onStory(isDownload, isForce, isPreview, true);
                        }
                        else {
                            alert('Fetch failed from Instagram Stories GraphQL.');
                        }

                        return;
                    }
                }

                const items = stories?.data?.xdt_api__v1__feed__reels_media?.reels_media?.[0]?.items || [];

                /*
             * 1) Match directly by story media ID from URL. Only
             * reached when the cache-verification step above did not
             * already resolve a mediaId (isForce, cache disabled, or no
             * local candidate at all).
             */
                if (mediaId == null) {
                    items.forEach(item => {
                        if ((item.pk ?? item.id) == urlID) {
                            mediaId = item.pk ?? item.id;
                        }
                    });
                }

                /*
             * 2) resolveMediaIdOfStoryOrHighlightByTimestamp() — only
             * reachable here when neither urlID nor the DOM JSON fast
             * path (domJsonMediaId) resolved anything above. Compares
             * the visible <time> element against the items just fetched.
             */
                if (mediaId == null) {
                    mediaId = resolveMediaIdOfStoryOrHighlightByTimestamp(stories, visibleStoryTimestamp);
                }

                /*
             * 3) DOM-derived id from the currently visible <img>
             * (domMediaId, the ig_cache_key trick — already computed in
             * the pre-fetch candidate gathering above). Last local
             * resort before falling back to pure DOM-position matching
             * below.
             */
                if (mediaId == null && domMediaId) {
                    mediaId = domMediaId;
                }

                /*
             * 4) Fallback to visible Story progress.
             *
             * FIX (align with onStoryThumbnail): guard added so the loop
             * keeps the FIRST matching segment instead of letting a
             * later one silently overwrite mediaId (could happen if two
             * segments briefly both read as "filled" mid-transition).
             */
                if (mediaId == null) {
                    let $header = getStoryProgress(username);

                    $header.each(function (index) {
                        if (mediaId) return;

                        if ($(this).children().length > 0 && items[index]) {
                            mediaId = items[index].pk ?? items[index].id;
                        }
                    });
                }

                /*
             * 5) Fallback to the old profile-page layout.
             * 6) Fallback to the home-page layout.
             *
             * FIX (align with onStoryThumbnail): both loops guarded so
             * they keep the FIRST matching segment instead of letting a
             * later one silently overwrite mediaId.
             */
                if (mediaId == null) {
                    $('body > div section:visible div.x1ned7t2.x78zum5 > div').each(function (index) {
                        if (mediaId) return;

                        const $this = $(this);

                        if ($this.hasClass('x1lix1fw')) {
                            if ($this.children().length > 0 && items[index]) {
                                mediaId = items[index].pk ?? items[index].id;
                            }
                        }
                    });

                    $('body > div section:visible ._ac0k > ._ac3r > div').each(function (index) {
                        if (mediaId) return;

                        if ($(this).children().hasClass('_ac3q') && items[index]) {
                            mediaId = items[index].pk ?? items[index].id;
                        }
                    });
                }

                if (mediaId == null) {
                    mediaId = location.pathname
                        .split('/')
                        .filter(s => s.length > 0 && s.match(/^([0-9]{10,})$/))
                        .at(-1);
                }

                // Resolve the story item from the already-fetched reels_media payload.
                const resolvedMediaItem = items.find(item => String(item.pk ?? item.id) === String(mediaId));

                const result = {
                    status: resolvedMediaItem ? 'ok' : 'fail',
                    items: resolvedMediaItem ? [resolvedMediaItem] : [],
                    message: resolvedMediaItem
                        ? ''
                        : 'Media item not found in getStoriesGraphQL() cache for id ' + mediaId
                };

                if (USER_SETTING.RENAME_PUBLISH_DATE) {
                    timestamp = result.items?.[0]?.taken_at || result.items?.[0]?.taken_at_timestamp || timestamp;
                }

                if (result.status === 'ok') {
                    const mediaItem = result.items[0];

                    if (isReelsMediaVideo(mediaItem)) {
                        // onStory's Instagram Stories GraphQL branch — tag as reels_media.
                        const handled = await tryHandleDashFromMediaItem({
                            mediaItem: mediaItem,
                            username,
                            sourceType: "stories",
                            timestamp,
                            shortcode: mediaId,
                            isPreview,
                        });

                        if (handled) {
                            return;
                        }

                        if (isPreview) {
                            openNewTab(mediaItem.video_versions[0].url);
                        }
                        else {
                            saveFiles(mediaItem.video_versions[0].url, {
                                username,
                                sourceType: "stories",
                                timestamp,
                                filetype: 'mp4',
                                shortcode: mediaId,
                                thumbnailURL: mediaItem.image_versions2?.candidates?.[0]?.url
                            });
                        }
                    }
                    else {
                        if (isPreview) {
                            openNewTab(mediaItem.image_versions2.candidates[0].url);
                        }
                        else {
                            saveFiles(mediaItem.image_versions2.candidates[0].url, {
                                username,
                                sourceType: "stories",
                                timestamp,
                                filetype: 'jpg',
                                shortcode: mediaId
                            });
                        }
                    }
                }
                else {
                    alert('Fetch failed from Instagram Stories GraphQL. API response message: ' + result.message);
                    logger(result);
                }

                return;
            }

            /*
         * Normal Media API / in-memory story cache path.
         */
            if ($('body > div section:visible video[playsinline]').length > 0) {
                // Download stories if it is video
                let type = "mp4";
                let videoURL = "";
                let videoThumbnailSrc = "";
                let targetURL = location.pathname.replace(/\/$/ig, '').split("/").at(-1);
                let mediaId = null;

                if (state.GL_dataCache.stories[username] && !isForce) {
                    logger('Fetch from memory cache:', username);

                    state.GL_dataCache.stories[username].data.xdt_api__v1__feed__reels_media.reels_media[0].items.forEach(item => {
                        if (item.id == targetURL) {
                            videoURL = item.video_versions[0].url;
                            videoThumbnailSrc = item.image_versions2?.candidates?.[0]?.url || '';

                            if (USER_SETTING.RENAME_PUBLISH_DATE) {
                                timestamp = item.taken_at_timestamp || item.taken_at;
                                mediaId = item.id;
                            }
                        }
                    });

                    if (videoURL.length == 0) {
                        logger('Memory cache not found, try fetch from API:', username);
                        // FIX: also pass isPreview through (it was previously lost on retry)
                        await onStory(true, true, isPreview, true);
                        return;
                    }
                }
                else {
                    let userInfo = await getUserId(username);
                    let userId = userInfo?.user?.pk;

                    if (!userId) {
                        throw new Error(`Could not resolve userId for @${username}`);
                    }
                    let stories = await getStories(userId, username);

                    // OPTIMIZATION: cache items
                    const items = stories.data.xdt_api__v1__feed__reels_media.reels_media[0].items;

                    items.forEach(item => {
                        if (item.id == targetURL) {
                            videoURL = item.video_versions[0].url;
                            videoThumbnailSrc = item.image_versions2?.candidates?.[0]?.url || '';

                            if (USER_SETTING.RENAME_PUBLISH_DATE) {
                                timestamp = item.taken_at_timestamp || item.taken_at;
                                mediaId = item.id;
                            }
                        }
                    });

                    // GitHub issue #4: thinkpad4
                    if (videoURL.length == 0) {

                        let $header = getStoryProgress(username);

                        // FIX (align with onStoryThumbnail): guard added so the
                        // loop keeps the FIRST matching segment instead of
                        // letting a later one silently overwrite videoURL/mediaId.
                        $header.each(function (index) {
                            if (videoURL.length > 0) return;

                            if ($(this).children().length > 0) {
                                videoURL = items[index].video_versions[0].url;
                                videoThumbnailSrc = items[index].image_versions2?.candidates?.[0]?.url || '';

                                if (USER_SETTING.RENAME_PUBLISH_DATE) {
                                    timestamp = items[index].taken_at_timestamp || items[index].taken_at;
                                    mediaId = items[index].id;
                                }
                            }
                        });


                        if (videoURL.length == 0) {
                            // appear in from profile page to story page
                            // FIX (align with onStoryThumbnail): guards added
                            // so both loops keep the FIRST matching segment.
                            $('body > div section:visible div.x1ned7t2.x78zum5 > div').each(function (index) {
                                if (videoURL.length > 0) return;

                                const $this = $(this);

                                if ($this.hasClass('x1lix1fw')) {
                                    if ($this.children().length > 0) {
                                        videoURL = items[index].video_versions[0].url;
                                        videoThumbnailSrc = items[index].image_versions2?.candidates?.[0]?.url || '';

                                        if (USER_SETTING.RENAME_PUBLISH_DATE) {
                                            timestamp = items[index].taken_at_timestamp || items[index].taken_at;
                                            mediaId = items[index].id;
                                        }
                                    }
                                }
                            });

                            // appear in from home page to story page
                            $('body > div section:visible ._ac0k > ._ac3r > div').each(function (index) {
                                if (videoURL.length > 0) return;

                                if ($(this).children().hasClass('_ac3q')) {
                                    videoURL = items[index].video_versions[0].url;
                                    videoThumbnailSrc = items[index].image_versions2?.candidates?.[0]?.url || '';

                                    if (USER_SETTING.RENAME_PUBLISH_DATE) {
                                        timestamp = items[index].taken_at_timestamp || items[index].taken_at;
                                        mediaId = items[index].id;
                                    }
                                }
                            });
                        }
                    }

                    state.GL_dataCache.stories[username] = stories;
                }

                if (videoURL.length == 0) {
                    alert(_i18n("NO_VID_URL"));
                }
                else {
                    if (isPreview) {
                        openNewTab(videoURL);
                    }
                    else {
                        saveFiles(videoURL, {
                            username,
                            sourceType: "stories",
                            timestamp,
                            filetype: type,
                            shortcode: mediaId,
                            thumbnailURL: videoThumbnailSrc
                        });
                    }
                }
            }
            else {
                // Download stories if it is image
                let srcset = $('body > div section:visible img[referrerpolicy][class], body > div section:visible img[crossorigin][class]:not([alt])').attr('srcset')?.split(',')[0]?.split(' ')[0];

                let link = (srcset)
                    ? srcset
                    : $('body > div section:visible img[referrerpolicy][class], body > div section:visible img[crossorigin][class]:not([alt])').filter(function () {
                        const $this = $(this);
                        return $this.parents('a').length === 0 && $this.width() === $this.parent().width();
                    }).attr('src');

                if (!link) {
                    // _aa63 mean stories picture in stories page (not avatar)
                    let $element = $('body > div section:visible img._aa63');
                    link = ($element.attr('srcset'))
                        ? $element.attr('srcset')?.split(',')[0]?.split(' ')[0]
                        : $element.attr('src');
                }

                if (USER_SETTING.RENAME_PUBLISH_DATE) {
                    timestamp = new Date($('body > div section:visible time[datetime][class]').first().attr('datetime')).getTime();
                }

                let downloadLink = link;
                let type = 'jpg';

                const mediaId = getStoryId(downloadLink) || mediaIdFromURL(downloadLink);

                if (USER_SETTING.CAPTURE_IMAGE_VIA_MEDIA_CACHE && mediaId) {
                    const cached = getImageFromCache(mediaId);

                    if (cached) {
                        if (isPreview) {
                            openNewTab(cached);
                        }
                        else {
                            saveFiles(cached, {
                                username,
                                sourceType: "stories",
                                timestamp,
                                filetype: 'jpg',
                                shortcode: mediaId
                            });
                        }

                        return;
                    }
                }

                if (isPreview) {
                    openNewTab(downloadLink);
                }
                else {
                    saveFiles(downloadLink, {
                        username,
                        sourceType: "stories",
                        timestamp,
                        filetype: type,
                        shortcode: mediaId
                    });
                }
            }

            state.tempFetchGraphQLUnavailable = false;
        }
        catch (err) {
            logger('onStory', 'Unexpected error while downloading story', err);
            alert('Fetch failed from Instagram Stories GraphQL.');
        }
        finally {
            if (!isInternalRetry) {
                state.storyDownloadInProgress = false;
                updateLoadingBar(false);
            }
        }
    }
    else {
        // Add the stories download button
        if (!$('.IG_DWSTORY').length) {
            state.GL_dataCache.stories = {};

            // Resolved via getStoryButtonContainer() so onStory() and the
            // startStoryObserver() watcher always agree on where the
            // button belongs. Note: unlike the watcher's read-only usage,
            // onStory() still applies position:relative to the resolved
            // element (needed for the button's absolute positioning), same
            // as the original per-fallback behavior.
            let $element = getStoryButtonContainer();
            markContainerPositioned($element);

            if ($element.length > 0) {
                // OPTIMIZATION: cache .first() once
                const $firstEl = $element.first();

                $firstEl.append(`<div data-ih-locale-title="DW" title="${_i18n("DW")}" class="IG_DWSTORY">${SVG.DOWNLOAD}</div>`);
                $firstEl.append(`<div data-ih-locale-title="NEW_TAB" title="${_i18n("NEW_TAB")}" class="IG_DWNEWTAB">${SVG.NEW_TAB}</div>`);

                // Synchronously append thumbnail button if the volume slider is already present
                if ($('section:visible [role="slider"]').length) {
                    $firstEl.append(`<div data-ih-locale-title="VIDEO_THUMBNAIL" title="${_i18n("VIDEO_THUMBNAIL")}" class="IG_DWSTORY_THUMBNAIL">${SVG.THUMBNAIL}</div>`);
                }

                let $header = getStoryProgress(username);
                if ($header.length > 1) {
                    $firstEl.append(`<div data-ih-locale-title="DW_ALL" title="${_i18n("DW_ALL")}" class="IG_DWSTORY_ALL">${SVG.DOWNLOAD_ALL}</div>`);
                }

                setStoryProgressIndexText($firstEl, $header, 'IG_DWSTORY_POSITION');

                // Modify video volume
                //if(USER_SETTING.MODIFY_VIDEO_VOLUME){
                //    $element.find('video').each(function(){
                //        $(this).one('play playing', function(){
                //            if(!$(this).data('modify')){
                //                $(this).data('modify', true);
                //                this.volume = VIDEO_VOLUME;
                //                logger('(story) Added video event listener #modify');
                //            }
                //        });
                //    });
                //}

                // Try to use event listener 'timeupdate' in order to detect if story is a video
                //$element.find('video').each(function(){
                //    $(this).one('timeupdate',function(){
                //        if(!$video.data('modify-thumbnail')){
                //            if($element.find('.IG_DWSTORY_THUMBNAIL').length === 0){
                //                $(this).data('modify-thumbnail', true);
                //                onStoryThumbnail(false);
                //                logger('(story) Manually inserting thumbnail button');
                //            }
                //            else{
                //                $(this).data('modify-thumbnail', true);
                //                logger('(story) Thumbnail button already inserted');
                //            }
                //        }
                //    });
                //});
            }
        }
        else {
            setStoryProgressIndexByUsername($('.IG_DWSTORY').parent(), username, 'IG_DWSTORY_POSITION');
            updateStoryThumbnailButton();
        }
    }
}


/**
 * onStoryThumbnail
 * @description Trigger user's story video thumbnail download event or button display event.
 *
 * @param  {Boolean}  isDownload - Check if it is a download operation
 * @param  {Boolean}  isForce - Force a fresh Instagram Stories GraphQL tray fetch
 *                    instead of reusing state.GL_dataCache.stories. Does
 *                    NOT bypass the persistent media cache — a cached
 *                    resource is still served with no API call at all.
 * @return {void}
 */
export async function onStoryThumbnail(isDownload, isForce) {
    if (isDownload) {

        // Download stories if it is video
        let date = new Date().getTime();
        let timestamp = Math.floor(date / 1000);
        let type = 'jpg';
        let username = $("body > div section._ac0a header._ac0k ._ac0l a + div a").first().text() || location.pathname.split('/').at(2);

        // Download thumbnail
        let targetURL = location.pathname.replace(/\/$/ig, '').split("/").at(-1);
        let videoThumbnailURL = "";
        let mediaId = null;
        const selectThumbnail = item => {
            const candidates = item?.image_versions2?.candidates || [];
            const image = candidates.filter(candidate => candidate.url).reduce((best, candidate) =>
                !best || candidate.width > best.width ? candidate : best, null);
            videoThumbnailURL = image?.url || item?.display_url || '';
            if (videoThumbnailURL) {
                mediaId = item.pk ?? item.id;
                if (USER_SETTING.RENAME_PUBLISH_DATE) {
                    timestamp = item.taken_at_timestamp ?? item.taken_at ?? timestamp;
                }
            }
        };

        updateLoadingBar(true);

        /*
         * Candidate mediaId gathering, run BEFORE any Instagram Stories GraphQL
         * call, in priority order:
         *   1) numeric mediaId embedded in the Story URL (urlID)
         *   2) DOM JSON fast path — mandatory whenever the URL carries
         *      no numeric mediaId. Reads the pk straight out of IG's own
         *      embedded reels_media payload
         *      (getMediaIdOfStoryOrHighlightFromEmbeddedJSON).
         *   3) resolveMediaIdOfStoryOrHighlightByTimestamp() — tried
         *      further below, once the Instagram Stories GraphQL response is
         *      available (it needs the fetched items to compare
         *      timestamps against, so it cannot run in this pre-fetch
         *      section).
         *   4) DOM-derived id(s) from the currently-visible <video>
         *      poster(s) (getVisibleVideoPosterMediaIds(), same
         *      technique v4 used, and the same one onReels() uses for
         *      Reel thumbnails): onStoryThumbnail() targets VIDEO
         *      stories, whose <video src="blob:..."> has no
         *      ig_cache_key of its own, but its `poster` attribute IS a
         *      real IG image URL that does carry one, decoded via
         *      mediaIdFromURL(). Last-resort local fallback, tried
         *      further below only once steps 1-3 all yielded nothing.
         *
         * candidateIds here is used ONLY for the local media-cache
         * lookup right below — it intentionally also includes the
         * step-4 candidates (domMediaIds), since checking the cache is
         * a pure optimization independent of resolution priority. See
         * the matching note in onStory() for why domMediaIds are
         * excluded from the AUTHORITATIVE pre-fetch mediaId assignment
         * further below.
         *
         * FIX (domJsonMediaId gated on CAPTURE_IMAGE_VIA_MEDIA_CACHE):
         * candidate gathering now always runs, even with that setting
         * off — same reasoning as onStory(). The thumbnail is always an
         * image even when the underlying Story is a video, so once a
         * candidate is resolved, a cache hit for it is unconditionally
         * valid to serve directly, no media-type check needed. Only the
         * actual cache lookup stays behind CAPTURE_IMAGE_VIA_MEDIA_CACHE;
         * the mediaId itself, when resolvable, is used either way. Only
         * if none of the candidates are cached (or caching is off) do we
         * fall through to getUserId()/getStoriesGraphQL() below.
         *
         * FIX (isForce bypassed the cache): this must run regardless of
         * isForce — see the matching fix in onStory() for why.
         */
        let urlID = location.pathname
            .split('/')
            .filter(s => s.length > 0 && s.match(/^([0-9]{10,})$/))
            .at(-1);

        const candidateIds = [];
        let domJsonMediaId = null;
        let domMediaIds = [];
        const visibleStoryTimestamp = getVisibleStoryTimestamp();

        if (urlID) {
            candidateIds.push(urlID);
        }
        else {
            // FIX: same reasoning as onStory() — pick the item matching
            // the visible progress-bar position, not always items[0].
            const storyItemIndex = getCurrentStoryItemIndex(username);
            domJsonMediaId = getMediaIdOfStoryOrHighlightFromEmbeddedJSON(storyItemIndex ?? 0, username);
            if (domJsonMediaId) candidateIds.push(domJsonMediaId);

            domMediaIds = getVisibleVideoPosterMediaIds().filter(id => id !== domJsonMediaId);
            candidateIds.push(...domMediaIds);
        }

        if (USER_SETTING.CAPTURE_IMAGE_VIA_MEDIA_CACHE) {
            for (const candidateId of candidateIds) {
                const cached = getImageFromCache(candidateId);

                if (cached) {
                    logger("[Restore Cached onStoryThumbnail]", candidateId);

                    saveFiles(cached, {
                        username,
                        sourceType: "thumbnail",
                        timestamp,
                        filetype: type,
                        shortcode: candidateId
                    });

                    state.tempFetchGraphQLUnavailable = false;
                    updateLoadingBar(false);
                    return;
                }
            }

            /*
             * Nothing cached — keep the best AUTHORITATIVE local
             * candidate (if any) as a known mediaId for the Reels Media
             * API fallback below, so it isn't re-derived from scratch.
             * domMediaIds (step 4, the poster trick) are deliberately
             * NOT considered here — see the resolution-priority note
             * above.
             */
            if (urlID) {
                mediaId = urlID;
            }
            else if (domJsonMediaId) {
                mediaId = domJsonMediaId;
            }
        }
        else if (domJsonMediaId) {
            /*
             * CAPTURE_IMAGE_VIA_MEDIA_CACHE off — no cache lookup, but we
             * already have a precise pk straight from IG's own embedded
             * reels_media JSON. Use it directly instead of falling
             * through to the resolution chain below, which only kicks in
             * once resolveMediaIdOfStoryOrHighlightByTimestamp() and
             * domMediaIds (step 4) also fail to resolve anything.
             */
            mediaId = domJsonMediaId;
        }

        /*
         * Instagram Stories GraphQL path. Only reached once the cache verification
         * step above found nothing cached (or CAPTURE_IMAGE_VIA_MEDIA_CACHE
         * is off). mediaId is resolved independently of
         * RENAME_PUBLISH_DATE below.
         */
        if (USER_SETTING.FORCE_GRAPHQL_QUERY_FOR_STORIES_AND_HIGHLIGHTS && !state.tempFetchGraphQLUnavailable) {
            let stories;

            /*
             * Session tray cache. Same as onStory(): reuse
             * state.GL_dataCache.stories[username] when the tray for this
             * username was already fetched in the current session and
             * isForce was not requested, instead of re-hitting
             * getStoriesGraphQL().
             */
            if (!isForce && state.GL_dataCache.stories[username]) {
                logger('[Instagram Stories GraphQL]', 'Fetch from memory cache:', username);
                stories = state.GL_dataCache.stories[username];
            }
            else {
                let userInfo = await getUserId(username);
                let userId = userInfo.user.pk;
                stories = await getStoriesGraphQL(String(userId), username);

                // Persist the freshly-fetched tray so subsequent calls for
                // the same username reuse it instead of re-hitting the API.
                state.GL_dataCache.stories[username] = stories;
            }

            const items = stories.data.xdt_api__v1__feed__reels_media.reels_media[0].items;

            /*
             * 1) Match directly by story media ID from URL. Only reached
             * when the cache-verification step above did not already
             * resolve a mediaId (isForce, cache disabled, or no local
             * candidate at all).
             */
            if (!mediaId && urlID) {
                for (const item of items) {
                    if (String(item.pk ?? item.id) === String(urlID)) {
                        mediaId = item.pk ?? item.id;
                        break;
                    }
                }
            }

            /*
             * 2) resolveMediaIdOfStoryOrHighlightByTimestamp() — only
             * reachable here when neither urlID nor domJsonMediaId
             * resolved anything above.
             */
            if (!mediaId) {
                mediaId = resolveMediaIdOfStoryOrHighlightByTimestamp(stories, visibleStoryTimestamp);
            }

            /*
             * 3) DOM-derived id(s) from the currently-visible <video>
             * poster(s) (domMediaIds — already computed in the
             * pre-fetch candidate gathering above). Last local resort
             * before falling back to pure DOM-position matching below.
             */
            if (!mediaId) {
                for (const domMediaId of domMediaIds) {
                    if (items.some(item => String(item.pk ?? item.id) === String(domMediaId))) {
                        mediaId = domMediaId;
                        break;
                    }
                }
            }

            // 4) Fallback to visible story progress.
            if (!mediaId) {
                let $header = getStoryProgress(username);

                $header.each(function (index) {
                    if (mediaId) return;

                    if ($(this).children().length > 0 && items[index]) {
                        mediaId = items[index].pk ?? items[index].id;
                    }
                });
            }

            // 5) Fallback to the old profile-page layout.
            if (!mediaId) {
                $('body > div section:visible div.x1ned7t2.x78zum5 > div').each(function (index) {
                    if (mediaId) return;

                    const $this = $(this);

                    if ($this.hasClass('x1lix1fw') && $this.children().length > 0 && items[index]) {
                        mediaId = items[index].pk ?? items[index].id;
                    }
                });

                // 6) Fallback to the home-page layout.
                if (!mediaId) {
                    $('body > div section:visible ._ac0k > ._ac3r > div').each(function (index) {
                        if (mediaId) return;

                        if ($(this).children().hasClass('_ac3q') && items[index]) {
                            mediaId = items[index].pk ?? items[index].id;
                        }
                    });
                }
            }

            // Not cached — derive the thumbnail URL from the resolved item.
            const resolvedItem = items.find(item => String(item.pk ?? item.id) === String(mediaId));

            if (resolvedItem) {
                selectThumbnail(resolvedItem);
            }

            if (!videoThumbnailURL) {
                logger('[Instagram Stories GraphQL] Story thumbnail URL not found:', mediaId || urlID);
                alert('Cannot find story video thumbnail URL.');
                state.tempFetchGraphQLUnavailable = false;
                updateLoadingBar(false);
                return;
            }

            await saveFiles(videoThumbnailURL, {
                username,
                sourceType: "thumbnail",
                timestamp,
                filetype: type,
                shortcode: mediaId
            });

            state.tempFetchGraphQLUnavailable = false;
            updateLoadingBar(false);
            return;
        }

        // Same mutual-exclusion guard as in onHighlightsStory / onStory.

        /*
         * Normal Media API / in-memory story cache path.
         */
        if (state.GL_dataCache.stories[username] && !isForce) {
            logger('Fetch from memory cache:', username);

            const items = state.GL_dataCache.stories[username].data.xdt_api__v1__feed__reels_media.reels_media[0].items;

            items.forEach(item => {
                if (String(item.id ?? item.pk) === String(targetURL)) {
                    selectThumbnail(item);
                }
            });

            if (videoThumbnailURL.length === 0 || !mediaId) {
                logger('Memory cache not found, try fetch from API:', username);
                onStoryThumbnail(true, true);
                return;
            }
        }
        else {
            let userInfo = await getUserId(username);
            let userId = userInfo.user.pk;
            let stories = await getStories(userId, username);

            // OPTIMIZATION: cache items
            const items = stories.data.xdt_api__v1__feed__reels_media.reels_media[0].items;

            items.forEach(item => {
                if (String(item.id ?? item.pk) === String(targetURL)) {
                    selectThumbnail(item);
                }
            });

            // GitHub issue #4: thinkpad4
            if (videoThumbnailURL.length === 0 || !mediaId) {
                let $header = getStoryProgress(username);

                $header.each(function (index) {
                    if (mediaId && videoThumbnailURL) {
                        return;
                    }

                    if ($(this).children().length > 0 && items[index]) {
                        selectThumbnail(items[index]);
                    }
                });

                if (videoThumbnailURL.length === 0 || !mediaId) {
                    // Appear in from profile page to story page
                    $('body > div section:visible div.x1ned7t2.x78zum5 > div').each(function (index) {
                        if (mediaId && videoThumbnailURL) {
                            return;
                        }

                        const $this = $(this);

                        if ($this.hasClass('x1lix1fw') && $this.children().length > 0 && items[index]) {
                            selectThumbnail(items[index]);
                        }
                    });

                    // Appear in from home page to story page
                    $('body > div section:visible ._ac0k > ._ac3r > div').each(function (index) {
                        if (mediaId && videoThumbnailURL) {
                            return;
                        }

                        if ($(this).children().hasClass('_ac3q') && items[index]) {
                            selectThumbnail(items[index]);
                        }
                    });
                }
            }
        }

        if (!videoThumbnailURL) {
            logger('Story thumbnail URL not found:', mediaId || targetURL);
            alert('Cannot find a thumbnail URL for this story.');
            state.tempFetchGraphQLUnavailable = false;
            updateLoadingBar(false);
            return;
        }

        await saveFiles(videoThumbnailURL, {
            username,
            sourceType: "thumbnail",
            timestamp,
            filetype: type,
            shortcode: mediaId
        });

        state.tempFetchGraphQLUnavailable = false;
        updateLoadingBar(false);
    }
    else {
        const username = $("body > div section._ac0a header._ac0k ._ac0l a + div a").first().text() || location.pathname.split("/").filter(s => s.length > 0).at(1);
        setStoryProgressIndexByUsername($('.IG_DWSTORY').parent(), username, 'IG_DWSTORY_POSITION');
        updateStoryThumbnailButton();
    }
}
