import {
    state, checkInterval, USER_SETTING, ROUTE_MAX_RETRIES, postContexts,
    pageQueue
} from "./settings";
import {
    logger, checkingScriptUpdate, restoreMarkedContainers, toggleVolumeSilder,
    triggerReactClickHandler, setStoryProgressIndexByUsername, updateHighlightThumbnailButton,
    getHighlightButtonContainer, updateStoryThumbnailButton, getStoryButtonContainer,
    getHighlightCurrentTimeElement, setTimeElementDateAndLocaleTime
} from "./utils/general";
import { onReadyMyDW, initPostVideoFunction, createDownloadButton, tagCarouselSlides } from "./functions/post";
import { onReels, attachReelsButtons } from "./functions/reel";
import { onProfileAvatar, skipSharedWithYouDialog } from "./functions/profile";
import { onHighlightsStory, onHighlightsStoryThumbnail, getHighlightsStoryUsername } from "./functions/highlight";
import { onStory, onStoryThumbnail } from "./functions/story";
import { setStoryTaggedProfilesButton } from "./functions/storyTaggedProfiles";
/*! ESLINT IMPORT END !*/

/*******************************/
// Route handling

/**
 * scheduleRouteCheck
 * @description Debounced entry point of the route handler. Replaces the old
 *              always-running Main Timer: it is triggered by navigation events
 *              and only retries (bounded) while Instagram is still rendering.
 *
 * @param  {Integer}  [delay=0]   - Delay in milliseconds
 * @param  {Integer}  [attempt=0] - Retry counter (0 for a fresh navigation)
 * @return {void}
 */
export function scheduleRouteCheck(delay = 0, attempt = 0) {
    clearTimeout(state.GL_routeTimer);
    state.GL_routeTimer = setTimeout(() => handleRouteChange(attempt), delay);
}

/**
 * notifyIfUrlChanged
 * @description Schedule a route check once per URL change. Called from the
 *              MutationObserver callbacks, so a client-side navigation is
 *              detected on the very first DOM mutation it causes, even on engines
 *              without the Navigation API (no polling latency).
 *
 * @return {void}
 */
function notifyIfUrlChanged() {
    if (state.GL_lastSeenURL !== location.href) {
        state.GL_lastSeenURL = location.href;
        scheduleRouteCheck();
    }
}

/**
 * initRouteWatcher
 * @description Listen for client-side navigation (pushState/replaceState/popstate).
 *              Uses the Navigation API where available; a low-frequency URL
 *              check is registered only as a fallback for engines without it,
 *              because a userscript sandbox cannot reliably hook the page's own
 *              history.pushState.
 *
 * @return {void}
 */
export function initRouteWatcher() {
    const onNavigate = () => {
        state.GL_lastSeenURL = location.href;
        scheduleRouteCheck();
    };

    if (window.navigation && typeof window.navigation.addEventListener === 'function') {
        window.navigation.addEventListener('currententrychange', onNavigate);
    }
    else {
        state.GL_routeWatchdog = setInterval(notifyIfUrlChanged, 1000);
    }

    window.addEventListener('popstate', onNavigate);
    window.addEventListener('hashchange', onNavigate);

    // Initial page load
    scheduleRouteCheck();
}

/**
 * handleRouteChange
 * @description Detect the current route and initialize the matching feature
 *              (posts, reels, profile, stories, highlights). Formerly the body
 *              of the Main Timer.
 *
 * @param  {Integer}  attempt - Retry counter
 * @return {void}
 */
