import { initSettings, checkingScriptUpdate, logger } from "./utils/general";
import { getTranslationText, repaintingTranslations } from "./utils/i18n";
import { style, state } from "./settings";
import { purgeCache } from "./utils/image_cache";
import { initPersistentCache } from "./utils/cache";
import { registerMenuCommand } from "./utils/dialog";
import { registerPostClickHandlers } from "./functions/post";
import { initRouteWatcher } from "./timer";
/*! ESLINT IMPORT END !*/

// initialization script
initSettings();
GM_addStyle(style);
GM_addStyle(`
    ._acay + .x24i39r { top: 37px !important; }
`);
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
registerPostClickHandlers();
// Load persistent caches from IndexedDB, then drop expired image entries.
initPersistentCache().then(() => purgeCache());
initRouteWatcher();
/*******************************/
