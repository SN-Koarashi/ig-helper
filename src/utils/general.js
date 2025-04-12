import { SVG, USER_SETTING, state, locale_manifest, CHILD_NODES } from "../settings";
import { _i18n } from "./i18n";
import { getPostOwner, getMediaInfo } from "./api";
/*! ESLINT IMPORT END !*/

/**
 * getStoryId
 * @description Obtain the media id through the resource URL.
 *
 * @param  {string}  url
 * @return {string}
 */
export function getStoryId(url) {
    let obj = new URL(url);
    let base64 = obj?.searchParams?.get('ig_cache_key')?.split('.').at(0);
    if (base64) {
        return atob(base64);
    }
    else {
        return null;
    }
}

/**
 * getAppID
 * @description Get Instagram App ID
 *
 * @return {?integer}
 */
export function getAppID() {
    let result = null;
    $('script[type="application/json"]').each(function () {
        const regexp = /"APP_ID":"([0-9]+)"/ig;
        const matcher = $(this).text().match(regexp);
        if (matcher != null && result == null) {
            result = [...$(this).text().matchAll(regexp)];
        }
    })

    return (result) ? result.at(0).at(-1) : null;
}


/**
 * updateLoadingBar
 * @description Update loading state
 *
 * @param  {Boolean}  isLoading - Check if loading state
 * @return {void}
 */
export function updateLoadingBar(isLoading) {
    if (isLoading) {
        $('div[id^="mount"] > div > div > div:first').removeClass('x1s85apg');
        $('div[id^="mount"] > div > div > div:first').css('z-index', '20000');
    }
    else {
        $('div[id^="mount"] > div > div > div:first').addClass('x1s85apg');
        $('div[id^="mount"] > div > div > div:first').css('z-index', '');
    }
}

/**
 * getStoryProgress
 * @description Get the story progress of the username (post several stories)
 *
 * @param  {String}  username - Get progress of username
 * @return {Object}
 */
export function getStoryProgress(username) {
    let $header = $('body > div section:visible a[href^="/' + (username) + '"] span').filter(function () {
        return $(this).children().length === 0 && $(this).find('svg').length === 0 && $(this).text()?.toLowerCase() === username?.toLowerCase();
    }).parents('div:not([class]):not([style])').filter(function () {
        return $(this).text()?.toLowerCase() !== username?.toLowerCase()
    }).filter(function () {
        return $(this).children().length > 1
    }).first();

    if ($header.length === 0) {
        $header = $('body > div section:visible a[href^="/' + (username) + '"]').filter(function () {
            return $(this).find('img').length > 0
        }).parents('div:not([class]):not([style])').filter(function () {
            return $(this).text()?.toLowerCase() !== username?.toLowerCase()
        }).filter(function () {
            return $(this).children().length > 1
        }).first();
    }

    return $header.children().filter(function () {
        return $(this).height() < 10
    }).first().children();
}

/**
 * setDownloadProgress
 * @description Show and set download circle progress
 *
 * @param  {Integer}  now
 * @param  {Integer}  total
 * @return {Void}
 */
export function setDownloadProgress(now, total) {
    if ($('.circle_wrapper').length) {
        $('.circle_wrapper span').text(`${now}/${total}`);

        if (now >= total) {
            $('.circle_wrapper').fadeOut(250, function () {
                $(this).remove();
            });
        }
    }
    else {
        $('body').append(`<div class="circle_wrapper"><circle></circle><span>${now}/${total}</span></div>`);
    }
}


/**
 * IG_createDM
 * @description A dialog showing a list of all media files in the post
 *
 * @param  {Boolean}  hasHidden
 * @param  {Boolean}  hasCheckbox
 * @return {void}
 */