function handleRouteChange(attempt) {
    // page still loading: check again shortly
    if ($('div#splash-screen').length > 0 && !$('div#splash-screen').is(':hidden')) {
        state.pageLoaded = false;
        scheduleRouteCheck(checkInterval, attempt + 1);
        return;
    }

    // unnecessary route
    if (
        location.pathname.match(/^\/(explore(\/.*)?|challenge\/?.*|direct\/?.*|qr\/?|accounts\/.*|emails\/.*|language\/?.*?|your_activity\/?.*|settings\/help(\/.*)?$)$/ig) ||
        !location.hostname.startsWith('www.') || location.pathname.startsWith('/auth_platform/codeentry/') || location.pathname.startsWith('/auth_platform/recaptcha/') ||
        location.pathname.startsWith('/challenge/') || location.pathname.startsWith('/consent/') || location.pathname.startsWith('/accounts/') ||
        ((location.pathname.endsWith('/followers/') || location.pathname.endsWith('/following/')) && ($(`body > div[class]:not([id^="mount"]) div div[role="dialog"]`).length > 0))
    ) {
        state.pageLoaded = false;
        stopAllObservers();
        return;
    }

    const currentPathname = location.pathname;
    let previousPathname = '';
    try {
        previousPathname = state.currentURL ? new URL(state.currentURL, location.origin).pathname : '';
        // eslint-disable-next-line no-unused-vars
    } catch (_) { /* empty */ }

    // Detect if navigation is merely an in-place query change on the same post (e.g., carousel slide change via ?img_index=)
    const isOnlyParamChange = (previousPathname === currentPathname && state.firstStarted && state.pageLoaded);

    //if ((state.currentURL != location.href || !state.firstStarted || !state.pageLoaded) && $('section .html-div').length && !$('[data-visualcompletion="loading-state"]').length) {
    const needsRun = (state.currentURL != location.href || !state.firstStarted || !state.pageLoaded);

    if (needsRun && $('section .html-div').length) {
        logger('Route handler', 'triggering');

        // Do not destroy active post observers or reset post state if we are simply switching carousel slides on the same post
        if (!isOnlyParamChange) {
            clearInterval(state.GL_repeat);
            clearInterval(state.GL_dialogTimer);
            clearInterval(state.GL_profileTimer);
            clearInterval(state.GL_reelsTimer);
            cleanupPostObservers();
            state.pageLoaded = false;
        }

        // Keep exactly one MutationObserver connected for the current route
        // (stories/highlights vs. every other page). Idempotent.
        syncObservers();

        // Posts that were processed before the route change lost their observation
        // (the shared resource observer was just disconnected): register them again.
        rearmProcessedPosts();

        state.firstStarted = true;
        state.currentURL = location.href;

        // Auto-skip "X shared this with you" dialog on any ?igsh= link
        if (USER_SETTING.SKIP_SHARED_WITH_YOU_DIALOG && window.location.search.includes("igsh")) {
            let tries = 0;
            const skipTimer = setInterval(() => {
                tries += 1;

                // stop early if URL no longer has ?igsh (navigation changed)
                if (!window.location.search.includes("igsh")) {
                    clearInterval(skipTimer);
                    return;
                }

                skipSharedWithYouDialog();

                if (tries >= 20) {
                    clearInterval(skipTimer);
                }
            }, 200);
        }

        if (location.pathname.startsWith("/p/") || location.pathname.match(/^\/(.*?)\/(p|reel)\//ig) || location.pathname.startsWith("/reel/")) {
            state.GL_dataCache.stories = {};
            state.GL_dataCache.highlights = {};

            logger('isDialog');

            // This is a delayed function call that prevents the dialog element from appearing before the function is called.
            let dialogTries = 0;
            clearInterval(state.GL_dialogTimer);
            state.GL_dialogTimer = setInterval(() => {
                // Give up after ~10s so the interval can never run forever
                if (++dialogTries > 100) {
                    clearInterval(state.GL_dialogTimer);
                    return;
                }

                // body > div[id^="mount"] section nav + div > article << (mobile page in single post) >>
                // section:visible > main > div > div > div > div > div > hr << (single foreground post in page, non-floating // <hr> element here is literally the line beneath poster's username) >>
                // section:visible > main > div > div > article > div > div > div > div > div > header (is the same as above, except that this is on the route of the /{username}/p/{shortcode} structure)
                // section:visible > main > div > div.xdt5ytf << (former CSS selector for single foreground post in page, non-floating) >>
                // <hr> is much more unique element than "div.xdt5ytf"
                if ($(`body > div[class]:not([id^="mount"]) div div[role="dialog"] article,
                            section:visible > main > div > div > div > div > div > hr,
                            body > div[id^="mount"] section nav + div > article,
                            section:visible > main > div > div > article > div > div > div > div > div > header
                        `).length > 0) {
                    clearInterval(state.GL_dialogTimer);

                    // This is to prevent the detection of the "Modify Video Volume" setting from being too slow.
                    setTimeout(() => {
                        clearInterval(state.GL_repeat);
                        state.GL_repeat = null;
                        onReadyMyDW(false);
                    }, 15);
                }
            }, 100);

            state.pageLoaded = true;
        }

        if (location.pathname.startsWith("/reels/")) {
            logger('isReelsPage');
            setTimeout(() => {
                onReels(false);
            }, 150);
            state.pageLoaded = true;
        }

        if (location.pathname === "/") {
            state.GL_dataCache.stories = {};
            state.GL_dataCache.highlights = {};

            let hasReferrer = state.GL_referrer?.match(/^\/(stories|highlights)\//ig) != null;

            logger('isHomepage', hasReferrer);
            setTimeout(() => {
                onReadyMyDW(false, hasReferrer);
            }, 150);

            state.pageLoaded = true;
        }

        if (
            $('header > *[class]:first-child img[alt]').length &&
            // eslint-disable-next-line no-useless-escape
            location.pathname.match(/^(\/)([0-9A-Za-z\.\-_]+)\/?(tagged|reels|saved)?\/?$/ig) &&
            !location.pathname.match(/^(\/explore\/?$|\/stories(\/.*)?$|\/p\/)/ig)
        ) {
            logger('isProfile');
            setTimeout(() => {
                onProfileAvatar(false);
            }, 150);
            state.pageLoaded = true;
        }

        if (!state.pageLoaded) {
            // Call Instagram stories function
            if (location.pathname.startsWith("/stories/highlights/")) {
                state.GL_dataCache.highlights = {};

                logger('isHighlightsStory');

                onHighlightsStory(false);

                // The thumbnail button and the position counter are kept in sync by
                // the story observer (see startStoryObserver()), which is driven by
                // DOM changes instead of by location.href or a polling timer.

                if ($(".IG_DWHISTORY").length) {
                    setTimeout(() => {
                        if (USER_SETTING.SKIP_VIEW_STORY_CONFIRM) {
                            var $viewStoryButton = $('div[id^="mount"] section:last-child > div > div:not([class]) div:last-child > div[role="button"]').filter(function () {
                                return $(this).children().length === 0 && this.textContent.trim() !== "";
                            });
                            $viewStoryButton?.trigger("click");
                        }

                        state.pageLoaded = true;
                    }, 150);
                }
            }
            else if (location.pathname.startsWith("/stories/")) {
                logger('isStory');

                /*
                 *
                 *  $('body div[id^="mount"] > div > div > div[class]').length >= 2 &&
                 *  $('body div[id^="mount"] > div > div > div[class]').last().find('svg > path[d^="M16.792"], svg > path[d^="M34.6 3.1c-4.5"]').length > 0 &&
                 *  $('body div[id^="mount"] > div > div > div[class]').last().find('svg > polyline + line').length > 0
                 *
                 */
                // ? detect logo element in left-top corner
                if (
                    $('div[id^="mount"] section > div > a[href="/"]').length > 0 ||
                    $('div[id^="mount"] section > div > a[href^="/?hl="]').length > 0 ||
                    $('div[id^="mount"] section i[aria-label="Instagram"]').length > 0
                ) {
                    onStory(false);

                    // The immediate attempt above covers the common case. The real
                    // safety net is the story observer (see startStoryObserver()),
                    // a persistent, content-driven watcher that is not tied to
                    // location.href, since Instagram doesn't always update the URL in
                    // sync with the visible story content.
                }

                if ($(".IG_DWSTORY").length) {
                    setTimeout(() => {
                        if (USER_SETTING.SKIP_VIEW_STORY_CONFIRM) {
                            var $viewStoryButton = $('div[id^="mount"] section:last-child > div > div:not([class]) div:last-child > div[role="button"]').filter(function () {
                                return $(this).children().length === 0 && this.textContent.trim() !== "";
                            });
                            $viewStoryButton?.trigger("click");
                        }

                        state.pageLoaded = true;
                    }, 150);
                }
            }
            else {
                state.pageLoaded = false;
                // Remove icons
                // OPTIMIZATION: Single combined selector + .remove() — replaces 8 separate
                // $('.CLASS').length checks + removes. Behavior is identical because
                // .remove() is a no-op on an empty set.
                $('.IG_DWSTORY, .IG_DWSTORY_ALL, .IG_DWNEWTAB, .IG_DWSTORY_THUMBNAIL, .IG_DWSTORY_TAGGED_PROFILES, .IG_DWSTORY_POSITION, .IG_DWHISTORY, .IG_DWHISTORY_ALL, .IG_DWHINEWTAB, .IG_DWHISTORY_THUMBNAIL, .IG_DWHISTORY_POSITION').remove();
                restoreMarkedContainers();
            }
        }

        checkingScriptUpdate(300);
        state.GL_referrer = new URL(location.href).pathname;
    }

    // Instagram renders asynchronously: keep retrying (bounded) until the page
    // content exists and the route has been fully handled.
    if (needsRun && attempt < ROUTE_MAX_RETRIES && (!$('section .html-div').length || !state.pageLoaded)) {
        scheduleRouteCheck(checkInterval, attempt + 1);
    }
}

/*******************************/
// Observers
// Exactly one MutationObserver is connected at any time: the page observer on
// regular pages and the story observer on stories/highlights (see syncObservers()).

/**
 * getResourceObserver
 * @description Lazily create the shared resource IntersectionObserver.
 *
 * @return {IntersectionObserver}
 */
function getResourceObserver() {
    if (!state.resourceObserver) {
        state.resourceObserver = new IntersectionObserver(onPostResourceVisible, {
            root: null,
            rootMargin: "0px",
            threshold: 0.1,
        });
    }

    return state.resourceObserver;
}

/**
 * cleanupPostObservers
 * @description Disconnect the shared resource observer (route change / reload).
 *
 * @return {void}
 */
export function cleanupPostObservers() {
    state.resourceObserver?.disconnect();
    state.resourceObserver = null;
}

/**
 * onPostResourceVisible
 * @description IntersectionObserver callback: keeps the thumbnail / image viewer
 *              buttons of a post in sync with the resource currently visible.
 *
 * @param  {IntersectionObserverEntry[]}  entries
 * @return {void}
 */
function onPostResourceVisible(entries) {
    entries.forEach((entry) => {
        // Instagram removed this slide from the DOM: stop observing it
        if (!entry.target.isConnected) {
            state.resourceObserver?.unobserve(entry.target);
            return;
        }

        if (!entry.isIntersecting) return;

        const postElement = entry.target.closest('[data-snig="canDownload"]');
        const context = postElement && postContexts.get(postElement);
        if (!context) return;

        const { $mainElement, $childElement, ThumbnailElement, ViewerElement } = context;

        var $targetNode = $(entry.target);
        // OPTIMIZATION: combined remove selector instead of 2 separate
        $childElement.find('.IG_THUMBNAIL_MAIN, .IG_IMAGE_VIEWER').remove();

        // The IntersectionObserver target can itself be <video> or <img>,
        // or a sub-container of the post/slide.
        const isVideoInTarget = $targetNode.is('video') || $targetNode.find('video').length > 0;
        const $slide = $targetNode.closest('li');
        const isSlideVideo = $slide.length > 0 && $slide.find('video').length > 0;
        const isSinglePostVideo = ($childElement.find('.button_wrapper').parent().find('ul li').length === 0) && ($mainElement.find('video').length > 0);

        const isVideoTarget = isVideoInTarget || isSlideVideo || isSinglePostVideo;
        const isImageTarget = !isVideoTarget && ($targetNode.is('img') || $targetNode.find('img').length > 0);

        if (isVideoTarget) {
            $mainElement.removeData('igHelper_displayResourceURL');

            const $video = $targetNode.is('video')
                ? $targetNode
                : ($targetNode.find('video').first().length
                    ? $targetNode.find('video').first()
                    : ($slide.length && $slide.find('video').first().length ? $slide.find('video').first() : $mainElement.find('video').first()));

            const posterSrc = $video.attr('poster') || $video.prop('poster') || $targetNode.find('img').first().attr('src') || $mainElement.data('igHelper_videoThumbnailURL');
            if (posterSrc) {
                $mainElement.data('igHelper_videoThumbnailURL', posterSrc);
            } else {
                $mainElement.removeData('igHelper_videoThumbnailURL');
            }

            if ($childElement.find(".IG_THUMBNAIL_MAIN").length === 0) {
                $childElement.find(".button_wrapper").append(ThumbnailElement);
            }
            initPostVideoFunction($mainElement);
        } else if (isImageTarget) {
            const imgSrc = $targetNode.is('img') ? $targetNode.attr('src') : $targetNode.find('img').first().attr('src');
            if (imgSrc) {
                $mainElement.data('igHelper_displayResourceURL', imgSrc);
                if ($childElement.find(".IG_IMAGE_VIEWER").length === 0) {
                    $childElement.find(".button_wrapper").append(ViewerElement);
                }
            } else {
                // Wait for slide image src to finish loading if not ready immediately
                $targetNode.find('img').one('load', function () {
                    const delayedSrc = $(this).attr('src') || this.currentSrc;
                    if (delayedSrc) {
                        $mainElement.data('igHelper_displayResourceURL', delayedSrc);
                        if ($childElement.find(".IG_IMAGE_VIEWER").length === 0) {
                            $childElement.find(".button_wrapper").append(ViewerElement);
                        }
                    }
                });
                $mainElement.removeData('igHelper_displayResourceURL');
            }
        }
    });
}

/**
 * observePostSlides
 * @description (Re-)register the resources of a post on the shared observer.
 *              Observing an element that is already observed is a no-op, so this
 *              is safe to call again whenever Instagram renders more slides.
 *
 * @param  {HTMLElement}  postElement
 * @return {void}
 */
export function observePostSlides(postElement) {
    const context = postContexts.get(postElement);
    if (!context) return;

    const { $mainElement, $childElement } = context;
    const observer = getResourceObserver();

    let $triggeredTarget = null;
    // first onload
    const $bwParent = $childElement.find('.button_wrapper').parent();
    const $slides = $bwParent.find('ul li');

    if ($slides.length > 0) {
        // Carousel layout: observe all slide items directly
        $slides.each(function () {
            if ($(this).find('video').length > 0 || $(this).find('img').length > 0) {
                observer.observe(this);
            }
        });
    } else {
        // Single media layout: observe button/container wrappers
        $bwParent.find('div[role="button"] > div, div[class] > div').each(function () {
            const $li = $(this);
            const $targetNode = $li.find('video').length > 0
                ? $li.find('video')?.first()
                : $li.find('img')?.first();

            // Check if the node is visible and has size,
            // and not the same node as last triggered one to avoid duplicated trigger
            // when switching resources with same container
            if (
                $targetNode.length > 0 &&
                $targetNode.is(':visible') &&
                $targetNode.get(0).getBoundingClientRect().width > 0 &&
                $targetNode.get(0).getBoundingClientRect().height > 0 &&
                this.getBoundingClientRect().width > 64 &&
                this.getBoundingClientRect().height > 64 &&
                $triggeredTarget?.get(0) != $targetNode?.get(0)
            ) {
                // Ignore images without alt attribute or belonging to a video container,
                // because they are used as video thumbnails/posters
                const isInsideVideo = $li.find('video').length > 0 ||
                    $li.closest('li').find('video').length > 0 ||
                    ($bwParent.find('ul li').length === 0 && $mainElement.find('video').length > 0);

                if ($targetNode.get(0).tagName === "IMG" && isInsideVideo) {
                    return;
                }

                $triggeredTarget = $targetNode;
                observer.observe(this);
            }
        });
    }
}

/**
 * rearmProcessedPosts
 * @description Register posts that already have their buttons on the (freshly
 *              recreated) shared resource observer, e.g. the feed underneath a
 *              post dialog after a route change.
 *
 * @return {void}
 */
function rearmProcessedPosts() {
    document.querySelectorAll('[data-snig="canDownload"]').forEach((postElement) => {
        if (postContexts.has(postElement)) {
            observePostSlides(postElement);
        }
    });
}

/**
 * runPageTick
 * @description Flush the work queued by the page observer: buttons for new posts,
 *              re-registration of carousel slides, video volume and reels buttons.
 *
 * @return {void}
 */
function runPageTick() {
    state.GL_pageTick = null;

    if (pageQueue.posts) {
        pageQueue.posts = false;
        createDownloadButton();
    }

    if (pageQueue.slides.size > 0) {
        pageQueue.slides.forEach((postElement) => {
            if (!postElement.isConnected) return;

            const context = postContexts.get(postElement);
            if (!context) return;

            tagCarouselSlides(context.$childElement);
            observePostSlides(postElement);
        });
        pageQueue.slides.clear();
    }

    if (pageQueue.videos.size > 0) {
        const $videos = $(Array.from(pageQueue.videos)).filter(function () {
            return this.isConnected;
        });
        pageQueue.videos.clear();

        bindVideoVolumeOnPlay($videos);

        if (location.pathname.startsWith('/reels/')) {
            attachReelsButtons();
        }
    }
}

/**
 * onPageMutations
 * @description MutationObserver callback of the regular-page observer. Only
 *              records what needs attention (cheap checks on added nodes) and
 *              defers the real work to runPageTick(). A throttle (not a
 *              debounce) is used so continuous scrolling can never starve it.
 *
 * @param  {MutationRecord[]}  mutations
 * @return {void}
 */
function onPageMutations(mutations) {
    notifyIfUrlChanged();

    let queued = false;

    for (const mutation of mutations) {
        // Instagram renders/removes carousel slides inside the <ul>
        if (mutation.target.tagName === 'UL') {
            const postElement = mutation.target.closest('[data-snig="canDownload"]');
            if (postElement && postContexts.has(postElement)) {
                pageQueue.slides.add(postElement);
                queued = true;
            }
        }

        for (const node of mutation.addedNodes) {
            if (node.nodeType !== 1) continue;

            if (node.tagName === 'ARTICLE' || node.tagName === 'HR' || node.querySelector('article, hr')) {
                pageQueue.posts = true;
                queued = true;
            }

            if (node.tagName === 'VIDEO') {
                pageQueue.videos.add(node);
                queued = true;
            }
            else if (node.querySelector('video')) {
                node.querySelectorAll('video').forEach((video) => pageQueue.videos.add(video));
                queued = true;
            }
        }
    }

    if (queued && !state.GL_pageTick) {
        state.GL_pageTick = setTimeout(runPageTick, 100);
    }
}

/**
 * startPageObserver
 * @description The single MutationObserver used on every regular page (feed,
 *              posts, dialogs, profiles, reels). Observes the whole body subtree
 *              (post dialogs are rendered outside of div#mount) so posts that
 *              Instagram lazy-loads while scrolling always get their buttons,
 *              even when the feed container itself is replaced.
 *
 * @return {void}
 */
function startPageObserver() {
    if (state.GL_pageObserver || !document.body) {
        return;
    }

    state.GL_pageObserver = new MutationObserver(onPageMutations);
    state.GL_pageObserver.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Catch up with anything rendered before the observer was connected
    pageQueue.posts = true;
    if (!state.GL_pageTick) {
        state.GL_pageTick = setTimeout(runPageTick, 100);
    }
}

/**
 * stopPageObserver
 * @description Disconnect the regular-page observer and drop its queued work.
 *
 * @return {void}
 */
function stopPageObserver() {
    state.GL_pageObserver?.disconnect();
    state.GL_pageObserver = null;
    clearTimeout(state.GL_pageTick);
    state.GL_pageTick = null;
    pageQueue.posts = false;
    pageQueue.slides.clear();
    pageQueue.videos.clear();
}

/**
 * stopAllObservers
 * @description Disconnect both MutationObservers.
 *
 * @return {void}
 */
export function stopAllObservers() {
    stopPageObserver();
    stopStoryObserver();
}

/**
 * syncObservers
 * @description Keep exactly one MutationObserver connected for the current route:
 *              the story observer on /stories/*, the page observer everywhere
 *              else. Idempotent.
 *
 * @return {void}
 */
function syncObservers() {
    if (location.pathname.startsWith('/stories/')) {
        stopPageObserver();
        startStoryObserver();
    }
    else {
        stopStoryObserver();
        startPageObserver();
    }
}

/**
 * bindVideoVolumeOnPlay
 * @description Apply the saved volume the first time a video starts playing.
 *
 * @param  {JQuery<HTMLElement>}  $videos
 * @return {void}
 */
function bindVideoVolumeOnPlay($videos) {
    if (!USER_SETTING.MODIFY_VIDEO_VOLUME) {
        return;
    }

    $videos.each(function () {
        const $this = $(this);
        $this.one('play playing', function () {
            if (!$this.data('modify')) {
                $this.data('modify', true);
                this.volume = state.videoVolume;
                logger('(audio_observer) Added video event listener #modify');
            }
        });
    });
}

/**
 * initStoryVideos
 * @description Initialize the video related features of stories/highlights:
 *              thumbnail button on first playback, HTML5 controller and the
 *              custom volume slider.
 *
 * @param  {JQuery<HTMLElement>}  $videos
 * @return {void}
 */
function initStoryVideos($videos) {
    const isHighlight = location.pathname.startsWith('/stories/highlights/');
    const storyType = isHighlight ? 'highlight' : 'story';

    $videos.each(function () {
        const $this = $(this);
        $this.one('timeupdate', function () {
            const $video = $(this);

            if (!$video.data('thumbnail-insert')) {
                $video.data('thumbnail-insert', true);

                if ($video.parents('div[style][class]').filter(function () {
                    return $(this).width() == $video.width();
                }).find(isHighlight ? '.IG_DWHISTORY_THUMBNAIL' : '.IG_DWSTORY_THUMBNAIL').length === 0) {
                    if (isHighlight) {
                        onHighlightsStoryThumbnail(false);
                    } else {
                        onStoryThumbnail(false);
                    }

                    logger(`(${storyType}) Manually inserting thumbnail button`);
                }
            }
        });

        var $video = $(this);


        if (USER_SETTING.HTML5_VIDEO_CONTROL) {
            if (!$video.data('controls')) {
                logger(`(${storyType})`, 'Added video html5 contorller #modify');

                if (USER_SETTING.MODIFY_VIDEO_VOLUME) {
                    this.volume = state.videoVolume;

                    $video.on('loadstart', function () {
                        this.volume = state.videoVolume;
                    });
                }

                let $videoParent = $video.parents('div').filter(function () {
                    const $this = $(this);
                    return $this.attr('class') == null && $this.attr('style') == null;
                }).first();

                // This is mute/unmute's icon
                let $element_mute_button = $videoParent.parent().find('svg > path[d^="M1.5 13.3c-.8 0-1.5.7-1.5 1.5v18.4c0"], svg > path[d^="M16.636 7.028a1.5 1.5"]').parents('[role="button"]').first();
                state.GL_weakCache.mutedButton.set($video[0], $element_mute_button);

                // story bottom bar
                let $bottomBar = $videoParent.next();

                // read more button in center
                let $readMoreButton = $videoParent.find('div[class][role="button"]');

                let $targets = $video.parent().find('video + div');

                const hideContextmenu = function (e) {
                    e.preventDefault();
                    e.stopPropagation();

                    let $overlayElement = null;

                    if ($overlayElement == null) {
                        $overlayElement = $(e.target).parent().find('div[aria-label][data-visualcompletion="ignore"]').first();

                        if ($overlayElement.length === 0) {
                            $overlayElement = $(e.target).first();
                        }
                    }

                    state.GL_weakCache.overlay.set($video[0], $overlayElement);

                    $video.css('z-index', '2');
                    $video.attr('controls', true);
                    $targets.css('z-index', '-10');
                    $overlayElement.css('z-index', '-10');

                    $readMoreButton.hide();
                    $bottomBar.hide();

                    toggleVolumeSilder($video, $video.parents('div[style][class]').filter(function () {
                        return $(this).width() == $video.width();
                    }).first(), storyType, 'vertical');
                };

                // Hide layout to show controller
                $targets.off('contextmenu.IG_videoControl').on('contextmenu.IG_videoControl', hideContextmenu);
                $readMoreButton.off('contextmenu.IG_videoControl').on('contextmenu.IG_videoControl', hideContextmenu);
                $bottomBar.off('contextmenu.IG_videoControl').on('contextmenu.IG_videoControl', hideContextmenu);
                $videoParent.off('contextmenu.IG_videoControl').on('contextmenu.IG_videoControl', hideContextmenu);

                // Restore layout to show details interface
                $video.on('contextmenu', function (e) {
                    e.preventDefault();
                    e.stopPropagation();

                    $video.css('z-index', '-1');
                    $video.removeAttr('controls');
                    $targets.css('z-index', '1');
                    state.GL_weakCache.overlay.get($video[0])?.css('z-index', '1');

                    $bottomBar.show();
                    $readMoreButton.show();

                    toggleVolumeSilder($video, $video.parents('div[style][class]').filter(function () {
                        return $(this).width() == $video.width();
                    }).first(), storyType, 'vertical');
                });

                $video.on('volumechange', function () {
                    let $element_mute_button = state.GL_weakCache.mutedButton.get(this) || {};
                    var is_element_muted = $element_mute_button?.find && $element_mute_button.find('svg > path[d^="M16.636"]').length === 0;

                    if (this.muted != is_element_muted) {
                        this.volume = state.videoVolume;

                        triggerReactClickHandler($element_mute_button.first()[0]);
                    }

                    const $v = $(this);
                    if ($v.data('completed')) {
                        state.videoVolume = this.volume;
                        GM_setValue('G_VIDEO_VOLUME', this.volume);
                    }

                    if (this.volume == state.videoVolume) {
                        $v.data('completed', true);
                    }
                });

                $video.css('position', 'absolute');
                $video.data('controls', true);

                toggleVolumeSilder($video, $video.parents('div[style][class]').filter(function () {
                    return $(this).width() == $video.width();
                }).first(), storyType, 'vertical');
            }
        }
        else {
            if (!$video.data('volume-slider-init')) {
                $video.data('volume-slider-init', true);
                toggleVolumeSilder($video, $video.parents('div[style][class]').filter(function () {
                    return $(this).width() == $video.width();
                }).first(), storyType, 'vertical');
            }
        }
    });
}

/**
 * checkStoryButtons
 * @description Runs on every settled batch of story/highlight DOM mutations
 *              (debounced ~80ms so rapid navigation doesn't cause layout
 *              thrashing): checks whether we are still on a story or highlight
 *              page, whether the relevant button is missing and whether its
 *              container is now resolvable, and attaches it if so. Also keeps
 *              the position counter and thumbnail button in sync. No
 *              dependency on which URL was current when the check was scheduled.
 *
 * @return {void}
 */
function checkStoryButtons() {
    const isHighlight = location.pathname.startsWith('/stories/highlights/');
    const isStory = !isHighlight && location.pathname.startsWith('/stories/');

    // Bail if we've since left both story and highlight view entirely.
    if (!isStory && !isHighlight) {
        return;
    }

    if (isHighlight) {
        if ($('.IG_DWHISTORY').length > 0) {
            // Button already attached — just keep the position counter in
            // sync with Instagram's own progress bar as it advances. Safe
            // to call on every settled batch: setStoryProgressIndexText no
            // longer removes the counter reactively, it only updates the
            // text once fresh, valid progress data is available.
            setStoryProgressIndexByUsername($('.IG_DWHISTORY').parent(), getHighlightsStoryUsername(), 'IG_DWHISTORY_POSITION');
            updateHighlightThumbnailButton();
            const $highlightContainer = $('.IG_DWHISTORY').parent();
            if (!$highlightContainer.find('.IG_DWSTORY_TAGGED_PROFILES').length) {
                setStoryTaggedProfilesButton($highlightContainer, getHighlightsStoryUsername());
            }
            return;
        }

        const $container = getHighlightButtonContainer();
        if ($container.length === 0) {
            // DOM not settled yet for this content change — the next
            // mutation will re-trigger this same check.
            return;
        }

        logger('(highlight) story observer: button missing, attaching');
        onHighlightsStory(false);

        // Switching to a different user's stories rebuilds the container,
        // and right at that moment the new header/username may not have
        // fully rendered yet, so the very first counter read can come back
        // empty. These follow-up reads don't depend on another DOM mutation
        // happening to retrigger this observer — they just retry directly.
        [100, 300, 600].forEach(delay => {
            setTimeout(() => {
                if (location.pathname.startsWith('/stories/highlights/')) {
                    setStoryProgressIndexByUsername($('.IG_DWHISTORY').parent(), getHighlightsStoryUsername(), 'IG_DWHISTORY_POSITION');
                }
            }, delay);
        });

        return;
    }

    if ($('.IG_DWSTORY').length > 0) {
        // Button already attached — just keep the position counter in
        // sync with Instagram's own progress bar as it advances. Same
        // reasoning as the highlight branch above.
        const username = $("body > div section._ac0a header._ac0k ._ac0l a + div a").first().text() || location.pathname.split("/").filter(s => s.length > 0).at(1);
        setStoryProgressIndexByUsername($('.IG_DWSTORY').parent(), username, 'IG_DWSTORY_POSITION');
        updateStoryThumbnailButton();
        const $storyContainer = $('.IG_DWSTORY').parent();
        if (!$storyContainer.find('.IG_DWSTORY_TAGGED_PROFILES').length) {
            setStoryTaggedProfilesButton($storyContainer, username);
        }
        return;
    }

    const $container = getStoryButtonContainer();
    if ($container.length === 0) {
        // DOM not settled yet for this content change — the next
        // mutation (there will be one, since the story is still
        // rendering) will re-trigger this same check.
        return;
    }

    logger('(story) story observer: button missing, attaching');
    onStory(false);

    // Same reasoning as the highlight branch above: switching to a
    // different user's stories rebuilds the container, and the new
    // header/username may not be settled yet on the first read.
    [100, 300, 600].forEach(delay => {
        setTimeout(() => {
            if (!location.pathname.startsWith('/stories/highlights/') && location.pathname.startsWith('/stories/')) {
                const username = $("body > div section._ac0a header._ac0k ._ac0l a + div a").first().text() || location.pathname.split("/").filter(s => s.length > 0).at(1);
                setStoryProgressIndexByUsername($('.IG_DWSTORY').parent(), username, 'IG_DWSTORY_POSITION');
            }
        }, delay);
    });
}

/**
 * handleStoryAddedNode
 * @description Per-node work for elements added while browsing stories/highlights:
 *              publish-time formatting for highlights and video initialization.
 *
 * @param  {HTMLElement}  node
 * @return {void}
 */
function handleStoryAddedNode(node) {
    if (location.pathname.startsWith('/stories/highlights/')) {
        if (
            node.tagName === 'DIV' &&
            !node.hasAttribute('data-ih-locale-title') &&
            !node.hasAttribute('data-visualcompletion')
        ) {
            const $time = getHighlightCurrentTimeElement($(node));
            setTimeElementDateAndLocaleTime($time);
        }
    }

    // Fast check: skip DOM tree traversal if node is not video and contains no video
    if (node.tagName !== 'VIDEO' && !node.querySelector('video')) {
        return;
    }

    const $node = $(node);
    const $videos = $node.is('video') ? $node : $node.find('video');

    if ($videos.length > 0) {
        bindVideoVolumeOnPlay($videos);
        initStoryVideos($videos);
    }
}

/**
 * onStoryMutations
 * @description MutationObserver callback of the story/highlight observer.
 *
 * @param  {MutationRecord[]}  mutations
 * @return {void}
 */
function onStoryMutations(mutations) {
    notifyIfUrlChanged();

    for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
                handleStoryAddedNode(node);
            }
        });
    }

    clearTimeout(state.GL_storyDebounce);
    state.GL_storyDebounce = setTimeout(checkStoryButtons, 80);
}

