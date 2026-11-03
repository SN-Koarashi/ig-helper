/*! ESLINT IMPORT END !*/

/******** USER SETTINGS ********/
// !!! DO NOT CHANGE THIS AREA !!!
// ??? PLEASE CHANGE SETTING WITH MENU ???
export const USER_SETTING = {
    'AUTO_RENAME': true,
    'MATCH_VIDEO_FILENAME_TO_THUMBNAIL': false,
    'CAPTURE_IMAGE_VIA_MEDIA_CACHE': true,
    'CHECK_FOR_UPDATE': true,
    'DIRECT_DOWNLOAD_ALL': false,
    'DIRECT_DOWNLOAD_STORY': false,
    'DIRECT_DOWNLOAD_VISIBLE_RESOURCE': false,
    'DISABLE_VIDEO_LOOPING': false,
    'FALLBACK_TO_BLOB_FETCH_IF_STORIES_GRAPHQL_UNAVAILABLE': false,
    'FORCE_FETCH_ALL_RESOURCES': false,
    'FORCE_POLARIS_POST_ROOT_QUERY_FOR_POSTS_AND_REELS': true,
    'FORCE_GRAPHQL_QUERY_FOR_STORIES_AND_HIGHLIGHTS': true,
    'HTML5_VIDEO_CONTROL': false,
    'MODIFY_RESOURCE_EXIF': false,
    'MODIFY_VIDEO_VOLUME': false,
    'NEW_TAB_ALWAYS_FORCE_GRAPHQL_IN_STORIES_AND_HIGHLIGHTS': false,
    'PREFER_DASH_MANIFEST_FOR_STORIES_AND_HIGHLIGHTS': false,
    'NEW_TAB_OPEN_HIGHEST_VIDEO_VIA_GRAPHQL': false,
    'REDIRECT_CLICK_USER_STORY_PICTURE': false,
    'RENAME_PUBLISH_DATE': true,
    'SCROLL_BUTTON': true,
    'SKIP_VIEW_STORY_CONFIRM': false,
    'SKIP_SHARED_WITH_YOU_DIALOG': false,
    'USE_EXTERNAL_DOWNLOAD_MODE': false
};

export const PARENT_CHILD_MAPPING = {
    'AUTO_RENAME': [
        'RENAME_PUBLISH_DATE'
    ],
    'FORCE_GRAPHQL_QUERY_FOR_STORIES_AND_HIGHLIGHTS': [
        'FALLBACK_TO_BLOB_FETCH_IF_STORIES_GRAPHQL_UNAVAILABLE',
        'NEW_TAB_ALWAYS_FORCE_GRAPHQL_IN_STORIES_AND_HIGHLIGHTS',
        'PREFER_DASH_MANIFEST_FOR_STORIES_AND_HIGHLIGHTS',
        'NEW_TAB_OPEN_HIGHEST_VIDEO_VIA_GRAPHQL'
    ]
};

// Some settings have a direct dependency even though they are not parent/child
// entries in the visual hierarchy. When the dependent setting is enabled,
// automatically enable its prerequisite in both the setting state and the UI.
export const SETTING_DEPENDENCIES = {
    'NEW_TAB_OPEN_HIGHEST_VIDEO_VIA_GRAPHQL': [
        'NEW_TAB_ALWAYS_FORCE_GRAPHQL_IN_STORIES_AND_HIGHLIGHTS'
    ]
};

// Some settings also invalidate dependent options when they are disabled.
// Disabling the New Tab Instagram Stories GraphQL switch must therefore disable the
// highest-quality video option, which relies on that switch.
export const SETTING_DISABLE_DEPENDENCIES = {
    'NEW_TAB_ALWAYS_FORCE_GRAPHQL_IN_STORIES_AND_HIGHLIGHTS': [
        'NEW_TAB_OPEN_HIGHEST_VIDEO_VIA_GRAPHQL'
    ]
};

