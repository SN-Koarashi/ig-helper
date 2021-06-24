// ==UserScript==
// @name               IG Helper
// @name:zh-TW         IG小精靈
// @name:zh-CN         IG小助手
// @name:ja            IG助手
// @name:ko            IG조수
// @namespace          https://github.snkms.com/
// @version            2.2.12
// @description        Downloading Instagram posts photos and videos or their stories!
// @description:zh-TW  一鍵下載對方 Instagram 貼文中的相片、影片甚至是他們的限時動態！
// @description:zh-CN  一键下载对方 Instagram 帖子中的相片、视频甚至是他们的快拍！
// @description:ja     写真、ビデオ、そしてお互いの Instagram 投稿からのストーリーずズのワンクリックダウンロード！
// @description:ko     Instagram 게시물에서 사진, 비디오 또는 이야기를 다운로드하십시오.
// @author             SN-Koarashi (5026)
// @match              https://*.instagram.com/*
// @grant              GM_setValue
// @grant              GM_getValue
// @grant              GM_xmlhttpRequest
// @grant              unsafeWindow
// @require            https://code.jquery.com/jquery-3.5.1.min.js
// @supportURL         https://www.facebook.com/smileopwe/
// @compatible         firefox >= 52
// @compatible         chrome >= 55
// @license            GPLv3
// ==/UserScript==
 