/**
 * startStoryObserver
 * @description The single MutationObserver used while browsing stories or
 *              highlights. Keeps the .IG_DWSTORY (stories) or .IG_DWHISTORY
 *              (highlights) button present and initializes newly rendered videos,
 *              driven purely by DOM content changes and NOT by location.href
 *              polling. This matters because Instagram sometimes swaps the
 *              visible content before (or well after) it updates the URL via
 *              pushState, both between individual stories and between highlight
 *              trays. Stays connected across Next/Back and highlight-tray
 *              scrolling; disconnected by syncObservers() when leaving stories.
 *
 * @return {void}
 */
function startStoryObserver() {
    // Idempotent: safe to call on every route check without spawning duplicates.
    if (state.GL_storyObserver) {
        return;
    }

    const mountRoot = document.querySelector('div[id^="mount"]');
    if (!mountRoot) {
        return;
    }

    state.GL_storyObserver = new MutationObserver(onStoryMutations);
    state.GL_storyObserver.observe(mountRoot, {
        childList: true,
        subtree: true
    });

    // Videos rendered before the observer was connected (late initialization)
    const $existingVideos = $(mountRoot).find('video');
    if ($existingVideos.length > 0) {
        bindVideoVolumeOnPlay($existingVideos);
        initStoryVideos($existingVideos);
    }
}

