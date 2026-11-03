import { state } from "../settings";
import { logger } from "./general";
/*! ESLINT IMPORT END !*/

/**
 * translateText
 * @description i18n translation text.
 *
 * @return {void}
 */
export function translateText() {
    var eLocale = {
        "en-US": {
            "NOTICE_UPDATE_TITLE": "Wololo! New version released.",
            "NOTICE_UPDATE_CONTENT": "IG-Helper has released a new version, click here to update.",
            "CHECK_FOR_UPDATE": "Check for Script Updates",
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
            "ITEM_COUNT_SINGULAR": "%COUNT% item",
            "ITEM_COUNT_PLURAL": "%COUNT% items",
            "ITEM_POSITION": "Item %CURRENT% of %TOTAL%",
            "SELECTED_COUNT_SINGULAR": "%COUNT% selected",
            "SELECTED_COUNT_PLURAL": "%COUNT% selected",
            "BATCH_DOWNLOAD_SELECTED": "Download Selected Resources",
            "BATCH_DOWNLOAD_DIRECT": "Download All Resources",
            "IMG": "Image",
            "VID": "Video",
            "DW": "Download",
            "DW_ALL": "Download All Resources",
            "VIDEO_THUMBNAIL": "Download Video Thumbnail",
            "LOAD_BLOB_ONE": "Loading Blob Media...",
            "LOAD_BLOB_MULTIPLE": "Loading Blob Media and Others...",
            "LOAD_BLOB_RELOAD": "Detecting Blob Media, reloading...",
            "NO_CHECK_RESOURCE": "You need to select a resource to download.",
            "NO_VID_URL": "Cannot find video URL.",
            "SETTING": "Settings",
            "AUTO_RENAME": "Automatically Rename Files (Right-Click to Set)",
            "MATCH_VIDEO_FILENAME_TO_THUMBNAIL": "Match Video Filename to Its Thumbnail",
            "RENAME_PUBLISH_DATE": "Set Renamed File Timestamp to Resource Publish Date",
            "RENAME_LOCATE_DATE": "Modify Renamed File Timestamp Date Format (Right-Click to Set)",
            "DISABLE_VIDEO_LOOPING": "Disable Video Auto-looping",
            "HTML5_VIDEO_CONTROL": "Display HTML5 Video Controller",
            "REDIRECT_CLICK_USER_STORY_PICTURE": "Redirect When Clicking on User's Story Picture",
            "FORCE_FETCH_ALL_RESOURCES": "Force Fetch All Resources in the Post",
            "FORCE_POLARIS_POST_ROOT_QUERY_FOR_POSTS_AND_REELS": "Force Fetch Posts/Reels via PolarisPostRootQuery",
            "DIRECT_DOWNLOAD_VISIBLE_RESOURCE": "Directly Download the Visible Resources in the Post",
            "DIRECT_DOWNLOAD_ALL": "Directly Download All Resources in the Post",
            "DIRECT_DOWNLOAD_STORY": "Directly Download All Resources in the Story/Highlight",
            "MODIFY_VIDEO_VOLUME": "Modify Video Volume (Right-Click to Set)",
            "MODIFY_RESOURCE_EXIF": "Modify Resource EXIF Properties",
            "SCROLL_BUTTON": "Enable Scroll Buttons for Reels Page",
            "FORCE_GRAPHQL_QUERY_FOR_STORIES_AND_HIGHLIGHTS": "Fetch Stories/Highlights via Polaris GraphQL",
            "PREFER_DASH_MANIFEST_FOR_STORIES_AND_HIGHLIGHTS": "Prefer DASH Manifest for Higher-Quality Story/Highlight Video",
            "FALLBACK_TO_BLOB_FETCH_IF_STORIES_GRAPHQL_UNAVAILABLE": "Use Alternative Story Methods When GraphQL Is Unavailable",
            "NEW_TAB_ALWAYS_FORCE_GRAPHQL_IN_STORIES_AND_HIGHLIGHTS": "Use Instagram's GraphQL for [Open in New Tab] in Stories/Highlights",
            "NEW_TAB_OPEN_HIGHEST_VIDEO_VIA_GRAPHQL": "Open the highest-quality Story/Highlight video in New Tab, without audio, via GraphQL",
            "SKIP_VIEW_STORY_CONFIRM": "Skip the Confirmation Page for Viewing a Story/Highlight",
            "SKIP_SHARED_WITH_YOU_DIALOG": "Skip \"shared this with you\" dialog on shared profile links",
            "CAPTURE_IMAGE_VIA_MEDIA_CACHE": "Capture Image Resource Using Media Cache",
            "AUTO_RENAME_INTRO": [
                "Auto rename file to custom format:",
                "Custom Format List:",
                "%USERNAME% - Username",
                "%SOURCE_TYPE% - Download Source",
                "%SHORTCODE% - Post Shortcode",
                "%YEAR% - Year when downloaded/published",
                "%2-YEAR% - Year (last two digits) when downloaded/published",
                "%MONTH% - Month when downloaded/published",
                "%DAY% - Day when downloaded/published",
                "%HOUR% - Hour when downloaded/published",
                "%MINUTE% - Minute when downloaded/published",
                "%SECOND% - Second when downloaded/published",
                "%ORIGINAL_NAME% - Original name of downloaded file",
                "%ORIGINAL_NAME_FIRST% - Original name of downloaded file (first part of name)",
                "%INDEX% - Resource index",
                "%UID% - User account unique ID",
                "",
                "If set to false, the file name will remain unchanged.",
                "Example: instagram_321565527_679025940443063_4318007696887450953_n.jpg"
            ],
            "MATCH_VIDEO_FILENAME_TO_THUMBNAIL_INTRO": "For downloaded videos (stories, highlights, reels, posts), use the video's own thumbnail original filename (the part before the file extension). The video's username is kept as a prefix and the extension is forced to match the saved file (.mp4 for the video, or .m4a for the separate audio track saved when DASH muxing fails).\n\nExample: instagram_793678102_1796531621502252_4676558487041098231_n.jpg -> instagram_793678102_1796531621502252_4676558487041098231_n.mp4\n\nTakes priority over [Automatically Rename Files] / [Set Renamed File Timestamp to Resource Publish Date] for video files, and also applies when [Prefer DASH Manifest for Higher-Quality Story/Highlight Video] downloads video and audio separately.",
            "RENAME_PUBLISH_DATE_INTRO": "Sets the timestamp in the file rename format to the resource publish date (browser time zone).\n\nThis feature only works when [Automatically Rename Files] is set to TRUE.",
            "RENAME_LOCATE_DATE_INTRO": "Modify the renamed file timestamp date format to the browser's local time, and format it to your preferred regional date format.\n\nThis feature only works when [Automatically Rename Files] is set to TRUE.",
            "DISABLE_VIDEO_LOOPING_INTRO": "Disable video auto-looping in Reels and posts.",
            "HTML5_VIDEO_CONTROL_INTRO": "Display the HTML5 video controller in video resource.\n\nThis will hide the custom video volume slider and replace it with the HTML5 controller. The HTML5 controller can be hidden by right-clicking on the video to reveal the original details.",
            "REDIRECT_CLICK_USER_STORY_PICTURE_INTRO": "Redirect to a user's profile page when right-clicking on their avatar in the story area on the homepage.\nIf you use the middle mouse button to click, it will open in a new tab.",
            "FORCE_FETCH_ALL_RESOURCES_INTRO": "Force fetching of all resources (photos and videos) in a post via the Instagram API to remove the limit of three resources per post.",
            "FORCE_POLARIS_POST_ROOT_QUERY_FOR_POSTS_AND_REELS_INTRO": "Use Instagram's PolarisPostRootQuery for posts and reels instead of the legacy media query endpoints. Requires the LSD and DTSG tokens embedded in the current page. When [Directly Download All Resources in the Post] is enabled, the legacy query_hash response is used only to discover media IDs before Polaris resolves the actual media URLs.",
            "DIRECT_DOWNLOAD_VISIBLE_RESOURCE_INTRO": "Directly download the current resources available in the post.",
            "DIRECT_DOWNLOAD_ALL_INTRO": "When you click the download button, all resources in the post will be forcibly fetched and downloaded.",
            "MODIFY_VIDEO_VOLUME_INTRO": "Modify the video playback volume in Reels and posts (right-click to open the volume setting slider).",
            "SCROLL_BUTTON_INTRO": "Enable scroll buttons for the lower right corner of the Reels page.",
            "FORCE_GRAPHQL_QUERY_FOR_STORIES_AND_HIGHLIGHTS_INTRO": "Use Instagram's Polaris GraphQL query to fetch Story and Highlight media. The new tab and normal download flows use this query first, with the existing GraphQL response path retained as a fallback.",
            "PREFER_DASH_MANIFEST_FOR_STORIES_AND_HIGHLIGHTS_INTRO": "Prefer the DASH manifest when GraphQL returns one for a Story or Highlight video. The highest-quality video and audio tracks are downloaded separately and muxed into one MP4.",
            "FALLBACK_TO_BLOB_FETCH_IF_STORIES_GRAPHQL_UNAVAILABLE_INTRO": "If the primary Instagram Polaris GraphQL query is unavailable, try the older GraphQL or visible-page media path for Stories and Highlights.",
            "NEW_TAB_ALWAYS_FORCE_GRAPHQL_IN_STORIES_AND_HIGHLIGHTS_INTRO": "Use Instagram’s Polaris GraphQL query when opening a Story or Highlight in a new tab. A cached image may still be used when available.",
            "NEW_TAB_OPEN_HIGHEST_VIDEO_VIA_GRAPHQL_INTRO": "Open the highest-quality video-only resource in a new tab using the Polaris GraphQL response. Requires the DASH manifest option and a manifest in Instagram’s response.",
            "CHECK_FOR_UPDATE_INTRO": "Check for updates when the script is triggered (check every 300 seconds).\nUpdate notifications will be sent as desktop notifications through the browser.",
            "SKIP_VIEW_STORY_CONFIRM_INTRO": "Automatically skip when confirmation page is shown in story or highlight.",
            "SKIP_SHARED_WITH_YOU_DIALOG_INTRO": "Automatically click \"Not now\" on the \"X shared this with you\" dialog when opening any ?igsh= links.",
            "MODIFY_RESOURCE_EXIF_INTRO": "Modify the EXIF attribute of the image resource to include metadata such as post link, shooting date, and author.",
            "DIRECT_DOWNLOAD_STORY_INTRO": "When you click [Download All Resources], all stories/highlights are downloaded directly, without showing the image selection dialog.",
            "CAPTURE_IMAGE_VIA_MEDIA_CACHE_INTRO": "Cache images loaded by Instagram for later reuse. When a cached image is available, this can avoid unnecessary requests to the Stories GraphQL query.",
            "HOTKEY_DEBUG_KEY": "Debug Window",
            "HOTKEY_SETTINGS_KEY": "Preference Settings",
            "HOTKEY_KEY_SETTINGS_KEY": "Hotkey Settings",
            "HOTKEY_DOWNLOAD_STORY_KEY": "Download Story",
            "HOTKEY_CONFLICT_WARNING": "This hotkey may conflict with other settings.",
            "HOTKEY_RESET": "Reset",
            "USE_EXTERNAL_DOWNLOAD_MODE": "Use External Download Mode",
            "USE_EXTERNAL_DOWNLOAD_MODE_INTRO": "Enabling this feature will cause the script to use extended download functions (such as GM_download) to download files, resolving the issue of missing files when download multiple files.\n\nPlease note: Enabling this feature may cause the file renaming function to malfunction. Please ensure that the download mode in your extended feature settings is set to Native."
        }
    };

    var resultUnsorted = Object.assign({}, eLocale, state.locale);
    var resultSorted = Object.keys(resultUnsorted).sort().reduce(
        (obj, key) => {
            obj[key] = resultUnsorted[key];
            return obj;
        }, {}
    );

    var result = Object.assign({}, resultSorted);
    for (const lang in result) {
        const translations = result[lang];
        if (!translations || typeof translations !== "object") {
            continue;
        }

        Object.keys(translations).forEach((key) => {
            const value = translations[key];
            if (Array.isArray(value)) {
                translations[key] = value.join("\n");
            }
        });
    }

    return result;
}

/**
 * getTranslationText
 * @description i18n translation text.
 *
 * @param  {String}  lang
 * @return {Object}
 */
export async function getTranslationText(lang) {
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: "GET",
            url: `https://cdn.jsdelivr.net/gh/SN-Koarashi/ig-helper@master/locale/translations/${lang}.json?v${GM_info.script.version}`,
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
 * @description Perform i18n translation.
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
 * @description Perform i18n translation.
 *
 * @return {void}
 */
export function repaintingTranslations() {
    $('[data-ih-locale]').each(function () {
        const $this = $(this);
        $this.text(_i18n($this.data('ih-locale')));
    });
    $('[data-ih-locale-title]').each(function () {
        const $this = $(this);
        $this.attr('title', _i18n($this.data('ih-locale-title')));
    });
}
