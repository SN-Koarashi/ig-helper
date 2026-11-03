import { USER_SETTING, SVG, state } from "../settings";
import {
    updateLoadingBar, openNewTab, logger,
    setDownloadProgress, saveFiles, getStoryProgress,
    tryHandleDashFromMediaItem,
    getHighlightCurrentTimeElement, setTimeElementDateAndLocaleTime,
    setStoryProgressIndexText, setStoryProgressIndexByUsername,
    updatePopupSelectionSummary, getVisibleStoryTimestamp, getCurrentStoryItemIndex,
    getMediaIdOfStoryOrHighlightFromEmbeddedJSON, getVisibleImageMediaId,
    resolveMediaIdOfStoryOrHighlightByTimestamp, getHighlightButtonContainer,
    updateHighlightThumbnailButton, getVisibleVideoPosterMediaIds
} from "../utils/general";
import { _i18n } from "../utils/i18n";
import { getHighlightStories, isReelsMediaVideo } from "../utils/api";
import { createStoryListDOM } from "./story";
import { getImageFromCache } from "../utils/image_cache";
import { IG_createDM } from "../utils/dialog";
/*! ESLINT IMPORT END !*/

/**
 * getHighlightsStoryUsername
 * @description Get the current highlight story owner's username.
 *
 * @return {?String}
 */
export function getHighlightsStoryUsername() {
    let href = $('body > div section:visible a[href^="/"]').filter(function () {
        return $(this).attr('href').split('/').filter(e => e.length > 0).length === 1
    }).first().attr('href');

    return href?.split('/').filter(e => e.length > 0).at(0);
}

/**
 * onHighlightsStoryAll
 * @description Trigger user's highlight all download event.
 *
 * @return {void}
 */
