import { USER_SETTING, SVG, state } from "../settings";
import {
    updateLoadingBar, setDownloadProgress,
    saveFiles, getStoryProgress, openNewTab, logger,
    getStoryId,
    IG_createDM
} from "../utils/general";
import { getUserId, getStories, getMediaInfo } from "../utils/api";
import { _i18n } from "../utils/i18n";
import { getImageFromCache } from "../utils/image_cache";
/*! ESLINT IMPORT END !*/

/**
 * createStoryListDOM
 * @description Create a list of story items in the popup dialog.
 *
 * @return {void}
 */
export async function createStoryListDOM(obj, type) {
    try {
        $('.IG_POPUP_DIG #post_info').text(`${type} ID: ${obj.data.reels_media[0].id}`);
        const selector = '.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY';

        obj.data.reels_media[0].items.forEach((item, idx) => {
            let date = new Date().getTime();
            let timestamp = Math.floor(date / 1000);
            let username = obj.data.reels_media[0]?.user?.username || obj.data.reels_media[0]?.owner?.username;

            if (USER_SETTING.RENAME_PUBLISH_DATE) {
                timestamp = item.taken_at_timestamp;
            }

            item.display_resources.sort(function (a, b) {
                if (a.config_width < b.config_width) return 1;
                if (a.config_width > b.config_width) return -1;
                return 0;
            });

            if (item.is_video) {
                $(selector).append(`<a media-id="${item.id}" datetime="${timestamp}" data-blob="true" data-needed="direct" data-name="${type}" data-type="mp4" data-username="${username}" data-path="${item.id}" data-globalIndex="${idx + 1}" href="javascript:;" data-href="${item.video_resources[0].src}"><img width="100" src="${item.display_resources[0].src}" /><br/>- <span data-ih-locale-title="VID">${_i18n("VID")}</span> ${idx} -</a>`);
            }
            else {
                $(selector).append(`<a media-id="${item.id}" datetime="${timestamp}" data-blob="true" data-needed="direct" data-name="${type}" data-type="jpg" data-username="${username}" data-path="${item.id}" data-globalIndex="${idx + 1}" href="javascript:;" data-href="${item.display_resources[0].src}"><img width="100" src="${item.display_resources[0].src}" /><br/>- <span data-ih-locale-title="IMG">${_i18n("IMG")}</span> ${idx} -</a>`);
            }
        });

        $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY a').each(function () {
            $(this).wrap('<div></div>');
            $(this).before('<label class="inner_box_wrapper"><input class="inner_box" type="checkbox"><span></span></label>');
            $(this).after(`<div data-ih-locale-title="NEW_TAB" title="${_i18n("NEW_TAB")}" class="newTab">${SVG.NEW_TAB}</div>`);

            if ($(this).attr('data-type') == 'mp4') {
                $(this).after(`<div data-ih-locale-title="THUMBNAIL_INTRO" title="${_i18n("THUMBNAIL_INTRO")}" class="videoThumbnail">${SVG.THUMBNAIL}</div>`);
            }
        });

        updateLoadingBar(false);
    }
    catch (err) {
        console.error('createStoryListDOM()', err);
    }
}

/**
 * onStoryAll
 * @description Trigger user's story all download event.
 *
 * @return {void}
 */
export async function onStoryAll() {
    updateLoadingBar(true);

    let date = new Date().getTime();
    let timestamp = Math.floor(date / 1000);
    let username = $("body > div section._ac0a header._ac0k ._ac0l a + div a").first().text() || location.pathname.split("/").filter(s => s.length > 0).at(1);

    let userInfo = await getUserId(username);
    let userId = userInfo.user.pk;
    let stories = await getStories(userId);

    if (USER_SETTING.DIRECT_DOWNLOAD_STORY) {
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
    else {
        IG_createDM(false, true);
        createStoryListDOM(stories, 'stories');
    }
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
export async function onStory(isDownload, isForce, isPreview) {
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

            const cached = getImageFromCache(mediaId);
            if (cached) {
                if (isPreview) {
                    openNewTab(cached);
                }
                else {
                    saveFiles(cached, username, "stories", timestamp, 'jpg', mediaId);
                }
                return;
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
                if (USER_SETTING.FALLBACK_TO_BLOB_FETCH_IF_MEDIA_API_THROTTLED) {
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
export async function onStoryThumbnail(isDownload, isForce) {
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
                if (USER_SETTING.FALLBACK_TO_BLOB_FETCH_IF_MEDIA_API_THROTTLED) {
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