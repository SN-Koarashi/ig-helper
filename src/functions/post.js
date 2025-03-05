import { USER_SETTING, SVG, state } from "../settings";
import {
    updateLoadingBar, openNewTab, logger,
    toggleVolumeSilder, IG_createDM, IG_setDM, triggerLinkElement,
    openImageViewer
} from "../utils/general";
import { getBlobMedia } from "../utils/api";
import { _i18n } from "../utils/i18n";
/*! ESLINT IMPORT END !*/

/**
 * onReadyMyDW
 * @description Create an event entry point for the download button for the post
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

    // Whether is Instagram dialog?
    if (NoDialog == false) {
        const maxCall = 100;
        let i = 0;
        var repeat = setInterval(() => {
            // section:visible > main > div > div[data-snig="canDownload"] > div > div > div > hr << (single foreground post in page, non-floating // <hr> element here is literally the line beneath poster's username) >>
            // section:visible > main > div > div.xdt5ytf[data-snig="canDownload"] << (former CSS selector for single foreground post in page, non-floating) >>
            // <hr> is much more unique element than "div.xdt5ytf"
            if (i > maxCall || $('article[data-snig="canDownload"], section:visible > main > div > div[data-snig="canDownload"] > div > div > div > hr, div[id^="mount"] > div > div > div.x1n2onr6.x1vjfegm div[data-snig="canDownload"]').length > 0) {
                clearInterval(repeat);

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
 * @description Initialize settings related to the video resources in the post
 *
 * @param  {Object}  $mainElement
 * @return {Void}
 */
export function initPostVideoFunction($mainElement) {
    // Disable video autoplay
    if (USER_SETTING.DISABLE_VIDEO_LOOPING) {
        $mainElement.find('video').each(function () {
            $(this).on('ended', function () {
                if (!$(this).data('loop')) {
                    $(this).attr('data-loop', true);
                    this.pause();
                    logger('(post) Added video event listener #loop');
                }
            });
        });
    }

    // Modify video volume
    if (USER_SETTING.MODIFY_VIDEO_VOLUME) {
        $mainElement.find('video').each(function () {
            $(this).on('play playing', function () {
                if (!$(this).data('modify')) {
                    $(this).attr('data-modify', true);
                    this.volume = state.videoVolume;
                    logger('(post) Added video event listener #modify');
                }
            });
        });
    }

    if (USER_SETTING.HTML5_VIDEO_CONTROL) {
        $mainElement.find('video').each(function () {
            if (!$(this).data('controls')) {
                let $video = $(this);

                logger('(post) Added video html5 contorller #modify');

                if (USER_SETTING.MODIFY_VIDEO_VOLUME) {
                    this.volume = state.videoVolume;

                    $(this).on('loadstart', function () {
                        this.volume = state.videoVolume;
                    });
                }

                // Restore layout to show details interface
                $(this).on('contextmenu', function (e) {
                    e.preventDefault();
                    $video.css('z-index', '-1');
                    $video.removeAttr('controls');
                });

                // Hide layout to show controller
                $(this).parent().find('video + div > div').first().on('contextmenu', function (e) {
                    e.preventDefault();
                    $video.css('z-index', '2');
                    $video.attr('controls', true);
                });

                $(this).on('volumechange', function () {
                    // eslint-disable-next-line no-unused-vars
                    let $element_mute_button = $(this).parent().find('video + div > div').find('button[type="button"], div[role="button"]').filter(function (idx) {
                        // This is mute/unmute's icon
                        return $(this).width() <= 64 && $(this).height() <= 64 && $(this).find('svg > path[d^="M16.636 7.028a1.5"], svg > path[d^="M1.5 13.3c-.8"]').length > 0;
                    });

                    var is_elelment_muted = $element_mute_button.find('svg > path[d^="M16.636"]').length === 0;

                    if (this.muted != is_elelment_muted) {
                        this.volume = state.videoVolume;
                        $element_mute_button?.trigger("click");
                    }

                    if ($(this).attr('data-completed')) {
                        state.videoVolume = this.volume;
                        GM_setValue('G_VIDEO_VOLUME', this.volume);
                    }

                    if (this.volume == state.videoVolume) {
                        $(this).attr('data-completed', true);
                    }
                });

                $(this).css('position', 'absolute');
                $(this).css('z-index', '2');
                $(this).attr('data-controls', true);
                $(this).attr('controls', true);
            }
        });
    }

    var $videos = $mainElement.find('video');
    var $buttonParent = $mainElement.find('video + div > div').first();
    toggleVolumeSilder($videos, $buttonParent, 'post', 'bottom');
};

