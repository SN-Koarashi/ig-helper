import { USER_SETTING, SVG, state } from "../settings";
import { updateLoadingBar, saveFiles, openNewTab, logger, toggleVolumeSilder } from "../utils/general";
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
                        saveFiles(media.video_url, media.owner.username, "reels", timestamp, type, reelsPath);
                    }
                }
                else {
                    if (isPreview) {
                        openNewTab(media.display_resources.at(-1).src);
                    }
                    else {
                        let type = 'jpg';
                        saveFiles(media.display_resources.at(-1).src, media.owner.username, "reels", timestamp, type, reelsPath);
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
                        saveFiles(media.video_versions[0].url, media.owner.username, "reels", timestamp, type, reelsPath);
                    }
                }
                else {
                    if (isPreview) {
                        openNewTab(media.image_versions2.candidates[0].url);
                    }
                    else {
                        let type = 'jpg';
                        saveFiles(media.image_versions2.candidates[0].url, media.owner.username, "reels", timestamp, type, reelsPath);
                    }
                }
            }

            updateLoadingBar(false);
        }
        else {
            //$('.IG_REELS_THUMBNAIL, .IG_REELS').remove();
            var timer = setInterval(() => {
                if ($('section > main[role="main"] > div div.x1qjc9v5 video').length > 0) {
                    clearInterval(timer);

                    if (USER_SETTING.SCROLL_BUTTON) {
                        $('#scrollWrapper').remove();
                        $('section > main[role="main"]').append('<section id="scrollWrapper"></section>');
                        $('section > main[role="main"] > #scrollWrapper').append('<div class="button-up"><div></div></div>');
                        $('section > main[role="main"] > #scrollWrapper').append('<div class="button-down"><div></div></div>');

                        $('section > main[role="main"] > #scrollWrapper > .button-up').on('click', function () {
                            $('section > main[role="main"] > div')[0].scrollBy({ top: -30, behavior: "smooth" });
                        });
                        $('section > main[role="main"] > #scrollWrapper > .button-down').on('click', function () {
                            $('section > main[role="main"] > div')[0].scrollBy({ top: 30, behavior: "smooth" });
                        });
                    }

                    // reels scroll has [tabindex] but header not.
                    $('section > main[role="main"] > div[tabindex], section > main[role="main"] > div[class]').children('div').each(function () {
                        if ($(this).children().length > 0) {
                            if (!$(this).children().find('.IG_REELS').length) {
                                var $main = $(this);

                                $(this).children().css('position', 'relative');

                                $(this).children().append(`<div data-ih-locale-title="DW" title="${_i18n("DW")}" class="IG_REELS">${SVG.DOWNLOAD}</div>`);
                                $(this).children().append(`<div data-ih-locale-title="NEW_TAB" title="${_i18n("NEW_TAB")}" class="IG_REELS_NEWTAB">${SVG.NEW_TAB}</div>`);
                                $(this).children().append(`<div data-ih-locale-title="VIDEO_THUMBNAIL" title="${_i18n("VIDEO_THUMBNAIL")}" class="IG_REELS_THUMBNAIL">${SVG.THUMBNAIL}</div>`);

                                // Disable video autoplay
                                if (USER_SETTING.DISABLE_VIDEO_LOOPING) {
                                    $(this).find('video').each(function () {
                                        $(this).on('ended', function () {
                                            if (!$(this).data('loop')) {
                                                let $element_play_button = $(this).next().find('div[role="presentation"] > div svg > path[d^="M5.888"]').parents('button[role="button"], div[role="button"]');
                                                if ($element_play_button.length > 0) {
                                                    $(this).attr('data-loop', true);
                                                    $element_play_button.trigger("click");
                                                    logger('Adding video event listener #loop, then paused click()');
                                                }
                                                else {
                                                    $(this).attr('data-loop', true);
                                                    $(this).parent().find('.xpgaw4o').removeAttr('style');
                                                    this.pause();
                                                    logger('Adding video event listener #loop, then paused pause()');
                                                }
                                            }
                                        });
                                    });
                                }

                                // Modify video volume
                                //if(USER_SETTING.MODIFY_VIDEO_VOLUME){
                                //    $(this).find('video').each(function(){
                                //        $(this).on('play playing', function(){
                                //            if(!$(this).data('modify')){
                                //                $(this).attr('data-modify', true);
                                //                this.volume = VIDEO_VOLUME;
                                //                logger('(reel) Added video event listener #modify');
                                //            }
                                //        });
                                //    });
                                //}

                                if (USER_SETTING.HTML5_VIDEO_CONTROL) {
                                    $(this).find('video').each(function () {
                                        if (!$(this).data('controls')) {
                                            let $video = $(this);

                                            logger('(reel) Added video html5 contorller #modify');

                                            if (USER_SETTING.MODIFY_VIDEO_VOLUME) {
                                                this.volume = state.videoVolume;

                                                $(this).on('loadstart', function () {
                                                    this.volume = state.videoVolume;
                                                });
                                            }

                                            // Restore layout to show details interface
                                            $(this).on('contextmenu', function (e) {
                                                e.preventDefault();
                                                $video.css('z-index', '-1');
                                                $video.removeAttr('controls');
                                            });

                                            // Hide layout to show controller
                                            $(this).parent().find('video + div div[role="button"]').filter(function () {
                                                return $(this).parent('div[role="presentation"]').length > 0 && $(this).css('cursor') === 'pointer' && $(this).attr('style') != null;
                                            }).first().on('contextmenu', function (e) {
                                                e.preventDefault();
                                                $video.css('z-index', '2');
                                                $video.attr('controls', true);
                                            });


                                            $(this).on('volumechange', function () {
                                                // eslint-disable-next-line no-unused-vars
                                                let $element_mute_button = $(this).parent().find('video + div > div').find('button[type="button"], div[role="button"]').filter(function (idx) {
                                                    // This is mute/unmute's icon
                                                    return $(this).width() <= 64 && $(this).height() <= 64 && $(this).find('svg > path[d^="M16.636 7.028a1.5"], svg > path[d^="M1.5 13.3c-.8"]').length > 0;
                                                });

                                                var is_elelment_muted = $element_mute_button.find('svg > path[d^="M16.636"]').length === 0;

                                                if (this.muted != is_elelment_muted) {
                                                    this.volume = state.videoVolume;
                                                    $element_mute_button?.trigger("click");
                                                }

                                                if ($(this).attr('data-completed')) {
                                                    state.videoVolume = this.volume;
                                                    GM_setValue('G_VIDEO_VOLUME', this.volume);
                                                }

                                                if (this.volume == state.videoVolume) {
                                                    $(this).attr('data-completed', true);
                                                }
                                            });

                                            if (USER_SETTING.SET_INSTAGRAM_LAYOUT_AS_DEFAULT) {
                                                $(this).css('z-index', '-1');
                                            }
                                            else {
                                                $(this).css('z-index', '2');
                                                $(this).attr('controls', true);
                                            }

                                            $(this).css('position', 'relative');
                                            $(this).attr('data-controls', true);
                                        }
                                    });
                                }

                                var $videos = $main.find('video');
                                var $buttonParent = $(this).find('div[role="presentation"] > div[role="button"] > div').first();
                                toggleVolumeSilder($videos, $buttonParent, 'reel');
                            }
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
