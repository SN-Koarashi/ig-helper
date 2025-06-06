// ==UserScript==
// @name               IG Helper
// @name:zh-TW         IG小精靈
// @name:zh-CN         IG小助手
// @name:ja            IG助手
// @name:ko            IG조수
// @namespace          https://github.snkms.com/
// @version            3.5.5
// @description        Downloading is possible for both photos and videos from posts, as well as for stories, reels or profile picture.
// @description:zh-TW  一鍵下載對方 Instagram 貼文中的相片、影片甚至是他們的限時動態、連續短片及大頭貼圖片！
// @description:zh-CN  一键下载对方 Instagram 帖子中的相片、视频甚至是他们的快拍、Reels及头像图片！
// @description:ja     投稿の写真と動画だけでなく、ストーリー、リール、プロフィール写真もダウンロードできます。
// @description:ko     게시물의 사진과 동영상뿐만 아니라 스토리, 릴 또는 프로필 사진도 다운로드할 수 있습니다.
// @description:ro     Descărcarea este posibilă atât pentru fotografiile și videoclipurile din postări, cât și pentru storyuri, reels sau poze de profil.
// @author             SN-Koarashi (5026)
// @match              https://*.instagram.com/*
// @grant              GM_info
// @grant              GM_addStyle
// @grant              GM_setValue
// @grant              GM_getValue
// @grant              GM_xmlhttpRequest
// @grant              GM_registerMenuCommand
// @grant              GM_unregisterMenuCommand
// @grant              GM_getResourceText
// @grant              GM_notification
// @grant              GM_openInTab
// @connect            i.instagram.com
// @connect            raw.githubusercontent.com
// @require            https://code.jquery.com/jquery-3.7.1.min.js#sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo=
// @resource           INTERNAL_CSS https://raw.githubusercontent.com/SN-Koarashi/ig-helper/master/style.css
// @resource           LOCALE_MANIFEST https://raw.githubusercontent.com/SN-Koarashi/ig-helper/master/locale/manifest.json
// @supportURL         https://github.com/SN-Koarashi/ig-helper/
// @contributionURL    https://ko-fi.com/snkoarashi
// @icon               https://www.google.com/s2/favicons?domain=www.instagram.com&sz=32
// @compatible         firefox >= 100
// @compatible         chrome >= 100
// @compatible         edge >= 100
// @license            GPL-3.0-only
// @run-at             document-idle
// ==/UserScript==