export function IG_createDM(hasHidden, hasCheckbox) {
    let isHidden = (hasHidden) ? "hidden" : "";
    $('body').append('<div class="IG_POPUP_DIG ' + isHidden + '"><div class="IG_POPUP_DIG_BG"></div><div class="IG_POPUP_DIG_MAIN"><div class="IG_POPUP_DIG_TITLE"></div><div class="IG_POPUP_DIG_BODY"></div></div></div>');
    $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_TITLE').append(`<div style="position:relative;min-height:36px;text-align:center;margin-bottom: 7px;"><div style="position:absolute;left:0px;line-height: 18px;"><kbd>Alt</kbd>+<kbd>Q</kbd> [<span data-ih-locale="CLOSE">${_i18n("CLOSE")}</span>]</div><div style="line-height: 18px;">IG Helper v${GM_info.script.version}</div><div id="post_info" style="line-height: 14px;font-size:14px;">Post ID: <span id="article-id"></span></div><div class="IG_POPUP_DIG_BTN">${SVG.CLOSE}</div></div>`);

    if (hasCheckbox) {
        $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_TITLE').append(`<div style="text-align: center;" id="button_group"></div>`);
        $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_TITLE > div#button_group').append(`<button id="batch_download_selected" data-ih-locale="BATCH_DOWNLOAD_SELECTED">${_i18n('BATCH_DOWNLOAD_SELECTED')}</button>`);
        $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_TITLE > div#button_group').append(`<button id="batch_download_direct" data-ih-locale="BATCH_DOWNLOAD_DIRECT">${_i18n('BATCH_DOWNLOAD_DIRECT')}</button>`);
        $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_TITLE').append(`<label class="checkbox"><input value="yes" type="checkbox" /><span data-ih-locale="ALL_CHECK">${_i18n('ALL_CHECK')}</span></label>`);
    }
}

/**
 * IG_setDM
 * @description Set a dialog status
 *
 * @param  {Boolean}  hasHidden
 * @return {void}
 */
export function IG_setDM(hasHidden) {
    if ($('.IG_POPUP_DIG').length) {
        if (hasHidden) {
            $('.IG_POPUP_DIG').addClass("hidden");
        }
        else {
            $('.IG_POPUP_DIG').removeClass("hidden");
        }
    }
}

/**
 * saveFiles
 * @description Download the specified media URL to the computer
 *
 * @param  {String}  downloadLink
 * @param  {String}  username
 * @param  {String}  sourceType
 * @param  {Integer}  timestamp
 * @param  {String}  filetype
 * @param  {String}  shortcode
 * @return {Promise}
 */
export function saveFiles(downloadLink, username, sourceType, timestamp, filetype, shortcode) {
    return new Promise((resolve) => {
        setTimeout(() => {
            updateLoadingBar(true);
            fetch(downloadLink).then(res => {
                return res.blob().then(dwel => {
                    updateLoadingBar(false);
                    createSaveFileElement(downloadLink, dwel, username, sourceType, timestamp, filetype, shortcode);

                    resolve(true);
                });
            });
        }, 50);
    });
}

/**
 * createSaveFileElement
 * @description Download the specified media with link element
 *
 * @param  {String}  downloadLink
 * @param  {Object}  object
 * @param  {String}  username
 * @param  {String}  sourceType
 * @param  {Integer}  timestamp
 * @param  {String}  filetype
 * @param  {String}  shortcode
 * @return {void}
 */