/**
 * stopStoryObserver
 * @description Disconnects the story/highlight observer started by
 *              startStoryObserver(). Called when navigating away from stories.
 *
 * @return {void}
 */
function stopStoryObserver() {
    state.GL_storyObserver?.disconnect();
    state.GL_storyObserver = null;
    clearTimeout(state.GL_storyDebounce);
}

const AUTO_UNMUTE_SCOPE_SETTINGS = {
    posts: 'AUTO_UNMUTE_POSTS',
    reels: 'AUTO_UNMUTE_REELS',
    stories: 'AUTO_UNMUTE_STORIES',
    highlights: 'AUTO_UNMUTE_HIGHLIGHTS'
};
// Speaker icons already used elsewhere in the script (language-independent)
const AUTO_UNMUTE_ICON_MUTED = 'svg > path[d^="M1.5 13.3c-.8"]';
const AUTO_UNMUTE_ICON_ON = 'svg > path[d^="M16.636 7.028a1.5"]';
const AUTO_UNMUTE_ICON_ANY = AUTO_UNMUTE_ICON_MUTED + ', ' + AUTO_UNMUTE_ICON_ON;
const AUTO_UNMUTE_SLIDER_SELECTOR = 'div[role="slider"][aria-valuenow]';
const AUTO_UNMUTE_BOUNDARY_TAGS = new Set(['ARTICLE', 'SECTION', 'MAIN']);
const AUTO_UNMUTE_TICK = 250;             // ms between checks while waiting for the button
const AUTO_UNMUTE_MAX_TRIES = 20;         // ~5 s budget per event
const AUTO_UNMUTE_DIAG_TRY = 8;           // log a snapshot of the page once, half way through
const AUTO_UNMUTE_USER_WINDOW = 1200;     // ms after a real user input on the audio controls
const AUTO_UNMUTE_VERIFY_DELAY = 400;     // ms before checking that a click unmuted the video
const AUTO_UNMUTE_MAX_CLICKS = 2;         // methods attempted per video source (react, native)
const AUTO_UNMUTE_ICON_GRACE = 800;       // ms: icon says "unmuted" while video.muted is still true