export const LEGACY_SETTING_MIGRATIONS = {
    'FALLBACK_TO_BLOB_FETCH_IF_REELS_MEDIA_API_THROTTLED': 'FALLBACK_TO_BLOB_FETCH_IF_STORIES_GRAPHQL_UNAVAILABLE',
    'FORCE_REELS_MEDIA_API_FOR_STORIES_AND_HIGHLIGHTS': 'FORCE_GRAPHQL_QUERY_FOR_STORIES_AND_HIGHLIGHTS',
    'NEW_TAB_ALWAYS_FORCE_REELS_MEDIA_API_IN_STORIES_AND_HIGHLIGHTS': 'NEW_TAB_ALWAYS_FORCE_GRAPHQL_IN_STORIES_AND_HIGHLIGHTS',
    'PREFER_DASH_MANIFEST_FOR_REELS_MEDIA_API': 'PREFER_DASH_MANIFEST_FOR_STORIES_AND_HIGHLIGHTS',
    'NEW_TAB_OPEN_HIGHEST_VIDEO_VIA_REELS_MEDIA_API': 'NEW_TAB_OPEN_HIGHEST_VIDEO_VIA_GRAPHQL'
};

export const IMAGE_CACHE_KEY = 'URLS_OF_IMAGES_TEMPORARILY_STORED';
export const IMAGE_CACHE_MAX_AGE = 12 * 60 * 60 * 1000;
export const IMAGE_MAX_CACHE_ITEMS = 500;
export const POST_CACHE_MAX_ITEMS = 30;

export const USER_ID_CACHE_KEY = 'USER_IDS_STORED';
export const USER_ID_MAX_CACHE_ITEMS = 1000;
/*******************************/

// Icon download by Google Fonts Material Icon & Lucide
export const SVG = {
    DOWNLOAD: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-download-icon lucide-download"><path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/></svg>',
    NEW_TAB: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-external-link-icon lucide-external-link"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
    THUMBNAIL: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image-icon lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>',
    DOWNLOAD_ALL: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-cloud-download-icon lucide-cloud-download"><path d="M12 13v8l-4-4"/><path d="m12 21 4-4"/><path d="M4.393 15.269A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.436 8.284"/></svg>',
    CLOSE: '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>',
    FULLSCREEN: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-maximize-icon lucide-maximize"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>',
    TURN_DEG: '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#1f1f1f"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M7.34 6.41L.86 12.9l6.49 6.48 6.49-6.48-6.5-6.49zM3.69 12.9l3.66-3.66L11 12.9l-3.66 3.66-3.65-3.66zm15.67-6.26C17.61 4.88 15.3 4 13 4V.76L8.76 5 13 9.24V6c1.79 0 3.58.68 4.95 2.05 2.73 2.73 2.73 7.17 0 9.9C16.58 19.32 14.79 20 13 20c-.97 0-1.94-.21-2.84-.61l-1.49 1.49C10.02 21.62 11.51 22 13 22c2.3 0 4.61-.88 6.36-2.64 3.52-3.51 3.52-9.21 0-12.72z"/></svg>'
};

/*******************************/

// FIX: resourceCountSelector moved to module scope — was previously re-declared
// inside every createDownloadButton() invocation, and also referenced from the
// body-level delegated handlers added below.

// Improve the selector by using the value from the getVisibleNodeIndex function in 'const $viewport'.
//const resourceCountSelector = '*:not([data-pagelet])>*:not([role]):not([data-pagelet])>*>*>*[role]>*>ul[class] li[style]~li[class]';
export const resourceCountSelector = '*:not([data-pagelet])>*:not([role])>*:not([style])>*>*[role="presentation"]>*>ul[class]>li[style]~li[class][style]';

/*******************************/
export const checkInterval = 250;
export const style = GM_getResourceText("INTERNAL_CSS");
export const locale_manifest = JSON.parse(GM_getResourceText("LOCALE_MANIFEST"));

export const userIdCache = new Map();
export const webViewAgent = "Mozilla/5.0 (Linux; Android 14; Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/156.0.8078.51 Mobile Safari/537.36 Instagram 452.1.0.53.64 Android (34/14; 520dpi; 1220x2712; Pixel; rothko; mt6989; en_US; 1096920925; IABMV/1)";
// Session-only hot cache for media discovered during the current page session.
// Persistent media entries remain in state.GL_imageCache and are not preloaded here.
export const mediaCache = new Map();