export function createSaveFileElement(downloadLink, object, username, sourceType, timestamp, filetype, shortcode) {
    timestamp = parseInt(timestamp.toString().padEnd(13, '0'));

    if (USER_SETTING.RENAME_PUBLISH_DATE) {
        timestamp = parseInt(timestamp.toString().padEnd(13, '0'));
    }

    const date = new Date(timestamp);

    const a = document.createElement("a");
    const original_name = new URL(downloadLink).pathname.split('/').at(-1).split('.').slice(0, -1).join('.');
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    const second = date.getSeconds().toString().padStart(2, '0');

    var filename = state.fileRenameFormat.toUpperCase();
    var format_shortcode = shortcode ?? "";
    var replacements = {
        '%USERNAME%': username,
        '%SOURCE_TYPE%': sourceType,
        '%SHORTCODE%': format_shortcode,
        '%YEAR%': year,
        '%2-YEAR%': year.substr(-2),
        '%MONTH%': month,
        '%DAY%': day,
        '%HOUR%': hour,
        '%MINUTE%': minute,
        '%SECOND%': second,
        '%ORIGINAL_NAME%': original_name,
        '%ORIGINAL_NAME_FIRST%': original_name.split('_').at(0)
    };

    // eslint-disable-next-line no-useless-escape
    filename = filename.replace(/%[\w\-]+%/g, function (str) {
        return replacements[str] || str;
    });

    const originally = username + '_' + original_name + '.' + filetype;

    a.href = URL.createObjectURL(object);
    a.setAttribute("download", (USER_SETTING.AUTO_RENAME) ? filename + '.' + filetype : originally);
    a.click();
    a.remove();
}

/**
 * triggerLinkElement
 * @description Trigger the link element to start downloading the resource
 *
 * @param  {Object}  element
 * @return {void}
 */
