import { USER_SETTING, SVG, state } from "../settings";
import {
    updateLoadingBar, saveFiles, openNewTab, logger, toggleVolumeSilder,
    triggerReactClickHandler, markContainerPositioned
} from "../utils/general";
import { getPostMediaWithProvider } from "../utils/api";
import { filterResourceData } from "./post";
import { _i18n } from "../utils/i18n";
import { mediaIdFromURL, getImageFromCache } from "../utils/image_cache";
/*! ESLINT IMPORT END !*/

/**
 * onReels
 * @description Trigger user's reels download event or button display event.
 *
 * @param  {Boolean}  isDownload - Check if it is a download operation
 * @param  {Boolean}  isVideo - Check if reel is a video element
 * @param  {Boolean}  isPreview - Check if it is need to open new tab
 * @return {void}
 */
export async function onReels(isDownload, isVideo, isPreview, clickedButton) {
    try {
        if (isDownload) {
            updateLoadingBar(true);

            let reelsPath = location.href.split('?').at(0).split('instagram.com/reels/').at(-1).replaceAll('/', '');

            // .IG_REELS_THUMBNAIL is handled by onReels(), so the cache check
            // happens here, before getBlobMediaWithQueryID(). Uses the exact
            // Reel container belonging to the clicked button instead of
            // globally selecting the first visible video on the page.
            if (!isVideo && USER_SETTING.CAPTURE_IMAGE_VIA_MEDIA_CACHE && clickedButton) {
                const $button = $(clickedButton);
                const $reelContainer = $button.parents().filter(function () {
                    return $(this).find('video').length > 0;
                }).first();

                const candidateUrls = [];
                $reelContainer.find('video').each(function () {
                    const poster = this.getAttribute('poster') || this.poster;
                    if (poster) candidateUrls.push(poster);
                });
                $reelContainer.find('img[src]').each(function () {
                    const src = this.getAttribute('src');
                    if (src) candidateUrls.push(src);
                });

                const seenIds = new Set();
                for (const candidateUrl of candidateUrls) {
                    const mediaId = mediaIdFromURL(candidateUrl);
                    if (!mediaId || seenIds.has(mediaId)) continue;
                    seenIds.add(mediaId);

                    const cachedThumbnail = getImageFromCache(mediaId);
                    if (!cachedThumbnail) continue;

                    logger('[Restore cached reel thumbnail]', mediaId);

                    let cachedTimestamp = Date.now();
                    if (USER_SETTING.RENAME_PUBLISH_DATE) {
                        const timeValue = $reelContainer.find('a[href] time[datetime]').first().attr('datetime');
                        if (timeValue) cachedTimestamp = new Date(timeValue).getTime();
                    }

                    // The Reel container often has a profile/avatar link whose visible
                    // text is empty, so the username is resolved from the href first,
                    // then falls back to text/data attributes.
                    const excludedProfilePaths = /^(reels|explore|accounts|direct|stories|p|about|developer|privacy|terms|web|directory|emails|challenge)$/i;
                    let cachedUsername = '';

                    $reelContainer.find('a[href]').each(function () {
                        if (cachedUsername) return;

                        const href = $(this).attr('href') || '';
                        try {
                            const pathParts = new URL(href, location.origin).pathname.split('/').filter(Boolean);
                            if (pathParts.length === 1 &&
                                /^[A-Za-z0-9._]+$/.test(pathParts[0]) &&
                                !excludedProfilePaths.test(pathParts[0])) {
                                cachedUsername = pathParts[0];
                            }
                            // eslint-disable-next-line no-unused-vars
                        } catch (_) {
                            // Ignore malformed/non-URL hrefs and continue searching.
                        }
                    });

                    if (!cachedUsername) {
                        cachedUsername = $reelContainer.find('[data-username]').filter(function () {
                            return !!$(this).attr('data-username');
                        }).first().attr('data-username') || '';
                    }

                    if (!cachedUsername) {
                        cachedUsername = $reelContainer.find('a[href^="/"]').filter(function () {
                            return ($(this).text() || '').trim().length > 0;
                        }).first().text().trim();
                    }

                    if (!cachedUsername) {
                        cachedUsername = state.GL_username || '';
                    }

                    if (!cachedUsername) {
                        logger('[Fast path] Cached Reel thumbnail found, but username could not be resolved; skipping save to avoid API lookup', mediaId);
                        updateLoadingBar(false);
                        return;
                    }

                    await saveFiles(cachedThumbnail, {
                        username: cachedUsername,
                        sourceType: 'reels',
                        timestamp: USER_SETTING.RENAME_PUBLISH_DATE ? cachedTimestamp : Date.now(),
                        filetype: 'jpg',
                        shortcode: reelsPath
                    });
                    updateLoadingBar(false);
                    return;
                }

                logger('[Cache miss] No cached Reel thumbnail for clicked Reel', candidateUrls);
            }

            // Only reach the network when the persistent media cache does not contain
            // the currently visible Reel thumbnail. When the Polaris switch is enabled,
            // this uses PolarisPostRootQuery instead of the legacy media query endpoints.
            let result = await getPostMediaWithProvider(reelsPath);
            let media = filterResourceData(result.data);

            let timestamp = new Date().getTime();

            if (USER_SETTING.RENAME_PUBLISH_DATE) {
                if (result.type === 'query_hash') {
                    timestamp = media.taken_at_timestamp;
                }
                else {
                    timestamp = media.taken_at;
                }
            }

            if (result.type === 'query_hash') {
                if (isVideo && media.is_video) {
                    if (isPreview) {
                        openNewTab(media.video_url);
                    }
                    else {
                        let type = 'mp4';
                        saveFiles(media.video_url, {
                            username: media.owner.username,
                            sourceType: "reels",
                            timestamp,
                            filetype: type,
                            shortcode: reelsPath,
                            thumbnailURL: media.display_resources?.at(-1)?.src
                        });
                    }
                }
                else {
                    if (isPreview) {
                        openNewTab(media.display_resources.at(-1).src);
                    }
                    else {
                        let type = 'jpg';
                        saveFiles(media.display_resources.at(-1).src, {
                            username: media.owner.username,
                            sourceType: "reels",
                            timestamp,
                            filetype: type,
                            shortcode: reelsPath
                        });
                    }
                }
            }
            else {
                if (isVideo && media.video_versions != null) {
                    if (isPreview) {
                        openNewTab(media.video_versions[0].url);
                    }
                    else {
                        let type = 'mp4';
                        saveFiles(media.video_versions[0].url, {
                            username: media.owner.username,
                            sourceType: "reels",
                            timestamp,
                            filetype: type,
                            shortcode: reelsPath,
                            thumbnailURL: media.image_versions2?.candidates?.[0]?.url
                        });
                    }
                }
                else {
                    if (isPreview) {
                        openNewTab(media.image_versions2.candidates[0].url);
                    }
                    else {
                        let type = 'jpg';
                        saveFiles(media.image_versions2.candidates[0].url, {
                            username: media.owner.username,
                            sourceType: "reels",
                            timestamp,
                            filetype: type,
                            shortcode: reelsPath
                        });
                    }
                }
            }

            updateLoadingBar(false);
        }
        else {
            const svgClose = 'svg > polyline[points^="20.643 3.357 12 12 3.353 20.647"] ~ line';
            let reelsTries = 0;
            clearInterval(state.GL_reelsTimer);
            state.GL_reelsTimer = setInterval(() => {
                // Give up after ~30s so the interval can never run forever
                if (++reelsTries > 120) {
                    clearInterval(state.GL_reelsTimer);
                    return;
                }

                const hasTiktokStyleLayout = $(svgClose).length > 0;
                if (hasTiktokStyleLayout || $('section > main[role="main"] > div div.x1qjc9v5 video').length > 0) {
                    clearInterval(state.GL_reelsTimer);

                    if (USER_SETTING.SCROLL_BUTTON) {
                        $('#scrollWrapper').remove();
                        // OPTIMIZATION: cache reels main element (used 5 times below)
                        const $reelsMain = $('section > main[role="main"]');
                        $reelsMain.append('<section id="scrollWrapper"></section>');
                        const $scrollWrapper = $reelsMain.find('> #scrollWrapper');
                        $scrollWrapper.append('<div class="button-up"><div></div></div>');
                        $scrollWrapper.append('<div class="button-down"><div></div></div>');

                        $scrollWrapper.find('> .button-up').on('click', function () {
                            $reelsMain.find('> div')[0].scrollBy({ top: -30, behavior: "smooth" });
                        });
                        $scrollWrapper.find('> .button-down').on('click', function () {
                            $reelsMain.find('> div')[0].scrollBy({ top: 30, behavior: "smooth" });
                        });
                    }

                    attachReelsButtons();
                }
            }, 250);
        }
    }
    catch (err) {
        console.error("[reels]", err);
    }
}

