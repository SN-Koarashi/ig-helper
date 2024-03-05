// ==UserScript==
// @name               IG Helper
// @name:zh-TW         IG小精靈
// @name:zh-CN         IG小助手
// @name:ja            IG助手
// @name:ko            IG조수
// @namespace          https://github.snkms.com/
// @version            2.22.1.1
// @description        Downloading is possible for both photos and videos from posts, as well as for stories, reels or profile picture.
// @description:zh-TW  一鍵下載對方 Instagram 貼文中的相片、影片甚至是他們的限時動態、連續短片及大頭貼圖片！
// @description:zh-CN  一键下载对方 Instagram 帖子中的相片、视频甚至是他们的快拍、Reels及头像图片！
// @description:ja     投稿された写真や動画だけでなく、ストーリーズやリール動画からもダウンロードが可能です。
// @description:ko     게시물에 게시된 사진과 동영상 뿐만 아니라 스토리나 릴스에서도 다운로드가 가능합니다.
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
// @require            https://code.jquery.com/jquery-3.6.3.min.js#sha256-pvPw+upLPUjgMXY0G+8O0xUf+/Im1MZjXxxgOcBQBXU=
// @resource           INTERNAL_CSS https://raw.githubusercontent.com/SN-Koarashi/ig-helper/master/style.css
// @supportURL         https://github.com/SN-Koarashi/ig-helper/
// @contributionURL    https://ko-fi.com/snkoarashi
// @icon               https://www.google.com/s2/favicons?domain=www.instagram.com
// @compatible         firefox >= 87
// @compatible         chrome >= 90
// @compatible         edge >= 90
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
        'AUTO_RENAME': (GM_getValue('AUTO_RENAME') != null && typeof GM_getValue('AUTO_RENAME') === 'boolean')?GM_getValue('AUTO_RENAME'):true,
        'RENAME_SHORTCODE': (GM_getValue('RENAME_SHORTCODE') != null && typeof GM_getValue('RENAME_SHORTCODE') === 'boolean')?GM_getValue('RENAME_SHORTCODE'):true,
        'RENAME_PUBLISH_DATE': (GM_getValue('RENAME_PUBLISH_DATE') != null && typeof GM_getValue('RENAME_PUBLISH_DATE') === 'boolean')?GM_getValue('RENAME_PUBLISH_DATE'):true,
        'DISABLE_VIDEO_LOOPING': (GM_getValue('DISABLE_VIDEO_LOOPING') != null && typeof GM_getValue('DISABLE_VIDEO_LOOPING') === 'boolean')?GM_getValue('DISABLE_VIDEO_LOOPING'):false,
        'REDIRECT_RIGHT_CLICK_USER_STORY_PICTURE': (GM_getValue('REDIRECT_RIGHT_CLICK_USER_STORY_PICTURE') != null && typeof GM_getValue('REDIRECT_RIGHT_CLICK_USER_STORY_PICTURE') === 'boolean')?GM_getValue('REDIRECT_RIGHT_CLICK_USER_STORY_PICTURE'):false,
        'FORCE_FETCH_ALL_RESOURCES': (GM_getValue('FORCE_FETCH_ALL_RESOURCES') != null && typeof GM_getValue('FORCE_FETCH_ALL_RESOURCES') === 'boolean')?GM_getValue('FORCE_FETCH_ALL_RESOURCES'):false,
        'DIRECT_DOWNLOAD_VISABLE_RESOURCE': (GM_getValue('DIRECT_DOWNLOAD_VISABLE_RESOURCE') != null && typeof GM_getValue('DIRECT_DOWNLOAD_VISABLE_RESOURCE') === 'boolean')?GM_getValue('DIRECT_DOWNLOAD_VISABLE_RESOURCE'):false,
        'DIRECT_DOWNLOAD_ALL': (GM_getValue('DIRECT_DOWNLOAD_ALL') != null && typeof GM_getValue('DIRECT_DOWNLOAD_ALL') === 'boolean')?GM_getValue('DIRECT_DOWNLOAD_ALL'):false,
        'MODIFY_VIDEO_VOLUME': (GM_getValue('MODIFY_VIDEO_VOLUME') != null && typeof GM_getValue('MODIFY_VIDEO_VOLUME') === 'boolean')?GM_getValue('MODIFY_VIDEO_VOLUME'):false,
        'SCROLL_BUTTON': (GM_getValue('SCROLL_BUTTON') != null && typeof GM_getValue('SCROLL_BUTTON') === 'boolean')?GM_getValue('SCROLL_BUTTON'):true,
        'FORCE_RESOURCE_VIA_MEDIA': (GM_getValue('FORCE_RESOURCE_VIA_MEDIA') != null && typeof GM_getValue('FORCE_RESOURCE_VIA_MEDIA') === 'boolean')?GM_getValue('FORCE_RESOURCE_VIA_MEDIA'):false,
        'USE_BLOB_FETCH_WHEN_MEDIA_RATE_LITMIT': (GM_getValue('USE_BLOB_FETCH_WHEN_MEDIA_RATE_LITMIT') != null && typeof GM_getValue('USE_BLOB_FETCH_WHEN_MEDIA_RATE_LITMIT') === 'boolean')?GM_getValue('USE_BLOB_FETCH_WHEN_MEDIA_RATE_LITMIT'):false
    };
    const CHILD_NODES = ['RENAME_SHORTCODE', 'RENAME_PUBLISH_DATE', 'USE_BLOB_FETCH_WHEN_MEDIA_RATE_LITMIT'];
    var VIDEO_VOLUME = (GM_getValue('G_VIDEO_VOLUME'))?GM_getValue('G_VIDEO_VOLUME'):1;
    var TEMP_FETCH_RATE_LITMIT = false;
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

    var lang = GM_getValue('lang') || navigator.language || navigator.userLanguage;
    var currentURL = location.href;
    var firstStarted = false;
    var pageLoaded = false;

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
        clearInterval(GL_repeat);
        pageLoaded = false;
        firstStarted = false;
        currentURL = location.href;
        GL_observer.disconnect();
    },{
        accessKey: "r"
    });

    // Main Timer
    var timer = setInterval(function(){
        // page loading
        if(!$('div#splash-screen').is(':hidden')) return;

        if(currentURL != location.href || !firstStarted || !pageLoaded){
            console.log('Main Timer', 'trigging');

            clearInterval(GL_repeat);
            pageLoaded = false;
            firstStarted = true;
            currentURL = location.href;
            GL_observer.disconnect();

            if(location.href.startsWith("https://www.instagram.com/p/") || location.href.startsWith("https://www.instagram.com/reel/")){
                GL_dataCache.stories = {};

                console.log('isDialog');

                // This is to prevent the detection of the "Modify Video Volume" setting from being too slow.
                setTimeout(()=>{
                    onReadyMyDW(false);
                }, 5);

                // This is a delayed function call that prevents the dialog element from appearing before the function is called.
                setTimeout(()=>{
                    onReadyMyDW(false);
                }, 250);
                setTimeout(()=>{
                    onReadyMyDW(false);
                }, 450);

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

                console.log('isHomepage');
                setTimeout(()=>{
                    onReadyMyDW(false);

                    const element = $('div[id^="mount"] > div > div div > section > main div:not([class]):not([style]) > div > article')?.parent()[0];
                    if(element){
                        GL_observer.observe(element, {
                            childList: true
                        });
                    }
                },150);

                pageLoaded = true;
            }
            if($('div[id^="mount"] > div > div > div').first().is(':hidden') && $('canvas._aarh, div._aadm').length && location.href.match(/^(https:\/\/www\.instagram\.com\/)([0-9A-Za-z\.\-_]+)\/?(tagged|reels)?\/?$/ig) && !location.href.match(/^(https:\/\/www\.instagram\.com\/(stories|explore)\/?)/ig)){
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
                    onStory(false);
                    onStoryThumbnail(false);

                    if($(".IG_DWSTORY").length) setTimeout(()=>{pageLoaded = true;},150);
                }
                else{
                    pageLoaded = false;
                    // Remove the download icon
                    $('.IG_DWSTORY').remove();
                    $('.IG_DWSTORY_THUMBNAIL').remove();
                }
            }

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

                    $('body > div main canvas._aarh, body > div main div._aadm').parent().append(`<div title="${_i18n("DW")}" class="IG_DWPROFILE">${SVG.DOWNLOAD}</div>`);
                    $('body > div main canvas._aarh, body > div main div._aadm').parent().css('position','relative');
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
                // GitHub issue #3: DiceMast3r
                if($element.length === 0){
                    let $$element = $('body > div div:not([hidden]) section:visible > div div[style]:not([class]) > div');
                    let nowSize = 0;

                    $$element.each(function(){
                        if($(this).width() > nowSize){
                            nowSize = $(this).width();
                            $element = $(this);
                        }
                    });
                }


                if($element != null){
                    //$element.css('position','relative');
                    $element.append(`<div title="${_i18n("DW")}" class="IG_DWHISTORY">${SVG.DOWNLOAD}</div>`);
                    $element.append(`<div title="${_i18n("NEW_TAB")}" class="IG_DWHINEWTAB">${SVG.THUMBNAIL}</div>`);
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
                // Add the stories download button
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
                    // GitHub issue #3: DiceMast3r
                    if($element.length === 0){
                        let $$element = $('body > div div:not([hidden]) section:visible > div div[style]:not([class]) > div');
                        let nowSize = 0;

                        $$element.each(function(){
                            if($(this).width() > nowSize){
                                nowSize = $(this).width();
                                $element = $(this);
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


                // Detecter for div layout mode
                // GitHub issue #3: DiceMast3r
                if($element.length === 0){
                    let $$element = $('body > div div:not([hidden]) section:visible > div div[style]:not([class]) > div');
                    let nowSize = 0;

                    $$element.each(function(){
                        if($(this).width() > nowSize){
                            nowSize = $(this).width();
                            $element = $(this);
                        }
                    });
                }


                if($element != null){
                    $element.css('position','relative');
                    $element.append(`<div title="${_i18n("DW")}" class="IG_DWSTORY">${SVG.DOWNLOAD}</div>`);
                    $element.append(`<div title="${_i18n("NEW_TAB")}" class="IG_DWNEWTAB">${SVG.NEW_TAB}</div>`);
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
            if($('body > div section video.xh8yej3').length){
                // Add the stories download button
                if(!$('.IG_DWSTORY_THUMBNAIL').length){
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

                    // Detecter for div layout mode
                    // GitHub issue #3: DiceMast3r
                    if($element.length === 0){
                        let $$element = $('body > div div:not([hidden]) section:visible > div div[style]:not([class]) > div');
                        let nowSize = 0;

                        $$element.each(function(){
                            if($(this).width() > nowSize){
                                nowSize = $(this).width();
                                $element = $(this);
                            }
                        });
                    }


                    if($element != null){
                        $element.css('position','relative');
                        $element.append(`<div title="${_i18n("THUMBNAIL_INTRO")}" class="IG_DWSTORY_THUMBNAIL">${SVG.THUMBNAIL}</div>`);
                    }
                }
            }
            else{
                $('.IG_DWSTORY_THUMBNAIL').remove();
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

                    $('section > main[role="main"] > div').children('div').each(function(){
                        if($(this).children().length > 0){
                            if(!$(this).children().find('.IG_REELS').length){
                                $(this).children().css('position','relative');

                                $(this).children().append(`<div title="${_i18n("DW")}" class="IG_REELS">${SVG.DOWNLOAD}</div>`);
                                $(this).children().append(`<div title="${_i18n("NEW_TAB")}" class="IG_REELSNEWTAB">${SVG.NEW_TAB}</div>`);
                                $(this).children().append(`<div title="${_i18n("THUMBNAIL_INTRO")}" class="IG_REELS_THUMBNAIL">${SVG.THUMBNAIL}</div>`);

                                // Disable video autoplay
                                if(USER_SETTING.DISABLE_VIDEO_LOOPING){
                                    $(this).find('video').each(function(){
                                        if(!$(this).data('loop')){
                                            console.log('(reel) Added video event listener #loop');
                                            $(this).on('ended',function(){
                                                $(this).attr('data-loop', true);
                                                let $element = $(this).next().find('div[role="presentation"] > div > div:last-child');

                                                if($element.length > 0){
                                                    $element.click();
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
                        if(pos.user.username === username){
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
     * @param  {Boolean}  NoDialog - Check if it not showing the dialog
     * @return {void}
     */
    function onReadyMyDW(NoDialog){
        // Whether is Instagram dialog?
        if(NoDialog == false){
            var repeat = setInterval(() => {
                // div.xdt5ytf << (sigle post in top, not floating) >>
                if($('article[data-snig="canDownload"], section:visible > main > div > div.xdt5ytf[data-snig="canDownload"], div[id^="mount"] > div > div > div.x1n2onr6.x1vjfegm div[data-snig="canDownload"]').length > 0) clearInterval(repeat);
                createDownloadButton();
            },5);
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
                    let obj = JSON.parse(response.response);
                    resolve(obj);
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
     * createDownloadButton
     * Create a download button in the upper right corner of each post
     *
     * @return {void}
     */
    function createDownloadButton(){
        // Add download icon per each posts
        $('article, section:visible > main > div > div.xdt5ytf, div._aap0[role="presentation"]').each(function(index){
            // If it is have not download icon
            // class x1iyjqo2 mean user profile pages post list container
            if(!$(this).attr('data-snig') && !$(this).hasClass('x1iyjqo2') && !$(this).children('article')?.hasClass('x1iyjqo2')){
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

                // Disable video autoplay
                if(USER_SETTING.DISABLE_VIDEO_LOOPING){
                    $(this).find('video').each(function(){
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
                    $(this).find('video').each(function(){
                        if(!$(this).data('modify')){
                            console.log('(post) Added video event listener #modify');
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

                $(this).on('click', '.SNKMS_IG_THUMBNAIL_MAIN', function(e){
                    updateLoadingBar(true);

                    GL_username = $(this).parent().parent().parent().attr('data-username');
                    GL_postPath = location.pathname.replace(/\/$/,'').split('/').at(-1) || $(this).parent().parent().parent().find('a[href^="/p/"]').first().attr("href").split("/").at(2) || $(this).parent().parent().children("div:last-child").children("div").children("div:last-child").find('a[href^="/p/"]').last().attr("href").split("/").at(2);

                    var $main = $(this).parent().parent().parent();
                    var index = getVisibleNodeIndex($main);

                    IG_createDM(true, false);

                    createMediaListDOM(GL_postPath,".IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY", "");
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

                $(this).on('click', '.SNKMS_IG_NEWTAB_MAIN', function(e){
                    updateLoadingBar(true);

                    GL_username = $(this).parent().parent().parent().attr('data-username');
                    GL_postPath = location.pathname.replace(/\/$/,'').split('/').at(-1) || $(this).parent().parent().parent().find('a[href^="/p/"]').first().attr("href").split("/").at(2) || $(this).parent().parent().children("div:last-child").children("div").children("div:last-child").find('a[href^="/p/"]').last().attr("href").split("/").at(2);

                    var $main = $(this).parent().parent().parent();
                    var index = getVisibleNodeIndex($main);

                    IG_createDM(true, false);

                    createMediaListDOM(GL_postPath,".IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY", "");
                    let checkBlob = setInterval(()=>{
                        if($('.IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY a').length > 0){
                            clearInterval(checkBlob);
                            var href = $('.IG_SN_DIG .IG_SN_DIG_BODY a[data-globalindex="'+(index+1)+'"]')?.attr('data-href');


                            if(href){
                                // replace https://instagram.ftpe8-2.fna.fbcdn.net/ to https://scontent.cdninstagram.com/ becase of same origin policy (some video)
                                var urlObj = new URL(href);
                                urlObj.host = 'scontent.cdninstagram.com';

                                openNewTab(urlObj.href);
                            }
                            else{
                                alert('Can not find open tab url.');
                            }

                            updateLoadingBar(false);
                            $('.IG_SN_DIG').remove();
                        }
                    },250);
                });

                // Running if user click the download icon
                $(this).on('click','.SNKMS_IG_DW_MAIN', async function(e){
                    GL_username = $(this).parent().parent().parent().attr('data-username');
                    GL_postPath = location.pathname.replace(/\/$/,'').split('/').at(-1) || $(this).parent().parent().parent().find('a[href^="/p/"]').first().attr("href").split("/").at(2) || $(this).parent().parent().children("div:last-child").children("div").children("div:last-child").find('a[href^="/p/"]').last().attr("href").split("/").at(2);

                    // Create element that download dailog
                    IG_createDM(USER_SETTING.DIRECT_DOWNLOAD_ALL, true);

                    $("#article-id").html(`<a href="https://www.instagram.com/p/${GL_postPath}">${GL_postPath}</a>`);

                    if(USER_SETTING.DIRECT_DOWNLOAD_VISABLE_RESOURCE){
                        updateLoadingBar(true);
                        IG_setDM(true);

                        createMediaListDOM(GL_postPath,".IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY", "");

                        var index = getVisibleNodeIndex($(this).parent().parent().parent());
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

                        return;
                    }

                    if(!USER_SETTING.DIRECT_DOWNLOAD_ALL){
                        // Find video/image element and add the download icon
                        var s = 0;
                        var multiple = $(this).parent().parent().find('._aap0 ._acaz').length;
                        var pathname = window.location.pathname;
                        var fullpathname = "/"+pathname.split('/')[1]+"/"+pathname.split('/')[2]+"/";
                        var blob = USER_SETTING.FORCE_FETCH_ALL_RESOURCES;
                        var publish_time = new Date($(this).parent().parent().find('a[href^="/p/"] time[datetime]').first().attr('datetime')).getTime();

                        // If posts have more than one images or videos.
                        if(multiple){
                            $(this).parent().find('._aap0 ._acaz').each(function(){
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
                                $(this).parent().find('._aap0 ._acaz').each(function(){
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
                        createMediaListDOM(GL_postPath,".IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY",_i18n("LOAD_BLOB_MULTIPLE"));
                        let checkBlob = setInterval(()=>{
                            if($('.IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY a').length > 0){
                                clearInterval(checkBlob);
                                $('.IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY a').each(function(){
                                    $(this).click();
                                });

                                $('.IG_SN_DIG').remove();
                            }
                        },250);
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
    async function createMediaListDOM(postURL,selector,message){
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
        timestamp = parseInt(timestamp.toString().padEnd(13, '0')) / 1000;

        if(USER_SETTING.RENAME_PUBLISH_DATE){
            timestamp = new Date(timestamp * 1000).toISOString();
        }

        const a = document.createElement("a");
        const name = username+'-'+sourceType+'-'+((USER_SETTING.RENAME_SHORTCODE && shortcode)?shortcode+'-':'')+timestamp+'.'+filetype;
        const originally = username + '_' + new URL(downloadLink).pathname.split('/').at(-1).split('.').slice(0,-1).join('.') + '.' + filetype;

        a.href = URL.createObjectURL(object);
        a.setAttribute("download", (USER_SETTING.AUTO_RENAME)?name:originally);
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
    async function triggerLinkElement(element) {
        let date = new Date().getTime();
        let timestamp = Math.floor(date / 1000);
        let username = ($(element).attr('data-username')) ? $(element).attr('data-username') : GL_username;

        if(!username && $(element).attr('data-path')){
            console.log('catching owner name from shortcode:',$(element).attr('data-href'));
            username = await getPostOwner($(element).attr('data-path'));
        }

        if(USER_SETTING.FORCE_RESOURCE_VIA_MEDIA){
            let result = await getMediaInfo($(element).attr('media-id'));

            if(result.status === 'ok'){
                if(result.items[0].video_versions){
                    saveFiles(result.items[0].video_versions[0].url, username, $(element).attr('data-name'),timestamp, $(element).attr('data-type'), $(element).attr('data-path'));
                }
                else{
                    saveFiles(result.items[0].image_versions2.candidates[0].url, username, $(element).attr('data-name'),timestamp, $(element).attr('data-type'), $(element).attr('data-path'));
                }
            }
            else{
                if(USER_SETTING.USE_BLOB_FETCH_WHEN_MEDIA_RATE_LITMIT){
                    saveFiles($(element).attr('data-href'),username,$(element).attr('data-name'),timestamp,$(element).attr('data-type'), $(element).attr('data-path'));
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
        return {
            "zh-TW": {
                "SELECT_LANG": "繁體中文 (Traditional Chinese)",
                "RELOAD_SCRIPT": "重新載入腳本",
                "DONATE": "贊助",
                "FEEDBACK": "回報問題",
                "NEW_TAB": "在新分頁中開啟",
                "SHOW_DOM_TREE": "顯示 DOM Tree",
                "SELECT_AND_COPY": "全選並複製輸入框的內容",
                "DOWNLOAD_DOM_TREE": "將 DOM Tree 下載為文字文件",
                "REPORT_GITHUB": "在 GitHub 上回報問題",
                "REPORT_DISCORD": "在 Discord 支援伺服器上回報問題",
                "DEBUG": "偵錯視窗",
                "CLOSE": "關閉",
                "ALL_CHECK": "全選",
                "BATCH_DOWNLOAD_SELECTED": "批次下載已勾選資源",
                "BATCH_DOWNLOAD_DIRECT": "批次下載全部資源",
                "IMG": "相片",
                "VID": "影片",
                "DW": "下載",
                "THUMBNAIL_INTRO": "下載影片縮圖",
                "LOAD_BLOB_ONE": "正在載入二進位大型物件...",
                "LOAD_BLOB_MULTIPLE": "正在載入多個二進位大型物件...",
                "LOAD_BLOB_RELOAD": "正在重新載入二進位大型物件...",
                "NO_CHECK_RESOURCE": "您需要勾選資源才能下載。",
                "NO_VID_URL": "找不到影片網址",
                "SETTING": "設定",
                "AUTO_RENAME": "自動重新命名檔案",
                "RENAME_SHORTCODE": "重新命名檔案並包含 Shortcode",
                "RENAME_PUBLISH_DATE": "設定重新命名檔案時間戳為資源發佈日期",
                "DISABLE_VIDEO_LOOPING": "關閉影片自動循環播放",
                "REDIRECT_RIGHT_CLICK_USER_STORY_PICTURE": "右鍵點擊使用者限時動態區域頭貼時重定向",
                "FORCE_FETCH_ALL_RESOURCES": "強制提取貼文中所有資源",
                "DIRECT_DOWNLOAD_VISABLE_RESOURCE": "直接下載貼文中的可見資源",
                "DIRECT_DOWNLOAD_ALL": "直接下載貼文中的所有資源",
                "MODIFY_VIDEO_VOLUME": "修改影片音量（右鍵設定）",
                "SCROLL_BUTTON": "為連續短片頁面啟用捲動按鈕",
                "FORCE_RESOURCE_VIA_MEDIA": "透過 Media API 強制提取資源",
                "USE_BLOB_FETCH_WHEN_MEDIA_RATE_LITMIT": "當 Media API 無法存取時使用其他方式下載",
                "AUTO_RENAME_INTRO": "將檔案自動重新命名為以下格式：\n使用者名稱-類型-時間戳.檔案類型\n例如：instagram-photo-1670350000.jpg\n\n若設為 false，則檔案名稱將保持原始樣貌。 \n例如：instagram_321565527_679025940443063_4318007696887450953_n.jpg",
                "RENAME_SHORTCODE_INTRO": "將檔案自動重新命名為以下格式：\n使用者名稱-類型-Shortcode-時間戳.檔案類型\n例如：instagram-photo-CwkxyiVynpW-1670350000.jpg\n\n此功能僅在[自動重新命名檔案]設定為 TRUE 時有效。",
                "RENAME_PUBLISH_DATE_INTRO": "將檔案重新命名格式中的時間戳設定為資源發佈日期 (UTC時區)\n\n此功能僅在[自動重新命名檔案]設定為 TRUE 時有效。",
                "DISABLE_VIDEO_LOOPING_INTRO": "關閉連續短片和貼文中影片自動循環播放。",
                "REDIRECT_RIGHT_CLICK_USER_STORY_PICTURE_INTRO": "右鍵點選首頁限時動態區域中的使用者頭貼時，重新導向到使用者的個人資料頁面。",
                "FORCE_FETCH_ALL_RESOURCES_INTRO": "透過 Instagram API 強制取得貼文中的所有資源（照片和影片），以取消每個貼文單次提取三個資源的限制。",
                "DIRECT_DOWNLOAD_VISABLE_RESOURCE_INTRO": "直接下載貼文中的目前資源。",
                "DIRECT_DOWNLOAD_ALL_INTRO": "按下下載按鈕時將直接強制提取貼文中的所有資源並下載。",
                "MODIFY_VIDEO_VOLUME_INTRO": "修改連續短片和貼文的影片播放音量（右鍵可開啟音量設定條）。",
                "SCROLL_BUTTON_INTRO": "為連續短片頁面的右下角啟用上下捲動按鈕。",
                "FORCE_RESOURCE_VIA_MEDIA_INTRO": "Media API 將嘗試獲取盡可能最高品質的照片或影片，但加載時間會更長。",
                "USE_BLOB_FETCH_WHEN_MEDIA_RATE_LITMIT_INTRO": "當 Media API 到達速率限制或因為其他原因而無法下載時，則使用強制提取API下載資源 (資源品質略低)。"
            },
            "zh-CN": {
                "SELECT_LANG": "简体中文 (Simplified Chinese)",
                "RELOAD_SCRIPT": "重新载入脚本",
                "DONATE": "捐助",
                "FEEDBACK": "反馈问题",
                "NEW_TAB": "在新选项卡中打开",
                "SHOW_DOM_TREE": "显示 DOM Tree",
                "SELECT_AND_COPY": "全选并复制输入框的内容",
                "DOWNLOAD_DOM_TREE": "将 DOM Tree 下载为文本文件",
                "REPORT_GITHUB": "在 GitHub 上报告问题",
                "REPORT_DISCORD": "在 Discord 支援服务器上报告问题",
                "DEBUG": "调试窗口",
                "CLOSE": "关闭",
                "ALL_CHECK": "全选",
                "BATCH_DOWNLOAD_SELECTED": "批量下载已勾选资源",
                "BATCH_DOWNLOAD_DIRECT": "批量下载全部资源",
                "IMG": "图像",
                "VID": "视频",
                "DW": "下载",
                "THUMBNAIL_INTRO": "下载视频缩略图",
                "LOAD_BLOB_ONE": "正在载入大型媒体对象...",
                "LOAD_BLOB_MULTIPLE": "正在载入多个大型媒体对象...",
                "LOAD_BLOB_RELOAD": "正在重新载入大型媒体对象...",
                "NO_CHECK_RESOURCE": "您需要勾選资源才能下載。",
                "NO_VID_URL": "找不到视频网址",
                "SETTING": "设置",
                "AUTO_RENAME": "自动重命名文件",
                "RENAME_SHORTCODE": "重命名文件并包含物件短码",
                "RENAME_PUBLISH_DATE": "设置重命名文件时间戳为资源发布日期",
                "DISABLE_VIDEO_LOOPING": "禁用视频自动循环",
                "REDIRECT_RIGHT_CLICK_USER_STORY_PICTURE": "右键单击用户故事区域头像时重定向",
                "FORCE_FETCH_ALL_RESOURCES": "强制抓取帖子中所有资源",
                "DIRECT_DOWNLOAD_VISABLE_RESOURCE": "直接下载帖子中的可见资源",
                "DIRECT_DOWNLOAD_ALL": "直接下载帖子中的所有资源",
                "MODIFY_VIDEO_VOLUME": "修改视频音量（右击设置）",
                "SCROLL_BUTTON": "为 Reels 页面启用卷动按钮",
                "FORCE_RESOURCE_VIA_MEDIA": "通过 Media API 强制获取资源",
                "USE_BLOB_FETCH_WHEN_MEDIA_RATE_LITMIT": "当 Media API 无法存取时使用其他方式下载",
                "AUTO_RENAME_INTRO": "将文件自动重新命名为以下格式类型：\n用户名-类型-时间戳.文件类型\n例如：instagram-photo-1670350000.jpg\n\n若设为false，则文件名将保持原样。 \n例如：instagram_321565527_679025940443063_4318007696887450953_n.jpg",
                "RENAME_SHORTCODE_INTRO": "自动重命名文件为以下格式类型：\n用户名-类型-短码-时间戳.文件类型\n示例：instagram-photo-CwkxyiVynpW-1670350000.jpg\n\n它仅在[自动重命名文件]设置为 TRUE 时有效。",
                "RENAME_PUBLISH_DATE_INTRO": "将文件重命名格式中的时间戳设置为资源发布日期 (UTC时区)\n\n此功能仅在[自动重命名文件]设置为 TRUE 时有效。",
                "DISABLE_VIDEO_LOOPING_INTRO": "禁用 Reels 和帖子中的视频自动播放。",
                "REDIRECT_RIGHT_CLICK_USER_STORY_PICTURE_INTRO": "右键单击主页故事区域中的用户头像，重定向到用户的个人资料页面。",
                "FORCE_FETCH_ALL_RESOURCES_INTRO": "通过 Instagram API 强制获取帖子中的所有资源（照片和视频），以取消每个帖子单次抓取三个资源的限制。",
                "DIRECT_DOWNLOAD_VISABLE_RESOURCE_INTRO": "直接下载帖子中的当前资源。",
                "DIRECT_DOWNLOAD_ALL_INTRO": "当您点击下载按钮时，帖子中的所有资源将被直接强制抓取并下载。",
                "MODIFY_VIDEO_VOLUME_INTRO": "修改 Reels 和帖子中的视频播放音量（右击可开启音量设置滑条）。",
                "SCROLL_BUTTON_INTRO": "为 Reels 页面的右下角启用上下卷动按钮。",
                "FORCE_RESOURCE_VIA_MEDIA_INTRO": "Media API 将尝试获取尽可能最高质量的照片或视频，但加载时间会更长。",
                "USE_BLOB_FETCH_WHEN_MEDIA_RATE_LITMIT_INTRO": "当 Media API 到达速率限制或因为其他原因而无法下载时，则使用强制获取API下载资源 (资源质量略低)。"
            },
            "en-US": {
                "SELECT_LANG": "English",
                "RELOAD_SCRIPT": "Reload Script",
                "DONATE": "Donate",
                "FEEDBACK": "Feedback",
                "NEW_TAB": "Open in new tab",
                "SHOW_DOM_TREE": "Show DOM Tree",
                "SELECT_AND_COPY": "Select All and Copy of the Input Box",
                "DOWNLOAD_DOM_TREE": "Download DOM Tree as Text File",
                "REPORT_GITHUB": "Report Issue On GitHub",
                "REPORT_DISCORD": "Report Issue On Discord Support Server",
                "DEBUG": "Debug Window",
                "CLOSE": "Close",
                "ALL_CHECK": "Select All",
                "BATCH_DOWNLOAD_SELECTED": "Download Selected Resources",
                "BATCH_DOWNLOAD_DIRECT": "Download All Resources",
                "IMG": "Image",
                "VID": "Video",
                "DW": "Download",
                "THUMBNAIL_INTRO": "Download video thumbnail",
                "LOAD_BLOB_ONE": "Loading Blob Media...",
                "LOAD_BLOB_MULTIPLE": "Loading Blob Media and others...",
                "LOAD_BLOB_RELOAD": "Detect Blob Media, now reloading...",
                "NO_CHECK_RESOURCE": "You need to check resource to download.",
                "NO_VID_URL": "Can not find video url.",
                "SETTING": "Settings",
                "AUTO_RENAME": "Automatically Rename Files",
                "RENAME_SHORTCODE": "Rename The File and Include Shortcode",
                "RENAME_PUBLISH_DATE": "Set Rename File Timestamp to Resource Publish Date",
                "DISABLE_VIDEO_LOOPING": "Disable Video Auto-looping",
                "REDIRECT_RIGHT_CLICK_USER_STORY_PICTURE": "Redirect When Right-Clicking User Story Picture",
                "FORCE_FETCH_ALL_RESOURCES": "Forcing Fetch All Resources In the Post",
                "DIRECT_DOWNLOAD_VISABLE_RESOURCE": "Directly Download the Visible Resources In the Post",
                "DIRECT_DOWNLOAD_ALL": "Directly Download All Resources In the Post",
                "MODIFY_VIDEO_VOLUME": "Modify Video Volume (Right-Click To Set)",
                "SCROLL_BUTTON": "Enable Scroll Buttons For Reels Page",
                "FORCE_RESOURCE_VIA_MEDIA": "Force Fetch Resource via Media API",
                "USE_BLOB_FETCH_WHEN_MEDIA_RATE_LITMIT": "Use Other Methods to Download When the Media API is Not Accessible",
                "AUTO_RENAME_INTRO": "Auto rename file to format type following:\nUSERNAME-TYPE-TIMESTAMP.FILETYPE\nExample: instagram-photo-1670350000.jpg\n\nIf set to false, the file name will remain as it is.\nExample: instagram_321565527_679025940443063_4318007696887450953_n.jpg",
                "RENAME_SHORTCODE_INTRO": "Auto rename file to format type following:\nUSERNAME-TYPE-SHORTCODE-TIMESTAMP.FILETYPE\nExample: instagram-photo-CwkxyiVynpW-1670350000.jpg\n\nIt will ONLY work in [Automatically Rename Files] setting to TRUE.",
                "RENAME_PUBLISH_DATE_INTRO": "Sets the timestamp in the file rename format to the resource publish date (UTC time zone)\n\nThis feature only works when [Automatically Rename Files] is set to TRUE.",
                "DISABLE_VIDEO_LOOPING_INTRO": "Disable video auto-looping in reels and posts.",
                "REDIRECT_RIGHT_CLICK_USER_STORY_PICTURE_INTRO": "Redirect to a user's profile page when right-clicking on their user avatar in the story area on the homepage.",
                "FORCE_FETCH_ALL_RESOURCES_INTRO": "Force fetching of all resources (photos and videos) in a post via the Instagram API to remove the limit of three resources per post.",
                "DIRECT_DOWNLOAD_VISABLE_RESOURCE_INTRO": "Directly download the current resources in the post.",
                "DIRECT_DOWNLOAD_ALL_INTRO": "When you click the download button, all resources in the post will be directly forced to be fetched and downloaded.",
                "MODIFY_VIDEO_VOLUME_INTRO": "Modify the video playback volume in Reels and Posts (right-click to open the volume setting slider).",
                "SCROLL_BUTTON_INTRO": "Enable scroll buttons for the lower right corner of Reels page.",
                "FORCE_RESOURCE_VIA_MEDIA_INTRO": "The Media API will try to get the highest quality photo or video possible, but it will take longer to load.",
                "USE_BLOB_FETCH_WHEN_MEDIA_RATE_LITMIT_INTRO": "When the Media API reaches the rate limit or cannot be downloaded for other reasons, the Forced Fetch API is used to download resources (the resource quality is slightly lower)."
            },
            "ro": {
                "SELECT_LANG": "Română (Romanian)",
                "RELOAD_SCRIPT": "Reîncărcați Scriptul",
                "DONATE": "Donează",
                "FEEDBACK": "Feedback",
                "NEW_TAB": "Deschide într-o filă nouă",
                "SHOW_DOM_TREE": "Afișează arborele DOM",
                "SELECT_AND_COPY": "Selectează tot și copiază din caseta de introducere",
                "DOWNLOAD_DOM_TREE": "Descarcă arborele DOM în format text",
                "REPORT_GITHUB": "Raportează o problemă pe GitHub",
                "REPORT_DISCORD": "Raportează o problemă pe serverul de suport Discord",
                "DEBUG": "Fereastră de depanare",
                "CLOSE": "Închide",
                "ALL_CHECK": "Selectează toate",
                "BATCH_DOWNLOAD_SELECTED": "Descarcă resursele selectate",
                "BATCH_DOWNLOAD_DIRECT": "Descarcă toate resursele",
                "IMG": "Imagine",
                "VID": "Videoclip",
                "DW": "Descarcă",
                "THUMBNAIL_INTRO": "Descarcă miniatura videoclipului",
                "LOAD_BLOB_ONE": "Se încarcă conținutul media în format Blob...",
                "LOAD_BLOB_MULTIPLE": "Se încarcă conținutul media în format Blob și celelalte...",
                "LOAD_BLOB_RELOAD": "Se detectează conținutul media în format Blob, se reîncarcă acum...",
                "NO_CHECK_RESOURCE": "Trebuie să bifezi resursa pentru a o descărca.",
                "NO_VID_URL": "Nu se poate găsi URL-ul videoclipului.",
                "SETTING": "Setări",
                "AUTO_RENAME": "Redenumește automat fișierele",
                "RENAME_SHORTCODE": "Redenumește fișierul și include cod scurt",
                "RENAME_PUBLISH_DATE": "Setați Redenumire marcaj de timp al fișierului la Data publicării resursei",
                "DISABLE_VIDEO_LOOPING": "Dezactivează redarea automată în buclă a videoclipurilor",
                "REDIRECT_RIGHT_CLICK_USER_STORY_PICTURE": "Redirecționează când dai click dreapta pe fotografia profilului în storyul utilizatorului",
                "FORCE_FETCH_ALL_RESOURCES": "Forțează preluarea tuturor resurselor din postare",
                "DIRECT_DOWNLOAD_VISABLE_RESOURCE": "Descarcă direct resursele vizibile din postare",
                "DIRECT_DOWNLOAD_ALL": "Descarcă direct toate resursele din postare",
                "MODIFY_VIDEO_VOLUME": "Modifică volumul videoclipurilor (Click dreapta pentru a seta)",
                "SCROLL_BUTTON": "Activează butoanele de derulare pentru pagina Reels",
                "FORCE_RESOURCE_VIA_MEDIA": "Forțează preluarea resurselor prin intermediul Media API",
                "USE_BLOB_FETCH_WHEN_MEDIA_RATE_LITMIT": "Utilizați alte metode pentru a descărca atunci când Media API nu este accesibil",
                "AUTO_RENAME_INTRO": "Redenumește automat fișierele cu formatul următor:\nNUME_DE_UTILIZATOR-TIP-MARCAJ_DE_TIMP.TIPUL_FIȘIERULUI\nExemplu: instagram-photo-1670350000.jpg\n\nDacă este setat pe fals, numele fișierului va rămâne neschimbat.\nExemplu: instagram_321565527_679025940443063_4318007696887450953_n.jpg",
                "RENAME_SHORTCODE_INTRO": "Redenumește automat fișierele cu formatul următor:\nNUME_DE_UTILIZATOR-TIP-COD_SCURT-MARCAJ_DE_TIMP.TIPUL_FIȘIERULUI\nExemplu: instagram-photo-CwkxyiVynpW-1670350000.jpg\n\nFuncționează DOAR dacă setarea [Redenumește automat fișierele] este pe ADEVĂRAT.",
                "RENAME_PUBLISH_DATE_INTRO": "Setează marcajul de timp în formatul de redenumire a fișierului la data publicării resursei (fus orar UTC)\n\nFuncționează DOAR dacă setarea [Redenumește automat fișierele] este pe ADEVĂRAT.",
                "DISABLE_VIDEO_LOOPING_INTRO": "Dezactivează redarea automată în buclă a videoclipurilor din Reels și Postări.",
                "REDIRECT_RIGHT_CLICK_USER_STORY_PICTURE_INTRO": "Redirecționează către pagina de profil a unui utilizator când faci click dreapta pe avatarul acestuia în zona storyului de pe pagina principală.",
                "FORCE_FETCH_ALL_RESOURCES_INTRO": "Forțează preluarea tuturor resurselor (fotografii și videoclipuri) dintr-o postare prin intermediul API-ului Instagram pentru a elimina limita de trei resurse per postare.",
                "DIRECT_DOWNLOAD_VISABLE_RESOURCE_INTRO": "Descarcă direct resursele actuale din postare.",
                "DIRECT_DOWNLOAD_ALL_INTRO": "Atunci când apeși butonul de descărcare, toate resursele din postare vor fi direct forțate să fie preluate și descărcate.",
                "MODIFY_VIDEO_VOLUME_INTRO": "Modifică volumul redării videoclipurilor în Reels și Postări (click dreapta pentru a deschide cursorul de setare a volumului).",
                "SCROLL_BUTTON_INTRO": "Activează butoanele de derulare pentru colțul din dreapta jos al paginii Reels.",
                "FORCE_RESOURCE_VIA_MEDIA_INTRO": "Media API va încerca să obțină cea mai înaltă calitate posibilă pentru fotografie sau videoclip, dar încărcarea va dura mai mult.",
                "USE_BLOB_FETCH_WHEN_MEDIA_RATE_LITMIT_INTRO": "Când Media API atinge limita de rată sau nu poate fi descărcat din alte motive, Forced Fetch API este folosit pentru a descărca resurse (calitatea resurselor este puțin mai scăzută)."
            }
        };
    }

    /**
     * _i18n
     * Perform i18n translation
     *
     * @param  {String}  text
     * @return {void}
     */
    function _i18n(text){
        let userLang = (lang)?lang:"en-US";
        let translate = {
            "zh-TW": function(){
                return translateText()["zh-TW"];
            },
            "zh-HK": function(){
                return translateText()["zh-TW"];
            },
            "zh-MO": function(){
                return translateText()["zh-TW"];
            },
            "zh-CN": function(){
                return translateText()["zh-CN"];
            },
            "en-US": function(){
                return translateText()["en-US"];
            },
            "ro": function(){
                return translateText()["ro"];
            }
        }

        try{
            return translate[lang]()[text];
        }
        catch{
            return translate["en-US"]()[text];
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

        $('body').on('change', '.IG_SN_DIG #tempWrapper input',function(){
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

        $('body').on('input', '.IG_SN_DIG #tempWrapper input',function(e){
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


        $('body').on('click','a[data-needed="direct"]', function(e){
            e.preventDefault();
            triggerLinkElement(this);
        });

        $('body').on('click','.IG_SN_DIG_BODY .newTab', function(){
            // replace https://instagram.ftpe8-2.fna.fbcdn.net/ to https://scontent.cdninstagram.com/ becase of same origin policy (some video)
            var urlObj = new URL($(this).parent().children('a').attr('data-href'));
            urlObj.host = 'scontent.cdninstagram.com';

            openNewTab(urlObj.href);
        });

        $('body').on('click','.IG_SN_DIG_BODY .videoThumbnail', function(){
            saveFiles($(this).parent().children('a').find('img').first().attr('src'), $(this).parent().children('a').attr('data-username'), 'thumbnail', new Date().getTime(), 'jpg', $('#article-id').text());
        });

        // Running if user left-click download icon in stories
        $('body').on('click','.IG_DWSTORY',function(){
            onStory(true);
        });
        $('body').on('click','.IG_DWNEWTAB',function(e){
            e.preventDefault();
            onStory(true, true, true);
        });

        // Running if user left-click download icon in stories
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
        $('body').on('click','.IG_DWHINEWTAB',function(e){
            e.preventDefault();
            onHighlightsStory(true, true);
        });

        // Running if user left-click download icon in highlight stories
        $('body').on('click','.IG_DWHISTORY_THUMBNAIL',function(){
            onHighlightsStoryThumbnail(true);
        });

        // Running if user left-click download icon in reels
        $('body').on('click','.IG_REELS',function(){
            onReels(true,true);
        });

        // Running if user left-click newtab icon in reels
        $('body').on('click','.IG_REELSNEWTAB',function(){
            onReels(true,true,true);
        });

        // Running if user left-click download icon in reels
        $('body').on('click','.IG_REELS_THUMBNAIL',function(){
            onReels(true,false);
        });

        // Running if user right-click profile picture in stories area
        $('body').on('contextmenu','button[role="menuitem"]',function(){
            if(location.href === 'https://www.instagram.com/' && USER_SETTING.REDIRECT_RIGHT_CLICK_USER_STORY_PICTURE){
                if($(this).find('canvas._aarh').length > 0){
                    location.href = 'https://www.instagram.com/'+$(this).children('div').last().text();
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

        $('body').on('click', '.IG_SN_DIG_TITLE #batch_download_direct', function(){
            $('.IG_SN_DIG_BODY a[data-needed="direct"]').each(function(){
                $(this).click();
            });
        });
    });
})(jQuery);