export async function triggerLinkElement(element, isPreview) {
    let date = new Date().getTime();
    let timestamp = Math.floor(date / 1000);
    let username = ($(element).attr('data-username')) ? $(element).attr('data-username') : state.GL_username;

    if (!username && $(element).attr('data-path')) {
        logger('catching owner name from shortcode:', $(element).attr('data-href'));
        username = await getPostOwner($(element).attr('data-path')).catch(err => {
            logger('get username failed, replace with default string, error message:', err.message);
        });

        if (username == null) {
            username = "NONE";
        }
    }

    if (USER_SETTING.RENAME_PUBLISH_DATE && $(element).attr('datetime')) {
        timestamp = parseInt($(element).attr('datetime'));
    }

    if (USER_SETTING.FORCE_RESOURCE_VIA_MEDIA) {
        updateLoadingBar(true);
        let result = await getMediaInfo($(element).attr('media-id'));
        updateLoadingBar(false);

        if (result.status === 'ok') {
            var resource_url = null;
            if (result.items[0].video_versions) {
                resource_url = result.items[0].video_versions[0].url;
            }
            else {
                result.items[0].image_versions2.candidates.sort(function (a, b) {
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

                resource_url = result.items[0].image_versions2.candidates[0].url;
            }

            if (isPreview) {
                let urlObj = new URL(resource_url);
                urlObj.host = 'scontent.cdninstagram.com';

                openNewTab(urlObj.href);
            }
            else {
                saveFiles(resource_url, username, $(element).attr('data-name'), timestamp, $(element).attr('data-type'), $(element).attr('data-path'));
            }
        }
        else {
            if (USER_SETTING.USE_BLOB_FETCH_WHEN_MEDIA_RATE_LIMIT) {
                if (isPreview) {
                    let urlObj = new URL($(element).attr('data-href'));
                    urlObj.host = 'scontent.cdninstagram.com';

                    openNewTab(urlObj.href);
                }
                else {
                    saveFiles($(element).attr('data-href'), username, $(element).attr('data-name'), timestamp, $(element).attr('data-type'), $(element).attr('data-path'));
                }
            }
            else {
                alert('Fetch failed from Media API. API response message: ' + result.message);
            }
            logger(result);
        }
    }
    else {
        saveFiles($(element).attr('data-href'), username, $(element).attr('data-name'), timestamp, $(element).attr('data-type'), $(element).attr('data-path'));
    }
}


/**
 * registerMenuCommand
 * @description register script menu command
 *
 * @return {void}
 */
export function registerMenuCommand() {
    for (let id of state.registerMenuIds) {
        logger('GM_unregisterMenuCommand', id);
        GM_unregisterMenuCommand(id);
    }

    state.registerMenuIds.push(GM_registerMenuCommand(_i18n('SETTING'), () => {
        showSetting();
    }, {
        accessKey: "w"
    }));

    state.registerMenuIds.push(GM_registerMenuCommand(_i18n('DONATE'), () => {
        GM_openInTab("https://ko-fi.com/snkoarashi", { active: true });
    }, {
        accessKey: "d"
    }));

    state.registerMenuIds.push(GM_registerMenuCommand(_i18n('DEBUG'), () => {
        showDebugDOM();
    }, {
        accessKey: "z"
    }));

    state.registerMenuIds.push(GM_registerMenuCommand(_i18n('FEEDBACK'), () => {
        showFeedbackDOM();
    }, {
        accessKey: "f"
    }));

    state.registerMenuIds.push(GM_registerMenuCommand(_i18n('CHECK_UPDATE_MENU'), () => {
        callNotification();
    }, {
        accessKey: "c"
    }));

    state.registerMenuIds.push(GM_registerMenuCommand(_i18n('RELOAD_SCRIPT'), () => {
        reloadScript();
    }, {
        accessKey: "r"
    }));
}

/**
 * checkingScriptUpdate
 * @description Check if there is a new version of the script and push notification
 *
 * @param  {Integer}  interval
 * @return {void}
 */
export function checkingScriptUpdate(interval) {
    if (!USER_SETTING.CHECK_UPDATE) return;

    const check_timestamp = GM_getValue('G_CHECK_TIMESTAMP') ?? new Date().getTime();
    const now_time = new Date().getTime();

    if (now_time > (parseInt(check_timestamp) + (interval * 1000))) {
        GM_setValue('G_CHECK_TIMESTAMP', new Date().getTime());
        callNotification();
    }
}

/**
 * callNotification
 * @description call desktop notification by browser
 *
 * @return {void}
 */
export function callNotification() {
    const currentVersion = GM_info.script.version;
    const remoteScriptURL = 'https://raw.githubusercontent.com/SN-Koarashi/ig-helper/refs/heads/master/main.js';

    GM_xmlhttpRequest({
        method: "GET",
        url: remoteScriptURL,
        onload: function (response) {
            const remoteScript = response.responseText;
            const match = remoteScript.match(/\/\/\s+@version\s+([0-9.\-a-zA-Z]+)/i);

            if (match && match[1]) {
                const remoteVersion = match[1];
                logger('Current version: ', currentVersion, '|', 'Remote version: ', remoteVersion);

                if (remoteVersion !== currentVersion) {
                    GM_notification({
                        text: _i18n("NOTICE_UPDATE_CONTENT"),
                        title: _i18n("NOTICE_UPDATE_TITLE"),
                        tag: 'ig_helper_notice',
                        highlight: true,
                        timeout: 5000,
                        zombieTimeout: 5000,
                        image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/64px-Instagram_icon.png",
                        onclick: (event) => {
                            event?.preventDefault();
                            var w = GM_openInTab(GM_info.script.downloadURL);
                            setTimeout(() => {
                                w.close();
                            }, 250);
                        }
                    });
                } else {
                    logger('there is no new update');
                }
            } else {
                console.error('Could not find version in the remote script.');
            }
        }
    });
}

/**
 * showSetting
 * @description Show script settings window
 *
 * @return {void}
 */
export function showSetting() {
    $('.IG_POPUP_DIG').remove();
    IG_createDM();
    $('.IG_POPUP_DIG #post_info').text('Preference Settings');

    $('.IG_POPUP_DIG .IG_POPUP_DIG_TITLE > div').append('<select id="langSelect"></select><div style="font-size: 12px;">Some texts are machine-translated and may be inaccurate; translation contributions are welcome on GitHub.</div>');

    for (let o in locale_manifest) {
        $('.IG_POPUP_DIG .IG_POPUP_DIG_TITLE > div #langSelect').append(`<option value="${o}" ${(state.lang == o) ? 'selected' : ''}>${locale_manifest[o]}</option>`);
    }

    for (let name in USER_SETTING) {
        $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY').append(`<label class="globalSettings${(CHILD_NODES.includes(name)) ? ' child' : ''}" title="${_i18n(name + '_INTRO')}" data-ih-locale-title="${name + '_INTRO'}"><span data-ih-locale="${name}">${_i18n(name)}</span> <input id="${name}" value="box" type="checkbox" ${(USER_SETTING[name] === true) ? 'checked' : ''}><div class="chbtn"><div class="rounds"></div></div></label>`);

        if (name === 'MODIFY_VIDEO_VOLUME') {
            $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY input[id="' + name + '"]').parent('label').on('contextmenu', function (e) {
                e.preventDefault();
                if ($(this).find('#tempWrapper').length === 0) {
                    $(this).append('<div id="tempWrapper"></div>');
                    $(this).children('#tempWrapper').append('<input value="' + state.videoVolume + '" type="range" min="0" max="1" step="0.05" />');
                    $(this).children('#tempWrapper').append('<input value="' + state.videoVolume + '" step="0.05" type="number" />');
                    $(this).children('#tempWrapper').append(`<div class="IG_POPUP_DIG_BTN">${SVG.CLOSE}</div>`);
                }
            });
        }

        if (name === 'AUTO_RENAME') {
            $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY input[id="' + name + '"]').parent('label').on('contextmenu', function (e) {
                e.preventDefault();
                if ($(this).find('#tempWrapper').length === 0) {
                    $(this).append('<div id="tempWrapper"></div>');

                    $(this).children('#tempWrapper').append('<input id="date_format" value="' + state.fileRenameFormat + '" />');
                    $(this).children('#tempWrapper').append(`<div class="IG_POPUP_DIG_BTN">${SVG.CLOSE}</div>`);
                }
            });
        }
    }
}