/**
 * createDownloadButton
 * @description Create a download button in the upper right corner of each post
 *
 * @return {void}
 */
export function createDownloadButton() {
    // Add download icon per each posts
    // eslint-disable-next-line no-unused-vars
    $('article, section:visible > main > div > div > div > div > div > hr').map(function (index) {
        return $(this).is('section:visible > main > div > div > div > div > div > hr') ? $(this).parent().parent().parent().parent()[0] : this;
    }).filter(function () {
        return $(this).height() > 0 && $(this).width() > 0
    })
        .each(function (index) {
            // If it is have not download icon
            // class x1iyjqo2 mean user profile pages post list container
            if (!$(this).attr('data-snig') && !$(this).hasClass('x1iyjqo2') && !$(this).children('article')?.hasClass('x1iyjqo2') && $(this).parents('div#scrollview').length === 0) {
                logger("Found post container", $(this));

                const $mainElement = $(this);
                const tagName = this.tagName;
                const resourceCountSelector = '._acay ._acaz';
                var displayResourceURL;

                // not loop each in single top post
                if (tagName === "DIV" && index != 0) {
                    return;
                }

                const $childElement = $mainElement.children("div").children("div");

                if ($childElement.length === 0) return;

                logger("Found insert point", $childElement);

                // Modify carousel post counter's position to not interfere with our buttons
                if ($mainElement.find('._acay').length > 0) {
                    if ($mainElement.find('._acay + .x24i39r').length > 0) {
                        $mainElement.find('._acay + .x24i39r').css('top', '37px');
                    }

                    const observeNode = $mainElement.find('._acay').first().parent()[0];
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
                const ThumbnailElement = `<div data-ih-locale-title="THUMBNAIL_INTRO" title="${_i18n("THUMBNAIL_INTRO")}" class="IG_THUMBNAIL_MAIN">${SVG.THUMBNAIL}</div>`;
                const ViewerElement = `<div data-ih-locale-title="IMAGE_VIEWER" title="${_i18n("IMAGE_VIEWER")}" class="IG_IMAGE_VIEWER">${SVG.FULLSCREEN}</div>`;

                $childElement.find(".button_wrapper").append(DownloadElement);

                const resource_count = $mainElement.find(resourceCountSelector).length;

                if (resource_count > 1 && USER_SETTING.DIRECT_DOWNLOAD_VISIBLE_RESOURCE && !USER_SETTING.DIRECT_DOWNLOAD_ALL) {
                    const DownloadAllElement = `<div data-ih-locale-title="DW_ALL" title="${_i18n("DW_ALL")}" class="IG_DW_ALL_MAIN">${SVG.DOWNLOAD_ALL}</div>`;
                    $childElement.find(".button_wrapper").append(DownloadAllElement);
                }

                $childElement.find(".button_wrapper").append(NewTabElement);

                setTimeout(() => {
                    // Check if visible post is video
                    if ($childElement.eq((tagName === "DIV") ? 0 : $childElement.length - 2).find('div > ul li._acaz').length === 0) {
                        if ($childElement.find('video').length > 0) {
                            $childElement.find(".button_wrapper").append(ThumbnailElement);
                        }
                        else {
                            displayResourceURL = $mainElement.find('img').filter(function () {
                                return $(this).width() > 200 && $(this).height() > 200
                            }).attr('src');
                            $childElement.find(".button_wrapper").append(ViewerElement);
                        }
                    }
                    else {
                        // eslint-disable-next-line no-unused-vars
                        const checkVideoNodeCallback = (entries, observer) => {
                            entries.forEach((entry) => {
                                //logger(entry);
                                if (entry.isIntersecting) {
                                    var $targetNode = $(entry.target);
                                    $childElement.find('.IG_THUMBNAIL_MAIN')?.remove();
                                    $childElement.find('.IG_IMAGE_VIEWER')?.remove();

                                    // Check if video?
                                    if ($targetNode.find('video').length > 0) {
                                        if ($childElement.find('.IG_THUMBNAIL_MAIN').length === 0) {
                                            $childElement.find(".button_wrapper").append(ThumbnailElement);
                                        }

                                        initPostVideoFunction($mainElement);
                                    }
                                    // is Image
                                    else {
                                        displayResourceURL = $targetNode.find('img').attr('src');
                                        $childElement.find(".button_wrapper").append(ViewerElement);
                                    }
                                }
                            });
                        };

                        const observer_i = new IntersectionObserver(checkVideoNodeCallback, {
                            root: $mainElement.find('div > ul._acay').first().parent().parent().parent()[0],
                            rootMargin: "0px",
                            threshold: 0.1,
                        });

                        // trigger when switching resources
                        // eslint-disable-next-line no-unused-vars
                        const observer = new MutationObserver(function (mutation, owner) {
                            var target = mutation.at(0)?.target;

                            $(target).find('li._acaz').each(function () {
                                observer_i.observe(this);
                            });
                        });

                        // first onload
                        $mainElement.find('div > ul li._acaz').each(function () {
                            observer_i.observe(this);
                        });


                        const element = $childElement.eq((tagName === "DIV") ? 0 : $childElement.length - 2).find('div > ul li._acaz')?.parent()[0];
                        const elementAttr = $childElement.eq((tagName === "DIV") ? 0 : $childElement.length - 2).find('div > ul li._acaz')?.parent().parent()[0];

                        if (element) {
                            observer.observe(element, {
                                childList: true
                            });
                        }

                        if (elementAttr) {
                            observer.observe(elementAttr, {
                                attributes: true
                            });
                        }
                    }
                }, 50);


                $childElement.css('position', 'relative');

                initPostVideoFunction($mainElement);

                state.GL_registerEventList.push({
                    element: this,
                    trigger: [
                        '.IG_THUMBNAIL_MAIN',
                        '.IG_NEWTAB_MAIN',
                        '.IG_DW_ALL_MAIN',
                        '.IG_DW_MAIN',
                        '.IG_IMAGE_VIEWER'
                    ]
                });

                $(this).on('click', '.IG_IMAGE_VIEWER', function () {
                    if (displayResourceURL != null) {
                        openImageViewer(displayResourceURL);
                    }
                    else {
                        alert("Cannot find resource url.");
                    }
                });

                $(this).on('click', '.IG_THUMBNAIL_MAIN', function () {
                    updateLoadingBar(true);

                    state.GL_username = $mainElement.attr('data-username');
                    state.GL_postPath = location.pathname.replace(/\/$/, '').split('/').at(-1) || $mainElement.find('a[href^="/p/"]').first().attr("href").split("/").at(2) || $(this).parent().parent().parent().children("div:last-child").children("div").children("div:last-child").find('a[href^="/p/"]').last().attr("href").split("/").at(2);

                    var index = getVisibleNodeIndex($mainElement);

                    IG_createDM(true, false);

                    createMediaListDOM(state.GL_postPath, ".IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY", "").then(() => {
                        let checkBlob = setInterval(() => {
                            if ($('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY a').length > 0) {
                                clearInterval(checkBlob);
                                var $videoThumbnail = $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY a[data-globalindex="' + (index + 1) + '"]')?.parent().find('.videoThumbnail')?.first();

                                if ($videoThumbnail != null && $videoThumbnail.length > 0) {
                                    $videoThumbnail.trigger("click");
                                }
                                else {
                                    alert('Can not find thumbnail url.');
                                }

                                updateLoadingBar(false);
                                $('.IG_POPUP_DIG').remove();
                            }
                        }, 250);
                    });
                });

                $(this).on('click', '.IG_NEWTAB_MAIN', function () {
                    updateLoadingBar(true);

                    state.GL_username = $mainElement.attr('data-username');
                    state.GL_postPath = location.pathname.replace(/\/$/, '').split('/').at(-1) || $mainElement.find('a[href^="/p/"]').first().attr("href").split("/").at(2) || $(this).parent().parent().parent().children("div:last-child").children("div").children("div:last-child").find('a[href^="/p/"]').last().attr("href").split("/").at(2);

                    var index = getVisibleNodeIndex($mainElement);

                    IG_createDM(true, false);

                    createMediaListDOM(state.GL_postPath, ".IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY", "").then(() => {
                        let checkBlob = setInterval(() => {
                            if ($('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY a').length > 0) {
                                clearInterval(checkBlob);
                                var $linkElement = $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY a[data-globalindex="' + (index + 1) + '"]');

                                if (USER_SETTING.FORCE_RESOURCE_VIA_MEDIA && USER_SETTING.NEW_TAB_ALWAYS_FORCE_MEDIA_IN_POST) {
                                    triggerLinkElement($linkElement.first()[0], true);
                                }
                                else {
                                    let href = $linkElement?.attr('data-href');
                                    if (href) {
                                        // replace https://instagram.ftpe8-2.fna.fbcdn.net/ to https://scontent.cdninstagram.com/ becase of same origin policy (some video)
                                        var urlObj = new URL(href);
                                        urlObj.host = 'scontent.cdninstagram.com';

                                        openNewTab(urlObj.href);
                                    }
                                    else {
                                        alert('Can not find open tab url.');
                                    }
                                }

                                updateLoadingBar(false);
                                $('.IG_POPUP_DIG').remove();
                            }
                        }, 250);
                    });
                });

                // Running if user click the download all icon
                $(this).on('click', '.IG_DW_ALL_MAIN', async function () {
                    state.GL_username = $mainElement.attr('data-username');
                    state.GL_postPath = location.pathname.replace(/\/$/, '').split('/').at(-1) || $mainElement.find('a[href^="/p/"]').first().attr("href").split("/").at(2) || $(this).parent().parent().parent().children("div:last-child").children("div").children("div:last-child").find('a[href^="/p/"]').last().attr("href").split("/").at(2);

                    // Create element that download dailog
                    IG_createDM(USER_SETTING.DIRECT_DOWNLOAD_ALL, true);

                    $("#article-id").html(`<a href="https://www.instagram.com/p/${state.GL_postPath}">${state.GL_postPath}</a>`);

                    $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY a').each(function () {
                        $(this).wrap('<div></div>');
                        $(this).before('<label class="inner_box_wrapper"><input class="inner_box" type="checkbox"><span></span></label>');
                        $(this).after(`<div data-ih-locale-title="NEW_TAB" title="${_i18n("NEW_TAB")}" class="newTab">${SVG.NEW_TAB}</div>`);

                        if ($(this).attr('data-name') == 'video') {
                            $(this).after(`<div data-ih-locale-title="THUMBNAIL_INTRO" title="${_i18n("THUMBNAIL_INTRO")}" class="videoThumbnail">${SVG.THUMBNAIL}</div>`);
                        }
                    });


                    createMediaListDOM(state.GL_postPath, ".IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY", _i18n("LOAD_BLOB_MULTIPLE")).then(() => {
                        let checkBlob = setInterval(() => {
                            if ($('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY a').length > 0) {
                                clearInterval(checkBlob);
                                $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY a').each(function () {
                                    $(this).trigger("click");
                                });

                                $('.IG_POPUP_DIG').remove();
                            }
                        }, 250);
                    });
                });

                // Running if user click the download icon
                $(this).on('click', '.IG_DW_MAIN', async function () {
                    state.GL_username = $mainElement.attr('data-username');
                    state.GL_postPath = location.pathname.replace(/\/$/, '').split('/').at(-1) || $mainElement.find('a[href^="/p/"]').first().attr("href").split("/").at(2) || $(this).parent().parent().parent().children("div:last-child").children("div").children("div:last-child").find('a[href^="/p/"]').last().attr("href").split("/").at(2);

                    // Create element that download dailog
                    IG_createDM(USER_SETTING.DIRECT_DOWNLOAD_ALL, true);

                    $("#article-id").html(`<a href="https://www.instagram.com/p/${state.GL_postPath}">${state.GL_postPath}</a>`);

                    if (USER_SETTING.DIRECT_DOWNLOAD_VISIBLE_RESOURCE) {
                        updateLoadingBar(true);
                        IG_setDM(true);

                        var index = getVisibleNodeIndex($(this).parent().parent().parent());

                        createMediaListDOM(state.GL_postPath, ".IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY", "").then(() => {
                            let checkBlob = setInterval(() => {
                                if ($('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY a').length > 0) {
                                    clearInterval(checkBlob);
                                    var href = $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY a[data-globalindex="' + (index + 1) + '"]')?.attr('data-href');

                                    if (href) {
                                        updateLoadingBar(false);
                                        $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY a[data-globalindex="' + (index + 1) + '"]')?.trigger("click");
                                    }
                                    else {
                                        alert('Can not find download url.');
                                    }

                                    $('.IG_POPUP_DIG').remove();
                                }
                            }, 250);
                        });

                        return;
                    }

                    if (!USER_SETTING.DIRECT_DOWNLOAD_ALL) {
                        // Find video/image element and add the download icon
                        var s = 0;
                        var multiple = $(this).parent().parent().find(resourceCountSelector).length;
                        var blob = USER_SETTING.FORCE_FETCH_ALL_RESOURCES;
                        var publish_time = new Date($(this).parent().parent().find('a[href^="/p/"] time[datetime]').first().attr('datetime')).getTime();

                        // If posts have more than one images or videos.
                        if (multiple) {
                            $(this).parent().parent().find(resourceCountSelector).each(function () {
                                let element_videos = $(this).parent().parent().parent().find('video');
                                //if(element_videos && element_videos.attr('src') && element_videos.attr('src').match(/^blob:/ig)){
                                if (element_videos && element_videos.attr('src')) {
                                    blob = true;
                                }
                            });


                            if (blob || USER_SETTING.FORCE_RESOURCE_VIA_MEDIA) {
                                createMediaListDOM(state.GL_postPath, ".IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY", _i18n("LOAD_BLOB_MULTIPLE"));
                            }
                            else {
                                $(this).parent().parent().find(resourceCountSelector).each(function () {
                                    s++;
                                    let element_videos = $(this).find('video');
                                    let element_images = $(this).find('._aagv img');
                                    let imgLink = (element_images.attr('srcset')) ? element_images.attr('srcset').split(" ")[0] : element_images.attr('src');

                                    if (element_videos && element_videos.attr('src')) {
                                        blob = true;
                                    }
                                    if (element_images && imgLink) {
                                        $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY').append(`<a datetime="${publish_time}" data-needed="direct" data-path="${state.GL_postPath}" data-name="photo" data-type="jpg" data-globalIndex="${s}" href="javascript:;" data-href="${imgLink}"><img width="100" src="${imgLink}" /><br/>- <span data-ih-locale="IMG">${_i18n("IMG")}</span> ${s} -</a>`);
                                    }

                                });

                                if (blob) {
                                    createMediaListDOM(state.GL_postPath, ".IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY", _i18n("LOAD_BLOB_RELOAD"));
                                }
                            }
                        }
                        else {
                            if (USER_SETTING.FORCE_RESOURCE_VIA_MEDIA) {
                                createMediaListDOM(state.GL_postPath, ".IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY", _i18n("LOAD_BLOB_MULTIPLE"));
                            }
                            else {
                                s++;
                                let element_videos = $(this).parent().parent().parent().find('video');
                                let element_images = $(this).parent().parent().parent().find('._aagv img');
                                let imgLink = (element_images.attr('srcset')) ? element_images.attr('srcset').split(" ")[0] : element_images.attr('src');


                                if (element_videos && element_videos.attr('src')) {
                                    createMediaListDOM(state.GL_postPath, ".IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY", _i18n("LOAD_BLOB_ONE"));
                                }
                                if (element_images && imgLink) {
                                    $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY').append(`<a datetime="${publish_time}" data-needed="direct" data-path="${state.GL_postPath}" data-name="photo" data-type="jpg" data-globalIndex="${s}" href="javascript:;" href="" data-href="${imgLink}"><img width="100" src="${imgLink}" /><br/>- <span data-ih-locale="IMG">${_i18n("IMG")}</span> ${s} -</a>`);
                                }
                            }
                        }
                    }

                    $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY a').each(function () {
                        $(this).wrap('<div></div>');
                        $(this).before('<label class="inner_box_wrapper"><input class="inner_box" type="checkbox"><span></span></label>');
                        $(this).after(`<div data-ih-locale-title="NEW_TAB" title="${_i18n("NEW_TAB")}" class="newTab">${SVG.NEW_TAB}</div>`);

                        if ($(this).attr('data-name') == 'video') {
                            $(this).after(`<div data-ih-locale-title="THUMBNAIL_INTRO" title="${_i18n("THUMBNAIL_INTRO")}" class="videoThumbnail">${SVG.THUMBNAIL}</div>`);
                        }
                    });

                    if (USER_SETTING.DIRECT_DOWNLOAD_ALL) {
                        createMediaListDOM(state.GL_postPath, ".IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY", _i18n("LOAD_BLOB_MULTIPLE")).then(() => {
                            let checkBlob = setInterval(() => {
                                if ($('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY a').length > 0) {
                                    clearInterval(checkBlob);
                                    $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY a').each(function () {
                                        $(this).trigger("click");
                                    });

                                    $('.IG_POPUP_DIG').remove();
                                }
                            }, 250);
                        });
                    }
                });

                // Add the mark that download is ready
                var username = $(this).find("header > div:last-child > div:first-child span a").first().text() || $(this).find('a[href^="/"]').filter(function () {
                    return $(this)?.text()?.length > 0;
                }).first().text();

                $(this).attr('data-snig', 'canDownload');
                $(this).attr('data-username', username);
            }
        });
}


