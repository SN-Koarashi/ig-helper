import { SVG, USER_SETTING, state, locale_manifest, PARENT_CHILD_MAPPING } from "../settings";
import { _i18n } from "./i18n";
import { getPostOwner, getMediaInfo } from "./api";
import { getImageFromCache } from "./image_cache";
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
 * @description Get Instagram App ID.
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
 * @description Update loading state.
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
 * @description Get the story progress of the username (post several stories).
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
 * @description Show and set download circle progress.
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
 * @description A dialog showing a list of all media files in the post.
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
 * @description Set a dialog status.
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
 * @description Download the specified media URL to the computer.
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
 * @description Trigger download from Blob with filename.
 * 
 * @param {Blob} blob
 * @param {string} filename
 */
function triggerDownload(blob, filename) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    link.remove();
}

/**
 * createSaveFileElement
 * @description Download the specified media with link element.
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
    const downloadName = USER_SETTING.AUTO_RENAME ? filename + '.' + filetype : originally;
    if (USER_SETTING.MODIFY_RESOURCE_EXIF && filetype === 'jpg' && shortcode && sourceType === 'photo' && (object.type === 'image/jpeg' || object.type === 'image/webp')) {
        changeExifData(object, shortcode)
            .then(newBlob => triggerDownload(newBlob, downloadName))
            .catch(err => {
                console.error('Failed to strip EXIF and/or attach post URL to EXIF.', err);
                triggerDownload(object, downloadName);
            });
    } else {
        triggerDownload(object, downloadName);
    }
}

/**
 * changeExifData
 * @description Strips EXIF metadata and attaches post URLs to the EXIF of downloaded image resources.
 *
 * @param  {Object}  blob
 * @param  {string}  shortcode
 * @return {Blob}
 */