// video -> { src, clicks, done, ... } for the current source (a manual mute stays respected for it)
let autoUnmuteHandled = new WeakMap();
// videos with a retry loop in progress
const autoUnmutePending = new WeakSet();
// video -> last known value of video.muted
const autoUnmuteLastMuted = new WeakMap();
// Last real user input on the audio controls: { at, scope }
let autoUnmuteUserInput = null;

/**
 * getAutoUnmuteScope
 * @description Content type of the current route: posts, reels, stories or highlights.
 *
 * @return {String}
 */
function getAutoUnmuteScope() {
    const path = location.pathname;

    if (path.startsWith('/stories/highlights/')) return 'highlights';
    if (path.startsWith('/stories/')) return 'stories';
    if (path.startsWith('/reels/') || path.startsWith('/reel/') || /^\/[^/]+\/reel\//.test(path)) return 'reels';

    return 'posts';
}

/**
 * isAutoUnmuteShown
 * @description Whether an element is actually visible (stories/highlights keep the cards of
 *              the previous/next stories in the DOM, with their own controls).
 *
 * @param  {HTMLElement}  element
 * @return {Boolean}
 */
function isAutoUnmuteShown(element) {
    if (!element.isConnected || element.getClientRects().length === 0) return false;
    if (element.closest('[aria-hidden="true"], [inert], [hidden]')) return false;

    // opacity: 0 / visibility: hidden on an ancestor is not visible in the element's own style
    for (let node = element, depth = 0; node && node !== document.body && depth < 12; node = node.parentElement, depth++) {
        const style = getComputedStyle(node);

        if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) {
            return false;
        }
    }

    return true;
}

