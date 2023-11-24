// ==UserScript==
// @name               IG Helper
// @name:zh-TW         IG小精靈
// @name:zh-CN         IG小助手
// @name:ja            IG助手
// @name:ko            IG조수
// @namespace          https://github.snkms.com/
// @version            2.11.9
// @description        Downloading is possible for both photos and videos from posts, as well as for stories, reels or profile picture.
// @description:zh-TW  一鍵下載對方 Instagram 貼文中的相片、影片甚至是他們的限時動態、連續短片及大頭貼圖片！
// @description:zh-CN  一键下载对方 Instagram 帖子中的相片、视频甚至是他们的快拍、Reels及头像图片！
// @description:ja     投稿された写真や動画だけでなく、ストーリーズやリール動画からもダウンロードが可能です。
// @description:ko     게시물에 게시된 사진과 동영상 뿐만 아니라 스토리나 릴스에서도 다운로드가 가능합니다.
// @author             SN-Koarashi (5026)
// @match              https://*.instagram.com/*
// @grant              GM_addStyle
// @grant              GM_setValue
// @grant              GM_getValue
// @grant              GM_xmlhttpRequest
// @grant              GM_registerMenuCommand
// @grant              GM_getResourceText
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
// ==/UserScript==

(function($) {
    'use strict';
    // Icon download by https://www.flaticon.com/authors/pixel-perfect

    /******** USER SETTINGS ********/
    // !!! DO NOT CHANGE THIS AREA !!!
    // PLEASE CHANGE SETTING WITH MENU
    const USER_SETTING = {
        'AUTO_RENAME': (GM_getValue('AUTO_RENAME'))?GM_getValue('AUTO_RENAME'):true,
        'RENAME_SHORTCODE': (GM_getValue('RENAME_SHORTCODE'))?GM_getValue('RENAME_SHORTCODE'):true,
        'DISABLE_VIDEO_LOOPING': (GM_getValue('DISABLE_VIDEO_LOOPING'))?GM_getValue('DISABLE_VIDEO_LOOPING'):false,
        'REDIRECT_RIGHT_CLICK_USER_STORY_PICTURE': (GM_getValue('REDIRECT_RIGHT_CLICK_USER_STORY_PICTURE'))?GM_getValue('REDIRECT_RIGHT_CLICK_USER_STORY_PICTURE'):false,
        'FORCE_FETCH_ALL_RESOURCES': (GM_getValue('FORCE_FETCH_ALL_RESOURCES'))?GM_getValue('FORCE_FETCH_ALL_RESOURCES'):false
    };
    /*******************************/

    const checkInterval = 250;
    const lang = navigator.language || navigator.userLanguage;
    const style = GM_getResourceText("INTERNAL_CSS");

    GM_addStyle(style);
    GM_registerMenuCommand(_i18n('SETTING'), () => {
        showSetting();
    });

    var currentURL = location.href;
    var currentHeight = $(document).height();
    var firstStarted = false;
    var pageLoaded = false;

    var GL_postPath;
    var GL_username;
    var GL_repeat;
    var GL_dataCache = {
        stories: {},
        highlights: {}
    };

    // Main Timer
    var timer = setInterval(function(){
        currentHeight = $(document).height();
        // Call Instagram dialog function if url changed.
        if(currentURL != location.href || !firstStarted || !pageLoaded){
            clearInterval(GL_repeat);
            pageLoaded = false;
            firstStarted = true;
            currentURL = location.href;

            if(location.href.startsWith("https://www.instagram.com/p/") || location.href.startsWith("https://www.instagram.com/reel/")){
                GL_dataCache.stories = {};

                console.log('isDialog');
                setTimeout(()=>{
                    onReadyMyDW(false);
                },150);
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
                },150);
                pageLoaded = true;
            }
            if($('div[id^="mount"] > div > div > div').first().is(':hidden') && $('canvas._aarh').length && location.href.match(/^(https:\/\/www\.instagram\.com\/)([0-9A-Za-z\.\-_]+)\/?$/ig) && !location.href.match(/^(https:\/\/www\.instagram\.com\/(stories|explore)\/?)/ig)){
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

    // Call general function when user scroll the page
    $(document).scroll(function(){
        if(currentHeight != $(this).height() && location.href.split("?")[0] == "https://www.instagram.com/"){
            onReadyMyDW();
        }
    });

    /**
     * onProfileAvatar
     * Trigger user avatar download event or button display event.
     *
     * @param  {Boolean}  isDownload - Check if it is a download operation
     * @return {void}
     */
    async function onProfileAvatar(isDownload){
        if(isDownload){
            let date = new Date().getTime();
            let timestamp = Math.floor(date / 1000);
            let username = location.href.replace(/\/$/ig,'').split('/').at(-1);
            let userInfo = await getUserId(username);
            try{
                let dataURL = await getUserHighSizeProfile(userInfo.user.pk);
                saveFiles(dataURL,username,"avatar",timestamp,'jpg');
            }
            catch(err){
                saveFiles(userInfo.user.profile_pic_url,username,"avatar",timestamp,'jpg');
            }
        }
        else{
            // Add the profile download button
            if(!$('.IG_DWPROFILE').length){
                let profileTimer = setInterval(()=>{
                    if($('.IG_DWPROFILE').length) clearInterval(profileTimer);

                    $('body > div main canvas._aarh').parent().append(`<div title="${_i18n("DW")}" class="IG_DWPROFILE"><svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Capa_1" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"><g><g><path d="M382.56,233.376C379.968,227.648,374.272,224,368,224h-64V16c0-8.832-7.168-16-16-16h-64c-8.832,0-16,7.168-16,16v208h-64    c-6.272,0-11.968,3.68-14.56,9.376c-2.624,5.728-1.6,12.416,2.528,17.152l112,128c3.04,3.488,7.424,5.472,12.032,5.472    c4.608,0,8.992-2.016,12.032-5.472l112-128C384.192,245.824,385.152,239.104,382.56,233.376z"/></g></g><g><g><path d="M432,352v96H80v-96H16v128c0,17.696,14.336,32,32,32h416c17.696,0,32-14.304,32-32V352H432z"/></g></g></div>`);
                },150);
            }
        }
    }

    /**
     * onHighlightsStory
     * Trigger user's highlight download event or button display event.
     *
     * @param  {Boolean}  isDownload - Check if it is a download operation
     * @return {void}
     */
    async function onHighlightsStory(isDownload){
        if(isDownload){
            let date = new Date().getTime();
            let timestamp = Math.floor(date / 1000);
            let highlightId = location.href.replace(/\/$/ig,'').split('/').at(-1);
            let nowIndex = $("body > div section._ac0a header._ac0k > ._ac3r ._ac3n ._ac3p[style]").length;
            let username = "";
            let target = 0;

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

            if(target.is_video){
                saveFiles(target.video_resources.at(-1).src,username,"highlights",timestamp,'mp4', highlightId);
            }
            else{
                saveFiles(target.display_resources.at(-1).src,username,"highlights",timestamp,'jpg', highlightId);
            }
        }
        else{
            // Add the stories download button
            if(!$('.IG_DWHISTORY').length){
                let $element = null;
                if($('body > div section._ac0a').length > 0){
                    $element = $('body > div section._ac0a');
                }
                else{
                    $element = $('body > div section > div > div:not([class])');
                }

                if($element != null){
                    $element.css('position','relative');
                    $element.append(`<div title="${_i18n("DW")}" class="IG_DWHISTORY"><svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Capa_1" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"><g><g><path d="M382.56,233.376C379.968,227.648,374.272,224,368,224h-64V16c0-8.832-7.168-16-16-16h-64c-8.832,0-16,7.168-16,16v208h-64    c-6.272,0-11.968,3.68-14.56,9.376c-2.624,5.728-1.6,12.416,2.528,17.152l112,128c3.04,3.488,7.424,5.472,12.032,5.472    c4.608,0,8.992-2.016,12.032-5.472l112-128C384.192,245.824,385.152,239.104,382.56,233.376z"/></g></g><g><g><path d="M432,352v96H80v-96H16v128c0,17.696,14.336,32,32,32h416c17.696,0,32-14.304,32-32V352H432z"/></g></g></div>`);
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
            let nowIndex = $("body > div section._ac0a header._ac0k > ._ac3r ._ac3n ._ac3p[style]").length;
            let target = "";

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

            saveFiles(target.display_resources.at(-1).src,username,"highlights",timestamp,'jpg', highlightId);
        }
        else{
            if($('body > div section video.xh8yej3').length){
                // Add the stories download button
                if(!$('.IG_DWHISTORY_THUMBNAIL').length){
                    let $element = null;
                    if($('body > div section._ac0a').length > 0){
                        $element = $('body > div section._ac0a');
                    }
                    else{
                        $element = $('body > div section > div > div:not([class])');
                    }

                    if($element != null){
                        $element.css('position','relative');
                        $element.append(`<div title="${_i18n("THUMBNAIL_INTRO")}" class="IG_DWHISTORY_THUMBNAIL"><svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="512" viewBox="0 0 24 24" width="512"><circle cx="8.25" cy="5.25" r=".5"/><path d="m8.25 6.5c-.689 0-1.25-.561-1.25-1.25s.561-1.25 1.25-1.25 1.25.561 1.25 1.25-.561 1.25-1.25 1.25zm0-1.5c-.138 0-.25.112-.25.25 0 .275.5.275.5 0 0-.138-.112-.25-.25-.25z"/><path d="m7.25 11.25 2-2.5 2.25 1.5 2.25-3.5 3 4.5z"/><path d="m16.75 12h-9.5c-.288 0-.551-.165-.676-.425s-.09-.568.09-.793l2-2.5c.243-.304.678-.372 1.002-.156l1.616 1.077 1.837-2.859c.137-.212.372-.342.625-.344.246-.026.49.123.63.334l3 4.5c.153.23.168.526.037.77-.13.244-.385.396-.661.396zm-4.519-1.5h3.118l-1.587-2.381zm-3.42 0h1.712l-1.117-.745z"/><path d="m22.25 14h-2.756c-.778 0-1.452.501-1.676 1.247l-.859 2.862c-.16.533-.641.891-1.197.891h-7.524c-.556 0-1.037-.358-1.197-.891l-.859-2.861c-.224-.747-.897-1.248-1.676-1.248h-2.756c-.965 0-1.75.785-1.75 1.75v5.5c0 1.517 1.233 2.75 2.75 2.75h18.5c1.517 0 2.75-1.233 2.75-2.75v-5.5c0-.965-.785-1.75-1.75-1.75z"/><path d="m4 12c-.552 0-1-.448-1-1v-8c0-1.654 1.346-3 3-3h12c1.654 0 3 1.346 3 3v8c0 .552-.448 1-1 1s-1-.448-1-1v-8c0-.551-.449-1-1-1h-12c-.551 0-1 .449-1 1v8c0 .552-.448 1-1 1z"/></svg></div>`);
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
     * @return {void}
     */
    async function onStory(isDownload,isForce){
        if(isDownload){
            let date = new Date().getTime();
            let timestamp = Math.floor(date / 1000);
            let username = $("body > div section._ac0a header._ac0k ._ac0l a + div a").first().text() || location.pathname.split('/').at(2);

            if($('body > div section._ac0a div._ac0b video.x1lliihq').length){
                // Download stories if it is video
                let type = "mp4";
                let videoURL = "";
                let targetURL = location.href.replace(/\/$/ig,'').split("/").at(-1);

                if(GL_dataCache.stories[username] && !isForce){
                    console.log('Fetch from memory cache:', username);
                    GL_dataCache.stories[username].data.reels_media[0].items.forEach(item => {
                        if(item.id == targetURL){
                            videoURL = item.video_resources[0].src;
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
                        }
                    });

                    GL_dataCache.stories[username] = stories;
                }

                if(videoURL.length == 0){
                    alert(_i18n("NO_VID_URL"));
                }
                else{
                    saveFiles(videoURL,username,"stories",timestamp,type);
                }

            }
            else{
                // Download stories if it is image
                let srcset = $('section._ac0a ._aa64 img._aa63').attr('srcset').split(',')[0].split(' ')[0];
                let link = (srcset)?srcset:$('section._ac0a ._aa64 img._aa63').attr('src');

                let downloadLink = link;
                let type = 'jpg';

                saveFiles(downloadLink,username,"stories",timestamp,type);
            }
        }
        else{
            // Add the stories download button
            let style = "position: absolute;right:-40px;top:15px;padding:5px;line-height:1;background:#fff;border-radius: 5px;cursor:pointer;";
            if(!$('.IG_DWSTORY').length){
                GL_dataCache.stories = {};
                let $element = null;
                if($('body > div section._ac0a').length > 0){
                    $element = $('body > div section._ac0a');
                }
                else{
                    $element = $('body > div section > div > div:not([class])');
                }

                if($element != null){
                    $element.css('position','relative');
                    $element.append(`<div title="${_i18n("DW")}" class="IG_DWSTORY"><svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Capa_1" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"><g><g><path d="M382.56,233.376C379.968,227.648,374.272,224,368,224h-64V16c0-8.832-7.168-16-16-16h-64c-8.832,0-16,7.168-16,16v208h-64    c-6.272,0-11.968,3.68-14.56,9.376c-2.624,5.728-1.6,12.416,2.528,17.152l112,128c3.04,3.488,7.424,5.472,12.032,5.472    c4.608,0,8.992-2.016,12.032-5.472l112-128C384.192,245.824,385.152,239.104,382.56,233.376z"/></g></g><g><g><path d="M432,352v96H80v-96H16v128c0,17.696,14.336,32,32,32h416c17.696,0,32-14.304,32-32V352H432z"/></g></g></div>`);
                }
            }
        }
    }

    /**
     * onStoryThumbnail
     * Trigger user's story video thumbnail download event or button display event.
     *
     * @param  {Boolean}  isDownload - Check if it is a download operation
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
            let targetURL = location.href.replace(/\/$/ig,'').split("/").at(-1);
            let videoThumbnailURL = "";


            if(GL_dataCache.stories[username] && !isForce){
                console.log('Fetch from memory cache:', username);
                GL_dataCache.stories[username].data.reels_media[0].items.forEach(item => {
                    if(item.id == targetURL){
                        videoThumbnailURL = item.display_url;
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
                    }
                });
            }

            saveFiles(videoThumbnailURL,username,"thumbnail",timestamp,type);
        }
        else{
            if($('body > div section video.xh8yej3').length){
                // Add the stories download button
                if(!$('.IG_DWSTORY_THUMBNAIL').length){
                    let $element = null;
                    if($('body > div section._ac0a').length > 0){
                        $element = $('body > div section._ac0a');
                    }
                    else{
                        $element = $('body > div section > div > div:not([class])');
                    }

                    if($element != null){
                        $element.css('position','relative');
                        $element.append(`<div title="${_i18n("THUMBNAIL_INTRO")}" class="IG_DWSTORY_THUMBNAIL"><svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="512" viewBox="0 0 24 24" width="512"><circle cx="8.25" cy="5.25" r=".5"/><path d="m8.25 6.5c-.689 0-1.25-.561-1.25-1.25s.561-1.25 1.25-1.25 1.25.561 1.25 1.25-.561 1.25-1.25 1.25zm0-1.5c-.138 0-.25.112-.25.25 0 .275.5.275.5 0 0-.138-.112-.25-.25-.25z"/><path d="m7.25 11.25 2-2.5 2.25 1.5 2.25-3.5 3 4.5z"/><path d="m16.75 12h-9.5c-.288 0-.551-.165-.676-.425s-.09-.568.09-.793l2-2.5c.243-.304.678-.372 1.002-.156l1.616 1.077 1.837-2.859c.137-.212.372-.342.625-.344.246-.026.49.123.63.334l3 4.5c.153.23.168.526.037.77-.13.244-.385.396-.661.396zm-4.519-1.5h3.118l-1.587-2.381zm-3.42 0h1.712l-1.117-.745z"/><path d="m22.25 14h-2.756c-.778 0-1.452.501-1.676 1.247l-.859 2.862c-.16.533-.641.891-1.197.891h-7.524c-.556 0-1.037-.358-1.197-.891l-.859-2.861c-.224-.747-.897-1.248-1.676-1.248h-2.756c-.965 0-1.75.785-1.75 1.75v5.5c0 1.517 1.233 2.75 2.75 2.75h18.5c1.517 0 2.75-1.233 2.75-2.75v-5.5c0-.965-.785-1.75-1.75-1.75z"/><path d="m4 12c-.552 0-1-.448-1-1v-8c0-1.654 1.346-3 3-3h12c1.654 0 3 1.346 3 3v8c0 .552-.448 1-1 1s-1-.448-1-1v-8c0-.551-.449-1-1-1h-12c-.551 0-1 .449-1 1v8c0 .552-.448 1-1 1z"/></svg></div>`);
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
     * @return {void}
     */
    async function onReels(isDownload, isVideo){
        if(isDownload){
            let reelsPath = location.href.split('?').at(0).split('instagram.com/reels/').at(-1).replaceAll('/','');
            let data = await getBlobMedia(reelsPath);
            let timestamp = new Date().getTime();

            if(isVideo && data.shortcode_media.is_video){
                let type = 'mp4';
                saveFiles(data.shortcode_media.video_url,data.shortcode_media.owner.username,"reels",timestamp,type,reelsPath);
            }
            else{
                let type = 'jpg';
                saveFiles(data.shortcode_media.display_resources.at(-1).src,data.shortcode_media.owner.username,"reels",timestamp,type,reelsPath);
            }
        }
        else{
            //$('.IG_REELS_THUMBNAIL, .IG_REELS').remove();
            var timer = setInterval(()=>{
                if($('section > main[role="main"] > div div.x1qjc9v5 video').length > 0){
                    clearInterval(timer);
                    $('section > main[role="main"] > div').children('div').each(function(){
                        if($(this).children().length > 0){
                            if(!$(this).children().find('.IG_REELS').length){
                                $(this).children().css('position','relative');

                                $(this).children().append(`<div title="${_i18n("DW")}" class="IG_REELS"><svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Capa_1" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"><g><g><path d="M382.56,233.376C379.968,227.648,374.272,224,368,224h-64V16c0-8.832-7.168-16-16-16h-64c-8.832,0-16,7.168-16,16v208h-64    c-6.272,0-11.968,3.68-14.56,9.376c-2.624,5.728-1.6,12.416,2.528,17.152l112,128c3.04,3.488,7.424,5.472,12.032,5.472    c4.608,0,8.992-2.016,12.032-5.472l112-128C384.192,245.824,385.152,239.104,382.56,233.376z"/></g></g><g><g><path d="M432,352v96H80v-96H16v128c0,17.696,14.336,32,32,32h416c17.696,0,32-14.304,32-32V352H432z"/></g></g></div>`);
                                $(this).children().append(`<div title="${_i18n("THUMBNAIL_INTRO")}" class="IG_REELS_THUMBNAIL"><svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="512" viewBox="0 0 24 24" width="512"><circle cx="8.25" cy="5.25" r=".5"/><path d="m8.25 6.5c-.689 0-1.25-.561-1.25-1.25s.561-1.25 1.25-1.25 1.25.561 1.25 1.25-.561 1.25-1.25 1.25zm0-1.5c-.138 0-.25.112-.25.25 0 .275.5.275.5 0 0-.138-.112-.25-.25-.25z"/><path d="m7.25 11.25 2-2.5 2.25 1.5 2.25-3.5 3 4.5z"/><path d="m16.75 12h-9.5c-.288 0-.551-.165-.676-.425s-.09-.568.09-.793l2-2.5c.243-.304.678-.372 1.002-.156l1.616 1.077 1.837-2.859c.137-.212.372-.342.625-.344.246-.026.49.123.63.334l3 4.5c.153.23.168.526.037.77-.13.244-.385.396-.661.396zm-4.519-1.5h3.118l-1.587-2.381zm-3.42 0h1.712l-1.117-.745z"/><path d="m22.25 14h-2.756c-.778 0-1.452.501-1.676 1.247l-.859 2.862c-.16.533-.641.891-1.197.891h-7.524c-.556 0-1.037-.358-1.197-.891l-.859-2.861c-.224-.747-.897-1.248-1.676-1.248h-2.756c-.965 0-1.75.785-1.75 1.75v5.5c0 1.517 1.233 2.75 2.75 2.75h18.5c1.517 0 2.75-1.233 2.75-2.75v-5.5c0-.965-.785-1.75-1.75-1.75z"/><path d="m4 12c-.552 0-1-.448-1-1v-8c0-1.654 1.346-3 3-3h12c1.654 0 3 1.346 3 3v8c0 .552-.448 1-1 1s-1-.448-1-1v-8c0-.551-.449-1-1-1h-12c-.551 0-1 .449-1 1v8c0 .552-.448 1-1 1z"/></svg></div>`);

                                // Disable video autoplay
                                if(USER_SETTING.DISABLE_VIDEO_LOOPING){
                                    $(this).find('video').each(function(){
                                        if(!$(this).data('loop')){
                                            console.log('Added video event listener');
                                            $(this).on('ended',function(){
                                                $(this).attr('data-loop', true);
                                                $(this).parent().find('.xpgaw4o').removeAttr('style');
                                                console.log('paused');

                                                this.pause();
                                            });
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
                    let obj = JSON.parse(response.response);
                    resolve(obj.users[0]);
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
        if(!NoDialog){
            // Running if it is dialog
            $('article, main > div > div.xdt5ytf > div').each(function(){
                $(this).removeAttr('data-snig');
                $(this).unbind('click');
            });
            $('.SNKMS_IG_DW_MAIN,.SNKMS_IG_DW_MAIN_VIDEO').remove();
        }
        if(NoDialog == false){
            var repeat = setInterval(() => {
                // div.x13ehr01 << (sigle post in top, not floating) >>
                if($('article[data-snig="canDownload"], main > div > div.xdt5ytf > div[data-snig="canDownload"]').length > 0) clearInterval(repeat);
                createDownloadButton();
            },250);
        }
        else{
            createDownloadButton();
        }
    }

    /**
     * createDownloadButton
     * Create a download button in the upper right corner of each post
     *
     * @return {void}
     */
    function createDownloadButton(){
        // Add download icon per each posts
        $('article, main > div > div.xdt5ytf > div').each(function(){
            // If it is have not download icon
            if(!$(this).attr('data-snig') && !$(this).hasClass('x1iyjqo2')){
                console.log("Found article");
                var rightPos = 15;
                if(this.tagName === "DIV"){
                    rightPos = ($(this).children('div:last-child').width() !== undefined) ? $(this).children('div:last-child').width()+15 : 335+15
                }

                // Add the download icon
                let $childElement = $(this).children("div").children("div");
                $childElement.eq((this.tagName === "DIV")? 0 : $childElement.length - 2).append(`<div title="${_i18n("DW")}" class="SNKMS_IG_DW_MAIN" style="right:${rightPos}px;"><svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Capa_1" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"><g><g><path d="M382.56,233.376C379.968,227.648,374.272,224,368,224h-64V16c0-8.832-7.168-16-16-16h-64c-8.832,0-16,7.168-16,16v208h-64    c-6.272,0-11.968,3.68-14.56,9.376c-2.624,5.728-1.6,12.416,2.528,17.152l112,128c3.04,3.488,7.424,5.472,12.032,5.472    c4.608,0,8.992-2.016,12.032-5.472l112-128C384.192,245.824,385.152,239.104,382.56,233.376z"/></g></g><g><g><path d="M432,352v96H80v-96H16v128c0,17.696,14.336,32,32,32h416c17.696,0,32-14.304,32-32V352H432z"/></g></g></div>`);

                // Disable video autoplay
                if(USER_SETTING.DISABLE_VIDEO_LOOPING){
                    $(this).find('video').each(function(){
                        if(!$(this).data('loop')){
                            console.log('Added video event listener');
                            $(this).on('ended',function(){
                                $(this).attr('data-loop', true);
                                this.pause();
                            });
                        }
                    });
                }

                // Running if user click the download icon
                $(this).on('click','.SNKMS_IG_DW_MAIN', async function(e){
                    GL_username = $(this).parent().parent().parent().attr('data-username');
                    GL_postPath = location.pathname.split('/p/').at(-1).replaceAll('/','') || $(this).parent().parent().children("div:last-child").children("div").children("div:last-child").find('a[href^="/p/"]').last().attr("href").split("/").at(2);

                    // Create element that download dailog
                    IG_createDM(GM_getValue('AutoDownload'), true);

                    $("#article-id").html(`<a href="https://www.instagram.com/p/${GL_postPath}">${GL_postPath}</a>`);

                    // Find video/image element and add the download icon
                    var s = 0;
                    var multiple = $(this).parent().parent().find('._aap0 ._acaz').length;
                    var pathname = window.location.pathname;
                    var fullpathname = "/"+pathname.split('/')[1]+"/"+pathname.split('/')[2]+"/";
                    var blob = USER_SETTING.FORCE_FETCH_ALL_RESOURCES;

                    // If posts have more than one images or videos.
                    if(multiple){
                        $(this).parent().find('._aap0 ._acaz').each(function(){
                            let element_videos = $(this).parent().parent().find('video');
                            //if(element_videos && element_videos.attr('src') && element_videos.attr('src').match(/^blob:/ig)){
                            if(element_videos && element_videos.attr('src')){
                                blob = true;
                            }
                        });


                        if(blob){
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
                                    /*
                                    let video_image = element_videos.attr('poster');
                                    let video_url = element_videos.attr('src');

                                    $('.IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY').append(`<a data-needed="direct" data-path="${GL_postPath}" data-name="IGTV" data-type="mp4" data-globalIndex="${s}" href="javascript:;" data-href="${video_url}"><img width="100" src="${video_image}" /><br/>- ${_i18n("VID")} ${s} -</a>`);

                                    if(video_url.match(/^blob:/ig)) blob = true;
                                    */
                                }
                                if(element_images && imgLink){
                                    $('.IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY').append(`<a data-needed="direct" data-path="${GL_postPath}" data-name="photo" data-type="jpg" data-globalIndex="${s}" href="javascript:;" data-href="${imgLink}"><img width="100" src="${imgLink}" /><br/>- ${_i18n("IMG")} ${s} -</a>`);
                                }

                            });

                            if(blob){
                                createMediaListDOM(GL_postPath,".IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY",_i18n("LOAD_BLOB_RELOAD"));
                            }
                        }
                    }
                    else{
                        s++;
                        let element_videos = $(this).parent().parent().find('video');
                        let element_images = $(this).parent().parent().find('._aagv img');
                        let imgLink = (element_images.attr('srcset'))?element_images.attr('srcset').split(" ")[0]:element_images.attr('src');


                        if(element_videos && element_videos.attr('src')){
                            createMediaListDOM(GL_postPath,".IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY",_i18n("LOAD_BLOB_ONE"));

                            /*
                            let video_image = element_videos.attr('poster');
                            let video_url = element_videos.attr('src');

                            if(element_videos.attr('src').match(/^blob:/ig)){
                                createMediaListDOM(GL_postPath,".IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY",_i18n("LOAD_BLOB_ONE"));
                            }
                            else{
                                $('.IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY').append(`<a data-needed="direct" data-path="${GL_postPath}" data-name="video" data-type="mp4" data-globalIndex="${s}" href="javascript:;" data-href="${video_url}"><img width="100" src="${video_image}" /><br/>- ${_i18n("VID")} ${s} -</a>`);
                            }
                            */
                        }
                        if(element_images && imgLink){
                            $('.IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY').append(`<a data-needed="direct" data-path="${GL_postPath}" data-name="photo" data-type="jpg" data-globalIndex="${s}" href="javascript:;" href="" data-href="${imgLink}"><img width="100" src="${imgLink}" /><br/>- ${_i18n("IMG")} ${s} -</a>`);
                        }
                    }


                    $('.IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY a').each(function(){
                        $(this).wrap('<div></div>');
                        $(this).before('<label class="inner_box_wrapper"><input class="inner_box" type="checkbox"><span></span></label>');
                    });
                });

                // Add the mark that download is ready
                var username = $(this).find("header > div:last-child > div:first-child span").first().text();

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
            $(selector).append(`<a data-blob="true" data-needed="direct" data-path="${resource.shortcode}" data-name="video" data-type="mp4" data-username="${resource.owner.username}" data-globalIndex="${idx}" href="javascript:;" data-href="${resource.video_url}"><img width="100" src="${resource.display_resources[1].src}" /><br/>- ${_i18n("VID")} ${idx} -</a>`);
            idx++;
        }
        // GraphSidecar
        if(resource.__typename == "GraphSidecar" && resource.edge_sidecar_to_children){
            for(let e of resource.edge_sidecar_to_children.edges){
                if(e.node.__typename == "GraphVideo"){
                    $(selector).append(`<a data-blob="true" data-needed="direct" data-path="${resource.shortcode}" data-name="video" data-type="mp4" data-username="${resource.owner.username}" data-globalIndex="${idx}" href="javascript:;" data-href="${e.node.video_url}"><img width="100" src="${e.node.display_resources[1].src}" /><br/>- ${_i18n("VID")} ${idx} -</a>`);
                }

                if(e.node.__typename == "GraphImage"){
                    $(selector).append(`<a data-blob="true" data-needed="direct" data-path="${resource.shortcode}" data-name="photo" data-type="jpg" data-username="${resource.owner.username}" data-globalIndex="${idx}" href="javascript:;" data-href="${e.node.display_resources[e.node.display_resources.length - 1].src}"><img width="100" src="${e.node.display_resources[1].src}" /><br/>- ${_i18n("IMG")} ${idx} -</a>`);
                }
                idx++;
            }
        }
        $("#_SNLOAD").remove();
        $('.IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY a').each(function(){
            $(this).wrap('<div></div>');
            $(this).before('<label class="inner_box_wrapper"><input class="inner_box" type="checkbox"><span></span></label>');
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
        $('.IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_TITLE').append('<div style="position:relative;height:36px;text-align:center;margin-bottom: 7px;"><div style="position:absolute;left:0px;line-height: 18px;"><kbd>Alt</kbd>+<kbd>Q</kbd> ['+_i18n("CLOSE")+']</div><div style="line-height: 18px;">IG Helper</div><div id="post_info" style="line-height: 14px;font-size:14px;">Post ID: <span id="article-id"></span></div><svg width="26" height="26" class="IG_SN_DIG_BTN" style="cursor:pointer;position:absolute;right:0px;top:0px;fill: rgb(var(--ig-primary-text));" xmlns="http://www.w3.org/2000/svg" id="bold" enable-background="new 0 0 24 24" height="512" viewBox="0 0 24 24" width="512"><path d="m14.828 12 5.303-5.303c.586-.586.586-1.536 0-2.121l-.707-.707c-.586-.586-1.536-.586-2.121 0l-5.303 5.303-5.303-5.304c-.586-.586-1.536-.586-2.121 0l-.708.707c-.586.586-.586 1.536 0 2.121l5.304 5.304-5.303 5.303c-.586.586-.586 1.536 0 2.121l.707.707c.586.586 1.536.586 2.121 0l5.303-5.303 5.303 5.303c.586.586 1.536.586 2.121 0l.707-.707c.586-.586.586-1.536 0-2.121z"/></svg></div>');

        if(hasCheckbox){
            $('.IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_TITLE').append(`<div style="text-align: center;" id="button_group"></div>`);
            $('.IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_TITLE > div#button_group').append(`<button id="batch_download_selected">${_i18n('BATCH_DOWNLOAD_SELECTED')}</button>`);
            $('.IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_TITLE > div#button_group').append(`<button id="batch_download_direct">${_i18n('BATCH_DOWNLOAD_DIRECT')}</button>`);
            $('.IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_TITLE').append(`<br/><label class="checkbox"><input value="yes" type="checkbox" />${_i18n('ALL_CHECK')}</label>`);
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
        fetch(downloadLink).then(res => {
            return res.blob().then(dwel => {
                const a = document.createElement("a");
                const name = username+'-'+sourceType+'-'+((USER_SETTING.RENAME_SHORTCODE && shortcode)?shortcode+'-':'')+timestamp+'.'+filetype;
                const originally = username + '_' + downloadLink.split('/').at(-1).split('?').at(0);

                a.href = URL.createObjectURL(dwel);
                a.setAttribute("download", (USER_SETTING.AUTO_RENAME)?name:originally);
                a.click();
                a.remove();
            });
        });
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
                "CLOSE": "關閉",
                "ALL_CHECK": "全選",
                "BATCH_DOWNLOAD_SELECTED": "批次下載已勾選資源",
                "BATCH_DOWNLOAD_DIRECT": "批次下載全部資源",
                "IMG": "相片",
                "VID": "影片",
                "DDL": "快速下載",
                "DDL_INTRO": "勾選後將直接下載點選當下位置的相片/影片",
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
                "DISABLE_VIDEO_LOOPING": "關閉影片自動循環播放",
                "REDIRECT_RIGHT_CLICK_USER_STORY_PICTURE": "右鍵點擊使用者限時動態區域頭貼時重定向",
                "FORCE_FETCH_ALL_RESOURCES": "強制提取貼文中所有資源",
                "AUTO_RENAME_INTRO": "將檔案自動重新命名為以下格式：\n使用者名稱-類型-時間戳.檔案類型\n例如：instagram-photo-1670350000.jpg\n\n若設為 false，則檔案名稱將保持原始樣貌。 \n例如：instagram_321565527_679025940443063_4318007696887450953_n.jpg",
                "RENAME_SHORTCODE_INTRO": "將檔案自動重新命名為以下格式：\n使用者名稱-類型-Shortcode-時間戳.檔案類型\n示例：instagram-photo-CwkxyiVynpW-1670350000.jpg\n\n此功能僅在[自動重新命名檔案]設定為 TRUE 時有效。",
                "DISABLE_VIDEO_LOOPING_INTRO": "關閉連續短片和貼文中影片自動循環播放。",
                "REDIRECT_RIGHT_CLICK_USER_STORY_PICTURE_INTRO": "右鍵點選首頁限時動態區域中的使用者頭貼時，重新導向到使用者的個人資料頁面。",
                "FORCE_FETCH_ALL_RESOURCES_INTRO": "透過 Instagram API 強制取得貼文中的所有資源（照片和影片），以取消每個貼文單次提取三個資源的限制。",
            },
            "zh-CN": {
                "CLOSE": "关闭",
                "ALL_CHECK": "全选",
                "BATCH_DOWNLOAD_SELECTED": "批量下载已勾选资源",
                "BATCH_DOWNLOAD_DIRECT": "批量下载全部资源",
                "IMG": "图像",
                "VID": "视频",
                "DDL": "便捷下载",
                "DDL_INTRO": "勾选后将直接下载點擊當下位置的图像/视频",
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
                "DISABLE_VIDEO_LOOPING": "禁用视频自动循环",
                "REDIRECT_RIGHT_CLICK_USER_STORY_PICTURE": "右键单击用户故事区域头像时重定向",
                "FORCE_FETCH_ALL_RESOURCES": "强制抓取帖子中所有资源",
                "AUTO_RENAME_INTRO": "将文件自动重新命名为以下格式类型：\n用户名-类型-时间戳.文件类型\n例如：instagram-photo-1670350000.jpg\n\n若设为false，则文件名将保持原样。 \n例如：instagram_321565527_679025940443063_4318007696887450953_n.jpg",
                "RENAME_SHORTCODE_INTRO": "自动重命名文件为以下格式类型：\n用户名-类型-短码-时间戳.文件类型\n示例：instagram-photo-CwkxyiVynpW-1670350000.jpg\n\n它仅在[自动重命名文件]设置为 TRUE 时有效。",
                "DISABLE_VIDEO_LOOPING_INTRO": "禁用 Reels 和帖子中的视频自动播放。",
                "REDIRECT_RIGHT_CLICK_USER_STORY_PICTURE_INTRO": "右键单击主页故事区域中的用户头像，重定向到用户的个人资料页面。",
                "FORCE_FETCH_ALL_RESOURCES_INTRO": "通过 Instagram API 强制获取帖子中的所有资源（照片和视频），以取消每个帖子单次抓取三个资源的限制。"
            },
            "en-US": {
                "CLOSE": "Close",
                "ALL_CHECK": "Select All",
                "BATCH_DOWNLOAD_SELECTED": "Download Selected Resources",
                "BATCH_DOWNLOAD_DIRECT": "Download All Resources",
                "IMG": "Image",
                "VID": "Video",
                "DDL": "Quick Download",
                "DDL_INTRO": "Checking it will direct download current photo/media in the posts.",
                "DW": "Download",
                "THUMBNAIL_INTRO": "Download video thumbnail.",
                "LOAD_BLOB_ONE": "Loading Blob Media...",
                "LOAD_BLOB_MULTIPLE": "Loading Blob Media and others...",
                "LOAD_BLOB_RELOAD": "Detect Blob Media, now reloading...",
                "NO_CHECK_RESOURCE": "You need to check resource to download.",
                "NO_VID_URL": "Can not find video url.",
                "SETTING": "Settings",
                "AUTO_RENAME": "Automatically Rename Files",
                "RENAME_SHORTCODE": "Rename The File and Include Shortcode",
                "DISABLE_VIDEO_LOOPING": "Disable Video Auto-looping",
                "REDIRECT_RIGHT_CLICK_USER_STORY_PICTURE": "Redirect When Right-Clicking User Story Picture",
                "FORCE_FETCH_ALL_RESOURCES": "Forcing Fetch All Resources In the Post",
                "AUTO_RENAME_INTRO": "Auto rename file to format type following:\nUSERNAME-TYPE-TIMESTAMP.FILETYPE\nExample: instagram-photo-1670350000.jpg\n\nIf set to false, the file name will remain as it is.\nExample: instagram_321565527_679025940443063_4318007696887450953_n.jpg",
                "RENAME_SHORTCODE_INTRO": "Auto rename file to format type following:\nUSERNAME-TYPE-SHORTCODE-TIMESTAMP.FILETYPE\nExample: instagram-photo-CwkxyiVynpW-1670350000.jpg\n\nIt will ONLY work in [Automatically Rename Files] setting to TRUE.",
                "DISABLE_VIDEO_LOOPING_INTRO": "Disable video auto-looping in reels and posts.",
                "REDIRECT_RIGHT_CLICK_USER_STORY_PICTURE_INTRO": "Redirect to a user's profile page when right-clicking on their user avatar in the story area on the homepage.",
                "FORCE_FETCH_ALL_RESOURCES_INTRO": "Force fetching of all resources (photos and videos) in a post via the Instagram API to remove the limit of three resources per post."
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
        $('.IG_SN_DIG #post_info').text('IG Helper Settings');

        $('.IG_SN_DIG .IG_SN_DIG_BODY').append(`<label class="globalSettings" title="${_i18n('AUTO_RENAME_INTRO')}"><span>${_i18n('AUTO_RENAME')}</span> <input id="AUTO_RENAME" value="box" type="checkbox" ${(USER_SETTING.AUTO_RENAME)?'checked':''}><div class="chbtn"><div class="rounds"></div></div></label>`);
        $('.IG_SN_DIG .IG_SN_DIG_BODY').append(`<label class="globalSettings" title="${_i18n('RENAME_SHORTCODE_INTRO')}"><span>${_i18n('RENAME_SHORTCODE')}</span> <input id="RENAME_SHORTCODE" value="box" type="checkbox" ${(USER_SETTING.RENAME_SHORTCODE)?'checked':''}><div class="chbtn"><div class="rounds"></div></div></label>`);
        $('.IG_SN_DIG .IG_SN_DIG_BODY').append(`<label class="globalSettings" title="${_i18n('DISABLE_VIDEO_LOOPING_INTRO')}"><span>${_i18n('DISABLE_VIDEO_LOOPING')}</span> <input id="DISABLE_VIDEO_LOOPING" value="box" type="checkbox" ${(USER_SETTING.DISABLE_VIDEO_LOOPING)?'checked':''}><div class="chbtn"><div class="rounds"></div></div></label>`);
        $('.IG_SN_DIG .IG_SN_DIG_BODY').append(`<label class="globalSettings" title="${_i18n('REDIRECT_RIGHT_CLICK_USER_STORY_PICTURE_INTRO')}"><span>${_i18n('REDIRECT_RIGHT_CLICK_USER_STORY_PICTURE')}</span> <input id="REDIRECT_RIGHT_CLICK_USER_STORY_PICTURE" value="box" type="checkbox" ${(USER_SETTING.REDIRECT_RIGHT_CLICK_USER_STORY_PICTURE)?'checked':''}><div class="chbtn"><div class="rounds"></div></div></label>`);
        $('.IG_SN_DIG .IG_SN_DIG_BODY').append(`<label class="globalSettings" title="${_i18n('FORCE_FETCH_ALL_RESOURCES_INTRO')}"><span>${_i18n('FORCE_FETCH_ALL_RESOURCES')}</span> <input id="FORCE_FETCH_ALL_RESOURCES" value="box" type="checkbox" ${(USER_SETTING.FORCE_FETCH_ALL_RESOURCES)?'checked':''}><div class="chbtn"><div class="rounds"></div></div></label>`);
    }

    /**
     * showDebugDOM
     * Show full DOM tree
     *
     * @return {void}
     */
    function showDebugDOM(text){
        $('.IG_SN_DIG').remove();
        IG_createDM();
        $('.IG_SN_DIG #post_info').text('IG Debug DOM Tree');

        $('.IG_SN_DIG .IG_SN_DIG_BODY').append(`<textarea style="width:100%;box-sizing: border-box;height:300px;"></textarea>`);
        $('.IG_SN_DIG .IG_SN_DIG_BODY textarea').text(text.innerHTML);
    }

    // Running if document is ready
    $(function(){
        // Close the download dialog if user click the close icon
        $('body').on('click','.IG_SN_DIG_BTN,.IG_SN_DIG_BG',function(){
            $('.IG_SN_DIG').remove();
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
                let text = $('div[id^="mount"]')[0];
                showDebugDOM(text);
                e.preventDefault();
            }
        });

        $('body').on('change', '.IG_SN_DIG input',function(){
            var isChecked =  $(this).prop('checked');
            var name = $(this).attr('id');

            GM_setValue(name, isChecked);
            USER_SETTING[name] = isChecked;
        });

        $('body').on('click','a[data-needed="direct"]',async function(){
            let date = new Date().getTime();
            let timestamp = Math.floor(date / 1000);
            let username = ($(this).attr('data-username')) ? $(this).attr('data-username') : GL_username;

            if(!username && $(this).attr('data-path')){
                console.log('catching owner name from shortcode:',$(this).attr('data-href'));
                username = await getPostOwner($(this).attr('data-path'));
            }
            saveFiles($(this).attr('data-href'),username,$(this).attr('data-name'),timestamp,$(this).attr('data-type'), $(this).attr('data-path'));
        });

        // Running if user left-click download icon in stories
        $('body').on('click','.IG_DWSTORY',function(){
            onStory(true);
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

        // Running if user left-click download icon in highlight stories
        $('body').on('click','.IG_DWHISTORY_THUMBNAIL',function(){
            onHighlightsStoryThumbnail(true);
        });

        // Running if user left-click download icon in reels
        $('body').on('click','.IG_REELS',function(){
            onReels(true,true);
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
                if($(this).prev().prop('checked')){
                    $(this).click();
                    index++;
                }
            });

            if(index == 0){
                alert(_i18n('NO_CHECK_RESOURCE'));
            }
        });

        $('body').on('click', '.IG_SN_DIG_TITLE #batch_download_direct', function(){
            $('.IG_SN_DIG_BODY a[data-needed="direct"]').each(function(){
                $(this).click();
            });
        });
    });
})(jQuery);