(function() {
    'use strict';
    // Icon download by https://www.flaticon.com/authors/pixel-perfect
 
    // Global variable
    GM_setValue('dialog',true);
    GM_setValue('URLs',location.href);
    GM_setValue('dw_delay',false);
    var $ = window.jQuery;
    var __additionalData = unsafeWindow.__additionalData;
 
    // Main Timer
    var timer = setInterval(function(){
 
        // Record document height
        GM_setValue('oldHeight',$(document).height());
 
        // Call Instagram dialog function if url changed.
        if(GM_getValue('URLs') != location.href && $('div.PdwC2.fXiEu.s2MYR').length && onChangeURL()){
            console.log('isDialog');
            onReadyMyDW(false);
            GM_setValue('URLs',location.href);
        }
 
        // Call general function
        if($('article ._97aPb[data-snig="canDownload"]').length==0 && onChangeURL() && !$('div._2dDPU[role="dialog"]').length){
            onReadyMyDW(true);
        }
 
        // Call Instagram stories function
        if($('div#react-root section._9eogI._01nki').length && onChangeStoryURL()){
            onStoryDW(false);
            onStoryThumbnailDW(false);
        }
        else{
            // Remove the download icon
            $('.IG_DWSTORY').remove();
            $('.IG_DWSTORY_THUMBNAIL').remove();
        }
 
        // Direct Download Checkbox
        if(!$('.AutoDownload_dom').length){
            let ckValue = (GM_getValue('AutoDownload'))?'checked':'';
            $('body .ctQZg').append('<div class="AutoDownload_dom" style="position: absolute;left:15px;top:0px;padding:6px;line-height:1;background:#fff;border-radius: 50%;"><label title="Checking it will direct download current photos in the posts." style="cursor:help;"><input type="checkbox" value="1" class="AutoDownload" name="AutoDownload" '+ckValue+' />DDL</label></div>');
        }
 
    },500);
 
    // Call general function when user scroll the page
    $(document).scroll(function(){
        if(GM_getValue('oldHeight') != $(this).height()){
            onReadyMyDW();
        }
    });
 
    // Stories funcion
    function onStoryDW(isDownload){
        if(isDownload){
            let date = new Date().getTime();
            let timestamp = Math.floor(date / 1000);
            let username = $("div#react-root section._9eogI._01nki div section.szopg div.Cd8X1 header.C1rPk div.B7GUE div._295C2 div.Rkqev > a").attr('title');
 
            if($('video.y-yJ5').length){
                // Download stories if it is video
                let downloadLink = $('video.y-yJ5 source').attr('src')+'&dl=1';
                let type = 'mp4';
 
                saveFiles(downloadLink,username,"stories",timestamp,type);
            }
            else{
                // Download stories if it is image
                let link = $('img.y-yJ5').attr('srcset').split(',')[0].split(' ')[0];
                let downloadLink = link+'&dl=1';
                let type = 'jpg';
 
                saveFiles(downloadLink,username,"stories",timestamp,type);
            }
        }
        else{
            // Add the stories download button
            let style = "position: absolute;right:-40px;top:15px;padding:5px;line-height:1;background:#fff;border-radius: 5px;cursor:pointer;";
            if(!$('.IG_DWSTORY').length){
                $('div#react-root section._9eogI._01nki div section.szopg div.Cd8X1').append('<div title="Download" class="IG_DWSTORY" style="'+style+'"><svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Capa_1" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"><g><g><path d="M382.56,233.376C379.968,227.648,374.272,224,368,224h-64V16c0-8.832-7.168-16-16-16h-64c-8.832,0-16,7.168-16,16v208h-64    c-6.272,0-11.968,3.68-14.56,9.376c-2.624,5.728-1.6,12.416,2.528,17.152l112,128c3.04,3.488,7.424,5.472,12.032,5.472    c4.608,0,8.992-2.016,12.032-5.472l112-128C384.192,245.824,385.152,239.104,382.56,233.376z"/></g></g><g><g><path d="M432,352v96H80v-96H16v128c0,17.696,14.336,32,32,32h416c17.696,0,32-14.304,32-32V352H432z"/></g></g></div>');
            }
        }
    }
 
    // Stories Thumbnail funcion
    function onStoryThumbnailDW(isDownload){
        if(isDownload){
            // Download stories if it is video
            let downloadLink = $('img.y-yJ5').attr('srcset').split(',')[0].split(' ')[0];
            let date = new Date().getTime();
            let timestamp = Math.floor(date / 1000);
            let type = 'jpg';
            let username = $("div#react-root section._9eogI._01nki div section.szopg div.Cd8X1 header.C1rPk div.B7GUE div._295C2 div.Rkqev > a").attr('title');
            let style = 'margin:5px 0px;padding:5px 0px;color:#111;font-size:1rem;line-height:1rem;text-align:center;border:1px solid #000;border-radius: 5px;';
 
            // Download thumbnail
            saveFiles(downloadLink,username,"thumbnail",timestamp,type);
        }
        else{
            if($('video.y-yJ5').length){
                // Add the stories download button
                let style = "position: absolute;right:-40px;top:45px;padding:5px;line-height:1;background:#fff;border-radius: 5px;cursor:pointer;";
                if(!$('.IG_DWSTORY_THUMBNAIL').length){
                    $('div#react-root section._9eogI._01nki div section.szopg div.Cd8X1').append('<div title="Download video thumbnail" class="IG_DWSTORY_THUMBNAIL" style="'+style+'"><svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="512" viewBox="0 0 24 24" width="512"><circle cx="8.25" cy="5.25" r=".5"/><path d="m8.25 6.5c-.689 0-1.25-.561-1.25-1.25s.561-1.25 1.25-1.25 1.25.561 1.25 1.25-.561 1.25-1.25 1.25zm0-1.5c-.138 0-.25.112-.25.25 0 .275.5.275.5 0 0-.138-.112-.25-.25-.25z"/><path d="m7.25 11.25 2-2.5 2.25 1.5 2.25-3.5 3 4.5z"/><path d="m16.75 12h-9.5c-.288 0-.551-.165-.676-.425s-.09-.568.09-.793l2-2.5c.243-.304.678-.372 1.002-.156l1.616 1.077 1.837-2.859c.137-.212.372-.342.625-.344.246-.026.49.123.63.334l3 4.5c.153.23.168.526.037.77-.13.244-.385.396-.661.396zm-4.519-1.5h3.118l-1.587-2.381zm-3.42 0h1.712l-1.117-.745z"/><path d="m22.25 14h-2.756c-.778 0-1.452.501-1.676 1.247l-.859 2.862c-.16.533-.641.891-1.197.891h-7.524c-.556 0-1.037-.358-1.197-.891l-.859-2.861c-.224-.747-.897-1.248-1.676-1.248h-2.756c-.965 0-1.75.785-1.75 1.75v5.5c0 1.517 1.233 2.75 2.75 2.75h18.5c1.517 0 2.75-1.233 2.75-2.75v-5.5c0-.965-.785-1.75-1.75-1.75z"/><path d="m4 12c-.552 0-1-.448-1-1v-8c0-1.654 1.346-3 3-3h12c1.654 0 3 1.346 3 3v8c0 .552-.448 1-1 1s-1-.448-1-1v-8c0-.551-.449-1-1-1h-12c-.551 0-1 .449-1 1v8c0 .552-.448 1-1 1z"/></svg></div>');
                }
            }
            else{
                $('.IG_DWSTORY_THUMBNAIL').remove();
            }
        }
    }
    // URL change function
    function onChangeURL(){
        let reA = /^(https:\/\/www.instagram.com\/p\/)/g;
        let reB = /^(https:\/\/www.instagram.com\/)$/g;
        let URLs = location.href;
        if(URLs.match(reA) || URLs.match(reB)){
            return true;
        }
    }
 
    // URL change function if page in stories
    function onChangeStoryURL(){
        let re = /^(https:\/\/www.instagram.com\/stories\/)/g;
        let URLs = location.href;
        if(URLs.match(re)){
            return true;
        }
    }
 
    // Main function
    function onReadyMyDW(NoDialog){
        // Whether is Instagram dialog?
        if(!NoDialog){
            // Running if it is dialog
            $('article ._97aPb').each(function(){
                $(this).removeAttr('data-snig');
                $(this).unbind('click');
            });
            $('.SNKMS_IG_DW_MAIN,.SNKMS_IG_DW_MAIN_VIDEO').remove();
        }
 
        // Add download icon per each posts
        $('article ._97aPb').each(function(){
            // If it is have not download icon
            if(!$(this).attr('data-snig')){
                var style = "position: absolute;right:15px;top:15px;padding:6px;line-height:1;background:#fff;border-radius: 50%;cursor:pointer;";
 
                // Add the download icon
                $(this).append('<div title="Download" class="SNKMS_IG_DW_MAIN" style="'+style+'"><svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Capa_1" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"><g><g><path d="M382.56,233.376C379.968,227.648,374.272,224,368,224h-64V16c0-8.832-7.168-16-16-16h-64c-8.832,0-16,7.168-16,16v208h-64    c-6.272,0-11.968,3.68-14.56,9.376c-2.624,5.728-1.6,12.416,2.528,17.152l112,128c3.04,3.488,7.424,5.472,12.032,5.472    c4.608,0,8.992-2.016,12.032-5.472l112-128C384.192,245.824,385.152,239.104,382.56,233.376z"/></g></g><g><g><path d="M432,352v96H80v-96H16v128c0,17.696,14.336,32,32,32h416c17.696,0,32-14.304,32-32V352H432z"/></g></g></div>');
 
                // Running if user click the download icon
                $(this).on('click','.SNKMS_IG_DW_MAIN',function(e){
                    GM_setValue('username',$(this).parent().attr('data-username'));
                    // Create element that download dailog
                    IG_createDM(GM_getValue('AutoDownload'));
 
                    var style = 'margin:5px 0px;padding:5px 0px;color:#111;font-size:1rem;line-height:1rem;text-align:center;border:1px solid #000;border-radius: 5px;';
 
                    // Find video/image element and add the download icon
                    var s = 0;
                    var multiple = $(this).parent().find('.EcJQs .RzuR0').length;
                    var pathname = window.location.pathname;
                    var fullpathname = "/"+pathname.split('/')[1]+"/"+pathname.split('/')[2]+"/";
 
                    // If posts have more than one images or videos.
                    if(multiple){
                        $(this).parent().find('.EcJQs .RzuR0').each(function(){
                            s++;
                            let element_videos = $(this).parent().find('video.tWeCl');
                            let element_images = $(this).parent().find('.FFVAD');
 
                            if(element_videos && element_videos.attr('src')){
                                let video_image = (__additionalData[fullpathname])?__additionalData[fullpathname].data.graphql.shortcode_media.display_url:element_videos.next().attr('src');
                                let video_url = (__additionalData[fullpathname])?__additionalData[fullpathname].data.graphql.shortcode_media.video_url:element_videos.attr('src');
 
                                if(element_videos.attr('src').match(/^blob:/ig)){
                                    $('.IG_SN_DIG .IG_SN_DIG_MAIN').append("<div id='loadingText' style='text-align:center;font-size:1.75rem;margin-top:55px;'>Loading...</div>");
                                    GM_setValue('dw_delay',true);
                                    GM_xmlhttpRequest({
                                        method: "GET",
                                        url: location.href,
                                        onload: function(response) {
                                            $('.IG_SN_DIG .IG_SN_DIG_MAIN #loadingText').remove();
                                            let reg = new RegExp(`,"video_url":"(.*?)"`,"s");
                                            let vd = response.responseText.match(reg)[1];
                                            let vd_url = decodeURIComponent(JSON.parse('"'+vd+'"'));
                                            $('.IG_SN_DIG .IG_SN_DIG_MAIN').append('<a data-type="mp4" data-globalIndex="'+s+'" style="'+style+'" target="_blank" href="'+vd_url+'&dl=1"><img width="100" src="'+element_videos.attr('poster')+'" /><br/>- Blob Video '+s+' -</a>');
                                            GM_setValue('dw_delay',false);
                                        }
                                    });
                                }
                                else if(element_videos.attr('poster')){
                                    $('.IG_SN_DIG .IG_SN_DIG_MAIN').append('<a data-type="mp4" data-globalIndex="'+s+'" style="'+style+'" target="_blank" href="'+video_url+'&dl=1"><img width="100" src="'+element_videos.attr('poster')+'" /><br/>- IGTV '+s+' -</a>');
                                }
                                else{
                                    $('.IG_SN_DIG .IG_SN_DIG_MAIN').append('<a data-type="mp4" data-globalIndex="'+s+'" style="'+style+'" target="_blank" href="'+video_url+'&dl=1"><img width="100" src="'+video_image+'" /><br/>- Video '+s+' -</a>');
                                }
                            }
                            if(element_images && element_images.attr('src')){
                                $('.IG_SN_DIG .IG_SN_DIG_MAIN').append('<a data-type="jpg" data-globalIndex="'+s+'" style="'+style+'" target="_blank" href="'+element_images.attr('src')+'&dl=1"><img width="100" src="'+element_images.attr('src')+'" /><br/>- Image '+s+' -</a>');
                            }
                        });
                    }
                    else{
                        s++;
                        let element_videos = $(this).parent().find('video.tWeCl');
                        let element_images = $(this).parent().find('.FFVAD');
 
                        if(element_videos && element_videos.attr('src')){
                            let video_image = (__additionalData[fullpathname])?__additionalData[fullpathname].data.graphql.shortcode_media.display_url:element_videos.next().attr('src');
                            let video_url = (__additionalData[fullpathname])?__additionalData[fullpathname].data.graphql.shortcode_media.video_url:element_videos.attr('src');
 
                            if(element_videos.attr('src').match(/^blob:/ig)){
                                $('.IG_SN_DIG .IG_SN_DIG_MAIN').append("<div id='loadingText' style='text-align:center;font-size:1.75rem;margin-top:55px;'>Loading...</div>");
                                GM_setValue('dw_delay',true);
                                GM_xmlhttpRequest({
                                    method: "GET",
                                    url: location.href,
                                    onload: function(response) {
                                        $('.IG_SN_DIG .IG_SN_DIG_MAIN #loadingText').remove();
                                        let reg = new RegExp(`,"video_url":"(.*?)"`,"s");
                                        let vd = response.responseText.match(reg)[1];
                                        let vd_url = decodeURIComponent(JSON.parse('"'+vd+'"'));
                                        $('.IG_SN_DIG .IG_SN_DIG_MAIN').append('<a data-type="mp4" data-globalIndex="'+s+'" style="'+style+'" target="_blank" href="'+vd_url+'&dl=1"><img width="100" src="'+element_videos.attr('poster')+'" /><br/>- Blob Video '+s+' -</a>');
                                        GM_setValue('dw_delay',false);
                                    }
                                });
                            }
                            else if(element_videos.attr('poster')){
                                $('.IG_SN_DIG .IG_SN_DIG_MAIN').append('<a data-type="mp4" data-globalIndex="'+s+'" style="'+style+'" target="_blank" href="'+video_url+'&dl=1"><img width="100" src="'+element_videos.attr('poster')+'" /><br/>- IGTV '+s+' -</a>');
                            }
                            else{
                                $('.IG_SN_DIG .IG_SN_DIG_MAIN').append('<a data-type="mp4" data-globalIndex="'+s+'" style="'+style+'" target="_blank" href="'+video_url+'&dl=1"><img width="100" src="'+video_image+'" /><br/>- Video '+s+' -</a>');
                            }
                        }
                        if(element_images && element_images.attr('src')){
                            $('.IG_SN_DIG .IG_SN_DIG_MAIN').append('<a data-type="jpg" data-globalIndex="'+s+'" style="'+style+'" target="_blank" href="'+element_images.attr('src')+'&dl=1"><img width="100" src="'+element_images.attr('src')+'" /><br/>- Image '+s+' -</a>');
                        }
                    }
 
 
                    if(GM_getValue('AutoDownload')){
                        GM_setValue('GB_Index',0);
                        let LeftButton = $(this).parent().find('button.POSa_').length;
                        let RightButton = $(this).parent().find('button._6CZji').length;
 
                        if(LeftButton && !RightButton){ // Far Right
                            GM_setValue('GB_Index',2);
                        }
                        else if(!LeftButton && RightButton){ // Far Left
                            GM_setValue('GB_Index',1);
                        }
                        else if(!LeftButton && !RightButton){ // Both Not Exist
                            GM_setValue('GB_Index',1);
                        }
                        else{ // Both Exist
                            GM_setValue('GB_Index',2);
                        }
 
                        if(GM_getValue('dw_delay')){
                            var tempTimer = setInterval(function(){
                                if(!GM_getValue('dw_delay')) {
                                    let downloadLink = $('.IG_SN_DIG').find('a[data-globalindex="'+GM_getValue('GB_Index')+'"]').attr('href');
                                    let date = new Date().getTime();
                                    let timestamp = Math.floor(date / 1000);
                                    let type = $('.IG_SN_DIG').find('a[data-globalindex="'+GM_getValue('GB_Index')+'"]').attr('data-type');
 
                                    saveFiles(downloadLink,GM_getValue('username'),GM_getValue('GB_Index'),timestamp,type);
                                    $('.IG_SN_DIG').remove();
                                    clearInterval(tempTimer);
                                }
                            },150);
                        }
                        else{
                            let downloadLink = $('.IG_SN_DIG').find('a[data-globalindex="'+GM_getValue('GB_Index')+'"]').attr('href');
                            let date = new Date().getTime();
                            let timestamp = Math.floor(date / 1000);
                            let type = $('.IG_SN_DIG').find('a[data-globalindex="'+GM_getValue('GB_Index')+'"]').attr('data-type');
 
                            saveFiles(downloadLink,GM_getValue('username'),GM_getValue('GB_Index'),timestamp,type);
                            $('.IG_SN_DIG').remove();
                        }
                    }
                });
 
                // Add the mark that download is ready
                $(this).attr('data-snig','canDownload');
                $(this).attr('data-username',$(this).prev().prev().find(".o-MQd .e1e1d .Jv7Aj a").text());
            }
        });
    }
 
    // Download and rename files
    function saveFiles(downloadLink,username,index,timestamp,type){
        fetch(downloadLink).then(res => {
          return res.blob().then(dwel => {
                 const a = document.createElement("a");
                 const name = username+'-'+index+'-'+timestamp+'.'+type;
                 a.href = URL.createObjectURL(dwel);
                 a.setAttribute("download", name);
                 a.click();
                 a.remove();
          });
        });
    }
 
    // Create the download dialog element funcion
    function IG_createDM(a){
        let style = (!a)?"position: fixed;left: 0px;right: 0px;bottom: 0px;top: 0px;":"display:none;";
        $('body').append('<div class="IG_SN_DIG" style="'+style+';z-index: 500;"><div class="IG_SN_DIG_BG" style="'+style+'z-index:502;background: rgba(0,0,0,.75);"></div><div class="IG_SN_DIG_MAIN" style="z-index: 510;padding:10px 15px;top:7%;position: absolute;left: 50%;transform: translateX(-50%);width: 500px;min-height: 200px;background:#fff;border-radius: 15px;"></div></div>');
        $('.IG_SN_DIG .IG_SN_DIG_MAIN').append('<div style="position:relative;height:36px;line-height:36px;">Alt+Q [Close]<svg width="26" height="26" class="IG_SN_DIG_BTN" style="cursor:pointer;position:absolute;right:0px;" xmlns="http://www.w3.org/2000/svg" id="bold" enable-background="new 0 0 24 24" height="512" viewBox="0 0 24 24" width="512"><path d="m14.828 12 5.303-5.303c.586-.586.586-1.536 0-2.121l-.707-.707c-.586-.586-1.536-.586-2.121 0l-5.303 5.303-5.303-5.304c-.586-.586-1.536-.586-2.121 0l-.708.707c-.586.586-.586 1.536 0 2.121l5.304 5.304-5.303 5.303c-.586.586-.586 1.536 0 2.121l.707.707c.586.586 1.536.586 2.121 0l5.303-5.303 5.303 5.303c.586.586 1.536.586 2.121 0l.707-.707c.586-.586.586-1.536 0-2.121z"/></svg></div>');
    }
 
    // Running if document is ready
    $(function(){
        // Ready~? GO!!
        onReadyMyDW();
 
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
 
        // Running if user left-click download icon in stories
        $('body').on('click','.IG_DWSTORY',function(){
            onStoryDW(true);
        });
 
        // Running if user left-click download icon in stories
        $('body').on('click','.IG_DWSTORY_THUMBNAIL',function(){
            onStoryThumbnailDW(true);
        });
    });
 
})();