/**
 * findMuteButton
 * @description Walk up from the video and return the button of the first ancestor that
 *              contains a speaker icon matching iconSelector.
 *              Stories/highlights: the first VISIBLE button (several cards are rendered).
 *              Posts/reels: exactly one, otherwise it may belong to another post/reel.
 *
 * @param  {HTMLVideoElement}  video
 * @param  {String}  scope - posts, reels, stories or highlights
 * @param  {String}  [iconSelector=AUTO_UNMUTE_ICON_MUTED]
 * @return {?HTMLElement}
 */
function findMuteButton(video, scope, iconSelector = AUTO_UNMUTE_ICON_MUTED) {
    const storyScope = scope === 'stories' || scope === 'highlights';
    // Stories/highlights: the controls live in the <section>, often 20+ levels above the video
    const maxDepth = storyScope ? 60 : 14;
    let node = video.parentElement;

    for (let depth = 0; node && depth < maxDepth; depth++, node = node.parentElement) {
        const buttons = [];

        node.querySelectorAll(iconSelector).forEach((icon) => {
            const button = icon.closest('[role="button"], button');

            if (
                button &&
                !buttons.includes(button) &&
                button.offsetWidth <= 100 &&
                button.offsetHeight <= 100 &&
                !button.disabled &&
                button.getAttribute('aria-disabled') !== 'true' &&
                (!storyScope || isAutoUnmuteShown(button))
            ) {
                buttons.push(button);
            }
        });

        if (buttons.length === 1 || (storyScope && buttons.length > 1)) {
            return buttons[0];
        }

        if (buttons.length > 1 || AUTO_UNMUTE_BOUNDARY_TAGS.has(node.tagName) || node.getAttribute('role') === 'dialog') {
            return null;
        }
    }

    return null;
}

