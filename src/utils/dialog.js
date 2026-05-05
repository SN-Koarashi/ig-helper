import { locale_manifest, PARENT_CHILD_MAPPING, state, SVG, USER_SETTING } from "../settings";
import { callNotification, getPlatformModifierKey, logger, reloadScript } from "./general";
import { _i18n } from "./i18n";
/*! ESLINT IMPORT END !*/

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
    $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_TITLE').append(`<div style="position:relative;min-height:36px;text-align:center;margin-bottom: 7px;"><div style="position:absolute;left:0px;line-height: 18px;"><kbd>${getPlatformModifierKey()}</kbd>+<kbd>Q</kbd> [<span data-ih-locale="CLOSE">${_i18n("CLOSE")}</span>]</div><div style="line-height: 18px;">IG Helper v${GM_info.script.version}</div><div id="post_info" style="line-height: 14px;font-size:14px;">Post ID: <span id="article-id"></span></div><div class="IG_POPUP_DIG_BTN">${SVG.CLOSE}</div></div>`);

    if (hasCheckbox) {
        $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_TITLE').append(`<div style="text-align: center;" id="button_group"></div>`);
        $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_TITLE > div#button_group').append(`<button id="batch_download_selected" data-ih-locale="BATCH_DOWNLOAD_SELECTED">${_i18n('BATCH_DOWNLOAD_SELECTED')}</button>`);
        $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_TITLE > div#button_group').append(`<button id="batch_download_direct" data-ih-locale="BATCH_DOWNLOAD_DIRECT">${_i18n('BATCH_DOWNLOAD_DIRECT')}</button>`);
        $('.IG_POPUP_DIG .IG_POPUP_DIG_MAIN .IG_POPUP_DIG_TITLE').append(`<label class="checkbox"><input value="yes" type="checkbox" /><span data-ih-locale="ALL_CHECK">${_i18n('ALL_CHECK')}</span><span class="item-count"></span></label>`);
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

    state.registerMenuIds.push(GM_registerMenuCommand(_i18n('HOTKEY_KEY_SETTINGS_KEY'), () => {
        showHotkeySetting();
    }, {
        accessKey: "q"
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

    state.registerMenuIds.push(GM_registerMenuCommand(_i18n('CHECK_FOR_UPDATE'), () => {
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

export function showHotkeySetting() {
    $('.IG_POPUP_DIG').remove();
    IG_createDM();

    $('.IG_POPUP_DIG #post_info').text('Hotkey Settings');

    const $body = $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY');

    const hotkeyOptions = [
        { value: '87', label: 'Alt+W' },
        { value: '90', label: 'Alt+Z' },
        { value: '88', label: 'Alt+X' },
        { value: '68', label: 'Alt+D' },
        { value: '75', label: 'Alt+K' },
        { value: '67', label: 'Alt+C' },
        { value: '83', label: 'Alt+S' },
        { value: '192', label: 'Alt+~' },
        { value: '49', label: 'Alt+1' },
        { value: '50', label: 'Alt+2' },
        { value: '51', label: 'Alt+3' },
        { value: '52', label: 'Alt+4' },
        { value: '53', label: 'Alt+5' }
    ];

    const hotkeyConfigs = [
        { name: 'HOTKEY_SETTINGS', key: 'HOTKEY_SETTINGS_KEY', stateKey: 'settingsHotkeyKeyCode', storageKey: 'G_HOTKEY_SETTINGS_KEYCODE', defaultKeyCode: 87 },
        { name: 'HOTKEY_KEY_SETTINGS', key: 'HOTKEY_KEY_SETTINGS_KEY', stateKey: 'keySettingsHotkeyKeyCode', storageKey: 'G_HOTKEY_KEY_SETTINGS_KEYCODE', defaultKeyCode: 67 },
        { name: 'HOTKEY_DEBUG', key: 'HOTKEY_DEBUG_KEY', stateKey: 'debugHotkeyKeyCode', storageKey: 'G_HOTKEY_DEBUG_KEYCODE', defaultKeyCode: 90 },
        { name: 'HOTKEY_DOWNLOAD_STORY', key: 'HOTKEY_DOWNLOAD_STORY_KEY', stateKey: 'downloadStoryHotkeyKeyCode', storageKey: 'G_HOTKEY_DOWNLOAD_STORY_KEYCODE', defaultKeyCode: 83 },
    ];

    function checkHotkeyConflict(keyCode, excludeStateKey) {
        for (const config of hotkeyConfigs) {
            if (config.stateKey !== excludeStateKey && state[config.stateKey] === keyCode) {
                return true;
            }
        }
        return false;
    }

    function createHotkeySetting(name, key, stateKey, storageKey, defaultKeyCode) {
        const currentKeyCode = state[stateKey];
        const $container = $(`
            <label class="globalSettings hotkey-setting-item" data-hotkey="${name}" style="position: relative;display: flex; align-items: center; padding-right: 5px;">
                <span>${_i18n(key)}</span>
                <div class="hotkey-select-wrapper" style="display: flex; align-items: center; gap: 8px; justify-content: flex-end; flex: 1;">
                    <select class="hotkey-preset" data-storage="${storageKey}" data-state="${stateKey}" data-default="${defaultKeyCode}" style="padding: 4px 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px;">
                        ${hotkeyOptions.filter(o => o.value != defaultKeyCode.toString()).map(o => `<option value="${o.value}" ${o.value == currentKeyCode ? 'selected' : ''}>${o.label}</option>`).join('')}
                        <option value="${defaultKeyCode}" ${currentKeyCode == defaultKeyCode ? 'selected' : ''}>Alt+${String.fromCharCode(defaultKeyCode)}</option>
                    </select>
                    <button class="hotkey-reset" title="${_i18n('HOTKEY_RESET')}" style="padding: 4px 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; color: #1f1f1f; background: #fff; cursor: pointer;">${_i18n('HOTKEY_RESET')}</button>
                </div>
                <div class="hotkey-conflict-warning" style="pointer-events: none; position: absolute; bottom: -10px; display: none; font-size: 11px; color: #e74c3c;">▲ ${_i18n('HOTKEY_CONFLICT_WARNING')}</div>
            </label>
        `);

        $container.find('.hotkey-reset').on('click', function () {
            const defaultCode = parseInt($container.find('.hotkey-preset').data('default'));
            const stateKeyName = $container.find('.hotkey-preset').data('state');
            const storage = $container.find('.hotkey-preset').data('storage');
            const $preset = $container.find('.hotkey-preset');

            state[stateKeyName] = defaultCode;
            GM_setValue(storage, defaultCode);
            $preset.val(defaultCode);
            $container.find('.hotkey-conflict-warning').hide();
        });

        $container.find('.hotkey-preset').on('change', function () {
            const val = $(this).val();
            const storage = $(this).data('storage');
            const stateKeyName = $(this).data('state');
            const defaultCode = parseInt($(this).data('default'));
            const keyCode = parseInt(val);

            if (checkHotkeyConflict(keyCode, stateKeyName)) {
                state[stateKeyName] = defaultCode;
                GM_setValue(storage, defaultCode);
                $(this).val(defaultCode);
                $container.find('.hotkey-conflict-warning').show().delay(2000).fadeOut(500);
            } else {
                state[stateKeyName] = keyCode;
                GM_setValue(storage, keyCode);
                $container.find('.hotkey-conflict-warning').hide();
            }
        });

        return $container;
    }

    $body.append('<span style="display: block; margin-bottom: 15px;" class="hotkey-settings-container"></span>');

    hotkeyConfigs.forEach((config) => {
        $body.find('.hotkey-settings-container').append(
            createHotkeySetting(config.name, config.key, config.stateKey, config.storageKey, config.defaultKeyCode)
        );
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

    $('.IG_POPUP_DIG .IG_POPUP_DIG_BODY input#CHECK_FOR_UPDATE').closest('label').prependTo('.IG_POPUP_DIG .IG_POPUP_DIG_BODY');

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