export async function onHighlightsStoryAll() {
    updateLoadingBar(true);

    let date = new Date().getTime();
    let timestamp = Math.floor(date / 1000);
    let highlightId = location.href.replace(/\/$/ig, '').split('/').at(-1);

    // Open popup immediately with loading indicator when not in direct download mode
    if (!USER_SETTING.DIRECT_DOWNLOAD_STORY) {
        IG_createDM(false, true);
        $('.IG_POPUP_DIG #post_info').text(`Highlight: ${highlightId}`);
        $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY').append('<p id="_SNLOAD">' + _i18n("LOAD_BLOB_MULTIPLE") + '</p>');
        updatePopupSelectionSummary();
    }

    try {
        let highStories = await getHighlightStories(highlightId);
        let username = highStories.data.xdt_api__v1__feed__reels_media__connection.edges[0].node.user.username;

        if (USER_SETTING.DIRECT_DOWNLOAD_STORY) {
            let complete = 0;
            const items = highStories.data.xdt_api__v1__feed__reels_media__connection.edges[0].node.items;
            const totalItems = items.length;
            setDownloadProgress(complete, totalItems);

            items.forEach((item, idx) => {
                setTimeout(() => {
                    if (USER_SETTING.RENAME_PUBLISH_DATE) {
                        timestamp = item.taken_at_timestamp || item.taken_at;
                    }

                    item.image_versions2.candidates.sort(function (a, b) {
                        if (a.config_width < b.config_width) return 1;
                        if (a.config_width > b.config_width) return -1;
                        return 0;
                    });

                    if (item.is_video || item.video_versions != null) {
                        (async () => {
                            await saveFiles(item.video_versions[0].url, {
                                username,
                                sourceType: "highlights",
                                timestamp,
                                filetype: 'mp4',
                                shortcode: item.id,
                                thumbnailURL: item.image_versions2?.candidates?.[0]?.url
                            });
                            setDownloadProgress(++complete, totalItems);
                        })();
                    }
                    else {
                        saveFiles(item.image_versions2.candidates[0].url, {
                            username,
                            sourceType: "highlights",
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
            createStoryListDOM(highStories.data.xdt_api__v1__feed__reels_media__connection.edges[0].node, 'highlights');
        }
    }
    catch (err) {
        logger('onHighlightsStoryAll', 'Failed to fetch highlight stories', err);
        $('.IG_POPUP_DIG #_SNLOAD').text('Failed to load highlights.');
        updateLoadingBar(false);
    }
}

/**
 * onHighlightsStory
 * @description Trigger user's highlight download event or button display event.
 *
 * @param  {Boolean}  isDownload - Check if it is a download operation
 * @param  {Boolean}  isPreview - Check if it is need to open new tab
 * @return {void}
 */
export async function onHighlightsStory(isDownload, isPreview, isInternalRetry) {
    var username = getHighlightsStoryUsername();

    if (isDownload) {
        // FIX: same mutex + try/catch/finally pattern as onStory(), for the
        // same reason (prevents overlapping concurrent downloads and guarantees
        // the loading bar is reset even if an unexpected exception occurs).
        if (!isInternalRetry) {
            if (state.highlightDownloadInProgress) {
                logger('onHighlightsStory', 'Download already in progress, ignoring additional call');
                return;
            }

            state.highlightDownloadInProgress = true;
            updateLoadingBar(true);
        }

        let date = new Date().getTime();
        let timestamp = Math.floor(date / 1000);
        let highlightId = location.href.replace(/\/$/ig, '').split('/').at(-1);
        const visibleStoryTimestamp = getVisibleStoryTimestamp();

        try {

            const useStoriesGraphQL = (USER_SETTING.FORCE_GRAPHQL_QUERY_FOR_STORIES_AND_HIGHLIGHTS || (isPreview && USER_SETTING.NEW_TAB_ALWAYS_FORCE_GRAPHQL_IN_STORIES_AND_HIGHLIGHTS)) && !state.tempFetchGraphQLUnavailable;

            /*
         * mediaId candidate resolution, run BEFORE the highlight fetch
         * when possible, in the same priority order as onStory():
         *   1) DOM JSON fast path — reads the pk straight out of IG's
         *      own embedded reels_media payload
         *      (getMediaIdOfStoryOrHighlightFromEmbeddedJSON). Highlights
         *      carry no numeric mediaId in the URL (unlike Stories), so
         *      there is no urlID step here.
         *   2) resolveMediaIdOfStoryOrHighlightByTimestamp() — tried
         *      further below, once the highlight response is available
         *      (it needs the fetched items to compare timestamps
         *      against, so it cannot run in this pre-fetch section).
         *   3) DOM-derived id from the currently-visible <img>
         *      (getVisibleImageMediaId(), the ig_cache_key trick) —
         *      last-resort local fallback, tried further below only
         *      once steps 1-2 both yielded nothing.
         *
         * candidateIds here is used ONLY for the local media-cache
         * lookup right below — it intentionally also includes the
         * step-3 candidate (domMediaId), since checking the cache is a
         * pure optimization independent of resolution priority: if
         * either candidate is already cached, we can avoid the
         * highlight fetch entirely. Priority order only matters for
         * which candidate becomes the AUTHORITATIVE mediaId when
         * nothing is cached (see below) — there, domMediaId (step 3)
         * is deliberately excluded, same as in onStory().
         */
            const storyItemIndex = getCurrentStoryItemIndex(username);
            const domJsonMediaId = getMediaIdOfStoryOrHighlightFromEmbeddedJSON(storyItemIndex ?? 0);
            const domMediaId = getVisibleImageMediaId();

            const candidateIds = [];
            if (domJsonMediaId) candidateIds.push(domJsonMediaId);
            if (domMediaId) candidateIds.push(domMediaId);

            let mediaId = null;
            const currentHighlightHasVideo = $('body > div section:visible video[playsinline]').length > 0;

            if (USER_SETTING.CAPTURE_IMAGE_VIA_MEDIA_CACHE) {
                for (const candidateId of candidateIds) {
                    const cached = getImageFromCache(candidateId);

                    if (cached && !currentHighlightHasVideo) {
                        logger("[Restore Cached onHighlightsStory]", candidateId);

                        if (isPreview) {
                            openNewTab(cached);
                        }
                        else {
                            saveFiles(cached, {
                                username,
                                sourceType: "highlights",
                                timestamp,
                                filetype: 'jpg',
                                shortcode: candidateId
                            });
                        }

                        return;
                    }
                }

                /*
             * Nothing cached — keep the AUTHORITATIVE local candidate
             * (if any) as a known mediaId, so it isn't re-derived from
             * scratch. domMediaId (step 3) is deliberately NOT
             * considered here — see the resolution-priority note above.
             */
                if (domJsonMediaId) {
                    mediaId = domJsonMediaId;
                }
            }
            else if (domJsonMediaId) {
                /*
             * CAPTURE_IMAGE_VIA_MEDIA_CACHE off — no cache lookup, but
             * we already have a precise pk straight from IG's own
             * embedded reels_media JSON. Use it directly instead of
             * falling through to the resolution chain below, which only
             * kicks in once resolveMediaIdOfStoryOrHighlightByTimestamp()
             * and domMediaId (step 3) also fail to resolve anything.
             */
                mediaId = domJsonMediaId;
            }

            let highStories;
            let items;
            const cachedHighlight = state.GL_dataCache.highlights[highlightId];

            if (cachedHighlight) {
                logger('Fetch from memory cache:', highlightId);
                highStories = cachedHighlight;
                items = highStories.data.xdt_api__v1__feed__reels_media__connection.edges[0].node.items;
                username = highStories.data.xdt_api__v1__feed__reels_media__connection.edges[0].node.user.username;
            }
            else {
                try {
                    highStories = await getHighlightStories(highlightId);
                }
                catch (err) {
                    logger('[Instagram Stories GraphQL]', 'fetch highlight failed', err);
                    if (useStoriesGraphQL && USER_SETTING.FALLBACK_TO_BLOB_FETCH_IF_STORIES_GRAPHQL_UNAVAILABLE) {
                        state.tempFetchGraphQLUnavailable = true;
                        await onHighlightsStory(isDownload, isPreview, true);
                    }
                    else {
                        alert('Fetch failed for highlight.');
                    }
                    return;
                }

                // Cache the complete highlight response regardless of which API supplied it.
                // The cached response is reusable by Download, New Tab and Thumbnail actions.
                items = highStories.data.xdt_api__v1__feed__reels_media__connection.edges[0].node.items.reverse();
                username = highStories.data.xdt_api__v1__feed__reels_media__connection.edges[0].node.user.username;
                state.GL_dataCache.highlights[highlightId] = highStories;
            }

            /*
         * 1) domJsonMediaId, already resolved pre-fetch above (if
         * present) — use it directly instead of re-deriving.
         */
            let target = (mediaId != null ? items.find(item => String(item.pk ?? item.id) === String(mediaId)) : null) || null;

            /*
         * 2) resolveMediaIdOfStoryOrHighlightByTimestamp() — the
         * highlight cache is API-agnostic: always resolve the visible
         * item the same way, regardless of whether the response came
         * from Instagram Stories GraphQL or GraphQL.
         */
            if (target == null) {
                const bestId = resolveMediaIdOfStoryOrHighlightByTimestamp(highStories, visibleStoryTimestamp);
                target = (bestId != null ? items.find(item => String(item.pk ?? item.id) === String(bestId)) : null) || null;
            }

            /*
         * 3) DOM-derived id from the currently-visible <img>
         * (domMediaId, the ig_cache_key trick — already computed in the
         * pre-fetch candidate gathering above). Last local resort
         * before falling back to pure DOM-position matching below.
         */
            if (target == null && domMediaId) {
                target = items.find(item => String(item.pk ?? item.id) === String(domMediaId)) || null;
            }

            // 4) Fallback to visible highlight progress.
            if (target == null) {
                let $header = getStoryProgress(username);
                $header.each(function (index) {
                    if (target == null && $(this).children().length > 0) {
                        target = items[index] || null;
                    }
                });
            }

            // 5) Fallback to the old profile-page / home-page layouts.
            if (target == null) {
                $('body > div section:visible div.x1ned7t2.x78zum5 > div').each(function (index) {
                    const $this = $(this);
                    if (target == null && $this.hasClass('x1lix1fw') && $this.children().length > 0) {
                        target = items[index] || null;
                    }
                });

                $('body > div section:visible ._ac0k > ._ac3r > div').each(function (index) {
                    if (target == null && $(this).children().hasClass('_ac3q')) {
                        target = items[index] || null;
                    }
                });
            }

            // 6) Ultimate fallback: the first item in the highlight tray.
            target = target || items[0] || null;

            if (!target) {
                alert('Cannot resolve the Story item from the GraphQL response.');
                return;
            }

            logger('onHighlightsStory', highlightId, target);

            if (USER_SETTING.RENAME_PUBLISH_DATE) {
                timestamp = target.taken_at_timestamp || target.taken_at || timestamp;
            }

            mediaId = target.pk ?? target.id;

            /*
         * Check the persistent/session image cache once, before any download work.
         */
            if (USER_SETTING.CAPTURE_IMAGE_VIA_MEDIA_CACHE && !isReelsMediaVideo(target)) {
                const cached = getImageFromCache(mediaId);
                if (cached) {
                    logger("[Restore cached onHighlightsStory]", mediaId);
                    if (isPreview) {
                        openNewTab(cached);
                    }
                    else {
                        saveFiles(cached, {
                            username,
                            sourceType: "highlights",
                            timestamp,
                            filetype: 'jpg',
                            shortcode: mediaId
                        });
                    }
                    return;
                }
            }

            if (target.is_video || target.video_versions != null || isReelsMediaVideo(target)) {
                const handled = await tryHandleDashFromMediaItem({
                    mediaItem: target,
                    username,
                    sourceType: "highlights",
                    timestamp,
                    shortcode: mediaId,
                    isPreview,
                });
                if (handled) {
                    return;
                }

                const videoUrl = target.video_versions?.at(-1)?.url || target.video_versions?.[0]?.url || target.video_resources?.at(-1)?.src;

                if (!videoUrl) {
                    alert('Cannot find highlight video URL.');
                    return;
                }

                if (isPreview) {
                    openNewTab(videoUrl, username);
                }
                else {
                    saveFiles(videoUrl, {
                        username,
                        sourceType: "highlights",
                        timestamp,
                        filetype: 'mp4',
                        shortcode: mediaId,
                        thumbnailURL: target.image_versions2?.candidates?.at(-1)?.url || target.image_versions2?.candidates?.[0]?.url || target.display_url || target.display_resources?.at(-1)?.src
                    });
                }
            }
            else {
                const imageUrl = target.image_versions2?.candidates?.at(-1)?.url || target.image_versions2?.candidates?.[0]?.url || target.display_url || target.display_resources?.at(-1)?.src;

                if (!imageUrl) {
                    alert('Cannot find highlight image URL.');
                    return;
                }

                if (isPreview) {
                    openNewTab(imageUrl, username);
                }
                else {
                    saveFiles(imageUrl, {
                        username,
                        sourceType: "highlights",
                        timestamp,
                        filetype: 'jpg',
                        shortcode: mediaId
                    });
                }
            }

        }
        catch (err) {
            logger('onHighlightsStory', 'Unexpected error while downloading highlight', err);
            alert('Fetch failed for highlight.');
        }
        finally {
            if (!isInternalRetry) {
                state.highlightDownloadInProgress = false;
                updateLoadingBar(false);
            }
        }
    }
    else {
        // Add the stories download button
        if (!$('.IG_DWHISTORY').length) {
            let $element = getHighlightButtonContainer();

            if ($element.length > 0) {
                //$element.css('position','relative');
                $element.append(`<div data-ih-locale-title="DW" title="${_i18n("DW")}" class="IG_DWHISTORY">${SVG.DOWNLOAD}</div>`);
                $element.append(`<div data-ih-locale-title="NEW_TAB" title="${_i18n("NEW_TAB")}" class="IG_DWHINEWTAB">${SVG.NEW_TAB}</div>`);

                // Synchronously append thumbnail button if the volume slider is already present
                if ($('section:visible [role="slider"]').length) {
                    $element.append(`<div data-ih-locale-title="VIDEO_THUMBNAIL" title="${_i18n("VIDEO_THUMBNAIL")}" class="IG_DWHISTORY_THUMBNAIL">${SVG.THUMBNAIL}</div>`);
                }

                let $header = getStoryProgress(username);
                if ($header.length > 1) {
                    $element.append(`<div data-ih-locale-title="DW_ALL" title="${_i18n("DW_ALL")}" class="IG_DWHISTORY_ALL">${SVG.DOWNLOAD_ALL}</div>`);
                }

                setStoryProgressIndexText($element, $header, 'IG_DWHISTORY_POSITION');

                // replace something times ago format to publish time in first init
                setTimeElementDateAndLocaleTime(getHighlightCurrentTimeElement($header));

                //// Modify video volume
                //if(USER_SETTING.MODIFY_VIDEO_VOLUME){
                //    $element.find('video').each(function(){
                //        $(this).one('play playing', function(){
                //            if(!$(this).data('modify')){
                //                $(this).data('modify', true);
                //                this.volume = VIDEO_VOLUME;
                //                logger('(highlight) Added video event listener #modify');
                //            }
                //        });
                //    });
                //}

                // Try to use event listener 'timeupdate' in order to detect if highlight is a video
                //$element.find('video').each(function(){
                //    $(this).one('timeupdate',function(){
                //        if(!$(this).data('modify-thumbnail')){
                //            if($element.find('.IG_DWHISTORY_THUMBNAIL').length === 0){
                //                $(this).data('modify-thumbnail', true);
                //                onHighlightsStoryThumbnail(false);
                //                logger('(highlight) Manually inserting thumbnail button');
                //            }
                //            else{
                //                $(this).data('modify-thumbnail', true);
                //                logger('(highlight) Thumbnail button already inserted');
                //            }
                //        }
                //    });
                //});
            }
        }
        else {
            setStoryProgressIndexByUsername($('.IG_DWHISTORY').parent(), getHighlightsStoryUsername(), 'IG_DWHISTORY_POSITION');
            updateHighlightThumbnailButton();
        }
    }
}


/**
 * onHighlightsStoryThumbnail
 * @description Trigger user's highlight video thumbnail download event or button display event.
 *
 * @param  {Boolean}  isDownload - Check if it is a download operation
 * @return {void}
 */
export async function onHighlightsStoryThumbnail(isDownload) {
    if (isDownload) {
        let date = new Date().getTime();
        let timestamp = Math.floor(date / 1000);
        let highlightId = location.href.replace(/\/$/ig, '').split('/').at(-1);
        const visibleStoryTimestamp = getVisibleStoryTimestamp();
        let username = getHighlightsStoryUsername();
        let nowIndex = $("body > div section._ac0a header._ac0k > ._ac3r ._ac3n ._ac3p[style]").length ||
            $('body > div section:visible > div > div:not([class]) > div > div div.x1ned7t2.x78zum5 div.x1caxmr6').length ||
            $('body > div div:not([hidden]) section:visible > div div[style]:not([class]) > div').find('div div.x1ned7t2.x78zum5 div.x1caxmr6').length;

        updateLoadingBar(true);

        const useStoriesGraphQL = USER_SETTING.FORCE_GRAPHQL_QUERY_FOR_STORIES_AND_HIGHLIGHTS && !state.tempFetchGraphQLUnavailable;

        /*
         * mediaId candidate resolution, run BEFORE the highlight fetch
         * when possible, in the same priority order as
         * onStoryThumbnail() / onHighlightsStory():
         *   1) DOM JSON fast path — reads the pk straight out of IG's
         *      own embedded reels_media payload
         *      (getMediaIdOfStoryOrHighlightFromEmbeddedJSON).
         *   2) resolveMediaIdOfStoryOrHighlightByTimestamp() — tried
         *      further below, once the highlight response is available.
         *   3) DOM-derived id(s) from the currently-visible <video>
         *      poster(s) (getVisibleVideoPosterMediaIds()) —
         *      last-resort local fallback, tried further below only
         *      once steps 1-2 both yielded nothing.
         *
         * candidateIds here is used ONLY for the local media-cache
         * lookup right below — see the matching note in
         * onStoryThumbnail() for why domMediaIds are excluded from the
         * AUTHORITATIVE pre-fetch mediaId assignment further below.
         */
        const storyItemIndex = getCurrentStoryItemIndex(username);
        const domJsonMediaId = getMediaIdOfStoryOrHighlightFromEmbeddedJSON(storyItemIndex ?? 0);
        const domMediaIds = getVisibleVideoPosterMediaIds().filter(id => id !== domJsonMediaId);

        const candidateIds = [];
        if (domJsonMediaId) candidateIds.push(domJsonMediaId);
        candidateIds.push(...domMediaIds);

        let mediaId = null;

        if (USER_SETTING.CAPTURE_IMAGE_VIA_MEDIA_CACHE) {
            for (const candidateId of candidateIds) {
                const cached = getImageFromCache(candidateId);

                if (cached) {
                    logger("[Restore Cached onHighlightsStoryThumbnail]", candidateId);

                    saveFiles(cached, {
                        username,
                        sourceType: "highlights",
                        timestamp,
                        filetype: 'jpg',
                        shortcode: candidateId
                    });

                    state.tempFetchGraphQLUnavailable = false;
                    updateLoadingBar(false);
                    return;
                }
            }

            /*
             * Nothing cached — keep the AUTHORITATIVE local candidate
             * (if any) as a known mediaId, so it isn't re-derived from
             * scratch. domMediaIds (step 3) are deliberately NOT
             * considered here — see the resolution-priority note above.
             */
            if (domJsonMediaId) {
                mediaId = domJsonMediaId;
            }
        }
        else if (domJsonMediaId) {
            /*
             * CAPTURE_IMAGE_VIA_MEDIA_CACHE off — no cache lookup, but
             * we already have a precise pk straight from IG's own
             * embedded reels_media JSON. Use it directly instead of
             * falling through to the resolution chain below, which only
             * kicks in once resolveMediaIdOfStoryOrHighlightByTimestamp()
             * and domMediaIds (step 3) also fail to resolve anything.
             */
            mediaId = domJsonMediaId;
        }

        let highStories;
        let items;
        const cachedHighlight = state.GL_dataCache.highlights[highlightId];

        if (cachedHighlight) {
            logger('Fetch from memory cache:', highlightId);
            highStories = cachedHighlight;
            items = highStories.data.xdt_api__v1__feed__reels_media__connection.edges[0].node.items;
            username = highStories.data.xdt_api__v1__feed__reels_media__connection.edges[0].node.user.username;
        }
        else {
            try {
                highStories = await getHighlightStories(highlightId);
            }
            catch (err) {
                logger('[Instagram Stories GraphQL]', 'fetch highlight thumbnail failed', err);
                if (useStoriesGraphQL && USER_SETTING.FALLBACK_TO_BLOB_FETCH_IF_STORIES_GRAPHQL_UNAVAILABLE) {
                    state.tempFetchGraphQLUnavailable = true;
                    onHighlightsStoryThumbnail(isDownload);
                }
                else {
                    alert('Fetch failed for highlight.');
                    updateLoadingBar(false);
                }
                return;
            }

            // Cache the complete highlight response regardless of which API supplied it.
            // A later thumbnail/download/new-tab action can reuse the same response.
            items = highStories.data.xdt_api__v1__feed__reels_media__connection.edges[0].node.items.reverse();
            username = highStories.data.xdt_api__v1__feed__reels_media__connection.edges[0].node.user.username;
            state.GL_dataCache.highlights[highlightId] = highStories;
        }

        /*
         * 1) domJsonMediaId, already resolved pre-fetch above (if
         * present) — use it directly instead of re-deriving.
         */
        let target = (mediaId != null ? items.find(item => String(item.pk ?? item.id) === String(mediaId)) : null) || null;

        /*
         * 2) resolveMediaIdOfStoryOrHighlightByTimestamp() — highlight
         * target resolution is API-agnostic and timestamp-first.
         */
        if (target == null) {
            const bestId = resolveMediaIdOfStoryOrHighlightByTimestamp(highStories, visibleStoryTimestamp);
            target = (bestId != null ? items.find(item => String(item.pk ?? item.id) === String(bestId)) : null) || null;
        }

        /*
         * 3) DOM-derived id(s) from the currently-visible <video>
         * poster(s) (domMediaIds — already computed in the pre-fetch
         * candidate gathering above). Last local resort before falling
         * back to pure DOM-position matching below.
         */
        if (target == null) {
            for (const domMediaId of domMediaIds) {
                const found = items.find(item => String(item.pk ?? item.id) === String(domMediaId));
                if (found) {
                    target = found;
                    break;
                }
            }
        }

        // 4) Fallback to visible highlight progress.
        if (target == null) {
            let $header = getStoryProgress(username);
            $header.each(function (index) {
                if (target == null && $(this).children().length > 0) {
                    target = items[index] || null;
                }
            });
        }

        // 5) Ultimate fallback: position-count-based.
        if (target == null) {
            let totIndex = items.length;
            target = items[totIndex - nowIndex] || items[0] || null;
        }

        if (!target) {
            alert('Cannot resolve the Highlight thumbnail item from the GraphQL response.');
            updateLoadingBar(false);
            return;
        }

        mediaId = target.pk ?? target.id;

        if (USER_SETTING.RENAME_PUBLISH_DATE) {
            timestamp = target.taken_at_timestamp || target.taken_at || timestamp;
        }

        if (USER_SETTING.CAPTURE_IMAGE_VIA_MEDIA_CACHE) {
            const cached = getImageFromCache(mediaId);
            if (cached) {
                logger("[Restore cached onHighlightsStoryThumbnail]", mediaId);
                saveFiles(cached, {
                    username,
                    sourceType: "highlights",
                    timestamp,
                    filetype: 'jpg',
                    shortcode: mediaId
                });
                state.tempFetchGraphQLUnavailable = false;
                updateLoadingBar(false);
                return;
            }
        }

        // Thumbnail is always an image — this must never enter the DASH/video path,
        // regardless of which source (Instagram Stories GraphQL or classic GraphQL) resolved `target`.
        const thumbnailURL = target.image_versions2?.candidates?.at(-1)?.url ||
            target.image_versions2?.candidates?.[0]?.url ||
            target.display_url ||
            target.display_resources?.at(-1)?.src;

        if (!thumbnailURL) {
            alert('No highlight thumbnail URL found.');
            updateLoadingBar(false);
            return;
        }

        saveFiles(thumbnailURL, {
            username,
            sourceType: "highlights",
            timestamp,
            filetype: 'jpg',
            shortcode: mediaId
        });

        state.tempFetchGraphQLUnavailable = false;
        updateLoadingBar(false);
    }
    else {
        setStoryProgressIndexByUsername($('.IG_DWHISTORY').parent(), getHighlightsStoryUsername(), 'IG_DWHISTORY_POSITION');
        updateHighlightThumbnailButton();
    }
}

