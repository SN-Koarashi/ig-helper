FS_IMPORT('./src/metadata.js');

// eslint-disable-next-line no-unused-vars
(function ($) {
    'use strict';

    /* initial */
    FS_IMPORT('./src/settings.js');
    FS_IMPORT('./src/initial.js');
    FS_IMPORT('./src/timer.js');

    /* Main functions */
    FS_IMPORT('./src/functions/highlight.js');
    FS_IMPORT('./src/functions/post.js');
    FS_IMPORT('./src/functions/profile.js');
    FS_IMPORT('./src/functions/reel.js');
    FS_IMPORT('./src/functions/story.js');

    /* untils */
    FS_IMPORT('./src/utils/api.js');
    FS_IMPORT('./src/utils/util.js');
    FS_IMPORT('./src/utils/i18n.js');

    /* register all events */
    FS_IMPORT('./src/events.js');
})(jQuery);
