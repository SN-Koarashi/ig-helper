import { logger, getAppID, updateLoadingBar } from "./general";
/*! ESLINT IMPORT END !*/

/**
 * getHighlightStories
 * @description Get a list of all stories in highlight Id.
 *
 * @param  {Integer}  highlightId
 * @return {Object}
 */
export function getHighlightStories(highlightId) {
    return new Promise((resolve, reject) => {
        let getURL = `https://www.instagram.com/graphql/query/?query_hash=45246d3fe16ccc6577e0bd297a5db1ab&variables=%7B%22highlight_reel_ids%22:%5B%22${highlightId}%22%5D,%22precomposed_overlay%22:false%7D`;

        GM_xmlhttpRequest({
            method: "GET",
            url: getURL,
            onload: function (response) {
                try {
                    let obj = JSON.parse(response.response);
                    resolve(obj);
                }
                catch (err) {
                    logger('getHighlightStories()', 'reject', err.message);
                    reject(err);
                }
            },
            onerror: function (err) {
                logger('getHighlightStories()', 'reject', err);
                reject(err);
            }
        });
    });
}

/**
 * getStories
 * @description Get a list of all stories in user Id.
 *
 * @param  {Integer}  userId
 * @return {Object}
 */
export function getStories(userId) {
    return new Promise((resolve, reject) => {
        let getURL = `https://www.instagram.com/graphql/query/?query_hash=15463e8449a83d3d60b06be7e90627c7&variables=%7B%22reel_ids%22:%5B%22${userId}%22%5D,%22precomposed_overlay%22:false%7D`;

        GM_xmlhttpRequest({
            method: "GET",
            url: getURL,
            onload: function (response) {
                try {
                    let obj = JSON.parse(response.response);
                    logger('getStories()', obj);
                    resolve(obj);
                }
                catch (err) {
                    logger('getStories()', 'reject', err.message);
                    reject(err);
                }
            },
            onerror: function (err) {
                logger('getStories()', 'reject', err);
                reject(err);
            }
        });
    });
}

/**
 * getUserId
 * @description Get user's id with username
 *
 * @param  {String}  username
 * @return {Integer}
 */
export function getUserId(username) {
    return new Promise((resolve, reject) => {
        let getURL = `https://www.instagram.com/web/search/topsearch/?query=${username}`;

        GM_xmlhttpRequest({
            method: "GET",
            url: getURL,
            onload: function (response) {
                // Fix search issue by Discord: sno_w_
                let obj = JSON.parse(response.response);
                let result = null;
                obj.users.forEach(pos => {
                    if (pos.user.username?.toLowerCase() === username?.toLowerCase()) {
                        result = pos;
                    }
                });

                if (result != null) {
                    logger('getUserId()', result);
                    resolve(result);
                }
                else {
                    getUserIdWithAgent(username).then((result) => {
                        resolve(result);
                        // eslint-disable-next-line no-unused-vars
                    }).catch((err) => {
                        alert("Can not find user info from getUserId()");
                    });
                }
            },
            onerror: function (err) {
                logger('getUserId()', 'reject', err);
                reject(err);
            }
        });
    });
}

/**
 * getUserIdWithAgent
 * @description Get user's id with username
 *
 * @param  {String}  username
 * @return {Integer}
 */
export function getUserIdWithAgent(username) {
    return new Promise((resolve, reject) => {
        let getURL = `https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`;

        GM_xmlhttpRequest({
            method: "GET",
            url: getURL,
            headers: {
                'X-IG-App-ID': getAppID()
            },
            onload: function (response) {
                try {
                    let obj = JSON.parse(response.response);
                    let hasUser = obj?.data?.user;

                    if (hasUser != null) {
                        let userInfo = obj?.data;
                        userInfo.user.pk = userInfo.user.id;
                        logger('getUserIdWithAgent()', obj);
                        resolve(userInfo);
                    }
                    else {
                        logger('getUserIdWithAgent()', 'reject', 'undefined');
                        reject('undefined');
                    }
                }
                catch (err) {
                    logger('getUserIdWithAgent()', 'reject', err.message);
                    reject(err);
                }
            },
            onerror: function (err) {
                logger('getUserIdWithAgent()', 'reject', err);
                reject(err);
            }
        });
    });
}

