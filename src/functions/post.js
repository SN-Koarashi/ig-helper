import { USER_SETTING, SVG, state, $body, resourceCountSelector } from "../settings";
import {
    updateLoadingBar, openNewTab, logger,
    toggleVolumeSilder, triggerLinkElement,
    updatePopupSelectionSummary,
    replaceSameOriginHost,
    setDownloadProgress,
    triggerReactClickHandler
} from "../utils/general";
import { getBlobMedia } from "../utils/api";
import { _i18n } from "../utils/i18n";
import { openImageViewer } from "../utils/image_viewer";
import { IG_createDM, IG_setDM } from "../utils/dialog";
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
            return $(this).find('.IG_DW_MAIN').length === 0
        }).removeAttr('data-snig');
    }

    clearInterval(state.GL_repeat);
    state.GL_repeat = null;

    // Whether is Instagram dialog?
    if (NoDialog == false) {
        const maxCall = 100;
        let i = 0;
        state.GL_repeat = setInterval(() => {
            // section:visible > main > div > div[data-snig="canDownload"] > div > div > div > hr << (single foreground post in page, non-floating // <hr> element here is literally the line beneath poster's username) >>
            // section:visible > main > div > div.xdt5ytf[data-snig="canDownload"] << (former CSS selector for single foreground post in page, non-floating) >>
            // <hr> is much more unique element than "div.xdt5ytf"
            if (i > maxCall || $(`article[data-snig="canDownload"],
                section:visible > main > div > div[data-snig="canDownload"] > div > div > div > hr,
                div[id^="mount"] div div div.x1n2onr6.x1vjfegm div[data-snig="canDownload"]
            `).length > 0) {
                clearInterval(state.GL_repeat);
                state.GL_repeat = null;

                if (i > maxCall) {
                    //alert('Trying to call button creation method reached to maximum try times. If you want to re-register method, please open script menu and press "Reload Script" button or hotkey "R" to reload main timer.');
                    console.warn('onReadyMyDW() Timer', 'maximum number of repetitions reached, terminated');
                }
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
            $(this).on('ended', function () {
                const $vid = $(this);
                if (!$vid.data('loop')) {
                    $vid.data('loop', true);
                    this.pause();
                    logger('(post) Added video event listener #loop');
                }
            });
        });
    }

    // Modify video volume
    if (USER_SETTING.MODIFY_VIDEO_VOLUME) {
        $videos.each(function () {
            $(this).on('play playing', function () {
                const $vid = $(this);
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
    $('article, section:visible > main > div > div > div > div > div > hr').map(function (index) {
        return $(this).is('section:visible > main > div > div > div > div > div > hr') ? $(this).parent().parent().parent().parent()[0] : this;
    }).filter(function () {
        const $this = $(this);
        return $this.height() > 0 && $this.width() > 0
    })
        .each(function (index) {
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
                // OPTIMIZATION: cache repeated ._acay lookup
                const $acay = $mainElement.find('._acay');
                if ($acay.length > 0) {
                    const $acayX24 = $mainElement.find('._acay + .x24i39r');
                    if ($acayX24.length > 0) {
                        $acayX24.css('top', '37px');
                    }

                    const observeNode = $acay.first().parent()[0];
                    var observer = new MutationObserver(function () {
                        $mainElement.find('._acay + .x24i39r').css('top', '37px');
                    });

                    observer.observe(observeNode, {
                        childList: true
                    });
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
                    const $this = $(this);
                    return $this.width() > 100 && $this.height() > 100;
                }).first();

                let $isNewPostStyleLayout = $resourceLayout.find(`a[role="link"][tabindex="0"][href^="/"]`).filter(function () {
                    const href = $(this).attr('href');
                    return !href.startsWith("/p/") && !href.startsWith("/reels/");
                }).length > 0;

                // Make sure the button wrapper doesn't cover the "More Options" button.
                if ($isNewPostStyleLayout) {
                    $buttonWrapper.css('top', '45px');
                }

                setTimeout(() => {
                    // eslint-disable-next-line no-unused-vars
                    const checkNodeCallback = (entries, observer) => {
                        entries.forEach((entry) => {
                            if (entry.isIntersecting) {
                                var $targetNode = $(entry.target);
                                // OPTIMIZATION: combined remove selector instead of 2 separate
                                $childElement.find('.IG_THUMBNAIL_MAIN, .IG_IMAGE_VIEWER').remove();

                                // Check if video?
                                if ($targetNode.find('video').length > 0) {
                                    // FIX: clear any stale image URL when the visible item is a video
                                    $mainElement.removeData('igHelper_displayResourceURL');

                                    if ($childElement.find('.IG_THUMBNAIL_MAIN').length === 0) {
                                        $childElement.find(".button_wrapper").append(ThumbnailElement);
                                    }

                                    initPostVideoFunction($mainElement);
                                }
                                // is Image
                                else {
                                    const imgSrc = $targetNode.find('img').attr('src');
                                    $mainElement.data('igHelper_displayResourceURL', imgSrc);

                                    $childElement.find(".button_wrapper").append(ViewerElement);
                                }
                            }
                        });
                    };

                    const observer_i = new IntersectionObserver(checkNodeCallback, {
                        root: $childElement.find('.button_wrapper').parent()[0],
                        rootMargin: "0px",
                        threshold: 0.1,
                    });

                    // trigger when switching resources
                    // eslint-disable-next-line no-unused-vars
                    const observer = new MutationObserver(function (mutation, owner) {
                        var target = mutation.at(0)?.target;
                        observer_i.disconnect();

                        $(target).find('li').each(function () {
                            const $t = $(target);
                            if ($t.find('video').length > 0 || $t.find('img').length > 0) {
                                observer_i.observe(this);
                            }
                        });
                    });

                    let $triggeredTarget = null;
                    // first onload
                    $childElement.find('.button_wrapper').parent().find('ul li, div[role="button"] > div, div[class] > div').each(function () {
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
                            // ignore the image without alt attribute, 
                            // because it is usually used for video thumbnail
                            if (
                                $targetNode.get(0).tagName === "IMG" &&
                                $targetNode.attr('alt')?.length == 0
                            ) {
                                return;
                            }

                            $triggeredTarget = $targetNode;
                            observer_i.observe(this);
                        }
                    });

                    const $bwParent = $childElement.find('.button_wrapper').parent();
                    const listRoot =
                        $bwParent.find('ul li, div[role="button"] > div').first().parent()[0] ||
                        $bwParent.find('ul').first()[0];

                    if (listRoot) {
                        observer.observe(listRoot, {
                            attributes: true,
                            childList: true,
                        });
                    } else {
                        initPostVideoFunction($mainElement);
                        logger("Cannot find resource list root element, thumbnail and viewer button may not work.");
                    }

                }, 50);

                $childElement.css('position', 'relative');

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
        const { $article } = getPostContextFromButton(this);
        let url = $article.data('igHelper_displayResourceURL');

        if (!url) {
            url = $article.find('img:visible').filter(function () {
                const $img = $(this);
                return (($img.attr('alt') || '').length > 0) && (($img.attr('src') || '').length > 0);
            }).first().attr('src');
        }

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

            if (USER_SETTING.FORCE_RESOURCE_VIA_MEDIA && USER_SETTING.NEW_TAB_ALWAYS_FORCE_MEDIA_IN_POST) {
                triggerLinkElement($linkElement.first()[0], true);
            }
            else {
                const href = $linkElement.data('href');
                if (href) {
                    openNewTab(replaceSameOriginHost(href));
                }
                else {
                    alert('Cannot find open tab URL.');
                }
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

            IG_createDM(USER_SETTING.DIRECT_DOWNLOAD_ALL, true);
            $("#article-id").html(`<a href="https://www.instagram.com/p/${state.GL_postPath}">${state.GL_postPath}</a>`);

            if (USER_SETTING.DIRECT_DOWNLOAD_VISIBLE_RESOURCE) {
                updateLoadingBar(true);
                IG_setDM(true);

                try {
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

            if (!USER_SETTING.DIRECT_DOWNLOAD_ALL) {
                let s = 0;
                const $resourceItems = $article.find(resourceCountSelector);
                let multiple = $resourceItems.length;
                let blob = USER_SETTING.FORCE_FETCH_ALL_RESOURCES;
                const publish_time = new Date(
                    $article.find('a[href] time[datetime]').filter(function () {
                        let href = $(this).parents("a[href]").attr("href");
                        return href?.startsWith("/p/") || href?.match(/\/([\w.\-_]+)\/(p|reel)\//ig) != null;
                    }).first().attr('datetime')
                ).getTime();

                if (multiple) {
                    $resourceItems.each(function () {
                        let element_videos = $(this).parent().parent().parent().find('video');
                        if (element_videos && element_videos.attr('src')) {
                            blob = true;
                        }
                    });

                    if (blob || USER_SETTING.FORCE_RESOURCE_VIA_MEDIA) {
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
                            let element_images = $this.find('._aagv img');
                            let imgLink = (element_images.attr('srcset')) ? element_images.attr('srcset').split(" ")[0] : element_images.attr('src');

                            if (element_videos && element_videos.attr('src')) {
                                blob = true;
                            }
                            if (element_images && imgLink) {
                                $popupBody.append(`<a datetime="${publish_time}" data-needed="direct" data-path="${state.GL_postPath}" data-name="photo" data-type="jpg" data-username="${state.GL_username || ''}" data-globalIndex="${s}" href="javascript:;" data-href="${imgLink}"><img width="100" src="${imgLink}" /><br/>- <span data-ih-locale="IMG">${_i18n("IMG")}</span> ${s} -</a>`);
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
                    if (USER_SETTING.FORCE_RESOURCE_VIA_MEDIA) {
                        await createMediaListDOM(
                            state.GL_postPath,
                            ".IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY",
                            _i18n("LOAD_BLOB_MULTIPLE")
                        );
                    }
                    else {
                        s++;
                        let element_videos = $article.find('video');
                        let element_images = $article.find('._aagv img');
                        let imgLink = (element_images.attr('srcset')) ? element_images.attr('srcset').split(" ")[0] : element_images.attr('src');

                        if (element_videos && element_videos.attr('src')) {
                            await createMediaListDOM(
                                state.GL_postPath,
                                ".IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY",
                                _i18n("LOAD_BLOB_ONE")
                            );
                        }
                        if (element_images && imgLink) {
                            $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY').append(`<a datetime="${publish_time}" data-needed="direct" data-path="${state.GL_postPath}" data-name="photo" data-type="jpg" data-username="${state.GL_username || ''}" data-globalIndex="${s}" href="javascript:;" data-href="${imgLink}"><img width="100" src="${imgLink}" /><br/>- <span data-ih-locale="IMG">${_i18n("IMG")}</span> ${s} -</a>`);
                        }
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
            });

            if (USER_SETTING.DIRECT_DOWNLOAD_ALL) {
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
        let result = await getBlobMedia(postURL);
        let resource = filterResourceData(result.data);

        if (result.type === 'query_hash') {
            let idx = 1;

            // GraphVideo
            if (resource.__typename == "GraphVideo" && resource.video_url) {
                $target.append(`<a media-id="${resource.id}" datetime="${resource.taken_at_timestamp}" data-blob="true" data-needed="direct" data-path="${resource.shortcode}" data-name="video" data-type="mp4" data-username="${resource.owner.username}" data-globalIndex="${idx}" href="javascript:;" data-href="${resource.video_url}"><img width="100" src="${resource.display_resources[1].src}" /><br/>- <span data-ih-locale="VID">${_i18n("VID")}</span> ${idx} -</a>`);
                idx++;

                if (resource.video_dash_manifest) {
                    state.GL_mediaDataCache[resource.id] = resource;
                }
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
                        if (e.node.video_dash_manifest) {
                            state.GL_mediaDataCache[e.node.id] = e.node;
                        }
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

                        $target.append(`<a media-id="${mda.pk}" datetime="${mda.taken_at}" data-blob="true" data-needed="direct" data-path="${resource.code}" data-name="photo" data-type="jpg" data-username="${resource.owner.username}" data-globalIndex="${idx}" href="javascript:;" data-href="${mda.image_versions2.candidates[0].url}"><img width="100" src="${mda.image_versions2.candidates[0].url}" /><br/>- <span data-ih-locale="IMG">${_i18n("IMG")}</span> ${idx} -</a>`);
                    }
                    // Video
                    else {
                        $target.append(`<a media-id="${mda.pk}" datetime="${mda.taken_at}" data-blob="true" data-needed="direct" data-path="${resource.code}" data-name="video" data-type="mp4" data-username="${resource.owner.username}" data-globalIndex="${idx}" href="javascript:;" data-href="${mda.video_versions[0].url}"><img width="100" src="${mda.image_versions2.candidates[0].url}" /><br/>- <span data-ih-locale="VID">${_i18n("VID")}</span> ${idx} -</a>`);
                        if (mda.video_dash_manifest) {
                            state.GL_mediaDataCache[mda.pk] = mda;
                        }
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

                    $target.append(`<a media-id="${resource.pk}" datetime="${resource.taken_at}" data-blob="true" data-needed="direct" data-path="${resource.code}" data-name="photo" data-type="jpg" data-username="${resource.owner.username}" data-globalIndex="${idx}" href="javascript:;" data-href="${resource.image_versions2.candidates[0].url}"><img width="100" src="${resource.image_versions2.candidates[0].url}" /><br/>- <span data-ih-locale="IMG">${_i18n("IMG")}</span> ${idx} -</a>`);
                }
                // Video
                else {
                    if (resource.video_dash_manifest) {
                        state.GL_mediaDataCache[resource.pk] = resource;
                    }
                    $target.append(`<a media-id="${resource.pk}" datetime="${resource.taken_at}" data-blob="true" data-needed="direct" data-path="${resource.code}" data-name="video" data-type="mp4" data-username="${resource.owner.username}" data-globalIndex="${idx}" href="javascript:;" data-href="${resource.video_versions[0].url}"><img width="100" src="${resource.image_versions2.candidates[0].url}" /><br/>- <span data-ih-locale="VID">${_i18n("VID")}</span> ${idx} -</a>`);
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
 * getVisibleNodeIndex
 * @description Get element visible node.
 *
 * @param  {Object}  $main
 * @return {Integer}
 */
export function getVisibleNodeIndex($main) {
    // 1. Prioritize the most efficient rule: check if the "back" button exists.
    const hasBackButton = $main.find('button._afxv._al46._al47').length > 0;

    // 2. If the "back" button does not exist, it is determined to be the first image, and the result is returned immediately.
    if (!hasBackButton) {
        return 0;
    }
    var index = 0;

    // 3. If the code execution reaches here, it means it is not the first image, and the final geometric algorithm is enabled.

    // a. Locate the "viewport" element: it is the grandparent of ul
    // "_acay" class of <ul> has been removed by Instagram; [class] added to <ul> to get much lesser matches in page
    // The parent of the parent of ul[class] always has the attributes "role"
    // '*:not([data-pagelet])>*:not([role]):not([data-pagelet])>*>*>*[role]>*>ul[class]' is useful for avoiding the homepage stories section, account highlights section, and notes section in Messages.
    const $viewport = $main.find('*:not([data-pagelet])>*:not([role]):not([data-pagelet])>*>*>*[role]>*>ul[class]').parent().parent('[role]');

    if ($viewport.length > 0) {
        const viewportRect = $viewport.get(0).getBoundingClientRect();
        // b. Get itemWidth: directly use the width of the viewport, this method is the most generalizable
        const itemWidth = viewportRect.width;

        // Must successfully obtain the width to continue, to prevent division by zero errors
        if (itemWidth > 0) {
            // STAGE 1: Visual positioning, find the currently displayed <li> element
            // "_acaz" class of <li> has been removed by Instagram; [class] added to <li> to get much lesser matches in page
            const viewportRight = viewportRect.right;
            let closestSlideElement = null;
            let minDistance = Infinity;

            $main.find('li[class]').each(function () {
                if (this.getBoundingClientRect().width === 0) return;

                const slideRect = this.getBoundingClientRect();
                const distance = Math.abs(slideRect.right - viewportRight);

                if (distance < minDistance) {
                    minDistance = distance;
                    closestSlideElement = this;
                }
            });

            // STAGE 2: Index calculation, use the found <li> and itemWidth to calculate the global index
            if (closestSlideElement) {
                const style = $(closestSlideElement).attr('style');
                if (style && style.includes('translateX')) {
                    const offsetMatch = style.match(/translateX\(([^p]+)px\)/);
                    if (offsetMatch && offsetMatch[1]) {
                        const totalOffset = parseFloat(offsetMatch[1]);
                        // c. Execute the final calculation formula
                        index = Math.round(totalOffset / itemWidth);
                    }
                }
            }
        }
    }
    return index;
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
 * getPostContextFromButton
 * @description Resolve the current post container and shortcode safely across
 * homepage, dialog, /p/, /reel/, and changing Instagram layouts.
 *
 * @param {HTMLElement|JQuery} target
 * @return {{ $article: JQuery<HTMLElement>, postPath: (string|null) }}
 */
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