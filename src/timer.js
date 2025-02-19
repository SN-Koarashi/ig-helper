import { state, checkInterval, USER_SETTING } from "./settings";
import { logger, checkingScriptUpdate } from "./utils/util";
import { onReadyMyDW } from "./functions/post";
import { onReels } from "./functions/reel";
import { onProfileAvatar } from "./functions/profile";
import { onHighlightsStory, onHighlightsStoryThumbnail } from "./functions/highlight";
import { onStory } from "./functions/story";
/*! ESLINT IMPORT END !*/

// Main Timer
// eslint-disable-next-line no-unused-vars
export var timer = setInterval(function () {
    // page loading or unnecessary route
    if ($('div#splash-screen').length > 0 && !$('div#splash-screen').is(':hidden') ||
        location.pathname.match(/^\/(explore(\/.*)?|challenge\/?.*|direct\/?.*|qr\/?|accounts\/.*|emails\/.*|language\/?.*?|your_activity\/?.*|settings\/help(\/.*)?$)$/ig) ||
        !location.hostname.startsWith('www.')
    ) {
        state.pageLoaded = false;
        return;
    }

    if (state.currentURL != location.href || !state.firstStarted || !state.pageLoaded) {
        console.log('Main Timer', 'trigging');

        clearInterval(state.GL_repeat);
        state.pageLoaded = false;
        state.firstStarted = true;
        state.currentURL = location.href;
        state.GL_observer.disconnect();

        if (location.href.startsWith("https://www.instagram.com/p/") || location.pathname.match(/^\/(.*?)\/(p|reel)\//ig) || location.href.startsWith("https://www.instagram.com/reel/")) {
            state.GL_dataCache.stories = {};
            state.GL_dataCache.highlights = {};

            logger('isDialog');

            // This is a delayed function call that prevents the dialog element from appearing before the function is called.
            var dialogTimer = setInterval(() => {
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
                    clearInterval(dialogTimer);

                    // This is to prevent the detection of the "Modify Video Volume" setting from being too slow.
                    setTimeout(() => {
                        onReadyMyDW(false);
                    }, 15);
                }
            }, 100);

            state.pageLoaded = true;
        }

        if (location.href.startsWith("https://www.instagram.com/reels/")) {
            logger('isReels');
            setTimeout(() => {
                onReels(false);
            }, 150);
            state.pageLoaded = true;
        }

        if (location.href.split("?")[0] == "https://www.instagram.com/") {
            state.GL_dataCache.stories = {};
            state.GL_dataCache.highlights = {};

            let hasReferrer = state.GL_referrer?.match(/^\/(stories|highlights)\//ig) != null;

            logger('isHomepage', hasReferrer);
            setTimeout(() => {
                onReadyMyDW(false, hasReferrer);

                const element = $('div[id^="mount"] > div > div div > section > main div:not([class]):not([style]) > div > article')?.parent()[0];
                if (element) {
                    state.GL_observer.observe(element, {
                        childList: true
                    });
                }
            }, 150);

            state.pageLoaded = true;
        }
        // eslint-disable-next-line no-useless-escape
        if ($('header > *[class]:first-child img[alt]').length && location.pathname.match(/^(\/)([0-9A-Za-z\.\-_]+)\/?(tagged|reels|saved)?\/?$/ig) && !location.pathname.match(/^(\/explore\/?$|\/stories(\/.*)?$|\/p\/)/ig)) {
            logger('isProfile');
            setTimeout(() => {
                onProfileAvatar(false);
            }, 150);
            state.pageLoaded = true;
        }

        if (!state.pageLoaded) {
            // Call Instagram stories function
            if (location.href.match(/^(https:\/\/www\.instagram\.com\/stories\/highlights\/)/ig)) {
                state.GL_dataCache.highlights = {};

                logger('isHighlightsStory');

                onHighlightsStory(false);
                state.GL_repeat = setInterval(() => {
                    onHighlightsStoryThumbnail(false);
                }, checkInterval);

                if ($(".IG_DWHISTORY").length) {
                    setTimeout(() => {
                        if (USER_SETTING.SKIP_VIEW_STORY_CONFIRM) {
                            var $viewStoryButton = $('div[id^="mount"] section:last-child > div > div div[role="button"]').filter(function () {
                                return $(this).children().length === 0 && this.textContent.trim() !== "";
                            });
                            $viewStoryButton?.trigger("click");
                        }

                        state.pageLoaded = true;
                    }, 150);
                }
            }
            else if (location.href.match(/^(https:\/\/www\.instagram\.com\/stories\/)/ig)) {
                logger('isStory');

                /*
                 *
                 *  $('body div[id^="mount"] > div > div > div[class]').length >= 2 &&
                 *  $('body div[id^="mount"] > div > div > div[class]').last().find('svg > path[d^="M16.792"], svg > path[d^="M34.6 3.1c-4.5"]').length > 0 &&
                 *  $('body div[id^="mount"] > div > div > div[class]').last().find('svg > polyline + line').length > 0
                 *
                 */
                if ($('div[id^="mount"] section > div > a[href="/"]').length > 0) {
                    $('.IG_DWSTORY').remove();
                    $('.IG_DWNEWTAB').remove();
                    if ($('.IG_DWSTORY_THUMBNAIL').length) {
                        $('.IG_DWSTORY_THUMBNAIL').remove();
                    }

                    onStory(false);

                    // Prevent buttons from being eaten by black holes sometimes
                    setTimeout(() => {
                        onStory(false);
                    }, 150);
                }

                if ($(".IG_DWSTORY").length) {
                    setTimeout(() => {
                        if (USER_SETTING.SKIP_VIEW_STORY_CONFIRM) {
                            var $viewStoryButton = $('div[id^="mount"] section:last-child > div > div div[role="button"]').filter(function () {
                                return $(this).children().length === 0 && this.textContent.trim() !== "";
                            });
                            $viewStoryButton?.click();
                        }

                        state.pageLoaded = true;
                    }, 150);
                }
            }
            else {
                state.pageLoaded = false;
                // Remove icons
                if ($('.IG_DWSTORY').length) {
                    $('.IG_DWSTORY').remove();
                }
                if ($('.IG_DWSTORY_ALL').length) {
                    $('.IG_DWSTORY_ALL').remove();
                }
                if ($('.IG_DWNEWTAB').length) {
                    $('.IG_DWNEWTAB').remove();
                }
                if ($('.IG_DWSTORY_THUMBNAIL').length) {
                    $('.IG_DWSTORY_THUMBNAIL').remove();
                }

                if ($('.IG_DWHISTORY').length) {
                    $('.IG_DWHISTORY').remove();
                }
                if ($('.IG_DWHISTORY_ALL').length) {
                    $('.IG_DWHISTORY_ALL').remove();
                }
                if ($('.IG_DWHINEWTAB').length) {
                    $('.IG_DWHINEWTAB').remove();
                }
                if ($('.IG_DWHISTORY_THUMBNAIL').length) {
                    $('.IG_DWHISTORY_THUMBNAIL').remove();
                }
            }
        }

        checkingScriptUpdate(300);
        state.GL_referrer = new URL(location.href).pathname;
    }
}, checkInterval);