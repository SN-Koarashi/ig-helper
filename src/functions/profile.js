import { SVG, USER_SETTING } from "../settings";
import { updateLoadingBar, saveFiles, logger } from "../utils/general";
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

                $('header > *[class]:first-child > *[class]:first-child img[alt][draggable]').parent().parent().append(`<div data-ih-locale-title="DW" title="${_i18n("DW")}" class="IG_DWPROFILE">${SVG.DOWNLOAD}</div>`);
                $('header > *[class]:first-child > *[class]:first-child img[alt][draggable]').parent().parent().css('position', 'relative');
                $('header > *[class]:first-child > *[class]:first-child img[alt]:not([draggable])').parent().parent().parent().append(`<div data-ih-locale-title="DW" title="${_i18n("DW")}" class="IG_DWPROFILE">${SVG.DOWNLOAD}</div>`);
                $('header > *[class]:first-child > *[class]:first-child img[alt]:not([draggable])').parent().parent().parent().css('position', 'relative');
            }, 150);
        }
    }
}


/**
 * skipSharedWithYouDialog
 * @description Auto-skip the "X shared this with you" dialog for ?igsh= links.
 *
 * @return {void}
 */
export function skipSharedWithYouDialog() {
    if (!USER_SETTING.SKIP_SHARED_WITH_YOU_DIALOG) return;

    let url;
    try {
        url = new URL(window.location.href);
    }
    catch (e) {
        logger("[skipSharedWithYouDialog] invalid URL", e);
        return;
    }

    // only for shared links with the tracking param ?igsh=...
    if (!url.searchParams || !url.searchParams.has("igsh")) return;

    const $dialogs = $("div[role=\"dialog\"]");
    if (!$dialogs || !$dialogs.length) {
        return;
    }

    const profileUsername = location.pathname
        .split("/")
        .filter(s => s.length > 0)
        .at(0)?.toLowerCase();

    $dialogs.each(function () {
        const $dialog = $(this);

        if (!$dialog.is(":visible")) {
            return;
        }

        const $headers = $dialog.find("h2");
        if (!$headers.length) {
            return;
        }

        // Heuristic: header text that looks like "profile_name shared this with you"
        const isSharedHeader = $headers.filter(function () {
            const rawText = (this.textContent || "").trim().toLowerCase();
            if (!rawText) return false;

            // Typical case
            if (rawText.includes("shared this with you")) return true;
            if (rawText.includes("shared with you")) return true;

            // Fallback: contains username + "shared"
            if (profileUsername &&
                rawText.includes(profileUsername) &&
                rawText.includes("shared")) {
                return true;
            }

            return false;
        }).length > 0;

        if (!isSharedHeader) {
            return;
        }

        const $buttons = $dialog.find("div[role=\"button\"]");
        if (!$buttons.length) {
            logger("[skipSharedWithYouDialog] dialog has no buttons");
            return;
        }

        let $notNow = null;

        // Prefer a button whose text is exactly "Not now" (case-insensitive)
        $buttons.each(function () {
            const text = (this.textContent || "").trim().toLowerCase();
            if (!text) return;

            if (text === "not now") {
                $notNow = $(this);
                return false;
            }
        });

        // Fallback: if there are exactly 2 buttons, assume the second is "Not now"
        if ((!$notNow || !$notNow.length) && $buttons.length === 2) {
            $notNow = $buttons.last();
        }

        if (!$notNow || !$notNow.length) {
            logger("[skipSharedWithYouDialog] could not find \"Not now\" button");
            return;
        }

        logger("[skipSharedWithYouDialog] clicking \"Not now\" button");
        $notNow.trigger("click");
    });
}