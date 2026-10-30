import { $ } from "jquery";
import { userIdCache, webViewAgent } from "../settings";
import { logger, getAppID, updateLoadingBar, getCookie, getLSD, getBloks, getDTSG, getSiteData, getJazoest, genWebSessionId } from "./general";
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
        const getURL = `https://www.instagram.com/graphql/query/?query_hash=45246d3fe16ccc6577e0bd297a5db1ab&variables=%7B%22highlight_reel_ids%22:%5B%22${highlightId}%22%5D,%22precomposed_overlay%22:false%7D`;

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
        const getURL = `https://www.instagram.com/graphql/query/?query_hash=15463e8449a83d3d60b06be7e90627c7&variables=%7B%22reel_ids%22:%5B%22${userId}%22%5D,%22precomposed_overlay%22:false%7D`;

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

export async function getUserIdViaProfileHtml(username) {
    const res = await fetch(`https://www.instagram.com/${encodeURIComponent(username)}/`, {
        credentials: 'include',
        headers: { 'Accept': 'text/html' }
    });
    if (!res.ok) throw new Error('profile html HTTP ' + res.status);
    const html = await res.text();

    const patterns = [
        /"profile_id":"(\d+)"/,
        /"page_id":"profilePage_(\d+)"/,
        /instapp:owner_user_id"\s+content="(\d+)"/
    ];
    let id = null;
    for (const re of patterns) {
        const m = html.match(re);
        if (m) { id = m[1]; break; }
    }
    if (!id) throw new Error('profile html: no id found');

    const og = html.match(/property="og:image"\s+content="([^"]+)"/)?.[1]?.replace(/&amp;/g, '&') || null;
    return { user: { pk: id, id, username, profile_pic_url: og } };
}

/**
 * getUserId
 * @description Get user's id with username.
 *
 * @param  {String}  username
 * @return {Promise<Integer>}
 */
