import { initSettings, registerMenuCommand, checkingScriptUpdate, logger } from "./utils/general";
import { getTranslationText, repaintingTranslations } from "./utils/i18n";
import { style, state } from "./settings";
/*! ESLINT IMPORT END !*/

// initialization script
initSettings();
GM_addStyle(style);
registerMenuCommand();

getTranslationText(state.lang).then((res) => {
    state.locale[state.lang] = res;
    repaintingTranslations();
    registerMenuCommand();
    checkingScriptUpdate(300);
}).catch((err) => {
    registerMenuCommand();
    checkingScriptUpdate(300);

    if (!state.lang.startsWith('en')) {
        console.error('getTranslationText catch error:', err);
    }
});

logger('Script Loaded', GM_info.script.name, 'version:', GM_info.script.version);
/*******************************/