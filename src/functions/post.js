import { USER_SETTING, SVG, state, $body, resourceCountSelector, postContexts } from "../settings";
import {
    updateLoadingBar, openNewTab, logger,
    toggleVolumeSilder, triggerLinkElement,
    updatePopupSelectionSummary,
    replaceSameOriginHost,
    setDownloadProgress,
    triggerReactClickHandler,
    markContainerPositioned, saveFiles
} from "../utils/general";
import { _i18n } from "../utils/i18n";
import { openImageViewer } from "../utils/image_viewer";
import { IG_createDM, IG_setDM } from "../utils/dialog";
import { getPostMediaWithProvider } from "../utils/api";
import { observePostSlides } from "../timer";
import { getImageFromCache, mediaIdFromURL } from "../utils/image_cache";
/*! ESLINT IMPORT END !*/

/**
 * onReadyMyDW
 * @description Create an event entry point for the download button for the post.
 *
 * @param  {Boolean}  NoDialog    - Check if it not showing the dialog
 * @param  {?Boolean}  hasReferrer - Check if the source of the previous page is a story page
 * @return {void}
 */
export function onReadyMyDW(NoDialog, hasReferrer) {
    if (hasReferrer === true) {
        logger('hasReferrer', 'regenerated');
        $('article[data-snig="canDownload"], div[data-snig="canDownload"]').filter(function () {
            return $(this).find('.IG_DW_MAIN').length === 0;
        }).removeAttr('data-snig');
    }

    clearInterval(state.GL_repeat);
    state.GL_repeat = null;

    // Whether is Instagram dialog?
    if (NoDialog == false) {
        const maxCall = 100;
        let i = 0;

        state.GL_repeat = setInterval(() => {
            /*
             * Fast-path check:
             * Do not call createDownloadButton() when there are no new <article>
             * elements waiting to be processed.
             *
             * createDownloadButton() also supports the special <hr>-based single
             * post layout, so that layout is checked separately below.
             */
            let hasPendingArticle = document.querySelector('article:not([data-snig="canDownload"])') !== null;
            let hasPendingHrContainer = false;

            /*
             * section:visible > main > div > div > div > div > div > hr << (single foreground post in page, non-floating // <hr> element here is literally the line beneath poster's username) >>
             * section:visible > main > div > div.xdt5ytf[data-snig="canDownload"] << (former CSS selector for single foreground post in page, non-floating) >>
             * <hr> is much more unique element than "div.xdt5ytf"
             */
            const hrElements = document.querySelectorAll(
                'section > main > div > div > div > div > div > hr'
            );

            if (!hasPendingArticle) {
                for (const hr of hrElements) {
                    if (hr.getClientRects().length === 0) continue;

                    const container =
                        hr.parentElement?.parentElement?.parentElement?.parentElement;

                    if (container && !container.hasAttribute('data-snig')) {
                        hasPendingHrContainer = true;
                        break;
                    }
                }
            }

            // Check whether any post container currently exists in the DOM.
            const hasAnyPost = (document.querySelector('article') !== null) || (hrElements.length > 0);

            /*
             * FIX (Homepage navigation & Dialog coexistence):
             * 1) When navigating to the homepage, React may take 200-600ms to render the feed.
             *    During that window, hasAnyPost is false (0 articles in DOM). We must KEEP WAITING
             *    instead of prematurely terminating the timer.
             * 2) When a dialog opens (isDialog), foreground post has no data-snig yet (hasPendingArticle is true).
             *    We must allow createDownloadButton() to process it even if background posts already have data-snig.
             * 3) Stop repeating ONLY when posts actually exist in DOM (hasAnyPost is true) AND all of them
             *    have been processed (!hasPendingArticle && !hasPendingHrContainer).
             */
            if (hasAnyPost && !hasPendingArticle && !hasPendingHrContainer) {
                clearInterval(state.GL_repeat);
                state.GL_repeat = null;
                return;
            }

            if (i > maxCall) {
                clearInterval(state.GL_repeat);
                state.GL_repeat = null;

                //alert('Trying to call button creation method reached to maximum try times. If you want to re-register method, please open script menu and press "Reload Script" button or hotkey "R" to reload main timer.');
                console.warn('onReadyMyDW() Timer', 'maximum number of repetitions reached, terminated');
                return;
            }

            logger('onReadyMyDW() Timer', 'repeating to call detection createDownloadButton()');
            createDownloadButton();
            i++;
        }, 50);
    }
    else {
        createDownloadButton();
    }
}


/**
 * initPostVideoFunction
 * @description Initialize settings related to the video resources in the post.
 *
 * @param  {JQuery<HTMLElement>}  $mainElement
 * @return {Void}
 */