// eslint-disable-next-line no-unused-vars
(function ($) {
    'use strict';

    /* initial */

    /******** USER SETTINGS ********/
    // !!! DO NOT CHANGE THIS AREA !!!
    // ??? PLEASE CHANGE SETTING WITH MENU ???
    const USER_SETTING = {
        'CHECK_UPDATE': true,
        'AUTO_RENAME': true,
        'RENAME_PUBLISH_DATE': true,
        'DISABLE_VIDEO_LOOPING': false,
        'HTML5_VIDEO_CONTROL': false,
        'REDIRECT_CLICK_USER_STORY_PICTURE': false,
        'FORCE_FETCH_ALL_RESOURCES': false,
        'DIRECT_DOWNLOAD_VISIBLE_RESOURCE': false,
        'DIRECT_DOWNLOAD_ALL': false,
        'MODIFY_VIDEO_VOLUME': false,
        'MODIFY_RESOURCE_EXIF': false,
        'SCROLL_BUTTON': true,
        'FORCE_RESOURCE_VIA_MEDIA': false,
        'USE_BLOB_FETCH_WHEN_MEDIA_RATE_LIMIT': false,
        'NEW_TAB_ALWAYS_FORCE_MEDIA_IN_POST': false,
        'SKIP_VIEW_STORY_CONFIRM': false
    };
    const CHILD_NODES = ['RENAME_PUBLISH_DATE', 'USE_BLOB_FETCH_WHEN_MEDIA_RATE_LIMIT', 'NEW_TAB_ALWAYS_FORCE_MEDIA_IN_POST'];
    /*******************************/

    // Icon download by Google Fonts Material Icon
    const SVG = {
        DOWNLOAD: '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><g><rect fill="none" height="24" width="24"/></g><g><path d="M18,15v3H6v-3H4v3c0,1.1,0.9,2,2,2h12c1.1,0,2-0.9,2-2v-3H18z M17,11l-1.41-1.41L13,12.17V4h-2v8.17L8.41,9.59L7,11l5,5 L17,11z"/></g></svg>',
        NEW_TAB: '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>',
        THUMBNAIL: '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4.86 8.86l-3 3.87L9 13.14 6 17h12l-3.86-5.14z"/></svg>',
        DOWNLOAD_ALL: '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><g><rect fill="none" height="24" width="24"/></g><g><g><polygon points="18,6.41 16.59,5 12,9.58 7.41,5 6,6.41 12,12.41"/><polygon points="18,13 16.59,11.59 12,16.17 7.41,11.59 6,13 12,19"/></g></g></svg>',
        CLOSE: '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>',
        FULLSCREEN: '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>',
        TURN_DEG: '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#1f1f1f"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M7.34 6.41L.86 12.9l6.49 6.48 6.49-6.48-6.5-6.49zM3.69 12.9l3.66-3.66L11 12.9l-3.66 3.66-3.65-3.66zm15.67-6.26C17.61 4.88 15.3 4 13 4V.76L8.76 5 13 9.24V6c1.79 0 3.58.68 4.95 2.05 2.73 2.73 2.73 7.17 0 9.9C16.58 19.32 14.79 20 13 20c-.97 0-1.94-.21-2.84-.61l-1.49 1.49C10.02 21.62 11.51 22 13 22c2.3 0 4.61-.88 6.36-2.64 3.52-3.51 3.52-9.21 0-12.72z"/></svg>'
    };

    /*******************************/
    const checkInterval = 250;
    const style = GM_getResourceText("INTERNAL_CSS");
    const locale_manifest = JSON.parse(GM_getResourceText("LOCALE_MANIFEST"));

    var state = {
        videoVolume: (GM_getValue('G_VIDEO_VOLUME')) ? GM_getValue('G_VIDEO_VOLUME') : 1,
        tempFetchRateLimit: false,
        fileRenameFormat: (GM_getValue('G_RENAME_FORMAT')) ? GM_getValue('G_RENAME_FORMAT') : '%USERNAME%-%SOURCE_TYPE%-%SHORTCODE%-%YEAR%%MONTH%%DAY%_%HOUR%%MINUTE%%SECOND%_%ORIGINAL_NAME_FIRST%',
        registerMenuIds: [],
        locale: {},
        lang: GM_getValue('lang') || navigator.language || navigator.userLanguage,
        currentURL: location.href,
        firstStarted: false,
        pageLoaded: false,
        GL_registerEventList: [],
        GL_logger: [],
        GL_referrer: null,
        GL_postPath: null,
        GL_username: null,
        GL_repeat: null,
        GL_dataCache: {
            stories: {},
            highlights: {}
        },
        GL_observer: new MutationObserver(function () {
            onReadyMyDW();
        })
    };
    /*******************************/

    // initialization script
    initSettings();
    GM_addStyle(style);
    registerMenuCommand();

    getTranslationText(state.lang).then((res) => {
        state.locale[state.lang] = res;
        repaintingTranslations();
        registerMenuCommand();
        checkingScriptUpdate(300);
    }).catch((err) => {
        registerMenuCommand();
        checkingScriptUpdate(300);

        if (!state.lang.startsWith('en')) {
            console.error('getTranslationText catch error:', err);
        }
    });

    logger('Script Loaded', GM_info.script.name, 'version:', GM_info.script.version);
    /*******************************/

    // Main Timer
    // eslint-disable-next-line no-unused-vars
    var timer = setInterval(function () {
        // page loading or unnecessary route
        if ($('div#splash-screen').length > 0 && !$('div#splash-screen').is(':hidden') ||
            location.pathname.match(/^\/(explore(\/.*)?|challenge\/?.*|direct\/?.*|qr\/?|accounts\/.*|emails\/.*|language\/?.*?|your_activity\/?.*|settings\/help(\/.*)?$)$/ig) ||
            !location.hostname.startsWith('www.') ||
            ((location.pathname.endsWith('/followers/') || location.pathname.endsWith('/following/')) && ($(`body > div[class]:not([id^="mount"]) div div[role="dialog"]`).length > 0))
        ) {
            state.pageLoaded = false;
            return;
        }

        if (state.currentURL != location.href || !state.firstStarted || !state.pageLoaded) {
            console.log('Main Timer', 'trigging');

            clearInterval(state.GL_repeat);
            state.pageLoaded = false;
            state.firstStarted = true;
            state.currentURL = location.href;
            state.GL_observer.disconnect();

            if (location.href.startsWith("https://www.instagram.com/p/") || location.pathname.match(/^\/(.*?)\/(p|reel)\//ig) || location.href.startsWith("https://www.instagram.com/reel/")) {
                state.GL_dataCache.stories = {};
                state.GL_dataCache.highlights = {};

                logger('isDialog');

                // This is a delayed function call that prevents the dialog element from appearing before the function is called.
                var dialogTimer = setInterval(() => {
                    // body > div[id^="mount"] section nav + div > article << (mobile page in single post) >>
                    // section:visible > main > div > div > div > div > div > hr << (single foreground post in page, non-floating // <hr> element here is literally the line beneath poster's username) >>
                    // section:visible > main > div > div > article > div > div > div > div > div > header (is the same as above, except that this is on the route of the /{username}/p/{shortcode} structure)
                    // section:visible > main > div > div.xdt5ytf << (former CSS selector for single foreground post in page, non-floating) >>
                    // <hr> is much more unique element than "div.xdt5ytf"
                    if ($(`body > div[class]:not([id^="mount"]) div div[role="dialog"] article,
                                section:visible > main > div > div > div > div > div > hr,
                                body > div[id^="mount"] section nav + div > article,
                                section:visible > main > div > div > article > div > div > div > div > div > header
                            `).length > 0) {
                        clearInterval(dialogTimer);

                        // This is to prevent the detection of the "Modify Video Volume" setting from being too slow.
                        setTimeout(() => {
                            onReadyMyDW(false);
                        }, 15);
                    }
                }, 100);

                state.pageLoaded = true;
            }

            if (location.href.startsWith("https://www.instagram.com/reels/")) {
                logger('isReels');
                setTimeout(() => {
                    onReels(false);
                }, 150);
                state.pageLoaded = true;
            }

            if (location.href.split("?")[0] == "https://www.instagram.com/") {
                state.GL_dataCache.stories = {};
                state.GL_dataCache.highlights = {};

                let hasReferrer = state.GL_referrer?.match(/^\/(stories|highlights)\//ig) != null;

                logger('isHomepage', hasReferrer);
                setTimeout(() => {
                    onReadyMyDW(false, hasReferrer);

                    const element = $('div[id^="mount"] > div > div div > section > main div:not([class]):not([style]) > div > article')?.parent()[0];
                    if (element) {
                        state.GL_observer.observe(element, {
                            childList: true
                        });
                    }
                }, 150);

                state.pageLoaded = true;
            }
            // eslint-disable-next-line no-useless-escape
            if ($('header > *[class]:first-child img[alt]').length && location.pathname.match(/^(\/)([0-9A-Za-z\.\-_]+)\/?(tagged|reels|saved)?\/?$/ig) && !location.pathname.match(/^(\/explore\/?$|\/stories(\/.*)?$|\/p\/)/ig)) {
                logger('isProfile');
                setTimeout(() => {
                    onProfileAvatar(false);
                }, 150);
                state.pageLoaded = true;
            }

            if (!state.pageLoaded) {
                // Call Instagram stories function
                if (location.href.match(/^(https:\/\/www\.instagram\.com\/stories\/highlights\/)/ig)) {
                    state.GL_dataCache.highlights = {};

                    logger('isHighlightsStory');

                    onHighlightsStory(false);
                    state.GL_repeat = setInterval(() => {
                        onHighlightsStoryThumbnail(false);
                    }, checkInterval);

                    if ($(".IG_DWHISTORY").length) {
                        setTimeout(() => {
                            if (USER_SETTING.SKIP_VIEW_STORY_CONFIRM) {
                                var $viewStoryButton = $('div[id^="mount"] section:last-child > div > div div[role="button"]').filter(function () {
                                    return $(this).children().length === 0 && this.textContent.trim() !== "";
                                });
                                $viewStoryButton?.trigger("click");
                            }

                            state.pageLoaded = true;
                        }, 150);
                    }
                }
                else if (location.href.match(/^(https:\/\/www\.instagram\.com\/stories\/)/ig)) {
                    logger('isStory');

                    /*
                     *
                     *  $('body div[id^="mount"] > div > div > div[class]').length >= 2 &&
                     *  $('body div[id^="mount"] > div > div > div[class]').last().find('svg > path[d^="M16.792"], svg > path[d^="M34.6 3.1c-4.5"]').length > 0 &&
                     *  $('body div[id^="mount"] > div > div > div[class]').last().find('svg > polyline + line').length > 0
                     *
                     */
                    if ($('div[id^="mount"] section > div > a[href="/"]').length > 0) {
                        $('.IG_DWSTORY').remove();
                        $('.IG_DWNEWTAB').remove();
                        if ($('.IG_DWSTORY_THUMBNAIL').length) {
                            $('.IG_DWSTORY_THUMBNAIL').remove();
                        }

                        onStory(false);

                        // Prevent buttons from being eaten by black holes sometimes
                        setTimeout(() => {
                            onStory(false);
                        }, 150);
                    }

                    if ($(".IG_DWSTORY").length) {
                        setTimeout(() => {
                            if (USER_SETTING.SKIP_VIEW_STORY_CONFIRM) {
                                var $viewStoryButton = $('div[id^="mount"] section:last-child > div > div div[role="button"]').filter(function () {
                                    return $(this).children().length === 0 && this.textContent.trim() !== "";
                                });
                                $viewStoryButton?.click();
                            }

                            state.pageLoaded = true;
                        }, 150);
                    }
                }
                else {
                    state.pageLoaded = false;
                    // Remove icons
                    if ($('.IG_DWSTORY').length) {
                        $('.IG_DWSTORY').remove();
                    }
                    if ($('.IG_DWSTORY_ALL').length) {
                        $('.IG_DWSTORY_ALL').remove();
                    }
                    if ($('.IG_DWNEWTAB').length) {
                        $('.IG_DWNEWTAB').remove();
                    }
                    if ($('.IG_DWSTORY_THUMBNAIL').length) {
                        $('.IG_DWSTORY_THUMBNAIL').remove();
                    }

                    if ($('.IG_DWHISTORY').length) {
                        $('.IG_DWHISTORY').remove();
                    }
                    if ($('.IG_DWHISTORY_ALL').length) {
                        $('.IG_DWHISTORY_ALL').remove();
                    }
                    if ($('.IG_DWHINEWTAB').length) {
                        $('.IG_DWHINEWTAB').remove();
                    }
                    if ($('.IG_DWHISTORY_THUMBNAIL').length) {
                        $('.IG_DWHISTORY_THUMBNAIL').remove();
                    }
                }
            }

            checkingScriptUpdate(300);
            state.GL_referrer = new URL(location.href).pathname;
        }
    }, checkInterval);

    /* Main functions */

    /**
     * onHighlightsStoryAll
     * @description Trigger user's highlight all download event.
     *
     * @return {void}
     */
    async function onHighlightsStoryAll() {
        updateLoadingBar(true);

        let date = new Date().getTime();
        let timestamp = Math.floor(date / 1000);
        let highlightId = location.href.replace(/\/$/ig, '').split('/').at(-1);
        let highStories = await getHighlightStories(highlightId);
        let username = highStories.data.reels_media[0].owner.username;

        let complete = 0;
        setDownloadProgress(complete, highStories.data.reels_media[0].items.length);

        highStories.data.reels_media[0].items.forEach((item, idx) => {
            setTimeout(() => {
                if (USER_SETTING.RENAME_PUBLISH_DATE) {
                    timestamp = item.taken_at_timestamp;
                }

                item.display_resources.sort(function (a, b) {
                    if (a.config_width < b.config_width) return 1;
                    if (a.config_width > b.config_width) return -1;
                    return 0;
                });

                if (item.is_video) {
                    saveFiles(item.video_resources[0].src, username, "stories", timestamp, 'mp4', item.id).then(() => {
                        setDownloadProgress(++complete, highStories.data.reels_media[0].items.length);
                    });
                }
                else {
                    saveFiles(item.display_resources[0].src, username, "stories", timestamp, 'jpg', item.id).then(() => {
                        setDownloadProgress(++complete, highStories.data.reels_media[0].items.length);
                    });
                }
            }, 100 * idx);
        });
    }

    /**
     * onHighlightsStory
     * @description Trigger user's highlight download event or button display event.
     *
     * @param  {Boolean}  isDownload - Check if it is a download operation
     * @param  {Boolean}  isPreview - Check if it is need to open new tab
     * @return {void}
     */
    async function onHighlightsStory(isDownload, isPreview) {
        var username = $('body > div section:visible a[href^="/"]').filter(function () {
            return $(this).attr('href').split('/').filter(e => e.length > 0).length === 1
        }).first().attr('href').split('/').filter(e => e.length > 0).at(0);

        if (isDownload) {
            let date = new Date().getTime();
            let timestamp = Math.floor(date / 1000);
            let highlightId = location.href.replace(/\/$/ig, '').split('/').at(-1);
            let nowIndex = $("body > div section._ac0a header._ac0k > ._ac3r ._ac3n ._ac3p[style]").length ||
                $('body > div section:visible > div > div:not([class]) > div > div div.x1ned7t2.x78zum5 div.x1caxmr6').length ||
                $('body > div div:not([hidden]) section:visible > div div[style]:not([class]) > div').find('div div.x1ned7t2.x78zum5 div.x1caxmr6').length;
            let target = 0;

            updateLoadingBar(true);

            if (state.GL_dataCache.highlights[highlightId]) {
                logger('Fetch from memory cache:', highlightId);

                let totIndex = state.GL_dataCache.highlights[highlightId].data.reels_media[0].items.length;
                username = state.GL_dataCache.highlights[highlightId].data.reels_media[0].owner.username;
                target = state.GL_dataCache.highlights[highlightId].data.reels_media[0].items[totIndex - nowIndex];
            }
            else {
                let highStories = await getHighlightStories(highlightId);
                let totIndex = highStories.data.reels_media[0].items.length;
                username = highStories.data.reels_media[0].owner.username;
                target = highStories.data.reels_media[0].items[totIndex - nowIndex];

                state.GL_dataCache.highlights[highlightId] = highStories;
            }

            logger('onHighlightsStory', highlightId, state.GL_dataCache.highlights[highlightId]);


            if (USER_SETTING.RENAME_PUBLISH_DATE) {
                timestamp = target.taken_at_timestamp;
            }

            if (USER_SETTING.FORCE_RESOURCE_VIA_MEDIA && !state.tempFetchRateLimit) {
                let result = await getMediaInfo(target.id);

                if (result.status === 'ok') {
                    if (result.items[0].video_versions) {
                        if (isPreview) {
                            openNewTab(result.items[0].video_versions[0].url);
                        }
                        else {
                            saveFiles(result.items[0].video_versions[0].url, username, "highlights", timestamp, 'mp4', result.items[0].id);
                        }
                    }
                    else {
                        if (isPreview) {
                            openNewTab(result.items[0].image_versions2.candidates[0].url);
                        }
                        else {
                            saveFiles(result.items[0].image_versions2.candidates[0].url, username, "highlights", timestamp, 'jpg', result.items[0].id);
                        }
                    }
                }
                else {
                    if (USER_SETTING.USE_BLOB_FETCH_WHEN_MEDIA_RATE_LIMIT) {
                        delete state.GL_dataCache.highlights[highlightId];
                        state.tempFetchRateLimit = true;

                        onHighlightsStory(true, isPreview);
                    }
                    else {
                        alert('Fetch failed from Media API. API response message: ' + result.message);
                    }

                    logger(result);
                }
            }
            else {
                if (target.is_video) {
                    if (isPreview) {
                        openNewTab(target.video_resources.at(-1).src, username);
                    }
                    else {
                        saveFiles(target.video_resources.at(-1).src, username, "highlights", timestamp, 'mp4', target.id);
                    }
                }
                else {
                    if (isPreview) {
                        openNewTab(target.display_resources.at(-1).src, username);
                    }
                    else {
                        saveFiles(target.display_resources.at(-1).src, username, "highlights", timestamp, 'jpg', target.id);
                    }
                }

                state.tempFetchRateLimit = false;
            }

            updateLoadingBar(false);
        }
        else {
            // Add the stories download button
            if (!$('.IG_DWHISTORY').length) {
                let $element = null;

                // Default detecter (section layout mode)
                if ($('body > div section._ac0a').length > 0) {
                    $element = $('body > div section:visible._ac0a');
                }
                else {
                    $element = $('body > div section:visible > div > div[style]:not([class])');
                    $element.css('position', 'relative');
                }

                // Detecter for div layout mode
                if ($element.length === 0) {
                    let $$element = $('body > div div:not([hidden]) section:visible > div div[class][style] > div[style]:not([class])');
                    let nowSize = 0;

                    $$element.each(function () {
                        if ($(this).width() > nowSize) {
                            nowSize = $(this).width();
                            $element = $(this).children('div').first();
                        }
                    });
                }


                if ($element != null) {
                    //$element.css('position','relative');
                    $element.append(`<div data-ih-locale-title="DW" title="${_i18n("DW")}" class="IG_DWHISTORY">${SVG.DOWNLOAD}</div>`);
                    $element.append(`<div data-ih-locale-title="NEW_TAB" title="${_i18n("NEW_TAB")}" class="IG_DWHINEWTAB">${SVG.NEW_TAB}</div>`);

                    let $header = getStoryProgress(username);
                    if ($header.length > 1) {
                        $element.append(`<div data-ih-locale-title="DW_ALL" title="${_i18n("DW_ALL")}" class="IG_DWHISTORY_ALL">${SVG.DOWNLOAD_ALL}</div>`);
                    }

                    // replace something times ago format to publish time in first init
                    let publishTitle = $header.parents("div[class]").find("time[datetime]")?.attr('title');
                    if (publishTitle != null) {
                        $header.parents("div[class]").find("time[datetime]").text(publishTitle);
                    }

                    //// Modify video volume
                    //if(USER_SETTING.MODIFY_VIDEO_VOLUME){
                    //    $element.find('video').each(function(){
                    //        $(this).on('play playing', function(){
                    //            if(!$(this).data('modify')){
                    //                $(this).attr('data-modify', true);
                    //                this.volume = VIDEO_VOLUME;
                    //                logger('(highlight) Added video event listener #modify');
                    //            }
                    //        });
                    //    });
                    //}

                    // Make sure to first remove thumbnail button if still exists and highlight is a picture
                    $element.find('img[referrerpolicy]').each(function () {
                        $(this).on('load', function () {
                            if (!$(this).data('remove-thumbnail')) {
                                if ($element.find('.IG_DWHISTORY_THUMBNAIL').length === 0) {
                                    $(this).attr('data-remove-thumbnail', true);
                                    $('.IG_DWHISTORY_THUMBNAIL').remove();
                                    logger('(highlight) Manually removing thumbnail button');
                                }
                                else {
                                    $(this).attr('data-remove-thumbnail', true);
                                    logger('(highlight) Thumbnail button is not present for this picture');
                                }
                            }
                        });
                    });

                    // Try to use event listener 'timeupdate' in order to detect if highlight is a video
                    //$element.find('video').each(function(){
                    //    $(this).on('timeupdate',function(){
                    //        if(!$(this).data('modify-thumbnail')){
                    //            if($element.find('.IG_DWHISTORY_THUMBNAIL').length === 0){
                    //                $(this).attr('data-modify-thumbnail', true);
                    //                onHighlightsStoryThumbnail(false);
                    //                logger('(highlight) Manually inserting thumbnail button');
                    //            }
                    //            else{
                    //                $(this).attr('data-modify-thumbnail', true);
                    //                logger('(highlight) Thumbnail button already inserted');
                    //            }
                    //        }
                    //    });
                    //});
                }
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
    async function onHighlightsStoryThumbnail(isDownload) {
        if (isDownload) {
            let date = new Date().getTime();
            let timestamp = Math.floor(date / 1000);
            let highlightId = location.href.replace(/\/$/ig, '').split('/').at(-1);
            let username = "";
            let nowIndex = $("body > div section._ac0a header._ac0k > ._ac3r ._ac3n ._ac3p[style]").length ||
                $('body > div section:visible > div > div:not([class]) > div > div div.x1ned7t2.x78zum5 div.x1caxmr6').length ||
                $('body > div div:not([hidden]) section:visible > div div[style]:not([class]) > div').find('div div.x1ned7t2.x78zum5 div.x1caxmr6').length;
            let target = "";

            updateLoadingBar(true);

            if (state.GL_dataCache.highlights[highlightId]) {
                logger('Fetch from memory cache:', highlightId);

                let totIndex = state.GL_dataCache.highlights[highlightId].data.reels_media[0].items.length;
                username = state.GL_dataCache.highlights[highlightId].data.reels_media[0].owner.username;
                target = state.GL_dataCache.highlights[highlightId].data.reels_media[0].items[totIndex - nowIndex];
            }
            else {
                let highStories = await getHighlightStories(highlightId);
                let totIndex = highStories.data.reels_media[0].items.length;
                username = highStories.data.reels_media[0].owner.username;
                target = highStories.data.reels_media[0].items[totIndex - nowIndex];

                state.GL_dataCache.highlights[highlightId] = highStories;
            }

            if (USER_SETTING.RENAME_PUBLISH_DATE) {
                timestamp = target.taken_at_timestamp;
            }

            if (USER_SETTING.FORCE_RESOURCE_VIA_MEDIA && !state.tempFetchRateLimit) {
                let result = await getMediaInfo(target.id);

                if (result.status === 'ok') {
                    saveFiles(result.items[0].image_versions2.candidates[0].url, username, "highlights", timestamp, 'jpg', highlightId);
                }
                else {
                    if (USER_SETTING.USE_BLOB_FETCH_WHEN_MEDIA_RATE_LIMIT) {
                        delete state.GL_dataCache.highlights[highlightId];
                        state.tempFetchRateLimit = true;

                        onHighlightsStoryThumbnail(true);
                    }
                    else {
                        alert('Fetch failed from Media API. API response message: ' + result.message);
                    }

                    logger(result);
                }
            }
            else {
                saveFiles(target.display_resources.at(-1).src, username, "highlights", timestamp, 'jpg', highlightId);
                state.tempFetchRateLimit = false;
            }

            updateLoadingBar(false);
        }
        else {
            if ($('body > div section video.xh8yej3').length) {
                // Add the stories thumbnail download button
                if (!$('.IG_DWHISTORY_THUMBNAIL').length) {
                    let $element = null;

                    // Default detecter (section layout mode)
                    if ($('body > div section._ac0a').length > 0) {
                        $element = $('body > div section:visible._ac0a');
                    }
                    else {
                        $element = $('body > div section:visible > div > div[style]:not([class])');
                        $element.css('position', 'relative');
                    }

                    // Detecter for div layout mode
                    if ($element.length === 0) {
                        let $$element = $('body > div div:not([hidden]) section:visible > div div[class][style] > div[style]:not([class])');
                        let nowSize = 0;

                        $$element.each(function () {
                            if ($(this).width() > nowSize) {
                                nowSize = $(this).width();
                                $element = $(this).children('div').first();
                            }
                        });
                    }

                    if ($element != null) {
                        $element.append(`<div data-ih-locale-title="THUMBNAIL_INTRO" title="${_i18n("THUMBNAIL_INTRO")}" class="IG_DWHISTORY_THUMBNAIL">${SVG.THUMBNAIL}</div>`);
                    }
                }
            }
            else {
                $('.IG_DWHISTORY_THUMBNAIL').remove();
            }
        }
    }

    /**
     * onReadyMyDW
     * @description Create an event entry point for the download button for the post
     *
     * @param  {Boolean}  NoDialog    - Check if it not showing the dialog
     * @param  {?Boolean}  hasReferrer - Check if the source of the previous page is a story page
     * @return {void}
     */
    function onReadyMyDW(NoDialog, hasReferrer) {
        if (hasReferrer === true) {
            logger('hasReferrer', 'regenerated');
            $('article[data-snig="canDownload"], div[data-snig="canDownload"]').filter(function () {
                return $(this).find('.IG_DW_MAIN').length === 0
            }).removeAttr('data-snig');
        }

        // Whether is Instagram dialog?
        if (NoDialog == false) {
            const maxCall = 100;
            let i = 0;
            var repeat = setInterval(() => {
                // section:visible > main > div > div[data-snig="canDownload"] > div > div > div > hr << (single foreground post in page, non-floating // <hr> element here is literally the line beneath poster's username) >>
                // section:visible > main > div > div.xdt5ytf[data-snig="canDownload"] << (former CSS selector for single foreground post in page, non-floating) >>
                // <hr> is much more unique element than "div.xdt5ytf"
                if (i > maxCall || $('article[data-snig="canDownload"], section:visible > main > div > div[data-snig="canDownload"] > div > div > div > hr, div[id^="mount"] > div > div > div.x1n2onr6.x1vjfegm div[data-snig="canDownload"]').length > 0) {
                    clearInterval(repeat);

                    if (i > maxCall) {
                        //alert('Trying to call button creation method reached to maximum try times. If you want to re-register method, please open script menu and press "Reload Script" button or hotkey "R" to reload main timer.');
                        console.warn('onReadyMyDW() Timer', 'maximum number of repetitions reached, terminated');
                    }
                }

                logger('onReadyMyDW() Timer', 'repeating to call detection createDownloadButton()');
                createDownloadButton();
                i++;
            }, 50);
        }
        else {
            createDownloadButton();
        }
    }


    /**
     * initPostVideoFunction
     * @description Initialize settings related to the video resources in the post
     *
     * @param  {Object}  $mainElement
     * @return {Void}
     */
    function initPostVideoFunction($mainElement) {
        // Disable video autoplay
        if (USER_SETTING.DISABLE_VIDEO_LOOPING) {
            $mainElement.find('video').each(function () {
                $(this).on('ended', function () {
                    if (!$(this).data('loop')) {
                        $(this).attr('data-loop', true);
                        this.pause();
                        logger('(post) Added video event listener #loop');
                    }
                });
            });
        }

        // Modify video volume
        if (USER_SETTING.MODIFY_VIDEO_VOLUME) {
            $mainElement.find('video').each(function () {
                $(this).on('play playing', function () {
                    if (!$(this).data('modify')) {
                        $(this).attr('data-modify', true);
                        this.volume = state.videoVolume;
                        logger('(post) Added video event listener #modify');
                    }
                });
            });
        }

        if (USER_SETTING.HTML5_VIDEO_CONTROL) {
            $mainElement.find('video').each(function () {
                if (!$(this).data('controls')) {
                    let $video = $(this);

                    logger('(post) Added video html5 contorller #modify');

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
                    $(this).parent().find('video + div > div').first().on('contextmenu', function (e) {
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

                    $(this).css('position', 'absolute');
                    $(this).css('z-index', '2');
                    $(this).attr('data-controls', true);
                    $(this).attr('controls', true);
                }
            });
        }

        var $videos = $mainElement.find('video');
        var $buttonParent = $mainElement.find('video + div > div').first();
        toggleVolumeSilder($videos, $buttonParent, 'post', 'bottom');
    };

    /**
     * createDownloadButton
     * @description Create a download button in the upper right corner of each post
     *
     * @return {void}
     */
    function createDownloadButton() {
        // Add download icon per each posts
        // eslint-disable-next-line no-unused-vars
        $('article, section:visible > main > div > div > div > div > div > hr').map(function (index) {
            return $(this).is('section:visible > main > div > div > div > div > div > hr') ? $(this).parent().parent().parent().parent()[0] : this;
        }).filter(function () {
            return $(this).height() > 0 && $(this).width() > 0
        })
            .each(function (index) {
                // If it is have not download icon
                // class x1iyjqo2 mean user profile pages post list container
                if (!$(this).attr('data-snig') && !$(this).hasClass('x1iyjqo2') && !$(this).children('article')?.hasClass('x1iyjqo2') && $(this).parents('div#scrollview').length === 0) {
                    logger("Found post container", $(this));

                    const $mainElement = $(this);
                    const tagName = this.tagName;
                    const resourceCountSelector = '._acay ._acaz';
                    var displayResourceURL;

                    // not loop each in single top post
                    if (tagName === "DIV" && index != 0) {
                        return;
                    }

                    const $childElement = $mainElement.children("div").children("div");

                    if ($childElement.length === 0) return;

                    logger("Found insert point", $childElement);

                    // Modify carousel post counter's position to not interfere with our buttons
                    if ($mainElement.find('._acay').length > 0) {
                        if ($mainElement.find('._acay + .x24i39r').length > 0) {
                            $mainElement.find('._acay + .x24i39r').css('top', '37px');
                        }

                        const observeNode = $mainElement.find('._acay').first().parent()[0];
                        var observer = new MutationObserver(function () {
                            $mainElement.find('._acay + .x24i39r').css('top', '37px');
                        });

                        observer.observe(observeNode, {
                            childList: true
                        });
                    }

                    $childElement.eq((tagName === "DIV") ? 0 : $childElement.length - 2).append(`<div class="button_wrapper">`);

                    // Add icons
                    const DownloadElement = `<div data-ih-locale-title="DW" title="${_i18n("DW")}" class="IG_DW_MAIN">${SVG.DOWNLOAD}</div>`;
                    const NewTabElement = `<div data-ih-locale-title="NEW_TAB" title="${_i18n("NEW_TAB")}" class="IG_NEWTAB_MAIN">${SVG.NEW_TAB}</div>`;
                    const ThumbnailElement = `<div data-ih-locale-title="THUMBNAIL_INTRO" title="${_i18n("THUMBNAIL_INTRO")}" class="IG_THUMBNAIL_MAIN">${SVG.THUMBNAIL}</div>`;
                    const ViewerElement = `<div data-ih-locale-title="IMAGE_VIEWER" title="${_i18n("IMAGE_VIEWER")}" class="IG_IMAGE_VIEWER">${SVG.FULLSCREEN}</div>`;

                    $childElement.find(".button_wrapper").append(DownloadElement);

                    const resource_count = $mainElement.find(resourceCountSelector).length;

                    if (resource_count > 1 && USER_SETTING.DIRECT_DOWNLOAD_VISIBLE_RESOURCE && !USER_SETTING.DIRECT_DOWNLOAD_ALL) {
                        const DownloadAllElement = `<div data-ih-locale-title="DW_ALL" title="${_i18n("DW_ALL")}" class="IG_DW_ALL_MAIN">${SVG.DOWNLOAD_ALL}</div>`;
                        $childElement.find(".button_wrapper").append(DownloadAllElement);
                    }

                    $childElement.find(".button_wrapper").append(NewTabElement);

                    setTimeout(() => {
                        // Check if visible post is video
                        if ($childElement.eq((tagName === "DIV") ? 0 : $childElement.length - 2).find('div > ul li._acaz').length === 0) {
                            if ($childElement.find('video').length > 0) {
                                $childElement.find(".button_wrapper").append(ThumbnailElement);
                            }
                            else {
                                displayResourceURL = $mainElement.find('img').filter(function () {
                                    return $(this).width() > 200 && $(this).height() > 200
                                }).attr('src');
                                $childElement.find(".button_wrapper").append(ViewerElement);
                            }
                        }
                        else {
                            // eslint-disable-next-line no-unused-vars
                            const checkVideoNodeCallback = (entries, observer) => {
                                entries.forEach((entry) => {
                                    //logger(entry);
                                    if (entry.isIntersecting) {
                                        var $targetNode = $(entry.target);
                                        $childElement.find('.IG_THUMBNAIL_MAIN')?.remove();
                                        $childElement.find('.IG_IMAGE_VIEWER')?.remove();

                                        // Check if video?
                                        if ($targetNode.find('video').length > 0) {
                                            if ($childElement.find('.IG_THUMBNAIL_MAIN').length === 0) {
                                                $childElement.find(".button_wrapper").append(ThumbnailElement);
                                            }

                                            initPostVideoFunction($mainElement);
                                        }
                                        // is Image
                                        else {
                                            displayResourceURL = $targetNode.find('img').attr('src');
                                            $childElement.find(".button_wrapper").append(ViewerElement);
                                        }
                                    }
                                });
                            };

                            const observer_i = new IntersectionObserver(checkVideoNodeCallback, {
                                root: $mainElement.find('div > ul._acay').first().parent().parent().parent()[0],
                                rootMargin: "0px",
                                threshold: 0.1,
                            });

                            // trigger when switching resources
                            // eslint-disable-next-line no-unused-vars
                            const observer = new MutationObserver(function (mutation, owner) {
                                var target = mutation.at(0)?.target;

                                $(target).find('li._acaz').each(function () {
                                    observer_i.observe(this);
                                });
                            });

                            // first onload
                            $mainElement.find('div > ul li._acaz').each(function () {
                                observer_i.observe(this);
                            });


                            const element = $childElement.eq((tagName === "DIV") ? 0 : $childElement.length - 2).find('div > ul li._acaz')?.parent()[0];
                            const elementAttr = $childElement.eq((tagName === "DIV") ? 0 : $childElement.length - 2).find('div > ul li._acaz')?.parent().parent()[0];

                            if (element) {
                                observer.observe(element, {
                                    childList: true
                                });
                            }

                            if (elementAttr) {
                                observer.observe(elementAttr, {
                                    attributes: true
                                });
                            }
                        }
                    }, 50);


                    $childElement.css('position', 'relative');

                    initPostVideoFunction($mainElement);

                    state.GL_registerEventList.push({
                        element: this,
                        trigger: [
                            '.IG_THUMBNAIL_MAIN',
                            '.IG_NEWTAB_MAIN',
                            '.IG_DW_ALL_MAIN',
                            '.IG_DW_MAIN',
                            '.IG_IMAGE_VIEWER'
                        ]
                    });

                    $(this).on('click', '.IG_IMAGE_VIEWER', function () {
                        if (displayResourceURL != null) {
                            openImageViewer(displayResourceURL);
                        }
                        else {
                            alert("Cannot find resource url.");
                        }
                    });

                    $(this).on('click', '.IG_THUMBNAIL_MAIN', function () {
                        updateLoadingBar(true);

                        state.GL_username = $mainElement.attr('data-username');
                        state.GL_postPath = location.pathname.replace(/\/$/, '').split('/').at(-1) || $mainElement.find('a[href^="/p/"]').first().attr("href").split("/").at(2) || $(this).parent().parent().parent().children("div:last-child").children("div").children("div:last-child").find('a[href^="/p/"]').last().attr("href").split("/").at(2);

                        var index = getVisibleNodeIndex($mainElement);

                        IG_createDM(true, false);

                        createMediaListDOM(state.GL_postPath, ".IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY", "").then(() => {
                            let checkBlob = setInterval(() => {
                                if ($('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY a').length > 0) {
                                    clearInterval(checkBlob);
                                    var $videoThumbnail = $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY a[data-globalindex="' + (index + 1) + '"]')?.parent().find('.videoThumbnail')?.first();

                                    if ($videoThumbnail != null && $videoThumbnail.length > 0) {
                                        $videoThumbnail.trigger("click");
                                    }
                                    else {
                                        alert('Can not find thumbnail url.');
                                    }

                                    updateLoadingBar(false);
                                    $('.IG_POPUP_DIG').remove();
                                }
                            }, 250);
                        });
                    });

                    $(this).on('click', '.IG_NEWTAB_MAIN', function () {
                        updateLoadingBar(true);

                        state.GL_username = $mainElement.attr('data-username');
                        state.GL_postPath = location.pathname.replace(/\/$/, '').split('/').at(-1) || $mainElement.find('a[href^="/p/"]').first().attr("href").split("/").at(2) || $(this).parent().parent().parent().children("div:last-child").children("div").children("div:last-child").find('a[href^="/p/"]').last().attr("href").split("/").at(2);

                        var index = getVisibleNodeIndex($mainElement);

                        IG_createDM(true, false);

                        createMediaListDOM(state.GL_postPath, ".IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY", "").then(() => {
                            let checkBlob = setInterval(() => {
                                if ($('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY a').length > 0) {
                                    clearInterval(checkBlob);
                                    var $linkElement = $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY a[data-globalindex="' + (index + 1) + '"]');

                                    if (USER_SETTING.FORCE_RESOURCE_VIA_MEDIA && USER_SETTING.NEW_TAB_ALWAYS_FORCE_MEDIA_IN_POST) {
                                        triggerLinkElement($linkElement.first()[0], true);
                                    }
                                    else {
                                        let href = $linkElement?.attr('data-href');
                                        if (href) {
                                            // replace https://instagram.ftpe8-2.fna.fbcdn.net/ to https://scontent.cdninstagram.com/ becase of same origin policy (some video)
                                            var urlObj = new URL(href);
                                            urlObj.host = 'scontent.cdninstagram.com';

                                            openNewTab(urlObj.href);
                                        }
                                        else {
                                            alert('Can not find open tab url.');
                                        }
                                    }

                                    updateLoadingBar(false);
                                    $('.IG_POPUP_DIG').remove();
                                }
                            }, 250);
                        });
                    });

                    // Running if user click the download all icon
                    $(this).on('click', '.IG_DW_ALL_MAIN', async function () {
                        state.GL_username = $mainElement.attr('data-username');
                        state.GL_postPath = location.pathname.replace(/\/$/, '').split('/').at(-1) || $mainElement.find('a[href^="/p/"]').first().attr("href").split("/").at(2) || $(this).parent().parent().parent().children("div:last-child").children("div").children("div:last-child").find('a[href^="/p/"]').last().attr("href").split("/").at(2);

                        // Create element that download dailog
                        IG_createDM(USER_SETTING.DIRECT_DOWNLOAD_ALL, true);

                        $("#article-id").html(`<a href="https://www.instagram.com/p/${state.GL_postPath}">${state.GL_postPath}</a>`);

                        $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY a').each(function () {
                            $(this).wrap('<div></div>');
                            $(this).before('<label class="inner_box_wrapper"><input class="inner_box" type="checkbox"><span></span></label>');
                            $(this).after(`<div data-ih-locale-title="NEW_TAB" title="${_i18n("NEW_TAB")}" class="newTab">${SVG.NEW_TAB}</div>`);

                            if ($(this).attr('data-name') == 'video') {
                                $(this).after(`<div data-ih-locale-title="THUMBNAIL_INTRO" title="${_i18n("THUMBNAIL_INTRO")}" class="videoThumbnail">${SVG.THUMBNAIL}</div>`);
                            }
                        });


                        createMediaListDOM(state.GL_postPath, ".IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY", _i18n("LOAD_BLOB_MULTIPLE")).then(() => {
                            let checkBlob = setInterval(() => {
                                if ($('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY a').length > 0) {
                                    clearInterval(checkBlob);
                                    $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY a').each(function () {
                                        $(this).trigger("click");
                                    });

                                    $('.IG_POPUP_DIG').remove();
                                }
                            }, 250);
                        });
                    });

                    // Running if user click the download icon
                    $(this).on('click', '.IG_DW_MAIN', async function () {
                        state.GL_username = $mainElement.attr('data-username');
                        state.GL_postPath = location.pathname.replace(/\/$/, '').split('/').at(-1) || $mainElement.find('a[href^="/p/"]').first().attr("href").split("/").at(2) || $(this).parent().parent().parent().children("div:last-child").children("div").children("div:last-child").find('a[href^="/p/"]').last().attr("href").split("/").at(2);

                        // Create element that download dailog
                        IG_createDM(USER_SETTING.DIRECT_DOWNLOAD_ALL, true);

                        $("#article-id").html(`<a href="https://www.instagram.com/p/${state.GL_postPath}">${state.GL_postPath}</a>`);

                        if (USER_SETTING.DIRECT_DOWNLOAD_VISIBLE_RESOURCE) {
                            updateLoadingBar(true);
                            IG_setDM(true);

                            var index = getVisibleNodeIndex($(this).parent().parent().parent());

                            createMediaListDOM(state.GL_postPath, ".IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY", "").then(() => {
                                let checkBlob = setInterval(() => {
                                    if ($('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY a').length > 0) {
                                        clearInterval(checkBlob);
                                        var href = $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY a[data-globalindex="' + (index + 1) + '"]')?.attr('data-href');

                                        if (href) {
                                            updateLoadingBar(false);
                                            $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY a[data-globalindex="' + (index + 1) + '"]')?.trigger("click");
                                        }
                                        else {
                                            alert('Can not find download url.');
                                        }

                                        $('.IG_POPUP_DIG').remove();
                                    }
                                }, 250);
                            });

                            return;
                        }

                        if (!USER_SETTING.DIRECT_DOWNLOAD_ALL) {
                            // Find video/image element and add the download icon
                            var s = 0;
                            var multiple = $(this).parent().parent().find(resourceCountSelector).length;
                            var blob = USER_SETTING.FORCE_FETCH_ALL_RESOURCES;
                            var publish_time = new Date(
                                $(this).parent().parent().parent().find('a[href] time[datetime]').filter(function () {
                                    let href = $(this).parents("a[href]").attr("href");
                                    return href?.startsWith("/p/") || href?.match(/\/([\w.\-_]+)\/p\//ig) != null;
                                }).first().attr('datetime')
                            ).getTime();

                            // If posts have more than one images or videos.
                            if (multiple) {
                                $(this).parent().parent().find(resourceCountSelector).each(function () {
                                    let element_videos = $(this).parent().parent().parent().find('video');
                                    //if(element_videos && element_videos.attr('src') && element_videos.attr('src').match(/^blob:/ig)){
                                    if (element_videos && element_videos.attr('src')) {
                                        blob = true;
                                    }
                                });


                                if (blob || USER_SETTING.FORCE_RESOURCE_VIA_MEDIA) {
                                    createMediaListDOM(state.GL_postPath, ".IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY", _i18n("LOAD_BLOB_MULTIPLE"));
                                }
                                else {
                                    $(this).parent().parent().find(resourceCountSelector).each(function () {
                                        s++;
                                        let element_videos = $(this).find('video');
                                        let element_images = $(this).find('._aagv img');
                                        let imgLink = (element_images.attr('srcset')) ? element_images.attr('srcset').split(" ")[0] : element_images.attr('src');

                                        if (element_videos && element_videos.attr('src')) {
                                            blob = true;
                                        }
                                        if (element_images && imgLink) {
                                            $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY').append(`<a datetime="${publish_time}" data-needed="direct" data-path="${state.GL_postPath}" data-name="photo" data-type="jpg" data-globalIndex="${s}" href="javascript:;" data-href="${imgLink}"><img width="100" src="${imgLink}" /><br/>- <span data-ih-locale="IMG">${_i18n("IMG")}</span> ${s} -</a>`);
                                        }

                                    });

                                    if (blob) {
                                        createMediaListDOM(state.GL_postPath, ".IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY", _i18n("LOAD_BLOB_RELOAD"));
                                    }
                                }
                            }
                            else {
                                if (USER_SETTING.FORCE_RESOURCE_VIA_MEDIA) {
                                    createMediaListDOM(state.GL_postPath, ".IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY", _i18n("LOAD_BLOB_MULTIPLE"));
                                }
                                else {
                                    s++;
                                    let element_videos = $(this).parent().parent().parent().find('video');
                                    let element_images = $(this).parent().parent().parent().find('._aagv img');
                                    let imgLink = (element_images.attr('srcset')) ? element_images.attr('srcset').split(" ")[0] : element_images.attr('src');


                                    if (element_videos && element_videos.attr('src')) {
                                        createMediaListDOM(state.GL_postPath, ".IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY", _i18n("LOAD_BLOB_ONE"));
                                    }
                                    if (element_images && imgLink) {
                                        $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY').append(`<a datetime="${publish_time}" data-needed="direct" data-path="${state.GL_postPath}" data-name="photo" data-type="jpg" data-globalIndex="${s}" href="javascript:;" href="" data-href="${imgLink}"><img width="100" src="${imgLink}" /><br/>- <span data-ih-locale="IMG">${_i18n("IMG")}</span> ${s} -</a>`);
                                    }
                                }
                            }
                        }

                        $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY a').each(function () {
                            $(this).wrap('<div></div>');
                            $(this).before('<label class="inner_box_wrapper"><input class="inner_box" type="checkbox"><span></span></label>');
                            $(this).after(`<div data-ih-locale-title="NEW_TAB" title="${_i18n("NEW_TAB")}" class="newTab">${SVG.NEW_TAB}</div>`);

                            if ($(this).attr('data-name') == 'video') {
                                $(this).after(`<div data-ih-locale-title="THUMBNAIL_INTRO" title="${_i18n("THUMBNAIL_INTRO")}" class="videoThumbnail">${SVG.THUMBNAIL}</div>`);
                            }
                        });

                        if (USER_SETTING.DIRECT_DOWNLOAD_ALL) {
                            createMediaListDOM(state.GL_postPath, ".IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY", _i18n("LOAD_BLOB_MULTIPLE")).then(() => {
                                let checkBlob = setInterval(() => {
                                    if ($('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY a').length > 0) {
                                        clearInterval(checkBlob);
                                        $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY a').each(function () {
                                            $(this).trigger("click");
                                        });

                                        $('.IG_POPUP_DIG').remove();
                                    }
                                }, 250);
                            });
                        }
                    });

                    // Add the mark that download is ready
                    var username = $(this).find("header > div:last-child > div:first-child span a").first().text() || $(this).find('a[href^="/"]').filter(function () {
                        return $(this)?.text()?.length > 0;
                    }).first().text();

                    $(this).attr('data-snig', 'canDownload');
                    $(this).attr('data-username', username);
                }
            });
    }


    /**
     * filterResourceData
     * @description Standardized resource object format
     *
     * @param  {Object}  data
     * @return {Object}
     */
    function filterResourceData(data) {
        var resource = data.shortcode_media ?? data;
        if (resource.owner == null && resource.user != null) {
            resource.owner = resource.user;
        }

        if (resource.owner == null) {
            logger('carousel_media:', 'undefined username');
            alert('carousel_media: undefined username');
        }

        return resource;
    }


    /**
     * createMediaListDOM
     * @description Create a list of media elements from post URLs
     *
     * @param  {String}  postURL
     * @param  {String}  selector - Use CSS element selectors to choose where it appears.
     * @param  {String}  message - i18n display loading message
     * @return {void}
     */
    async function createMediaListDOM(postURL, selector, message) {
        try {
            $(`${selector} a`).remove();
            $(selector).append('<p id="_SNLOAD">' + message + '</p>');
            let result = await getBlobMedia(postURL);
            let resource = filterResourceData(result.data);

            if (result.type === 'query_hash') {
                let idx = 1;

                // GraphVideo
                if (resource.__typename == "GraphVideo" && resource.video_url) {
                    $(selector).append(`<a media-id="${resource.id}" datetime="${resource.taken_at_timestamp}" data-blob="true" data-needed="direct" data-path="${resource.shortcode}" data-name="video" data-type="mp4" data-username="${resource.owner.username}" data-globalIndex="${idx}" href="javascript:;" data-href="${resource.video_url}"><img width="100" src="${resource.display_resources[1].src}" /><br/>- <span data-ih-locale="VID">${_i18n("VID")}</span> ${idx} -</a>`);
                    idx++;
                }
                // GraphImage
                if (resource.__typename == "GraphImage") {
                    $(selector).append(`<a media-id="${resource.id}" datetime="${resource.taken_at_timestamp}" data-blob="true" data-needed="direct" data-path="${resource.shortcode}" data-name="photo" data-type="jpg" data-username="${resource.owner.username}" data-globalIndex="${idx}" href="javascript:;" data-href="${resource.display_resources[resource.display_resources.length - 1].src}"><img width="100" src="${resource.display_resources[1].src}" /><br/>- <span data-ih-locale="IMG">${_i18n("IMG")}</span> ${idx} -</a>`);
                    idx++;
                }
                // GraphSidecar
                if (resource.__typename == "GraphSidecar" && resource.edge_sidecar_to_children) {
                    for (let e of resource.edge_sidecar_to_children.edges) {
                        if (e.node.__typename == "GraphVideo") {
                            $(selector).append(`<a media-id="${e.node.id}" datetime="${resource.taken_at_timestamp}" data-blob="true" data-needed="direct" data-path="${resource.shortcode}" data-name="video" data-type="mp4" data-username="${resource.owner.username}" data-globalIndex="${idx}" href="javascript:;" data-href="${e.node.video_url}"><img width="100" src="${e.node.display_resources[1].src}" /><br/>- <span data-ih-locale-title="VID">${_i18n("VID")}</span> ${idx} -</a>`);
                        }

                        if (e.node.__typename == "GraphImage") {
                            $(selector).append(`<a media-id="${e.node.id}" datetime="${resource.taken_at_timestamp}" data-blob="true" data-needed="direct" data-path="${resource.shortcode}" data-name="photo" data-type="jpg" data-username="${resource.owner.username}" data-globalIndex="${idx}" href="javascript:;" data-href="${e.node.display_resources[e.node.display_resources.length - 1].src}"><img width="100" src="${e.node.display_resources[1].src}" /><br/>- <span data-ih-locale="IMG">${_i18n("IMG")}</span> ${idx} -</a>`);
                        }
                        idx++;
                    }
                }
            }
            else {
                if (resource.carousel_media) {
                    logger('carousel_media');

                    resource.carousel_media.forEach((mda, ind) => {
                        let idx = ind + 1;
                        // Image
                        if (mda.video_versions == null) {
                            mda.image_versions2.candidates.sort(function (a, b) {
                                let aSTP = new URL(a.url).searchParams.get('stp');
                                let bSTP = new URL(b.url).searchParams.get('stp');

                                if (aSTP && bSTP) {
                                    if (aSTP.length > bSTP.length) return 1;
                                    if (aSTP.length < bSTP.length) return -1;
                                }
                                else {
                                    if (a.width < b.width) return 1;
                                    if (a.width > b.width) return -1;
                                }

                                return 0;
                            });

                            $(selector).append(`<a media-id="${mda.pk}" datetime="${mda.taken_at}" data-blob="true" data-needed="direct" data-path="${resource.code}" data-name="photo" data-type="jpg" data-username="${resource.owner.username}" data-globalIndex="${idx}" href="javascript:;" data-href="${mda.image_versions2.candidates[0].url}"><img width="100" src="${mda.image_versions2.candidates[0].url}" /><br/>- <span data-ih-locale="IMG">${_i18n("IMG")}</span> ${idx} -</a>`);
                        }
                        // Video
                        else {
                            $(selector).append(`<a media-id="${mda.pk}" datetime="${mda.taken_at}" data-blob="true" data-needed="direct" data-path="${resource.code}" data-name="video" data-type="mp4" data-username="${resource.owner.username}" data-globalIndex="${idx}" href="javascript:;" data-href="${mda.video_versions[0].url}"><img width="100" src="${mda.image_versions2.candidates[0].url}" /><br/>- <span data-ih-locale="VID">${_i18n("VID")}</span> ${idx} -</a>`);
                        }
                    });
                }
                else {
                    let idx = 1;
                    // Image
                    if (resource.video_versions == null) {
                        resource.image_versions2.candidates.sort(function (a, b) {
                            let aSTP = new URL(a.url).searchParams.get('stp');
                            let bSTP = new URL(b.url).searchParams.get('stp');

                            if (aSTP && bSTP) {
                                if (aSTP.length > bSTP.length) return 1;
                                if (aSTP.length < bSTP.length) return -1;
                            }
                            else {
                                if (a.width < b.width) return 1;
                                if (a.width > b.width) return -1;
                            }

                            return 0;
                        });

                        $(selector).append(`<a media-id="${resource.pk}" datetime="${resource.taken_at}" data-blob="true" data-needed="direct" data-path="${resource.code}" data-name="photo" data-type="jpg" data-username="${resource.owner.username}" data-globalIndex="${idx}" href="javascript:;" data-href="${resource.image_versions2.candidates[0].url}"><img width="100" src="${resource.image_versions2.candidates[0].url}" /><br/>- <span data-ih-locale="IMG">${_i18n("IMG")}</span> ${idx} -</a>`);
                    }
                    // Video
                    else {
                        $(selector).append(`<a media-id="${resource.pk}" datetime="${resource.taken_at}" data-blob="true" data-needed="direct" data-path="${resource.code}" data-name="video" data-type="mp4" data-username="${resource.owner.username}" data-globalIndex="${idx}" href="javascript:;" data-href="${resource.video_versions[0].url}"><img width="100" src="${resource.image_versions2.candidates[0].url}" /><br/>- <span data-ih-locale="VID">${_i18n("VID")}</span> ${idx} -</a>`);
                    }
                }
            }

            $("#_SNLOAD").remove();
            $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY a').each(function () {
                $(this).wrap('<div></div>');
                $(this).before('<label class="inner_box_wrapper"><input class="inner_box" type="checkbox"><span></span></label>');
                $(this).after(`<div data-ih-locale-title="NEW_TAB" title="${_i18n("NEW_TAB")}" class="newTab">${SVG.NEW_TAB}</div>`);

                if ($(this).attr('data-name') == 'video') {
                    $(this).after(`<div data-ih-locale-title="THUMBNAIL_INTRO" title="${_i18n("THUMBNAIL_INTRO")}" class="videoThumbnail">${SVG.THUMBNAIL}</div>`);
                }
            });
        }
        catch (err) {
            logger('createMediaListDOM', err);
        };
    }


    /**
     * getVisibleNodeIndex
     * @description Get element visible node
     *
     * @param  {Object}  $main
     * @return {Integer}
     */
    function getVisibleNodeIndex($main) {
        var index = 0;
        // homepage classList
        var $dot = $main.find('.x1iyjqo2 > div > div:last-child > div');

        // dialog classList, main top classList
        if ($dot == null || !$dot.hasClass('_acnb')) {
            $dot = $main.find('._aatk > div > div:last-child').eq(0).children('div');
        }

        $dot.filter('._acnb').each(function (sIndex) {
            if ($(this).hasClass('_acnf')) {
                index = sIndex;
            }
        });

        return index;
    }

    /**
     * onProfileAvatar
     * @description Trigger user avatar download event or button display event.
     *
     * @param  {Boolean}  isDownload - Check if it is a download operation
     * @return {void}
     */
    async function onProfileAvatar(isDownload) {
        if (isDownload) {
            updateLoadingBar(true);

            let date = new Date().getTime();
            let timestamp = Math.floor(date / 1000);
            let username = location.pathname.replaceAll(/(reels|tagged)\/$/ig, '').split('/').filter(s => s.length > 0).at(-1);
            let userInfo = await getUserId(username);

            try {
                let dataURL = await getUserHighSizeProfile(userInfo.user.pk);
                saveFiles(dataURL, username, "avatar", timestamp, 'jpg');
            }
            // eslint-disable-next-line no-unused-vars
            catch (err) {
                saveFiles(userInfo.user.profile_pic_url, username, "avatar", timestamp, 'jpg');
            }

            updateLoadingBar(false);
        }
        else {
            // Add the profile download button
            if (!$('.IG_DWPROFILE').length) {
                let profileTimer = setInterval(() => {
                    if ($('.IG_DWPROFILE').length) {
                        clearInterval(profileTimer);
                        return;
                    }

                    $('header > *[class]:first-child img[alt][draggable]').parent().parent().append(`<div data-ih-locale-title="DW" title="${_i18n("DW")}" class="IG_DWPROFILE">${SVG.DOWNLOAD}</div>`);
                    $('header > *[class]:first-child img[alt][draggable]').parent().parent().css('position', 'relative');
                    $('header > *[class]:first-child img[alt]:not([draggable])').parent().parent().parent().append(`<div data-ih-locale-title="DW" title="${_i18n("DW")}" class="IG_DWPROFILE">${SVG.DOWNLOAD}</div>`);
                    $('header > *[class]:first-child img[alt]:not([draggable])').parent().parent().parent().css('position', 'relative');
                }, 150);
            }
        }
    }

    /**
     * onReels
     * @description Trigger user's reels download event or button display event.
     *
     * @param  {Boolean}  isDownload - Check if it is a download operation
     * @param  {Boolean}  isVideo - Check if reel is a video element
     * @param  {Boolean}  isPreview - Check if it is need to open new tab
     * @return {void}
     */
    async function onReels(isDownload, isVideo, isPreview) {
        if (isDownload) {
            updateLoadingBar(true);

            let reelsPath = location.href.split('?').at(0).split('instagram.com/reels/').at(-1).replaceAll('/', '');
            let result = await getBlobMedia(reelsPath);
            let media = filterResourceData(result.data);

            let timestamp = new Date().getTime();

            if (USER_SETTING.RENAME_PUBLISH_DATE) {
                if (result.type === 'query_hash') {
                    timestamp = media.shortcode_media.taken_at_timestamp;
                }
                else {
                    timestamp = media.taken_at;
                }
            }

            if (result.type === 'query_hash') {
                if (isVideo && media.shortcode_media.is_video) {
                    if (isPreview) {
                        openNewTab(media.shortcode_media.video_url);
                    }
                    else {
                        let type = 'mp4';
                        saveFiles(media.shortcode_media.video_url, media.shortcode_media.owner.username, "reels", timestamp, type, reelsPath);
                    }
                }
                else {
                    if (isPreview) {
                        openNewTab(media.shortcode_media.display_resources.at(-1).src);
                    }
                    else {
                        let type = 'jpg';
                        saveFiles(media.shortcode_media.display_resources.at(-1).src, media.shortcode_media.owner.username, "reels", timestamp, type, reelsPath);
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
                                $(this).children().append(`<div data-ih-locale-title="THUMBNAIL_INTRO" title="${_i18n("THUMBNAIL_INTRO")}" class="IG_REELS_THUMBNAIL">${SVG.THUMBNAIL}</div>`);

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

                                            $(this).css('position', 'absolute');
                                            $(this).css('z-index', '2');
                                            $(this).attr('data-controls', true);
                                            $(this).attr('controls', true);
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

    /**
     * onStoryAll
     * @description Trigger user's story all download event.
     *
     * @return {void}
     */
    async function onStoryAll() {
        updateLoadingBar(true);

        let date = new Date().getTime();
        let timestamp = Math.floor(date / 1000);
        let username = $("body > div section._ac0a header._ac0k ._ac0l a + div a").first().text() || location.pathname.split("/").filter(s => s.length > 0).at(1);

        let userInfo = await getUserId(username);
        let userId = userInfo.user.pk;
        let stories = await getStories(userId);

        let complete = 0;
        setDownloadProgress(complete, stories.data.reels_media[0].items.length);

        stories.data.reels_media[0].items.forEach((item, idx) => {
            setTimeout(() => {
                if (USER_SETTING.RENAME_PUBLISH_DATE) {
                    timestamp = item.taken_at_timestamp;
                }

                item.display_resources.sort(function (a, b) {
                    if (a.config_width < b.config_width) return 1;
                    if (a.config_width > b.config_width) return -1;
                    return 0;
                });

                if (item.is_video) {
                    saveFiles(item.video_resources[0].src, username, "stories", timestamp, 'mp4', item.id).then(() => {
                        setDownloadProgress(++complete, stories.data.reels_media[0].items.length);
                    });
                }
                else {
                    saveFiles(item.display_resources[0].src, username, "stories", timestamp, 'jpg', item.id).then(() => {
                        setDownloadProgress(++complete, stories.data.reels_media[0].items.length);
                    });
                }
            }, 100 * idx);
        });
    }

    /**
     * onStory
     * @description Trigger user's story download event or button display event.
     *
     * @param  {Boolean}  isDownload - Check if it is a download operation
     * @param  {Boolean}  isForce - Check if downloading directly from API instead of cache
     * @param  {Boolean}  isPreview - Check if it is need to open new tab
     * @return {void}
     */
    async function onStory(isDownload, isForce, isPreview) {
        var username = $("body > div section._ac0a header._ac0k ._ac0l a + div a").first().text() || location.pathname.split("/").filter(s => s.length > 0).at(1);
        if (isDownload) {
            let date = new Date().getTime();
            let timestamp = Math.floor(date / 1000);

            updateLoadingBar(true);
            if (USER_SETTING.FORCE_RESOURCE_VIA_MEDIA && !state.tempFetchRateLimit) {
                let mediaId = null;

                let userInfo = await getUserId(username);
                let userId = userInfo.user.pk;
                let stories = await getStories(userId);
                let urlID = location.pathname.split('/').filter(s => s.length > 0 && s.match(/^([0-9]{10,})$/)).at(-1);

                /*
                let latest_reel_media = stories.data.reels_media[0].latest_reel_media;
                let last_seen = stories.data.reels_media[0].seen;
                logger(stories);

                if(urlID == null){
                    mediaId = stories.data.reels_media[0].items.filter(function(item, index){
                        return item.taken_at_timestamp === last_seen && item.taken_at_timestamp !== latest_reel_media || last_seen === latest_reel_media && index === 0;
                    })?.at(0)?.id;
                    logger('nula', mediaId);
                }
                else{
                    stories.data.reels_media[0].items.forEach(item => {
                        if(item.id == urlID){
                            mediaId = item.id;
                        }
                    });
                }
                */

                stories.data.reels_media[0].items.forEach(item => {
                    if (item.id == urlID) {
                        mediaId = item.id;
                    }
                });

                if (mediaId == null) {
                    let $header = getStoryProgress(username);

                    $header.each(function (index) {
                        if ($(this).children().length > 0) {
                            mediaId = stories.data.reels_media[0].items[index].id;
                        }
                    });
                }

                if (mediaId == null) {
                    // appear in from profile page to story page
                    $('body > div section:visible div.x1ned7t2.x78zum5 > div').each(function (index) {
                        if ($(this).hasClass('x1lix1fw')) {
                            if ($(this).children().length > 0) {
                                mediaId = stories.data.reels_media[0].items[index].id;
                            }
                        }
                    });

                    // appear in from home page to story page
                    $('body > div section:visible ._ac0k > ._ac3r > div').each(function (index) {
                        if ($(this).children().hasClass('_ac3q')) {
                            mediaId = stories.data.reels_media[0].items[index].id;
                        }
                    });
                }

                if (mediaId == null) {
                    mediaId = location.pathname.split('/').filter(s => s.length > 0 && s.match(/^([0-9]{10,})$/)).at(-1);
                }

                let result = await getMediaInfo(mediaId);

                if (USER_SETTING.RENAME_PUBLISH_DATE) {
                    timestamp = result.items[0].taken_at;
                }

                if (result.status === 'ok') {
                    if (result.items[0].video_versions) {
                        if (isPreview) {
                            openNewTab(result.items[0].video_versions[0].url);
                        }
                        else {
                            saveFiles(result.items[0].video_versions[0].url, username, "stories", timestamp, 'mp4', mediaId);
                        }
                    }
                    else {
                        if (isPreview) {
                            openNewTab(result.items[0].image_versions2.candidates[0].url);
                        }
                        else {
                            saveFiles(result.items[0].image_versions2.candidates[0].url, username, "stories", timestamp, 'jpg', mediaId);
                        }
                    }
                }
                else {
                    if (USER_SETTING.USE_BLOB_FETCH_WHEN_MEDIA_RATE_LIMIT) {
                        state.tempFetchRateLimit = true;
                        onStory(isDownload, isForce, isPreview);
                    }
                    else {
                        alert('Fetch failed from Media API. API response message: ' + result.message);
                    }
                    logger(result);
                }

                updateLoadingBar(false);
                return;
            }

            if ($('body > div section:visible video[playsinline]').length > 0) {
                // Download stories if it is video
                let type = "mp4";
                let videoURL = "";
                let targetURL = location.pathname.replace(/\/$/ig, '').split("/").at(-1);
                let mediaId = null;

                if (state.GL_dataCache.stories[username] && !isForce) {
                    logger('Fetch from memory cache:', username);
                    state.GL_dataCache.stories[username].data.reels_media[0].items.forEach(item => {
                        if (item.id == targetURL) {
                            videoURL = item.video_resources[0].src;
                            if (USER_SETTING.RENAME_PUBLISH_DATE) {
                                timestamp = item.taken_at_timestamp;
                                mediaId = item.id;
                            }
                        }
                    });

                    if (videoURL.length == 0) {
                        logger('Memory cache not found, try fetch from API:', username);
                        onStory(true, true);
                        return;
                    }
                }
                else {
                    let userInfo = await getUserId(username);
                    let userId = userInfo.user.pk;
                    let stories = await getStories(userId);

                    stories.data.reels_media[0].items.forEach(item => {
                        if (item.id == targetURL) {
                            videoURL = item.video_resources[0].src;
                            if (USER_SETTING.RENAME_PUBLISH_DATE) {
                                timestamp = item.taken_at_timestamp;
                                mediaId = item.id;
                            }
                        }
                    });

                    // GitHub issue #4: thinkpad4
                    if (videoURL.length == 0) {

                        let $header = getStoryProgress(username);

                        $header.each(function (index) {
                            if ($(this).children().length > 0) {
                                videoURL = stories.data.reels_media[0].items[index].video_resources[0].src;
                                if (USER_SETTING.RENAME_PUBLISH_DATE) {
                                    timestamp = stories.data.reels_media[0].items[index].taken_at_timestamp;
                                    mediaId = stories.data.reels_media[0].items[index].id;
                                }
                            }
                        });


                        if (videoURL.length == 0) {
                            // appear in from profile page to story page
                            $('body > div section:visible div.x1ned7t2.x78zum5 > div').each(function (index) {
                                if ($(this).hasClass('x1lix1fw')) {
                                    if ($(this).children().length > 0) {
                                        videoURL = stories.data.reels_media[0].items[index].video_resources[0].src;
                                        if (USER_SETTING.RENAME_PUBLISH_DATE) {
                                            timestamp = stories.data.reels_media[0].items[index].taken_at_timestamp;
                                            mediaId = stories.data.reels_media[0].items[index].id;
                                        }
                                    }
                                }
                            });

                            // appear in from home page to story page
                            $('body > div section:visible ._ac0k > ._ac3r > div').each(function (index) {
                                if ($(this).children().hasClass('_ac3q')) {
                                    videoURL = stories.data.reels_media[0].items[index].video_resources[0].src;
                                    if (USER_SETTING.RENAME_PUBLISH_DATE) {
                                        timestamp = stories.data.reels_media[0].items[index].taken_at_timestamp;
                                        mediaId = stories.data.reels_media[0].items[index].id;
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
                        saveFiles(videoURL, username, "stories", timestamp, type, mediaId);
                    }
                }
            }
            else {
                // Download stories if it is image
                let srcset = $('body > div section:visible img[referrerpolicy][class], body > div section:visible img[crossorigin][class]:not([alt])').attr('srcset')?.split(',')[0]?.split(' ')[0];
                let link = (srcset) ? srcset : $('body > div section:visible img[referrerpolicy][class], body > div section:visible img[crossorigin][class]:not([alt])').filter(function () {
                    return $(this).parents('a').length === 0 && $(this).width() === $(this).parent().width();
                }).attr('src');

                if (!link) {
                    // _aa63 mean stories picture in stories page (not avatar)
                    let $element = $('body > div section:visible img._aa63');
                    link = ($element.attr('srcset')) ? $element.attr('srcset')?.split(',')[0]?.split(' ')[0] : $element.attr('src');
                }

                if (USER_SETTING.RENAME_PUBLISH_DATE) {
                    timestamp = new Date($('body > div section:visible time[datetime][class]').first().attr('datetime')).getTime();
                }

                let downloadLink = link;
                let type = 'jpg';

                if (isPreview) {
                    openNewTab(downloadLink);
                }
                else {
                    saveFiles(downloadLink, username, "stories", timestamp, type, getStoryId(downloadLink) ?? "");
                }
            }

            state.tempFetchRateLimit = false;
            updateLoadingBar(false);
        }
        else {
            // Add the stories download button
            if (!$('.IG_DWSTORY').length) {
                state.GL_dataCache.stories = {};
                let $element = null;
                // Default detecter (section layout mode)
                if ($('body > div section._ac0a').length > 0) {
                    $element = $('body > div section:visible._ac0a');
                }
                // detecter (single story layout mode)
                else {
                    $element = $('body > div section:visible > div > div[style]:not([class])');
                    $element.css('position', 'relative');
                }


                if ($element.length === 0) {
                    $element = $('div[id^="mount"] section > div > a[href="/"]').parent().parent().parent().find('section:visible > div > div[style]:not([class])');
                    $element.css('position', 'relative');
                }

                if ($element.length === 0) {
                    $element = $('div[id^="mount"] section > div > a[href="/"]').parent().parent().parent().find('section:visible > div div[style]:not([class]) > div:not([data-visualcompletion="loading-state"])');
                    $element.css('position', 'relative');
                }


                // Detecter for div layout mode
                if ($element.length === 0) {
                    let $$element = $('body > div div:not([hidden]) section:visible > div div[class][style] > div[style]:not([class])');
                    let nowSize = 0;

                    $$element.each(function () {
                        if ($(this).width() > nowSize) {
                            nowSize = $(this).width();
                            $element = $(this).children('div').first();
                        }
                    });
                }


                if ($element != null) {
                    $element.first().css('position', 'relative');
                    $element.first().append(`<div data-ih-locale-title="DW" title="${_i18n("DW")}" class="IG_DWSTORY">${SVG.DOWNLOAD}</div>`);
                    $element.first().append(`<div data-ih-locale-title="NEW_TAB" title="${_i18n("NEW_TAB")}" class="IG_DWNEWTAB">${SVG.NEW_TAB}</div>`);

                    let $header = getStoryProgress(username);
                    if ($header.length > 1) {
                        $element.first().append(`<div data-ih-locale-title="DW_ALL" title="${_i18n("DW_ALL")}" class="IG_DWSTORY_ALL">${SVG.DOWNLOAD_ALL}</div>`);
                    }

                    // Modify video volume
                    //if(USER_SETTING.MODIFY_VIDEO_VOLUME){
                    //    $element.find('video').each(function(){
                    //        $(this).on('play playing', function(){
                    //            if(!$(this).data('modify')){
                    //                $(this).attr('data-modify', true);
                    //                this.volume = VIDEO_VOLUME;
                    //                logger('(story) Added video event listener #modify');
                    //            }
                    //        });
                    //    });
                    //}

                    // Make sure to first remove thumbnail button if still exists and story is a picture
                    $element.find('img[referrerpolicy]').each(function () {
                        $(this).on('load', function () {
                            if (!$(this).data('remove-thumbnail')) {
                                if ($element.find('.IG_DWSTORY_THUMBNAIL').length === 0) {
                                    $(this).attr('data-remove-thumbnail', true);
                                    $('.IG_DWSTORY_THUMBNAIL').remove();
                                    logger('(story) Manually removing thumbnail button');
                                }
                                else {
                                    $(this).attr('data-remove-thumbnail', true);
                                    logger('(story) Thumbnail button is not present for this picture');
                                }
                            }
                        });
                    });

                    // Try to use event listener 'timeupdate' in order to detect if story is a video
                    //$element.find('video').each(function(){
                    //    $(this).on('timeupdate',function(){
                    //        if(!$(this).data('modify-thumbnail')){
                    //            if($element.find('.IG_DWSTORY_THUMBNAIL').length === 0){
                    //                $(this).attr('data-modify-thumbnail', true);
                    //                onStoryThumbnail(false);
                    //                logger('(story) Manually inserting thumbnail button');
                    //            }
                    //            else{
                    //                $(this).attr('data-modify-thumbnail', true);
                    //                logger('(story) Thumbnail button already inserted');
                    //            }
                    //        }
                    //    });
                    //});
                }
            }
        }
    }

    /**
     * onStoryThumbnail
     * @description Trigger user's story video thumbnail download event or button display event.
     *
     * @param  {Boolean}  isDownload - Check if it is a download operation
     * @param  {Boolean}  isForce - Check if downloading directly from API instead of cache
     * @return {void}
     */
    async function onStoryThumbnail(isDownload, isForce) {
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

            updateLoadingBar(true);

            if (USER_SETTING.FORCE_RESOURCE_VIA_MEDIA && !state.tempFetchRateLimit) {
                let userInfo = await getUserId(username);
                let userId = userInfo.user.pk;
                let stories = await getStories(userId);
                let urlID = location.pathname.split('/').filter(s => s.length > 0 && s.match(/^([0-9]{10,})$/)).at(-1);

                stories.data.reels_media[0].items.forEach(item => {
                    if (item.id == urlID) {
                        mediaId = item.id;
                    }
                });

                if (mediaId == null) {
                    let $header = getStoryProgress(username);

                    $header.each(function (index) {
                        if ($(this).children().length > 0) {
                            mediaId = stories.data.reels_media[0].items[index].id;
                        }
                    });
                }

                if (mediaId == null) {
                    // appear in from profile page to story page
                    $('body > div section:visible div.x1ned7t2.x78zum5 > div').each(function (index) {
                        if ($(this).hasClass('x1lix1fw')) {
                            if ($(this).children().length > 0) {
                                mediaId = stories.data.reels_media[0].items[index].id;
                            }
                        }
                    });

                    // appear in from home page to story page
                    $('body > div section:visible ._ac0k > ._ac3r > div').each(function (index) {
                        if ($(this).children().hasClass('_ac3q')) {
                            mediaId = stories.data.reels_media[0].items[index].id;
                        }
                    });
                }

                if (mediaId == null) {
                    mediaId = location.pathname.split('/').filter(s => s.length > 0 && s.match(/^([0-9]{10,})$/)).at(-1);
                }

                let result = await getMediaInfo(mediaId);

                if (USER_SETTING.RENAME_PUBLISH_DATE) {
                    timestamp = result.items[0].taken_at;
                }

                if (result.status === 'ok') {
                    saveFiles(result.items[0].image_versions2.candidates[0].url, username, "stories", timestamp, 'jpg', mediaId);

                }
                else {
                    if (USER_SETTING.USE_BLOB_FETCH_WHEN_MEDIA_RATE_LIMIT) {
                        state.tempFetchRateLimit = true;
                        onStoryThumbnail(true, isForce);
                    }
                    else {
                        alert('Fetch failed from Media API. API response message: ' + result.message);
                    }

                    logger(result);
                }

                updateLoadingBar(false);
                return;
            }

            if (state.GL_dataCache.stories[username] && !isForce) {
                logger('Fetch from memory cache:', username);
                state.GL_dataCache.stories[username].data.reels_media[0].items.forEach(item => {
                    if (item.id == targetURL) {
                        videoThumbnailURL = item.display_url;
                        if (USER_SETTING.RENAME_PUBLISH_DATE) {
                            timestamp = item.taken_at_timestamp;
                            mediaId = item.id;
                        }
                    }
                });

                if (videoThumbnailURL.length == 0) {
                    logger('Memory cache not found, try fetch from API:', username);
                    onStoryThumbnail(true, true);
                    return;
                }
            }
            else {
                let userInfo = await getUserId(username);
                let userId = userInfo.user.pk;
                let stories = await getStories(userId);

                stories.data.reels_media[0].items.forEach(item => {
                    if (item.id == targetURL) {
                        videoThumbnailURL = item.display_url;
                        if (USER_SETTING.RENAME_PUBLISH_DATE) {
                            timestamp = item.taken_at_timestamp;
                            mediaId = item.id;
                        }
                    }
                });

                // GitHub issue #4: thinkpad4
                if (videoThumbnailURL.length == 0) {
                    let $header = getStoryProgress(username);

                    $header.each(function (index) {
                        if ($(this).children().length > 0) {
                            videoThumbnailURL = stories.data.reels_media[0].items[index].display_url;
                            if (USER_SETTING.RENAME_PUBLISH_DATE) {
                                timestamp = stories.data.reels_media[0].items[index].taken_at_timestamp;
                                mediaId = stories.data.reels_media[0].items[index].id;
                            }
                        }
                    });

                    if (videoThumbnailURL.length == 0) {
                        // appear in from profile page to story page
                        $('body > div section:visible div.x1ned7t2.x78zum5 > div').each(function (index) {
                            if ($(this).hasClass('x1lix1fw')) {
                                if ($(this).children().length > 0) {
                                    videoThumbnailURL = stories.data.reels_media[0].items[index].display_url;
                                    if (USER_SETTING.RENAME_PUBLISH_DATE) {
                                        timestamp = stories.data.reels_media[0].items[index].taken_at_timestamp;
                                        mediaId = stories.data.reels_media[0].items[index].id;
                                    }
                                }
                            }
                        });

                        // appear in from home page to story page
                        $('body > div section:visible ._ac0k > ._ac3r > div').each(function (index) {
                            if ($(this).children().hasClass('_ac3q')) {
                                videoThumbnailURL = stories.data.reels_media[0].items[index].display_url;
                                if (USER_SETTING.RENAME_PUBLISH_DATE) {
                                    timestamp = stories.data.reels_media[0].items[index].taken_at_timestamp;
                                    mediaId = stories.data.reels_media[0].items[index].id;
                                }
                            }
                        });
                    }
                }
            }

            saveFiles(videoThumbnailURL, username, "thumbnail", timestamp, type, mediaId);
            state.tempFetchRateLimit = false;
            updateLoadingBar(false);
        }
        else {
            if ($('body > div div.IG_DWSTORY').parent().find('video[class]').length) {
                // Add the stories download button
                let $element = null;
                // Default detecter (section layout mode)
                if ($('body > div section._ac0a').length > 0) {
                    $element = $('body > div section:visible._ac0a');
                }
                // detecter (single story layout mode)
                else {
                    $element = $('body > div section:visible > div > div[style]:not([class])');
                    $element.css('position', 'relative');
                }

                if ($element.length === 0) {
                    $element = $('div[id^="mount"] section > div > a[href="/"]').parent().parent().parent().find('section:visible > div > div[style]:not([class])');
                    $element.css('position', 'relative');
                }

                if ($element.length === 0) {
                    $element = $('div[id^="mount"] section > div > a[href="/"]').parent().parent().parent().find('section:visible > div div[style]:not([class]) > div:not([data-visualcompletion="loading-state"])');
                    $element.css('position', 'relative');
                }

                // Detecter for div layout mode
                if ($element.length === 0) {
                    let $$element = $('body > div div:not([hidden]) section:visible > div div[class][style] > div[style]:not([class])');
                    let nowSize = 0;

                    $$element.each(function () {
                        if ($(this).width() > nowSize) {
                            nowSize = $(this).width();
                            $element = $(this).children('div').first();
                        }
                    });
                }


                if ($element != null) {
                    $element.first().css('position', 'relative');
                    $element.first().append(`<div data-ih-locale-title="THUMBNAIL_INTRO" title="${_i18n("THUMBNAIL_INTRO")}" class="IG_DWSTORY_THUMBNAIL">${SVG.THUMBNAIL}</div>`);
                }

            }
        }
    }

    /* untils */

    /**
     * getHighlightStories
     * @description Get a list of all stories in highlight Id.
     *
     * @param  {Integer}  highlightId
     * @return {Object}
     */
    function getHighlightStories(highlightId) {
        return new Promise((resolve, reject) => {
            let getURL = `https://www.instagram.com/graphql/query/?query_hash=45246d3fe16ccc6577e0bd297a5db1ab&variables=%7B%22highlight_reel_ids%22:%5B%22${highlightId}%22%5D,%22precomposed_overlay%22:false%7D`;

            GM_xmlhttpRequest({
                method: "GET",
                url: getURL,
                onload: function (response) {
                    try {
                        let obj = JSON.parse(response.response);
                        resolve(obj);
                    }
                    catch (err) {
                        logger('getHighlightStories()', 'reject', err.message);
                        reject(err);
                    }
                },
                onerror: function (err) {
                    logger('getHighlightStories()', 'reject', err);
                    reject(err);
                }
            });
        });
    }

    /**
     * getStories
     * @description Get a list of all stories in user Id.
     *
     * @param  {Integer}  userId
     * @return {Object}
     */
    function getStories(userId) {
        return new Promise((resolve, reject) => {
            let getURL = `https://www.instagram.com/graphql/query/?query_hash=15463e8449a83d3d60b06be7e90627c7&variables=%7B%22reel_ids%22:%5B%22${userId}%22%5D,%22precomposed_overlay%22:false%7D`;

            GM_xmlhttpRequest({
                method: "GET",
                url: getURL,
                onload: function (response) {
                    try {
                        let obj = JSON.parse(response.response);
                        logger('getStories()', obj);
                        resolve(obj);
                    }
                    catch (err) {
                        logger('getStories()', 'reject', err.message);
                        reject(err);
                    }
                },
                onerror: function (err) {
                    logger('getStories()', 'reject', err);
                    reject(err);
                }
            });
        });
    }

    /**
     * getUserId
     * @description Get user's id with username
     *
     * @param  {String}  username
     * @return {Integer}
     */
    function getUserId(username) {
        return new Promise((resolve, reject) => {
            let getURL = `https://www.instagram.com/web/search/topsearch/?query=${username}`;

            GM_xmlhttpRequest({
                method: "GET",
                url: getURL,
                onload: function (response) {
                    // Fix search issue by Discord: sno_w_
                    let obj = JSON.parse(response.response);
                    let result = null;
                    obj.users.forEach(pos => {
                        if (pos.user.username?.toLowerCase() === username?.toLowerCase()) {
                            result = pos;
                        }
                    });

                    if (result != null) {
                        logger('getUserId()', result);
                        resolve(result);
                    }
                    else {
                        getUserIdWithAgent(username).then((result) => {
                            resolve(result);
                            // eslint-disable-next-line no-unused-vars
                        }).catch((err) => {
                            alert("Can not find user info from getUserId()");
                        });
                    }
                },
                onerror: function (err) {
                    logger('getUserId()', 'reject', err);
                    reject(err);
                }
            });
        });
    }

    /**
     * getUserIdWithAgent
     * @description Get user's id with username
     *
     * @param  {String}  username
     * @return {Integer}
     */
    function getUserIdWithAgent(username) {
        return new Promise((resolve, reject) => {
            let getURL = `https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`;

            GM_xmlhttpRequest({
                method: "GET",
                url: getURL,
                headers: {
                    'X-IG-App-ID': getAppID()
                },
                onload: function (response) {
                    try {
                        let obj = JSON.parse(response.response);
                        let hasUser = obj?.data?.user;

                        if (hasUser != null) {
                            let userInfo = obj?.data;
                            userInfo.user.pk = userInfo.user.id;
                            logger('getUserIdWithAgent()', obj);
                            resolve(userInfo);
                        }
                        else {
                            logger('getUserIdWithAgent()', 'reject', 'undefined');
                            reject('undefined');
                        }
                    }
                    catch (err) {
                        logger('getUserIdWithAgent()', 'reject', err.message);
                        reject(err);
                    }
                },
                onerror: function (err) {
                    logger('getUserIdWithAgent()', 'reject', err);
                    reject(err);
                }
            });
        });
    }

    /**
     * getUserHighSizeProfile
     * @description Get user's high quality avatar image.
     *
     * @param  {Integer}  userId
     * @return {String}
     */
    function getUserHighSizeProfile(userId) {
        return new Promise((resolve, reject) => {
            let getURL = `https://i.instagram.com/api/v1/users/${userId}/info/`;

            GM_xmlhttpRequest({
                method: "GET",
                url: getURL,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Pixel 7 XL)Build/RP1A.20845.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/5.0 Chrome/117.0.5938.60 Mobile Safari/537.36 Instagram 307.0.0.34.111'
                },
                onload: function (response) {
                    try {
                        let obj = JSON.parse(response.response);
                        if (obj.status !== 'ok') {
                            logger('getUserHighSizeProfile()', 'reject', obj);
                            reject('faild');
                        }
                        else {
                            logger('getUserHighSizeProfile()', obj);
                            resolve(obj.user.hd_profile_pic_url_info?.url);
                        }
                    }
                    catch (err) {
                        logger('getUserHighSizeProfile()', 'reject', err);
                        reject(err);
                    }
                },
                onerror: function (err) {
                    logger('getUserHighSizeProfile()', 'reject', err);
                    reject(err);
                }
            });
        });
    }

    /**
     * getPostOwner
     * @description Get post's author with post shortcode
     *
     * @param  {String}  postPath
     * @return {String}
     */
    function getPostOwner(postPath) {
        return new Promise((resolve, reject) => {
            if (!postPath) reject("NOPATH");
            let postShortCode = postPath;
            let getURL = `https://www.instagram.com/graphql/query/?query_hash=2c4c2e343a8f64c625ba02b2aa12c7f8&variables=%7B%22shortcode%22:%22${postShortCode}%22}`;

            GM_xmlhttpRequest({
                method: "GET",
                url: getURL,
                onload: function (response) {
                    try {
                        let obj = JSON.parse(response.response);
                        logger('getPostOwner()', obj);
                        resolve(obj.data.shortcode_media.owner.username);
                    }
                    catch (err) {
                        logger('getPostOwner()', 'reject', err.message);
                        reject(err);
                    }
                },
                onerror: function (err) {
                    logger('getPostOwner()', 'reject', err);
                    reject(err);
                }
            });
        });
    }

    /**
     * getBlobMedia
     * @description Get list of all media files in post with post shortcode
     *
     * @param  {String}  postPath
     * @return {Object}
     */
    function getBlobMedia(postPath) {
        return new Promise((resolve, reject) => {
            if (!postPath) reject("NOPATH");
            let postShortCode = postPath;
            let getURL = `https://www.instagram.com/graphql/query/?query_hash=2c4c2e343a8f64c625ba02b2aa12c7f8&variables=%7B%22shortcode%22:%22${postShortCode}%22}`;

            GM_xmlhttpRequest({
                method: "GET",
                url: getURL,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Linux; Android 10; Pixel 7 XL)Build/RP1A.20845.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/5.0 Chrome/117.0.5938.60 Mobile Safari/537.36 Instagram 307.0.0.34.111"
                },
                onload: function (response) {
                    try {
                        let obj = JSON.parse(response.response);
                        logger(obj);

                        if (obj.status === 'fail') {
                            // alert(`Request failed with API response:\n${obj.message}: ${obj.feedback_message}`);
                            logger('Request with:', 'getBlobMediaWithQuery()', postShortCode);
                            getBlobMediaWithQueryID(postShortCode).then((res) => {
                                resolve({ type: 'query_id', data: res.xdt_api__v1__media__shortcode__web_info.items[0] });
                            }).catch((err) => {
                                reject(err);
                            })
                        }
                        else {
                            resolve({ type: 'query_hash', data: obj.data });
                        }
                    }
                    catch (err) {
                        logger('getBlobMedia()', 'reject', err.message);
                        reject(err);
                    }
                },
                onerror: function (err) {
                    logger('getBlobMedia()', 'reject', err);
                    reject(err);
                }
            });
        });
    }

    /**
     * getBlobMediaWithQueryID
     * @description Get list of all media files in post with post shortcode
     *
     * @param  {String}  postPath
     * @return {Object}
     */
    function getBlobMediaWithQueryID(postPath) {
        return new Promise((resolve, reject) => {
            if (!postPath) reject("NOPATH");
            let postShortCode = postPath;
            let getURL = `https://www.instagram.com/graphql/query/?query_id=9496392173716084&variables={%22shortcode%22:%22${postShortCode}%22,%22__relay_internal__pv__PolarisFeedShareMenurelayprovider%22:true,%22__relay_internal__pv__PolarisIsLoggedInrelayprovider%22:true}`;

            GM_xmlhttpRequest({
                method: "GET",
                url: getURL,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Linux; Android 10; Pixel 7 XL)Build/RP1A.20845.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/5.0 Chrome/117.0.5938.60 Mobile Safari/537.36 Instagram 307.0.0.34.111",
                    'X-IG-App-ID': getAppID()
                },
                onload: function (response) {
                    try {
                        let obj = JSON.parse(response.response);
                        logger(obj);

                        if (obj.status === 'fail') {
                            alert(`getBlobMediaWithQueryID(): Request failed with API response:\n${obj.message}: ${obj.feedback_message}`);
                            logger(`Request failed with API response ${obj.message}: ${obj.feedback_message}`);
                            reject(response);
                        }
                        else {
                            logger('getBlobMediaWithQueryID()', obj.data);
                            resolve(obj.data);
                        }
                    }
                    catch (err) {
                        logger('getBlobMediaWithQueryID()', 'reject', err.message);
                        reject(err);
                    }
                },
                onerror: function (err) {
                    logger('getBlobMediaWithQueryID()', 'reject', err);
                    reject(err);
                }
            });
        });
    }

    /**
     * getMediaInfo
     * @description Get Instagram Media object
     *
     * @param  {String}  mediaId
     * @return {Object}
     */
    function getMediaInfo(mediaId) {
        return new Promise((resolve, reject) => {
            let getURL = `https://i.instagram.com/api/v1/media/${mediaId}/info/`;

            if (mediaId == null) {
                alert("Can not call Media API because of the media id is invalid.");
                logger('getMediaInfo()', 'reject', 'Can not call Media API because of the media id is invalid.');

                updateLoadingBar(false);
                reject(-1);
                return;
            }
            if (getAppID() == null) {
                alert("Can not call Media API because of the app id is invalid.");
                logger('getMediaInfo()', 'reject', 'Can not call Media API because of the app id is invalid.');
                updateLoadingBar(false);
                reject(-1);
                return;
            }

            GM_xmlhttpRequest({
                method: "GET",
                url: getURL,
                headers: {
                    "User-Agent": window.navigator.userAgent,
                    "Accept": "*/*",
                    'X-IG-App-ID': getAppID()
                },
                onload: function (response) {
                    if (response.finalUrl == getURL) {
                        let obj = JSON.parse(response.response);
                        logger('getMediaInfo()', obj);
                        resolve(obj);
                    }
                    else {
                        let finalURL = new URL(response.finalUrl);
                        if (finalURL.pathname.startsWith('/accounts/login')) {
                            logger('getMediaInfo()', 'reject', 'The account must be logged in to access Media API.');
                            alert("The account must be logged in to access Media API.");
                        }
                        else {
                            logger('getMediaInfo()', 'reject', 'Unable to retrieve content because the API was redirected to "' + response.finalUrl + '"');
                            alert('Unable to retrieve content because the API was redirected to "' + response.finalUrl + '"');
                        }
                        updateLoadingBar(false);
                        reject(-1);
                    }
                },
                onerror: function (err) {
                    logger('getMediaInfo()', 'reject', err);
                    resolve(err);
                }
            });
        });
    }

    /**
     * getStoryId
     * @description Obtain the media id through the resource URL.
     *
     * @param  {string}  url
     * @return {string}
     */
    function getStoryId(url) {
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
     * @description Get Instagram App ID
     *
     * @return {?integer}
     */
    function getAppID() {
        let result = null;
        $('script[type="application/json"]').each(function () {
            const regexp = /"APP_ID":"([0-9]+)"/ig;
            const matcher = $(this).text().match(regexp);
            if (matcher != null && result == null) {
                result = [...$(this).text().matchAll(regexp)];
            }
        })

        return (result) ? result.at(0).at(-1) : null;
    }


    /**
     * updateLoadingBar
     * @description Update loading state
     *
     * @param  {Boolean}  isLoading - Check if loading state
     * @return {void}
     */
    function updateLoadingBar(isLoading) {
        if (isLoading) {
            $('div[id^="mount"] > div > div > div:first').removeClass('x1s85apg');
            $('div[id^="mount"] > div > div > div:first').css('z-index', '20000');
        }
        else {
            $('div[id^="mount"] > div > div > div:first').addClass('x1s85apg');
            $('div[id^="mount"] > div > div > div:first').css('z-index', '');
        }
    }

    /**
     * getStoryProgress
     * @description Get the story progress of the username (post several stories)
     *
     * @param  {String}  username - Get progress of username
     * @return {Object}
     */
    function getStoryProgress(username) {
        let $header = $('body > div section:visible a[href^="/' + (username) + '"] span').filter(function () {
            return $(this).children().length === 0 && $(this).find('svg').length === 0 && $(this).text()?.toLowerCase() === username?.toLowerCase();
        }).parents('div:not([class]):not([style])').filter(function () {
            return $(this).text()?.toLowerCase() !== username?.toLowerCase()
        }).filter(function () {
            return $(this).children().length > 1
        }).first();

        if ($header.length === 0) {
            $header = $('body > div section:visible a[href^="/' + (username) + '"]').filter(function () {
                return $(this).find('img').length > 0
            }).parents('div:not([class]):not([style])').filter(function () {
                return $(this).text()?.toLowerCase() !== username?.toLowerCase()
            }).filter(function () {
                return $(this).children().length > 1
            }).first();
        }

        return $header.children().filter(function () {
            return $(this).height() < 10
        }).first().children();
    }

    /**
     * setDownloadProgress
     * @description Show and set download circle progress
     *
     * @param  {Integer}  now
     * @param  {Integer}  total
     * @return {Void}
     */
    function setDownloadProgress(now, total) {
        if ($('.circle_wrapper').length) {
            $('.circle_wrapper span').text(`${now}/${total}`);

            if (now >= total) {
                $('.circle_wrapper').fadeOut(250, function () {
                    $(this).remove();
                });
            }
        }
        else {
            $('body').append(`<div class="circle_wrapper"><circle></circle><span>${now}/${total}</span></div>`);
        }
    }


    /**
     * IG_createDM
     * @description A dialog showing a list of all media files in the post
     *
     * @param  {Boolean}  hasHidden
     * @param  {Boolean}  hasCheckbox
     * @return {void}
     */
    function IG_createDM(hasHidden, hasCheckbox) {
        let isHidden = (hasHidden) ? "hidden" : "";
        $('body').append('<div class="IG_POPUP_DIG ' + isHidden + '"><div class="IG_POPUP_DIG_BG"></div><div class="IG_POPUP_DIG_MAIN"><div class="IG_POPUP_DIG_TITLE"></div><div class="IG_POPUP_DIG_BODY"></div></div></div>');
        $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_TITLE').append(`<div style="position:relative;min-height:36px;text-align:center;margin-bottom: 7px;"><div style="position:absolute;left:0px;line-height: 18px;"><kbd>Alt</kbd>+<kbd>Q</kbd> [<span data-ih-locale="CLOSE">${_i18n("CLOSE")}</span>]</div><div style="line-height: 18px;">IG Helper v${GM_info.script.version}</div><div id="post_info" style="line-height: 14px;font-size:14px;">Post ID: <span id="article-id"></span></div><div class="IG_POPUP_DIG_BTN">${SVG.CLOSE}</div></div>`);

        if (hasCheckbox) {
            $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_TITLE').append(`<div style="text-align: center;" id="button_group"></div>`);
            $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_TITLE > div#button_group').append(`<button id="batch_download_selected" data-ih-locale="BATCH_DOWNLOAD_SELECTED">${_i18n('BATCH_DOWNLOAD_SELECTED')}</button>`);
            $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_TITLE > div#button_group').append(`<button id="batch_download_direct" data-ih-locale="BATCH_DOWNLOAD_DIRECT">${_i18n('BATCH_DOWNLOAD_DIRECT')}</button>`);
            $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_TITLE').append(`<label class="checkbox"><input value="yes" type="checkbox" /><span data-ih-locale="ALL_CHECK">${_i18n('ALL_CHECK')}</span></label>`);
        }
    }

    /**
     * IG_setDM
     * @description Set a dialog status
     *
     * @param  {Boolean}  hasHidden
     * @return {void}
     */
    function IG_setDM(hasHidden) {
        if ($('.IG_POPUP_DIG').length) {
            if (hasHidden) {
                $('.IG_POPUP_DIG').addClass("hidden");
            }
            else {
                $('.IG_POPUP_DIG').removeClass("hidden");
            }
        }
    }

    /**
     * saveFiles
     * @description Download the specified media URL to the computer
     *
     * @param  {String}  downloadLink
     * @param  {String}  username
     * @param  {String}  sourceType
     * @param  {Integer}  timestamp
     * @param  {String}  filetype
     * @param  {String}  shortcode
     * @return {Promise}
     */
    function saveFiles(downloadLink, username, sourceType, timestamp, filetype, shortcode) {
        return new Promise((resolve) => {
            setTimeout(() => {
                updateLoadingBar(true);
                fetch(downloadLink).then(res => {
                    return res.blob().then(dwel => {
                        updateLoadingBar(false);
                        createSaveFileElement(downloadLink, dwel, username, sourceType, timestamp, filetype, shortcode);

                        resolve(true);
                    });
                });
            }, 50);
        });
    }

    /**
     * @description Trigger download from Blob with filename
     * 
     * @param {Blob} blob
     * @param {string} filename
     */
    function triggerDownload(blob, filename) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        link.remove();
    }

    /**
     * createSaveFileElement
     * @description Download the specified media with link element
     *
     * @param  {String}  downloadLink
     * @param  {Object}  object
     * @param  {String}  username
     * @param  {String}  sourceType
     * @param  {Integer}  timestamp
     * @param  {String}  filetype
     * @param  {String}  shortcode
     * @return {void}
     */
    function createSaveFileElement(downloadLink, object, username, sourceType, timestamp, filetype, shortcode) {
        timestamp = parseInt(timestamp.toString().padEnd(13, '0'));

        if (USER_SETTING.RENAME_PUBLISH_DATE) {
            timestamp = parseInt(timestamp.toString().padEnd(13, '0'));
        }

        const date = new Date(timestamp);

        const original_name = new URL(downloadLink).pathname.split('/').at(-1).split('.').slice(0, -1).join('.');
        const year = date.getFullYear().toString();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hour = date.getHours().toString().padStart(2, '0');
        const minute = date.getMinutes().toString().padStart(2, '0');
        const second = date.getSeconds().toString().padStart(2, '0');

        var filename = state.fileRenameFormat.toUpperCase();
        var format_shortcode = shortcode ?? "";
        var replacements = {
            '%USERNAME%': username,
            '%SOURCE_TYPE%': sourceType,
            '%SHORTCODE%': format_shortcode,
            '%YEAR%': year,
            '%2-YEAR%': year.substr(-2),
            '%MONTH%': month,
            '%DAY%': day,
            '%HOUR%': hour,
            '%MINUTE%': minute,
            '%SECOND%': second,
            '%ORIGINAL_NAME%': original_name,
            '%ORIGINAL_NAME_FIRST%': original_name.split('_').at(0)
        };

        // eslint-disable-next-line no-useless-escape
        filename = filename.replace(/%[\w\-]+%/g, function (str) {
            return replacements[str] || str;
        });

        const originally = username + '_' + original_name + '.' + filetype;
        const downloadName = USER_SETTING.AUTO_RENAME ? filename + '.' + filetype : originally;
        if (USER_SETTING.MODIFY_RESOURCE_EXIF && filetype === 'jpg' && shortcode && sourceType === 'photo' && (object.type === 'image/jpeg' || object.type === 'image/webp')) {
            changeExifData(object, shortcode)
                .then(newBlob => triggerDownload(newBlob, downloadName))
                .catch(err => {
                    console.error('Failed to strip EXIF and/or attach post URL to EXIF.', err);
                    triggerDownload(object, downloadName);
                });
        } else {
            triggerDownload(object, downloadName);
        }
    }

    /**
     * changeExifData
     * @description Strips EXIF metadata and attaches post URLs to the EXIF of downloaded image resources
     *
     * @param  {Object}  blob
     * @param  {string}  shortcode
     * @return {Blob}
     */
    async function changeExifData(blob, shortcode) {
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
        const enc = s => new TextEncoder().encode(s);
        const fourCC = (dv, o) =>
            String.fromCharCode(dv.getUint8(o), dv.getUint8(o + 1), dv.getUint8(o + 2), dv.getUint8(o + 3));

        const head = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
        const isJPEG = head[0] === 0xFF && head[1] === 0xD8;
        const isWEBP = head.length >= 12 &&
            String.fromCharCode(...head.subarray(0, 4)) === 'RIFF' &&
            String.fromCharCode(...head.subarray(8, 12)) === 'WEBP';
        if (!isJPEG && !isWEBP) throw new Error('Not a JPEG or WEBP');

        const urlBytes = enc(`https://www.instagram.com/p/${shortcode}/\0`);
        const exifPrefix = enc('Exif\0\0');
        const tiffHeader = Uint8Array.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00]);
        const entryCount = Uint8Array.from([0x01, 0x00]);
        const entry = concat(
            Uint8Array.from([0x0E, 0x01, 0x02, 0x00]),
            u32le(urlBytes.length),
            u32le(8 + 2 + 12 + 4)
        );
        const tiffBody = concat(tiffHeader, entryCount, entry, u32le(0), urlBytes);

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
     * @description Trigger the link element to start downloading the resource
     *
     * @param  {Object}  element
     * @return {void}
     */
    async function triggerLinkElement(element, isPreview) {
        let date = new Date().getTime();
        let timestamp = Math.floor(date / 1000);
        let username = ($(element).attr('data-username')) ? $(element).attr('data-username') : state.GL_username;

        if (!username && $(element).attr('data-path')) {
            logger('catching owner name from shortcode:', $(element).attr('data-href'));
            username = await getPostOwner($(element).attr('data-path')).catch(err => {
                logger('get username failed, replace with default string, error message:', err.message);
            });

            if (username == null) {
                username = "NONE";
            }
        }

        if (USER_SETTING.RENAME_PUBLISH_DATE && $(element).attr('datetime')) {
            timestamp = parseInt($(element).attr('datetime'));
        }

        if (USER_SETTING.FORCE_RESOURCE_VIA_MEDIA) {
            updateLoadingBar(true);
            let result = await getMediaInfo($(element).attr('media-id'));
            updateLoadingBar(false);

            if (result.status === 'ok') {
                var resource_url = null;
                if (result.items[0].video_versions) {
                    resource_url = result.items[0].video_versions[0].url;
                }
                else {
                    result.items[0].image_versions2.candidates.sort(function (a, b) {
                        let aSTP = new URL(a.url).searchParams.get('stp');
                        let bSTP = new URL(b.url).searchParams.get('stp');

                        if (aSTP && bSTP) {
                            if (aSTP.length > bSTP.length) return 1;
                            if (aSTP.length < bSTP.length) return -1;
                        }
                        else {
                            if (a.width < b.width) return 1;
                            if (a.width > b.width) return -1;
                        }

                        return 0;
                    });

                    resource_url = result.items[0].image_versions2.candidates[0].url;
                }

                if (isPreview) {
                    let urlObj = new URL(resource_url);
                    urlObj.host = 'scontent.cdninstagram.com';

                    openNewTab(urlObj.href);
                }
                else {
                    saveFiles(resource_url, username, $(element).attr('data-name'), timestamp, $(element).attr('data-type'), $(element).attr('data-path'));
                }
            }
            else {
                if (USER_SETTING.USE_BLOB_FETCH_WHEN_MEDIA_RATE_LIMIT) {
                    if (isPreview) {
                        let urlObj = new URL($(element).attr('data-href'));
                        urlObj.host = 'scontent.cdninstagram.com';

                        openNewTab(urlObj.href);
                    }
                    else {
                        saveFiles($(element).attr('data-href'), username, $(element).attr('data-name'), timestamp, $(element).attr('data-type'), $(element).attr('data-path'));
                    }
                }
                else {
                    alert('Fetch failed from Media API. API response message: ' + result.message);
                }
                logger(result);
            }
        }
        else {
            saveFiles($(element).attr('data-href'), username, $(element).attr('data-name'), timestamp, $(element).attr('data-type'), $(element).attr('data-path'));
        }
    }


    /**
     * registerMenuCommand
     * @description register script menu command
     *
     * @return {void}
     */
    function registerMenuCommand() {
        for (let id of state.registerMenuIds) {
            logger('GM_unregisterMenuCommand', id);
            GM_unregisterMenuCommand(id);
        }

        state.registerMenuIds.push(GM_registerMenuCommand(_i18n('SETTING'), () => {
            showSetting();
        }, {
            accessKey: "w"
        }));

        state.registerMenuIds.push(GM_registerMenuCommand(_i18n('DONATE'), () => {
            GM_openInTab("https://ko-fi.com/snkoarashi", { active: true });
        }, {
            accessKey: "d"
        }));

        state.registerMenuIds.push(GM_registerMenuCommand(_i18n('DEBUG'), () => {
            showDebugDOM();
        }, {
            accessKey: "z"
        }));

        state.registerMenuIds.push(GM_registerMenuCommand(_i18n('FEEDBACK'), () => {
            showFeedbackDOM();
        }, {
            accessKey: "f"
        }));

        state.registerMenuIds.push(GM_registerMenuCommand(_i18n('CHECK_UPDATE_MENU'), () => {
            callNotification();
        }, {
            accessKey: "c"
        }));

        state.registerMenuIds.push(GM_registerMenuCommand(_i18n('RELOAD_SCRIPT'), () => {
            reloadScript();
        }, {
            accessKey: "r"
        }));
    }

    /**
     * checkingScriptUpdate
     * @description Check if there is a new version of the script and push notification
     *
     * @param  {Integer}  interval
     * @return {void}
     */
    function checkingScriptUpdate(interval) {
        if (!USER_SETTING.CHECK_UPDATE) return;

        const check_timestamp = GM_getValue('G_CHECK_TIMESTAMP') ?? new Date().getTime();
        const now_time = new Date().getTime();

        if (now_time > (parseInt(check_timestamp) + (interval * 1000))) {
            GM_setValue('G_CHECK_TIMESTAMP', new Date().getTime());
            callNotification();
        }
    }

    /**
     * callNotification
     * @description call desktop notification by browser
     *
     * @return {void}
     */
    function callNotification() {
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
                            image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/64px-Instagram_icon.png",
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
     * showSetting
     * @description Show script settings window
     *
     * @return {void}
     */
    function showSetting() {
        $('.IG_POPUP_DIG').remove();
        IG_createDM();
        $('.IG_POPUP_DIG #post_info').text('Preference Settings');

        $('.IG_POPUP_DIG .IG_POPUP_DIG_TITLE > div').append('<select id="langSelect"></select><div style="font-size: 12px;">Some texts are machine-translated and may be inaccurate; translation contributions are welcome on GitHub.</div>');

        for (let o in locale_manifest) {
            $('.IG_POPUP_DIG .IG_POPUP_DIG_TITLE > div #langSelect').append(`<option value="${o}" ${(state.lang == o) ? 'selected' : ''}>${locale_manifest[o]}</option>`);
        }

        for (let name in USER_SETTING) {
            $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY').append(`<label class="globalSettings${(CHILD_NODES.includes(name)) ? ' child' : ''}" title="${_i18n(name + '_INTRO')}" data-ih-locale-title="${name + '_INTRO'}"><span data-ih-locale="${name}">${_i18n(name)}</span> <input id="${name}" value="box" type="checkbox" ${(USER_SETTING[name] === true) ? 'checked' : ''}><div class="chbtn"><div class="rounds"></div></div></label>`);

            if (name === 'MODIFY_VIDEO_VOLUME') {
                $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY input[id="' + name + '"]').parent('label').on('contextmenu', function (e) {
                    e.preventDefault();
                    if ($(this).find('#tempWrapper').length === 0) {
                        $(this).append('<div id="tempWrapper"></div>');
                        $(this).children('#tempWrapper').append('<input value="' + state.videoVolume + '" type="range" min="0" max="1" step="0.05" />');
                        $(this).children('#tempWrapper').append('<input value="' + state.videoVolume + '" step="0.05" type="number" />');
                        $(this).children('#tempWrapper').append(`<div class="IG_POPUP_DIG_BTN">${SVG.CLOSE}</div>`);
                    }
                });
            }

            if (name === 'AUTO_RENAME') {
                $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY input[id="' + name + '"]').parent('label').on('contextmenu', function (e) {
                    e.preventDefault();
                    if ($(this).find('#tempWrapper').length === 0) {
                        $(this).append('<div id="tempWrapper"></div>');

                        $(this).children('#tempWrapper').append('<input id="date_format" value="' + state.fileRenameFormat + '" />');
                        $(this).children('#tempWrapper').append(`<div class="IG_POPUP_DIG_BTN">${SVG.CLOSE}</div>`);
                    }
                });
            }
        }
    }

    /**
     * showDebugDOM
     * @description Show full DOM tree
     *
     * @return {void}
     */
    function showDebugDOM() {
        $('.IG_POPUP_DIG').remove();
        IG_createDM();
        $('.IG_POPUP_DIG #post_info').text('IG Debug DOM Tree');

        $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY').append(`<textarea style="font-family: monospace;width:100%;box-sizing: border-box;height:300px;background: transparent;" readonly></textarea>`);
        $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY').append(`<span style="display:block;text-align:center;">`);
        $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY span').append(`<button style="margin: 3px;" class="IG_DISPLAY_DOM_TREE"><a>${_i18n('SHOW_DOM_TREE')}</a></button>`);
        $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY span').append(`<button style="margin: 3px;" class="IG_SELECT_DOM_TREE"><a>${_i18n('SELECT_AND_COPY')}</a></button>`);
        $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY span').append(`<button style="margin: 3px;" class="IG_DOWNLOAD_DOM_TREE"><a>${_i18n('DOWNLOAD_DOM_TREE')}</a></button><br/>`);
        $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY span').append(`<button style="margin: 3px;" class="IG_REPORT_GITHUB"><a href="https://github.com/SN-Koarashi/ig-helper/issues" target="_blank">${_i18n('REPORT_GITHUB')}</a></button>`);
        $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY span').append(`<button style="margin: 3px;" class="IG_REPORT_DISCORD"><a href="https://discord.gg/q3KT4hdq8x" target="_blank">${_i18n('REPORT_DISCORD')}</a></button>`);
    }

    /**
     * showFeedbackDOM
     * @description Show feedback options
     *
     * @return {void}
     */
    function showFeedbackDOM() {
        $('.IG_POPUP_DIG').remove();
        IG_createDM();
        $('.IG_POPUP_DIG #post_info').text('Feedback Options');

        $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY').append(`<span style="display:block;text-align:center;">`);
        $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY span').append(`<button style="margin: 3px;" class="IG_REPORT_FORK"><a href="https://greasyfork.org/en/scripts/404535-ig-helper/feedback" target="_blank">${_i18n('REPORT_FORK')}</a></button>`);
        $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY span').append(`<button style="margin: 3px;" class="IG_REPORT_GITHUB"><a href="https://github.com/SN-Koarashi/ig-helper/issues" target="_blank">${_i18n('REPORT_GITHUB')}</a></button>`);
        $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY span').append(`<button style="margin: 3px;" class="IG_REPORT_DISCORD"><a href="https://discord.gg/q3KT4hdq8x" target="_blank">${_i18n('REPORT_DISCORD')}</a></button>`);
    }

    /**
     * openNewTab
     * @description Open url in new tab
     *
     * @param  {String}  link
     * @return {void}
     */
    function openNewTab(link) {
        var a = document.createElement('a');
        a.href = link;
        a.target = '_blank';

        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    /**
     * reloadScript
     * @description Re-register main timer
     *
     * @return {void}
     */
    function reloadScript() {
        clearInterval(state.GL_repeat);

        // unregister event in post element
        state.GL_registerEventList.forEach(item => {
            item.trigger.forEach(bindElement => {
                $(item.element).off('click', bindElement);
            });
        });
        state.GL_registerEventList = [];

        $('.button_wrapper').remove();
        $('.IG_DWPROFILE, .IG_DWPROFILE, .IG_DWSTORY, .IG_DWSTORY_ALL, .IG_DWSTORY_THUMBNAIL, .IG_DWNEWTAB, .IG_DWHISTORY, .IG_DWHISTORY_ALL, .IG_DWHINEWTAB, .IG_DWHISTORY_THUMBNAIL, .IG_REELS, .IG_REELS_NEWTAB, .IG_REELS_THUMBNAIL').remove();
        $('[data-snig]').removeAttr('data-snig');

        state.pageLoaded = false;
        state.firstStarted = false;
        state.currentURL = location.href;
        state.GL_observer.disconnect();

        logger('main timer re-register completed');
    }

    /**
     * logger
     * @description event record
     *
     * @return {void}
     */
    function logger(...messages) {
        var dd = new Date();
        state.GL_logger.push({
            time: dd.getTime(),
            content: [...messages]
        });

        if (state.GL_logger.length > 1000) {
            state.GL_logger = [{
                time: dd.getTime(),
                content: ['logger sliced']
            }, ...state.GL_logger.slice(-999)];
        }

        console.log(`[${dd.toISOString()}]`, ...messages);
    }

    /**
     * initSettings
     * @description Initialize preferences
     *
     * @return {void}
     */
    function initSettings() {
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
    function toggleVolumeSilder($videos, $buttonParent, loggerType, customClass = "") {
        if ($buttonParent.find('div.volume_slider').length === 0) {
            $buttonParent.append(`<div class="volume_slider ${customClass}" />`);
            $buttonParent.find('div.volume_slider').append(`<div><input type="range" max="1" min="0" step="0.05" value="${state.videoVolume}" /></div>`);
            $buttonParent.find('div.volume_slider input').attr('style', `--ig-track-progress: ${(state.videoVolume * 100) + '%'}`);
            $buttonParent.find('div.volume_slider input').on('input', function () {
                var percent = ($(this).val() * 100) + '%';

                state.videoVolume = $(this).val();
                GM_setValue('G_VIDEO_VOLUME', $(this).val());

                $(this).attr('style', `--ig-track-progress: ${percent}`);

                $videos.each(function () {
                    logger(`(${loggerType})`, 'video volume changed #slider');
                    this.volume = state.videoVolume;
                });
            });

            $buttonParent.find('div.volume_slider input').on('mouseenter', function () {
                var percent = (state.videoVolume * 100) + '%';
                $(this).attr('style', `--ig-track-progress: ${percent}`);
                $(this).val(state.videoVolume);


                $videos.each(function () {
                    logger(`(${loggerType})`, 'video volume changed #slider');
                    this.volume = state.videoVolume;
                });
            });

            $buttonParent.find('div.volume_slider').on('click', function (e) {
                e.stopPropagation();
                e.preventDefault();
            });
        }
        else {
            $buttonParent.find('div.volume_slider').remove();
        }
    }

    var detectMovingViewerTimer = null;

    function openImageViewer(imageUrl) {
        removeImageViewer();

        $('body').append(
            `<div id="imageViewer">
    	<div id="iv_header">
    		<div style="flex:1;">Image Viewer</div>
    		<div style="display: flex;filter: invert(1);gap: 8px;margin-right: 8px;">
                <div id="rotate_left" style="cursor: pointer;">${SVG.TURN_DEG}</div>
                <div id="rotate_right" style="transform: scaleX(-1);cursor: pointer;">${SVG.TURN_DEG}</div>
            </div>
    		<div id="iv_close">${SVG.CLOSE}</div>
    	</div>
        <section>
            <div id="iv_transform">
                <div id="iv_rotate">
                    <img id="iv_image" src="" />
                </div>
            </div>
        </section>
    </div>`);

        const $container = $('#imageViewer');
        const $section = $('#imageViewer > section');
        const $wrapT = $('#iv_transform');
        const $wrapR = $('#iv_rotate');
        const $header = $('#iv_header');
        const $closeIcon = $('#iv_close');
        const $image = $('#iv_image');
        const $rotateLeft = $('#rotate_left');
        const $rotateRight = $('#rotate_right');

        $image.attr('src', imageUrl);
        $container.css('display', 'flex');
        $wrapT.css('transform-origin', '0 0');
        $wrapT.css('transition', `transform 0.15s ease`);
        $wrapR.css('transform-origin', 'center');
        $wrapR.css('transition', `transform 0.15s ease`);
        $wrapT.css('will-change', 'transform');
        $wrapR.css('will-change', 'transform');

        let rotate = 0;
        let scale = 1;
        let posX = 0, posY = 0;
        let isDragging = false;
        let isMovingPhoto = false;
        let startX, startY;
        var previousPosition = {
            x: 0,
            y: 0
        };

        detectMovingViewerTimer = setInterval(() => {
            const currentPosition = {
                x: posX,
                y: posY
            };
            if (currentPosition.x !== previousPosition.x || currentPosition.y !== previousPosition.y) {
                isMovingPhoto = true;
            } else {
                isMovingPhoto = false;
            }
            previousPosition = currentPosition;
        }, 100);


        $image.on('load', () => {
            posX = 0;
            posY = 0;
            updateImageStyle();
        });

        $image.on('dragstart drop', (e) => {
            e.preventDefault();
        });

        $image.on('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (!isMovingPhoto) {
                if (scale <= 1) {
                    makeZoomAction(e, Math.min(Math.max(1, scale + 1.25), 5));
                }
                else {
                    scale = 1;
                    posX = 0;
                    posY = 0;
                }

                updateImageStyle();
            }
        });

        $section.on('wheel', (e) => {
            e.preventDefault();
            makeZoomAction(e);
        });

        $container.on('wheel', (e) => {
            e.preventDefault();
        });

        $image.on('mousedown', (e) => {
            if (scale == 1) return;

            isDragging = true;

            startX = e.pageX - posX;
            startY = e.pageY - posY;
            $image.css('cursor', 'grabbing');
        });

        $image.on('mouseup', () => {
            if (scale == 1) return;

            isDragging = false;
            $image.css('cursor', 'grab');
        });

        $rotateLeft.on('click', function () {
            rotate -= 90;
            updateImageStyle();
        });

        $rotateRight.on('click', function () {
            rotate += 90;
            updateImageStyle();
        });

        $(document).on('mousemove.igHelper', (e) => {
            if (!isDragging) return;
            e.preventDefault();

            posX = e.pageX - startX;
            posY = e.pageY - startY;

            updateImageStyle();
        });

        $container.on('click', () => {
            removeImageViewer();
        });

        $closeIcon.on('click', () => {
            removeImageViewer();
        });

        $header.on('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });

        function updateImageStyle() {
            $wrapT.css('transition', isMovingPhoto ? "none" : `transform 0.15s ease`);
            $wrapT.css('transform', `translate(${posX}px, ${posY}px) scale(${scale})`);
            $wrapR.css('transform', `rotate(${rotate}deg)`);

            if (scale == 1) {
                $image.css('cursor', 'zoom-in');
            }
            else {
                $image.css('cursor', 'grabbing');
            }
        }


        function makeZoomAction(e, newScale) {
            e.preventDefault();

            let prevScale = scale;

            // newScale should be null when passing by wheel event
            if (newScale == null) {
                let factor = 0.1;
                let delta = e.originalEvent.deltaY < 0 ? 1 : -1;
                scale = Math.min(5, Math.max(1, scale + delta * factor * scale));
            }
            else {
                scale = newScale;
            }


            let rect = $section[0].getBoundingClientRect();
            let mx = e.clientX - rect.left;
            let my = e.clientY - rect.top;

            let zoomTargetX = (mx - posX) / prevScale;
            let zoomTargetY = (my - posY) / prevScale;

            posX = -zoomTargetX * scale + mx;
            posY = -zoomTargetY * scale + my;

            updateImageStyle();
        }
    }

    function removeImageViewer() {
        clearInterval(detectMovingViewerTimer);
        $('#imageViewer').remove();
        $(document).off('mousemove.igHelper');
    }

    /**
     * translateText
     * @description i18n translation text
     *
     * @return {void}
     */
    function translateText() {
        var eLocale = {
            "en-US": {
                "NOTICE_UPDATE_TITLE": "Wololo! New version released.",
                "NOTICE_UPDATE_CONTENT": "IG-Helper has released a new version, click here to update.",
                "CHECK_UPDATE": "Checking for Script Updates",
                "CHECK_UPDATE_MENU": "Checking for Updates",
                "CHECK_UPDATE_INTRO": "Check for updates when the script is triggered (check every 300 seconds).\nUpdate notifications will be sent as desktop notifications through the browser.",
                "RELOAD_SCRIPT": "Reload Script",
                "DONATE": "Donate",
                "FEEDBACK": "Feedback",
                "IMAGE_VIEWER": "Open Image In Viewer",
                "NEW_TAB": "Open in New Tab",
                "SHOW_DOM_TREE": "Show DOM Tree",
                "SELECT_AND_COPY": "Select All and Copy from the Input Box",
                "DOWNLOAD_DOM_TREE": "Download DOM Tree as a Text File",
                "REPORT_GITHUB": "Report an Issue on GitHub",
                "REPORT_DISCORD": "Report an Issue on Discord Support Server",
                "REPORT_FORK": "Report an Issue on Greasy Fork",
                "DEBUG": "Debug Window",
                "CLOSE": "Close",
                "ALL_CHECK": "Select All",
                "BATCH_DOWNLOAD_SELECTED": "Download Selected Resources",
                "BATCH_DOWNLOAD_DIRECT": "Download All Resources",
                "IMG": "Image",
                "VID": "Video",
                "DW": "Download",
                "DW_ALL": "Download All Resources",
                "THUMBNAIL_INTRO": "Download Video Thumbnail",
                "LOAD_BLOB_ONE": "Loading Blob Media...",
                "LOAD_BLOB_MULTIPLE": "Loading Blob Media and Others...",
                "LOAD_BLOB_RELOAD": "Detecting Blob Media, reloading...",
                "NO_CHECK_RESOURCE": "You need to select a resource to download.",
                "NO_VID_URL": "Cannot find video URL.",
                "SETTING": "Settings",
                "AUTO_RENAME": "Automatically Rename Files (Right-Click to Set)",
                "RENAME_SHORTCODE": "Rename the File and Include Shortcode",
                "RENAME_PUBLISH_DATE": "Set Renamed File Timestamp to Resource Publish Date",
                "RENAME_LOCATE_DATE": "Modify Renamed File Timestamp Date Format (Right-Click to Set)",
                "DISABLE_VIDEO_LOOPING": "Disable Video Auto-looping",
                "HTML5_VIDEO_CONTROL": "Display HTML5 Video Controller",
                "REDIRECT_CLICK_USER_STORY_PICTURE": "Redirect When Clicking on User's Story Picture",
                "FORCE_FETCH_ALL_RESOURCES": "Force Fetch All Resources in the Post",
                "DIRECT_DOWNLOAD_VISIBLE_RESOURCE": "Directly Download the Visible Resources in the Post",
                "DIRECT_DOWNLOAD_ALL": "Directly Download All Resources in the Post",
                "MODIFY_VIDEO_VOLUME": "Modify Video Volume (Right-Click to Set)",
                "MODIFY_RESOURCE_EXIF": "Modify Resource EXIF ​​Properties",
                "SCROLL_BUTTON": "Enable Scroll Buttons for Reels Page",
                "FORCE_RESOURCE_VIA_MEDIA": "Force Fetch Resource via Media API",
                "USE_BLOB_FETCH_WHEN_MEDIA_RATE_LIMIT": "Use Alternative Methods to Download When the Media API is Not Accessible",
                "NEW_TAB_ALWAYS_FORCE_MEDIA_IN_POST": "Always Use Media API for 'Open in New Tab' in Posts",
                "AUTO_RENAME_INTRO": "Auto rename file to custom format:\nCustom Format List: \n%USERNAME% - Username\n%SOURCE_TYPE% - Download Source\n%SHORTCODE% - Post Shortcode\n%YEAR% - Year when downloaded/published\n%2-YEAR% - Year (last two digits) when downloaded/published\n%MONTH% - Month when downloaded/published\n%DAY% - Day when downloaded/published\n%HOUR% - Hour when downloaded/published\n%MINUTE% - Minute when downloaded/published\n%SECOND% - Second when downloaded/published\n%ORIGINAL_NAME% - Original name of downloaded file\n%ORIGINAL_NAME_FIRST% - Original name of downloaded file (first part of name)\n\nIf set to false, the file name will remain unchanged.\nExample: instagram_321565527_679025940443063_4318007696887450953_n.jpg",
                "RENAME_SHORTCODE_INTRO": "Auto rename file to the following format:\nUSERNAME-TYPE-SHORTCODE-TIMESTAMP.FILETYPE\nExample: instagram-photo-CwkxyiVynpW-1670350000.jpg\n\nThis will ONLY work if [Automatically Rename Files] is set to TRUE.",
                "RENAME_PUBLISH_DATE_INTRO": "Sets the timestamp in the file rename format to the resource publish date (browser time zone).\n\nThis feature only works when [Automatically Rename Files] is set to TRUE.",
                "RENAME_LOCATE_DATE_INTRO": "Modify the renamed file timestamp date format to the browser's local time, and format it to your preferred regional date format.\n\nThis feature only works when [Automatically Rename Files] is set to TRUE.",
                "DISABLE_VIDEO_LOOPING_INTRO": "Disable video auto-looping in Reels and posts.",
                "HTML5_VIDEO_CONTROL_INTRO": "Display the HTML5 video controller in video resource.\n\nThis will hide the custom video volume slider and replace it with the HTML5 controller. The HTML5 controller can be hidden by right-clicking on the video to reveal the original details.",
                "REDIRECT_CLICK_USER_STORY_PICTURE_INTRO": "Redirect to a user's profile page when right-clicking on their avatar in the story area on the homepage.\nIf you use the middle mouse button to click, it will open in a new tab.",
                "FORCE_FETCH_ALL_RESOURCES_INTRO": "Force fetching of all resources (photos and videos) in a post via the Instagram API to remove the limit of three resources per post.",
                "DIRECT_DOWNLOAD_VISIBLE_RESOURCE_INTRO": "Directly download the current resources available in the post.",
                "DIRECT_DOWNLOAD_ALL_INTRO": "When you click the download button, all resources in the post will be forcibly fetched and downloaded.",
                "MODIFY_VIDEO_VOLUME_INTRO": "Modify the video playback volume in Reels and posts (right-click to open the volume setting slider).",
                "SCROLL_BUTTON_INTRO": "Enable scroll buttons for the lower right corner of the Reels page.",
                "FORCE_RESOURCE_VIA_MEDIA_INTRO": "The Media API will try to get the highest quality photo or video possible, but it may take longer to load.",
                "USE_BLOB_FETCH_WHEN_MEDIA_RATE_LIMIT_INTRO": "When the Media API reaches its rate limit or cannot be used for other reasons, the Forced Fetch API will be used to download resources (the resource quality may be slightly lower).",
                "NEW_TAB_ALWAYS_FORCE_MEDIA_IN_POST_INTRO": "The [Open in New Tab] button in posts will always use the Media API to obtain high-resolution resources.",
                "SKIP_VIEW_STORY_CONFIRM": "Skip the Confirmation Page for Viewing a Story/Highlight",
                "SKIP_VIEW_STORY_CONFIRM_INTRO": "Automatically skip when confirmation page is shown in story or highlight.",
                "MODIFY_RESOURCE_EXIF_INTRO": "Modify the EXIF ​​properties of the image resource to place the post link in it."
            }
        };

        var resultUnsorted = Object.assign({}, eLocale, state.locale);
        var resultSorted = Object.keys(resultUnsorted).sort().reduce(
            (obj, key) => {
                obj[key] = resultUnsorted[key];
                return obj;
            }, {}
        );

        return resultSorted;
    }

    /**
     * getTranslationText
     * @description i18n translation text
     *
     * @param  {String}  lang
     * @return {Object}
     */
    async function getTranslationText(lang) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: `https://raw.githubusercontent.com/SN-Koarashi/ig-helper/master/locale/translations/${lang}.json`,
                onload: function (response) {
                    try {
                        let obj = JSON.parse(response.response);
                        resolve(obj);
                    }
                    catch (err) {
                        reject(err);
                    }
                },
                onerror: function (err) {
                    logger('getTranslationText()', 'reject', err);
                    reject(err);
                }
            });
        });
    }

    /**
     * _i18n
     * @description Perform i18n translation
     *
     * @param  {String}  text
     * @return {void}
     */
    function _i18n(text) {
        const translate = translateText();

        if (translate[state.lang] != undefined && translate[state.lang][text] != undefined) {
            return translate[state.lang][text];
        }
        else {
            return translate["en-US"][text];
        }
    }

    /**
     * repaintingTranslations
     * @description Perform i18n translation
     *
     * @return {void}
     */
    function repaintingTranslations() {
        $('[data-ih-locale]').each(function () {
            $(this).text(_i18n($(this).attr('data-ih-locale')));
        });
        $('[data-ih-locale-title]').each(function () {
            $(this).attr('title', _i18n($(this).attr('data-ih-locale-title')));
        });
    }

    /* register all events */

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
            $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY textarea').text("Logger:\n" + logger + "\n-----\n\nLocation: " + location.pathname + "\nDOM Tree with div#mount:\n" + text.innerHTML);
        }

        $('body').on('click', '.IG_POPUP_DIG .IG_POPUP_DIG_BODY .IG_DISPLAY_DOM_TREE', function () {
            setDOMTreeContent();
        });

        $('body').on('click', '.IG_POPUP_DIG .IG_POPUP_DIG_BODY .IG_SELECT_DOM_TREE', function () {
            $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY textarea').select();
            document.execCommand('copy');
        });

        $('body').on('click', '.IG_POPUP_DIG .IG_POPUP_DIG_BODY .IG_DOWNLOAD_DOM_TREE', function () {
            if ($('.IG_POPUP_DIG .IG_POPUP_DIG_BODY textarea').text().length === 0) {
                setDOMTreeContent();
            }

            var text = $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY textarea').text();
            var a = document.createElement("a");
            var file = new Blob([text], { type: "text/plain" });
            a.href = URL.createObjectURL(file);
            a.download = "DOMTree-" + new Date().getTime() + ".txt";

            document.body.appendChild(a);
            a.click();
            a.remove();
        });

        // Close the download dialog if user click the close icon
        $('body').on('click', '.IG_POPUP_DIG_BTN, .IG_POPUP_DIG_BG', function () {
            if ($(this).parent('#tempWrapper').length > 0) {
                $(this).parent('#tempWrapper').fadeOut(250, function () {
                    $(this).remove();
                });
            }
            else {
                $('.IG_POPUP_DIG').remove();
            }
        });

        $(window).on('keydown', function (e) {
            // Hot key [Alt+Q] to close the download dialog
            if (e.which == '81' && e.altKey) {
                $('.IG_POPUP_DIG').remove();
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

        $('body').on('change', '.IG_POPUP_DIG input', function () {
            var name = $(this).attr('id');

            if (name && USER_SETTING[name] !== undefined) {
                let isChecked = $(this).prop('checked');
                GM_setValue(name, isChecked);
                USER_SETTING[name] = isChecked;

                console.log('user settings', name, isChecked);
            }
        });

        $('body').on('click', '.IG_POPUP_DIG .globalSettings', function (e) {
            if ($(this).find('#tempWrapper').length > 0) {
                e.preventDefault();
            }
        });

        $('body').on('change', '.IG_POPUP_DIG #tempWrapper input:not(#date_format)', function () {
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

        $('body').on('input', '.IG_POPUP_DIG #tempWrapper input:not(#date_format)', function () {
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

        $('body').on('input', '.IG_POPUP_DIG #tempWrapper input#date_format', function () {
            GM_setValue('G_RENAME_FORMAT', $(this).val());
            state.fileRenameFormat = $(this).val();
        });

        $('body').on('click', 'a[data-needed="direct"]', function (e) {
            e.preventDefault();
            triggerLinkElement(this);
        });

        $('body').on('click', '.IG_POPUP_DIG_BODY .newTab', function () {
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

        $('body').on('click', '.IG_POPUP_DIG_BODY .videoThumbnail', function () {
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
        $('body').on('mousedown', 'button[role="menuitem"], div[role="menuitem"], ul > li[tabindex="-1"] > div[role="button"]', function (e) {
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

        $('body').on('change', '.IG_POPUP_DIG_TITLE .checkbox', function () {
            var isChecked = $(this).find('input').prop('checked');
            $('.IG_POPUP_DIG_BODY .inner_box').each(function () {
                $(this).prop('checked', isChecked);
            });
        });

        $('body').on('change', '.IG_POPUP_DIG_BODY .inner_box', function () {
            var checked = $('.IG_POPUP_DIG_BODY .inner_box:checked').length;
            var total = $('.IG_POPUP_DIG_BODY .inner_box').length;


            $('.IG_POPUP_DIG_TITLE .checkbox').find('input').prop('checked', checked == total);
        });

        $('body').on('click', '.IG_POPUP_DIG_TITLE #batch_download_selected', function () {
            let index = 0;
            $('.IG_POPUP_DIG_BODY a[data-needed="direct"]').each(function () {
                if ($(this).prev().children('input').prop('checked')) {
                    $(this).trigger("click");
                    index++;
                }
            });

            if (index == 0) {
                alert(_i18n('NO_CHECK_RESOURCE'));
            }
        });

        $('body').on('change', '.IG_POPUP_DIG_TITLE #langSelect', function () {
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

        $('body').on('click', '.IG_POPUP_DIG_TITLE #batch_download_direct', function () {
            $('.IG_POPUP_DIG_BODY a[data-needed="direct"]').each(function () {
                $(this).trigger("click");
            });
        });

        const element_observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        const $videos = $(node).find('video');

                        if (location.pathname.startsWith("/stories/highlights/")) {
                            if (
                                $(node).attr("data-ih-locale-title") == null &&
                                $(node).attr("data-visualcompletion") == null &&
                                node.tagName === "DIV"
                            ) {
                                // replace something times ago format to publish time when switch highlight
                                var $time = $(node).find("time[datetime]");
                                let publishTitle = $time?.attr('title');
                                if (publishTitle != null) {
                                    $time.text(publishTitle);
                                }
                            }
                        }

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

        element_observer.observe($('div[id^="mount"]')[0], {
            childList: true,
            subtree: true,
        });
    });
})(jQuery);
