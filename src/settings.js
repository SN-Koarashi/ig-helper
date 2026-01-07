import { onReadyMyDW } from "./functions/post";
/*! ESLINT IMPORT END !*/

/******** USER SETTINGS ********/
// !!! DO NOT CHANGE THIS AREA !!!
// ??? PLEASE CHANGE SETTING WITH MENU ???
export const USER_SETTING = {
    'AUTO_RENAME': true,
    'CAPTURE_IMAGE_VIA_MEDIA_CACHE': true,
    'CHECK_FOR_UPDATE': true,
    'DIRECT_DOWNLOAD_ALL': false,
    'DIRECT_DOWNLOAD_STORY': false,
    'DIRECT_DOWNLOAD_VISIBLE_RESOURCE': false,
    'DISABLE_VIDEO_LOOPING': false,
    'FALLBACK_TO_BLOB_FETCH_IF_MEDIA_API_THROTTLED': false,
    'FORCE_FETCH_ALL_RESOURCES': false,
    'FORCE_RESOURCE_VIA_MEDIA': false,
    'HTML5_VIDEO_CONTROL': false,
    'MODIFY_RESOURCE_EXIF': false,
    'MODIFY_VIDEO_VOLUME': false,
    'NEW_TAB_ALWAYS_FORCE_MEDIA_IN_POST': false,
    'REDIRECT_CLICK_USER_STORY_PICTURE': false,
    'RENAME_PUBLISH_DATE': true,
    'SCROLL_BUTTON': true,
    'SKIP_VIEW_STORY_CONFIRM': false,
    'SKIP_SHARED_WITH_YOU_DIALOG': false,
    'SET_INSTAGRAM_LAYOUT_AS_DEFAULT': false,
};

export const PARENT_CHILD_MAPPING = {
    'AUTO_RENAME': [
        'RENAME_PUBLISH_DATE'
    ],
    'FORCE_RESOURCE_VIA_MEDIA': [
        'FALLBACK_TO_BLOB_FETCH_IF_MEDIA_API_THROTTLED',
        'NEW_TAB_ALWAYS_FORCE_MEDIA_IN_POST'
    ],
    'HTML5_VIDEO_CONTROL': [
        'SET_INSTAGRAM_LAYOUT_AS_DEFAULT'
    ]
};
export const IMAGE_CACHE_KEY = 'URLS_OF_IMAGES_TEMPORARILY_STORED';
export const IMAGE_CACHE_MAX_AGE = 12 * 60 * 60 * 1000; // 12h in ms
export const IMAGE_MAX_CACHE_ITEMS = 300;
/*******************************/

// Icon download by Google Fonts Material Icon
export const SVG = {
    DOWNLOAD: '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><g><rect fill="none" height="24" width="24"/></g><g><path d="M18,15v3H6v-3H4v3c0,1.1,0.9,2,2,2h12c1.1,0,2-0.9,2-2v-3H18z M17,11l-1.41-1.41L13,12.17V4h-2v8.17L8.41,9.59L7,11l5,5 L17,11z"/></g></svg>',
    NEW_TAB: '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>',
    THUMBNAIL: '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4.86 8.86l-3 3.87L9 13.14 6 17h12l-3.86-5.14z"/></svg>',
    DOWNLOAD_ALL: '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><g><rect fill="none" height="24" width="24"/></g><g><g><polygon points="18,6.41 16.59,5 12,9.58 7.41,5 6,6.41 12,12.41"/><polygon points="18,13 16.59,11.59 12,16.17 7.41,11.59 6,13 12,19"/></g></g></svg>',
    CLOSE: '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>',
    FULLSCREEN: '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>',
    TURN_DEG: '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#1f1f1f"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M7.34 6.41L.86 12.9l6.49 6.48 6.49-6.48-6.5-6.49zM3.69 12.9l3.66-3.66L11 12.9l-3.66 3.66-3.65-3.66zm15.67-6.26C17.61 4.88 15.3 4 13 4V.76L8.76 5 13 9.24V6c1.79 0 3.58.68 4.95 2.05 2.73 2.73 2.73 7.17 0 9.9C16.58 19.32 14.79 20 13 20c-.97 0-1.94-.21-2.84-.61l-1.49 1.49C10.02 21.62 11.51 22 13 22c2.3 0 4.61-.88 6.36-2.64 3.52-3.51 3.52-9.21 0-12.72z"/></svg>'
};

/*******************************/
export const checkInterval = 250;
export const style = GM_getResourceText("INTERNAL_CSS");
export const locale_manifest = JSON.parse(GM_getResourceText("LOCALE_MANIFEST"));

export var state = {
    videoVolume: (GM_getValue('G_VIDEO_VOLUME')) ? GM_getValue('G_VIDEO_VOLUME') : 1,
    tempFetchRateLimit: false,
    fileRenameFormat: (GM_getValue('G_RENAME_FORMAT')) ? GM_getValue('G_RENAME_FORMAT') : '%USERNAME%-%SOURCE_TYPE%-%SHORTCODE%-%YEAR%%MONTH%%DAY%_%HOUR%%MINUTE%%SECOND%_%ORIGINAL_NAME_FIRST%',
    registerMenuIds: [],
    locale: {},
    lang: GM_getValue('UI_LANGUAGE') || navigator.language || navigator.userLanguage,
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
    }),
    GL_imageCache: GM_getValue(IMAGE_CACHE_KEY, {})
};
/*******************************/