export function initPostVideoFunction($mainElement) {
    // OPTIMIZATION: cache $videos — used in 3-4 separate .find('video') traversals below
    const $videos = $mainElement.find('video');

    $videos.each(function () {
        $(this).off('fullscreenchange.IG_videoControl').on('fullscreenchange.IG_videoControl', function () {
            const $vid = $(this);
            if ($vid.attr('style').includes('object-fit')) {
                if (document.fullscreenElement == this) {
                    $vid.css('object-fit', 'contain');
                }
                else {
                    $vid.css('object-fit', 'cover');
                }
            }
        });
    });

    // Disable video autoplay
    if (USER_SETTING.DISABLE_VIDEO_LOOPING) {
        $videos.each(function () {
            $(this).one('ended', function () {
                this.pause();
                logger('(post) Stop video playing #loop');
            });
        });
    }

    // Modify video volume
    if (USER_SETTING.MODIFY_VIDEO_VOLUME) {
        $videos.each(function () {
            const $vid = $(this);
            $(this).one('play playing', function () {
                if (!$vid.data('modify')) {
                    $vid.data('modify', true);
                    this.volume = state.videoVolume;
                    logger('(post) Added video event listener #modify');
                }
            });
        });
    }

    if (USER_SETTING.HTML5_VIDEO_CONTROL) {
        const handleSwitchController = function (e) {
            e.preventDefault();
            e.stopPropagation();

            let $overlayElement = null;

            if ($overlayElement == null) {
                $overlayElement = $(e.target).parents('div[aria-label][data-visualcompletion="ignore"]').first();
            }

            $videos.each(function () {
                $(this).css('z-index', '2');
                $(this).attr('controls', true);
                state.GL_weakCache.overlay.set(this, $overlayElement);
            });

            $overlayElement.css('z-index', '-10');
            $mainElement.find('a[href^="/reels/"]').first().attr("draggable", false);
        };

        $mainElement.off('contextmenu.IG_videoControl').on('contextmenu.IG_videoControl', handleSwitchController);

        $videos.each(function () {
            const $video = $(this);
            if (!$video.data('controls')) {

                logger('(post) Added video html5 contorller #modify');

                if (USER_SETTING.MODIFY_VIDEO_VOLUME) {
                    this.volume = state.videoVolume;

                    $video.on('loadstart', function () {
                        this.volume = state.videoVolume;
                    });
                }


                let $mute_button_wrapper = $video.parent().find('video + div > div');
                $mute_button_wrapper = $mute_button_wrapper.add($mainElement);

                // eslint-disable-next-line no-unused-vars
                let $element_mute_button = $mute_button_wrapper.find('button[type="button"], div[role="button"]').filter(function (idx) {
                    const $b = $(this);
                    // This is mute/unmute's icon
                    return $b.width() <= 64 && $b.height() <= 64 && $b.find('svg > path[d^="M16.636 7.028a1.5"], svg > path[d^="M1.5 13.3c-.8"]').length > 0;
                });

                state.GL_weakCache.mutedButton.set(this, $element_mute_button);

                let $targets = $video.parent().find('video + div > div').first();

                // Hide layout to show controller
                $targets.off('contextmenu.IG_videoControl').on('contextmenu.IG_videoControl', handleSwitchController);

                // Restore layout to show details interface
                $video.on('contextmenu', function (e) {
                    e.preventDefault();
                    e.stopPropagation();

                    $video.css('z-index', '-1');
                    $video.removeAttr('controls');

                    $targets.css('z-index', '1');
                    state.GL_weakCache.overlay.get(this)?.css('z-index', '1');
                    $(this).parents('a[href^="/reels/"]').first().removeAttr("draggable");
                });

                $video.on('volumechange', function () {
                    let video = this;
                    let $element_mute_button = state.GL_weakCache.mutedButton.get(this) || {};
                    let is_element_muted = $element_mute_button.find && $element_mute_button.find('svg > path[d^="M16.636"]').length === 0;

                    if (this.muted != is_element_muted) {
                        this.volume = state.videoVolume;

                        if ($element_mute_button.length === 1) {
                            triggerReactClickHandler($element_mute_button.first()[0]);
                        }
                        else {
                            let $firstElementMuteButton = $element_mute_button.filter(function () {
                                return $(this).closest(state.GL_weakCache.overlay.get(video)).length > 0;
                            }).first();

                            triggerReactClickHandler($firstElementMuteButton.first()[0]);
                        }
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

                $video.parents('a[href^="/reels/"]').first().on('click', function (e) {
                    if ($video.attr('controls')) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                });

                $video.css('position', 'absolute');
                $video.data('controls', true);
            }
        });
    }

    var $buttonParent = $mainElement.find('video + div > div').first();
    toggleVolumeSilder($videos, $buttonParent, 'post', 'bottom');
};


/**
 * createDownloadButton
 * @description Create a download button in the upper right corner of each post.
 *
 * @return {void}
 */
export function createDownloadButton() {
    // Add download icon per each posts
    // eslint-disable-next-line no-unused-vars

    /*
     * OPTIMIZATION:
     * Avoid the expensive `:visible` + jQuery `.height()` / `.width()` checks
     * on every invocation.
     *
     * <article> is the normal post container.
     * The <hr>-based layout is kept because Instagram still uses it for some
     * single foreground post layouts.
     */
    const candidates = [];

    document.querySelectorAll('article:not([data-snig="canDownload"])').forEach((element) => {
        if (element.getClientRects().length === 0) return;
        candidates.push(element);
    });

    document.querySelectorAll('section > main > div > div > div > div > div > hr').forEach((element) => {
        if (element.getClientRects().length === 0) return;

        const container =
            element.parentElement?.parentElement?.parentElement?.parentElement;

        if (!container || container.hasAttribute('data-snig')) return;

        candidates.push(container);
    });

    $(candidates).each(function (index) {
        // OPTIMIZATION: cache $(this) — referenced 8+ times in this each() body
        const $self = $(this);
        // If it is have not download icon
        // class x1iyjqo2 mean user profile pages post list container
        if (!$self.attr('data-snig') && !$self.hasClass('x1iyjqo2') && !$self.children('article')?.hasClass('x1iyjqo2') && $self.parents('div#scrollview').length === 0) {
            logger("Found post container", $self);

            const $mainElement = $self;
            const tagName = this.tagName;

            // not loop each in single top post
            if (tagName === "DIV" && index != 0) {
                return;
            }

            const $childElement = $mainElement.children("div").children("div");

            if ($mainElement.find('> .button_wrapper, .button_wrapper').length > 0) {
                $mainElement.attr('data-snig', 'canDownload');
                return;
            }

            if ($childElement.length === 0) return;

            logger("Found insert point", $childElement);

            // Modify carousel post counter's position to not interfere with our buttons
            // Handled natively via injected CSS rule "._acay + .x24i39r { top: 37px !important; }"
            const $acayX24 = $mainElement.find('._acay + .x24i39r');
            if ($acayX24.length > 0) {
                $acayX24.css('top', '37px');
            }

            $childElement.eq((tagName === "DIV") ? 0 : $childElement.length - 2).append(`<div class="button_wrapper">`);

            // Add icons
            const DownloadElement = `<div data-ih-locale-title="DW" title="${_i18n("DW")}" class="IG_DW_MAIN">${SVG.DOWNLOAD}</div>`;
            const NewTabElement = `<div data-ih-locale-title="NEW_TAB" title="${_i18n("NEW_TAB")}" class="IG_NEWTAB_MAIN">${SVG.NEW_TAB}</div>`;
            const ThumbnailElement = `<div data-ih-locale-title="VIDEO_THUMBNAIL" title="${_i18n("VIDEO_THUMBNAIL")}" class="IG_THUMBNAIL_MAIN">${SVG.THUMBNAIL}</div>`;
            const ViewerElement = `<div data-ih-locale-title="IMAGE_VIEWER" title="${_i18n("IMAGE_VIEWER")}" class="IG_IMAGE_VIEWER">${SVG.FULLSCREEN}</div>`;

            // OPTIMIZATION: cache .button_wrapper inside $childElement (used 5+ times)
            const $buttonWrapper = $childElement.find(".button_wrapper");
            $buttonWrapper.append(DownloadElement);

            const resource_count = $mainElement.find(resourceCountSelector).length;

            if (resource_count > 1 && USER_SETTING.DIRECT_DOWNLOAD_VISIBLE_RESOURCE && !USER_SETTING.DIRECT_DOWNLOAD_ALL) {
                const DownloadAllElement = `<div data-ih-locale-title="DW_ALL" title="${_i18n("DW_ALL")}" class="IG_DW_ALL_MAIN">${SVG.DOWNLOAD_ALL}</div>`;
                $buttonWrapper.append(DownloadAllElement);
            }

            $buttonWrapper.append(NewTabElement);

            let $resourceLayout = $childElement.filter(function () {
                const element = this;
                return element.getClientRects().length > 0 &&
                    element.getBoundingClientRect().width > 100 &&
                    element.getBoundingClientRect().height > 100;
            }).first();

            let $isNewPostStyleLayout = $resourceLayout.find(`a[role="link"][tabindex="0"][href^="/"]`).filter(function () {
                const href = $(this).attr('href');
                return !href.startsWith("/p/") && !href.startsWith("/reels/");
            }).length > 0;

            // Make sure the button wrapper doesn't cover the "More Options" button.
            if ($isNewPostStyleLayout) {
                $buttonWrapper.css('top', '45px');
            }

            // Immediate initial check for visible resource without waiting for IntersectionObserver
            tagCarouselSlides($childElement);
            const $carouselSlides = $buttonWrapper.parent().find('ul[class]>li[style]~li[class][style]');
            const $hasCarousel = $carouselSlides.length > 1;
            const $firstSlide = $hasCarousel ? $carouselSlides.first() : null;
            const $initVideo = $hasCarousel
                ? ($firstSlide.find('video').length > 0 ? $firstSlide.find('video').first() : $())
                : ($mainElement.find('video:visible').first().length ? $mainElement.find('video:visible').first() : $mainElement.find('video').first());
            const $mediaScope = $hasCarousel
                ? $firstSlide
                : ($buttonWrapper.parent().find('img').length > 0 ? $buttonWrapper.parent() : $mainElement);
            const $initImgs = getPostImages($mediaScope);

            if ($initVideo.length > 0) {
                const posterSrc = $initVideo.attr('poster') || $initVideo.prop('poster') || $initImgs.first().attr('src');
                if (posterSrc) {
                    $mainElement.data('igHelper_videoThumbnailURL', posterSrc);
                }
                if ($buttonWrapper.find('.IG_THUMBNAIL_MAIN').length === 0) {
                    $buttonWrapper.append(ThumbnailElement);
                }
                initPostVideoFunction($mainElement);
            } else if ($initImgs.length > 0) {
                const $initImg = $initImgs.first();
                const imgSrc = $initImg.attr('src') || $initImg[0]?.currentSrc;
                if (imgSrc) {
                    $mainElement.data('igHelper_displayResourceURL', imgSrc);
                    if ($buttonWrapper.find('.IG_IMAGE_VIEWER').length === 0) {
                        $buttonWrapper.append(ViewerElement);
                    }
                } else {
                    // Wait for initial image src to finish loading if not ready immediately
                    $initImg.one('load', function () {
                        const delayedSrc = $(this).attr('src') || this.currentSrc;
                        if (delayedSrc) {
                            $mainElement.data('igHelper_displayResourceURL', delayedSrc);
                            if ($buttonWrapper.find('.IG_IMAGE_VIEWER').length === 0) {
                                $buttonWrapper.append(ViewerElement);
                            }
                        }
                    });
                }
            }

            setTimeout(() => {
                if (!$mainElement[0].isConnected) return;

                // Register the post on the shared resource observer
                postContexts.set($mainElement[0], { $mainElement, $childElement, ThumbnailElement, ViewerElement });
                observePostSlides($mainElement[0]);

                const $bwParent = $childElement.find('.button_wrapper').parent();
                const listRoot =
                    $bwParent.find('ul li, div[role="button"] > div').first().parent()[0] ||
                    $bwParent.find('ul').first()[0];

                if (!listRoot) {
                    initPostVideoFunction($mainElement);
                    logger("Cannot find resource list root element, thumbnail and viewer button may not work.");
                }
            }, 50);

            markContainerPositioned($childElement);

            // Add the mark that download is ready
            var username = $self.find("header > div:last-child > div:first-child span a").first().text() || $self.find('a[href^="/"]').filter(function () {
                return $(this)?.text()?.length > 0;
            }).first().text();

            $self.attr('data-snig', 'canDownload');
            $self.data('username', username);
        }
    });
}


/**
 * registerPostClickHandlers
 * @description Registers delegated body-level handlers for post download/view actions.
 *
 * FIX: Registers all post-button click handlers exactly once on $('body') using
 * the event namespace ".igHelperPost". Body-level delegation means jQuery stores
 * only a single handler object per event type (not one per article), and the
 * handlers themselves never hold strong references to article DOM nodes —
 * they resolve the relevant article at click-time via $(this).closest().
 *
 * Cleanup is a single $('body').off('.igHelperPost') call in reloadScript().
 */
export function registerPostClickHandlers() {
    if (state.bodyEventsRegistered) return;
    state.bodyEventsRegistered = true;

    // OPTIMIZATION: All body-level delegated handlers now use cached $body reference
    $body.on('click.igHelperPost', '.IG_IMAGE_VIEWER', function () {
        const { $article, postPath } = getPostContextFromButton(this);
        const ctx = getPostVisibleMediaContext($article, postPath);
        const url = ctx.cachedUrl || ctx.displayUrl || $article.data('igHelper_displayResourceURL') || null;

        if (url) {
            openImageViewer(url);
        } else {
            alert("Cannot find resource url.");
        }
    });

    $body.on('click.igHelperPost', '.IG_THUMBNAIL_MAIN', async function () {
        updateLoadingBar(true);

        try {
            const { $article, postPath } = getPostContextFromButton(this);
            if ($article.length === 0 || !postPath) {
                alert('Cannot determine post path.');
                return;
            }

            state.GL_username = $article.data('username');
            state.GL_postPath = postPath;

            if (USER_SETTING.CAPTURE_IMAGE_VIA_MEDIA_CACHE) {
                const ctx = getPostVisibleMediaContext($article, postPath);
                const cached = ctx.cachedUrl || (ctx.mediaId ? getImageFromCache(ctx.mediaId) : null);

                if (cached) {
                    logger('[Restore cached post video thumbnail]', ctx.mediaId || postPath);

                    const publish_time = new Date(
                        $article.find('a[href] time[datetime]').filter(function () {
                            let href = $(this).parents("a[href]").attr("href");
                            return href?.startsWith("/p/") || href?.match(/\/([\w.\-_]+)\/(p|reel)\//ig) != null;
                        }).first().attr('datetime')
                    ).getTime();

                    await saveFiles(cached, {
                        username: state.GL_username,
                        sourceType: 'thumbnail',
                        timestamp: USER_SETTING.RENAME_PUBLISH_DATE ? publish_time : new Date().getTime(),
                        filetype: 'jpg',
                        shortcode: postPath
                    });
                    return;
                }
            }

            const index = getVisibleNodeIndex($article);

            IG_createDM(true, false);

            const totalInserted = await createMediaListDOM(
                state.GL_postPath,
                ".IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY",
                ""
            );

            if (!totalInserted || totalInserted < 1) {
                alert('Cannot find thumbnail URL.');
                return;
            }

            const $popupBody = $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY');
            const $videoThumbnail = $popupBody
                .find('a[data-globalindex="' + (index + 1) + '"]')
                .parent()
                .find('.videoThumbnail')
                .first();

            if ($videoThumbnail.length > 0) {
                $videoThumbnail.trigger("click");
            }
            else {
                alert('Cannot find thumbnail URL.');
            }
        }
        catch (err) {
            logger('registerPostClickHandlers .IG_THUMBNAIL_MAIN', err);
            alert('Cannot find thumbnail URL.');
        }
        finally {
            updateLoadingBar(false);
            $('.IG_POPUP_DIG').remove();
        }
    });

    $body.on('click.igHelperPost', '.IG_NEWTAB_MAIN', async function () {
        updateLoadingBar(true);

        try {
            const { $article, postPath } = getPostContextFromButton(this);
            if ($article.length === 0 || !postPath) {
                alert('Cannot determine post path.');
                return;
            }

            state.GL_username = $article.data('username');
            state.GL_postPath = postPath;

            const ctx = getPostVisibleMediaContext($article, postPath);

            if (USER_SETTING.CAPTURE_IMAGE_VIA_MEDIA_CACHE && !ctx.isVideo) {
                if (ctx.cachedUrl) {
                    logger('[Fast path] Restore cached visible resource for new tab', ctx.mediaId);
                    openNewTab(ctx.cachedUrl);
                    return;
                }
            }

            // If not in cache, but it's an image and we have a display URL from DOM, open it directly without API
            if (!ctx.isVideo && ctx.displayUrl) {
                openNewTab(replaceSameOriginHost(ctx.displayUrl));
                return;
            }

            const index = getVisibleNodeIndex($article);

            IG_createDM(true, false);

            const totalInserted = await createMediaListDOM(
                state.GL_postPath,
                ".IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY",
                ""
            );

            if (!totalInserted || totalInserted < 1) {
                alert('Cannot find open tab URL.');
                return;
            }

            const $popupBody = $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY');
            const $linkElement = $popupBody.find('a[data-globalindex="' + (index + 1) + '"]');

            if ($linkElement.length === 0) {
                alert('Cannot find open tab URL.');
                return;
            }

            const href = $linkElement.data('href');
            if (href) {
                openNewTab(replaceSameOriginHost(href));
            }
            else {
                alert('Cannot find open tab URL.');
            }
        }
        catch (err) {
            logger('registerPostClickHandlers .IG_NEWTAB_MAIN', err);
            alert('Cannot find open tab URL.');
        }
        finally {
            updateLoadingBar(false);
            $('.IG_POPUP_DIG').remove();
        }
    });

    $body.on('click.igHelperPost', '.IG_DW_ALL_MAIN', async function () {
        try {
            const { $article, postPath } = getPostContextFromButton(this);
            if ($article.length === 0 || !postPath) {
                alert('Cannot determine post path.');
                return;
            }

            state.GL_username = $article.data('username');
            state.GL_postPath = postPath;

            IG_createDM(USER_SETTING.DIRECT_DOWNLOAD_ALL, true);
            $("#article-id").html(`<a href="https://www.instagram.com/p/${state.GL_postPath}">${state.GL_postPath}</a>`);

            const totalInserted = await createMediaListDOM(
                state.GL_postPath,
                ".IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY",
                _i18n("LOAD_BLOB_MULTIPLE")
            );

            if (!totalInserted || totalInserted < 1) {
                $('.IG_POPUP_DIG').remove();
                return;
            }

            const links = [];
            $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY a').each(function () {
                links.push($(this));
            });

            await batchDownloadPostFiles(links);
        }
        catch (err) {
            logger('registerPostClickHandlers .IG_DW_ALL_MAIN', err);
        }
        finally {
            $('.IG_POPUP_DIG').remove();
        }
    });

    $body.on('click.igHelperPost', '.IG_DW_MAIN', async function () {
        try {
            const { $article, postPath } = getPostContextFromButton(this);
            if ($article.length === 0 || !postPath) {
                alert('Cannot determine post path.');
                return;
            }

            state.GL_username = $article.data('username');
            state.GL_postPath = postPath;

            const ctx = getPostVisibleMediaContext($article, postPath);
            const publish_time = new Date(
                $article.find('a[href] time[datetime]').filter(function () {
                    let href = $(this).parents("a[href]").attr("href");
                    return href?.startsWith("/p/") || href?.match(/\/([\w.\-_]+)\/(p|reel)\//ig) != null;
                }).first().attr('datetime')
            ).getTime();

            if (USER_SETTING.DIRECT_DOWNLOAD_VISIBLE_RESOURCE) {
                updateLoadingBar(true);
                IG_setDM(true);

                try {
                    if (USER_SETTING.CAPTURE_IMAGE_VIA_MEDIA_CACHE && !ctx.isVideo && ctx.cachedUrl) {
                        logger('[Restore cached visible resource]', ctx.mediaId);

                        await saveFiles(ctx.cachedUrl, {
                            username: state.GL_username,
                            sourceType: 'photo',
                            timestamp: USER_SETTING.RENAME_PUBLISH_DATE ? publish_time : new Date().getTime(),
                            filetype: 'jpg',
                            shortcode: ctx.mediaId || postPath
                        });

                        updateLoadingBar(false);
                        $('.IG_POPUP_DIG').remove();
                        return;
                    }

                    if (!ctx.isVideo && ctx.displayUrl) {
                        await saveFiles(ctx.displayUrl, {
                            username: state.GL_username,
                            sourceType: 'photo',
                            timestamp: USER_SETTING.RENAME_PUBLISH_DATE ? publish_time : new Date().getTime(),
                            filetype: 'jpg',
                            shortcode: ctx.mediaId || postPath
                        });

                        updateLoadingBar(false);
                        $('.IG_POPUP_DIG').remove();
                        return;
                    }

                    const index = getVisibleNodeIndex($article);

                    const totalInserted = await createMediaListDOM(
                        state.GL_postPath,
                        ".IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY",
                        ""
                    );

                    if (!totalInserted || totalInserted < 1) {
                        alert('Cannot find download URL.');
                        return;
                    }

                    const $popupBody = $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY');
                    const $targetLink = $popupBody.find('a[data-globalindex="' + (index + 1) + '"]');
                    const href = $targetLink.data('href');

                    if ($targetLink.length > 0 && href) {
                        $targetLink.trigger("click");
                    }
                    else {
                        alert('Cannot find download URL.');
                    }
                }
                catch (err) {
                    logger('registerPostClickHandlers .IG_DW_MAIN visibleResource', err);
                    alert('Cannot find download URL.');
                }
                finally {
                    updateLoadingBar(false);
                    $('.IG_POPUP_DIG').remove();
                }

                return;
            }

            IG_createDM(USER_SETTING.DIRECT_DOWNLOAD_ALL, true);
            $("#article-id").html(`<a href="https://www.instagram.com/p/${state.GL_postPath}">${state.GL_postPath}</a>`);

            if (!USER_SETTING.DIRECT_DOWNLOAD_ALL) {
                let s = 0;
                const $resourceItems = $article.find(resourceCountSelector);
                let multiple = $resourceItems.length;
                let blob = USER_SETTING.FORCE_FETCH_ALL_RESOURCES;

                if (multiple) {
                    $resourceItems.each(function () {
                        let element_videos = $(this).parent().parent().parent().find('video');
                        if (element_videos && element_videos.attr('src')) {
                            blob = true;
                        }
                    });

                    if (blob) {
                        await createMediaListDOM(
                            state.GL_postPath,
                            ".IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY",
                            _i18n("LOAD_BLOB_MULTIPLE")
                        );
                    }
                    else {
                        const $popupBody = $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY');
                        $resourceItems.each(function () {
                            s++;
                            const $this = $(this);
                            let element_videos = $this.find('video');
                            let element_images = getPostImages($this);
                            let imgLink = (element_images.attr('srcset')) ? element_images.attr('srcset').split(" ")[0] : element_images.attr('src');
                            let itemMediaId = imgLink ? mediaIdFromURL(imgLink) : null;
                            let cachedItem = (USER_SETTING.CAPTURE_IMAGE_VIA_MEDIA_CACHE && itemMediaId) ? getImageFromCache(itemMediaId) : null;
                            if (cachedItem) imgLink = cachedItem;

                            if (element_videos && element_videos.attr('src')) {
                                blob = true;
                            }
                            if (element_images.length > 0 && imgLink) {
                                $popupBody.append(`<a media-id="${itemMediaId || ''}" datetime="${publish_time}" data-needed="direct" data-path="${state.GL_postPath}" data-name="photo" data-type="jpg" data-username="${state.GL_username || ''}" data-globalIndex="${s}" href="javascript:;" data-href="${imgLink}"><img width="100" src="${imgLink}" /><br/>- <span data-ih-locale="IMG">${_i18n("IMG")}</span> ${s} -</a>`);
                            }
                        });

                        if (blob) {
                            await createMediaListDOM(
                                state.GL_postPath,
                                ".IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY",
                                _i18n("LOAD_BLOB_RELOAD")
                            );
                        }
                    }
                }
                else {
                    s++;
                    let element_videos = $article.find('video');
                    let element_images = getPostImages($article);
                    let imgLink = (element_images.attr('srcset')) ? element_images.attr('srcset').split(" ")[0] : element_images.attr('src');

                    if (USER_SETTING.CAPTURE_IMAGE_VIA_MEDIA_CACHE && ctx.cachedUrl && !ctx.isVideo) {
                        imgLink = ctx.cachedUrl;
                    }

                    if (element_videos.length > 0 && element_videos.attr('src')) {
                        await createMediaListDOM(
                            state.GL_postPath,
                            ".IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY",
                            _i18n("LOAD_BLOB_ONE")
                        );
                    }
                    if (element_images.length > 0 && imgLink) {
                        $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY').append(`<a media-id="${ctx.mediaId || ''}" datetime="${publish_time}" data-needed="direct" data-path="${state.GL_postPath}" data-name="photo" data-type="jpg" data-username="${state.GL_username || ''}" data-globalIndex="${s}" href="javascript:;" data-href="${imgLink}"><img width="100" src="${imgLink}" /><br/>- <span data-ih-locale="IMG">${_i18n("IMG")}</span> ${s} -</a>`);
                    }
                    else if (element_videos.length === 0 && !blob) {
                        await createMediaListDOM(
                            state.GL_postPath,
                            ".IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY",
                            _i18n("LOAD_BLOB_ONE")
                        );
                    }
                }
            }

            $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY a').each(function () {
                const $a = $(this);
                if ($a.parent().is('div') && $a.prev('.inner_box_wrapper').length > 0) {
                    return;
                }

                $a.wrap('<div></div>');
                $a.before('<label class="inner_box_wrapper"><input class="inner_box" type="checkbox"><span></span></label>');
                $a.after(`<div data-ih-locale-title="NEW_TAB" title="${_i18n("NEW_TAB")}" class="newTab">${SVG.NEW_TAB}</div>`);

                if ($a.data('name') == 'video') {
                    $a.after(`<div data-ih-locale-title="VIDEO_THUMBNAIL" title="${_i18n("VIDEO_THUMBNAIL")}" class="videoThumbnail">${SVG.THUMBNAIL}</div>`);
                }

                updatePopupSelectionSummary();
            });

            $('.IG_POPUP_DIG #batch_download_selected, .IG_POPUP_DIG #batch_download_direct').prop('disabled', false);
            updatePopupSelectionSummary();

            if (USER_SETTING.DIRECT_DOWNLOAD_ALL) {
                const $resourceItems = $article.find(resourceCountSelector);
                if ($resourceItems.length <= 1 && !ctx.isVideo && ctx.cachedUrl) {
                    // Fast path: single cached image post download directly
                    await saveFiles(ctx.cachedUrl, {
                        username: state.GL_username,
                        sourceType: 'photo',
                        timestamp: USER_SETTING.RENAME_PUBLISH_DATE ? publish_time : new Date().getTime(),
                        filetype: 'jpg',
                        shortcode: ctx.mediaId || postPath
                    });
                    $('.IG_POPUP_DIG').remove();
                    return;
                }

                const totalInserted = await createMediaListDOM(
                    state.GL_postPath,
                    ".IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY",
                    _i18n("LOAD_BLOB_MULTIPLE")
                );

                if (!totalInserted || totalInserted < 1) {
                    $('.IG_POPUP_DIG').remove();
                    return;
                }

                const links = [];
                $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY a').each(function () {
                    links.push($(this));
                });

                await batchDownloadPostFiles(links);
                $('.IG_POPUP_DIG').remove();
            }
        }
        catch (err) {
            logger('registerPostClickHandlers .IG_DW_MAIN', err);
            $('.IG_POPUP_DIG').remove();
        }
    });
}


