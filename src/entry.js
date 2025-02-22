FS_IMPORT('./metadata.js');

// eslint-disable-next-line no-unused-vars
(function ($) {
    'use strict';

    /* initial */
    FS_IMPORT('./settings.js');
    FS_IMPORT('./initial.js');
    FS_IMPORT('./timer.js');

    /* Main functions */
    FS_IMPORT('./functions/highlight.js');
    FS_IMPORT('./functions/post.js');
    FS_IMPORT('./functions/profile.js');
    FS_IMPORT('./functions/reel.js');
    FS_IMPORT('./functions/story.js');

    /* untils */
    FS_IMPORT('./utils/api.js');
    FS_IMPORT('./utils/general.js');
    FS_IMPORT('./utils/i18n.js');

    /* register all events */
    FS_IMPORT('./events.js');
})(jQuery);
