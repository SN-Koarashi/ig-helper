import globals from "globals";
import pluginJs from "@eslint/js";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ["**/*.js"],
    languageOptions: {
      env: {
        browser: true,
        jquery: true
      },
      globals: {
        // **
        ...globals.browser,
        $: 'readonly',
        jQuery: 'readonly',
        GM_info: 'readable',
        GM_addStyle: 'readable',
        GM_setValue: 'readable',
        GM_getValue: 'readable',
        GM_xmlhttpRequest: 'readable',
        GM_registerMenuCommand: 'readable',
        GM_unregisterMenuCommand: 'readable',
        GM_getResourceText: 'readable',
        GM_notification: 'readable',
        GM_openInTab: 'readable'
      },
    },
  },
  pluginJs.configs.recommended,
];
