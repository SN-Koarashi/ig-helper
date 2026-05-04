import globals from "globals";
import pluginJs from "@eslint/js";
import importPlugin from "eslint-plugin-import";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ["**/*.js"],
    plugins: {
      import: importPlugin,
    },
    languageOptions: {
      sourceType: "module",
      globals: {
        // **
        ...globals.browser,
        $: 'readonly',
        jQuery: 'readonly',
        Mediabunny: 'readonly',
        GM_info: 'readable',
        GM_addStyle: 'readable',
        GM_setValue: 'readable',
        GM_getValue: 'readable',
        GM_xmlhttpRequest: 'readable',
        GM_registerMenuCommand: 'readable',
        GM_unregisterMenuCommand: 'readable',
        GM_getResourceText: 'readable',
        GM_notification: 'readable',
        GM_openInTab: 'readable',
        GM_getResourceURL: 'readable',
        FS_IMPORT: 'readable'
      }
    },
    rules: {
      "import/no-unresolved": "error",
      "import/named": "error",
      "import/no-duplicates": "warn",
    },
  },
  {
    files: ["build.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        ...globals.browser,
        ...globals.node
      }
    }
  },
  pluginJs.configs.recommended,
];
