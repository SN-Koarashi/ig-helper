import { onReadyMyDW } from "./functions/post";

/******** USER SETTINGS ********/
// !!! DO NOT CHANGE THIS AREA !!!
// PLEASE CHANGE SETTING WITH MENU
export const USER_SETTING = {
    'CHECK_UPDATE': true,
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
    'USE_BLOB_FETCH_WHEN_MEDIA_RATE_LIMIT': false,
    'NEW_TAB_ALWAYS_FORCE_MEDIA_IN_POST': false,
    'SKIP_VIEW_STORY_CONFIRM': false
};
export const CHILD_NODES = ['RENAME_PUBLISH_DATE', 'USE_BLOB_FETCH_WHEN_MEDIA_RATE_LIMIT', 'NEW_TAB_ALWAYS_FORCE_MEDIA_IN_POST'];
/*******************************/

// Icon download by https://www.flaticon.com/authors/pixel-perfect
export const SVG = {
    DOWNLOAD: '<svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Capa_1" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"><g><g><path d="M382.56,233.376C379.968,227.648,374.272,224,368,224h-64V16c0-8.832-7.168-16-16-16h-64c-8.832,0-16,7.168-16,16v208h-64    c-6.272,0-11.968,3.68-14.56,9.376c-2.624,5.728-1.6,12.416,2.528,17.152l112,128c3.04,3.488,7.424,5.472,12.032,5.472    c4.608,0,8.992-2.016,12.032-5.472l112-128C384.192,245.824,385.152,239.104,382.56,233.376z"/></g></g><g><g><path d="M432,352v96H80v-96H16v128c0,17.696,14.336,32,32,32h416c17.696,0,32-14.304,32-32V352H432z"/></g></g>',
    NEW_TAB: '<svg width="16" height="16" viewBox="3 3 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M20 14a1 1 0 0 0-1 1v3.077c0 .459-.022.57-.082.684a.363.363 0 0 1-.157.157c-.113.06-.225.082-.684.082H5.923c-.459 0-.571-.022-.684-.082a.363.363 0 0 1-.157-.157c-.06-.113-.082-.225-.082-.684L4.999 5.5a.5.5 0 0 1 .5-.5l3.5.005a1 1 0 1 0 .002-2L5.501 3a2.5 2.5 0 0 0-2.502 2.5v12.577c0 .76.083 1.185.32 1.627.223.419.558.753.977.977.442.237.866.319 1.627.319h12.154c.76 0 1.185-.082 1.627-.319.419-.224.753-.558.977-.977.237-.442.319-.866.319-1.627V15a1 1 0 0 0-1-1zm-2-9.055v-.291l-.39.09A10 10 0 0 1 15.36 5H14a1 1 0 1 1 0-2l5.5.003a1.5 1.5 0 0 1 1.5 1.5V10a1 1 0 1 1-2 0V8.639c0-.757.086-1.511.256-2.249l.09-.39h-.295a10 10 0 0 1-1.411 1.775l-5.933 5.932a1 1 0 0 1-1.414-1.414l5.944-5.944A10 10 0 0 1 18 4.945z" fill="currentColor"/></svg>',
    THUMBNAIL: '<svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="512" viewBox="0 0 24 24" width="512"><circle cx="8.25" cy="5.25" r=".5"/><path d="m8.25 6.5c-.689 0-1.25-.561-1.25-1.25s.561-1.25 1.25-1.25 1.25.561 1.25 1.25-.561 1.25-1.25 1.25zm0-1.5c-.138 0-.25.112-.25.25 0 .275.5.275.5 0 0-.138-.112-.25-.25-.25z"/><path d="m7.25 11.25 2-2.5 2.25 1.5 2.25-3.5 3 4.5z"/><path d="m16.75 12h-9.5c-.288 0-.551-.165-.676-.425s-.09-.568.09-.793l2-2.5c.243-.304.678-.372 1.002-.156l1.616 1.077 1.837-2.859c.137-.212.372-.342.625-.344.246-.026.49.123.63.334l3 4.5c.153.23.168.526.037.77-.13.244-.385.396-.661.396zm-4.519-1.5h3.118l-1.587-2.381zm-3.42 0h1.712l-1.117-.745z"/><path d="m22.25 14h-2.756c-.778 0-1.452.501-1.676 1.247l-.859 2.862c-.16.533-.641.891-1.197.891h-7.524c-.556 0-1.037-.358-1.197-.891l-.859-2.861c-.224-.747-.897-1.248-1.676-1.248h-2.756c-.965 0-1.75.785-1.75 1.75v5.5c0 1.517 1.233 2.75 2.75 2.75h18.5c1.517 0 2.75-1.233 2.75-2.75v-5.5c0-.965-.785-1.75-1.75-1.75z"/><path d="m4 12c-.552 0-1-.448-1-1v-8c0-1.654 1.346-3 3-3h12c1.654 0 3 1.346 3 3v8c0 .552-.448 1-1 1s-1-.448-1-1v-8c0-.551-.449-1-1-1h-12c-.551 0-1 .449-1 1v8c0 .552-.448 1-1 1z"/></svg>',
    DOWNLOAD_ALL: '<svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"><g><g><path d="m191 208c-1-5-6-8-10-8l-42 0 0-184c0-8-5-15-11-15l-42 0c-6 0-11 7-11 15l0 184-42 0c-4 0-8 3-9 8c-2 6-1 12 1 16l74 105c2 3 5 5 8 5s6-2 8-5l74-105c2-4 4-9 2-16z"></g></g><g><g><path d="m486.3 208c-1-5-6-8-10-8l-42 0 0-184c0-8-5-15-11-15l-43 0c-6 0-11 7-11 15l0 184-41 0c-4 0-8 3-9 8c-2 6-1 12 1 16l74 105c2 3 5 5 8 5s6-2 8-5l74-105c2-4 4-9 2-16z"></g></g><g><g><path d="m342.3 299c-1-5-6-8-10-8l-42 0 0-275c0-8-5-15-11-15l-42 0c-6 0-11 7-11 15l0 275-42 0c-4 0-8 3-9 8c-2 6-1 12 1 16l74 105c2 3 5 5 8 5s6-2 8-5l74-105c2-4 4-9 2-16z"></g></g><g><g><path d="m422.79 380.79l0 74.12-338.83 0 0-74.12-67.34 0 0 89.45c0 23 14.73 40.89 33.67 40.89l408.28 0c18.94 0 33.67-17.89 33.67-40.89l0-89.45-69.45 0z"/></g></g></svg>',
    CLOSE: '<svg width="26" height="26" xmlns="http://www.w3.org/2000/svg" id="bold" enable-background="new 0 0 24 24" viewBox="0 0 24 24"><path d="m14.828 12 5.303-5.303c.586-.586.586-1.536 0-2.121l-.707-.707c-.586-.586-1.536-.586-2.121 0l-5.303 5.303-5.303-5.304c-.586-.586-1.536-.586-2.121 0l-.708.707c-.586.586-.586 1.536 0 2.121l5.304 5.304-5.303 5.303c-.586.586-.586 1.536 0 2.121l.707.707c.586.586 1.536.586 2.121 0l5.303-5.303 5.303 5.303c.586.586 1.536.586 2.121 0l.707-.707c.586-.586.586-1.536 0-2.121z"></path></svg>'
};