export function getUserId(username) {
    return new Promise((resolve, reject) => {
        if (userIdCache.has(username)) {
            logger('getUserId()', 'return from cache:', userIdCache.get(username));
            resolve(userIdCache.get(username));
            return;
        }

        let getURL = `https://www.instagram.com/web/search/topsearch/?query=${username}`;

        GM_xmlhttpRequest({
            method: "GET",
            url: getURL,
            onload: function (response) {
                try {
                    // Fix search issue by Discord: sno_w_
                    let obj = JSON.parse(response.response);
                    let result = null;
                    (obj.users ?? []).forEach(pos => {
                        if (pos.user.username?.toLowerCase() === username?.toLowerCase()) {
                            result = pos;
                        }
                    });

                    if (result != null) {
                        logger('getUserId()', result);
                        userIdCache.set(username, result);
                        resolve(result);
                    }
                    else {
                        getUserIdViaProfileHtml(username).then((result) => {
                            userIdCache.set(username, result);
                            resolve(result);
                            // eslint-disable-next-line no-unused-vars
                        }).catch((err) => {
                            userIdCache.delete(username);
                            logger('getUserId()', 'fallback reject', err);
                            alert("Cannot find user info from getUserId()\nDetails may be in the console.");
                            reject(err);
                        });
                    }
                    // eslint-disable-next-line no-unused-vars
                } catch (err) {
                    getUserIdViaProfileHtml(username).then((result) => {
                        userIdCache.set(username, result);
                        resolve(result);
                        // eslint-disable-next-line no-unused-vars
                    }).catch((err) => {
                        userIdCache.delete(username);
                        logger('getUserId()', 'fallback reject', err);
                        alert("Cannot find user info from getUserId()\nDetails may be in the console.");
                        reject(err);
                    });
                }
            },
            onerror: function (err) {
                logger('getUserId()', 'reject', err);
                userIdCache.delete(username);
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
        const getURL = `https://www.instagram.com/api/v1/users/${userId}/info/`;

        GM_xmlhttpRequest({
            method: "GET",
            url: getURL,
            headers: {
                'User-Agent': webViewAgent,
                'X-IG-App-ID': getAppID()
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
 * @description Get post's author with post shortcode.
 *
 * @param  {String}  postPath
 * @return {String}
 */
export function getPostOwner(postPath) {
    return new Promise((resolve, reject) => {
        if (!postPath) reject("NOPATH");
        const postShortCode = postPath;
        const getURL = `https://www.instagram.com/graphql/query/?query_hash=2c4c2e343a8f64c625ba02b2aa12c7f8&variables=%7B%22shortcode%22:%22${postShortCode}%22}`;

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


export function getMediaList(postPath) {
    return new Promise((resolve, reject) => {
        if (!postPath) reject("NOPATH");
        const getURL = `https://www.instagram.com/graphql/query`;

        const siteData = getSiteData();
        const formData = new FormData();

        formData.append('av', getCookie('ds_user_id') || '0');
        formData.append('fb_api_caller_class', 'RelayModern');
        formData.append('fb_api_req_friendly_name', 'PolarisPostRootQuery');
        formData.append('server_timestamps', 'true');
        formData.append('doc_id', '39422285384081769'); // This is dynamic, but we can use this for now. It may break in the future.
        formData.append('lsd', getLSD());
        formData.append('fb_dtsg', getDTSG());
        formData.append('__hs', siteData?.haste_session || '');
        formData.append('__hsi', siteData?.hsi || '');
        formData.append('__rev', siteData?.client_revision || '');
        formData.append('__spin_r', siteData?.__spin_r || '');
        formData.append('__spin_b', siteData?.__spin_b || '');
        formData.append('__spin_t', siteData?.__spin_t || '');
        formData.append('__comet_req', siteData?.comet_env || '');
        formData.append('__ccg', 'EXCELLENT');
        formData.append('dpr', siteData?.pr);
        formData.append('jazoest', getJazoest(getDTSG()));
        formData.append('__user', '0');
        formData.append('__a', '1');
        formData.append('__d', 'www');
        formData.append('__req', '1');
        formData.append('__crn', 'comet.igweb.PolarisFeedRoute');
        formData.append('__s', genWebSessionId());
        formData.append('variables', `{"shortcode":"${postPath}","__relay_internal__pv__PolarisShortDramaEnabledrelayprovider":true,"__relay_internal__pv__PolarisThreadsStyleCommentsEnabledrelayprovider":false,"__relay_internal__pv__PolarisMultiCaptionCarouselEnabledrelayprovider":true}`);

        GM_xmlhttpRequest({
            method: "POST",
            url: getURL,
            data: formData,
            headers: {
                "User-Agent": webViewAgent,
                'X-IG-App-ID': getAppID() || '0',
                'X-Root-Field-Name': 'xdt_api__v1__media__shortcode__web_info',
                'X-CSRFToken': getCookie('csrftoken') || '',
                'X-Fb-Friendly-Name': 'PolarisPostRootQuery',
                'X-Fb-Lsd': getLSD(),
                'X-Bloks-Version-ID': getBloks(),
                'X-Asbd-ID': '359341'
            },
            onload: function (response) {
                try {
                    let obj = JSON.parse(response.response);
                    logger("getMediaList()", obj);

                    resolve({ type: 'query_id', data: obj.data.xdt_api__v1__media__shortcode__web_info.items[0] });
                }
                catch (err) {
                    logger('getMediaList()', 'reject', err.message);
                    reject(err);
                }
            },
            onerror: function (err) {
                logger('getMediaList()', 'reject', err);
                reject(err);
            }
        });
    });
}

/**
 * getBlobMedia
 * @description Get list of all media files in post with post shortcode.
 * @deprecated Use getMediaList() instead.
 *
 * @param  {String}  postPath
 * @return {Object}
 */
export function getBlobMedia(postPath) {
    return new Promise((resolve, reject) => {
        if (!postPath) reject("NOPATH");
        const postShortCode = postPath;
        const getURL = `https://www.instagram.com/graphql/query/?query_hash=2c4c2e343a8f64c625ba02b2aa12c7f8&variables=%7B%22shortcode%22:%22${postShortCode}%22}`;

        GM_xmlhttpRequest({
            method: "GET",
            url: getURL,
            headers: {
                "User-Agent": webViewAgent,
                'X-IG-App-ID': getAppID()
            },
            onload: function (response) {
                try {
                    let obj = JSON.parse(response.response);
                    logger("getBlobMedia()", obj);

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
 * @description Get list of all media files in post with post shortcode.
 * @deprecated Use getMediaList() instead.
 *
 * @param  {String}  postPath
 * @return {Object}
 */
export function getBlobMediaWithQueryID(postPath) {
    return new Promise((resolve, reject) => {
        if (!postPath) reject("NOPATH");
        const postShortCode = postPath;
        const getURL = `https://www.instagram.com/graphql/query/?query_id=9496392173716084&variables={%22shortcode%22:%22${postShortCode}%22,%22__relay_internal__pv__PolarisFeedShareMenurelayprovider%22:true,%22__relay_internal__pv__PolarisIsLoggedInrelayprovider%22:true}`;

        GM_xmlhttpRequest({
            method: "GET",
            url: getURL,
            headers: {
                "User-Agent": webViewAgent,
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
 * @description Get Instagram Media object.
 *
 * @param  {String}  mediaId
 * @return {Object}
 */
export function getMediaInfo(mediaId) {
    return new Promise((resolve, reject) => {
        const getURL = `https://i.instagram.com/api/v1/media/${mediaId}/info/`;

        if (mediaId == null) {
            alert("Cannot call Media API because of the media id is invalid.");
            logger('getMediaInfo()', 'reject', 'Cannot call Media API because of the media id is invalid.');

            updateLoadingBar(false);
            reject(-1);
            return;
        }
        if (getAppID() == null) {
            alert("Cannot call Media API because of the app id is invalid.");
            logger('getMediaInfo()', 'reject', 'Cannot call Media API because of the app id is invalid.');
            updateLoadingBar(false);
            reject(-1);
            return;
        }

        GM_xmlhttpRequest({
            method: "GET",
            url: getURL,
            headers: {
                "User-Agent": webViewAgent,
                'X-IG-App-ID': getAppID() || '0',
                'X-CSRFToken': getCookie('csrftoken') || '',
                'X-Asbd-ID': '359341',
                'X-Ig-Max-Touch-Points': '0',
                'X-Requested-With': 'XMLHttpRequest',
                'X-Ig-Www-Claim': sessionStorage.getItem('www-claim-v2') || '0',
                'X-Web-Session-Id': genWebSessionId()
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