async function changeExifData(blob, shortcode) {
    const concat = (...arr) => {
        const len = arr.reduce((s, a) => s + a.length, 0);
        const out = new Uint8Array(len);
        let p = 0;
        for (const a of arr) {
            out.set(a, p);
            p += a.length;
        }
        return out;
    };
    const u32le = v => {
        const b = new Uint8Array(4);
        new DataView(b.buffer).setUint32(0, v, true);
        return b;
    };
    const enc = s => new TextEncoder().encode(s);
    const fourCC = (dv, o) =>
        String.fromCharCode(dv.getUint8(o), dv.getUint8(o + 1), dv.getUint8(o + 2), dv.getUint8(o + 3));

    const head = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
    const isJPEG = head[0] === 0xFF && head[1] === 0xD8;
    const isWEBP = head.length >= 12 &&
        String.fromCharCode(...head.subarray(0, 4)) === 'RIFF' &&
        String.fromCharCode(...head.subarray(8, 12)) === 'WEBP';
    if (!isJPEG && !isWEBP) throw new Error('Not a JPEG or WEBP');

    const urlBytes = enc(`https://www.instagram.com/p/${shortcode}/\0`);
    const exifPrefix = enc('Exif\0\0');
    const tiffHeader = Uint8Array.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00]);
    const entryCount = Uint8Array.from([0x01, 0x00]);
    const entry = concat(
        Uint8Array.from([0x0E, 0x01, 0x02, 0x00]),
        u32le(urlBytes.length),
        u32le(8 + 2 + 12 + 4)
    );
    const tiffBody = concat(tiffHeader, entryCount, entry, u32le(0), urlBytes);

    if (isJPEG) {
        const ab = await blob.arrayBuffer();
        const dv = new DataView(ab);
        const app1Body = concat(exifPrefix, tiffBody);
        const app1Header = new Uint8Array(4);
        new DataView(app1Header.buffer).setUint16(0, 0xFFE1);
        new DataView(app1Header.buffer).setUint16(2, app1Body.length + 2);
        const newAPP1 = concat(app1Header, app1Body);

        const parts = [new Uint8Array(ab, 0, 2)];
        let off = 2,
            added = false;
        while (off < dv.byteLength) {
            const marker = dv.getUint16(off);
            if ((marker & 0xFF00) !== 0xFF00) break;
            if (marker === 0xFFDA) {
                if (!added) parts.push(newAPP1);
                parts.push(new Uint8Array(ab, off));
                break;
            }
            const len = dv.getUint16(off + 2) + 2;
            if (marker === 0xFFE1) {
                off += len;
                continue;
            }
            parts.push(new Uint8Array(ab, off, len));
            off += len;
        }
        const total = parts.reduce((s, a) => s + a.length, 0);
        const out = new Uint8Array(total);
        let p = 0;
        parts.forEach(a => {
            out.set(a, p);
            p += a.length;
        });
        return new Blob([out], {
            type: 'image/jpeg'
        });
    }

    const ab = await blob.arrayBuffer();
    const dv = new DataView(ab);
    const chunks = [];
    let vp8xIdx = -1;
    let offset = 12;
    while (offset < dv.byteLength) {
        const cc = fourCC(dv, offset);
        const sz = dv.getUint32(offset + 4, true);
        const pad = sz & 1;
        const full = 8 + sz + pad;
        if (cc !== 'EXIF' && cc !== 'XMP ') {
            chunks.push(new Uint8Array(ab, offset, full));
            if (cc === 'VP8X') vp8xIdx = chunks.length - 1;
        }
        offset += full;
    }
    let exifChunk = concat(
        enc('EXIF'),
        u32le(exifPrefix.length + tiffBody.length),
        exifPrefix,
        tiffBody
    );
    if (exifChunk.length & 1) exifChunk = concat(exifChunk, Uint8Array.of(0));
    if (vp8xIdx !== -1) {
        const vp8x = new Uint8Array(chunks[vp8xIdx]);
        vp8x[8] |= 0x10;
        chunks[vp8xIdx] = vp8x;
        chunks.splice(vp8xIdx + 1, 0, exifChunk);
    } else {
        chunks.push(exifChunk);
    }
    const payload = chunks.reduce((s, c) => s + c.length, 0);
    const riffHeader = concat(enc('RIFF'), u32le(payload + 4), enc('WEBP'));
    const finalBuf = concat(riffHeader, ...chunks);
    return new Blob([finalBuf], {
        type: 'image/webp'
    });
}

/**
 * triggerLinkElement
 * @description Trigger the link element to start downloading the resource.
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

    let mediaId = $(element).attr('media-id');
    const cached = getImageFromCache(mediaId);

    if (cached) {
        if (isPreview) {
            openNewTab(cached);
        } else {
            saveFiles(cached, username, $(element).data('name'), timestamp, $(element).data('type') || 'jpg', $(element).data('path'));
        }
        return;
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

                const getWidthFromURL = function (obj) {
                    if (obj.width != null) {
                        return obj.width;
                    }

                    const url = new URL(obj.url);
                    const stp = url.searchParams.get('stp');

                    if (stp != null) {
                        return parseInt(stp.match(/_p([0-9]+)x([0-9]+)_/i)?.at(1) || -1);
                    }
                    else {
                        return 0;
                    }
                }

                const resourceWidth = getWidthFromURL(result.items[0].image_versions2.candidates[0]);
                if (
                    result.items[0].original_width !== resourceWidth &&
                    resourceWidth !== -1
                ) {
                    // alert();
                }
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
            if (USER_SETTING.FALLBACK_TO_BLOB_FETCH_IF_MEDIA_API_THROTTLED) {
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
 * @description Register script menu command.
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
 * @description Check if there is a new version of the script and push notification.
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
 * @description Call desktop notification by browser.
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
 * @description Show script settings window.
 *
 * @return {void}
 */
