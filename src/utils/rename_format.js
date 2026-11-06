import { state, SVG, $body, DEFAULT_RENAME_FORMAT } from "../settings";
import { logger } from "./general";
import { _i18n } from "./i18n";
/*! ESLINT IMPORT END !*/

/**
 * RENAME_FORMAT_KEYS
 * @description Parameters supported by getSaveFileName().
 *              Keep this list in sync with the replacements map in getSaveFileName().
 */
export const RENAME_FORMAT_KEYS = [
    'USERNAME',
    'SOURCE_TYPE',
    'SHORTCODE',
    'YEAR',
    '2-YEAR',
    'MONTH',
    'DAY',
    'HOUR',
    'MINUTE',
    'SECOND',
    'ORIGINAL_NAME',
    'ORIGINAL_NAME_FIRST',
    'INDEX',
    'UID'
];

/**
 * RENAME_FORMAT_SEPARATORS
 * @description Literal text chips offered in the rename format editor.
 */
export const RENAME_FORMAT_SEPARATORS = ['-', '_', '.', ' ', '(', ')', '[', ']'];

/**
 * parseRenameFormat
 * @description Split a rename format string into a list of param / text tokens.
 *              Unknown %PLACEHOLDER% values are kept as literal text, matching the
 *              behavior of getSaveFileName().
 *
 * @param  {String}  format
 * @return {Array<{type: String, key?: String, value?: String}>}
 */
export function parseRenameFormat(format) {
    const tokens = [];
    const regex = /%([\w-]+)%/g;
    let lastIndex = 0;
    let match;

    const pushText = (text) => {
        if (!text) return;
        const prev = tokens.at(-1);
        if (prev && prev.type === 'text') {
            prev.value += text;
        }
        else {
            tokens.push({ type: 'text', value: text });
        }
    };

    while ((match = regex.exec(format || '')) !== null) {
        const key = match[1].toUpperCase();
        pushText(format.slice(lastIndex, match.index));

        if (RENAME_FORMAT_KEYS.includes(key)) {
            tokens.push({ type: 'param', key });
        }
        else {
            pushText(match[0]);
        }

        lastIndex = regex.lastIndex;
    }

    pushText((format || '').slice(lastIndex));
    return tokens;
}

/**
 * serializeRenameFormat
 * @description Convert a token list back into a rename format string.
 *
 * @param  {Array}  tokens
 * @return {String}
 */
export function serializeRenameFormat(tokens) {
    return tokens.map((token) => (token.type === 'param') ? `%${token.key}%` : token.value).join('');
}

/**
 * getRenameFormatDescriptions
 * @description Read the localized description of every parameter from AUTO_RENAME_INTRO
 *              (lines formatted as "%KEY% - description"), so no extra translation is needed.
 *
 * @return {Object<String, String>}
 */
export function getRenameFormatDescriptions() {
    const result = {};
    const intro = _i18n('AUTO_RENAME_INTRO') || '';

    intro.split('\n').forEach((line) => {
        const match = line.trim().match(/^%([\w-]+)%\s*[-–—:：]\s*(.+)$/);
        if (match) {
            result[match[1].toUpperCase()] = match[2].trim();
        }
    });

    return result;
}

/**
 * getRenameFormatSamples
 * @description Sample values used for the chip hints and the live preview.
 *
 * @return {Object<String, String>}
 */
export function getRenameFormatSamples() {
    const date = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const originalName = '321565527_679025940443063_4318007696887450953_n';

    return {
        'USERNAME': 'instagram',
        'SOURCE_TYPE': 'photo',
        'SHORTCODE': 'C1a2B3c4D5e',
        'YEAR': date.getFullYear().toString(),
        '2-YEAR': date.getFullYear().toString().slice(-2),
        'MONTH': pad(date.getMonth() + 1),
        'DAY': pad(date.getDate()),
        'HOUR': pad(date.getHours()),
        'MINUTE': pad(date.getMinutes()),
        'SECOND': pad(date.getSeconds()),
        'ORIGINAL_NAME': originalName,
        'ORIGINAL_NAME_FIRST': originalName.split('_').at(0),
        'INDEX': '0',
        'UID': '25025320'
    };
}

/**
 * showRenameFormatEditor
 * @description Show a modal that lets the user build the AUTO_RENAME file name format
 *              by dragging parameter chips into a format builder.
 *
 * @return {void}
 */