// OPTIMIZATION: Cached jQuery body reference — used in many places, jQuery 4
// creates a new wrapper for each $('body') call. Reusing $body avoids that
// overhead while remaining 100% behavior-compatible.
export const $body = $('body');

export var state = {
    videoVolume: (GM_getValue('G_VIDEO_VOLUME')) ? GM_getValue('G_VIDEO_VOLUME') : 1,
    tempFetchGraphQLUnavailable: false,
    // FIX: simple mutexes for onStory()/onHighlightsStory() to prevent
    // two concurrent downloads from starting when the user clicks/presses Alt+S
    // rapidly on successive stories.
    storyDownloadInProgress: false,
    highlightDownloadInProgress: false,
    fileRenameFormat: (GM_getValue('G_RENAME_FORMAT')) ? GM_getValue('G_RENAME_FORMAT') : '%USERNAME%-%SOURCE_TYPE%-%SHORTCODE%-%YEAR%%MONTH%%DAY%_%HOUR%%MINUTE%%SECOND%_%ORIGINAL_NAME_FIRST%',
    registerMenuIds: [],
    locale: {},
    lang: GM_getValue('UI_LANGUAGE') || navigator.language || navigator.userLanguage,
    currentURL: location.href,
    GL_lastSeenURL: location.href,
    firstStarted: false,
    pageLoaded: false,
    GL_logger: [],
    GL_referrer: null,
    GL_postPath: null,
    GL_username: null,
    GL_repeat: null,
    GL_dataCache: {
        stories: {},
        highlights: {},
        highlightTotal: {},
        posts: {}
    },
    // Exactly one of these two MutationObservers is connected at any time:
    // GL_pageObserver on regular pages, GL_storyObserver on /stories/*.
    GL_pageObserver: null,
    GL_storyObserver: null,
    GL_pageTick: null,
    GL_storyDebounce: null,
    GL_routeTimer: null,
    GL_routeWatchdog: null,
    GL_dialogTimer: null,
    GL_profileTimer: null,
    GL_reelsTimer: null,
    GL_imageCache: GM_getValue(IMAGE_CACHE_KEY, {}),
    GL_userIdCache: GM_getValue(USER_ID_CACHE_KEY, {}),
    GL_weakCache: {
        overlay: new WeakMap(),
        mutedButton: new WeakMap(),
    },
    debugHotkeyKeyCode: (GM_getValue('G_HOTKEY_DEBUG_KEYCODE')) ? GM_getValue('G_HOTKEY_DEBUG_KEYCODE') : 90,
    settingsHotkeyKeyCode: (GM_getValue('G_HOTKEY_SETTINGS_KEYCODE')) ? GM_getValue('G_HOTKEY_SETTINGS_KEYCODE') : 87,
    keySettingsHotkeyKeyCode: (GM_getValue('G_HOTKEY_KEY_SETTINGS_KEYCODE')) ? GM_getValue('G_HOTKEY_KEY_SETTINGS_KEYCODE') : 67,
    downloadStoryHotkeyKeyCode: (GM_getValue('G_HOTKEY_DOWNLOAD_STORY_KEYCODE')) ? GM_getValue('G_HOTKEY_DOWNLOAD_STORY_KEYCODE') : 83,
    userIdCacheDirty: false,
    userIdCacheSaveTimer: null,
    /**
     * resourceObserver
     * @description A single IntersectionObserver shared by all posts. It replaces the
     *              per-post IntersectionObserver + MutationObserver pairs, which kept
     *              detached posts alive while scrolling through a long feed.
     */
    resourceObserver: null
};

// Observer state (module scope so it exists before the first route check)
export const ROUTE_MAX_RETRIES = 120; // ~30s at checkInterval

/**
 * postContexts
 * @description Per-post context (containers and button templates) used by the
 *              shared resource observer. A WeakMap keyed by the post element, so
 *              entries disappear together with the post when Instagram removes it
 *              from the feed.
 */
export const postContexts = new WeakMap();

// Work queued by the page observer, flushed once per tick.
export const pageQueue = {
    posts: false,
    slides: new Set(),
    videos: new Set()
};

/*******************************/