export const checkInterval = 250;
export const style = GM_getResourceText("INTERNAL_CSS");
export const locale_manifest = JSON.parse(GM_getResourceText("LOCALE_MANIFEST"));

export var state = {
    videoVolume: (GM_getValue('G_VIDEO_VOLUME')) ? GM_getValue('G_VIDEO_VOLUME') : 1,
    tempFetchRateLimit: false,
    fileRenameFormat: (GM_getValue('G_RENAME_FORMAT')) ? GM_getValue('G_RENAME_FORMAT') : '%USERNAME%-%SOURCE_TYPE%-%SHORTCODE%-%YEAR%%MONTH%%DAY%_%HOUR%%MINUTE%%SECOND%_%ORIGINAL_NAME_FIRST%',
    registerMenuIds: [],
    locale: {},
    lang: GM_getValue('lang') || navigator.language || navigator.userLanguage,
    currentURL: location.href,
    firstStarted: false,
    pageLoaded: false,
    GL_registerEventList: [],
    GL_logger: [],
    GL_referrer: null,
    GL_postPath: null,
    GL_username: null,
    GL_repeat: null,
    GL_dataCache: {
        stories: {},
        highlights: {}
    },
    GL_observer: new MutationObserver(function () {
        onReadyMyDW();
    })
};