/**
 * findStorySliderButton
 * @description Stories/highlights fallback: some layouts expose the mute control as a
 *              volume slider (aria-valuenow="0" means muted) instead of a speaker icon.
 *
 * @param  {HTMLVideoElement}  video
 * @return {?HTMLElement}
 */
function findStorySliderButton(video) {
    const section = video.closest('section');
    const slider = section
        ? Array.from(section.querySelectorAll(AUTO_UNMUTE_SLIDER_SELECTOR)).find(isAutoUnmuteShown)
        : null;

    if (!slider) return null;

    const value = (slider.getAttribute('aria-valuenow') || '').trim();
    if (value === '' || Number(value) !== 0) return null;

    const button = slider.querySelector('[role="button"], button') ||
        slider.closest('[role="button"], button') ||
        slider.parentElement?.querySelector('[role="button"], button') ||
        null;

    return button && !button.disabled && button.getAttribute('aria-disabled') !== 'true' ? button : null;
}

/**
 * describeAutoUnmuteState
 * @description One-line snapshot of what the page offers, for the debug log.
 *
 * @param  {HTMLVideoElement}  video
 * @return {String}
 */
function describeAutoUnmuteState(video) {
    return `muted icons on page: ${document.querySelectorAll(AUTO_UNMUTE_ICON_MUTED).length}, ` +
        `sound-on icons: ${document.querySelectorAll(AUTO_UNMUTE_ICON_ON).length}, ` +
        `sliders: ${document.querySelectorAll(AUTO_UNMUTE_SLIDER_SELECTOR).length}, ` +
        `inside <section>: ${video.closest('section') !== null}, ` +
        `video.muted: ${video.muted}, user activation: ${navigator.userActivation?.hasBeenActive}`;
}

/**
 * tryAutoUnmute
 * @description Unmute a playing video by clicking Instagram's own mute button, then verify
 *              that it worked (React handler first, native click second). Retries while the
 *              button is not rendered yet. Every exit is logged once per reason, so the
 *              debug window (Alt+Z) shows why a video was left muted.
 *
 * @param  {HTMLVideoElement}  video
 * @param  {Integer}  [attempt=0]
 * @return {void}
 */