/**
 * filterResourceData
 * @description Standardized resource object format.
 *
 * @param  {Object}  data
 * @return {Object}
 */
export function filterResourceData(data) {
    var resource = data.shortcode_media ?? data;
    if (resource.owner == null && resource.user != null) {
        resource.owner = resource.user;
    }

    if (resource.owner == null) {
        logger('carousel_media:', 'undefined username');
        alert('carousel_media: undefined username');
    }

    return resource;
}


/**
 * createMediaListDOM
 * @description Create a list of media elements from post URLs.
 *
 * @param  {String}  postURL
 * @param  {String}  selector - Use CSS element selectors to choose where it appears.
 * @param  {String}  message - i18n display loading message
 * @return {Promise<number>}  The number of <a> elements inserted into the DOM
 */
export async function createMediaListDOM(postURL, selector, message) {
    try {
        // OPTIMIZATION: cache the popup body selection used many times below
        const $target = $(selector);
        $target.find('a').remove();
        $target.append('<p id="_SNLOAD">' + message + '</p>');
        $('.IG_POPUP_DIG #batch_download_selected, .IG_POPUP_DIG #batch_download_direct').prop('disabled', true);
        // Optionally resolve post/reel media through Instagram's current
        // PolarisPostRootQuery. DIRECT_DOWNLOAD_ALL additionally uses the legacy
        // query_hash response only to discover the media IDs before resolving URLs
        // through Polaris.
        let result = await getPostMediaWithProvider(postURL);
        let resource = filterResourceData(result.data);
        const resourceShortcode = resource.code || resource.shortcode || postURL;

        if (result.type === 'query_hash') {
            let idx = 1;

            // GraphVideo
            if (resource.__typename == "GraphVideo" && resource.video_url) {
                $target.append(`<a media-id="${resource.id}" datetime="${resource.taken_at_timestamp}" data-blob="true" data-needed="direct" data-path="${resource.shortcode}" data-name="video" data-type="mp4" data-username="${resource.owner.username}" data-globalIndex="${idx}" href="javascript:;" data-href="${resource.video_url}"><img width="100" src="${resource.display_resources[1].src}" /><br/>- <span data-ih-locale="VID">${_i18n("VID")}</span> ${idx} -</a>`);
                idx++;

            }
            // GraphImage
            if (resource.__typename == "GraphImage") {
                $target.append(`<a media-id="${resource.id}" datetime="${resource.taken_at_timestamp}" data-blob="true" data-needed="direct" data-path="${resource.shortcode}" data-name="photo" data-type="jpg" data-username="${resource.owner.username}" data-globalIndex="${idx}" href="javascript:;" data-href="${resource.display_resources[resource.display_resources.length - 1].src}"><img width="100" src="${resource.display_resources[1].src}" /><br/>- <span data-ih-locale="IMG">${_i18n("IMG")}</span> ${idx} -</a>`);
                idx++;
            }
            // GraphSidecar
            if (resource.__typename == "GraphSidecar" && resource.edge_sidecar_to_children) {
                for (let e of resource.edge_sidecar_to_children.edges) {
                    if (e.node.__typename == "GraphVideo") {
                        $target.append(`<a media-id="${e.node.id}" datetime="${resource.taken_at_timestamp}" data-blob="true" data-needed="direct" data-path="${resource.shortcode}" data-name="video" data-type="mp4" data-username="${resource.owner.username}" data-globalIndex="${idx}" href="javascript:;" data-href="${e.node.video_url}"><img width="100" src="${e.node.display_resources[1].src}" /><br/>- <span data-ih-locale-title="VID">${_i18n("VID")}</span> ${idx} -</a>`);
                    }

                    if (e.node.__typename == "GraphImage") {
                        $target.append(`<a media-id="${e.node.id}" datetime="${resource.taken_at_timestamp}" data-blob="true" data-needed="direct" data-path="${resource.shortcode}" data-name="photo" data-type="jpg" data-username="${resource.owner.username}" data-globalIndex="${idx}" href="javascript:;" data-href="${e.node.display_resources[e.node.display_resources.length - 1].src}"><img width="100" src="${e.node.display_resources[1].src}" /><br/>- <span data-ih-locale="IMG">${_i18n("IMG")}</span> ${idx} -</a>`);
                    }
                    idx++;
                }
            }
        }
        else {
            if (resource.carousel_media) {
                logger('carousel_media');

                resource.carousel_media.forEach((mda, ind) => {
                    let idx = ind + 1;
                    // Image
                    if (mda.video_versions == null) {
                        mda.image_versions2.candidates.sort(function (a, b) {
                            let aSTP = new URL(a.url).searchParams.get('stp');
                            let bSTP = new URL(b.url).searchParams.get('stp');

                            if (aSTP && bSTP) {
                                if (aSTP.length > bSTP.length) return 1;
                                if (aSTP.length < bSTP.length) return -1;
                            }
                            else {
                                if (a.width < b.width) return 1;
                                if (a.width > b.width) return -1;
                            }

                            return 0;
                        });

                        let itemUrl = mda.image_versions2.candidates[0].url;
                        if (USER_SETTING.CAPTURE_IMAGE_VIA_MEDIA_CACHE) {
                            const cachedImg = getImageFromCache(String(mda.pk));
                            if (cachedImg) itemUrl = cachedImg;
                        }
                        $target.append(`<a media-id="${mda.pk}" datetime="${mda.taken_at || resource.taken_at}" data-blob="true" data-needed="direct" data-path="${resourceShortcode}" data-name="photo" data-type="jpg" data-username="${resource.owner.username}" data-globalIndex="${idx}" href="javascript:;" data-href="${itemUrl}"><img width="100" src="${itemUrl}" /><br/>- <span data-ih-locale="IMG">${_i18n("IMG")}</span> ${idx} -</a>`);
                    }
                    // Video
                    else {
                        $target.append(`<a media-id="${mda.pk}" datetime="${mda.taken_at || resource.taken_at}" data-blob="true" data-needed="direct" data-path="${resourceShortcode}" data-name="video" data-type="mp4" data-username="${resource.owner.username}" data-globalIndex="${idx}" href="javascript:;" data-href="${mda.video_versions[0].url}"><img width="100" src="${mda.image_versions2.candidates[0].url}" /><br/>- <span data-ih-locale="VID">${_i18n("VID")}</span> ${idx} -</a>`);
                    }
                });
            }
            else {
                let idx = 1;
                // Image
                if (resource.video_versions == null) {
                    resource.image_versions2.candidates.sort(function (a, b) {
                        let aSTP = new URL(a.url).searchParams.get('stp');
                        let bSTP = new URL(b.url).searchParams.get('stp');

                        if (aSTP && bSTP) {
                            if (aSTP.length > bSTP.length) return 1;
                            if (aSTP.length < bSTP.length) return -1;
                        }
                        else {
                            if (a.width < b.width) return 1;
                            if (a.width > b.width) return -1;
                        }

                        return 0;
                    });

                    let itemUrl = resource.image_versions2.candidates[0].url;
                    if (USER_SETTING.CAPTURE_IMAGE_VIA_MEDIA_CACHE) {
                        const cachedImg = getImageFromCache(String(resource.pk));
                        if (cachedImg) itemUrl = cachedImg;
                    }
                    $target.append(`<a media-id="${resource.pk}" datetime="${resource.taken_at}" data-blob="true" data-needed="direct" data-path="${resourceShortcode}" data-name="photo" data-type="jpg" data-username="${resource.owner.username}" data-globalIndex="${idx}" href="javascript:;" data-href="${itemUrl}"><img width="100" src="${itemUrl}" /><br/>- <span data-ih-locale="IMG">${_i18n("IMG")}</span> ${idx} -</a>`);
                }
                // Video
                else {
                    $target.append(`<a media-id="${resource.pk}" datetime="${resource.taken_at}" data-blob="true" data-needed="direct" data-path="${resourceShortcode}" data-name="video" data-type="mp4" data-username="${resource.owner.username}" data-globalIndex="${idx}" href="javascript:;" data-href="${resource.video_versions[0].url}"><img width="100" src="${resource.image_versions2.candidates[0].url}" /><br/>- <span data-ih-locale="VID">${_i18n("VID")}</span> ${idx} -</a>`);
                }
            }
        }

        $("#_SNLOAD").remove();
        $('.IG_POPUP_DIG #batch_download_selected, .IG_POPUP_DIG #batch_download_direct').prop('disabled', false);
        $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY a').each(function () {
            const $a = $(this);
            $a.wrap('<div></div>');
            $a.before('<label class="inner_box_wrapper"><input class="inner_box" type="checkbox"><span></span></label>');
            $a.after(`<div data-ih-locale-title="NEW_TAB" title="${_i18n("NEW_TAB")}" class="newTab">${SVG.NEW_TAB}</div>`);

            if ($a.data('name') == 'video') {
                $a.after(`<div data-ih-locale-title="VIDEO_THUMBNAIL" title="${_i18n("VIDEO_THUMBNAIL")}" class="videoThumbnail">${SVG.THUMBNAIL}</div>`);
            }
        });
        updatePopupSelectionSummary();

        return $target.find('a').length;
    }
    catch (err) {
        logger('createMediaListDOM', err);
        $("#_SNLOAD").remove();
        $('.IG_POPUP_DIG #batch_download_selected, .IG_POPUP_DIG #batch_download_direct').prop('disabled', false);
        return 0;
    }
}


