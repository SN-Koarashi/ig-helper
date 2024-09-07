// ==UserScript==
// @name               IG Helper
// @name:zh-TW         IG小精靈
// @name:zh-CN         IG小助手
// @name:ja            IG助手
// @name:ko            IG조수
// @namespace          https://github.snkms.com/
// @version            2.29.10
// @description        Downloading is possible for both photos and videos from posts, as well as for stories, reels or profile picture.
// @description:zh-TW  一鍵下載對方 Instagram 貼文中的相片、影片甚至是他們的限時動態、連續短片及大頭貼圖片！
// @description:zh-CN  一键下载对方 Instagram 帖子中的相片、视频甚至是他们的快拍、Reels及头像图片！
// @description:ja     投稿の写真と動画だけでなく、ストーリー、リール、プロフィール写真もダウンロードできます。
// @description:ko     게시물의 사진과 동영상뿐만 아니라 스토리, 릴 또는 프로필 사진도 다운로드할 수 있습니다.
// @description:ro     Descărcarea este posibilă atât pentru fotografiile și videoclipurile din postări, cât și pentru storyuri, reels sau poze de profil.
// @author             SN-Koarashi (5026)
// @match              https://*.instagram.com/*
// @grant              GM_addStyle
// @grant              GM_setValue
// @grant              GM_getValue
// @grant              GM_xmlhttpRequest
// @grant              GM_registerMenuCommand
// @grant              GM_getResourceText
// @grant              GM_openInTab
// @connect            i.instagram.com
// @require            https://code.jquery.com/jquery-3.7.1.min.js#sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo=
// @resource           INTERNAL_CSS https://raw.githubusercontent.com/SN-Koarashi/ig-helper/master/style.css
// @resource           LOCATE_DATE_LIST_TEXT https://raw.githubusercontent.com/SN-Koarashi/ig-helper/master/date_locate.json
// @resource           LOCALE_TEXT https://raw.githubusercontent.com/SN-Koarashi/ig-helper/master/locale.json
// @supportURL         https://github.com/SN-Koarashi/ig-helper/
// @contributionURL    https://ko-fi.com/snkoarashi
// @icon               https://www.google.com/s2/favicons?domain=www.instagram.com
// @compatible         firefox >= 100
// @compatible         chrome >= 100
// @compatible         edge >= 100
// @license            GPL-3.0-only
// @run-at             document-idle
// @downloadURL https://update.greasyfork.org/scripts/404535/IG%20Helper.user.js
// @updateURL https://update.greasyfork.org/scripts/404535/IG%20Helper.meta.js
// ==/UserScript==