function tryAutoUnmute(video, attempt = 0) {
    // Retries re-enter with attempt > 0; a fresh event must not start a second loop
    if (attempt === 0 && autoUnmutePending.has(video)) return;

    const stop = () => { autoUnmutePending.delete(video); };
    const scope = getAutoUnmuteScope();
    const src = video.currentSrc || video.src;

    if (!video.isConnected || video.paused) return stop();

    if (!USER_SETTING.AUTO_UNMUTE || !USER_SETTING[AUTO_UNMUTE_SCOPE_SETTINGS[scope]]) return stop();

    // Per video source: how far we got (a reused <video> with another source starts over)
    let info = autoUnmuteHandled.get(video);

    if (!info || info.src !== src) {
        info = { src, clicks: 0, done: false, desyncSince: 0, reason: '' };
        autoUnmuteHandled.set(video, info);
    }

    // Log only when the reason changes, so the debug window stays readable
    const note = (reason) => {
        if (info.reason !== reason) {
            info.reason = reason;
            logger(`(${scope}) Auto-unmute: ${reason}`);
        }
    };

    // Check again after `delay` ms, as long as the time budget is not exhausted
    const retry = (delay = AUTO_UNMUTE_TICK) => {
        if (attempt < AUTO_UNMUTE_MAX_TRIES) {
            if (attempt === AUTO_UNMUTE_DIAG_TRY) {
                logger(`(${scope}) Auto-unmute: still waiting (${describeAutoUnmuteState(video)})`);
            }

            autoUnmutePending.add(video);
            setTimeout(() => tryAutoUnmute(video, attempt + 1), delay);
        }
        else {
            note(`gave up waiting (${describeAutoUnmuteState(video)})`);
            stop();
        }
    };

    if (info.done) return stop();

    // The user just touched the audio controls: wait for 'volumechange' to register it
    if (autoUnmuteUserInput && Date.now() - autoUnmuteUserInput.at < AUTO_UNMUTE_USER_WINDOW) {
        note('the user just touched the audio controls, waiting');
        return retry();
    }

    // Muted manually for this content type: stay muted until the user unmutes,
    // toggles the setting or refreshes the page
    if (state.GL_unmuteManual[scope]) {
        note('muted manually by the user, leaving it muted');
        return stop();
    }

    // Already has sound: leave it alone for good, which also respects a manual mute made later
    if (!video.muted) {
        info.done = true;
        note('video has sound, done');
        return stop();
    }

    // Browsers refuse unmuted playback until the user has interacted with the page
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) {
        note('waiting for the first user gesture');
        return stop();
    }

    const storyScope = scope === 'stories' || scope === 'highlights';
    const button = findMuteButton(video, scope, AUTO_UNMUTE_ICON_MUTED) ||
        (storyScope ? findStorySliderButton(video) : null);

    if (!button) {
        // The UI already says "sound on" while the element is still muted: usually a
        // transition (Instagram is about to apply it). Give it a moment, then set it directly.
        if (findMuteButton(video, scope, AUTO_UNMUTE_ICON_ON)) {
            info.desyncSince = info.desyncSince || Date.now();

            if (Date.now() - info.desyncSince >= AUTO_UNMUTE_ICON_GRACE) {
                info.done = true;
                note('icon says unmuted but the video is muted, setting it directly');
                video.muted = false;
                return stop();
            }

            note('icon says unmuted, waiting for the video to follow');
        }
        else {
            note('waiting for the mute button');
        }

        return retry();
    }

    info.desyncSince = 0;

    if (info.clicks >= AUTO_UNMUTE_MAX_CLICKS) {
        info.done = true;
        note('giving up: the mute button did not unmute the video');
        return stop();
    }

    info.clicks++;
    info.reason = '';
    logger(`(${scope}) Auto-unmute: ${info.clicks === 1 ? 'react' : 'native'} click (attempt ${info.clicks}/${AUTO_UNMUTE_MAX_CLICKS})`);

    try {
        if (info.clicks === 1) {
            triggerReactClickHandler(button);
        }
        else {
            button.click();
        }
    }
    catch (err) {
        logger(`(${scope}) Auto-unmute: click failed`, err);
    }

    // Verify on the next check instead of assuming it worked
    retry(AUTO_UNMUTE_VERIFY_DELAY);
}

/**
 * autoUnmuteAll
 * @description Catch up with videos that started playing before the script, the setting
 *              or the first user gesture was ready (their 'playing' event already fired).
 *
 * @return {void}
 */
export function autoUnmuteAll() {
    document.querySelectorAll('video').forEach((video) => tryAutoUnmute(video));
}

/**
 * onAutoUnmutePlaying
 * @description Capture listener for the 'playing' event (video events do not bubble):
 *              remember the initial muted state of the video and start the auto-unmute check.
 *
 * @param  {Event}  e
 * @return {void}
 */
export function onAutoUnmutePlaying(e) {
    const video = e.target;
    if (video.tagName !== 'VIDEO') return;

    if (!autoUnmuteLastMuted.has(video)) {
        autoUnmuteLastMuted.set(video, video.muted);
    }

    tryAutoUnmute(video);
}

/**
 * onAutoUnmuteUserInput
 * @description Remember that the USER (trusted event, not a click made by this script)
 *              just touched the mute button / volume slider / pressed "M". The actual
 *              mute state is read from the video on 'volumechange'.
 *
 * @param  {Event}  e
 * @return {void}
 */
export function onAutoUnmuteUserInput(e) {
    if (!e.isTrusted || !(e.target instanceof Element)) return;

    let relevant = e.target.closest(AUTO_UNMUTE_SLIDER_SELECTOR) !== null ||
        (e.target.tagName === 'VIDEO' && e.target.hasAttribute('controls'));

    if (!relevant) {
        const button = e.target.closest('[role="button"], button');

        relevant = !!button &&
            button.offsetWidth <= 100 &&
            button.offsetHeight <= 100 &&
            button.querySelector(AUTO_UNMUTE_ICON_ANY) !== null;
    }

    if (!relevant && e.type === 'keydown') {
        relevant = (e.key === 'm' || e.key === 'M') &&
            !e.ctrlKey && !e.metaKey && !e.altKey &&
            !e.target.isContentEditable &&
            e.target.closest('input, textarea, select') === null;
    }

    if (relevant) {
        autoUnmuteUserInput = { at: Date.now(), scope: getAutoUnmuteScope() };
    }
}

/**
 * onAutoUnmuteVolumeChange
 * @description A real mute/unmute flip right after a user input on the audio controls is a
 *              manual intervention: muted -> remembered for that content type,
 *              unmuted -> the memory is cleared.
 *
 * @param  {Event}  e
 * @return {void}
 */
export function onAutoUnmuteVolumeChange(e) {
    const video = e.target;
    if (video.tagName !== 'VIDEO') return;

    const previous = autoUnmuteLastMuted.get(video);
    autoUnmuteLastMuted.set(video, video.muted);

    if (previous === undefined || previous === video.muted || !USER_SETTING.AUTO_UNMUTE) return;
    if (!autoUnmuteUserInput || Date.now() - autoUnmuteUserInput.at > AUTO_UNMUTE_USER_WINDOW) return;

    const scope = autoUnmuteUserInput.scope;

    if (state.GL_unmuteManual[scope] !== video.muted) {
        state.GL_unmuteManual[scope] = video.muted;
        logger(`(${scope}) Auto-unmute: manual ${video.muted ? 'mute' : 'unmute'} detected -> ${video.muted ? 'staying muted until you unmute' : 'auto-unmute resumes'}`);
    }
}

/**
 * onAutoUnmuteSettingChange
 * @description An AUTO_UNMUTE* setting was toggled: forget the manual interventions and
 *              re-evaluate every video already on screen from scratch.
 *
 * @param  {String}  settingName - AUTO_UNMUTE (all content types) or AUTO_UNMUTE_<TYPE>
 * @return {void}
 */
export function onAutoUnmuteSettingChange(settingName) {
    Object.entries(AUTO_UNMUTE_SCOPE_SETTINGS).forEach(([scope, name]) => {
        if (settingName === 'AUTO_UNMUTE' || settingName === name) {
            state.GL_unmuteManual[scope] = false;
        }
    });

    autoUnmuteUserInput = null;
    autoUnmuteHandled = new WeakMap();
    logger('Auto-unmute: manual interventions forgotten (' + settingName + ')');
    autoUnmuteAll();
}
