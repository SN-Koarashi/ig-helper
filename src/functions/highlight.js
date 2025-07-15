import { USER_SETTING, SVG, state } from "../settings";
import {
    updateLoadingBar, openNewTab, logger,
    setDownloadProgress, saveFiles, getStoryProgress,
    IG_createDM
} from "../utils/general";
import { _i18n } from "../utils/i18n";
import { getHighlightStories, getMediaInfo } from "../utils/api";
import { createStoryListDOM } from "./story";
import { getImageFromCache } from "../utils/image_cache";
/*! ESLINT IMPORT END !*/

/**
 * onHighlightsStoryAll
 * @description Trigger user's highlight all download event.
 *
 * @return {void}
 */
export async function onHighlightsStoryAll() {
    updateLoadingBar(true);

    let date = new Date().getTime();
    let timestamp = Math.floor(date / 1000);
    let highlightId = location.href.replace(/\/$/ig, '').split('/').at(-1);
    let highStories = await getHighlightStories(highlightId);
    let username = highStories.data.reels_media[0].owner.username;

    if (USER_SETTING.DIRECT_DOWNLOAD_STORY) {

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
                    saveFiles(item.video_resources[0].src, username, "highlights", timestamp, 'mp4', item.id).then(() => {
                        setDownloadProgress(++complete, highStories.data.reels_media[0].items.length);
                    });
                }
                else {
                    saveFiles(item.display_resources[0].src, username, "highlights", timestamp, 'jpg', item.id).then(() => {
                        setDownloadProgress(++complete, highStories.data.reels_media[0].items.length);
                    });
                }
            }, 100 * idx);
        });
    }
    else {
        IG_createDM(false, true);
        createStoryListDOM(highStories, 'highlights');
    }
}

/**
 * onHighlightsStory
 * @description Trigger user's highlight download event or button display event.
 *
 * @param  {Boolean}  isDownload - Check if it is a download operation
 * @param  {Boolean}  isPreview - Check if it is need to open new tab
 * @return {void}
 */
export async function onHighlightsStory(isDownload, isPreview) {
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

        const cached = getImageFromCache(target.id);
        if (cached && !(!isPreview && state.GL_dataCache.highlights[highlightId].data.reels_media[0].items.filter(item => item.id === target.id).at(0).is_video)) {
            logger("[Restore Cached onHighlight]", target.id);
            if (isPreview) {
                openNewTab(cached);
            }
            else {
                saveFiles(cached, username, "stories", timestamp, 'jpg', target.id);
            }
            return;
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
                if (USER_SETTING.FALLBACK_TO_BLOB_FETCH_IF_MEDIA_API_THROTTLED) {
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
export async function onHighlightsStoryThumbnail(isDownload) {
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
                if (USER_SETTING.FALLBACK_TO_BLOB_FETCH_IF_MEDIA_API_THROTTLED) {
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