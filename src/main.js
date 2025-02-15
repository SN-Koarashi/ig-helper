initSettings();
GM_addStyle(style);
registerMenuCommand();

getTranslationText(lang).then((res) => {
    locale[lang] = res;
    repaintingTranslations();
    registerMenuCommand();
    checkingScriptUpdate(300);
}).catch((err) => {
    registerMenuCommand();
    checkingScriptUpdate(300);

    if (!lang.startsWith('en')) {
        console.error('getTranslationText catch error:', err);
    }
});

logger('Script Loaded', GM_info.script.name, 'version:', GM_info.script.version);