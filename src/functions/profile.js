import { SVG } from "../settings";
import { updateLoadingBar, saveFiles } from "../utils/util";
import { _i18n } from "../utils/i18n";
import { getUserId, getUserHighSizeProfile } from "../utils/api";
/*! ESLINT IMPORT END !*/

/**
 * onProfileAvatar
 * @description Trigger user avatar download event or button display event.
 *
 * @param  {Boolean}  isDownload - Check if it is a download operation
 * @return {void}
 */
export async function onProfileAvatar(isDownload) {
    if (isDownload) {
        updateLoadingBar(true);

        let date = new Date().getTime();
        let timestamp = Math.floor(date / 1000);
        let username = location.pathname.replaceAll(/(reels|tagged)\/$/ig, '').split('/').filter(s => s.length > 0).at(-1);
        let userInfo = await getUserId(username);

        try {
            let dataURL = await getUserHighSizeProfile(userInfo.user.pk);
            saveFiles(dataURL, username, "avatar", timestamp, 'jpg');
        }
        // eslint-disable-next-line no-unused-vars
        catch (err) {
            saveFiles(userInfo.user.profile_pic_url, username, "avatar", timestamp, 'jpg');
        }

        updateLoadingBar(false);
    }
    else {
        // Add the profile download button
        if (!$('.IG_DWPROFILE').length) {
            let profileTimer = setInterval(() => {
                if ($('.IG_DWPROFILE').length) {
                    clearInterval(profileTimer);
                    return;
                }

                $('header > *[class]:first-child img[alt][draggable]').parent().parent().append(`<div data-ih-locale-title="DW" title="${_i18n("DW")}" class="IG_DWPROFILE">${SVG.DOWNLOAD}</div>`);
                $('header > *[class]:first-child img[alt][draggable]').parent().parent().css('position', 'relative');
                $('header > *[class]:first-child img[alt]:not([draggable])').parent().parent().parent().append(`<div data-ih-locale-title="DW" title="${_i18n("DW")}" class="IG_DWPROFILE">${SVG.DOWNLOAD}</div>`);
                $('header > *[class]:first-child img[alt]:not([draggable])').parent().parent().parent().css('position', 'relative');
            }, 150);
        }
    }
}