/**
 * showDebugDOM
 * @description Show full DOM tree
 *
 * @return {void}
 */
export function showDebugDOM() {
    $('.IG_POPUP_DIG').remove();
    IG_createDM();
    $('.IG_POPUP_DIG #post_info').text('IG Debug DOM Tree');

    $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY').append(`<textarea style="font-family: monospace;width:100%;box-sizing: border-box;height:300px;background: transparent;" readonly></textarea>`);
    $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY').append(`<span style="display:block;text-align:center;">`);
    $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY span').append(`<button style="margin: 3px;" class="IG_DISPLAY_DOM_TREE"><a>${_i18n('SHOW_DOM_TREE')}</a></button>`);
    $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY span').append(`<button style="margin: 3px;" class="IG_SELECT_DOM_TREE"><a>${_i18n('SELECT_AND_COPY')}</a></button>`);
    $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY span').append(`<button style="margin: 3px;" class="IG_DOWNLOAD_DOM_TREE"><a>${_i18n('DOWNLOAD_DOM_TREE')}</a></button><br/>`);
    $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY span').append(`<button style="margin: 3px;" class="IG_REPORT_GITHUB"><a href="https://github.com/SN-Koarashi/ig-helper/issues" target="_blank">${_i18n('REPORT_GITHUB')}</a></button>`);
    $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY span').append(`<button style="margin: 3px;" class="IG_REPORT_DISCORD"><a href="https://discord.gg/q3KT4hdq8x" target="_blank">${_i18n('REPORT_DISCORD')}</a></button>`);
}

/**
 * showFeedbackDOM
 * @description Show feedback options
 *
 * @return {void}
 */
