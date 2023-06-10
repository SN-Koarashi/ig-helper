// ==UserScript==
// @name               IG Helper
// @name:zh-TW         IG小精靈
// @name:zh-CN         IG小助手
// @name:ja            IG助手
// @name:ko            IG조수
// @namespace          https://github.snkms.com/
// @version            2.5.6.2
// @description        Downloading is possible for both photos and videos from posts, as well as for stories or reels.
// @description:zh-TW  一鍵下載對方 Instagram 貼文中的相片、影片甚至是他們的限時動態、連續短片！
// @description:zh-CN  一键下载对方 Instagram 帖子中的相片、视频甚至是他们的快拍、Reels！
// @description:ja     投稿された写真や動画だけでなく、ストーリーズやリール動画からもダウンロードが可能です。
// @description:ko     게시물에 게시된 사진과 동영상 뿐만 아니라 스토리나 릴스에서도 다운로드가 가능합니다.
// @author             SN-Koarashi (5026)
// @match              https://*.instagram.com/*
// @grant              GM_setValue
// @grant              GM_getValue
// @grant              GM_xmlhttpRequest
// @require            https://code.jquery.com/jquery-3.6.3.min.js#sha256-pvPw+upLPUjgMXY0G+8O0xUf+/Im1MZjXxxgOcBQBXU=
// @supportURL         https://discord.gg/Sh8HJ4d
// @contributionURL    https://ko-fi.com/snkoarashi
// @icon               https://www.google.com/s2/favicons?domain=www.instagram.com
// @compatible         firefox >= 87
// @compatible         chrome >= 90
// @compatible         edge >= 90
// @license            GPLv3
// ==/UserScript==