(function($) {
    'use strict';

    /******** USER SETTINGS ********/
    // !!! DO NOT CHANGE THIS AREA !!!
    // PLEASE CHANGE SETTING WITH MENU
    const USER_SETTING = {
        'AUTO_RENAME': true,
        'RENAME_PUBLISH_DATE': true,
        'DISABLE_VIDEO_LOOPING': false,
        'HTML5_VIDEO_CONTROL': false,
        'REDIRECT_CLICK_USER_STORY_PICTURE': false,
        'FORCE_FETCH_ALL_RESOURCES': false,
        'DIRECT_DOWNLOAD_VISIBLE_RESOURCE': false,
        'DIRECT_DOWNLOAD_ALL': false,
        'MODIFY_VIDEO_VOLUME': false,
        'SCROLL_BUTTON': true,
        'FORCE_RESOURCE_VIA_MEDIA': false,
        'USE_BLOB_FETCH_WHEN_MEDIA_RATE_LITMIT': false,
        'NEW_TAB_ALWAYS_FORCE_MEDIA_IN_POST': false
    };
    const CHILD_NODES = ['RENAME_PUBLISH_DATE', 'USE_BLOB_FETCH_WHEN_MEDIA_RATE_LITMIT', 'NEW_TAB_ALWAYS_FORCE_MEDIA_IN_POST'];
    const LOCATE_DATE_LIST = JSON.parse(GM_getResourceText('LOCATE_DATE_LIST_TEXT'));
    var VIDEO_VOLUME = (GM_getValue('G_VIDEO_VOLUME'))?GM_getValue('G_VIDEO_VOLUME'):1;
    var LOCATE_DATE_FORMAT = (GM_getValue('G_LOCATE_DATE_FORMAT'))? GM_getValue('G_LOCATE_DATE_FORMAT') : GM_getValue('lang') || navigator.language || navigator.userLanguage;
    var TEMP_FETCH_RATE_LITMIT = false;
    var RENAME_FORMAT = (GM_getValue('G_RENAME_FORMAT'))? GM_getValue('G_RENAME_FORMAT') : '%USERNAME%-%SOURCE_TYPE%-%SHORTCODE%-%YEAR%%MONTH%%DAY%_%HOUR%%MINUTE%%SECOND%_%ORIGINAL_NAME_FIRST%';
    /*******************************/

    // Icon download by https://www.flaticon.com/authors/pixel-perfect
    const SVG = {
        DOWNLOAD: '<svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Capa_1" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"><g><g><path d="M382.56,233.376C379.968,227.648,374.272,224,368,224h-64V16c0-8.832-7.168-16-16-16h-64c-8.832,0-16,7.168-16,16v208h-64    c-6.272,0-11.968,3.68-14.56,9.376c-2.624,5.728-1.6,12.416,2.528,17.152l112,128c3.04,3.488,7.424,5.472,12.032,5.472    c4.608,0,8.992-2.016,12.032-5.472l112-128C384.192,245.824,385.152,239.104,382.56,233.376z"/></g></g><g><g><path d="M432,352v96H80v-96H16v128c0,17.696,14.336,32,32,32h416c17.696,0,32-14.304,32-32V352H432z"/></g></g>',
        NEW_TAB: '<svg width="16" height="16" viewBox="3 3 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M20 14a1 1 0 0 0-1 1v3.077c0 .459-.022.57-.082.684a.363.363 0 0 1-.157.157c-.113.06-.225.082-.684.082H5.923c-.459 0-.571-.022-.684-.082a.363.363 0 0 1-.157-.157c-.06-.113-.082-.225-.082-.684L4.999 5.5a.5.5 0 0 1 .5-.5l3.5.005a1 1 0 1 0 .002-2L5.501 3a2.5 2.5 0 0 0-2.502 2.5v12.577c0 .76.083 1.185.32 1.627.223.419.558.753.977.977.442.237.866.319 1.627.319h12.154c.76 0 1.185-.082 1.627-.319.419-.224.753-.558.977-.977.237-.442.319-.866.319-1.627V15a1 1 0 0 0-1-1zm-2-9.055v-.291l-.39.09A10 10 0 0 1 15.36 5H14a1 1 0 1 1 0-2l5.5.003a1.5 1.5 0 0 1 1.5 1.5V10a1 1 0 1 1-2 0V8.639c0-.757.086-1.511.256-2.249l.09-.39h-.295a10 10 0 0 1-1.411 1.775l-5.933 5.932a1 1 0 0 1-1.414-1.414l5.944-5.944A10 10 0 0 1 18 4.945z" fill="currentColor"/></svg>',
        THUMBNAIL: '<svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="512" viewBox="0 0 24 24" width="512"><circle cx="8.25" cy="5.25" r=".5"/><path d="m8.25 6.5c-.689 0-1.25-.561-1.25-1.25s.561-1.25 1.25-1.25 1.25.561 1.25 1.25-.561 1.25-1.25 1.25zm0-1.5c-.138 0-.25.112-.25.25 0 .275.5.275.5 0 0-.138-.112-.25-.25-.25z"/><path d="m7.25 11.25 2-2.5 2.25 1.5 2.25-3.5 3 4.5z"/><path d="m16.75 12h-9.5c-.288 0-.551-.165-.676-.425s-.09-.568.09-.793l2-2.5c.243-.304.678-.372 1.002-.156l1.616 1.077 1.837-2.859c.137-.212.372-.342.625-.344.246-.026.49.123.63.334l3 4.5c.153.23.168.526.037.77-.13.244-.385.396-.661.396zm-4.519-1.5h3.118l-1.587-2.381zm-3.42 0h1.712l-1.117-.745z"/><path d="m22.25 14h-2.756c-.778 0-1.452.501-1.676 1.247l-.859 2.862c-.16.533-.641.891-1.197.891h-7.524c-.556 0-1.037-.358-1.197-.891l-.859-2.861c-.224-.747-.897-1.248-1.676-1.248h-2.756c-.965 0-1.75.785-1.75 1.75v5.5c0 1.517 1.233 2.75 2.75 2.75h18.5c1.517 0 2.75-1.233 2.75-2.75v-5.5c0-.965-.785-1.75-1.75-1.75z"/><path d="m4 12c-.552 0-1-.448-1-1v-8c0-1.654 1.346-3 3-3h12c1.654 0 3 1.346 3 3v8c0 .552-.448 1-1 1s-1-.448-1-1v-8c0-.551-.449-1-1-1h-12c-.551 0-1 .449-1 1v8c0 .552-.448 1-1 1z"/></svg>',
        CLOSE: '<svg width="26" height="26" xmlns="http://www.w3.org/2000/svg" id="bold" enable-background="new 0 0 24 24" viewBox="0 0 24 24"><path d="m14.828 12 5.303-5.303c.586-.586.586-1.536 0-2.121l-.707-.707c-.586-.586-1.536-.586-2.121 0l-5.303 5.303-5.303-5.304c-.586-.586-1.536-.586-2.121 0l-.708.707c-.586.586-.586 1.536 0 2.121l5.304 5.304-5.303 5.303c-.586.586-.586 1.536 0 2.121l.707.707c.586.586 1.536.586 2.121 0l5.303-5.303 5.303 5.303c.586.586 1.536.586 2.121 0l.707-.707c.586-.586.586-1.536 0-2.121z"></path></svg>'
    };

    const checkInterval = 250;
    const style = GM_getResourceText("INTERNAL_CSS");
    const locale = JSON.parse(GM_getResourceText("LOCALE_TEXT"));

    var lang = GM_getValue('lang') || navigator.language || navigator.userLanguage;
    var currentURL = location.href;
    var firstStarted = false;
    var pageLoaded = false;

    var GL_referrer;
    var GL_postPath;
    var GL_username;
    var GL_repeat;
    var GL_dataCache = {
        stories: {},
        highlights: {}
    };
    var GL_observer = new MutationObserver(function (mutation, owner) {
        onReadyMyDW();
    });

    initSettings();
    GM_addStyle(style);
    GM_registerMenuCommand(_i18n('SETTING'), () => {
        showSetting();
    },{
        accessKey: "w"
    });
    GM_registerMenuCommand(_i18n('DONATE'), () => {
        GM_openInTab("https://ko-fi.com/snkoarashi", {active: true});
    },{
        accessKey: "d"
    });
    GM_registerMenuCommand(_i18n('DEBUG'), () => {
        showDebugDOM();
    },{
        accessKey: "z"
    });
    GM_registerMenuCommand(_i18n('FEEDBACK'), () => {
        GM_openInTab("https://greasyfork.org/zh-TW/scripts/404535-ig-helper/feedback", {active: true});
    },{
        accessKey: "f"
    });
    GM_registerMenuCommand(_i18n('RELOAD_SCRIPT'), () => {
        reloadScript();
    },{
        accessKey: "r"
    });

    // Main Timer
    var timer = setInterval(function(){
        // page loading or unnecessary route
        if($('div#splash-screen').length > 0 && !$('div#splash-screen').is(':hidden') ||
           location.pathname.match(/^\/(explore(\/.*)?|challenge\/?.*|direct\/?.*|qr\/?|accounts\/.*|emails\/.*|language\/?.*?|your_activity\/?.*|settings\/help(\/.*)?$)$/ig) ||
           !location.hostname.startsWith('www.')
          ){
            pageLoaded = false;
            return;
        }

        if(currentURL != location.href || !firstStarted || !pageLoaded){
            console.log('Main Timer', 'trigging');

            clearInterval(GL_repeat);
            pageLoaded = false;
            firstStarted = true;
            currentURL = location.href;
            GL_observer.disconnect();

            if(location.href.startsWith("https://www.instagram.com/p/") || location.pathname.match(/^\/(.*?)\/p\//ig) || location.href.startsWith("https://www.instagram.com/reel/")){
                GL_dataCache.stories = {};

                console.log('isDialog');

                // This is a delayed function call that prevents the dialog element from appearing before the function is called.
                var dialogTimer = setInterval(()=>{
                    // body > div[id^="mount"] section nav + div > article << (mobile page in single post) >>
                    // section:visible > main > div > div > div > div > div > hr << (single foreground post in page, non-floating // <hr> element here is literally the line beneath poster's username) >>
                    // section:visible > main > div > div.xdt5ytf << (former CSS selector for single foreground post in page, non-floating) >>
                    // <hr> is much more unique element than "div.xdt5ytf"
                    if($('body > div[class]:not([id^="mount"]) div div[role="dialog"] article, section:visible > main > div > div > div > div > div > hr, body > div[id^="mount"] section nav + div > article').length > 0){
                        clearInterval(dialogTimer);

                        // This is to prevent the detection of the "Modify Video Volume" setting from being too slow.
                        setTimeout(()=>{
                            onReadyMyDW(false);
                        }, 15);
                    }
                },100);

                pageLoaded = true;
            }

            if(location.href.startsWith("https://www.instagram.com/reels/")){
                console.log('isReels');
                setTimeout(()=>{
                    onReels(false);
                },150);
                pageLoaded = true;
            }

            if(location.href.split("?")[0] == "https://www.instagram.com/"){
                GL_dataCache.stories = {};

                let hasReferrer = GL_referrer?.match(/^\/stories\//ig) != null;

                console.log('isHomepage', hasReferrer);
                setTimeout(()=>{
                    onReadyMyDW(false, hasReferrer);

                    const element = $('div[id^="mount"] > div > div div > section > main div:not([class]):not([style]) > div > article')?.parent()[0];
                    if(element){
                        GL_observer.observe(element, {
                            childList: true
                        });
                    }
                },150);

                pageLoaded = true;
            }
            if($('header > section:first img[alt]').length && location.pathname.match(/^(\/)([0-9A-Za-z\.\-_]+)\/?(tagged|reels|saved)?\/?$/ig) && !location.pathname.match(/^(\/explore\/?$|\/stories(\/.*)?$|\/p\/)/ig)) {
                console.log('isProfile');
                setTimeout(()=>{
                    onProfileAvatar(false);
                },150);
                pageLoaded = true;
            }

            if(!pageLoaded){
                // Call Instagram stories function
                if(location.href.match(/^(https:\/\/www\.instagram\.com\/stories\/highlights\/)/ig)){
                    GL_dataCache.highlights = {};

                    console.log('isHighlightsStory');

                    onHighlightsStory(false);
                    GL_repeat = setInterval(()=>{
                        onHighlightsStoryThumbnail(false);
                    },checkInterval);

                    if($(".IG_DWHISTORY").length) setTimeout(()=>{pageLoaded = true;},150);
                }
                else if(location.href.match(/^(https:\/\/www\.instagram\.com\/stories\/)/ig)){
                    console.log('isStory');

                    /*
                     *
                     *  $('body div[id^="mount"] > div > div > div[class]').length >= 2 &&
                     *  $('body div[id^="mount"] > div > div > div[class]').last().find('svg > path[d^="M16.792"], svg > path[d^="M34.6 3.1c-4.5"]').length > 0 &&
                     *  $('body div[id^="mount"] > div > div > div[class]').last().find('svg > polyline + line').length > 0
                     *
                     */
                    if($('div[id^="mount"] section > div > a[href="/"]').length > 0){
                        $('.IG_DWSTORY').remove();
                        $('.IG_DWNEWTAB').remove();
                        if($('.IG_DWSTORY_THUMBNAIL').length){
                            $('.IG_DWSTORY_THUMBNAIL').remove();
                        }

                        onStory(false);

                        // Prevent buttons from being eaten by black holes sometimes
                        setTimeout(()=>{
                            onStory(false);
                        }, 150);
                    }

                    if($(".IG_DWSTORY").length) setTimeout(()=>{pageLoaded = true;},150);
                }
                else{
                    pageLoaded = false;
                    // Remove icons
                    $('.IG_DWSTORY').remove();
                    $('.IG_DWNEWTAB').remove();
                    if($('.IG_DWSTORY_THUMBNAIL').length){
                        $('.IG_DWSTORY_THUMBNAIL').remove();
                    }
                }
            }

            GL_referrer = new URL(location.href).pathname;
        }
    },checkInterval);

    /**
     * onProfileAvatar
     * Trigger user avatar download event or button display event.
     *
     * @param  {Boolean}  isDownload - Check if it is a download operation
     * @return {void}
     */
    async function onProfileAvatar(isDownload){
        if(isDownload){
            updateLoadingBar(true);

            let date = new Date().getTime();
            let timestamp = Math.floor(date / 1000);
            let username = location.pathname.replaceAll(/(reels|tagged)\/$/ig,'').split('/').filter(s => s.length > 0).at(-1);
            let userInfo = await getUserId(username);

            try{
                let dataURL = await getUserHighSizeProfile(userInfo.user.pk);
                saveFiles(dataURL,username,"avatar",timestamp,'jpg');
            }
            catch(err){
                saveFiles(userInfo.user.profile_pic_url,username,"avatar",timestamp,'jpg');
            }

            updateLoadingBar(false);
        }
        else{
            // Add the profile download button
            if(!$('.IG_DWPROFILE').length){
                let profileTimer = setInterval(()=>{
                    if($('.IG_DWPROFILE').length){
                        clearInterval(profileTimer);
                        return;
                    }

                    $('header > section:first img[alt][draggable]').parent().parent().append(`<div title="${_i18n("DW")}" class="IG_DWPROFILE">${SVG.DOWNLOAD}</div>`);
                    $('header > section:first img[alt][draggable]').parent().parent().css('position','relative');
                    $('header > section:first img[alt]:not([draggable])').parent().parent().parent().append(`<div title="${_i18n("DW")}" class="IG_DWPROFILE">${SVG.DOWNLOAD}</div>`);
                    $('header > section:first img[alt]:not([draggable])').parent().parent().parent().css('position','relative');
                },150);
            }
        }
    }

    /**
     * onHighlightsStory
     * Trigger user's highlight download event or button display event.
     *
     * @param  {Boolean}  isDownload - Check if it is a download operation
     * @param  {Boolean}  isPreview - Check if it is need to open new tab
     * @return {void}
     */
    async function onHighlightsStory(isDownload, isPreview){
        if(isDownload){
            let date = new Date().getTime();
            let timestamp = Math.floor(date / 1000);
            let highlightId = location.href.replace(/\/$/ig,'').split('/').at(-1);
            let nowIndex = $("body > div section._ac0a header._ac0k > ._ac3r ._ac3n ._ac3p[style]").length ||
                $('body > div section:visible > div > div:not([class]) > div > div div.x1ned7t2.x78zum5 div.x1caxmr6').length ||
                $('body > div div:not([hidden]) section:visible > div div[style]:not([class]) > div').find('div div.x1ned7t2.x78zum5 div.x1caxmr6').length;
            let username = "";
            let target = 0;

            updateLoadingBar(true);

            if(GL_dataCache.highlights[highlightId]){
                console.log('Fetch from memory cache:', highlightId);

                let totIndex = GL_dataCache.highlights[highlightId].data.reels_media[0].items.length;
                username = GL_dataCache.highlights[highlightId].data.reels_media[0].owner.username;
                target = GL_dataCache.highlights[highlightId].data.reels_media[0].items[totIndex-nowIndex];
            }
            else{
                let highStories = await getHighlightStories(highlightId);
                let totIndex = highStories.data.reels_media[0].items.length;
                username = highStories.data.reels_media[0].owner.username;
                target = highStories.data.reels_media[0].items[totIndex-nowIndex];

                GL_dataCache.highlights[highlightId] = highStories;
            }

            if(USER_SETTING.RENAME_PUBLISH_DATE){
                timestamp = target.taken_at_timestamp;
            }

            if(USER_SETTING.FORCE_RESOURCE_VIA_MEDIA && !TEMP_FETCH_RATE_LITMIT){
                let result = await getMediaInfo(target.id);

                if(result.status === 'ok'){
                    if(result.items[0].video_versions){
                        if(isPreview){
                            openNewTab(result.items[0].video_versions[0].url);
                        }
                        else{
                            saveFiles(result.items[0].video_versions[0].url, username,"highlights",timestamp,'mp4');
                        }
                    }
                    else{
                        if(isPreview){
                            openNewTab(result.items[0].image_versions2.candidates[0].url);
                        }
                        else{
                            saveFiles(result.items[0].image_versions2.candidates[0].url, username,"highlights",timestamp,'jpg');
                        }
                    }
                }
                else{
                    if(USER_SETTING.USE_BLOB_FETCH_WHEN_MEDIA_RATE_LITMIT){
                        delete GL_dataCache.highlights[highlightId];
                        TEMP_FETCH_RATE_LITMIT = true;

                        onHighlightsStory(true, isPreview);
                    }
                    else{
                        alert('Fetch failed from Media API. API response message: ' + result.message);
                    }

                    console.log(result);
                }
            }
            else{
                if(target.is_video){
                    if(isPreview){
                        openNewTab(target.video_resources.at(-1).src,username);
                    }
                    else{
                        saveFiles(target.video_resources.at(-1).src,username,"highlights",timestamp,'mp4', highlightId);
                    }
                }
                else{
                    if(isPreview){
                        openNewTab(target.display_resources.at(-1).src,username);
                    }
                    else{
                        saveFiles(target.display_resources.at(-1).src,username,"highlights",timestamp,'jpg', highlightId);
                    }
                }

                TEMP_FETCH_RATE_LITMIT = false;
            }

            updateLoadingBar(false);
        }
        else{
            // Add the stories download button
            if(!$('.IG_DWHISTORY').length){
                let $element = null;

                // Default detecter (section layout mode)
                if($('body > div section._ac0a').length > 0){
                    $element = $('body > div section:visible._ac0a');
                }
                else{
                    $element = $('body > div section:visible > div > div[style]:not([class])');
                    $element.css('position','relative');
                }

                // Detecter for div layout mode
                if($element.length === 0){
                    let $$element = $('body > div div:not([hidden]) section:visible > div div[class][style] > div[style]:not([class])');
                    let nowSize = 0;

                    $$element.each(function(){
                        if($(this).width() > nowSize){
                            nowSize = $(this).width();
                            $element = $(this).children('div').first();
                        }
                    });
                }


                if($element != null){
                    //$element.css('position','relative');
                    $element.append(`<div title="${_i18n("DW")}" class="IG_DWHISTORY">${SVG.DOWNLOAD}</div>`);
                    $element.append(`<div title="${_i18n("NEW_TAB")}" class="IG_DWHINEWTAB">${SVG.NEW_TAB}</div>`);

                    // Modify Video Volume
                    if(USER_SETTING.MODIFY_VIDEO_VOLUME){
                        $element.find('video').each(function(){
                            if(!$(this).data('modify')){
                                console.log('(highlight) Added video event listener #modify');
                                this.volume = VIDEO_VOLUME;

                                $(this).on('play',function(){
                                    this.volume = VIDEO_VOLUME;
                                });
                                $(this).on('playing',function(){
                                    this.volume = VIDEO_VOLUME;
                                });

                                $(this).attr('data-modify', true);
                            }
                        });
                    }
                }
            }
        }
    }

    /**
     * onHighlightsStoryThumbnail
     * Trigger user's highlight video thumbnail download event or button display event.
     *
     * @param  {Boolean}  isDownload - Check if it is a download operation
     * @return {void}
     */
    async function onHighlightsStoryThumbnail(isDownload){
        if(isDownload){
            let date = new Date().getTime();
            let timestamp = Math.floor(date / 1000);
            let highlightId = location.href.replace(/\/$/ig,'').split('/').at(-1);
            let username = "";
            let nowIndex = $("body > div section._ac0a header._ac0k > ._ac3r ._ac3n ._ac3p[style]").length ||
                $('body > div section:visible > div > div:not([class]) > div > div div.x1ned7t2.x78zum5 div.x1caxmr6').length ||
                $('body > div div:not([hidden]) section:visible > div div[style]:not([class]) > div').find('div div.x1ned7t2.x78zum5 div.x1caxmr6').length;
            let target = "";

            updateLoadingBar(true);

            if(GL_dataCache.highlights[highlightId]){
                console.log('Fetch from memory cache:', highlightId);

                let totIndex = GL_dataCache.highlights[highlightId].data.reels_media[0].items.length;
                username = GL_dataCache.highlights[highlightId].data.reels_media[0].owner.username;
                target = GL_dataCache.highlights[highlightId].data.reels_media[0].items[totIndex-nowIndex];
            }
            else{
                let highStories = await getHighlightStories(highlightId);
                let totIndex = highStories.data.reels_media[0].items.length;
                username = highStories.data.reels_media[0].owner.username;
                target = highStories.data.reels_media[0].items[totIndex-nowIndex];

                GL_dataCache.highlights[highlightId] = highStories;
            }

            if(USER_SETTING.RENAME_PUBLISH_DATE){
                timestamp = target.taken_at_timestamp;
            }

            if(USER_SETTING.FORCE_RESOURCE_VIA_MEDIA && !TEMP_FETCH_RATE_LITMIT){
                let result = await getMediaInfo(target.id);

                if(result.status === 'ok'){
                    saveFiles(result.items[0].image_versions2.candidates[0].url, username,"highlights",timestamp,'jpg');
                }
                else{
                    if(USER_SETTING.USE_BLOB_FETCH_WHEN_MEDIA_RATE_LITMIT){
                        delete GL_dataCache.highlights[highlightId];
                        TEMP_FETCH_RATE_LITMIT = true;

                        onHighlightsStoryThumbnail(true);
                    }
                    else{
                        alert('Fetch failed from Media API. API response message: ' + result.message);
                    }

                    console.log(result);
                }
            }
            else{
                saveFiles(target.display_resources.at(-1).src,username,"highlights",timestamp,'jpg', highlightId);
                TEMP_FETCH_RATE_LITMIT= false;
            }

            updateLoadingBar(false);
        }
        else{
            if($('body > div section video.xh8yej3').length){
                // Add the stories thumbnail download button
                if(!$('.IG_DWHISTORY_THUMBNAIL').length){
                    let $element = null;

                    // Default detecter (section layout mode)
                    if($('body > div section._ac0a').length > 0){
                        $element = $('body > div section:visible._ac0a');
                    }
                    else{
                        $element = $('body > div section:visible > div > div[style]:not([class])');
                        $element.css('position','relative');
                    }

                    // Detecter for div layout mode
                    if($element.length === 0){
                        let $$element = $('body > div div:not([hidden]) section:visible > div div[class][style] > div[style]:not([class])');
                        let nowSize = 0;

                        $$element.each(function(){
                            if($(this).width() > nowSize){
                                nowSize = $(this).width();
                                $element = $(this).children('div').first();
                            }
                        });
                    }

                    if($element != null){
                        $element.append(`<div title="${_i18n("THUMBNAIL_INTRO")}" class="IG_DWHISTORY_THUMBNAIL">${SVG.THUMBNAIL}</div>`);
                    }
                }
            }
            else{
                $('.IG_DWHISTORY_THUMBNAIL').remove();
            }
        }
    }

    /**
     * onStory
     * Trigger user's story download event or button display event.
     *
     * @param  {Boolean}  isDownload - Check if it is a download operation
     * @param  {Boolean}  isForce - Check if downloading directly from API instead of cache
     * @param  {Boolean}  isPreview - Check if it is need to open new tab
     * @return {void}
     */
    async function onStory(isDownload,isForce,isPreview){
        if(isDownload){
            let date = new Date().getTime();
            let timestamp = Math.floor(date / 1000);
            let username = $("body > div section._ac0a header._ac0k ._ac0l a + div a").first().text() || location.pathname.split('/').at(2);

            updateLoadingBar(true);
            if(USER_SETTING.FORCE_RESOURCE_VIA_MEDIA && !TEMP_FETCH_RATE_LITMIT){
                let mediaId = null;

                let userInfo = await getUserId(username);
                let userId = userInfo.user.pk;
                let stories = await getStories(userId);

                // appear in from profile page to story page
                $('body > div section:visible div.x1ned7t2.x78zum5 > div').each(function(index){
                    if($(this).hasClass('x1lix1fw')){
                        if($(this).children().length > 0){
                            mediaId = stories.data.reels_media[0].items[index].id;
                        }
                    }
                });

                // appear in from home page to story page
                $('body > div section:visible ._ac0k > ._ac3r > div').each(function(index){
                    if($(this).children().hasClass('_ac3q')){
                        mediaId = stories.data.reels_media[0].items[index].id;
                    }
                });

                if(mediaId == null){
                    mediaId = location.pathname.split('/').filter(s => s.length > 0 && s.match(/^([0-9]{10,})$/)).at(-1);
                }

                let result = await getMediaInfo(mediaId);

                if(USER_SETTING.RENAME_PUBLISH_DATE){
                    timestamp = result.items[0].taken_at;
                }

                if(result.status === 'ok'){
                    if(result.items[0].video_versions){
                        if(isPreview){
                            openNewTab(result.items[0].video_versions[0].url);
                        }
                        else{
                            saveFiles(result.items[0].video_versions[0].url, username,"stories",timestamp,'mp4');
                        }
                    }
                    else{
                        if(isPreview){
                            openNewTab(result.items[0].image_versions2.candidates[0].url);
                        }
                        else{
                            saveFiles(result.items[0].image_versions2.candidates[0].url, username,"stories",timestamp,'jpg');
                        }
                    }
                }
                else{
                    if(USER_SETTING.USE_BLOB_FETCH_WHEN_MEDIA_RATE_LITMIT){
                        TEMP_FETCH_RATE_LITMIT = true;
                        onStory(isDownload,isForce,isPreview);
                    }
                    else{
                        alert('Fetch failed from Media API. API response message: ' + result.message);
                    }
                    console.log(result);
                }

                updateLoadingBar(false);
                return;
            }

            if($('body > div section:visible video[playsinline]').length > 0){
                // Download stories if it is video
                let type = "mp4";
                let videoURL = "";
                let targetURL = location.pathname.replace(/\/$/ig,'').split("/").at(-1);

                if(GL_dataCache.stories[username] && !isForce){
                    console.log('Fetch from memory cache:', username);
                    GL_dataCache.stories[username].data.reels_media[0].items.forEach(item => {
                        if(item.id == targetURL){
                            videoURL = item.video_resources[0].src;
                            if(USER_SETTING.RENAME_PUBLISH_DATE){
                                timestamp = item.taken_at_timestamp;
                            }
                        }
                    });

                    if(videoURL.length == 0){
                        console.log('Memory cache not found, try fetch from API:', username);
                        onStory(true,true);
                        return;
                    }
                }
                else{
                    let userInfo = await getUserId(username);
                    let userId = userInfo.user.pk;
                    let stories = await getStories(userId);

                    stories.data.reels_media[0].items.forEach(item => {
                        if(item.id == targetURL){
                            videoURL = item.video_resources[0].src;
                            if(USER_SETTING.RENAME_PUBLISH_DATE){
                                timestamp = item.taken_at_timestamp;
                            }
                        }
                    });

                    // GitHub issue #4: thinkpad4
                    if(videoURL.length == 0){
                        // appear in from profile page to story page
                        $('body > div section:visible div.x1ned7t2.x78zum5 > div').each(function(index){
                            if($(this).hasClass('x1lix1fw')){
                                if($(this).children().length > 0){
                                    videoURL = stories.data.reels_media[0].items[index].video_resources[0].src;
                                    if(USER_SETTING.RENAME_PUBLISH_DATE){
                                        timestamp = stories.data.reels_media[0].items[index].taken_at_timestamp;
                                    }
                                }
                            }
                        });

                        // appear in from home page to story page
                        $('body > div section:visible ._ac0k > ._ac3r > div').each(function(index){
                            if($(this).children().hasClass('_ac3q')){
                                videoURL = stories.data.reels_media[0].items[index].video_resources[0].src;
                                if(USER_SETTING.RENAME_PUBLISH_DATE){
                                    timestamp = stories.data.reels_media[0].items[index].taken_at_timestamp;
                                }
                            }
                        });
                    }

                    GL_dataCache.stories[username] = stories;
                }

                if(videoURL.length == 0){
                    alert(_i18n("NO_VID_URL"));
                }
                else{
                    if(isPreview){
                        openNewTab(videoURL);
                    }
                    else{
                        saveFiles(videoURL,username,"stories",timestamp,type);
                    }
                }
            }
            else{
                // Download stories if it is image
                let srcset = $('body > div section:visible img[referrerpolicy][class], body > div section:visible img[crossorigin][class]:not([alt])').attr('srcset')?.split(',')[0]?.split(' ')[0];
                let link = (srcset)?srcset:$('body > div section:visible img[referrerpolicy][class], body > div section:visible img[crossorigin][class]:not([alt])').attr('src');

                if(!link){
                    // _aa63 mean stories picture in stories page (not avatar)
                    let $element = $('body > div section:visible img._aa63');
                    link = ($element.attr('srcset'))?$element.attr('srcset')?.split(',')[0]?.split(' ')[0]:$element.attr('src');
                }

                if(USER_SETTING.RENAME_PUBLISH_DATE){
                    timestamp = new Date($('body > div section:visible time[datetime][class]').first().attr('datetime')).getTime();
                }

                let downloadLink = link;
                let type = 'jpg';

                if(isPreview){
                    openNewTab(downloadLink);
                }
                else{
                    saveFiles(downloadLink,username,"stories",timestamp,type);
                }
            }

            TEMP_FETCH_RATE_LITMIT = false;
            updateLoadingBar(false);
        }
        else{
            // Add the stories download button
            let style = "position: absolute;right:-40px;top:15px;padding:5px;line-height:1;background:#fff;border-radius: 5px;cursor:pointer;";
            if(!$('.IG_DWSTORY').length){
                GL_dataCache.stories = {};
                let $element = null;
                // Default detecter (section layout mode)
                if($('body > div section._ac0a').length > 0){
                    $element = $('body > div section:visible._ac0a');
                }
                // detecter (single story layout mode)
                else{
                    $element = $('body > div section:visible > div > div[style]:not([class])');
                    $element.css('position','relative');
                }


                if($element.length === 0){
                    $element = $('div[id^="mount"] section > div > a[href="/"]').parent().parent().parent().find('section:visible > div > div[style]:not([class])');
                    $element.css('position','relative');
                }

                if($element.length === 0){
                    $element = $('div[id^="mount"] section > div > a[href="/"]').parent().parent().parent().find('section:visible > div div[style]:not([class]) > div:not([data-visualcompletion="loading-state"])');
                    $element.css('position','relative');
                }


                // Detecter for div layout mode
                if($element.length === 0){
                    let $$element = $('body > div div:not([hidden]) section:visible > div div[class][style] > div[style]:not([class])');
                    let nowSize = 0;

                    $$element.each(function(){
                        if($(this).width() > nowSize){
                            nowSize = $(this).width();
                            $element = $(this).children('div').first();
                        }
                    });
                }


                if($element != null){
                    $element.first().css('position','relative');
                    $element.first().append(`<div title="${_i18n("DW")}" class="IG_DWSTORY">${SVG.DOWNLOAD}</div>`);
                    $element.first().append(`<div title="${_i18n("NEW_TAB")}" class="IG_DWNEWTAB">${SVG.NEW_TAB}</div>`);

                    // Modify Video Volume
                    if(USER_SETTING.MODIFY_VIDEO_VOLUME){
                        $element.find('video').each(function(){
                            if(!$(this).data('modify')){
                                console.log('(story) Added video event listener #modify');
                                this.volume = VIDEO_VOLUME;

                                $(this).on('play',function(){
                                    this.volume = VIDEO_VOLUME;
                                });
                                $(this).on('playing',function(){
                                    this.volume = VIDEO_VOLUME;
                                });

                                $(this).attr('data-modify', true);
                            }
                        });
                    }

                    onStoryThumbnail(false);
                }
            }
        }
    }

    /**
     * onStoryThumbnail
     * Trigger user's story video thumbnail download event or button display event.
     *
     * @param  {Boolean}  isDownload - Check if it is a download operation
     * @param  {Boolean}  isForce - Check if downloading directly from API instead of cache
     * @return {void}
     */
    async function onStoryThumbnail(isDownload,isForce){
        if(isDownload){
            // Download stories if it is video
            let date = new Date().getTime();
            let timestamp = Math.floor(date / 1000);
            let type = 'jpg';
            let username = $("body > div section._ac0a header._ac0k ._ac0l a + div a").first().text() || location.pathname.split('/').at(2);
            let style = 'margin:5px 0px;padding:5px 0px;color:#111;font-size:1rem;line-height:1rem;text-align:center;border:1px solid #000;border-radius: 5px;';
            // Download thumbnail
            let targetURL = location.pathname.replace(/\/$/ig,'').split("/").at(-1);
            let videoThumbnailURL = "";

            updateLoadingBar(true);

            if(USER_SETTING.FORCE_RESOURCE_VIA_MEDIA && !TEMP_FETCH_RATE_LITMIT){
                let mediaId = null;

                let userInfo = await getUserId(username);
                let userId = userInfo.user.pk;
                let stories = await getStories(userId);

                // appear in from profile page to story page
                $('body > div section:visible div.x1ned7t2.x78zum5 > div').each(function(index){
                    if($(this).hasClass('x1lix1fw')){
                        if($(this).children().length > 0){
                            mediaId = stories.data.reels_media[0].items[index].id;
                        }
                    }
                });

                // appear in from home page to story page
                $('body > div section:visible ._ac0k > ._ac3r > div').each(function(index){
                    if($(this).children().hasClass('_ac3q')){
                        mediaId = stories.data.reels_media[0].items[index].id;
                    }
                });

                if(mediaId == null){
                    mediaId = location.pathname.split('/').filter(s => s.length > 0 && s.match(/^([0-9]{10,})$/)).at(-1);
                }

                let result = await getMediaInfo(mediaId);

                if(USER_SETTING.RENAME_PUBLISH_DATE){
                    timestamp = result.items[0].taken_at;
                }

                if(result.status === 'ok'){
                    saveFiles(result.items[0].image_versions2.candidates[0].url, username,"stories",timestamp,'jpg');

                }
                else{
                    if(USER_SETTING.USE_BLOB_FETCH_WHEN_MEDIA_RATE_LITMIT){
                        TEMP_FETCH_RATE_LITMIT = true;
                        onStoryThumbnail(true, isForce);
                    }
                    else{
                        alert('Fetch failed from Media API. API response message: ' + result.message);
                    }

                    console.log(result);
                }

                updateLoadingBar(false);
                return;
            }

            if(GL_dataCache.stories[username] && !isForce){
                console.log('Fetch from memory cache:', username);
                GL_dataCache.stories[username].data.reels_media[0].items.forEach(item => {
                    if(item.id == targetURL){
                        videoThumbnailURL = item.display_url;
                        if(USER_SETTING.RENAME_PUBLISH_DATE){
                            timestamp = item.taken_at_timestamp;
                        }
                    }
                });

                if(videoThumbnailURL.length == 0){
                    console.log('Memory cache not found, try fetch from API:', username);
                    onStoryThumbnail(true,true);
                    return;
                }
            }
            else{
                let userInfo = await getUserId(username);
                let userId = userInfo.user.pk;
                let stories = await getStories(userId);

                stories.data.reels_media[0].items.forEach(item => {
                    if(item.id == targetURL){
                        videoThumbnailURL = item.display_url;
                        if(USER_SETTING.RENAME_PUBLISH_DATE){
                            timestamp = item.taken_at_timestamp;
                        }
                    }
                });

                // GitHub issue #4: thinkpad4
                if(videoThumbnailURL.length == 0){
                    // appear in from profile page to story page
                    $('body > div section:visible div.x1ned7t2.x78zum5 > div').each(function(index){
                        if($(this).hasClass('x1lix1fw')){
                            if($(this).children().length > 0){
                                videoThumbnailURL = stories.data.reels_media[0].items[index].display_url;
                                if(USER_SETTING.RENAME_PUBLISH_DATE){
                                    timestamp = stories.data.reels_media[0].items[index].taken_at_timestamp;
                                }
                            }
                        }
                    });

                    // appear in from home page to story page
                    $('body > div section:visible ._ac0k > ._ac3r > div').each(function(index){
                        if($(this).children().hasClass('_ac3q')){
                            videoThumbnailURL = stories.data.reels_media[0].items[index].display_url;
                            if(USER_SETTING.RENAME_PUBLISH_DATE){
                                timestamp = stories.data.reels_media[0].items[index].taken_at_timestamp;
                            }
                        }
                    });
                }
            }

            saveFiles(videoThumbnailURL,username,"thumbnail",timestamp,type);
            TEMP_FETCH_RATE_LITMIT= false;
            updateLoadingBar(false);
        }
        else{
            if($('body > div div.IG_DWSTORY').parent().find('video[class]').length){
                // Add the stories download button
                let $element = null;
                // Default detecter (section layout mode)
                if($('body > div section._ac0a').length > 0){
                    $element = $('body > div section:visible._ac0a');
                }
                // detecter (single story layout mode)
                else{
                    $element = $('body > div section:visible > div > div[style]:not([class])');
                    $element.css('position','relative');
                }

                if($element.length === 0){
                    $element = $('div[id^="mount"] section > div > a[href="/"]').parent().parent().parent().find('section:visible > div > div[style]:not([class])');
                    $element.css('position','relative');
                }

                if($element.length === 0){
                    $element = $('div[id^="mount"] section > div > a[href="/"]').parent().parent().parent().find('section:visible > div div[style]:not([class]) > div:not([data-visualcompletion="loading-state"])');
                    $element.css('position','relative');
                }

                // Detecter for div layout mode
                if($element.length === 0){
                    let $$element = $('body > div div:not([hidden]) section:visible > div div[class][style] > div[style]:not([class])');
                    let nowSize = 0;

                    $$element.each(function(){
                        if($(this).width() > nowSize){
                            nowSize = $(this).width();
                            $element = $(this).children('div').first();
                        }
                    });
                }


                if($element != null){
                    $element.first().css('position','relative');
                    $element.first().append(`<div title="${_i18n("THUMBNAIL_INTRO")}" class="IG_DWSTORY_THUMBNAIL">${SVG.THUMBNAIL}</div>`);
                }

            }
        }
    }

    /**
     * onReels
     * Trigger user's reels download event or button display event.
     *
     * @param  {Boolean}  isDownload - Check if it is a download operation
     * @param  {Boolean}  isVideo - Check if reel is a video element
     * @param  {Boolean}  isPreview - Check if it is need to open new tab
     * @return {void}
     */
    async function onReels(isDownload, isVideo, isPreview){
        if(isDownload){
            updateLoadingBar(true);

            let reelsPath = location.href.split('?').at(0).split('instagram.com/reels/').at(-1).replaceAll('/','');
            let data = await getBlobMedia(reelsPath);

            let timestamp = new Date().getTime();

            if(USER_SETTING.RENAME_PUBLISH_DATE){
                timestamp = data.shortcode_media.taken_at_timestamp;
            }

            if(isVideo && data.shortcode_media.is_video){
                if(isPreview){
                    openNewTab(data.shortcode_media.video_url);
                }
                else{
                    let type = 'mp4';
                    saveFiles(data.shortcode_media.video_url,data.shortcode_media.owner.username,"reels",timestamp,type,reelsPath);
                }
            }
            else{
                if(isPreview){
                    openNewTab(data.shortcode_media.display_resources.at(-1).src);
                }
                else{
                    let type = 'jpg';
                    saveFiles(data.shortcode_media.display_resources.at(-1).src,data.shortcode_media.owner.username,"reels",timestamp,type,reelsPath);
                }
            }

            updateLoadingBar(false);
        }
        else{
            //$('.IG_REELS_THUMBNAIL, .IG_REELS').remove();
            var timer = setInterval(()=>{
                if($('section > main[role="main"] > div div.x1qjc9v5 video').length > 0){
                    clearInterval(timer);

                    if(USER_SETTING.SCROLL_BUTTON){
                        $('#scrollWrapper').remove();
                        $('section > main[role="main"]').append('<section id="scrollWrapper"></section>');
                        $('section > main[role="main"] > #scrollWrapper').append('<div class="button-up"><div></div></div>');
                        $('section > main[role="main"] > #scrollWrapper').append('<div class="button-down"><div></div></div>');

                        $('section > main[role="main"] > #scrollWrapper > .button-up').on('click',function(){
                            $('section > main[role="main"] > div')[0].scrollBy({top: -30, behavior: "smooth"});
                        });
                        $('section > main[role="main"] > #scrollWrapper > .button-down').on('click',function(){
                            $('section > main[role="main"] > div')[0].scrollBy({top: 30, behavior: "smooth"});
                        });
                    }

                    // reels scroll has [tabindex] but header not.
                    $('section > main[role="main"] > div[tabindex]').children('div').each(function(){
                        if($(this).children().length > 0){
                            if(!$(this).children().find('.IG_REELS').length){
                                var $main = $(this);

                                $(this).children().css('position','relative');

                                $(this).children().append(`<div title="${_i18n("DW")}" class="IG_REELS">${SVG.DOWNLOAD}</div>`);
                                $(this).children().append(`<div title="${_i18n("NEW_TAB")}" class="IG_REELS_NEWTAB">${SVG.NEW_TAB}</div>`);
                                $(this).children().append(`<div title="${_i18n("THUMBNAIL_INTRO")}" class="IG_REELS_THUMBNAIL">${SVG.THUMBNAIL}</div>`);

                                // Disable video autoplay
                                if(USER_SETTING.DISABLE_VIDEO_LOOPING){
                                    $(this).find('video').each(function(){
                                        if(!$(this).data('loop')){
                                            console.log('(reel) Added video event listener #loop');
                                            $(this).on('ended',function(){
                                                $(this).attr('data-loop', true);
                                                let $element_play_button = $(this).next().find('div[role="presentation"] > div svg > path[d^="M5.888"]').parents('button[role="button"], div[role="button"]');
                                                if($element_play_button.length > 0){
                                                    $element_play_button.click();
                                                    console.log('paused click()');
                                                }
                                                else{
                                                    $(this).parent().find('.xpgaw4o').removeAttr('style');
                                                    this.pause();
                                                    console.log('paused pause()');
                                                }
                                            });
                                        }
                                    });
                                }
                                // Modify Video Volume
                                if(USER_SETTING.MODIFY_VIDEO_VOLUME){
                                    $(this).find('video').each(function(){
                                        if(!$(this).data('modify')){
                                            console.log('(reel) Added video event listener #modify');
                                            this.volume = VIDEO_VOLUME;

                                            $(this).on('play',function(){
                                                this.volume = VIDEO_VOLUME;
                                            });
                                            $(this).on('playing',function(){
                                                this.volume = VIDEO_VOLUME;
                                            });

                                            $(this).attr('data-modify', true);
                                        }
                                    });
                                }

                                if(USER_SETTING.HTML5_VIDEO_CONTROL){
                                    $(this).find('video').each(function(){
                                        if(!$(this).data('controls')){
                                            let $video = $(this);

                                            console.log('(reel) Added video html5 contorller #modify');
                                            this.volume = VIDEO_VOLUME;

                                            $(this).on('loadstart',function(){
                                                this.volume = VIDEO_VOLUME;
                                            });

                                            // Restore layout to show details interface
                                            $(this).on('contextmenu',function(e){
                                                e.preventDefault();
                                                $video.css('z-index', '-1');
                                                $video.removeAttr('controls');
                                            });

                                            // Hide layout to show controller
                                            $(this).parent().find('video + div div[role="button"]').filter(function(){
                                                return $(this).parent('div[role="presentation"]').length > 0 && $(this).css('cursor') === 'pointer' && $(this).attr('style') != null;
                                            }).first().on('contextmenu',function(e){
                                                e.preventDefault();
                                                $video.css('z-index', '2');
                                                $video.attr('controls', true);
                                            });


                                            $(this).on('volumechange',function(){
                                                let $element_mute_button = $(this).parent().find('video + div > div').find('button[type="button"], div[role="button"]').filter(function(idx){
                                                    // This is mute/unmute's icon
                                                    return $(this).width() <= 64 && $(this).height() <= 64 && $(this).find('svg > path[d^="M16.636 7.028a1.5"], svg > path[d^="M1.5 13.3c-.8"]').length > 0;
                                                });

                                                var is_elelment_muted = $element_mute_button.find('svg > path[d^="M16.636"]').length === 0;

                                                if(this.muted != is_elelment_muted){
                                                    this.volume = VIDEO_VOLUME;
                                                    $element_mute_button?.click();
                                                }

                                                if ($(this).attr('data-completed')){
                                                    VIDEO_VOLUME = this.volume;
                                                    GM_setValue('G_VIDEO_VOLUME', this.volume);
                                                }

                                                if(this.volume == VIDEO_VOLUME){
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

                                var $buttonParent = $(this).find('div[role="presentation"] > div[role="button"] > div').first();
                                $buttonParent.append('<div class="volume_slider" />');
                                $buttonParent.find('div.volume_slider').append(`<div><input type="range" max="1" min="0" step="0.05" value="${VIDEO_VOLUME}" /></div>`);
                                $buttonParent.find('div.volume_slider input').attr('style',`--ig-track-progress: ${(VIDEO_VOLUME * 100) + '%'}`);
                                $buttonParent.find('div.volume_slider input').on('input',function(){
                                    var percent = ($(this).val() * 100) + '%';

                                    VIDEO_VOLUME = $(this).val();
                                    GM_setValue('G_VIDEO_VOLUME', $(this).val());

                                    $(this).attr('style',`--ig-track-progress: ${percent}`);

                                    $main.find('video').each(function(){
                                        console.log('(reel) video volume changed #slider');
                                        this.volume = VIDEO_VOLUME;
                                    });
                                });

                                $buttonParent.find('div.volume_slider input').on('mouseenter',function(){
                                    var percent = (VIDEO_VOLUME * 100) + '%';
                                    $(this).attr('style',`--ig-track-progress: ${percent}`);
                                    $(this).val(VIDEO_VOLUME);
                                    $main.find('video').each(function(){
                                        console.log('(reel) video volume changed #slider');
                                        this.volume = VIDEO_VOLUME;
                                    });
                                });

                                $buttonParent.find('div.volume_slider').on('click',function(e){
                                    e.stopPropagation();
                                    e.preventDefault();
                                });
                            }
                        }
                    });
                }
            },250);
        }
    }

    /**
     * getHighlightStories
     * Get a list of all stories in highlight Id.
     *
     * @param  {Integer}  highlightId
     * @return {Object}
     */
    function getHighlightStories(highlightId){
        return new Promise((resolve,reject)=>{
            let getURL = `https://www.instagram.com/graphql/query/?query_hash=45246d3fe16ccc6577e0bd297a5db1ab&variables=%7B%22highlight_reel_ids%22:%5B%22${highlightId}%22%5D,%22precomposed_overlay%22:false%7D`;

            GM_xmlhttpRequest({
                method: "GET",
                url: getURL,
                onload: function(response) {
                    let obj = JSON.parse(response.response);
                    resolve(obj);
                },
                onerror: function(err){
                    reject(err);
                }
            });
        });
    }

    /**
     * getStories
     * Get a list of all stories in user Id.
     *
     * @param  {Integer}  userId
     * @return {Object}
     */
    function getStories(userId){
        return new Promise((resolve,reject)=>{
            let getURL = `https://www.instagram.com/graphql/query/?query_hash=15463e8449a83d3d60b06be7e90627c7&variables=%7B%22reel_ids%22:%5B%22${userId}%22%5D,%22precomposed_overlay%22:false%7D`;

            GM_xmlhttpRequest({
                method: "GET",
                url: getURL,
                onload: function(response) {
                    let obj = JSON.parse(response.response);
                    resolve(obj);
                },
                onerror: function(err){
                    reject(err);
                }
            });
        });
    }

    /**
     * getUserId
     * Get user's id with username
     *
     * @param  {String}  username
     * @return {Integer}
     */
    function getUserId(username){
        return new Promise((resolve,reject)=>{
            let getURL = `https://www.instagram.com/web/search/topsearch/?query=${username}`;

            GM_xmlhttpRequest({
                method: "GET",
                url: getURL,
                onload: function(response) {
                    // Fix search issue by Discord: sno_w_
                    let obj = JSON.parse(response.response);
                    let result = null;
                    obj.users.forEach(pos => {
                        if(pos.user.username?.toLowerCase() === username?.toLowerCase()){
                            result = pos;
                        }
                    });

                    if(result != null){
                        resolve(result);
                    }
                    else{
                        alert("Can not find user info from getUserId()");
                    }
                },
                onerror: function(err){
                    reject(err);
                }
            });
        });
    }

    /**
     * getUserHighSizeProfile
     * Get user's high quality avatar image.
     *
     * @param  {Integer}  userId
     * @return {String}
     */
    function getUserHighSizeProfile(userId){
        return new Promise((resolve,reject)=>{
            let getURL = `https://i.instagram.com/api/v1/users/${userId}/info/`;

            GM_xmlhttpRequest({
                method: "GET",
                url: getURL,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Pixel 7 XL)Build/RP1A.20845.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/5.0 Chrome/117.0.5938.60 Mobile Safari/537.36 Instagram 307.0.0.34.111'
                },
                onload: function(response) {
                    let obj = JSON.parse(response.response);
                    if(obj.status !== 'ok'){
                        reject('faild');
                    }
                    else{
                        resolve(obj.user.hd_profile_pic_url_info?.url);
                    }
                },
                onerror: function(err){
                    reject(err);
                }
            });
        });
    }

    /**
     * getPostOwner
     * Get post's author with post shortcode
     *
     * @param  {String}  postPath
     * @return {String}
     */
    function getPostOwner(postPath){
        return new Promise((resolve,reject)=>{
            if(!postPath) reject("NOPATH");
            let postShortCode = postPath;
            let getURL = `https://www.instagram.com/graphql/query/?query_hash=2c4c2e343a8f64c625ba02b2aa12c7f8&variables=%7B%22shortcode%22:%22${postShortCode}%22}`;

            GM_xmlhttpRequest({
                method: "GET",
                url: getURL,
                onload: function(response) {
                    let obj = JSON.parse(response.response);
                    resolve(obj.data.shortcode_media.owner.username);
                },
                onerror: function(err){
                    reject(err);
                }
            });
        });
    }

    /**
     * getBlobMedia
     * Get list of all media files in post with post shortcode
     *
     * @param  {String}  postPath
     * @return {Object}
     */
    function getBlobMedia(postPath){
        return new Promise((resolve,reject)=>{
            if(!postPath) reject("NOPATH");
            let postShortCode = postPath;
            let getURL = `https://www.instagram.com/graphql/query/?query_hash=2c4c2e343a8f64c625ba02b2aa12c7f8&variables=%7B%22shortcode%22:%22${postShortCode}%22}`;

            GM_xmlhttpRequest({
                method: "GET",
                url: getURL,
                onload: function(response) {
                    let obj = JSON.parse(response.response);
                    console.log(obj);
                    resolve(obj.data);
                },
                onerror: function(err){
                    reject(err);
                }
            });
        });
    }

    /**
     * onReadyMyDW
     * Create an event entry point for the download button for the post
     *
     * @param  {Boolean}  NoDialog    - Check if it not showing the dialog
     * @param  {?Boolean}  hasReferrer - Check if the source of the previous page is a story page
     * @return {void}
     */
    function onReadyMyDW(NoDialog, hasReferrer){
        if(hasReferrer === true){
            console.log('hasReferrer', 'regenerated');
            $('article[data-snig="canDownload"], div[data-snig="canDownload"]').filter(function(){
                return $(this).find('.SNKMS_IG_DW_MAIN').length === 0
            }).removeAttr('data-snig');
        }

        // Whether is Instagram dialog?
        if(NoDialog == false){
            const maxCall = 100;
            let i = 0;
            var repeat = setInterval(() => {
                // section:visible > main > div > div[data-snig="canDownload"] > div > div > div > hr << (single foreground post in page, non-floating // <hr> element here is literally the line beneath poster's username) >>
                // section:visible > main > div > div.xdt5ytf[data-snig="canDownload"] << (former CSS selector for single foreground post in page, non-floating) >>
                // <hr> is much more unique element than "div.xdt5ytf"
                if(i > maxCall || $('article[data-snig="canDownload"], section:visible > main > div > div[data-snig="canDownload"] > div > div > div > hr, div[id^="mount"] > div > div > div.x1n2onr6.x1vjfegm div[data-snig="canDownload"]').length > 0){
                    clearInterval(repeat);

                    if(i > maxCall){
                        //alert('Trying to call button creation method reached to maximum try times. If you want to re-register method, please open script menu and press "Reload Script" button or hotkey "R" to reload main timer.');
                        console.warn('onReadyMyDW() Timer', 'maximum number of repetitions reached, terminated');
                    }
                }

                console.log('onReadyMyDW() Timer', 'repeating to call detection createDownloadButton()');
                createDownloadButton();
                i++;
            },50);
        }
        else{
            createDownloadButton();
        }
    }

    /**
     * getAppID
     * Get Instagram App ID
     *
     * @return {?integer}
     */
    function getAppID(){
        let result = null;
        $('script[type="application/json"]').each(function(){
            const regexp = /"APP_ID":"([0-9]+)"/ig;
            const matcher = $(this).text().match(regexp);
            if(matcher != null && result == null){
                result = [...$(this).text().matchAll(regexp)];
            }
        })

        return (result)?result.at(0).at(-1):null;
    }

    /**
     * updateLoadingBar
     * Update loading state
     *
     * @param  {Boolean}  isLoading - Check if loading state
     * @return {void}
     */
    function updateLoadingBar(isLoading){
        if(isLoading){
            $('div[id^="mount"] > div > div > div:first').removeClass('x1s85apg');
            $('div[id^="mount"] > div > div > div:first').css('z-index','20000');
        }
        else{
            $('div[id^="mount"] > div > div > div:first').addClass('x1s85apg');
            $('div[id^="mount"] > div > div > div:first').css('z-index','');
        }
    }

    /**
     * getMediaInfo
     * Get Instagram Media object
     *
     * @param  {String}  mediaId
     * @return {Object}
     */
    function getMediaInfo(mediaId){
        return new Promise((resolve,reject)=>{
            let getURL = `https://i.instagram.com/api/v1/media/${mediaId}/info/`;

            if(mediaId == null){
                alert("Can not call Media API because of the media id is invalid.");

                updateLoadingBar(false);
                reject(-1);
                return;
            }
            if(getAppID() == null){
                alert("Can not call Media API because of the app id is invalid.");

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
                onload: function(response) {
                    if(response.finalUrl == getURL){
                        let obj = JSON.parse(response.response);
                        resolve(obj);
                    }
                    else{
                        let finalURL = new URL(response.finalUrl);
                        if(finalURL.pathname.startsWith('/accounts/login')){
                            alert("The account must be logged in to access Media API.");
                        }
                        else{
                            alert('Unable to retrieve content because the API was redirected to "'+response.finalUrl+'"');
                        }
                        updateLoadingBar(false);
                        reject(-1);
                    }
                },
                onerror: function(err){
                    resolve(err);
                }
            });
        });
    }

    /**
     * getVisibleNodeIndex
     * Get element visible node
     *
     * @param  {Object}  $main
     * @return {Integer}
     */
    function getVisibleNodeIndex($main){
        var index = 0;
        // homepage classList
        var $dot = $main.find('.x1iyjqo2 > div > div:last-child > div');

        // dialog classList, main top classList
        if($dot == null || !$dot.hasClass('_acnb')){
            $dot = $main.find('._aatk > div > div:last-child').eq(0).children('div');
        }

        $dot.filter('._acnb').each(function(sIndex){
            if($(this).hasClass('_acnf')){
                index = sIndex;
            }
        });

        return index;
    }

    /**
     * initPostVideoFunction
     * Initialize settings related to the video resources in the post
     *
     * @param  {Object}  $mainElement
     * @return {Void}
     */
    function initPostVideoFunction($mainElement){
        // Disable video autoplay
        if(USER_SETTING.DISABLE_VIDEO_LOOPING){
            $mainElement.find('video').each(function(){
                if(!$(this).data('loop')){
                    console.log('(post) Added video event listener #loop');
                    $(this).on('ended',function(){
                        $(this).attr('data-loop', true);
                        this.pause();
                    });
                }
            });
        }

        // Modify Video Volume
        if(USER_SETTING.MODIFY_VIDEO_VOLUME){
            $mainElement.find('video').each(function(){
                if(!$(this).data('modify')){
                    console.log('(post) Added video event listener #modify');
                    this.volume = VIDEO_VOLUME;

                    $(this).on('play',function(){
                        this.volume = VIDEO_VOLUME;
                    });
                    $(this).on('playing',function(){
                        this.volume = VIDEO_VOLUME;
                    });
                    $(this).on('timeupdate',function(){
                        this.volume = VIDEO_VOLUME;
                    });

                    $(this).attr('data-modify', true);
                }
            });
        }

        if(USER_SETTING.HTML5_VIDEO_CONTROL){
            $mainElement.find('video').each(function(){
                if(!$(this).data('controls')){
                    console.log('(post) Added video html5 contorller #modify');
                    this.volume = VIDEO_VOLUME;

                    $(this).on('loadstart',function(){
                        this.volume = VIDEO_VOLUME;
                    });

                    $(this).on('volumechange',function(){
                        let $element_mute_button = $(this).parent().find('video + div > div').find('button[type="button"], div[role="button"]').filter(function(idx){
                            // This is mute/unmute's icon
                            return $(this).width() <= 64 && $(this).height() <= 64 && $(this).find('svg > path[d^="M16.636 7.028a1.5"], svg > path[d^="M1.5 13.3c-.8"]').length > 0;
                        });

                        var is_elelment_muted = $element_mute_button.find('svg > path[d^="M16.636"]').length === 0;

                        if(this.muted != is_elelment_muted){
                            this.volume = VIDEO_VOLUME;
                            $element_mute_button?.click();
                        }

                        if ($(this).attr('data-completed')){
                            VIDEO_VOLUME = this.volume;
                            GM_setValue('G_VIDEO_VOLUME', this.volume);
                        }

                        if(this.volume == VIDEO_VOLUME){
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


        var $buttonParent = $mainElement.find('video + div > div').first();
        $buttonParent.append('<div class="volume_slider bottom" />');
        $buttonParent.find('div.volume_slider').append(`<div><input type="range" max="1" min="0" step="0.05" value="${VIDEO_VOLUME}" /></div>`);
        $buttonParent.find('div.volume_slider input').attr('style',`--ig-track-progress: ${(VIDEO_VOLUME * 100) + '%'}`);
        $buttonParent.find('div.volume_slider input').on('input',function(){
            var percent = ($(this).val() * 100) + '%';

            VIDEO_VOLUME = $(this).val();
            GM_setValue('G_VIDEO_VOLUME', $(this).val());

            $(this).attr('style',`--ig-track-progress: ${percent}`);

            $mainElement.find('video').each(function(){
                console.log('(post) video volume changed #slider');
                this.volume = VIDEO_VOLUME;
            });
        });

        $buttonParent.find('div.volume_slider input').on('mouseenter',function(){
            var percent = (VIDEO_VOLUME * 100) + '%';
            $(this).attr('style',`--ig-track-progress: ${percent}`);
            $(this).val(VIDEO_VOLUME);
            $mainElement.find('video').each(function(){
                console.log('(post) video volume changed #slider');
                this.volume = VIDEO_VOLUME;
            });
        });

        $buttonParent.find('div.volume_slider').on('click',function(e){
            e.stopPropagation();
            e.preventDefault();
        });
    };

    /**
     * createDownloadButton
     * Create a download button in the upper right corner of each post
     *
     * @return {void}
     */
    function createDownloadButton(){
        // Add download icon per each posts
        $('article[class], section:visible > main > div > div > div > div > div > hr').map(function(index){
            return $(this).is('section:visible > main > div > div > div > div > div > hr') ? $(this).parent().parent().parent().parent()[0] : this;
        }).filter(function(){
            return $(this).height() > 0 && $(this).width() > 0
        })
            .each(function(index){
            // If it is have not download icon
            // class x1iyjqo2 mean user profile pages post list container
            if(!$(this).attr('data-snig') && !$(this).hasClass('x1iyjqo2') && !$(this).children('article')?.hasClass('x1iyjqo2') && $(this).parents('div#scrollview').length === 0){
                console.log("Found post container", $(this));

                var rightPos = 15;
                var topPos = 15;
                var $mainElement = $(this);
                var tagName = this.tagName;

                // not loop each in single top post
                if(tagName === "DIV" && index != 0){
                    return;
                }

                // New post UI by Discord: ken
                // NOT WORKING
                /*
                if(tagName === "DIV" && $(this).attr('role') === "presentation"){
                    rightPos = 28;
                    topPos = 75;
                    $mainElement = $('div._aap0[role="presentation"]').parents('div._aamm').parent().parent().parent().parent().parent();
                }
                */

                const $childElement = $mainElement.children("div").children("div");

                if($childElement.length === 0) return;

                console.log("Found insert point", $childElement);

                // Modify carousel post counter's position to not interfere with our buttons
                if($mainElement.find('._acay').length > 0){
                    if($mainElement.find('._acay + .x24i39r').length > 0){
                        $mainElement.find('._acay + .x24i39r').css('top', '37px');
                    }

                    const observeNode = $mainElement.find('._acay').first().parent()[0];
                    var observer = new MutationObserver(function (mutation, owner) {
                        $mainElement.find('._acay + .x24i39r').css('top', '37px');
                    });

                    observer.observe(observeNode, {
                        childList: true
                    });
                }

                // Add icons
                const DownloadElement = `<div title="${_i18n("DW")}" class="SNKMS_IG_DW_MAIN" style="right:${rightPos}px;top:${topPos}px;">${SVG.DOWNLOAD}</div>`;
                const NewTabElement = `<div title="${_i18n("NEW_TAB")}" class="SNKMS_IG_NEWTAB_MAIN" style="right:${rightPos + 35}px;top:${topPos}px;">${SVG.NEW_TAB}</div>`;
                const ThumbnailElement = `<div title="${_i18n("THUMBNAIL_INTRO")}" class="SNKMS_IG_THUMBNAIL_MAIN" style="right:${rightPos + 70}px;top:${topPos}px;">${SVG.THUMBNAIL}</div>`;

                $childElement.eq((tagName === "DIV")? 0 : $childElement.length - 2).append(DownloadElement);
                $childElement.eq((tagName === "DIV")? 0 : $childElement.length - 2).append(NewTabElement);

                setTimeout(()=>{
                    // Check if visible post is video
                    if($childElement.eq((tagName === "DIV")? 0 : $childElement.length - 2).find('div > ul li._acaz').length === 0){
                        if($childElement.find('video').length > 0){
                            $childElement.eq((tagName === "DIV")? 0 : $childElement.length - 2).append(ThumbnailElement);
                        }
                    }
                    else{
                        const checkVideoNode = function(target){
                            if(target){
                                var k = $(target).find('li._acaz').length;
                                var $targetNode = null;

                                if(k == 2){
                                    var index = getVisibleNodeIndex($mainElement);
                                    // First node
                                    if(index === 0){
                                        $targetNode = $(target).find('li._acaz').first();
                                    }
                                    // Last node
                                    else{
                                        $targetNode = $(target).find('li._acaz').last();
                                    }
                                }
                                // Middle node
                                else{
                                    $targetNode = $(target).find('li._acaz').eq(1);
                                }

                                // Check if video?
                                if($targetNode != null && $targetNode.length > 0 && $targetNode.find('video').length > 0){
                                    $childElement.eq((tagName === "DIV")? 0 : $childElement.length - 2).append(ThumbnailElement);
                                    initPostVideoFunction($mainElement);
                                }
                                else{
                                    $childElement.find('.SNKMS_IG_THUMBNAIL_MAIN')?.remove();
                                }
                            }
                        };

                        var observer = new MutationObserver(function (mutation, owner) {
                            var target = mutation.at(0)?.target;
                            checkVideoNode(target);
                        });

                        const element = $childElement.eq((tagName === "DIV")? 0 : $childElement.length - 2).find('div > ul li._acaz')?.parent()[0];
                        const elementAttr = $childElement.eq((tagName === "DIV")? 0 : $childElement.length - 2).find('div > ul li._acaz')?.parent().parent()[0];

                        if(element){
                            checkVideoNode(element);
                            observer.observe(element, {
                                childList: true
                            });
                        }

                        if(elementAttr){
                            observer.observe(elementAttr, {
                                attributes: true
                            });
                        }
                    }
                }, 50);


                $childElement.css('position','relative');

                initPostVideoFunction($mainElement);

                $(this).on('click', '.SNKMS_IG_THUMBNAIL_MAIN', function(e){
                    updateLoadingBar(true);

                    GL_username = $(this).parent().parent().parent().attr('data-username');
                    GL_postPath = location.pathname.replace(/\/$/,'').split('/').at(-1) || $(this).parent().parent().parent().find('a[href^="/p/"]').first().attr("href").split("/").at(2) || $(this).parent().parent().children("div:last-child").children("div").children("div:last-child").find('a[href^="/p/"]').last().attr("href").split("/").at(2);

                    var $main = $(this).parent().parent().parent();
                    var index = getVisibleNodeIndex($main);

                    IG_createDM(true, false);

                    createMediaListDOM(GL_postPath,".IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY", "").then(()=>{
                        let checkBlob = setInterval(()=>{
                            if($('.IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY a').length > 0){
                                clearInterval(checkBlob);
                                var $videoThumbnail = $('.IG_SN_DIG .IG_SN_DIG_BODY a[data-globalindex="'+(index+1)+'"]')?.parent().find('.videoThumbnail')?.first();

                                if($videoThumbnail != null && $videoThumbnail.length > 0){
                                    $videoThumbnail.click();
                                }
                                else{
                                    alert('Can not find thumbnail url.');
                                }

                                updateLoadingBar(false);
                                $('.IG_SN_DIG').remove();
                            }
                        },250);
                    });
                });

                $(this).on('click', '.SNKMS_IG_NEWTAB_MAIN', function(e){
                    updateLoadingBar(true);

                    GL_username = $(this).parent().parent().parent().attr('data-username');
                    GL_postPath = location.pathname.replace(/\/$/,'').split('/').at(-1) || $(this).parent().parent().parent().find('a[href^="/p/"]').first().attr("href").split("/").at(2) || $(this).parent().parent().children("div:last-child").children("div").children("div:last-child").find('a[href^="/p/"]').last().attr("href").split("/").at(2);

                    var $main = $(this).parent().parent().parent();
                    var index = getVisibleNodeIndex($main);

                    IG_createDM(true, false);

                    createMediaListDOM(GL_postPath,".IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY", "").then(()=>{
                        let checkBlob = setInterval(()=>{
                            if($('.IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY a').length > 0){
                                clearInterval(checkBlob);
                                var $linkElement = $('.IG_SN_DIG .IG_SN_DIG_BODY a[data-globalindex="'+(index+1)+'"]');

                                if(USER_SETTING.FORCE_RESOURCE_VIA_MEDIA && USER_SETTING.NEW_TAB_ALWAYS_FORCE_MEDIA_IN_POST){
                                    triggerLinkElement( $linkElement.first()[0], true);
                                }
                                else{
                                    let href = $linkElement?.attr('data-href');
                                    if(href){
                                        // replace https://instagram.ftpe8-2.fna.fbcdn.net/ to https://scontent.cdninstagram.com/ becase of same origin policy (some video)
                                        var urlObj = new URL(href);
                                        urlObj.host = 'scontent.cdninstagram.com';

                                        openNewTab(urlObj.href);
                                    }
                                    else{
                                        alert('Can not find open tab url.');
                                    }
                                }

                                updateLoadingBar(false);
                                $('.IG_SN_DIG').remove();
                            }
                        },250);
                    });
                });

                // Running if user click the download icon
                $(this).on('click','.SNKMS_IG_DW_MAIN', async function(e){
                    GL_username = $(this).parent().parent().parent().attr('data-username');
                    GL_postPath = location.pathname.replace(/\/$/,'').split('/').at(-1) || $(this).parent().parent().parent().find('a[href^="/p/"]').first().attr("href").split("/").at(2) || $(this).parent().parent().children("div:last-child").children("div").children("div:last-child").find('a[href^="/p/"]').last().attr("href").split("/").at(2);

                    // Create element that download dailog
                    IG_createDM(USER_SETTING.DIRECT_DOWNLOAD_ALL, true);

                    $("#article-id").html(`<a href="https://www.instagram.com/p/${GL_postPath}">${GL_postPath}</a>`);

                    if(USER_SETTING.DIRECT_DOWNLOAD_VISIBLE_RESOURCE){
                        updateLoadingBar(true);
                        IG_setDM(true);

                        var index = getVisibleNodeIndex($(this).parent().parent().parent());

                        createMediaListDOM(GL_postPath,".IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY", "").then(()=>{
                            let checkBlob = setInterval(()=>{
                                if($('.IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY a').length > 0){
                                    clearInterval(checkBlob);
                                    var href = $('.IG_SN_DIG .IG_SN_DIG_BODY a[data-globalindex="'+(index+1)+'"]')?.attr('data-href');

                                    if(href){
                                        updateLoadingBar(false);
                                        $('.IG_SN_DIG .IG_SN_DIG_BODY a[data-globalindex="'+(index+1)+'"]')?.click();
                                    }
                                    else{
                                        alert('Can not find download url.');
                                    }

                                    $('.IG_SN_DIG').remove();
                                }
                            },250);
                        });

                        return;
                    }

                    if(!USER_SETTING.DIRECT_DOWNLOAD_ALL){
                        // Find video/image element and add the download icon
                        var s = 0;
                        var multiple = $(this).parent().parent().find('._acay ._acaz').length;
                        var pathname = window.location.pathname;
                        var fullpathname = "/"+pathname.split('/')[1]+"/"+pathname.split('/')[2]+"/";
                        var blob = USER_SETTING.FORCE_FETCH_ALL_RESOURCES;
                        var publish_time = new Date($(this).parent().parent().find('a[href^="/p/"] time[datetime]').first().attr('datetime')).getTime();

                        // If posts have more than one images or videos.
                        if(multiple){
                            $(this).parent().find('._acay ._acaz').each(function(){
                                let element_videos = $(this).parent().parent().find('video');
                                //if(element_videos && element_videos.attr('src') && element_videos.attr('src').match(/^blob:/ig)){
                                if(element_videos && element_videos.attr('src')){
                                    blob = true;
                                }
                            });


                            if(blob || USER_SETTING.FORCE_RESOURCE_VIA_MEDIA){
                                createMediaListDOM(GL_postPath,".IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY",_i18n("LOAD_BLOB_MULTIPLE"));
                            }
                            else{
                                $(this).parent().find('._acay ._acaz').each(function(){
                                    s++;
                                    let element_videos = $(this).find('video');
                                    let element_images = $(this).find('._aagv img');
                                    let imgLink = (element_images.attr('srcset'))?element_images.attr('srcset').split(" ")[0]:element_images.attr('src');

                                    if(element_videos && element_videos.attr('src')){
                                        blob = true;
                                    }
                                    if(element_images && imgLink){
                                        $('.IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY').append(`<a datetime="${publish_time}" data-needed="direct" data-path="${GL_postPath}" data-name="photo" data-type="jpg" data-globalIndex="${s}" href="javascript:;" data-href="${imgLink}"><img width="100" src="${imgLink}" /><br/>- ${_i18n("IMG")} ${s} -</a>`);
                                    }

                                });

                                if(blob){
                                    createMediaListDOM(GL_postPath,".IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY",_i18n("LOAD_BLOB_RELOAD"));
                                }
                            }
                        }
                        else{
                            if(USER_SETTING.FORCE_RESOURCE_VIA_MEDIA){
                                createMediaListDOM(GL_postPath,".IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY",_i18n("LOAD_BLOB_MULTIPLE"));
                            }
                            else{
                                s++;
                                let element_videos = $(this).parent().parent().find('video');
                                let element_images = $(this).parent().parent().find('._aagv img');
                                let imgLink = (element_images.attr('srcset'))?element_images.attr('srcset').split(" ")[0]:element_images.attr('src');


                                if(element_videos && element_videos.attr('src')){
                                    createMediaListDOM(GL_postPath,".IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY",_i18n("LOAD_BLOB_ONE"));
                                }
                                if(element_images && imgLink){
                                    $('.IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY').append(`<a datetime="${publish_time}" data-needed="direct" data-path="${GL_postPath}" data-name="photo" data-type="jpg" data-globalIndex="${s}" href="javascript:;" href="" data-href="${imgLink}"><img width="100" src="${imgLink}" /><br/>- ${_i18n("IMG")} ${s} -</a>`);
                                }
                            }
                        }
                    }

                    $('.IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY a').each(function(){
                        $(this).wrap('<div></div>');
                        $(this).before('<label class="inner_box_wrapper"><input class="inner_box" type="checkbox"><span></span></label>');
                        $(this).after(`<div title="${_i18n("NEW_TAB")}" class="newTab">${SVG.NEW_TAB}</div>`);

                        if($(this).attr('data-name') == 'video'){
                            $(this).after(`<div title="${_i18n("THUMBNAIL_INTRO")}" class="videoThumbnail">${SVG.THUMBNAIL}</div>`);
                        }
                    });

                    if(USER_SETTING.DIRECT_DOWNLOAD_ALL){
                        createMediaListDOM(GL_postPath,".IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY",_i18n("LOAD_BLOB_MULTIPLE")).then(()=>{
                            let checkBlob = setInterval(()=>{
                                if($('.IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY a').length > 0){
                                    clearInterval(checkBlob);
                                    $('.IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY a').each(function(){
                                        $(this).click();
                                    });

                                    $('.IG_SN_DIG').remove();
                                }
                            },250);
                        });
                    }
                });

                // Add the mark that download is ready
                var username = $(this).find("header > div:last-child > div:first-child span a").first().text();

                $(this).attr('data-snig','canDownload');
                $(this).attr('data-username',username);
            }
        });
    }

    /**
     * createMediaListDOM
     * Create a list of media elements from post URLs
     *
     * @param  {String}  postURL
     * @param  {String}  selector - Use CSS element selectors to choose where it appears.
     * @param  {String}  message - i18n display loading message
     * @return {void}
     */
    function createMediaListDOM(postURL,selector,message){
        return new Promise(async (resolve) => {
            $(`${selector} a`).remove();
            $(selector).append('<p id="_SNLOAD">'+ message +'</p>');
            let media = await getBlobMedia(postURL);

            let idx = 1;
            let resource = media.shortcode_media;

            // GraphVideo
            if(resource.__typename == "GraphVideo" && resource.video_url){
                $(selector).append(`<a media-id="${resource.id}" datetime="${resource.taken_at_timestamp}" data-blob="true" data-needed="direct" data-path="${resource.shortcode}" data-name="video" data-type="mp4" data-username="${resource.owner.username}" data-globalIndex="${idx}" href="javascript:;" data-href="${resource.video_url}"><img width="100" src="${resource.display_resources[1].src}" /><br/>- ${_i18n("VID")} ${idx} -</a>`);
                idx++;
            }
            // GraphImage
            if(resource.__typename == "GraphImage"){
                $(selector).append(`<a media-id="${resource.id}" datetime="${resource.taken_at_timestamp}" data-blob="true" data-needed="direct" data-path="${resource.shortcode}" data-name="photo" data-type="jpg" data-username="${resource.owner.username}" data-globalIndex="${idx}" href="javascript:;" data-href="${resource.display_resources[resource.display_resources.length - 1].src}"><img width="100" src="${resource.display_resources[1].src}" /><br/>- ${_i18n("IMG")} ${idx} -</a>`);
                idx++;
            }
            // GraphSidecar
            if(resource.__typename == "GraphSidecar" && resource.edge_sidecar_to_children){
                for(let e of resource.edge_sidecar_to_children.edges){
                    if(e.node.__typename == "GraphVideo"){
                        $(selector).append(`<a media-id="${e.node.id}" datetime="${resource.taken_at_timestamp}" data-blob="true" data-needed="direct" data-path="${resource.shortcode}" data-name="video" data-type="mp4" data-username="${resource.owner.username}" data-globalIndex="${idx}" href="javascript:;" data-href="${e.node.video_url}"><img width="100" src="${e.node.display_resources[1].src}" /><br/>- ${_i18n("VID")} ${idx} -</a>`);
                    }

                    if(e.node.__typename == "GraphImage"){
                        $(selector).append(`<a media-id="${e.node.id}" datetime="${resource.taken_at_timestamp}" data-blob="true" data-needed="direct" data-path="${resource.shortcode}" data-name="photo" data-type="jpg" data-username="${resource.owner.username}" data-globalIndex="${idx}" href="javascript:;" data-href="${e.node.display_resources[e.node.display_resources.length - 1].src}"><img width="100" src="${e.node.display_resources[1].src}" /><br/>- ${_i18n("IMG")} ${idx} -</a>`);
                    }
                    idx++;
                }
            }

            $("#_SNLOAD").remove();
            $('.IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY a').each(function(){
                $(this).wrap('<div></div>');
                $(this).before('<label class="inner_box_wrapper"><input class="inner_box" type="checkbox"><span></span></label>');
                $(this).after(`<div title="${_i18n("NEW_TAB")}" class="newTab">${SVG.NEW_TAB}</div>`);

                if($(this).attr('data-name') == 'video'){
                    $(this).after(`<div title="${_i18n("THUMBNAIL_INTRO")}" class="videoThumbnail">${SVG.THUMBNAIL}</div>`);
                }
            });

            resolve(true);
        });
    }

    /**
     * IG_createDM
     * A dialog showing a list of all media files in the post
     *
     * @param  {Boolean}  hasHidden
     * @param  {Boolean}  hasCheckbox
     * @return {void}
     */
    function IG_createDM(hasHidden, hasCheckbox){
        let isHidden = (hasHidden)?"hidden":"";
        $('body').append('<div class="IG_SN_DIG '+isHidden+'"><div class="IG_SN_DIG_BG"></div><div class="IG_SN_DIG_MAIN"><div class="IG_SN_DIG_TITLE"></div><div class="IG_SN_DIG_BODY"></div></div></div>');
        $('.IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_TITLE').append(`<div style="position:relative;min-height:36px;text-align:center;margin-bottom: 7px;"><div style="position:absolute;left:0px;line-height: 18px;"><kbd>Alt</kbd>+<kbd>Q</kbd> [${_i18n("CLOSE")}]</div><div style="line-height: 18px;">IG Helper</div><div id="post_info" style="line-height: 14px;font-size:14px;">Post ID: <span id="article-id"></span></div><div class="IG_SN_DIG_BTN">${SVG.CLOSE}</div></div>`);

        if(hasCheckbox){
            $('.IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_TITLE').append(`<div style="text-align: center;" id="button_group"></div>`);
            $('.IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_TITLE > div#button_group').append(`<button id="batch_download_selected">${_i18n('BATCH_DOWNLOAD_SELECTED')}</button>`);
            $('.IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_TITLE > div#button_group').append(`<button id="batch_download_direct">${_i18n('BATCH_DOWNLOAD_DIRECT')}</button>`);
            $('.IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_TITLE').append(`<label class="checkbox"><input value="yes" type="checkbox" />${_i18n('ALL_CHECK')}</label>`);
        }
    }

    /**
     * IG_setDM
     * Set a dialog status
     *
     * @param  {Boolean}  hasHidden
     * @return {void}
     */
    function IG_setDM(hasHidden){
        if($('.IG_SN_DIG').length){
            if(hasHidden){
                $('.IG_SN_DIG').addClass("hidden");
            }
            else{
                $('.IG_SN_DIG').removeClass("hidden");
            }
        }
    }

    /**
     * saveFiles
     * Download the specified media URL to the computer
     *
     * @param  {String}  downloadLink
     * @param  {String}  username
     * @param  {String}  sourceType
     * @param  {Integer}  timestamp
     * @param  {String}  filetype
     * @param  {String}  shortcode
     * @return {void}
     */
    function saveFiles(downloadLink,username,sourceType,timestamp,filetype,shortcode){
        setTimeout(()=>{
            updateLoadingBar(true);
            fetch(downloadLink).then(res => {
                return res.blob().then(dwel => {
                    updateLoadingBar(false);
                    createSaveFileElement(downloadLink,dwel,username,sourceType,timestamp,filetype,shortcode);
                });
            });
        }, 50);
    }

    /**
     * createSaveFileElement
     * Download the specified media with link element
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
    function createSaveFileElement(downloadLink,object,username,sourceType,timestamp,filetype,shortcode) {
        timestamp = parseInt(timestamp.toString().padEnd(13, '0'));

        if(USER_SETTING.RENAME_PUBLISH_DATE){
            timestamp = parseInt(timestamp.toString().padEnd(13, '0'));
        }

        const date = new Date(timestamp);

        const a = document.createElement("a");
        const original_name = new URL(downloadLink).pathname.split('/').at(-1).split('.').slice(0,-1).join('.');
        const year = date.getFullYear().toString();
        const month = (date.getMonth()+1).toString().padStart(2,'0');
        const day = date.getDate().toString().padStart(2,'0');
        const hour = date.getHours().toString().padStart(2,'0');
        const minute = date.getMinutes().toString().padStart(2,'0');
        const second = date.getSeconds().toString().padStart(2,'0');

        var filename = RENAME_FORMAT.toUpperCase();
        var replacements = {
            '%USERNAME%': username,
            '%SOURCE_TYPE%': sourceType,
            '%SHORTCODE%': (shortcode)?shortcode:'',
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

        filename = filename.replace(/%[\w\-]+%/g, function(str) {
            return replacements[str] || str;
        });

        const originally = username + '_' + original_name + '.' + filetype;

        a.href = URL.createObjectURL(object);
        a.setAttribute("download", (USER_SETTING.AUTO_RENAME)?filename+'.'+filetype:originally);
        a.click();
        a.remove();
    }

    /**
     * triggerLinkElement
     * Trigger the link element to start downloading the resource
     *
     * @param  {Object}  element
     * @return {void}
     */
    async function triggerLinkElement(element, isPreview) {
        let date = new Date().getTime();
        let timestamp = Math.floor(date / 1000);
        let username = ($(element).attr('data-username')) ? $(element).attr('data-username') : GL_username;

        if(!username && $(element).attr('data-path')){
            console.log('catching owner name from shortcode:',$(element).attr('data-href'));
            username = await getPostOwner($(element).attr('data-path'));
        }

        if(USER_SETTING.RENAME_PUBLISH_DATE && $(element).attr('datetime')){
            timestamp = parseInt($(element).attr('datetime'));
        }

        if(USER_SETTING.FORCE_RESOURCE_VIA_MEDIA){
            updateLoadingBar(true);
            let result = await getMediaInfo($(element).attr('media-id'));
            updateLoadingBar(false);

            if(result.status === 'ok'){
                var resource_url = null;
                if(result.items[0].video_versions){
                    resource_url = result.items[0].video_versions[0].url;
                }
                else{
                    resource_url = result.items[0].image_versions2.candidates[0].url;
                }

                if(isPreview){
                    let urlObj = new URL(resource_url);
                    urlObj.host = 'scontent.cdninstagram.com';

                    openNewTab(urlObj.href);
                }
                else{
                    saveFiles(resource_url, username, $(element).attr('data-name'),timestamp, $(element).attr('data-type'), $(element).attr('data-path'));
                }
            }
            else{
                if(USER_SETTING.USE_BLOB_FETCH_WHEN_MEDIA_RATE_LITMIT){
                    if(isPreview){
                        let urlObj = new URL($(element).attr('data-href'));
                        urlObj.host = 'scontent.cdninstagram.com';

                        openNewTab(urlObj.href);
                    }
                    else{
                        saveFiles($(element).attr('data-href'),username,$(element).attr('data-name'),timestamp,$(element).attr('data-type'), $(element).attr('data-path'));
                    }
                }
                else{
                    alert('Fetch failed from Media API. API response message: ' + result.message);
                }
                console.log(result);
            }
        }
        else{
            saveFiles($(element).attr('data-href'),username,$(element).attr('data-name'),timestamp,$(element).attr('data-type'), $(element).attr('data-path'));
        }
    }

    /**
     * translateText
     * i18n translation text
     *
     * @param  {String}  lang
     * @return {void}
     */
    function translateText(lang){
        var eLocale = {
            "en-US": {
                "SELECT_LANG": "English",
                "RELOAD_SCRIPT": "Reload Script",
                "DONATE": "Donate",
                "FEEDBACK": "Feedback",
                "NEW_TAB": "Open in New Tab",
                "SHOW_DOM_TREE": "Show DOM Tree",
                "SELECT_AND_COPY": "Select All and Copy from the Input Box",
                "DOWNLOAD_DOM_TREE": "Download DOM Tree as a Text File",
                "REPORT_GITHUB": "Report an Issue on GitHub",
                "REPORT_DISCORD": "Report an Issue on Discord Support Server",
                "DEBUG": "Debug Window",
                "CLOSE": "Close",
                "ALL_CHECK": "Select All",
                "BATCH_DOWNLOAD_SELECTED": "Download Selected Resources",
                "BATCH_DOWNLOAD_DIRECT": "Download All Resources",
                "IMG": "Image",
                "VID": "Video",
                "DW": "Download",
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
                "SCROLL_BUTTON": "Enable Scroll Buttons for Reels Page",
                "FORCE_RESOURCE_VIA_MEDIA": "Force Fetch Resource via Media API",
                "USE_BLOB_FETCH_WHEN_MEDIA_RATE_LITMIT": "Use Alternative Methods to Download When the Media API is Not Accessible",
                "NEW_TAB_ALWAYS_FORCE_MEDIA_IN_POST": "Always Use Media API for 'Open in New Tab' in Posts",
                "AUTO_RENAME_INTRO": "Auto rename file to custom format:\nCustom Format List: \n%USERNAME% - Username\n%SOURCE_TYPE% - Download Source\n%SHORTCODE% - Post Shortcode\n%YEAR% - Year when downloaded/published\n%2-YEAR% - Year (last two digits) when downloaded/published\n%MONTH% - Month when downloaded/published\n%DAY% - Day when downloaded/published\n%HOUR% - Hour when downloaded/published\n%MINUTE% - Minute when downloaded/published\n%SECOND% - Second when downloaded/published\n%ORIGINAL_NAME% - Original name of downloaded file\n%ORIGINAL_NAME_FIRST% - Original name of downloaded file (first part of name)\n\nIf set to false, the file name will remain unchanged.\nExample: instagram_321565527_679025940443063_4318007696887450953_n.jpg",
                "RENAME_SHORTCODE_INTRO": "Auto rename file to the following format:\nUSERNAME-TYPE-SHORTCODE-TIMESTAMP.FILETYPE\nExample: instagram-photo-CwkxyiVynpW-1670350000.jpg\n\nThis will ONLY work if [Automatically Rename Files] is set to TRUE.",
                "RENAME_PUBLISH_DATE_INTRO": "Sets the timestamp in the file rename format to the resource publish date (browser time zone).\n\nThis feature only works when [Automatically Rename Files] is set to TRUE.",
                "RENAME_LOCATE_DATE_INTRO": "Modify the renamed file timestamp date format to the browser's local time, and format it to your preferred regional date format.\n\nThis feature only works when [Automatically Rename Files] is set to TRUE.",
                "DISABLE_VIDEO_LOOPING_INTRO": "Disable video auto-looping in Reels and posts.",
                "HTML5_VIDEO_CONTROL_INTRO": "Display the HTML5 video controller in posts and Reels.\n\nThis will hide the custom video volume slider and replace it with the HTML5 controller. In Reels pages, the HTML5 controller can be hidden by right-clicking on the video to reveal the original details.",
                "REDIRECT_CLICK_USER_STORY_PICTURE_INTRO": "Redirect to a user's profile page when right-clicking on their avatar in the story area on the homepage.\nIf you use the middle mouse button to click, it will open in a new tab.",
                "FORCE_FETCH_ALL_RESOURCES_INTRO": "Force fetching of all resources (photos and videos) in a post via the Instagram API to remove the limit of three resources per post.",
                "DIRECT_DOWNLOAD_VISIBLE_RESOURCE_INTRO": "Directly download the current resources available in the post.",
                "DIRECT_DOWNLOAD_ALL_INTRO": "When you click the download button, all resources in the post will be forcibly fetched and downloaded.",
                "MODIFY_VIDEO_VOLUME_INTRO": "Modify the video playback volume in Reels and posts (right-click to open the volume setting slider).",
                "SCROLL_BUTTON_INTRO": "Enable scroll buttons for the lower right corner of the Reels page.",
                "FORCE_RESOURCE_VIA_MEDIA_INTRO": "The Media API will try to get the highest quality photo or video possible, but it may take longer to load.",
                "USE_BLOB_FETCH_WHEN_MEDIA_RATE_LITMIT_INTRO": "When the Media API reaches its rate limit or cannot be used for other reasons, the Forced Fetch API will be used to download resources (the resource quality may be slightly lower).",
                "NEW_TAB_ALWAYS_FORCE_MEDIA_IN_POST_INTRO": "The [Open in New Tab] button in posts will always use the Media API to obtain high-resolution resources."
            }
        };

        var resultUnsorted = Object.assign({}, eLocale, locale);
        var resultSorted = Object.keys(resultUnsorted).sort().reduce(
            (obj, key) => {
                obj[key] = resultUnsorted[key];
                return obj;
            }, {}
        );

        return resultSorted;
    }

    /**
     * _i18n
     * Perform i18n translation
     *
     * @param  {String}  text
     * @return {void}
     */
    function _i18n(text){
        const translate = translateText();

        if(translate[lang] != undefined && translate[lang][text] != undefined){
            return translate[lang][text];
        }
        else{
            return translate["en-US"][text];
        }
    }

    /**
     * showSetting
     * Show script settings window
     *
     * @return {void}
     */
    function showSetting(){
        $('.IG_SN_DIG').remove();
        IG_createDM();
        $('.IG_SN_DIG #post_info').text('Preference Settings');

        $('.IG_SN_DIG .IG_SN_DIG_TITLE > div').append('<select id="langSelect"></select><div style="font-size: 12px;">The newly selected language will be applied after refreshing the page.</div>');

        for(let o in translateText()){
            $('.IG_SN_DIG .IG_SN_DIG_TITLE > div #langSelect').append(`<option value="${o}" ${(lang == o)?'selected':''}>${translateText()[o].SELECT_LANG}</option>`);
        }

        for(let name in USER_SETTING){
            $('.IG_SN_DIG .IG_SN_DIG_BODY').append(`<label class="globalSettings${(CHILD_NODES.includes(name))?' child':''}" title="${_i18n(name+'_INTRO')}"><span>${_i18n(name)}</span> <input id="${name}" value="box" type="checkbox" ${(USER_SETTING[name] === true)?'checked':''}><div class="chbtn"><div class="rounds"></div></div></label>`);

            if(name === 'MODIFY_VIDEO_VOLUME'){
                $('.IG_SN_DIG .IG_SN_DIG_BODY input[id="'+name+'"]').parent('label').on('contextmenu', function(e){
                    e.preventDefault();
                    if($(this).find('#tempWrapper').length === 0){
                        $(this).append('<div id="tempWrapper"></div>');
                        $(this).children('#tempWrapper').append('<input value="' + VIDEO_VOLUME + '" type="range" min="0" max="1" step="0.05" />');
                        $(this).children('#tempWrapper').append('<input value="' + VIDEO_VOLUME + '" step="0.05" type="number" />');
                        $(this).children('#tempWrapper').append(`<div class="IG_SN_DIG_BTN">${SVG.CLOSE}</div>`);
                    }
                });
            }

            if(name === 'AUTO_RENAME'){
                $('.IG_SN_DIG .IG_SN_DIG_BODY input[id="'+name+'"]').parent('label').on('contextmenu', function(e){
                    e.preventDefault();
                    if($(this).find('#tempWrapper').length === 0){
                        $(this).append('<div id="tempWrapper"></div>');

                        $(this).children('#tempWrapper').append('<input id="date_format" value="' + RENAME_FORMAT + '" />');
                        $(this).children('#tempWrapper').append(`<div class="IG_SN_DIG_BTN">${SVG.CLOSE}</div>`);
                    }
                });
            }
        }
    }

    /**
     * showDebugDOM
     * Show full DOM tree
     *
     * @return {void}
     */
    function showDebugDOM(){
        $('.IG_SN_DIG').remove();
        IG_createDM();
        $('.IG_SN_DIG #post_info').text('IG Debug DOM Tree');

        $('.IG_SN_DIG .IG_SN_DIG_BODY').append(`<textarea style="font-family: monospace;width:100%;box-sizing: border-box;height:300px;background: transparent;" readonly></textarea>`);
        $('.IG_SN_DIG .IG_SN_DIG_BODY').append(`<span style="display:block;text-align:center;">`);
        $('.IG_SN_DIG .IG_SN_DIG_BODY span').append(`<button style="margin: 3px;" class="IG_DISPLAY_DOM_TREE"><a>${_i18n('SHOW_DOM_TREE')}</a></button>`);
        $('.IG_SN_DIG .IG_SN_DIG_BODY span').append(`<button style="margin: 3px;" class="IG_SELECT_DOM_TREE"><a>${_i18n('SELECT_AND_COPY')}</a></button>`);
        $('.IG_SN_DIG .IG_SN_DIG_BODY span').append(`<button style="margin: 3px;" class="IG_DOWNLOAD_DOM_TREE"><a>${_i18n('DOWNLOAD_DOM_TREE')}</a></button><br/>`);
        $('.IG_SN_DIG .IG_SN_DIG_BODY span').append(`<button style="margin: 3px;" class="IG_REPORT_GITHUB"><a href="https://github.com/SN-Koarashi/ig-helper/issues" target="_blank">${_i18n('REPORT_GITHUB')}</a></button>`);
        $('.IG_SN_DIG .IG_SN_DIG_BODY span').append(`<button style="margin: 3px;" class="IG_REPORT_DISCORD"><a href="https://discord.gg/Sh8HJ4d" target="_blank">${_i18n('REPORT_DISCORD')}</a></button>`);
    }

    /**
     * openNewTab
     * Open url in new tab
     *
     * @param  {String}  link
     * @return {void}
     */
    function openNewTab(link){
        var a = document.createElement('a');
        a.href = link;
        a.target = '_blank';

        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    /**
     * reloadScript
     * Re-register main timer
     *
     * @return {void}
     */
    function reloadScript(){
        clearInterval(GL_repeat);
        pageLoaded = false;
        firstStarted = false;
        currentURL = location.href;
        GL_observer.disconnect();

        console.log('main timer re-register completed');
    }

    /**
     * initSettings
     * Initialize preferences
     *
     * @return {void}
     */
    function initSettings(){
        for(let name in USER_SETTING){
            if(GM_getValue(name) != null && typeof GM_getValue(name) === 'boolean'){
                USER_SETTING[name] = GM_getValue(name);
            }
        }
    }

    // Running if document is ready
    $(function(){
        $('body').on('click','.IG_SN_DIG .IG_SN_DIG_BODY .IG_DISPLAY_DOM_TREE',function(){
            let text = $('div[id^="mount"]')[0];
            $('.IG_SN_DIG .IG_SN_DIG_BODY textarea').text("Location: " + location.pathname + "\nDOM Tree:\n" + text.innerHTML);
        });

        $('body').on('click','.IG_SN_DIG .IG_SN_DIG_BODY .IG_SELECT_DOM_TREE',function(){
            $('.IG_SN_DIG .IG_SN_DIG_BODY textarea').select();
            document.execCommand('copy');
        });

        $('body').on('click','.IG_SN_DIG .IG_SN_DIG_BODY .IG_DOWNLOAD_DOM_TREE',function(){
            var text = ($('.IG_SN_DIG .IG_SN_DIG_BODY textarea').text().length > 0)?$('.IG_SN_DIG .IG_SN_DIG_BODY textarea').text():"Location: " + location.pathname + "\nDOM Tree:\n" +$('div[id^="mount"]')[0].innerHTML;
            var a = document.createElement("a");
            var file = new Blob([text], {type: "text/plain"});
            a.href = URL.createObjectURL(file);
            a.download = "DOMTree.txt";

            document.body.appendChild(a);
            a.click();
            a.remove();
        });

        // Close the download dialog if user click the close icon
        $('body').on('click','.IG_SN_DIG_BTN, .IG_SN_DIG_BG',function(){
            if($(this).parent('#tempWrapper').length > 0){
                $(this).parent('#tempWrapper').fadeOut(250, function(){
                    $(this).remove();
                });
            }
            else{
                $('.IG_SN_DIG').remove();
            }
        });

        $(window).keydown(function(e){
            // Hot key [Alt+Q] to close the download dialog
            if (e.keyCode == '81' && e.altKey){
                $('.IG_SN_DIG').remove();
                e.preventDefault();
            }
            // Hot key [Alt+W] to open the settings dialog
            if (e.keyCode == '87' && e.altKey){
                showSetting();
                e.preventDefault();
            }

            // Hot key [Alt+Z] to open the settings dialog
            if (e.keyCode == '90' && e.altKey){
                showDebugDOM();
                e.preventDefault();
            }

            // Hot key [Alt+R] to open the settings dialog
            if (e.keyCode == '82' && e.altKey){
                reloadScript();
                e.preventDefault();
            }
        });

        $('body').on('change', '.IG_SN_DIG input',function(e){
            var name = $(this).attr('id');

            if(name && USER_SETTING[name] !== undefined){
                let isChecked =  $(this).prop('checked');
                GM_setValue(name, isChecked);
                USER_SETTING[name] = isChecked;

                console.log('user settings', name, isChecked);
            }
        });

        $('body').on('click', '.IG_SN_DIG .globalSettings',function(e){
            if($(this).find('#tempWrapper').length > 0){
                e.preventDefault();
            }
        });

        $('body').on('change', '.IG_SN_DIG #tempWrapper input:not(#date_format)',function(){
            let value = $(this).val();

            if($(this).attr('type') == 'range'){
                $(this).next().val(value);
            }
            else{
                $(this).prev().val(value);
            }

            if(value >= 0 && value <= 1){
                VIDEO_VOLUME = value;
                GM_setValue('G_VIDEO_VOLUME', value);
            }
        });

        $('body').on('input', '.IG_SN_DIG #tempWrapper input:not(#date_format)',function(e){
            if($(this).attr('type') == 'range'){
                let value = $(this).val();
                $(this).next().val(value);
            }
            else{
                let value = $(this).val();
                if(value >= 0 && value <= 1){
                    $(this).prev().val(value);
                }
                else{
                    if(value < 0){
                        $(this).val(0);
                    }
                    else{
                        $(this).val(1);
                    }
                }
            }
        });

        $('body').on('input', '.IG_SN_DIG #tempWrapper input#date_format',function(e){
            GM_setValue('G_RENAME_FORMAT', $(this).val());
            RENAME_FORMAT = $(this).val();
        });

        $('body').on('click','a[data-needed="direct"]', function(e){
            e.preventDefault();
            triggerLinkElement(this);
        });

        $('body').on('click','.IG_SN_DIG_BODY .newTab', function(){
            // replace https://instagram.ftpe8-2.fna.fbcdn.net/ to https://scontent.cdninstagram.com/ becase of same origin policy (some video)

            if(USER_SETTING.FORCE_RESOURCE_VIA_MEDIA && USER_SETTING.NEW_TAB_ALWAYS_FORCE_MEDIA_IN_POST){
                triggerLinkElement( $(this).parent().children('a').first()[0], true);
            }
            else{
                var urlObj = new URL($(this).parent().children('a').attr('data-href'));
                urlObj.host = 'scontent.cdninstagram.com';

                openNewTab(urlObj.href);
            }
        });

        $('body').on('click','.IG_SN_DIG_BODY .videoThumbnail', function(){
            saveFiles($(this).parent().children('a').find('img').first().attr('src'), $(this).parent().children('a').attr('data-username'), 'thumbnail', new Date().getTime(), 'jpg', $('#article-id').text());
        });

        // Running if user left-click download icon in stories
        $('body').on('click','.IG_DWSTORY',function(){
            onStory(true);
        });

        // Running if user left-click 'open in new tab' icon in stories
        $('body').on('click','.IG_DWNEWTAB',function(e){
            e.preventDefault();
            onStory(true, true, true);
        });

        // Running if user left-click download thumbnail icon in stories
        $('body').on('click','.IG_DWSTORY_THUMBNAIL',function(){
            onStoryThumbnail(true);
        });

        // Running if user left-click download icon in profile
        $('body').on('click','.IG_DWPROFILE',function(e){
            e.stopPropagation();
            onProfileAvatar(true);
        });

        // Running if user left-click download icon in highlight stories
        $('body').on('click','.IG_DWHISTORY',function(){
            onHighlightsStory(true);
        });

        // Running if user left-click 'open in new tab' icon in highlight stories
        $('body').on('click','.IG_DWHINEWTAB',function(e){
            e.preventDefault();
            onHighlightsStory(true, true);
        });

        // Running if user left-click thumbnail download icon in highlight stories
        $('body').on('click','.IG_DWHISTORY_THUMBNAIL',function(){
            onHighlightsStoryThumbnail(true);
        });

        // Running if user left-click download icon in reels
        $('body').on('click','.IG_REELS',function(){
            onReels(true,true);
        });

        // Running if user left-click newtab icon in reels
        $('body').on('click','.IG_REELS_NEWTAB',function(){
            onReels(true,true,true);
        });

        // Running if user left-click download icon in reels
        $('body').on('click','.IG_REELS_THUMBNAIL',function(){
            onReels(true,false);
        });

        // Running if user right-click profile picture in stories area
        $('body').on('mousedown','button[role="menuitem"]',function(e){
            // Right-Click || Middle-Click
            if(e.which === 3 || e.which === 2){
                if(location.href === 'https://www.instagram.com/' && USER_SETTING.REDIRECT_CLICK_USER_STORY_PICTURE){
                    e.preventDefault();
                    if($(this).find('canvas._aarh').length > 0){
                        const targetUrl = 'https://www.instagram.com/'+$(this).children('div').last().text();
                        if(e.which === 2){
                            GM_openInTab(targetUrl);
                        }
                        else{
                            location.href = targetUrl;
                        }
                    }
                }
            }
        });

        $('body').on('change', '.IG_SN_DIG_TITLE .checkbox', function(){
            var isChecked = $(this).find('input').prop('checked');
            $('.IG_SN_DIG_BODY .inner_box').each(function(){
                $(this).prop('checked', isChecked);
            });
        });

        $('body').on('change', '.IG_SN_DIG_BODY .inner_box', function(){
            var checked = $('.IG_SN_DIG_BODY .inner_box:checked').length;
            var total = $('.IG_SN_DIG_BODY .inner_box').length;


            $('.IG_SN_DIG_TITLE .checkbox').find('input').prop('checked', checked == total);
        });

        $('body').on('click', '.IG_SN_DIG_TITLE #batch_download_selected', function(){
            let index = 0;
            $('.IG_SN_DIG_BODY a[data-needed="direct"]').each(function(){
                if($(this).prev().children('input').prop('checked')){
                    $(this).click();
                    index++;
                }
            });

            if(index == 0){
                alert(_i18n('NO_CHECK_RESOURCE'));
            }
        });

        $('body').on('change', '.IG_SN_DIG_TITLE #langSelect', function(){
            GM_setValue('lang', $(this).val());
            lang = $(this).val();

            showSetting();
        });

        $('body').on('change', '.IG_SN_DIG_BODY #locateSelect', function(){
            $('#locatePreview').text(`${(new Date().toLocaleString($(this).val(), {hour12: false, second: "2-digit" ,minute: "2-digit", hour: "2-digit", month: "2-digit", day: "2-digit", year: "numeric"})).replaceAll('/','-')}`);
            LOCATE_DATE_FORMAT = $(this).val();
            GM_setValue('G_LOCATE_DATE_FORMAT', $(this).val());
        });

        $('body').on('click', '.IG_SN_DIG_TITLE #batch_download_direct', function(){
            $('.IG_SN_DIG_BODY a[data-needed="direct"]').each(function(){
                $(this).click();
            });
        });
    });
})(jQuery);
