import { state, USER_SETTING } from "./settings";
import {
    showSetting, showDebugDOM, reloadScript,
    triggerLinkElement, openNewTab, saveFiles, logger, toggleVolumeSilder
} from "./utils/util";
import { onStory, onStoryAll, onStoryThumbnail } from "./functions/story";
import { onProfileAvatar } from "./functions/profile";
import { onHighlightsStory, onHighlightsStoryAll, onHighlightsStoryThumbnail } from "./functions/highlight";
import { onReels } from "./functions/reel";
import { _i18n, getTranslationText, repaintingTranslations, registerMenuCommand } from "./utils/i18n";
/*! ESLINT IMPORT END !*/

// Running if document is ready
$(function () {
    function ConvertDOM(domEl) {
        var obj = [];
        for (var ele of domEl) {
            obj.push({
                tagName: ele.tagName,
                id: ele.id,
                className: ele.className
            });
        }

        return obj;
    }

    function setDOMTreeContent() {
        let text = $('div[id^="mount"]')[0];
        var logger = "";
        state.GL_logger.forEach(log => {
            var jsonData = JSON.stringify(log.content, function (key, value) {
                if (Array.isArray(this)) {
                    if (typeof value === "object" && value instanceof jQuery) {
                        return ConvertDOM(value);
                    }
                    return value;
                }
                else {
                    return value;
                }
            }, "\t");
            logger += `${new Date(log.time).toISOString()}: ${jsonData}\n`
        });
        $('.IG_SN_DIG .IG_SN_DIG_BODY textarea').text("Logger:\n" + logger + "\n-----\n\nLocation: " + location.pathname + "\nDOM Tree with div#mount:\n" + text.innerHTML);
    }

    $('body').on('click', '.IG_SN_DIG .IG_SN_DIG_BODY .IG_DISPLAY_DOM_TREE', function () {
        setDOMTreeContent();
    });

    $('body').on('click', '.IG_SN_DIG .IG_SN_DIG_BODY .IG_SELECT_DOM_TREE', function () {
        $('.IG_SN_DIG .IG_SN_DIG_BODY textarea').select();
        document.execCommand('copy');
    });

    $('body').on('click', '.IG_SN_DIG .IG_SN_DIG_BODY .IG_DOWNLOAD_DOM_TREE', function () {
        if ($('.IG_SN_DIG .IG_SN_DIG_BODY textarea').text().length === 0) {
            setDOMTreeContent();
        }

        var text = $('.IG_SN_DIG .IG_SN_DIG_BODY textarea').text();
        var a = document.createElement("a");
        var file = new Blob([text], { type: "text/plain" });
        a.href = URL.createObjectURL(file);
        a.download = "DOMTree-" + new Date().getTime() + ".txt";

        document.body.appendChild(a);
        a.click();
        a.remove();
    });

    // Close the download dialog if user click the close icon
    $('body').on('click', '.IG_SN_DIG_BTN, .IG_SN_DIG_BG', function () {
        if ($(this).parent('#tempWrapper').length > 0) {
            $(this).parent('#tempWrapper').fadeOut(250, function () {
                $(this).remove();
            });
        }
        else {
            $('.IG_SN_DIG').remove();
        }
    });

    $(window).on('keydown', function (e) {
        // Hot key [Alt+Q] to close the download dialog
        if (e.which == '81' && e.altKey) {
            $('.IG_SN_DIG').remove();
            e.preventDefault();
        }
        // Hot key [Alt+W] to open the settings dialog
        if (e.which == '87' && e.altKey) {
            showSetting();
            e.preventDefault();
        }

        // Hot key [Alt+Z] to open the settings dialog
        if (e.which == '90' && e.altKey) {
            showDebugDOM();
            e.preventDefault();
        }

        // Hot key [Alt+R] to open the settings dialog
        if (e.which == '82' && e.altKey) {
            reloadScript();
            e.preventDefault();
        }

        // Hot key [Alt+S] to download story/highlights resource
        if (e.which == '83' && e.altKey) {
            if (location.href.match(/^(https:\/\/www\.instagram\.com\/stories\/)/ig) && $('.IG_DWSTORY').length > 0) {
                $('.IG_DWSTORY')?.trigger("click");
            }
            if (location.href.match(/^(https:\/\/www\.instagram\.com\/stories\/highlights\/)/ig) && $('.IG_DWHISTORY').length > 0) {
                $('.IG_DWHISTORY')?.trigger("click");
            }
            e.preventDefault();
        }
    });

    $('body').on('change', '.IG_SN_DIG input', function () {
        var name = $(this).attr('id');

        if (name && USER_SETTING[name] !== undefined) {
            let isChecked = $(this).prop('checked');
            GM_setValue(name, isChecked);
            USER_SETTING[name] = isChecked;

            console.log('user settings', name, isChecked);
        }
    });

    $('body').on('click', '.IG_SN_DIG .globalSettings', function (e) {
        if ($(this).find('#tempWrapper').length > 0) {
            e.preventDefault();
        }
    });

    $('body').on('change', '.IG_SN_DIG #tempWrapper input:not(#date_format)', function () {
        let value = $(this).val();

        if ($(this).attr('type') == 'range') {
            $(this).next().val(value);
        }
        else {
            $(this).prev().val(value);
        }

        if (value >= 0 && value <= 1) {
            state.videoVolume = value;
            GM_setValue('G_VIDEO_VOLUME', value);
        }
    });

    $('body').on('input', '.IG_SN_DIG #tempWrapper input:not(#date_format)', function () {
        if ($(this).attr('type') == 'range') {
            let value = $(this).val();
            $(this).next().val(value);
        }
        else {
            let value = $(this).val();
            if (value >= 0 && value <= 1) {
                $(this).prev().val(value);
            }
            else {
                if (value < 0) {
                    $(this).val(0);
                }
                else {
                    $(this).val(1);
                }
            }
        }
    });

    $('body').on('input', '.IG_SN_DIG #tempWrapper input#date_format', function () {
        GM_setValue('G_RENAME_FORMAT', $(this).val());
        state.fileRenameFormat = $(this).val();
    });

    $('body').on('click', 'a[data-needed="direct"]', function (e) {
        e.preventDefault();
        triggerLinkElement(this);
    });

    $('body').on('click', '.IG_SN_DIG_BODY .newTab', function () {
        // replace https://instagram.ftpe8-2.fna.fbcdn.net/ to https://scontent.cdninstagram.com/ becase of same origin policy (some video)

        if (USER_SETTING.FORCE_RESOURCE_VIA_MEDIA && USER_SETTING.NEW_TAB_ALWAYS_FORCE_MEDIA_IN_POST) {
            triggerLinkElement($(this).parent().children('a').first()[0], true);
        }
        else {
            var urlObj = new URL($(this).parent().children('a').attr('data-href'));
            urlObj.host = 'scontent.cdninstagram.com';

            openNewTab(urlObj.href);
        }
    });

    $('body').on('click', '.IG_SN_DIG_BODY .videoThumbnail', function () {
        let timestamp = new Date().getTime();

        if (USER_SETTING.RENAME_PUBLISH_DATE && $(this).parent().children('a').attr('datetime')) {
            timestamp = $(this).parent().children('a').attr('datetime');
        }

        let postPath = $(this).parent().children('a').attr('data-path') ?? $('#article-id').text();

        saveFiles($(this).parent().children('a').find('img').first().attr('src'), $(this).parent().children('a').attr('data-username'), 'thumbnail', timestamp, 'jpg', postPath);
    });

    // Running if user left-click download icon in stories
    $('body').on('click', '.IG_DWSTORY', function () {
        onStory(true);
    });

    // Running if user left-click all download icon in stories
    $('body').on('click', '.IG_DWSTORY_ALL', function () {
        onStoryAll();
    });

    // Running if user left-click 'open in new tab' icon in stories
    $('body').on('click', '.IG_DWNEWTAB', function (e) {
        e.preventDefault();
        onStory(true, true, true);
    });

    // Running if user left-click download thumbnail icon in stories
    $('body').on('click', '.IG_DWSTORY_THUMBNAIL', function () {
        onStoryThumbnail(true);
    });

    // Running if user left-click download icon in profile
    $('body').on('click', '.IG_DWPROFILE', function (e) {
        e.stopPropagation();
        onProfileAvatar(true);
    });

    // Running if user left-click download icon in highlight stories
    $('body').on('click', '.IG_DWHISTORY', function () {
        onHighlightsStory(true);
    });

    // Running if user left-click all download icon in highlight stories
    $('body').on('click', '.IG_DWHISTORY_ALL', function () {
        onHighlightsStoryAll();
    });

    // Running if user left-click 'open in new tab' icon in highlight stories
    $('body').on('click', '.IG_DWHINEWTAB', function (e) {
        e.preventDefault();
        onHighlightsStory(true, true);
    });

    // Running if user left-click thumbnail download icon in highlight stories
    $('body').on('click', '.IG_DWHISTORY_THUMBNAIL', function () {
        onHighlightsStoryThumbnail(true);
    });

    // Running if user left-click download icon in reels
    $('body').on('click', '.IG_REELS', function () {
        onReels(true, true);
    });

    // Running if user left-click newtab icon in reels
    $('body').on('click', '.IG_REELS_NEWTAB', function () {
        onReels(true, true, true);
    });

    // Running if user left-click download icon in reels
    $('body').on('click', '.IG_REELS_THUMBNAIL', function () {
        onReels(true, false);
    });

    // Running if user right-click profile picture in stories area
    $('body').on('mousedown', 'button[role="menuitem"], div[role="menuitem"]', function (e) {
        // Right-Click || Middle-Click
        if (e.which === 3 || e.which === 2) {
            if (location.href === 'https://www.instagram.com/' && USER_SETTING.REDIRECT_CLICK_USER_STORY_PICTURE) {
                e.preventDefault();
                if ($(this).find('canvas._aarh, canvas + span > img').length > 0) {
                    const targetUrl = 'https://www.instagram.com/' + $(this).children('div').last().text();
                    if (e.which === 2) {
                        GM_openInTab(targetUrl);
                    }
                    else {
                        location.href = targetUrl;
                    }
                }
            }
        }
    });

    $('body').on('change', '.IG_SN_DIG_TITLE .checkbox', function () {
        var isChecked = $(this).find('input').prop('checked');
        $('.IG_SN_DIG_BODY .inner_box').each(function () {
            $(this).prop('checked', isChecked);
        });
    });

    $('body').on('change', '.IG_SN_DIG_BODY .inner_box', function () {
        var checked = $('.IG_SN_DIG_BODY .inner_box:checked').length;
        var total = $('.IG_SN_DIG_BODY .inner_box').length;


        $('.IG_SN_DIG_TITLE .checkbox').find('input').prop('checked', checked == total);
    });

    $('body').on('click', '.IG_SN_DIG_TITLE #batch_download_selected', function () {
        let index = 0;
        $('.IG_SN_DIG_BODY a[data-needed="direct"]').each(function () {
            if ($(this).prev().children('input').prop('checked')) {
                $(this).trigger("click");
                index++;
            }
        });

        if (index == 0) {
            alert(_i18n('NO_CHECK_RESOURCE'));
        }
    });

    $('body').on('change', '.IG_SN_DIG_TITLE #langSelect', function () {
        GM_setValue('lang', $(this).val());
        state.lang = $(this).val();

        if (state.lang?.startsWith('en') || state.locale[state.lang] != null) {
            repaintingTranslations();
            registerMenuCommand();
        }
        else {
            getTranslationText(state.lang).then((res) => {
                state.locale[state.lang] = res;
                repaintingTranslations();
                registerMenuCommand();
            }).catch((err) => {
                console.error('getTranslationText catch error:', err);
            });
        }
    });

    $('body').on('click', '.IG_SN_DIG_TITLE #batch_download_direct', function () {
        $('.IG_SN_DIG_BODY a[data-needed="direct"]').each(function () {
            $(this).trigger("click");
        });
    });

    const audio_observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    const $videos = $(node).find('video');
                    if ($videos.length > 0) {
                        // Modify video volume
                        if (USER_SETTING.MODIFY_VIDEO_VOLUME) {
                            $videos.each(function () {
                                $(this).on('play playing', function () {
                                    if (!$(this).data('modify')) {
                                        $(this).attr('data-modify', true);
                                        this.volume = state.videoVolume;
                                        logger('(audio_observer) Added video event listener #modify');
                                    }
                                });
                            });
                        }

                        if (location.pathname.match(/^(\/stories\/)/ig)) {
                            const isHighlight = location.pathname.match(/^(\/stories\/highlights\/)/ig) != null;
                            const storyType = isHighlight ? 'highlight' : 'story';

                            $videos.each(function () {
                                $(this).on('timeupdate', function () {
                                    if (!$(this).data('modify-thumbnail')) {
                                        let $video = $(this);
                                        if ($video.parents('div[style][class]').filter(function () {
                                            return $(this).width() == $video.width();
                                        }).find('.IG_DWSTORY_THUMBNAIL, .IG_DWHISTORY_THUMBNAIL').length === 0) {
                                            $(this).attr('data-modify-thumbnail', true);

                                            if (isHighlight) {
                                                onHighlightsStoryThumbnail(false);
                                            }
                                            else {
                                                onStoryThumbnail(false);
                                            }

                                            logger(`(${storyType})`, 'Manually inserting thumbnail button');
                                        }
                                        else {
                                            $(this).attr('data-modify-thumbnail', true);
                                            logger(`(${storyType})`, 'Thumbnail button already inserted');
                                        }
                                    }
                                });

                                var $video = $(this);

                                if (USER_SETTING.HTML5_VIDEO_CONTROL) {
                                    if (!$video.data('controls')) {
                                        logger(`(${storyType})`, 'Added video html5 contorller #modify');

                                        if (USER_SETTING.MODIFY_VIDEO_VOLUME) {
                                            this.volume = state.videoVolume;

                                            $video.on('loadstart', function () {
                                                this.volume = state.videoVolume;
                                            });
                                        }

                                        let $videoParent = $video.parents('div').filter(function () {
                                            return $(this).attr('class') == null && $(this).attr('style') == null;
                                        }).first();

                                        // story bottom bar
                                        let $bottomBar = $videoParent.next();
                                        $bottomBar.hide();

                                        // read more button in center
                                        let $readMoreButton = $videoParent.find('div[class][role="button"]');
                                        $readMoreButton.hide();

                                        const hideContextmenu = function (e) {
                                            e.preventDefault();
                                            $video.css('z-index', '2');
                                            $video.attr('controls', true);

                                            $readMoreButton.hide();
                                            $bottomBar.hide();

                                            toggleVolumeSilder($video, $video.parents('div[style][class]').filter(function () {
                                                return $(this).width() == $video.width();
                                            }).first(), storyType, 'vertical');
                                        };

                                        // Hide layout to show controller
                                        $video.parent().find('video + div').on('contextmenu', hideContextmenu);
                                        $readMoreButton.on('contextmenu', hideContextmenu);
                                        $bottomBar.on('contextmenu', hideContextmenu);

                                        // Restore layout to show details interface
                                        $video.on('contextmenu', function (e) {
                                            e.preventDefault();
                                            $video.css('z-index', '-1');
                                            $video.removeAttr('controls');

                                            $bottomBar.show();
                                            $readMoreButton.show();

                                            toggleVolumeSilder($video, $video.parents('div[style][class]').filter(function () {
                                                return $(this).width() == $video.width();
                                            }).first(), storyType, 'vertical');
                                        });

                                        $video.on('volumechange', function () {
                                            // This is mute/unmute's icon
                                            let $element_mute_button = $videoParent.parent().find('svg > path[d^="M1.5 13.3c-.8 0-1.5.7-1.5 1.5v18.4c0"], svg > path[d^="M16.636 7.028a1.5 1.5"]').parents('[role="button"]').first();

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

                                        $video.css('position', 'absolute');
                                        $video.css('z-index', '2');
                                        $video.attr('data-controls', true);
                                        $video.attr('controls', true);
                                    }
                                }
                                else {
                                    toggleVolumeSilder($video, $video.parents('div[style][class]').filter(function () {
                                        return $(this).width() == $video.width();
                                    }).first(), storyType, 'vertical');
                                }
                            });
                        }
                    }
                });
            }
        }
    });

    audio_observer.observe($('div[id^="mount"]')[0], {
        childList: true,
        subtree: true,
    });
});