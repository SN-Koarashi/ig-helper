// ==UserScript==
// @name               IG Helper
// @name:zh-TW         IG小精靈
// @name:zh-CN         IG小助手
// @name:ja            IG助手
// @name:ko            IG조수
// @namespace          https://github.snkms.com/
// @version            2.1.4
// @description        Downloading Instagram posts photos and videos or their stories!
// @description:zh-TW  一鍵下載對方 Instagram 貼文中的相片、影片甚至是他們的限時動態！
// @description:zh-CN  一键下载对方 Instagram 帖子中的相片、视频甚至是他们的快拍！
// @description:ja     写真、ビデオ、そしてお互いの Instagram 投稿からのストーリーずズのワンクリックダウンロード！
// @description:ko     Instagram 게시물에서 사진, 비디오 또는 이야기를 다운로드하십시오.
// @author             SN-Koarashi (5026)
// @match              https://*.instagram.com/*
// @grant              GM_setValue
// @grant              GM_getValue
// @require            https://code.jquery.com/jquery-3.5.1.min.js
// @supportURL         https://www.facebook.com/smileopwe/
// @compatible         firefox >=52
// @compatible         chrome >=55
// @license            MIT
// ==/UserScript==

(function() {
    'use strict';

    // Close icon download by https://www.flaticon.com/authors/roundicons
    // Download icon download by https://www.flaticon.com/authors/pixel-perfect

    // Global variable
    GM_setValue('dialog',true);
    GM_setValue('URLs',location.href);
    var $ = window.jQuery;

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
            console.log(true);
            onReadyMyDW(true);
        }

        // Call Instagram stories function
        if($('div#react-root section._9eogI._01nki.lXJWB').length && onChangeStoryURL()){
            onStoryDW(false);
        }
        else{
            // Remove the download icon
            $('.IG_DWSTORY').remove();
        }

        // Direct Download Checkbox
        if(!$('.AutoDownload_dom').length){
            var ckValue = (GM_getValue('AutoDownload'))?'checked':'';
            $('body .ctQZg').append('<div class="AutoDownload_dom" style="position: absolute;left:15px;top:0px;padding:6px;line-height:1;background:#fff;border-radius: 50%;"><label title="Checking it will direct download current photos in the posts." style="cursor:help;"><input type="checkbox" value="1" class="AutoDownload" name="AutoDownload" '+ckValue+' />DDL</label></div>');
        }

    },500);

    // Call general function when user scroll the page
    $(document).scroll(function(){
        if(GM_getValue('oldHeight') != $(this).height()){
            console.log('onChange');
            onReadyMyDW();
        }
    });

    // Stories funcion
    function onStoryDW(a){
        if(a){
            if($('video.y-yJ5').length){
                // Download stories if it is video
                let downloadLink = $('video.y-yJ5 source').attr('src')+'&dl=1';
                let date = new Date().getTime();
                let timestamp = Math.floor(date / 1000);
                let type = 'mp4';
				let username = $("._8XqED .QgJA_ .aOX72 .MS2JH .soMvl ._4EzTm .yn6BW").text();
                saveFiles(downloadLink,username,0,timestamp,type);
            }
            else{
                // Download stories if it is image
                let downloadLink = $('img.y-yJ5').attr('src')+'&dl=1';
                let date = new Date().getTime();
                let timestamp = Math.floor(date / 1000);
                let type = 'jpg';
				let username = $("._8XqED .QgJA_ .aOX72 .MS2JH .soMvl ._4EzTm .yn6BW").text();
                saveFiles(downloadLink,username,0,timestamp,type);
            }
        }
        else{
            // Add the stories download button
            var style = "position: absolute;right:-40px;top:15px;padding:5px;line-height:1;background:#fff;border-radius: 5px;cursor:pointer;";
            if(!$('.IG_DWSTORY').length){
                $('div#react-root section._8XqED').append('<div class="IG_DWSTORY" style="'+style+'"><svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Capa_1" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"><g><g><path d="M382.56,233.376C379.968,227.648,374.272,224,368,224h-64V16c0-8.832-7.168-16-16-16h-64c-8.832,0-16,7.168-16,16v208h-64    c-6.272,0-11.968,3.68-14.56,9.376c-2.624,5.728-1.6,12.416,2.528,17.152l112,128c3.04,3.488,7.424,5.472,12.032,5.472    c4.608,0,8.992-2.016,12.032-5.472l112-128C384.192,245.824,385.152,239.104,382.56,233.376z"/></g></g><g><g><path d="M432,352v96H80v-96H16v128c0,17.696,14.336,32,32,32h416c17.696,0,32-14.304,32-32V352H432z"/></g></g></div>')
            }
        }
    }
    // URL change function
    function onChangeURL(){
        var reA = /^(https:\/\/www.instagram.com\/p\/)/g;
        var reB = /^(https:\/\/www.instagram.com\/)$/g;
        var URLs = location.href;
        if(URLs.match(reA) || URLs.match(reB)){
            return true;
        }
    }

    // URL change function if page in stories
    function onChangeStoryURL(){
        var re = /^(https:\/\/www.instagram.com\/stories\/)/g;
        var URLs = location.href;
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

                    // If posts have more than one images or videos.
                    if(multiple){
                        $(this).parent().find('.EcJQs .RzuR0').each(function(){
                            s++;
							let element_videos = $(this).children().find('video.tWeCl');
							let element_images = $(this).children().find('.FFVAD');

                            if(element_videos && element_videos.attr('src')){
                                $('.IG_SN_DIG .IG_SN_DIG_MAIN').append('<a data-type="mp4" data-globalIndex="'+s+'" style="'+style+'" target="_blank" href="'+element_videos.attr('src')+'&dl=1"><img width="100" src="'+element_videos.next().attr('src')+'" /><br/>- Video '+s+' -</a>');
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
							$('.IG_SN_DIG .IG_SN_DIG_MAIN').append('<a data-type="mp4" data-globalIndex="'+s+'" style="'+style+'" target="_blank" href="'+element_videos.attr('src')+'&dl=1"><img width="100" src="'+element_videos.next().attr('src')+'" /><br/>- Video '+s+' -</a>');
                        }
                        if(element_images && element_images.attr('src')){
							$('.IG_SN_DIG .IG_SN_DIG_MAIN').append('<a data-type="jpg" data-globalIndex="'+s+'" style="'+style+'" target="_blank" href="'+element_images.attr('src')+'&dl=1"><img width="100" src="'+element_images.attr('src')+'" /><br/>- Image '+s+' -</a>');
                        }
                    }


                    if(GM_getValue('AutoDownload')){
                        GM_setValue('GB_Index',0);
                        var LeftButton = $(this).parent().find('button.POSa_').length;
                        var RightButton = $(this).parent().find('button._6CZji').length;

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

                        var downloadLink = $('.IG_SN_DIG').find('a[data-globalindex="'+GM_getValue('GB_Index')+'"]').attr('href');
                        var date = new Date().getTime();
                        var timestamp = Math.floor(date / 1000);
                        var type = $('.IG_SN_DIG').find('a[data-globalindex="'+GM_getValue('GB_Index')+'"]').attr('data-type');

                        saveFiles(downloadLink,GM_getValue('username'),GM_getValue('GB_Index'),timestamp,type);


                        $('.IG_SN_DIG').remove();
                    }
                });

                // Add the mark that download is ready
                $(this).attr('data-snig','canDownload');
                $(this).attr('data-username',$(this).prev().prev().find(".o-MQd .RqtMr .e1e1d .Jv7Aj a").text());
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
        var style = (!a)?"position: fixed;left: 0px;right: 0px;bottom: 0px;top: 0px;":"display:none;";
        $('body').append('<div class="IG_SN_DIG" style="'+style+';z-index: 500;"><div class="IG_SN_DIG_BG" style="'+style+'z-index:502;background: rgba(0,0,0,.75);"></div><div class="IG_SN_DIG_MAIN" style="z-index: 510;padding:10px 15px;top:7%;position: absolute;left: 50%;transform: translateX(-50%);width: 500px;min-height: 200px;background:#fff;border-radius: 15px;"></div></div>');
        $('.IG_SN_DIG .IG_SN_DIG_MAIN').append('<div style="position:relative;height:36px;line-height:36px;">Alt+Q [Close]<svg width="26" height="26" class="IG_SN_DIG_BTN" style="cursor:pointer;position:absolute;right:0px;" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Layer_1" x="0px" y="0px" viewBox="0 0 492 492"  xml:space="preserve"><g><g><path d="M300.188,246L484.14,62.04c5.06-5.064,7.852-11.82,7.86-19.024c0-7.208-2.792-13.972-7.86-19.028L468.02,7.872    c-5.068-5.076-11.824-7.856-19.036-7.856c-7.2,0-13.956,2.78-19.024,7.856L246.008,191.82L62.048,7.872    c-5.06-5.076-11.82-7.856-19.028-7.856c-7.2,0-13.96,2.78-19.02,7.856L7.872,23.988c-10.496,10.496-10.496,27.568,0,38.052    L191.828,246L7.872,429.952c-5.064,5.072-7.852,11.828-7.852,19.032c0,7.204,2.788,13.96,7.852,19.028l16.124,16.116    c5.06,5.072,11.824,7.856,19.02,7.856c7.208,0,13.968-2.784,19.028-7.856l183.96-183.952l183.952,183.952    c5.068,5.072,11.824,7.856,19.024,7.856h0.008c7.204,0,13.96-2.784,19.028-7.856l16.12-16.116    c5.06-5.064,7.852-11.824,7.852-19.028c0-7.204-2.792-13.96-7.852-19.028L300.188,246z"/></g></g></svg></div>');
    }

    // Running if document is ready
    $(function(){
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

        // Running if user click download icon in stories
        $('body').on('click','.IG_DWSTORY',function(){
            onStoryDW(true);
        });
    });

})();