/**
 * getUserHighSizeProfile
 * @description Get user's high quality avatar image.
 *
 * @param  {Integer}  userId
 * @return {String}
 */
export function getUserHighSizeProfile(userId) {
    return new Promise((resolve, reject) => {
        let getURL = `https://i.instagram.com/api/v1/users/${userId}/info/`;

        GM_xmlhttpRequest({
            method: "GET",
            url: getURL,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Pixel 7 XL)Build/RP1A.20845.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/5.0 Chrome/117.0.5938.60 Mobile Safari/537.36 Instagram 307.0.0.34.111'
            },
            onload: function (response) {
                try {
                    let obj = JSON.parse(response.response);
                    if (obj.status !== 'ok') {
                        logger('getUserHighSizeProfile()', 'reject', obj);
                        reject('faild');
                    }
                    else {
                        logger('getUserHighSizeProfile()', obj);
                        resolve(obj.user.hd_profile_pic_url_info?.url);
                    }
                }
                catch (err) {
                    logger('getUserHighSizeProfile()', 'reject', err);
                    reject(err);
                }
            },
            onerror: function (err) {
                logger('getUserHighSizeProfile()', 'reject', err);
                reject(err);
            }
        });
    });
}

/**
 * getPostOwner
 * @description Get post's author with post shortcode
 *
 * @param  {String}  postPath
 * @return {String}
 */
export function getPostOwner(postPath) {
    return new Promise((resolve, reject) => {
        if (!postPath) reject("NOPATH");
        let postShortCode = postPath;
        let getURL = `https://www.instagram.com/graphql/query/?query_hash=2c4c2e343a8f64c625ba02b2aa12c7f8&variables=%7B%22shortcode%22:%22${postShortCode}%22}`;

        GM_xmlhttpRequest({
            method: "GET",
            url: getURL,
            onload: function (response) {
                try {
                    let obj = JSON.parse(response.response);
                    logger('getPostOwner()', obj);
                    resolve(obj.data.shortcode_media.owner.username);
                }
                catch (err) {
                    logger('getPostOwner()', 'reject', err.message);
                    reject(err);
                }
            },
            onerror: function (err) {
                logger('getPostOwner()', 'reject', err);
                reject(err);
            }
        });
    });
}

/**
 * getBlobMedia
 * @description Get list of all media files in post with post shortcode
 *
 * @param  {String}  postPath
 * @return {Object}
 */
export function getBlobMedia(postPath) {
    return new Promise((resolve, reject) => {
        if (!postPath) reject("NOPATH");
        let postShortCode = postPath;
        let getURL = `https://www.instagram.com/graphql/query/?query_hash=2c4c2e343a8f64c625ba02b2aa12c7f8&variables=%7B%22shortcode%22:%22${postShortCode}%22}`;

        GM_xmlhttpRequest({
            method: "GET",
            url: getURL,
            headers: {
                "User-Agent": "Mozilla/5.0 (Linux; Android 10; Pixel 7 XL)Build/RP1A.20845.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/5.0 Chrome/117.0.5938.60 Mobile Safari/537.36 Instagram 307.0.0.34.111"
            },
            onload: function (response) {
                try {
                    let obj = JSON.parse(response.response);
                    logger(obj);

                    if (obj.status === 'fail') {
                        // alert(`Request failed with API response:\n${obj.message}: ${obj.feedback_message}`);
                        logger('Request with:', 'getBlobMediaWithQuery()', postShortCode);
                        getBlobMediaWithQueryID(postShortCode).then((res) => {
                            resolve({ type: 'query_id', data: res.xdt_api__v1__media__shortcode__web_info.items[0] });
                        }).catch((err) => {
                            reject(err);
                        })
                    }
                    else {
                        resolve({ type: 'query_hash', data: obj.data });
                    }
                }
                catch (err) {
                    logger('getBlobMedia()', 'reject', err.message);
                    reject(err);
                }
            },
            onerror: function (err) {
                logger('getBlobMedia()', 'reject', err);
                reject(err);
            }
        });
    });
}