export function showSetting() {
    $('.IG_POPUP_DIG').remove();
    IG_createDM();

    $('.IG_POPUP_DIG #post_info').text('Preference Settings');
    $('.IG_POPUP_DIG .IG_POPUP_DIG_TITLE > div')
        .append(`
            <select id="langSelect"></select>
            <div style="font-size: 12px;">
                Some texts are machine-translated and may be inaccurate; translation contributions are welcome on GitHub.
            </div>
        `);

    for (const o in locale_manifest) {
        $('#langSelect').append(
            `<option value="${o}" ${(state.lang === o) ? 'selected' : ''}>${locale_manifest[o]}</option>`
        );
    }

    const $body = $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY');

    for (const name in USER_SETTING) {
        $body.append(`
            <label class="globalSettings"
                   title="${_i18n(name + '_INTRO')}"
                   data-ih-locale-title="${name + '_INTRO'}">

                <span data-ih-locale="${name}">${_i18n(name)}</span>
                <input id="${name}" value="box" type="checkbox"
                       ${USER_SETTING[name] === true ? 'checked' : ''}>
                <div class="chbtn"><div class="rounds"></div></div>
            </label>`
        );

        if (name === 'MODIFY_VIDEO_VOLUME') {
            $body.find(`input[id="${name}"]`).parent('label').on('contextmenu', function (e) {
                e.preventDefault();
                if (!$(this).find('#tempWrapper').length) {
                    $(this).append('<div id="tempWrapper"></div>')
                        .children('#tempWrapper')
                        .append(`<input value="${state.videoVolume}" type="range" min="0" max="1" step="0.05" />`)
                        .append(`<input value="${state.videoVolume}" step="0.05" type="number" />`)
                        .append(`<div class="IG_POPUP_DIG_BTN">${SVG.CLOSE}</div>`);
                }
            });
        }

        if (name === 'AUTO_RENAME') {
            $body.find(`input[id="${name}"]`).parent('label').on('contextmenu', function (e) {
                e.preventDefault();
                if (!$(this).find('#tempWrapper').length) {
                    $(this).append('<div id="tempWrapper"></div>')
                        .children('#tempWrapper')
                        .append(`<input id="date_format" value="${state.fileRenameFormat}" />`)
                        .append(`<div class="IG_POPUP_DIG_BTN">${SVG.CLOSE}</div>`);
                }
            });
        }
    }

    $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY input#CHECK_UPDATE').closest('label').prependTo('.IG_POPUP_DIG .IG_POPUP_DIG_BODY');

    arrangeSettingHierarchy();
}

/**
 * arrangeSettingHierarchy
 * @description Arrange specific settings under the corresponding setting. 
 *
 * @return {void}
 */
export function arrangeSettingHierarchy() {
    Object.entries(PARENT_CHILD_MAPPING).forEach(([parent, children]) => {

        let $prev = $(`.IG_POPUP_DIG .IG_POPUP_DIG_BODY input#${parent}`).closest('label');

        children.forEach(child => {
            const $childLbl = $(`.IG_POPUP_DIG .IG_POPUP_DIG_BODY input#${child}`).closest('label').detach();
            $childLbl.addClass("child");
            $prev.after($childLbl);
            $prev = $childLbl;
        });
    });
}