export function showRenameFormatEditor() {
    $('.IG_RENAME_DIG').remove();
    $(document).off('.IG_RENAME_DIG');

    const descriptions = getRenameFormatDescriptions();
    const samples = getRenameFormatSamples();
    const invalidChars = /[\\/:*?"<>|]/g;

    let tokens = parseRenameFormat(state.fileRenameFormat);
    let dragPayload = null;
    let dropIndex = null;

    const $dialog = $(`
        <div class="IG_RENAME_DIG">
            <div class="IG_RENAME_DIG_BG"></div>
            <div class="IG_RENAME_DIG_MAIN" role="dialog" aria-modal="true">
                <div class="IG_RENAME_DIG_HEAD">
                    <div class="ih-rf-title"></div>
                    <div class="IG_RENAME_DIG_CLOSE" role="button"></div>
                </div>

                <div class="ih-rf-section" data-key="RENAME_FORMAT_BUILDER"></div>
                <div class="ih-rf-builder">
                    <span class="ih-rf-empty"></span>
                    <span class="ih-rf-caret"></span>
                </div>

                <div class="ih-rf-palettes">
                    <div class="ih-rf-section" data-key="RENAME_FORMAT_PARAMS"></div>
                    <div class="ih-rf-palette ih-rf-palette-params"></div>

                    <div class="ih-rf-section" data-key="RENAME_FORMAT_SEPARATORS"></div>
                    <div class="ih-rf-palette ih-rf-palette-text"></div>
                </div>

                <div class="ih-rf-section" data-key="RENAME_FORMAT_PREVIEW"></div>
                <div class="ih-rf-preview"></div>

                <details class="ih-rf-advanced">
                    <summary></summary>
                    <input type="text" class="ih-rf-raw" spellcheck="false" autocomplete="off" />
                </details>

                <div class="ih-rf-actions">
                    <button type="button" class="ih-rf-btn ih-rf-reset"></button>
                    <button type="button" class="ih-rf-btn ih-rf-cancel"></button>
                    <button type="button" class="ih-rf-btn is-primary ih-rf-save"></button>
                </div>
            </div>
        </div>
    `);

    // Static texts
    $dialog.find('.ih-rf-title').text(_i18n('RENAME_FORMAT_TITLE'));
    $dialog.find('.IG_RENAME_DIG_CLOSE').html(SVG.CLOSE).attr('title', _i18n('CLOSE')).attr('aria-label', _i18n('CLOSE'));
    $dialog.find('.ih-rf-section').each(function () {
        $(this).text(_i18n($(this).data('key')));
    });
    $dialog.find('.ih-rf-empty').text(_i18n('RENAME_FORMAT_EMPTY'));
    $dialog.find('.ih-rf-advanced > summary').text(_i18n('RENAME_FORMAT_RAW'));
    $dialog.find('.ih-rf-reset').text(_i18n('RENAME_FORMAT_RESET'));
    $dialog.find('.ih-rf-cancel').text(_i18n('RENAME_FORMAT_CANCEL'));
    $dialog.find('.ih-rf-save').text(_i18n('RENAME_FORMAT_SAVE'));

    const $builder = $dialog.find('.ih-rf-builder');
    const $caret = $builder.find('.ih-rf-caret');
    const $raw = $dialog.find('.ih-rf-raw');
    const $preview = $dialog.find('.ih-rf-preview');
    const $save = $dialog.find('.ih-rf-save');

    // Palette: parameters
    const $paramPalette = $dialog.find('.ih-rf-palette-params');
    RENAME_FORMAT_KEYS.forEach((key) => {
        $paramPalette.append(
            $('<span class="ih-rf-chip is-param" draggable="true"></span>')
                .attr('data-key', key)
                .attr('title', descriptions[key] || key)
                .append($('<span class="ih-rf-label"></span>').text(key))
                .append($('<span class="ih-rf-sample"></span>').text(samples[key]))
        );
    });

    // Palette: separators & custom text
    const $textPalette = $dialog.find('.ih-rf-palette-text');
    RENAME_FORMAT_SEPARATORS.forEach((text) => {
        $textPalette.append(
            $('<span class="ih-rf-chip is-text" draggable="true"></span>')
                .attr('data-text', text)
                .append($('<span class="ih-rf-label"></span>').text(visualizeText(text)))
        );
    });
    $textPalette.append(
        $('<span class="ih-rf-chip is-text is-custom" draggable="true"></span>')
            .attr('data-custom', 'true')
            .append($('<span class="ih-rf-label"></span>').text('＋ ' + _i18n('RENAME_FORMAT_CUSTOM_TEXT')))
    );

    $body.append($dialog);
    refresh();

    /* ---------- rendering ---------- */

    function visualizeText(text) {
        return text.replace(/ /g, '␣');
    }

    function createTokenChip(token, index) {
        const $chip = $('<span class="ih-rf-token" draggable="true"></span>').attr('data-index', index);

        if (token.type === 'param') {
            $chip.addClass('is-param')
                .attr('title', descriptions[token.key] || token.key)
                .append($('<span class="ih-rf-label"></span>').text(token.key));
        }
        else {
            $chip.addClass('is-text')
                .attr('title', _i18n('RENAME_FORMAT_EDIT_TEXT'))
                .append($('<span class="ih-rf-label"></span>').text(visualizeText(token.value)));
        }

        $chip.append(
            $('<button type="button" class="ih-rf-remove">×</button>')
                .attr('title', _i18n('RENAME_FORMAT_REMOVE'))
                .attr('aria-label', _i18n('RENAME_FORMAT_REMOVE'))
        );

        return $chip;
    }

    function renderPreview() {
        $preview.empty();
        tokens.forEach((token) => {
            if (token.type === 'param') {
                $preview.append($('<span class="is-param"></span>').text(samples[token.key]));
            }
            else {
                $preview.append(document.createTextNode(token.value));
            }
        });
        $preview.append($('<span class="ih-rf-ext"></span>').text('.jpg'));
    }

    function refresh(options = {}) {
        $builder.children('.ih-rf-token').remove();
        tokens.forEach((token, index) => {
            createTokenChip(token, index).insertBefore($caret);
        });
        $builder.toggleClass('is-empty', tokens.length === 0);

        if (!options.fromRaw) {
            $raw.val(serializeRenameFormat(tokens));
        }

        renderPreview();
        $save.prop('disabled', tokens.length === 0);
    }

    /* ---------- token operations ---------- */

    function insertToken(token, index) {
        tokens.splice(index, 0, { ...token });
        refresh();
    }

    function moveToken(from, to) {
        if (to === from || to === from + 1) return;
        const [token] = tokens.splice(from, 1);
        tokens.splice((from < to) ? to - 1 : to, 0, token);
        refresh();
    }

    function removeToken(index) {
        tokens.splice(index, 1);
        refresh();
    }

    function getPaletteToken($chip) {
        if ($chip.attr('data-key')) {
            return { type: 'param', key: $chip.attr('data-key') };
        }
        if ($chip.attr('data-custom')) {
            return { type: 'text', value: '', custom: true };
        }
        return { type: 'text', value: $chip.attr('data-text') };
    }

    function addFromPalette(token, index) {
        const isCustom = token.custom === true;
        delete token.custom;
        insertToken(token, index);
        if (isCustom) {
            startTextEdit(index);
        }
    }

    function startTextEdit(index) {
        const token = tokens[index];
        if (!token || token.type !== 'text') return;

        const $chip = $builder.children(`.ih-rf-token[data-index="${index}"]`);
        const $input = $('<input type="text" class="ih-rf-text-input" spellcheck="false" />')
            .val(token.value)
            .attr('size', Math.max(token.value.length, 3));

        $chip.attr('draggable', 'false').addClass('is-editing').find('.ih-rf-label').replaceWith($input);
        $input.trigger('focus').trigger('select');

        let finished = false;
        const commit = (cancel) => {
            if (finished) return;
            finished = true;

            if (!cancel) {
                token.value = $input.val().replace(invalidChars, '');
            }
            if (!token.value) {
                tokens.splice(tokens.indexOf(token), 1);
            }
            refresh();
        };

        $input.on('input', function () {
            $input.attr('size', Math.max($input.val().length, 3));
        });
        $input.on('keydown', function (e) {
            e.stopPropagation();
            if (e.key === 'Enter') {
                e.preventDefault();
                commit(false);
            }
            else if (e.key === 'Escape') {
                e.preventDefault();
                commit(true);
            }
        });
        $input.on('blur', () => commit(false));
    }

    /* ---------- drag & drop ---------- */

    function getInsertIndex(clientX, clientY) {
        const chips = $builder.children('.ih-rf-token').toArray();
        for (let i = 0; i < chips.length; i++) {
            const rect = chips[i].getBoundingClientRect();
            if (clientY < rect.top) return i;
            if (clientY <= rect.bottom && clientX < rect.left + rect.width / 2) return i;
        }
        return chips.length;
    }

    function showCaret(index) {
        const chips = $builder.children('.ih-rf-token').toArray();
        const base = $builder[0].getBoundingClientRect();
        let left = 10, top = 9, height = 28;

        if (chips.length > 0) {
            const isEnd = index >= chips.length;
            const rect = chips[isEnd ? chips.length - 1 : index].getBoundingClientRect();
            left = (isEnd ? rect.right + 2 : rect.left - 4) - base.left;
            top = rect.top - base.top;
            height = rect.height;
        }

        $caret.css({ left: left + 'px', top: top + 'px', height: height + 'px' }).addClass('is-visible');
    }

    function endDrag() {
        dragPayload = null;
        dropIndex = null;
        $caret.removeClass('is-visible');
        $builder.removeClass('is-over');
        $dialog.find('.is-dragging, .will-remove').removeClass('is-dragging will-remove');
    }

    $dialog.on('dragstart', '.ih-rf-palette .ih-rf-chip', function (e) {
        const token = getPaletteToken($(this));
        dragPayload = { source: 'palette', token };

        const dt = e.originalEvent.dataTransfer;
        dt.effectAllowed = 'copy';
        dt.setData('text/plain', serializeRenameFormat([token]));
    });

    $builder.on('dragstart', '.ih-rf-token', function (e) {
        const $chip = $(this);
        if ($chip.hasClass('is-editing')) {
            e.preventDefault();
            return;
        }

        dragPayload = { source: 'builder', index: parseInt($chip.attr('data-index'), 10) };
        $chip.addClass('is-dragging');

        const dt = e.originalEvent.dataTransfer;
        dt.effectAllowed = 'move';
        dt.setData('text/plain', serializeRenameFormat([tokens[dragPayload.index]]));
    });

    $dialog.on('dragover', function (e) {
        if (!dragPayload) return;

        const dt = e.originalEvent.dataTransfer;
        const inBuilder = $(e.target).closest('.ih-rf-builder').length > 0;

        if (inBuilder) {
            e.preventDefault();
            dt.dropEffect = (dragPayload.source === 'palette') ? 'copy' : 'move';
            dropIndex = getInsertIndex(e.originalEvent.clientX, e.originalEvent.clientY);
            showCaret(dropIndex);
            $builder.addClass('is-over');
            $builder.find('.will-remove').removeClass('will-remove');
        }
        else {
            dropIndex = null;
            $caret.removeClass('is-visible');
            $builder.removeClass('is-over');

            // Dragging a token out of the builder removes it on drop.
            if (dragPayload.source === 'builder') {
                e.preventDefault();
                dt.dropEffect = 'move';
                $builder.find('.is-dragging').addClass('will-remove');
            }
        }
    });

    $dialog.on('drop', function (e) {
        if (!dragPayload) return;
        e.preventDefault();

        const payload = dragPayload;
        const index = dropIndex;
        endDrag();

        if (index !== null) {
            if (payload.source === 'palette') {
                addFromPalette(payload.token, index);
            }
            else {
                moveToken(payload.index, index);
            }
        }
        else if (payload.source === 'builder') {
            removeToken(payload.index);
        }
    });

    $dialog.on('dragend', endDrag);

    /* ---------- clicks & inputs ---------- */

    // Click a palette chip to append it (also the fallback for touch devices).
    $dialog.on('click', '.ih-rf-palette .ih-rf-chip', function () {
        addFromPalette(getPaletteToken($(this)), tokens.length);
    });

    $builder.on('click', '.ih-rf-remove', function (e) {
        e.stopPropagation();
        removeToken(parseInt($(this).closest('.ih-rf-token').attr('data-index'), 10));
    });

    $builder.on('click', '.ih-rf-token.is-text:not(.is-editing)', function () {
        startTextEdit(parseInt($(this).attr('data-index'), 10));
    });

    $raw.on('input', function () {
        tokens = parseRenameFormat($raw.val());
        refresh({ fromRaw: true });
    });

    $raw.on('keydown', function (e) {
        e.stopPropagation();
        if (e.key === 'Enter') {
            e.preventDefault();
            save();
        }
        else if (e.key === 'Escape') {
            e.preventDefault();
            closeEditor();
        }
    });

    $dialog.on('click', '.IG_RENAME_DIG_CLOSE, .IG_RENAME_DIG_BG, .ih-rf-cancel', closeEditor);

    $dialog.on('click', '.ih-rf-reset', function () {
        tokens = parseRenameFormat(DEFAULT_RENAME_FORMAT);
        refresh();
    });

    $save.on('click', save);

    $(document).on('keydown.IG_RENAME_DIG', function (e) {
        // [Esc] or [Alt+Q] closes the editor
        if (e.key === 'Escape' || (e.altKey && e.which == 81)) {
            closeEditor();
        }
    });

    function save() {
        const format = serializeRenameFormat(tokens);
        if (!format) return;

        GM_setValue('G_RENAME_FORMAT', format);
        state.fileRenameFormat = format;
        logger('Rename format saved:', format);
        closeEditor();
    }

    function closeEditor() {
        $(document).off('.IG_RENAME_DIG');
        $dialog.remove();
    }
}