/**
 * tagCarouselSlides
 * @description Identifies and marks real carousel slide <li> elements with
 *              the igh-res-index="N" attribute (1-based index).
 *              Calculates position mathematically from inline transform: translateX(...)
 *              and slide width, with sibling relative position fallback.
 *
 * @param  {JQuery|HTMLElement} container - Post container ($article) or carousel <ul>
 * @return {void}
 */
export function tagCarouselSlides(container) {
    if (!container) return;
    const $el = $(container);
    const $ul = $el.is('ul') ? $el : $el.find('ul[class]').filter(function () {
        return $(this).children('li').length > 0;
    }).first();

    if ($ul.length === 0) return;

    // Match real carousel items (li elements), excluding dummy 1px/spacer elements
    const $slides = $ul.children('li').filter(function () {
        const w = this.getBoundingClientRect().width;
        return w > 64 && ($(this).find('img, video').length > 0 || $(this).attr('class'));
    });

    if ($slides.length === 0) return;

    // Determine uniform slide width
    let slideWidth = 0;
    $slides.each(function () {
        const w = this.getBoundingClientRect().width;
        if (w > 64 && !slideWidth) {
            slideWidth = w;
        }
    });

    // Fallback for slide width from child div style if bounding client rect is not available
    if (!slideWidth) {
        $slides.each(function () {
            const innerDivStyle = $(this).children('div').first().attr('style') || '';
            const wMatch = innerDivStyle.match(/width:\s*(\d+(?:\.\d+)?)px/);
            if (wMatch && !slideWidth) {
                slideWidth = parseFloat(wMatch[1]);
            }
        });
    }

    if (!slideWidth) {
        const viewport = $ul.parent()[0];
        slideWidth = viewport ? viewport.getBoundingClientRect().width : 0;
    }

    $slides.each(function () {
        const li = this;
        const style = li.getAttribute('style') || '';

        // 1. Primary: exact mathematical calculation via translateX
        if (style.includes('translateX') && slideWidth > 0) {
            const match = style.match(/translateX\(([^p]+)px\)/);
            if (match && match[1]) {
                const totalOffset = parseFloat(match[1]);
                const pos = Math.round(totalOffset / slideWidth) + 1; // 1-based position
                if (pos > 0) {
                    li.setAttribute('igh-res-index', String(pos));
                    return;
                }
            }
        }

        // 2. Relative sibling deduction fallback if translateX is absent or unparseable
        if (!li.hasAttribute('igh-res-index')) {
            const prev = li.previousElementSibling;
            const next = li.nextElementSibling;
            if (prev && prev.hasAttribute('igh-res-index')) {
                const prevPos = parseInt(prev.getAttribute('igh-res-index'), 10);
                if (!isNaN(prevPos) && prevPos > 0) {
                    li.setAttribute('igh-res-index', String(prevPos + 1));
                }
            } else if (next && next.hasAttribute('igh-res-index')) {
                const nextPos = parseInt(next.getAttribute('igh-res-index'), 10);
                if (!isNaN(nextPos) && nextPos > 1) {
                    li.setAttribute('igh-res-index', String(nextPos - 1));
                }
            }
        }
    });
}