export function showFeedbackDOM() {
    $('.IG_POPUP_DIG').remove();
    IG_createDM();
    $('.IG_POPUP_DIG #post_info').text('Feedback Options');

    $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY').append(`<span style="display:block;text-align:center;">`);
    $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY span').append(`<button style="margin: 3px;" class="IG_REPORT_FORK"><a href="https://greasyfork.org/en/scripts/404535-ig-helper/feedback" target="_blank">${_i18n('REPORT_FORK')}</a></button>`);
    $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY span').append(`<button style="margin: 3px;" class="IG_REPORT_GITHUB"><a href="https://github.com/SN-Koarashi/ig-helper/issues" target="_blank">${_i18n('REPORT_GITHUB')}</a></button>`);
    $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY span').append(`<button style="margin: 3px;" class="IG_REPORT_DISCORD"><a href="https://discord.gg/q3KT4hdq8x" target="_blank">${_i18n('REPORT_DISCORD')}</a></button>`);
}

/**
 * openNewTab
 * @description Open url in new tab
 *
 * @param  {String}  link
 * @return {void}
 */
export function openNewTab(link) {
    var a = document.createElement('a');
    a.href = link;
    a.target = '_blank';

    document.body.appendChild(a);
    a.click();
    a.remove();
}

/**
 * reloadScript
 * @description Re-register main timer
 *
 * @return {void}
 */
export function reloadScript() {
    clearInterval(state.GL_repeat);

    // unregister event in post element
    state.GL_registerEventList.forEach(item => {
        item.trigger.forEach(bindElement => {
            $(item.element).off('click', bindElement);
        });
    });
    state.GL_registerEventList = [];

    $('.button_wrapper').remove();
    $('.IG_DWPROFILE, .IG_DWPROFILE, .IG_DWSTORY, .IG_DWSTORY_ALL, .IG_DWSTORY_THUMBNAIL, .IG_DWNEWTAB, .IG_DWHISTORY, .IG_DWHISTORY_ALL, .IG_DWHINEWTAB, .IG_DWHISTORY_THUMBNAIL, .IG_REELS, .IG_REELS_NEWTAB, .IG_REELS_THUMBNAIL').remove();
    $('[data-snig]').removeAttr('data-snig');

    state.pageLoaded = false;
    state.firstStarted = false;
    state.currentURL = location.href;
    state.GL_observer.disconnect();

    logger('main timer re-register completed');
}

/**
 * logger
 * @description event record
 *
 * @return {void}
 */
export function logger(...messages) {
    var dd = new Date();
    state.GL_logger.push({
        time: dd.getTime(),
        content: [...messages]
    });

    if (state.GL_logger.length > 1000) {
        state.GL_logger = [{
            time: dd.getTime(),
            content: ['logger sliced']
        }, ...state.GL_logger.slice(-999)];
    }

    console.log(`[${dd.toISOString()}]`, ...messages);
}

/**
 * initSettings
 * @description Initialize preferences
 *
 * @return {void}
 */
export function initSettings() {
    for (let name in USER_SETTING) {
        if (GM_getValue(name) != null && typeof GM_getValue(name) === 'boolean') {
            USER_SETTING[name] = GM_getValue(name);

            if (name === "MODIFY_VIDEO_VOLUME" && GM_getValue(name) !== true) {
                state.videoVolume = 1;
            }
        }
    }
}


/**
 * toggleVolumeSilder
 * @description Toggle display of custom volume slider.
 *
 * @param  {object}  $videos
 * @param  {object}  $buttonParent
 * @param  {string}  loggerType
 * @param  {string}  customClass
 * @return {void}
 */