/**
 * getBlobMediaWithQueryID
 * @description Get list of all media files in post with post shortcode
 *
 * @param  {String}  postPath
 * @return {Object}
 */
export function getBlobMediaWithQueryID(postPath) {
    return new Promise((resolve, reject) => {
        if (!postPath) reject("NOPATH");
        let postShortCode = postPath;
        let getURL = `https://www.instagram.com/graphql/query/?query_id=9496392173716084&variables={%22shortcode%22:%22${postShortCode}%22,%22__relay_internal__pv__PolarisFeedShareMenurelayprovider%22:true,%22__relay_internal__pv__PolarisIsLoggedInrelayprovider%22:true}`;

        GM_xmlhttpRequest({
            method: "GET",
            url: getURL,
            headers: {
                "User-Agent": "Mozilla/5.0 (Linux; Android 10; Pixel 7 XL)Build/RP1A.20845.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/5.0 Chrome/117.0.5938.60 Mobile Safari/537.36 Instagram 307.0.0.34.111",
                'X-IG-App-ID': getAppID()
            },
            onload: function (response) {
                try {
                    let obj = JSON.parse(response.response);
                    logger(obj);

                    if (obj.status === 'fail') {
                        alert(`getBlobMediaWithQueryID(): Request failed with API response:\n${obj.message}: ${obj.feedback_message}`);
                        logger(`Request failed with API response ${obj.message}: ${obj.feedback_message}`);
                        reject(response);
                    }
                    else {
                        logger('getBlobMediaWithQueryID()', obj.data);
                        resolve(obj.data);
                    }
                }
                catch (err) {
                    logger('getBlobMediaWithQueryID()', 'reject', err.message);
                    reject(err);
                }
            },
            onerror: function (err) {
                logger('getBlobMediaWithQueryID()', 'reject', err);
                reject(err);
            }
        });
    });
}

/**
 * getMediaInfo
 * @description Get Instagram Media object
 *
 * @param  {String}  mediaId
 * @return {Object}
 */
export function getMediaInfo(mediaId) {
    return new Promise((resolve, reject) => {
        let getURL = `https://i.instagram.com/api/v1/media/${mediaId}/info/`;

        if (mediaId == null) {
            alert("Can not call Media API because of the media id is invalid.");
            logger('getMediaInfo()', 'reject', 'Can not call Media API because of the media id is invalid.');

            updateLoadingBar(false);
            reject(-1);
            return;
        }
        if (getAppID() == null) {
            alert("Can not call Media API because of the app id is invalid.");
            logger('getMediaInfo()', 'reject', 'Can not call Media API because of the app id is invalid.');
            updateLoadingBar(false);
            reject(-1);
            return;
        }

        GM_xmlhttpRequest({
            method: "GET",
            url: getURL,
            headers: {
                "User-Agent": window.navigator.userAgent,
                "Accept": "*/*",
                'X-IG-App-ID': getAppID()
            },
            onload: function (response) {
                if (response.finalUrl == getURL) {
                    let obj = JSON.parse(response.response);
                    logger('getMediaInfo()', obj);
                    resolve(obj);
                }
                else {
                    let finalURL = new URL(response.finalUrl);
                    if (finalURL.pathname.startsWith('/accounts/login')) {
                        logger('getMediaInfo()', 'reject', 'The account must be logged in to access Media API.');
                        alert("The account must be logged in to access Media API.");
                    }
                    else {
                        logger('getMediaInfo()', 'reject', 'Unable to retrieve content because the API was redirected to "' + response.finalUrl + '"');
                        alert('Unable to retrieve content because the API was redirected to "' + response.finalUrl + '"');
                    }
                    updateLoadingBar(false);
                    reject(-1);
                }
            },
            onerror: function (err) {
                logger('getMediaInfo()', 'reject', err);
                resolve(err);
            }
        });
    });
}