/**
 * getVisibleNodeIndex
 * @description Get element visible node index in a carousel post (0-based).
 *
 * @param  {Object}  $main - jQuery post container element ($article)
 * @return {Integer} 0-based index of the currently visible slide
 */
export function getVisibleNodeIndex($main) {
    // 1. Highest priority: Read 'img_index' directly from URL query parameters if present (1-based index)
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const imgIndex = urlParams.get('img_index');
        if (imgIndex) {
            const parsed = parseInt(imgIndex, 10);
            if (!isNaN(parsed) && parsed >= 1) {
                return parsed - 1; // Convert 1-based index to 0-based
            }
        }
        // eslint-disable-next-line no-unused-vars
    } catch (_) { /* empty */ }

    var index = 0;

    // 2. Geometric algorithm: locate the carousel viewport and the active slide
    const $ul = $main.find('ul[class]').filter(function () {
        return $(this).children('li').length > 0;
    }).first();

    if ($ul.length === 0) {
        return 0;
    }

    // Tag all current real slide items with igh-res-index attribute
    tagCarouselSlides($ul);

    // Match real carousel items (li elements), excluding dummy 1px/12px spacers
    const $slides = $ul.children('li').filter(function () {
        const w = this.getBoundingClientRect().width;
        return w > 64 && ($(this).find('img, video').length > 0 || $(this).attr('class'));
    });

    if ($slides.length <= 1) {
        // Even if only 1 slide is rendered, check if it has igh-res-index
        if ($slides.length === 1) {
            const ighPos = $slides.get(0).getAttribute('igh-res-index');
            if (ighPos) {
                const parsed = parseInt(ighPos, 10);
                if (!isNaN(parsed) && parsed >= 1) return parsed - 1;
            }
        }
        return 0;
    }

    // Locate viewport element:
    // Prioritize button_wrapper's parent (placed directly into the media container by createDownloadButton),
    // then the grandparent of ul (viewport mask with overflow:hidden), then parent
    let $viewport = $main.find('.button_wrapper').parent();
    if ($viewport.length === 0 || $viewport.get(0).getBoundingClientRect().width === 0) {
        $viewport = $main.find('*:not([data-pagelet])>*:not([role])>*:not([style])>*>*[role="presentation"]>*>ul[class]').parent().parent('[role]');
    }
    if ($viewport.length === 0 || $viewport.get(0).getBoundingClientRect().width === 0) {
        $viewport = $ul.parent().parent();
    }
    if ($viewport.length === 0 || $viewport.get(0).getBoundingClientRect().width === 0) {
        $viewport = $ul.parent();
    }

    if ($viewport.length > 0) {
        const viewportRect = $viewport.get(0).getBoundingClientRect();
        const itemWidth = viewportRect.width;

        if (itemWidth > 0) {
            // STAGE 1: Visual positioning, find the slide closest to the viewport center
            const viewportCenter = (viewportRect.left + viewportRect.right) / 2;
            let closestSlideElement = null;
            let minDistance = Infinity;

            $slides.each(function () {
                if (this.getBoundingClientRect().width === 0) return;

                const slideRect = this.getBoundingClientRect();
                const slideCenter = (slideRect.left + slideRect.right) / 2;
                const distance = Math.abs(slideCenter - viewportCenter);

                if (distance < minDistance) {
                    minDistance = distance;
                    closestSlideElement = this;
                }
            });

            // STAGE 2: Index calculation using the identified active slide
            if (closestSlideElement) {
                // Method 1: Read custom igh-res-index attribute (1-based -> 0-based)
                const ighPos = closestSlideElement.getAttribute('igh-res-index');
                if (ighPos) {
                    const parsed = parseInt(ighPos, 10);
                    if (!isNaN(parsed) && parsed >= 1) {
                        return parsed - 1;
                    }
                }

                // Method 2: If inline translateX is used, calculate absolute offset index directly
                const style = $(closestSlideElement).attr('style') || '';
                if (style.includes('translateX')) {
                    const offsetMatch = style.match(/translateX\(([^p]+)px\)/);
                    if (offsetMatch && offsetMatch[1]) {
                        const totalOffset = parseFloat(offsetMatch[1]);
                        const slideWidth = closestSlideElement.getBoundingClientRect().width;
                        const divisor = slideWidth > 0 ? slideWidth : itemWidth;
                        if (divisor > 0) {
                            const offsetIdx = Math.round(totalOffset / divisor);
                            if (offsetIdx >= 0) {
                                return offsetIdx;
                            }
                        }
                    }
                }

                // Method 3: Fallback to exact 0-based position among filtered real slides in DOM
                const slideIdx = $slides.index(closestSlideElement);
                if (slideIdx >= 0) {
                    index = slideIdx;
                }
            }
        }
    }

    return index >= 0 ? index : 0;
}