(function($) {
    'use strict';
    // Icon download by https://www.flaticon.com/authors/pixel-perfect

    /******** USER SETTINGS ********/

    // Auto rename file to format type following:
    //   USERNAME-TYPE-TIMESTAMP.FILETYPE
    //   Example: instagram-photo-1670350000.jpg
    //
    // If set to false, the file name will remain as it is.
    //   Example: instagram_321565527_679025940443063_4318007696887450953_n.jpg
    const AUTO_RENAME = true;
    /*******************************/

    const checkInterval = 250;
    const lang = navigator.language || navigator.userLanguage;

    var currentURL = location.href;
    var currentHeight = $(document).height();
    var firstStarted = false;
    var pageLoaded = false;

    var GL_postPath;
    var GL_username;
    var GL_repeat
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
                    onReelsDW(false);
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
            if(!$('body > div div.x9f619 div._adqx[data-visualcompletion="loading-state"]').length && $('canvas._aarh').length && location.href.match(/^(https:\/\/www\.instagram\.com\/)([0-9A-Za-z\.\-_]+)\/?$/ig) && !location.href.match(/^(https:\/\/www\.instagram\.com\/(stories|explore)\/?)/ig)){
                console.log('isProfile');
                setTimeout(()=>{
                    onProfileDW(false);
                },150);
                pageLoaded = true;
            }

            if(!pageLoaded){
                // Call Instagram stories function
                if(location.href.match(/^(https:\/\/www\.instagram\.com\/stories\/highlights\/)/ig)){
                    GL_dataCache.highlights = {};

                    console.log('isHighlightsStory');
                    onHighlightsStoryDW(false);
                    GL_repeat = setInterval(()=>{
                        onHighlightsStoryThumbnailDW(false);
                    },checkInterval);

                    if($(".IG_DWHISTORY").length) setTimeout(()=>{pageLoaded = true;},150);
                }
                else if(location.href.match(/^(https:\/\/www\.instagram\.com\/stories\/)/ig)){
                    console.log('isStory');
                    onStoryDW(false);
                    onStoryThumbnailDW(false);

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

        // Direct Download Checkbox
        /*
        if(!$('.AutoDownload_dom').length){
            let ckValue = (GM_getValue('AutoDownload'))?'checked':'';
            $('body div.mfclru0v.astyfpdk.om3e55n1.jez8cy9q').css('position','relative');
            $('body div.mfclru0v.astyfpdk.om3e55n1.jez8cy9q').append(`<div class="AutoDownload_dom" style="position:absolute;left:10px;bottom:7px;padding:0px;line-height:1;display:inline-block;width:fit-content;"><label title="${_i18n("DDL_INTRO")}" style="cursor:help;"><input type="checkbox" value="1" class="AutoDownload" name="AutoDownload" ${ckValue} />${_i18n("DDL")}</label></div>`);
        }
        */
    },checkInterval);

    // Call general function when user scroll the page
    $(document).scroll(function(){
        if(currentHeight != $(this).height() && location.href.split("?")[0] == "https://www.instagram.com/"){
            onReadyMyDW();
        }
    });

    // Profile funcion
    async function onProfileDW(isDownload){
        if(isDownload){
            let date = new Date().getTime();
            let timestamp = Math.floor(date / 1000);
            let username = location.href.replace(/\/$/ig,'').split('/').at(-1);
            let userInfo = await getUserId(username);

            saveFiles(userInfo.user.profile_pic_url,username,"avatar",timestamp,'jpg');
        }
        else{
            // Add the stories download button
            let style = "position: absolute;right:0px;top:0px;padding:5px;line-height:1;background:#fff;border-radius: 50%;cursor:pointer;border: 1px solid #ccc";
            if(!$('.IG_DWPROFILE').length){
                $('body > div main canvas._aarh').parent().append(`<div title="${_i18n("DW")}" class="IG_DWPROFILE" style="${style}"><svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Capa_1" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"><g><g><path d="M382.56,233.376C379.968,227.648,374.272,224,368,224h-64V16c0-8.832-7.168-16-16-16h-64c-8.832,0-16,7.168-16,16v208h-64    c-6.272,0-11.968,3.68-14.56,9.376c-2.624,5.728-1.6,12.416,2.528,17.152l112,128c3.04,3.488,7.424,5.472,12.032,5.472    c4.608,0,8.992-2.016,12.032-5.472l112-128C384.192,245.824,385.152,239.104,382.56,233.376z"/></g></g><g><g><path d="M432,352v96H80v-96H16v128c0,17.696,14.336,32,32,32h416c17.696,0,32-14.304,32-32V352H432z"/></g></g></div>`);
                return true;
            }
        }
    }

    // Highlight Stories funcion
    async function onHighlightsStoryDW(isDownload){
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
                let highStories = await getHighlightsStories(highlightId);
                let totIndex = highStories.data.reels_media[0].items.length;
                username = highStories.data.reels_media[0].owner.username;
                target = highStories.data.reels_media[0].items[totIndex-nowIndex];

                GL_dataCache.highlights[highlightId] = highStories;
            }

            if(target.is_video){
                saveFiles(target.video_resources.at(-1).src,username,"highlights",timestamp,'mp4');
            }
            else{
                saveFiles(target.display_resources.at(-1).src,username,"highlights",timestamp,'jpg');
            }
        }
        else{
            // Add the stories download button
            let style = "position: absolute;right:-40px;top:15px;padding:5px;line-height:1;background:#fff;border-radius: 5px;cursor:pointer;";
            if(!$('.IG_DWHISTORY').length){
                $('body > div section._ac0a').append(`<div title="${_i18n("DW")}" class="IG_DWHISTORY" style="${style}"><svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Capa_1" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"><g><g><path d="M382.56,233.376C379.968,227.648,374.272,224,368,224h-64V16c0-8.832-7.168-16-16-16h-64c-8.832,0-16,7.168-16,16v208h-64    c-6.272,0-11.968,3.68-14.56,9.376c-2.624,5.728-1.6,12.416,2.528,17.152l112,128c3.04,3.488,7.424,5.472,12.032,5.472    c4.608,0,8.992-2.016,12.032-5.472l112-128C384.192,245.824,385.152,239.104,382.56,233.376z"/></g></g><g><g><path d="M432,352v96H80v-96H16v128c0,17.696,14.336,32,32,32h416c17.696,0,32-14.304,32-32V352H432z"/></g></g></div>`);
                return true;
            }
        }
    }

    // Highlight Stories Thumbnail funcion
    async function onHighlightsStoryThumbnailDW(isDownload){
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
                let highStories = await getHighlightsStories(highlightId);
                let totIndex = highStories.data.reels_media[0].items.length;
                username = highStories.data.reels_media[0].owner.username;
                target = highStories.data.reels_media[0].items[totIndex-nowIndex];

                GL_dataCache.highlights[highlightId] = highStories;
            }

            saveFiles(target.display_resources.at(-1).src,username,"highlights",timestamp,'jpg');
        }
        else{
            if($('body > div section._ac0a video.xh8yej3').length){
                // Add the stories download button
                let style = "position: absolute;right:-40px;top:45px;padding:5px;line-height:1;background:#fff;border-radius: 5px;cursor:pointer;";
                if(!$('.IG_DWHISTORY_THUMBNAIL').length){
                    $('body > div section._ac0a').append(`<div title="${_i18n("THUMBNAIL_INTRO")}" class="IG_DWHISTORY_THUMBNAIL" style="${style}"><svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="512" viewBox="0 0 24 24" width="512"><circle cx="8.25" cy="5.25" r=".5"/><path d="m8.25 6.5c-.689 0-1.25-.561-1.25-1.25s.561-1.25 1.25-1.25 1.25.561 1.25 1.25-.561 1.25-1.25 1.25zm0-1.5c-.138 0-.25.112-.25.25 0 .275.5.275.5 0 0-.138-.112-.25-.25-.25z"/><path d="m7.25 11.25 2-2.5 2.25 1.5 2.25-3.5 3 4.5z"/><path d="m16.75 12h-9.5c-.288 0-.551-.165-.676-.425s-.09-.568.09-.793l2-2.5c.243-.304.678-.372 1.002-.156l1.616 1.077 1.837-2.859c.137-.212.372-.342.625-.344.246-.026.49.123.63.334l3 4.5c.153.23.168.526.037.77-.13.244-.385.396-.661.396zm-4.519-1.5h3.118l-1.587-2.381zm-3.42 0h1.712l-1.117-.745z"/><path d="m22.25 14h-2.756c-.778 0-1.452.501-1.676 1.247l-.859 2.862c-.16.533-.641.891-1.197.891h-7.524c-.556 0-1.037-.358-1.197-.891l-.859-2.861c-.224-.747-.897-1.248-1.676-1.248h-2.756c-.965 0-1.75.785-1.75 1.75v5.5c0 1.517 1.233 2.75 2.75 2.75h18.5c1.517 0 2.75-1.233 2.75-2.75v-5.5c0-.965-.785-1.75-1.75-1.75z"/><path d="m4 12c-.552 0-1-.448-1-1v-8c0-1.654 1.346-3 3-3h12c1.654 0 3 1.346 3 3v8c0 .552-.448 1-1 1s-1-.448-1-1v-8c0-.551-.449-1-1-1h-12c-.551 0-1 .449-1 1v8c0 .552-.448 1-1 1z"/></svg></div>`);
                }
            }
            else{
                $('.IG_DWHISTORY_THUMBNAIL').remove();
            }
        }
    }

    // Stories funcion
    async function onStoryDW(isDownload,isForce){
        if(isDownload){
            let date = new Date().getTime();
            let timestamp = Math.floor(date / 1000);
            let username = $("body > div section._ac0a header._ac0k ._ac0l a + div a").text() || location.pathname.split('/').at(2);

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
                        onStoryDW(true,true);
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
                $('body > div section._ac0a').append(`<div title="${_i18n("DW")}" class="IG_DWSTORY" style="${style}"><svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Capa_1" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"><g><g><path d="M382.56,233.376C379.968,227.648,374.272,224,368,224h-64V16c0-8.832-7.168-16-16-16h-64c-8.832,0-16,7.168-16,16v208h-64    c-6.272,0-11.968,3.68-14.56,9.376c-2.624,5.728-1.6,12.416,2.528,17.152l112,128c3.04,3.488,7.424,5.472,12.032,5.472    c4.608,0,8.992-2.016,12.032-5.472l112-128C384.192,245.824,385.152,239.104,382.56,233.376z"/></g></g><g><g><path d="M432,352v96H80v-96H16v128c0,17.696,14.336,32,32,32h416c17.696,0,32-14.304,32-32V352H432z"/></g></g></div>`);
                return true;
            }
        }
    }

    // Stories Thumbnail funcion
    async function onStoryThumbnailDW(isDownload,isForce){
        if(isDownload){
            // Download stories if it is video
            let date = new Date().getTime();
            let timestamp = Math.floor(date / 1000);
            let type = 'jpg';
            let username = $("body > div section._ac0a header._ac0k ._ac0l a + div a").text() || location.pathname.split('/').at(2);
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
                    onStoryThumbnailDW(true,true);
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
            if($('body > div section._ac0a video.xh8yej3').length){
                // Add the stories download button
                let style = "position: absolute;right:-40px;top:45px;padding:5px;line-height:1;background:#fff;border-radius: 5px;cursor:pointer;";
                if(!$('.IG_DWSTORY_THUMBNAIL').length){
                    $('body > div section._ac0a').append(`<div title="${_i18n("THUMBNAIL_INTRO")}" class="IG_DWSTORY_THUMBNAIL" style="${style}"><svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="512" viewBox="0 0 24 24" width="512"><circle cx="8.25" cy="5.25" r=".5"/><path d="m8.25 6.5c-.689 0-1.25-.561-1.25-1.25s.561-1.25 1.25-1.25 1.25.561 1.25 1.25-.561 1.25-1.25 1.25zm0-1.5c-.138 0-.25.112-.25.25 0 .275.5.275.5 0 0-.138-.112-.25-.25-.25z"/><path d="m7.25 11.25 2-2.5 2.25 1.5 2.25-3.5 3 4.5z"/><path d="m16.75 12h-9.5c-.288 0-.551-.165-.676-.425s-.09-.568.09-.793l2-2.5c.243-.304.678-.372 1.002-.156l1.616 1.077 1.837-2.859c.137-.212.372-.342.625-.344.246-.026.49.123.63.334l3 4.5c.153.23.168.526.037.77-.13.244-.385.396-.661.396zm-4.519-1.5h3.118l-1.587-2.381zm-3.42 0h1.712l-1.117-.745z"/><path d="m22.25 14h-2.756c-.778 0-1.452.501-1.676 1.247l-.859 2.862c-.16.533-.641.891-1.197.891h-7.524c-.556 0-1.037-.358-1.197-.891l-.859-2.861c-.224-.747-.897-1.248-1.676-1.248h-2.756c-.965 0-1.75.785-1.75 1.75v5.5c0 1.517 1.233 2.75 2.75 2.75h18.5c1.517 0 2.75-1.233 2.75-2.75v-5.5c0-.965-.785-1.75-1.75-1.75z"/><path d="m4 12c-.552 0-1-.448-1-1v-8c0-1.654 1.346-3 3-3h12c1.654 0 3 1.346 3 3v8c0 .552-.448 1-1 1s-1-.448-1-1v-8c0-.551-.449-1-1-1h-12c-.551 0-1 .449-1 1v8c0 .552-.448 1-1 1z"/></svg></div>`);
                }
            }
            else{
                $('.IG_DWSTORY_THUMBNAIL').remove();
            }
        }
    }

    // Reels funcion
    async function onReelsDW(isDownload, isVideo){
        if(isDownload){
            let reelsPath = location.href.split('?').at(0).split('instagram.com/reels/').at(-1).replaceAll('/','');
            let data = await getBlobMedia(reelsPath);
            let timestamp = new Date().getTime();

            if(isVideo && data.shortcode_media.is_video){
                let type = 'mp4';
                saveFiles(data.shortcode_media.video_url,data.shortcode_media.owner.username,"reels",timestamp,type);
            }
            else{
                let type = 'jpg';
                saveFiles(data.shortcode_media.display_resources.at(-1).src,data.shortcode_media.owner.username,"reels",timestamp,type);
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
                                let style = "position: absolute;right:40px;top:15px;padding:5px;line-height:1;background:#fff;border-radius: 5px;cursor:pointer;";
                                let style2 = "position: absolute;right:40px;top:45px;padding:5px;line-height:1;background:#fff;border-radius: 5px;cursor:pointer;";

                                $(this).children().css('position','relative');

                                $(this).children().append(`<div title="${_i18n("DW")}" class="IG_REELS" style="${style}"><svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Capa_1" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"><g><g><path d="M382.56,233.376C379.968,227.648,374.272,224,368,224h-64V16c0-8.832-7.168-16-16-16h-64c-8.832,0-16,7.168-16,16v208h-64    c-6.272,0-11.968,3.68-14.56,9.376c-2.624,5.728-1.6,12.416,2.528,17.152l112,128c3.04,3.488,7.424,5.472,12.032,5.472    c4.608,0,8.992-2.016,12.032-5.472l112-128C384.192,245.824,385.152,239.104,382.56,233.376z"/></g></g><g><g><path d="M432,352v96H80v-96H16v128c0,17.696,14.336,32,32,32h416c17.696,0,32-14.304,32-32V352H432z"/></g></g></div>`);
                                $(this).children().append(`<div title="${_i18n("THUMBNAIL_INTRO")}" class="IG_REELS_THUMBNAIL" style="${style2}"><svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="512" viewBox="0 0 24 24" width="512"><circle cx="8.25" cy="5.25" r=".5"/><path d="m8.25 6.5c-.689 0-1.25-.561-1.25-1.25s.561-1.25 1.25-1.25 1.25.561 1.25 1.25-.561 1.25-1.25 1.25zm0-1.5c-.138 0-.25.112-.25.25 0 .275.5.275.5 0 0-.138-.112-.25-.25-.25z"/><path d="m7.25 11.25 2-2.5 2.25 1.5 2.25-3.5 3 4.5z"/><path d="m16.75 12h-9.5c-.288 0-.551-.165-.676-.425s-.09-.568.09-.793l2-2.5c.243-.304.678-.372 1.002-.156l1.616 1.077 1.837-2.859c.137-.212.372-.342.625-.344.246-.026.49.123.63.334l3 4.5c.153.23.168.526.037.77-.13.244-.385.396-.661.396zm-4.519-1.5h3.118l-1.587-2.381zm-3.42 0h1.712l-1.117-.745z"/><path d="m22.25 14h-2.756c-.778 0-1.452.501-1.676 1.247l-.859 2.862c-.16.533-.641.891-1.197.891h-7.524c-.556 0-1.037-.358-1.197-.891l-.859-2.861c-.224-.747-.897-1.248-1.676-1.248h-2.756c-.965 0-1.75.785-1.75 1.75v5.5c0 1.517 1.233 2.75 2.75 2.75h18.5c1.517 0 2.75-1.233 2.75-2.75v-5.5c0-.965-.785-1.75-1.75-1.75z"/><path d="m4 12c-.552 0-1-.448-1-1v-8c0-1.654 1.346-3 3-3h12c1.654 0 3 1.346 3 3v8c0 .552-.448 1-1 1s-1-.448-1-1v-8c0-.551-.449-1-1-1h-12c-.551 0-1 .449-1 1v8c0 .552-.448 1-1 1z"/></svg></div>`);
                            }
                        }
                    });
                }
            },250);
        }
    }

    // Prepare promise to fetch user stories
    function getHighlightsStories(highlightId){
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

    // Prepare promise to fetch user stories
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

    // Prepare promise to fetch user id by username
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

    // Prepare promise to catch article author using shortcode
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

    // Prepare promise to cache article which contains blob media
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

    // Main function
    function onReadyMyDW(NoDialog){
        // Whether is Instagram dialog?
        if(!NoDialog){
            // Running if it is dialog
            $('article, div.x13ehr01').each(function(){
                $(this).removeAttr('data-snig');
                $(this).unbind('click');
            });
            $('.SNKMS_IG_DW_MAIN,.SNKMS_IG_DW_MAIN_VIDEO').remove();
        }
        if(NoDialog == false){
            var repeat = setInterval(() => {
                // div.x13ehr01 << (sigle post in top, not floating) >>
                if($('article[data-snig="canDownload"], div.x13ehr01[data-snig="canDownload"]').length > 0) clearInterval(repeat);
                createArtBtn();
            },250);
        }
        else{
            createArtBtn();
        }
    }

    function createArtBtn(){
        // Add download icon per each posts
        $('article, div.x13ehr01').each(function(){
            // If it is have not download icon
            if(!$(this).attr('data-snig')){
                console.log("Found article");
                var rightPos = 15;
                if(this.tagName === "DIV"){
                    rightPos = ($(this).children('div:last-child').width() !== undefined) ? $(this).children('div:last-child').width()+15 : 335+15
                }

                var style = `position: absolute;right:${rightPos}px;top:15px;padding:6px;line-height:1;background:#fff;border-radius: 50%;cursor:pointer;`;

                // Add the download icon
                let $childElement = $(this).children("div").children("div");
                $childElement.eq((this.tagName === "DIV")? 0 : $childElement.length - 2).append(`<div title="${_i18n("DW")}" class="SNKMS_IG_DW_MAIN" style="${style}"><svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Capa_1" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"><g><g><path d="M382.56,233.376C379.968,227.648,374.272,224,368,224h-64V16c0-8.832-7.168-16-16-16h-64c-8.832,0-16,7.168-16,16v208h-64    c-6.272,0-11.968,3.68-14.56,9.376c-2.624,5.728-1.6,12.416,2.528,17.152l112,128c3.04,3.488,7.424,5.472,12.032,5.472    c4.608,0,8.992-2.016,12.032-5.472l112-128C384.192,245.824,385.152,239.104,382.56,233.376z"/></g></g><g><g><path d="M432,352v96H80v-96H16v128c0,17.696,14.336,32,32,32h416c17.696,0,32-14.304,32-32V352H432z"/></g></g></div>`);

                // Running if user click the download icon
                $(this).on('click','.SNKMS_IG_DW_MAIN', async function(e){
                    GL_username = $(this).parent().parent().parent().attr('data-username');
                    GL_postPath = location.pathname.split('/p/').at(-1).replaceAll('/','') || $(this).parent().parent().children("div:last-child").children("div").children("div:last-child").find('a[href^="/p/"]').last().attr("href").split("/").at(2);

                    // Create element that download dailog
                    IG_createDM(GM_getValue('AutoDownload'));

                    $("#article-id").text(GL_postPath);
                    var style = 'display:block;margin:5px 0px;padding:5px 0px;color:#111;font-size:1rem;line-height:1rem;text-align:center;border:1px solid #000;border-radius: 5px;';

                    // Find video/image element and add the download icon
                    var s = 0;
                    var multiple = $(this).parent().parent().find('._aap0 ._acaz').length;
                    var pathname = window.location.pathname;
                    var fullpathname = "/"+pathname.split('/')[1]+"/"+pathname.split('/')[2]+"/";
                    // If posts have more than one images or videos.
                    if(multiple){
                        var blob = false;
                        $(this).parent().find('._aap0 ._acaz').each(function(){
                            let element_videos = $(this).parent().parent().find('video');
                            //if(element_videos && element_videos.attr('src') && element_videos.attr('src').match(/^blob:/ig)){
                            if(element_videos && element_videos.attr('src')){
                                blob = true;
                            }
                        });


                        if(blob){
                            createMediaCacheDOM(GL_postPath,".IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY",style,_i18n("LOAD_BLOB_MULTIPLE"));
                        }
                        else{
                            let blob = false;
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

                                    $('.IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY').append(`<a data-needed="direct" data-path="${GL_postPath}" data-name="IGTV" data-type="mp4" data-globalIndex="${s}" style="${style}" href="javascript:;" data-href="${video_url}"><img width="100" src="${video_image}" /><br/>- ${_i18n("VID")} ${s} -</a>`);

                                    if(video_url.match(/^blob:/ig)) blob = true;
                                    */
                                }
                                if(element_images && imgLink){
                                    $('.IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY').append(`<a data-needed="direct" data-path="${GL_postPath}" data-name="photo" data-type="jpg" data-globalIndex="${s}" style="${style}" href="javascript:;" data-href="${imgLink}"><img width="100" src="${imgLink}" /><br/>- ${_i18n("IMG")} ${s} -</a>`);
                                }

                            });

                            if(blob){
                                createMediaCacheDOM(GL_postPath,".IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY",style,_i18n("LOAD_BLOB_RELOAD"));
                            }
                        }
                    }
                    else{
                        s++;
                        let element_videos = $(this).parent().parent().find('video');
                        let element_images = $(this).parent().parent().find('._aagv img');
                        let imgLink = (element_images.attr('srcset'))?element_images.attr('srcset').split(" ")[0]:element_images.attr('src');


                        if(element_videos && element_videos.attr('src')){
                            createMediaCacheDOM(GL_postPath,".IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY",style,_i18n("LOAD_BLOB_ONE"));

                            /*
                            let video_image = element_videos.attr('poster');
                            let video_url = element_videos.attr('src');

                            if(element_videos.attr('src').match(/^blob:/ig)){
                                createMediaCacheDOM(GL_postPath,".IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY",style,_i18n("LOAD_BLOB_ONE"));
                            }
                            else{
                                $('.IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY').append(`<a data-needed="direct" data-path="${GL_postPath}" data-name="video" data-type="mp4" data-globalIndex="${s}" style="${style}" href="javascript:;" data-href="${video_url}"><img width="100" src="${video_image}" /><br/>- ${_i18n("VID")} ${s} -</a>`);
                            }
                            */
                        }
                        if(element_images && imgLink){
                            $('.IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_BODY').append(`<a data-needed="direct" data-path="${GL_postPath}" data-name="photo" data-type="jpg" data-globalIndex="${s}" style="${style}" href="javascript:;" href="" data-href="${imgLink}"><img width="100" src="${imgLink}" /><br/>- ${_i18n("IMG")} ${s} -</a>`);
                        }
                    }
                });

                // Add the mark that download is ready
                var username = $(this).find("header > div:last-child > div:first-child span > a").first().text();

                $(this).attr('data-snig','canDownload');
                $(this).attr('data-username',username);
            }
        });
    }

    // Create media element from blob media
    async function createMediaCacheDOM(postURL,selector,style,message){
        $(`${selector} a`).remove();
        $(selector).append('<p style="text-align:center;font-size:20px;" id="_SNLOAD">'+ message +'</p>');
        let media = await getBlobMedia(postURL);
        let idx = 1;
        let resource = media.shortcode_media;

        // GraphVideo
        if(resource.__typename == "GraphVideo" && resource.video_url){
            $(selector).append(`<a data-blob="true" data-needed="direct" data-path="${resource.shortcode}" data-name="video" data-type="mp4" data-username="${resource.owner.username}" data-globalIndex="${idx}" style="${style}" href="javascript:;" data-href="${resource.video_url}"><img width="100" src="${resource.display_resources[1].src}" /><br/>- ${_i18n("VID")} ${idx} -</a>`);
            idx++;
        }
        // GraphSidecar
        if(resource.__typename == "GraphSidecar" && resource.edge_sidecar_to_children){
            for(let e of resource.edge_sidecar_to_children.edges){
                if(e.node.__typename == "GraphVideo"){
                    $(selector).append(`<a data-blob="true" data-needed="direct" data-path="${resource.shortcode}" data-name="video" data-type="mp4" data-username="${resource.owner.username}" data-globalIndex="${idx}" style="${style}" href="javascript:;" data-href="${e.node.video_url}"><img width="100" src="${e.node.display_resources[1].src}" /><br/>- ${_i18n("VID")} ${idx} -</a>`);
                }

                if(e.node.__typename == "GraphImage"){
                    $(selector).append(`<a data-blob="true" data-needed="direct" data-path="${resource.shortcode}" data-name="photo" data-type="jpg" data-username="${resource.owner.username}" data-globalIndex="${idx}" style="${style}" href="javascript:;" data-href="${e.node.display_resources[e.node.display_resources.length - 1].src}"><img width="100" src="${e.node.display_resources[1].src}" /><br/>- ${_i18n("IMG")} ${idx} -</a>`);
                }
                idx++;
            }
        }
        $("#_SNLOAD").remove();
    }

    // Create the download dialog element funcion
    function IG_createDM(a){
        let style = (!a)?"position: fixed;left: 0px;right: 0px;bottom: 0px;top: 0px;":"display:none;";
        $('body').append('<div class="IG_SN_DIG" style="'+style+';z-index: 500;"><div class="IG_SN_DIG_BG" style="'+style+'z-index:502;background: rgba(0,0,0,.75);"></div><div class="IG_SN_DIG_MAIN" style="z-index: 510;padding:10px 15px;top:7%;position: absolute;left: 50%;transform: translateX(-50%);width: 500px;background:#fff;border-radius: 7px;"><div class="IG_SN_DIG_TITLE"></div><div style="min-height: 100px;max-height: 80vh;overflow-y:auto;" class="IG_SN_DIG_BODY"></div></div></div>');
        $('.IG_SN_DIG .IG_SN_DIG_MAIN .IG_SN_DIG_TITLE').append('<div style="position:relative;height:36px;text-align:center;"><div style="position:absolute;left:0px;line-height: 18px;">Alt+Q ['+_i18n("CLOSE")+']</div><div style="line-height: 18px;">IG Helper</div><div style="line-height: 14px;font-size:14px;">Article: <span id="article-id"></span></div><svg width="26" height="26" class="IG_SN_DIG_BTN" style="cursor:pointer;position:absolute;right:0px;top:0px;" xmlns="http://www.w3.org/2000/svg" id="bold" enable-background="new 0 0 24 24" height="512" viewBox="0 0 24 24" width="512"><path d="m14.828 12 5.303-5.303c.586-.586.586-1.536 0-2.121l-.707-.707c-.586-.586-1.536-.586-2.121 0l-5.303 5.303-5.303-5.304c-.586-.586-1.536-.586-2.121 0l-.708.707c-.586.586-.586 1.536 0 2.121l5.304 5.304-5.303 5.303c-.586.586-.586 1.536 0 2.121l.707.707c.586.586 1.536.586 2.121 0l5.303-5.303 5.303 5.303c.586.586 1.536.586 2.121 0l.707-.707c.586-.586.586-1.536 0-2.121z"/></svg></div>');
    }

    // Download and rename files
    function saveFiles(downloadLink,username,index,timestamp,type){
        fetch(downloadLink).then(res => {
            return res.blob().then(dwel => {
                const a = document.createElement("a");
                const name = username+'-'+index+'-'+timestamp+'.'+type;
                const originally = username + '_' + downloadLink.split('/').at(-1).split('?').at(0);

                a.href = URL.createObjectURL(dwel);
                a.setAttribute("download", (AUTO_RENAME)?name:originally);
                a.click();
                a.remove();
            });
        });
    }

    // Supported language list
    function translateText(lang){
        return {
            "zh-TW": {
                "CLOSE": "關閉",
                "IMG": "相片",
                "VID": "影片",
                "DDL": "快速下載",
                "DDL_INTRO": "勾選後將直接下載點選當下位置的相片/影片",
                "DW": "下載",
                "THUMBNAIL_INTRO": "下載影片縮圖",
                "LOAD_BLOB_ONE": "正在載入二進位大型物件...",
                "LOAD_BLOB_MULTIPLE": "正在載入多個二進位大型物件...",
                "LOAD_BLOB_RELOAD": "正在重新載入二進位大型物件...",
                "NO_VID_URL": "找不到影片網址"
            },
            "zh-CN": {
                "CLOSE": "关闭",
                "IMG": "图像",
                "VID": "视频",
                "DDL": "便捷下载",
                "DDL_INTRO": "勾选后将直接下载點擊當下位置的图像/视频",
                "DW": "下载",
                "THUMBNAIL_INTRO": "下载视频缩略图",
                "LOAD_BLOB_ONE": "正在载入大型媒体对象...",
                "LOAD_BLOB_MULTIPLE": "正在载入多个大型媒体对象...",
                "LOAD_BLOB_RELOAD": "正在重新载入大型媒体对象...",
                "NO_VID_URL": "找不到视频网址"
            },
            "en-US": {
                "CLOSE": "Close",
                "IMG": "Image",
                "VID": "Video",
                "DDL": "Quick Download",
                "DDL_INTRO": "Checking it will direct download current photo/media in the posts.",
                "DW": "Download",
                "THUMBNAIL_INTRO": "Download video thumbnail.",
                "LOAD_BLOB_ONE": "Loading Blob Media...",
                "LOAD_BLOB_MULTIPLE": "Loading Blob Media and others...",
                "LOAD_BLOB_RELOAD": "Detect Blob Media, now reloading...",
                "NO_VID_URL": "Can not find video url."
            }
        };
    }

    // Translate display text to user country
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

    // Running if document is ready
    $(function(){
        // Close the download dialog if user click the close icon
        $('body').on('click','.IG_SN_DIG_BTN,.IG_SN_DIG_BG',function(){
            $('.IG_SN_DIG').remove();
        });

        // Hot key [Alt+Q] to close the download dialog
        $(window).keydown(function(e){
            if (e.keyCode == '81' && e.altKey){
                $('.IG_SN_DIG').remove();
                e.preventDefault();
            }
        });
        $('body').on('click','.AutoDownload',function(){
            if($('.AutoDownload:checked').length){
                GM_setValue('AutoDownload',true);
            }
            else{
                GM_setValue('AutoDownload',false);
            }
        });

        $('body').on('click','a[data-needed="direct"]',async function(){
            let date = new Date().getTime();
            let timestamp = Math.floor(date / 1000);
            let username = ($(this).attr('data-username')) ? $(this).attr('data-username') : GL_username;

            if(!username && $(this).attr('data-path')){
                console.log('catching owner name from shortcode:',$(this).attr('data-href'));
                username = await getPostOwner($(this).attr('data-path'));
            }

            saveFiles($(this).attr('data-href'),username,$(this).attr('data-name'),timestamp,$(this).attr('data-type'));
        });

        // Running if user left-click download icon in stories
        $('body').on('click','.IG_DWSTORY',function(){
            onStoryDW(true);
        });

        // Running if user left-click download icon in stories
        $('body').on('click','.IG_DWSTORY_THUMBNAIL',function(){
            onStoryThumbnailDW(true);
        });

        // Running if user left-click download icon in profile
        $('body').on('click','.IG_DWPROFILE',function(e){
            e.stopPropagation();
            onProfileDW(true);
        });

        // Running if user left-click download icon in highlight stories
        $('body').on('click','.IG_DWHISTORY',function(){
            onHighlightsStoryDW(true);
        });

        // Running if user left-click download icon in highlight stories
        $('body').on('click','.IG_DWHISTORY_THUMBNAIL',function(){
            onHighlightsStoryThumbnailDW(true);
        });

        // Running if user left-click download icon in reels
        $('body').on('click','.IG_REELS',function(){
            onReelsDW(true,true);
        });

        // Running if user left-click download icon in reels
        $('body').on('click','.IG_REELS_THUMBNAIL',function(){
            onReelsDW(true,false);
        });
    });

})(jQuery);