export function toggleVolumeSilder($videos, $buttonParent, loggerType, customClass = "") {
    if ($buttonParent.find('div.volume_slider').length === 0) {
        $buttonParent.append(`<div class="volume_slider ${customClass}" />`);
        $buttonParent.find('div.volume_slider').append(`<div><input type="range" max="1" min="0" step="0.05" value="${state.videoVolume}" /></div>`);
        $buttonParent.find('div.volume_slider input').attr('style', `--ig-track-progress: ${(state.videoVolume * 100) + '%'}`);
        $buttonParent.find('div.volume_slider input').on('input', function () {
            var percent = ($(this).val() * 100) + '%';

            state.videoVolume = $(this).val();
            GM_setValue('G_VIDEO_VOLUME', $(this).val());

            $(this).attr('style', `--ig-track-progress: ${percent}`);

            $videos.each(function () {
                logger(`(${loggerType})`, 'video volume changed #slider');
                this.volume = state.videoVolume;
            });
        });

        $buttonParent.find('div.volume_slider input').on('mouseenter', function () {
            var percent = (state.videoVolume * 100) + '%';
            $(this).attr('style', `--ig-track-progress: ${percent}`);
            $(this).val(state.videoVolume);


            $videos.each(function () {
                logger(`(${loggerType})`, 'video volume changed #slider');
                this.volume = state.videoVolume;
            });
        });

        $buttonParent.find('div.volume_slider').on('click', function (e) {
            e.stopPropagation();
            e.preventDefault();
        });
    }
    else {
        $buttonParent.find('div.volume_slider').remove();
    }
}

var detectMovingViewerTimer = null;

export function openImageViewer(imageUrl) {
    removeImageViewer();

    $('body').append(
        `<div id="imageViewer">
	<div id="iv_header">
		<div style="flex:1;">Image Viewer</div>
		<div id="iv_close">${SVG.CLOSE}</div>
	</div>
    <img id="iv_image" src="" />
</div>`);

    const $container = $('#imageViewer');
    const $header = $('#iv_header');
    const $closeIcon = $('#iv_close');
    const $image = $('#iv_image');

    $image.attr('src', imageUrl);
    $container.css('display', 'flex');

    let scale = 0.75;
    let posX = 0, posY = 0;
    let isDragging = false;
    let isMovingPhoto = false;
    let startX, startY;
    var previousPosition = $image.position();

    detectMovingViewerTimer = setInterval(() => {
        const currentPosition = $image.position();
        if (currentPosition.left !== previousPosition.left || currentPosition.top !== previousPosition.top) {
            isMovingPhoto = true;
        } else {
            isMovingPhoto = false;
        }
        previousPosition = currentPosition;
    }, 100);

    $image.on('load', () => {
        posX = (window.innerWidth - $image[0].width) / 2;
        posY = (window.innerHeight - $image[0].height) / 2;
        updateImageStyle();
    });

    $image.on('dragstart drop', (e) => {
        e.preventDefault();
    });

    $image.on('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isMovingPhoto) {
            if (scale <= 0.8) {
                scale += 1.25;
                scale = Math.min(Math.max(0.75, scale), 5);
            }
            else {
                scale = 0.75;
            }
            updateImageStyle();
        }
    });

    $image.on('wheel', (e) => {
        e.preventDefault();
        scale += e.originalEvent.deltaY > 0 ? -0.15 : 0.15;
        scale = Math.min(Math.max(0.75, scale), 5);
        updateImageStyle();
    });

    $image.on('mousedown', (e) => {
        isDragging = true;
        startX = e.pageX - posX;
        startY = e.pageY - posY;
        $image.css('cursor', 'grabbing');
    });

    $image.on('mouseup', () => {
        isDragging = false;
        $image.css('cursor', 'grab');
    });

    $(document).on('mousemove.igHelper', (e) => {
        if (!isDragging) return;
        e.preventDefault();

        posX = e.pageX - startX;
        posY = e.pageY - startY;

        updateImageStyle();
    });

    $container.on('click', () => {
        removeImageViewer();
    });

    $closeIcon.on('click', () => {
        removeImageViewer();
    });

    $header.on('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });

    function updateImageStyle() {
        $image.css('transform', `scale(${scale})`);
        $image.css('left', `${posX}px`);
        $image.css('top', `${posY}px`);
    }
}

export function removeImageViewer() {
    clearInterval(detectMovingViewerTimer);
    $('#imageViewer').remove();
    $(document).off('mousemove.igHelper');
}