/**
 * attachReelsButtons
 * @description Attach the download buttons to every fully visible reel that
 *              does not have them yet. Idempotent (appendReelsButton() skips
 *              reels that already have the buttons), so it can be called again
 *              whenever Instagram renders more reels while scrolling.
 *
 * @return {void}
 */
export function attachReelsButtons() {
    $('div[aria-busy][tabindex]').children('div').each(function () {
        const $this = $(this);
        if (
            $this.children().length > 0 &&
            $this.width() > window.innerWidth * 0.8 &&
            $this.height() > window.innerHeight * 0.8 &&
            $this.find('video').length > 0
        ) {
            appendReelsButton($this);
        }
    });
}

/**
 * appendReelsButton
 * @description Append the download / new tab / thumbnail buttons and the video
 *              helpers to a single reel.
 *
 * @param  {JQuery<HTMLElement>}  $main - Reel container
 * @return {void}
 */
function appendReelsButton($main) {
    // OPTIMIZATION: cache $main.children() and $main.find('video') usage
    const $mainChildren = $main.children();
    if (!$mainChildren.find('.IG_REELS').length) {
        markContainerPositioned($mainChildren);

        $mainChildren.append(`<div data-ih-locale-title="DW" title="${_i18n("DW")}" class="IG_REELS">${SVG.DOWNLOAD}</div>`);
        $mainChildren.append(`<div data-ih-locale-title="NEW_TAB" title="${_i18n("NEW_TAB")}" class="IG_REELS_NEWTAB">${SVG.NEW_TAB}</div>`);
        $mainChildren.append(`<div data-ih-locale-title="VIDEO_THUMBNAIL" title="${_i18n("VIDEO_THUMBNAIL")}" class="IG_REELS_THUMBNAIL">${SVG.THUMBNAIL}</div>`);

        const $videos = $main.find('video');

        $videos.each(function () {
            $(this).off('fullscreenchange.IG_videoControl').on('fullscreenchange.IG_videoControl', function () {
                const $vid = $(this);
                if ($vid.attr('style').includes('object-fit')) {
                    if (document.fullscreenElement == this) {
                        $vid.css('object-fit', 'contain');
                    }
                    else {
                        $vid.css('object-fit', 'cover');
                    }
                }
            });
        });

        // Disable video autoplay
        if (USER_SETTING.DISABLE_VIDEO_LOOPING) {
            $videos.each(function () {
                $(this).one('ended', function () {
                    const $this = $(this);

                    let $element_play_button = $this.next().find('div[role="presentation"] > div svg > path[d^="M5.888"]').parents('button[role="button"], div[role="button"]');
                    if ($element_play_button.length > 0) {
                        $element_play_button.trigger("click");
                        logger('(reel) Stop video playing #loop, then paused click()');
                    }
                    else {
                        $this.parent().find('.xpgaw4o').removeAttr('style');
                        this.pause();
                        logger('(reel) Stop video playing #loop, then paused pause()');
                    }

                });
            });
        }

        if (USER_SETTING.HTML5_VIDEO_CONTROL) {

            const handleSwitchController = function (e) {
                e.preventDefault();
                e.stopPropagation();
                let $overlayElement = null;
                if ($overlayElement == null) {
                    $overlayElement = $(e.target).parents('div[aria-label][data-visualcompletion="ignore"]').first();
                }

                $videos.each(function () {
                    const $v = $(this);
                    $v.css('z-index', '2');
                    $v.attr('controls', true);
                    state.GL_weakCache.overlay.set(this, $overlayElement);
                });

                $overlayElement.css('z-index', '-10');
                $main.find('a[href^="/reels/"]').first().attr("draggable", false);
            };

            $main.off('contextmenu.IG_videoControl').on('contextmenu.IG_videoControl', handleSwitchController);
            $videos.each(function () {
                const $video = $(this);
                if (!$video.data('controls')) {

                    logger('(reel) Added video html5 contorller #modify');

                    if (USER_SETTING.MODIFY_VIDEO_VOLUME) {
                        this.volume = state.videoVolume;

                        $video.on('loadstart', function () {
                            this.volume = state.videoVolume;
                        });
                    }

                    let $mute_button_wrapper = $video.parent().find('video + div > div');
                    $mute_button_wrapper = $mute_button_wrapper.add($main);

                    // eslint-disable-next-line no-unused-vars
                    let $element_mute_button = $mute_button_wrapper.find('button[type="button"], div[role="button"]').filter(function (idx) {
                        const $b = $(this);
                        return $b.width() <= 64 && $b.height() <= 64 && $b.find('svg > path[d^="M16.636 7.028a1.5"], svg > path[d^="M1.5 13.3c-.8"]').length > 0;
                    });

                    state.GL_weakCache.mutedButton.set(this, $element_mute_button);

                    let $targets = $video.parent().find('video + div div[role="button"]').filter(function () {
                        const $t = $(this);
                        return $t.parent('div[role="presentation"]').length > 0 && $t.css('cursor') === 'pointer' && $t.attr('style') != null;
                    }).first();

                    $video.on('contextmenu', function (e) {
                        e.preventDefault();
                        e.stopPropagation();

                        $video.css('z-index', '-1');
                        $video.removeAttr('controls');
                        $targets.css('z-index', '1');
                        state.GL_weakCache.overlay.get(this)?.css('z-index', '1');
                    });

                    $targets.off('contextmenu.IG_videoControl').on('contextmenu.IG_videoControl', handleSwitchController);

                    $video.on('volumechange', function () {
                        let video = this;
                        let $element_mute_button = state.GL_weakCache.mutedButton.get(this) || {};
                        let is_element_muted = $element_mute_button.find && $element_mute_button.find('svg > path[d^="M16.636"]').length === 0;

                        if (this.muted != is_element_muted) {
                            this.volume = state.videoVolume;

                            if ($element_mute_button.length === 1) {
                                triggerReactClickHandler($element_mute_button.first()[0]);
                            }
                            else {
                                let $firstElementMuteButton = $element_mute_button.filter(function () {
                                    return $(this).closest(state.GL_weakCache.overlay.get(video)).length > 0;
                                }).first();

                                triggerReactClickHandler($firstElementMuteButton.first()[0]);
                            }
                        }

                        const $v = $(this);
                        if ($v.data('completed')) {
                            state.videoVolume = this.volume;
                            GM_setValue('G_VIDEO_VOLUME', this.volume);
                        }

                        if (this.volume == state.videoVolume) {
                            $v.data('completed', true);
                        }
                    });

                    markContainerPositioned($video);
                    $video.data('controls', true);
                }
            });
        }

        var $buttonParent = $main.find('div[role="presentation"] > div[role="button"] > div').first();
        toggleVolumeSilder($videos, $buttonParent, 'reel');
    }
}
