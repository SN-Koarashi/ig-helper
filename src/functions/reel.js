import { USER_SETTING, SVG, state } from "../settings";
import { updateLoadingBar, saveFiles, openNewTab, logger, toggleVolumeSilder, triggerReactClickHandler } from "../utils/general";
import { getBlobMedia } from "../utils/api";
import { filterResourceData } from "./post";
import { _i18n } from "../utils/i18n";
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
export async function onReels(isDownload, isVideo, isPreview) {
    try {
        if (isDownload) {
            updateLoadingBar(true);

            let reelsPath = location.href.split('?').at(0).split('instagram.com/reels/').at(-1).replaceAll('/', '');
            let result = await getBlobMedia(reelsPath);
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
                            shortcode: reelsPath
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
                            shortcode: reelsPath
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
            var timer = setInterval(() => {
                const hasTiktokStyleLayout = $(svgClose).length > 0;
                if (hasTiktokStyleLayout || $('section > main[role="main"] > div div.x1qjc9v5 video').length > 0) {
                    clearInterval(timer);

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
            }, 250);
        }
    }
    catch (err) {
        console.error("[reels]", err);
    }
}

function appendReelsButton($main) {
    // OPTIMIZATION: cache $main.children() and $main.find('video') usage
    const $mainChildren = $main.children();
    if (!$mainChildren.find('.IG_REELS').length) {
        $mainChildren.css('position', 'relative');

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
                $(this).on('ended', function () {
                    const $this = $(this);
                    if (!$this.data('loop')) {
                        let $element_play_button = $this.next().find('div[role="presentation"] > div svg > path[d^="M5.888"]').parents('button[role="button"], div[role="button"]');
                        if ($element_play_button.length > 0) {
                            $this.data('loop', true);
                            $element_play_button.trigger("click");
                            logger('Adding video event listener #loop, then paused click()');
                        }
                        else {
                            $this.data('loop', true);
                            $this.parent().find('.xpgaw4o').removeAttr('style');
                            this.pause();
                            logger('Adding video event listener #loop, then paused pause()');
                        }
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

                    $video.css('position', 'relative');
                    $video.data('controls', true);
                }
            });
        }

        var $buttonParent = $main.find('div[role="presentation"] > div[role="button"] > div').first();
        toggleVolumeSilder($videos, $buttonParent, 'reel');
    }
}