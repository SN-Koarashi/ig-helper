import { state, USER_SETTING, $body, PARENT_CHILD_MAPPING } from "./settings";
import {
    reloadScript,
    triggerLinkElement, openNewTab, saveFiles, logger, updatePopupSelectionSummary,
    replaceSameOriginHost
} from "./utils/general";
import { onStory, onStoryAll, onStoryThumbnail } from "./functions/story";
import { onStoryTaggedProfiles } from "./functions/storyTaggedProfiles";
import { onProfileAvatar } from "./functions/profile";
import { onHighlightsStory, onHighlightsStoryAll, onHighlightsStoryThumbnail } from "./functions/highlight";
import { onReels } from "./functions/reel";
import { _i18n, getTranslationText, repaintingTranslations } from "./utils/i18n";
import { getImageFromCache, registerPerformanceObserver } from "./utils/image_cache";
import { batchDownloadPostFiles, shortcodeToId } from "./functions/post";
import { registerMenuCommand, showDebugDOM, showHotkeySetting, showSetting } from "./utils/dialog";
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
        var loggerStr = "";
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
            loggerStr += `${new Date(log.time).toISOString()}: ${jsonData}\n`
        });
        $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY textarea').text("User Settings:\n" + JSON.stringify(USER_SETTING, null, "\t") + "\nLogger:\n" + loggerStr + "\n-----\n\nLocation: " + location.pathname + "\nDOM Tree with div#mount:\n" + text.innerHTML);
    }

    $body.on('click', '.IG_POPUP_DIG .IG_POPUP_DIG_BODY .IG_DISPLAY_DOM_TREE', function () {
        setDOMTreeContent();
    });

    // OPTIMIZATION: replace deprecated document.execCommand('copy') with modern
    // navigator.clipboard.writeText() API. Falls back to execCommand on browsers
    // that don't support it (unlikely on Chrome/Firefox/Edge >= 100).
    $body.on('click', '.IG_POPUP_DIG .IG_POPUP_DIG_BODY .IG_SELECT_DOM_TREE', function () {
        const $textarea = $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY textarea');
        const textContent = $textarea.val() || $textarea.text();
        $textarea.trigger('select');

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textContent).catch(err => {
                logger('Clipboard API failed, falling back to execCommand:', err);
                try { document.execCommand('copy'); } catch (e) { logger('execCommand fallback failed:', e); }
            });
        }
        else {
            try { document.execCommand('copy'); } catch (e) { logger('execCommand failed:', e); }
        }
    });

    $body.on('click', '.IG_POPUP_DIG .IG_POPUP_DIG_BODY .IG_DOWNLOAD_DOM_TREE', function () {
        const $textarea = $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY textarea');
        if ($textarea.text().length === 0) {
            setDOMTreeContent();
        }

        var text = $textarea.text();
        var a = document.createElement("a");
        var file = new Blob([text], { type: "text/plain" });
        a.href = URL.createObjectURL(file);
        a.download = "DOMTree-" + new Date().getTime() + ".txt";

        document.body.appendChild(a);
        a.click();
        a.remove();
    });

    // Close the download dialog if user click the close icon
    $body.on('click', '.IG_POPUP_DIG_BTN, .IG_POPUP_DIG_BG', function () {
        const $this = $(this);
        if ($this.parent('#tempWrapper').length > 0) {
            $this.parent('#tempWrapper').fadeOut(250, function () {
                $(this).remove();
            });
        }
        else {
            $('.IG_POPUP_DIG').remove();
        }
    });

    $(window).on('keydown', function (e) {
        // Hot key [Alt+Q] to close the download dialog - fixed
        if (e.altKey && e.which == 81) {
            $('.IG_POPUP_DIG').remove();
            e.preventDefault();
        }
        // Hot key [Alt+W] to open/close the settings dialog - use custom keycode if enabled, fallback to default Alt+W(87)
        let settingsKeyCode = state.settingsHotkeyKeyCode || 87;
        if (e.altKey && e.which == settingsKeyCode) {
            const $popup = $('.IG_POPUP_DIG');
            if ($popup.length > 0 && $popup.find('#post_info').text() === 'Preference Settings') {
                $popup.remove();
            } else {
                showSetting();
            }
            e.preventDefault();
        }

        // Hot key [Alt+W] to open/close the key settings dialog - use custom keycode if enabled, fallback to default Alt+C(67)
        let keySettingsHotkeyKeyCode = state.keySettingsHotkeyKeyCode || 67;
        if (e.altKey && e.which == keySettingsHotkeyKeyCode) {
            const $popup = $('.IG_POPUP_DIG');
            if ($popup.length > 0 && $popup.find('#post_info').text() === 'Hotkey Settings') {
                $popup.remove();
            } else {
                showHotkeySetting();
            }
            e.preventDefault();
        }

        // Hot key [Alt+Z] to open the debug DOM - use custom keycode if enabled, fallback to default Alt+Z(90)
        let debugKeyCode = state.debugHotkeyKeyCode || 90;
        if (e.altKey && e.which == debugKeyCode) {
            showDebugDOM();
            e.preventDefault();
        }

        // Hot key [Alt+R] to reload script (fixed, not customizable)
        if (e.which == '82' && e.altKey) {
            reloadScript();
            e.preventDefault();
        }

        // Hot key [Alt+S] to download story/highlights resource - use custom keycode if enabled, fallback to default Alt+S(83)
        let downloadStoryKeyCode = state.downloadStoryHotkeyKeyCode || 83;
        if (e.altKey && e.which == downloadStoryKeyCode) {
            if (location.href.match(/^(https:\/\/www\.instagram\.com\/stories\/)/ig) && $('.IG_DWSTORY').length > 0) {
                $('.IG_DWSTORY')?.trigger("click");
            }
            if (location.href.match(/^(https:\/\/www\.instagram\.com\/stories\/highlights\/)/ig) && $('.IG_DWHISTORY').length > 0) {
                $('.IG_DWHISTORY')?.trigger("click");
            }
            e.preventDefault();
        }
    });

    $body.on('change', '.IG_POPUP_DIG input', function () {
        const $this = $(this);
        var name = $this.attr('id');

        if (name && USER_SETTING[name] !== undefined) {
            let isChecked = $this.prop('checked');
            GM_setValue(name, isChecked);
            USER_SETTING[name] = isChecked;

            if (isChecked) {
                for (const [parent, children] of Object.entries(PARENT_CHILD_MAPPING)) {
                    if (children.includes(name) && USER_SETTING[parent] !== true) {
                        USER_SETTING[parent] = true;
                        GM_setValue(parent, true);
                        $(`.IG_POPUP_DIG input#${parent}`).prop('checked', true);
                    }
                }
            }
            else {
                // Disabling a parent setting also disables all of its children.
                for (const child of (PARENT_CHILD_MAPPING[name] || [])) {
                    USER_SETTING[child] = false;
                    GM_setValue(child, false);
                    $(`.IG_POPUP_DIG input#${child}`).prop('checked', false);
                }
            }

            console.log('user settings', name, isChecked);
        }
    });

    $body.on('click', '.IG_POPUP_DIG .globalSettings', function (e) {
        if ($(this).find('#tempWrapper').length > 0) {
            e.preventDefault();
        }
    });

    $body.on('change', '.IG_POPUP_DIG #tempWrapper input:not(#date_format)', function () {
        const $this = $(this);
        let value = $this.val();

        if ($this.attr('type') == 'range') {
            $this.next().val(value);
        }
        else {
            $this.prev().val(value);
        }

        if (value >= 0 && value <= 1) {
            state.videoVolume = value;
            GM_setValue('G_VIDEO_VOLUME', value);
        }
    });

    $body.on('input', '.IG_POPUP_DIG #tempWrapper input:not(#date_format)', function () {
        const $this = $(this);
        if ($this.attr('type') == 'range') {
            let value = $this.val();
            $this.next().val(value);
        }
        else {
            let value = $this.val();
            if (value >= 0 && value <= 1) {
                $this.prev().val(value);
            }
            else {
                if (value < 0) {
                    $this.val(0);
                }
                else {
                    $this.val(1);
                }
            }
        }
    });

    $body.on('click', 'a[data-needed="direct"]', function (e) {
        e.preventDefault();
        triggerLinkElement($(this), false);
    });

    $body.on('click', '.IG_POPUP_DIG_BODY .newTab', function () {
        const $this = $(this);
        const $linkA = $this.parent().children('a');
        const mediaId = $linkA.attr('media-id');
        const postPath = $linkA.data('path');
        const isVideo = $linkA.data('name') === 'video' || $linkA.data('type') === 'mp4';

        if (USER_SETTING.CAPTURE_IMAGE_VIA_MEDIA_CACHE && !isVideo) {
            const cached = (mediaId ? getImageFromCache(mediaId) : null) || (postPath ? getImageFromCache(shortcodeToId(postPath)) : null);
            if (cached) {
                openNewTab(cached);
                return;
            }
        }

        openNewTab(replaceSameOriginHost($linkA.data('href')));
    });

    $body.on('click', '.IG_POPUP_DIG_BODY .videoThumbnail', function () {
        const $this = $(this);
        const $linkA = $this.parent().children('a');
        let timestamp = new Date().getTime();

        if (USER_SETTING.RENAME_PUBLISH_DATE && $linkA.attr('datetime')) {
            timestamp = $linkA.attr('datetime');
        }

        let postPath = $linkA.data('path') ?? $('#article-id').text();

        if (USER_SETTING.CAPTURE_IMAGE_VIA_MEDIA_CACHE) {
            const mediaId = $linkA.first().attr('media-id');
            const cached = (mediaId ? getImageFromCache(mediaId) : null) || (postPath ? getImageFromCache(shortcodeToId(postPath)) : null);

            if (cached) {
                logger("[Restore Cached postThumbnail]", mediaId || postPath);
                saveFiles(cached, {
                    username: $linkA.data('username'),
                    sourceType: 'thumbnail',
                    timestamp,
                    filetype: 'jpg',
                    shortcode: postPath
                });
                return;
            }
        }

        saveFiles(
            $linkA.find('img').first().attr('src'),
            {
                username: $linkA.data('username'),
                sourceType: 'thumbnail',
                timestamp,
                filetype: 'jpg',
                shortcode: postPath
            });
    });

    // Running if user left-click download icon in stories
    $body.on('click', '.IG_DWSTORY', function () {
        onStory(true);
    });

    // Running if user left-click all download icon in stories
    $body.on('click', '.IG_DWSTORY_ALL', function () {
        onStoryAll();
    });

    // Running if user left-click 'open in new tab' icon in stories
    $body.on('click', '.IG_DWNEWTAB', function (e) {
        e.preventDefault();
        onStory(true, true, true);
    });

    // Prevent story navigation when pressing the tagged-profiles control
    $body.on('pointerdown', '.IG_DWSTORY_TAGGED_PROFILES', function (e) {
        e.stopPropagation();
    });

    $body.on('click', '.IG_DWSTORY_TAGGED_PROFILES', function (e) {
        e.preventDefault();
        e.stopPropagation();
        onStoryTaggedProfiles(this);
    });

    // Running if user left-click download thumbnail icon in stories
    $body.on('click', '.IG_DWSTORY_THUMBNAIL', function () {
        onStoryThumbnail(true);
    });

    // Running if user left-click download icon in profile
    $body.on('click', '.IG_DWPROFILE', function (e) {
        e.stopPropagation();
        onProfileAvatar(true);
    });

    // Running if user left-click download icon in highlight stories
    $body.on('click', '.IG_DWHISTORY', function () {
        onHighlightsStory(true);
    });

    // Running if user left-click all download icon in highlight stories
    $body.on('click', '.IG_DWHISTORY_ALL', function () {
        onHighlightsStoryAll();
    });

    // Running if user left-click 'open in new tab' icon in highlight stories
    $body.on('click', '.IG_DWHINEWTAB', function (e) {
        e.preventDefault();
        onHighlightsStory(true, true);
    });

    // Running if user left-click thumbnail download icon in highlight stories
    $body.on('click', '.IG_DWHISTORY_THUMBNAIL', function () {
        onHighlightsStoryThumbnail(true);
    });

    // Running if user left-click download icon in reels
    $body.on('click', '.IG_REELS', function () {
        onReels(true, true);
    });

    // Running if user left-click newtab icon in reels
    $body.on('click', '.IG_REELS_NEWTAB', function () {
        onReels(true, true, true);
    });

    // Running if user left-click download icon in reels
    $body.on('click', '.IG_REELS_THUMBNAIL', function () {
        onReels(true, false, false, this);
    });

    // Running if user right-click profile picture in stories area
    $body.on('mousedown', 'button[role="menuitem"], div[role="menuitem"], ul > li[tabindex="-1"] > div[role="button"]', function (e) {
        // Right-Click || Middle-Click
        if (e.which === 3 || e.which === 2) {
            if (location.href === 'https://www.instagram.com/' && USER_SETTING.REDIRECT_CLICK_USER_STORY_PICTURE) {
                e.preventDefault();

                const $this = $(this);
                $this.find('img').each(function () {
                    const $img = $(this);
                    if (!$img.data('contextmenu')) {
                        $img.data('contextmenu', true);
                        $img.on('contextmenu', function (e) {
                            e.preventDefault();
                        });
                    }
                });

                if ($this.find('canvas._aarh, canvas + span > img').length > 0) {
                    const targetUrl = 'https://www.instagram.com/' + $this.children('div').last().text();
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

    $body.on('change', '.IG_POPUP_DIG_TITLE .checkbox', function () {
        const isChecked = $(this).find('input').prop('checked');
        $('.IG_POPUP_DIG_BODY .inner_box').each(function () {
            $(this).prop('checked', isChecked);
        });
        updatePopupSelectionSummary();
    });

    $body.on('change', '.IG_POPUP_DIG_BODY .inner_box', function () {
        updatePopupSelectionSummary();
    });

    $body.on('click', '.IG_POPUP_DIG_TITLE #batch_download_selected', function () {
        if ($('.IG_POPUP_DIG #_SNLOAD').length > 0) return;

        let index = 0;
        let links = [];
        $('.IG_POPUP_DIG_BODY a[data-needed="direct"]').each(function () {
            let $link = $(this);
            if ($link.prev().children('input').prop('checked')) {
                links.push($link);
                index++;
            }
        });

        if (index == 0) {
            alert(_i18n('NO_CHECK_RESOURCE'));
        }
        else {
            batchDownloadPostFiles(links);
        }
    });

    $body.on('change', '.IG_POPUP_DIG_TITLE #langSelect', function () {
        const $this = $(this);
        const val = $this.val();
        GM_setValue('UI_LANGUAGE', val);
        state.lang = val;

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

    $body.on('click', '.IG_POPUP_DIG_TITLE #batch_download_direct', function () {
        if ($('.IG_POPUP_DIG #_SNLOAD').length > 0) return;

        let links = [];
        $('.IG_POPUP_DIG_BODY a[data-needed="direct"]').each(function () {
            links.push($(this));
        });

        batchDownloadPostFiles(links);
    });

    registerPerformanceObserver();
});