/**
 * batchDownloadPostFiles
 * @description Batch download media files in posts to prevent browser crashes.
 * @param {jQuery} $elements
 * @return {Promise<void>}
 */
export async function batchDownloadPostFiles($elements) {
    let index = 0;
    const totalLen = $elements.length;
    setDownloadProgress(0, totalLen);

    for (const element of $elements) {
        try {
            await triggerLinkElement($(element), false);
        } catch (err) {
            console.error('batchDownloadPostFiles failed:', err, element?.dataset?.href);
        }

        index++;
        setDownloadProgress(index, totalLen);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}


/**
 * shortcodeToId
 * @description Converts Instagram post shortcode (base64-like) to numeric media ID.
 *              Uses BigInt to avoid 64-bit integer precision loss.
 *
 * @param  {String} shortcode
 * @return {?String}
 */
export function shortcodeToId(shortcode) {
    if (!shortcode || typeof shortcode !== 'string') return null;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let mediaId = BigInt(0);
    const base = BigInt(64);
    const clean = shortcode.trim();
    if (clean.length === 0) return null;
    for (let i = 0; i < clean.length; i++) {
        const idx = alphabet.indexOf(clean[i]);
        if (idx === -1) return null;
        mediaId = mediaId * base + BigInt(idx);
    }
    return mediaId.toString();
}

/**
 * idToShortcode
 * @description Converts numeric media ID to Instagram post shortcode.
 *              Uses BigInt to avoid 64-bit integer precision loss.
 *
 * @param  {String|BigInt} id
 * @return {?String}
 */
export function idToShortcode(id) {
    if (id === null || id === undefined) return null;

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const base = BigInt(64);

    let mediaId;

    try {
        const clean = String(id).trim();
        if (!/^\d+$/.test(clean)) return null;
        mediaId = BigInt(clean);
    } catch {
        return null;
    }

    if (mediaId < 0n) return null;
    if (mediaId === 0n) return alphabet[0];

    let shortcode = '';

    while (mediaId > 0n) {
        const remainder = Number(mediaId % base);
        shortcode = alphabet[remainder] + shortcode;
        mediaId /= base;
    }

    return shortcode;
}

/**
 * getPostImages
 * @description Extract content images from a post container, excluding avatars,
 *              header icons, and tiny thumbnails.
 *
 * @param  {JQuery} $container
 * @return {JQuery}
 */
function getPostImages($container) {
    if (!$container || $container.length === 0) return $();
    return $container.find('img').filter(function () {
        const $img = $(this);

        // 1. Exclude images inside <header>
        if ($img.closest('header').length > 0) return false;

        // 2. Exclude images inside user profile links (e.g. <a href="/username/">)
        const $parentLink = $img.closest('a[href^="/"]');
        if ($parentLink.length > 0) {
            const href = $parentLink.attr('href') || '';
            if (!href.startsWith('/p/') && !href.startsWith('/reel/') && !href.startsWith('/explore/')) {
                return false;
            }
        }

        // 3. Exclude images with alt text indicating avatar/profile picture
        const alt = ($img.attr('alt') || '').toLowerCase();
        if (alt.includes('profile picture') || alt.includes('profil') || alt.includes('avatar')) {
            return false;
        }

        // 4. Exclude typical avatar/thumbnail URL patterns
        const src = $img.attr('src') || this.currentSrc || '';
        if (!src || src.startsWith('data:')) return false;
        if (src.match(/_[sp](\d+)x\1(?!\d)/) || src.includes('/s150x150/') || src.includes('/s320x320/') || src.includes('/s100x100/') || src.includes('/s64x64/')) {
            return false;
        }

        // 5. On-screen rendered dimensions: avatars are small on screen (<= 80px)
        const rect = this.getBoundingClientRect();
        if (rect.width > 0 && rect.width <= 80 && rect.height > 0 && rect.height <= 80) {
            return false;
        }

        // 6. Natural dimensions fallback
        if (this.naturalWidth > 0 && this.naturalWidth <= 64) return false;
        if (this.naturalHeight > 0 && this.naturalHeight <= 64) return false;

        return true;
    });
}

/**
 * getPostVisibleMediaContext
 * @description Resolves the currently visible media resource, candidate URLs,
 *              and candidate media IDs from the post article container, checking
 *              both in-memory cache and persistent media cache before any network call.
 *
 * @param  {JQuery} $article
 * @param  {?String} postPath
 * @return {{ isVideo: Boolean, mediaId: ?String, cachedUrl: ?String, displayUrl: ?String, posterUrl: ?String, candidateIds: String[] }}
 */
function getPostVisibleMediaContext($article, postPath) {
    if (!$article || $article.length === 0) {
        return { isVideo: false, mediaId: null, cachedUrl: null, displayUrl: null, posterUrl: null, candidateIds: [] };
    }

    const postMediaId = shortcodeToId(postPath);
    const candidateIds = [];
    const candidateUrls = [];

    const storedDisplay = $article.data('igHelper_displayResourceURL');
    const storedPoster = $article.data('igHelper_videoThumbnailURL');

    let $activeContainer = $article.find('.button_wrapper').parent();
    if ($activeContainer.length === 0 || $activeContainer.find('img, video').length === 0) {
        $activeContainer = $article;
    }

    // Locate carousel ul and real slides
    const $ul = $article.find('ul[class]').filter(function () {
        return $(this).children('li').length > 0;
    }).first();

    const $slides = ($ul.length > 0)
        ? $ul.children('li').filter(function () {
            const w = this.getBoundingClientRect().width;
            return w > 64 && ($(this).find('img, video').length > 0 || $(this).attr('class'));
        })
        : $();

    if ($slides.length > 0) {
        tagCarouselSlides($article);
        const targetSlideIndex = getVisibleNodeIndex($article);
        const targetPos = String(targetSlideIndex + 1);

        // Match slide by igh-res-index attribute first
        const $matchingSlide = $slides.filter(`[igh-res-index="${targetPos}"]`);
        if ($matchingSlide.length > 0) {
            $activeContainer = $matchingSlide.first();
        } else {
            // Fallback: locate geometrically closest slide to viewport center
            let $viewport = $article.find('.button_wrapper').parent();
            if ($viewport.length === 0 || $viewport.get(0).getBoundingClientRect().width === 0) {
                $viewport = $ul.parent().parent();
            }
            const vpRect = $viewport.length > 0 ? $viewport.get(0).getBoundingClientRect() : null;
            const vpCenter = vpRect && vpRect.width > 0 ? (vpRect.left + vpRect.right) / 2 : (window.innerWidth / 2);

            let closestSlide = null;
            let minDistance = Infinity;

            $slides.each(function () {
                if (this.getBoundingClientRect().width === 0) return;
                const r = this.getBoundingClientRect();
                const c = (r.left + r.right) / 2;
                const d = Math.abs(c - vpCenter);
                if (d < minDistance) {
                    minDistance = d;
                    closestSlide = this;
                }
            });

            if (closestSlide) {
                $activeContainer = $(closestSlide);
            } else if (targetSlideIndex >= 0 && targetSlideIndex < $slides.length) {
                $activeContainer = $slides.eq(targetSlideIndex);
            } else if ($slides.length > 0) {
                $activeContainer = $slides.first();
            }
        }
    }

    // In a carousel, only check the active slide container for video,
    // to prevent other inactive/offscreen video slides in the same post
    // from falsely marking the current photo slide as video.
    const isCarousel = $slides.length > 0 && $activeContainer.is('li');
    const $video = isCarousel
        ? ($activeContainer.find('video').length > 0 ? $activeContainer.find('video').first() : $())
        : ($activeContainer.find('video:visible').length > 0
            ? $activeContainer.find('video:visible').first()
            : ($article.find('video:visible').length > 0
                ? $article.find('video:visible').first()
                : $activeContainer.find('video').first()));

    const isVideo = isCarousel
        ? ($video.length > 0)
        : ($video.length > 0 && ($video.is(':visible') || $activeContainer.is($video.closest('li'))));

    let posterUrl = (isVideo && storedPoster) ? storedPoster : null;
    if ($video.length > 0) {
        const p = $video.attr('poster') || $video.prop('poster');
        if (p) {
            posterUrl = p;
            candidateUrls.push(p);
        }
    }

    const $contentImages = getPostImages($activeContainer);
    let displayUrl = null;

    $contentImages.each(function () {
        const src = $(this).attr('src') || this.currentSrc;
        const srcset = $(this).attr('srcset');
        if (srcset) {
            const firstSrc = srcset.split(',')[0]?.trim().split(' ')[0];
            if (firstSrc) candidateUrls.push(firstSrc);
            const lastSrc = srcset.split(',').at(-1)?.trim().split(' ')[0];
            if (lastSrc && lastSrc !== firstSrc) candidateUrls.push(lastSrc);
        }
        if (src) {
            if (!displayUrl) displayUrl = src;
            candidateUrls.push(src);
        }
    });

    if (!displayUrl && storedDisplay && !isVideo) {
        displayUrl = storedDisplay;
        candidateUrls.push(storedDisplay);
    }

    // Search article ONLY if not a carousel and not a video to avoid grabbing media from other slides
    if (!displayUrl && !isCarousel && !isVideo) {
        getPostImages($article).each(function () {
            const src = $(this).attr('src') || this.currentSrc;
            if (src) {
                if (!displayUrl) displayUrl = src;
                candidateUrls.push(src);
            }
        });
    }

    for (const u of candidateUrls) {
        const mid = mediaIdFromURL(u);
        if (mid && !candidateIds.includes(mid)) {
            candidateIds.push(mid);
        }
    }

    if (postMediaId && !candidateIds.includes(postMediaId)) {
        candidateIds.push(postMediaId);
    }

    let cachedUrl = null;
    let resolvedMediaId = null;

    if (USER_SETTING.CAPTURE_IMAGE_VIA_MEDIA_CACHE) {
        for (const cid of candidateIds) {
            const hit = getImageFromCache(cid);
            if (hit) {
                cachedUrl = hit;
                resolvedMediaId = cid;
                break;
            }
        }
    }

    return {
        isVideo,
        mediaId: resolvedMediaId || candidateIds[0] || postMediaId || null,
        cachedUrl,
        displayUrl: cachedUrl || displayUrl || candidateUrls[0] || null,
        posterUrl: (isVideo && cachedUrl) ? cachedUrl : (posterUrl || null),
        candidateIds
    };
}


export function getPostContextFromButton(target) {
    const $article = $(target).closest('[data-snig="canDownload"], article, div[data-snig]');
    if ($article.length === 0) {
        return { $article: $(), postPath: null };
    }

    const candidates = [];
    const pushHref = (href) => {
        if (typeof href === 'string' && href.trim().length > 0) {
            candidates.push(href.trim());
        }
    };

    pushHref($article.find('a[href^="/p/"]').first().attr('href'));
    pushHref($article.find('a[href^="/reel/"]').first().attr('href'));
    pushHref($article.find('a[href*="/p/"]').first().attr('href'));
    pushHref($article.find('a[href*="/reel/"]').first().attr('href'));

    $article.find('a[role="link"][href], a[href]').each(function () {
        const href = $(this).attr('href') || '';
        if (href.startsWith('/p/') || href.startsWith('/reel/') || href.match(/^\/[^/]+\/(p|reel)\//i)) {
            pushHref(href);
            return false;
        }
    });

    let postPath = null;
    for (const href of candidates) {
        const parts = href.split('/').filter(Boolean);
        const idx = parts.findIndex(p => p === 'p' || p === 'reel');
        if (idx >= 0 && parts[idx + 1]) {
            postPath = parts[idx + 1];
            break;
        }
        if ((href.startsWith('/p/') || href.startsWith('/reel/')) && parts[1]) {
            postPath = parts[1];
            break;
        }
    }

    if (!postPath) {
        const pathParts = location.pathname.replace(/\/$/, '').split('/').filter(Boolean);
        if ((pathParts[0] === 'p' || pathParts[0] === 'reel') && pathParts[1]) {
            postPath = pathParts[1];
        }
        else {
            const routeIndex = pathParts.findIndex(p => p === 'p' || p === 'reel');
            if (routeIndex >= 0 && pathParts[routeIndex + 1]) {
                postPath = pathParts[routeIndex + 1];
            }
        }
    }

    return { $article, postPath };
}
