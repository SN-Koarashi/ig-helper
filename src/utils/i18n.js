import { state } from "../settings";
import { logger } from "./general";
/*! ESLINT IMPORT END !*/

/**
 * translateText
 * @description i18n translation text
 *
 * @return {void}
 */
export function translateText() {
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
            "SKIP_VIEW_STORY_CONFIRM_INTRO": "Automatically skip when confirmation page is shown in story or highlight."
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
export async function getTranslationText(lang) {
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
export function _i18n(text) {
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
export function repaintingTranslations() {
    $('[data-ih-locale]').each(function () {
        $(this).text(_i18n($(this).attr('data-ih-locale')));
    });
    $('[data-ih-locale-title]').each(function () {
        $(this).attr('title', _i18n($(this).attr('data-ih-locale-title')));
    });
}