/**
 * showDebugDOM
 * @description Show full DOM tree.
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
 * @description Show feedback options.
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
 * @description Open URL in new tab.
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
 * @description Re-register main timer.
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
 * @description Event record.
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
 * @description Initialize preferences.
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
		<div style="display: flex;filter: invert(1);gap: 8px;margin-right: 8px;">
            <div id="rotate_left" style="cursor: pointer;">${SVG.TURN_DEG}</div>
            <div id="rotate_right" style="transform: scaleX(-1);cursor: pointer;">${SVG.TURN_DEG}</div>
        </div>
		<div id="iv_close">${SVG.CLOSE}</div>
	</div>
    <section>
        <div id="iv_transform">
            <div id="iv_rotate">
                <img id="iv_image" src="" />
            </div>
        </div>
    </section>
</div>`);

    const $container = $('#imageViewer');
    const $section = $('#imageViewer > section');
    const $wrapT = $('#iv_transform');
    const $wrapR = $('#iv_rotate');
    const $header = $('#iv_header');
    const $closeIcon = $('#iv_close');
    const $image = $('#iv_image');
    const $rotateLeft = $('#rotate_left');
    const $rotateRight = $('#rotate_right');

    $image.attr('src', imageUrl);
    $container.css('display', 'flex');
    $wrapT.css('transform-origin', '0 0');
    $wrapT.css('transition', `transform 0.15s ease`);
    $wrapR.css('transform-origin', 'center');
    $wrapR.css('transition', `transform 0.15s ease`);
    $wrapT.css('will-change', 'transform');
    $wrapR.css('will-change', 'transform');

    let rotate = 0;
    let scale = 1;
    let posX = 0, posY = 0;
    let isDragging = false;
    let isMovingPhoto = false;
    let startX, startY;
    var previousPosition = {
        x: 0,
        y: 0
    };

    detectMovingViewerTimer = setInterval(() => {
        const currentPosition = {
            x: posX,
            y: posY
        };
        if (currentPosition.x !== previousPosition.x || currentPosition.y !== previousPosition.y) {
            isMovingPhoto = true;
        } else {
            isMovingPhoto = false;
        }
        previousPosition = currentPosition;
    }, 100);


    $image.on('load', () => {
        posX = 0;
        posY = 0;
        updateImageStyle();
    });

    $image.on('dragstart drop', (e) => {
        e.preventDefault();
    });

    $image.on('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isMovingPhoto) {
            if (scale <= 1) {
                makeZoomAction(e, Math.min(Math.max(1, scale + 1.25), 5));
            }
            else {
                scale = 1;
                posX = 0;
                posY = 0;
            }

            updateImageStyle();
        }
    });

    $section.on('wheel', (e) => {
        e.preventDefault();
        makeZoomAction(e);
    });

    $container.on('wheel', (e) => {
        e.preventDefault();
    });

    $image.on('mousedown', (e) => {
        if (scale == 1) return;

        isDragging = true;

        startX = e.pageX - posX;
        startY = e.pageY - posY;
        $image.css('cursor', 'grabbing');
    });

    $image.on('mouseup', () => {
        if (scale == 1) return;

        isDragging = false;
        $image.css('cursor', 'grab');
    });

    $rotateLeft.on('click', function () {
        rotate -= 90;
        updateImageStyle();
    });

    $rotateRight.on('click', function () {
        rotate += 90;
        updateImageStyle();
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
        $wrapT.css('transition', isMovingPhoto ? "none" : `transform 0.15s ease`);
        $wrapT.css('transform', `translate(${posX}px, ${posY}px) scale(${scale})`);
        $wrapR.css('transform', `rotate(${rotate}deg)`);

        if (scale == 1) {
            $image.css('cursor', 'zoom-in');
        }
        else {
            $image.css('cursor', 'grabbing');
        }
    }


    function makeZoomAction(e, newScale) {
        e.preventDefault();

        let prevScale = scale;

        // newScale should be null when passing by wheel event
        if (newScale == null) {
            let factor = 0.1;
            let delta = e.originalEvent.deltaY < 0 ? 1 : -1;
            scale = Math.min(5, Math.max(1, scale + delta * factor * scale));
        }
        else {
            scale = newScale;
        }


        let rect = $section[0].getBoundingClientRect();
        let mx = e.clientX - rect.left;
        let my = e.clientY - rect.top;

        let zoomTargetX = (mx - posX) / prevScale;
        let zoomTargetY = (my - posY) / prevScale;

        posX = -zoomTargetX * scale + mx;
        posY = -zoomTargetY * scale + my;

        updateImageStyle();
    }
}

export function removeImageViewer() {
    clearInterval(detectMovingViewerTimer);
    $('#imageViewer').remove();
    $(document).off('mousemove.igHelper');
}