/**
 * filterResourceData
 * @description Standardized resource object format
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
 * @description Create a list of media elements from post URLs
 *
 * @param  {String}  postURL
 * @param  {String}  selector - Use CSS element selectors to choose where it appears.
 * @param  {String}  message - i18n display loading message
 * @return {void}
 */
export async function createMediaListDOM(postURL, selector, message) {
    try {
        $(`${selector} a`).remove();
        $(selector).append('<p id="_SNLOAD">' + message + '</p>');
        let result = await getBlobMedia(postURL);
        let resource = filterResourceData(result.data);

        if (result.type === 'query_hash') {
            let idx = 1;

            // GraphVideo
            if (resource.__typename == "GraphVideo" && resource.video_url) {
                $(selector).append(`<a media-id="${resource.id}" datetime="${resource.taken_at_timestamp}" data-blob="true" data-needed="direct" data-path="${resource.shortcode}" data-name="video" data-type="mp4" data-username="${resource.owner.username}" data-globalIndex="${idx}" href="javascript:;" data-href="${resource.video_url}"><img width="100" src="${resource.display_resources[1].src}" /><br/>- <span data-ih-locale="VID">${_i18n("VID")}</span> ${idx} -</a>`);
                idx++;
            }
            // GraphImage
            if (resource.__typename == "GraphImage") {
                $(selector).append(`<a media-id="${resource.id}" datetime="${resource.taken_at_timestamp}" data-blob="true" data-needed="direct" data-path="${resource.shortcode}" data-name="photo" data-type="jpg" data-username="${resource.owner.username}" data-globalIndex="${idx}" href="javascript:;" data-href="${resource.display_resources[resource.display_resources.length - 1].src}"><img width="100" src="${resource.display_resources[1].src}" /><br/>- <span data-ih-locale="IMG">${_i18n("IMG")}</span> ${idx} -</a>`);
                idx++;
            }
            // GraphSidecar
            if (resource.__typename == "GraphSidecar" && resource.edge_sidecar_to_children) {
                for (let e of resource.edge_sidecar_to_children.edges) {
                    if (e.node.__typename == "GraphVideo") {
                        $(selector).append(`<a media-id="${e.node.id}" datetime="${resource.taken_at_timestamp}" data-blob="true" data-needed="direct" data-path="${resource.shortcode}" data-name="video" data-type="mp4" data-username="${resource.owner.username}" data-globalIndex="${idx}" href="javascript:;" data-href="${e.node.video_url}"><img width="100" src="${e.node.display_resources[1].src}" /><br/>- <span data-ih-locale-title="VID">${_i18n("VID")}</span> ${idx} -</a>`);
                    }

                    if (e.node.__typename == "GraphImage") {
                        $(selector).append(`<a media-id="${e.node.id}" datetime="${resource.taken_at_timestamp}" data-blob="true" data-needed="direct" data-path="${resource.shortcode}" data-name="photo" data-type="jpg" data-username="${resource.owner.username}" data-globalIndex="${idx}" href="javascript:;" data-href="${e.node.display_resources[e.node.display_resources.length - 1].src}"><img width="100" src="${e.node.display_resources[1].src}" /><br/>- <span data-ih-locale="IMG">${_i18n("IMG")}</span> ${idx} -</a>`);
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

                        $(selector).append(`<a media-id="${mda.pk}" datetime="${mda.taken_at}" data-blob="true" data-needed="direct" data-path="${resource.code}" data-name="photo" data-type="jpg" data-username="${resource.owner.username}" data-globalIndex="${idx}" href="javascript:;" data-href="${mda.image_versions2.candidates[0].url}"><img width="100" src="${mda.image_versions2.candidates[0].url}" /><br/>- <span data-ih-locale="IMG">${_i18n("IMG")}</span> ${idx} -</a>`);
                    }
                    // Video
                    else {
                        $(selector).append(`<a media-id="${mda.pk}" datetime="${mda.taken_at}" data-blob="true" data-needed="direct" data-path="${resource.code}" data-name="video" data-type="mp4" data-username="${resource.owner.username}" data-globalIndex="${idx}" href="javascript:;" data-href="${mda.video_versions[0].url}"><img width="100" src="${mda.image_versions2.candidates[0].url}" /><br/>- <span data-ih-locale="VID">${_i18n("VID")}</span> ${idx} -</a>`);
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

                    $(selector).append(`<a media-id="${resource.pk}" datetime="${resource.taken_at}" data-blob="true" data-needed="direct" data-path="${resource.code}" data-name="photo" data-type="jpg" data-username="${resource.owner.username}" data-globalIndex="${idx}" href="javascript:;" data-href="${resource.image_versions2.candidates[0].url}"><img width="100" src="${resource.image_versions2.candidates[0].url}" /><br/>- <span data-ih-locale="IMG">${_i18n("IMG")}</span> ${idx} -</a>`);
                }
                // Video
                else {
                    $(selector).append(`<a media-id="${resource.pk}" datetime="${resource.taken_at}" data-blob="true" data-needed="direct" data-path="${resource.code}" data-name="video" data-type="mp4" data-username="${resource.owner.username}" data-globalIndex="${idx}" href="javascript:;" data-href="${resource.video_versions[0].url}"><img width="100" src="${resource.image_versions2.candidates[0].url}" /><br/>- <span data-ih-locale="VID">${_i18n("VID")}</span> ${idx} -</a>`);
                }
            }
        }

        $("#_SNLOAD").remove();
        $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_BODY a').each(function () {
            $(this).wrap('<div></div>');
            $(this).before('<label class="inner_box_wrapper"><input class="inner_box" type="checkbox"><span></span></label>');
            $(this).after(`<div data-ih-locale-title="NEW_TAB" title="${_i18n("NEW_TAB")}" class="newTab">${SVG.NEW_TAB}</div>`);

            if ($(this).attr('data-name') == 'video') {
                $(this).after(`<div data-ih-locale-title="THUMBNAIL_INTRO" title="${_i18n("THUMBNAIL_INTRO")}" class="videoThumbnail">${SVG.THUMBNAIL}</div>`);
            }
        });
    }
    catch (err) {
        logger('createMediaListDOM', err);
    };
}


/**
 * getVisibleNodeIndex
 * @description Get element visible node
 *
 * @param  {Object}  $main
 * @return {Integer}
 */
export function getVisibleNodeIndex($main) {
    var index = 0;
    // homepage classList
    var $dot = $main.find('.x1iyjqo2 > div > div:last-child > div');

    // dialog classList, main top classList
    if ($dot == null || !$dot.hasClass('_acnb')) {
        $dot = $main.find('._aatk > div > div:last-child').eq(0).children('div');
    }

    $dot.filter('._acnb').each(function (sIndex) {
        if ($(this).hasClass('_acnf')) {
            index = sIndex;
        }
    });

    return index;
}