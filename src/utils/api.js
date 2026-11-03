import { userIdCache, webViewAgent, state, USER_SETTING, POST_CACHE_MAX_ITEMS } from "../settings";
import {
    logger, getAppID, getCookie, getLSD, getBloks, getDTSG, getSiteData, getJazoest,
    genWebSessionId
} from "./general";
import {
    reconcileOwnerFromApiResponse, isOwnerVerifiedThisSession, putUserIdInCache,
    markOwnerVerified, findUsernameByUserId, removeUserIdCacheEntry
} from "./cache";
import { filterResourceData } from "../functions/post";
/*! ESLINT IMPORT END !*/

/**
 * getHighlightStories
 * @description Get a list of all stories in highlight Id. A highlightId isn't a
 *              userId, so there's no "expected username" to check the request
 *              against before it's made (unlike getStoriesGraphQL/getStories). Once
 *              the response arrives, its owner is used to opportunistically
 *              validate/self-heal the username -> userId cache via
 *              reconcileOwnerFromApiResponse() — this never blocks or delays
 *              serving the resource, since the highlightId already fully
 *              determines the correct content on its own.
 *
 * @param  {Integer}  highlightId
 * @return {Object}
 */
export function getHighlightStories(highlightId) {
    return new Promise((resolve, reject) => {
        const getURL = `https://www.instagram.com/graphql/query`;

        const siteData = getSiteData();
        const formData = new FormData();

        formData.append('av', getCookie('ds_user_id') || '0');
        formData.append('fb_api_caller_class', 'RelayModern');
        formData.append('fb_api_req_friendly_name', 'PolarisStoriesV3HighlightsPageQuery');
        formData.append('server_timestamps', 'true');
        formData.append('doc_id', '29299425373007309'); // This is dynamic, but we can use this for now. It may break in the future.
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
        formData.append('__crn', 'comet.igweb.PolarisProfilePostsTabRoute');
        formData.append('__s', genWebSessionId());
        formData.append('variables', `{"initial_reel_id":"highlight:${highlightId}","reel_ids":["highlight:${highlightId}"],"first":999,"last":0,"__relay_internal__pv__PolarisCommunityNoteStoriesLabelEnabledrelayprovider":true}`);

        GM_xmlhttpRequest({
            method: "POST",
            url: getURL,
            data: formData,
            headers: {
                "User-Agent": webViewAgent,
                'X-IG-App-ID': getAppID() || '0',
                'X-Root-Field-Name': 'xdt_api__v1__feed__reels_media__connection',
                'X-CSRFToken': getCookie('csrftoken') || '',
                'X-Fb-Friendly-Name': 'PolarisStoriesV3HighlightsPageQuery',
                'X-Fb-Lsd': getLSD(),
                'X-Bloks-Version-ID': getBloks(),
                'X-Asbd-ID': '359341'
            },
            onload: async function (response) {
                try {
                    let obj = JSON.parse(response.response);
                    console.log(obj);

                    try {
                        const owner = obj?.data?.xdt_api__v1__feed__reels_media__connection?.edges?.[0]?.node?.user;
                        const ownerId = owner?.pk ?? owner?.id;
                        if (owner?.username && ownerId) {
                            await reconcileOwnerFromApiResponse(owner.username, ownerId);
                        }
                    }
                    catch (reconcileErr) {
                        logger('getHighlightStories()', 'owner reconciliation failed', reconcileErr);
                    }

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
 * @description Get a list of all stories in user Id. When expectedUsername is
 *              provided and hasn't been confirmed yet this session (see
 *              isOwnerVerifiedThisSession()), the resolved owner is checked
 *              against it; on disagreement the cached user id is refreshed live
 *              (see resolveUserIdLive()) and the request is retried once. On
 *              agreement, or once already verified this session, the mapping is
 *              trusted without re-checking until the tab is refreshed. Mirrors
 *              getStoriesGraphQL()'s owner-mismatch handling.
 *
 * @param  {Integer}  userId
 * @param  {String=}  expectedUsername - Optional owner-mismatch guard.
 * @param  {Boolean=} _retried         - Internal flag to prevent infinite retry loops.
 * @return {Object}
 */
export function getStories(userId, expectedUsername, _retried) {
    return new Promise((resolve, reject) => {
        const getURL = `https://www.instagram.com/graphql/query`;

        const siteData = getSiteData();
        const formData = new FormData();

        formData.append('av', getCookie('ds_user_id') || '0');
        formData.append('fb_api_caller_class', 'RelayModern');
        formData.append('fb_api_req_friendly_name', 'PolarisStoriesV3ReelPageStandaloneQuery');
        formData.append('server_timestamps', 'true');
        formData.append('doc_id', '29170422829314651'); // This is dynamic, but we can use this for now. It may break in the future.
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
        formData.append('__crn', 'comet.igweb.PolarisProfilePostsTabRoute');
        formData.append('__s', genWebSessionId());
        formData.append('variables', `{"reel_ids_arr":["${userId}"],"__relay_internal__pv__PolarisCommunityNoteStoriesLabelEnabledrelayprovider":true}`);

        GM_xmlhttpRequest({
            method: "POST",
            url: getURL,
            data: formData,
            headers: {
                "User-Agent": webViewAgent,
                'X-IG-App-ID': getAppID() || '0',
                'X-Root-Field-Name': 'xdt_api__v1__feed__reels_media',
                'X-CSRFToken': getCookie('csrftoken') || '',
                'X-Fb-Friendly-Name': 'PolarisStoriesV3ReelPageStandaloneQuery',
                'X-Fb-Lsd': getLSD(),
                'X-Bloks-Version-ID': getBloks(),
                'X-Asbd-ID': '359341'
            },
            onload: function (response) {
                try {
                    let obj = JSON.parse(response.response);
                    logger('getStories()', obj);

                    const reel = obj?.data?.xdt_api__v1__feed__reels_media?.reels_media?.[0];
                    const reelOwner = reel?.owner || reel?.user;

                    const ownerCheckNeeded =
                        !!expectedUsername &&
                        !_retried &&
                        !isOwnerVerifiedThisSession(expectedUsername);
                    const canCompareOwner = ownerCheckNeeded && !!reelOwner?.username;
                    const ownerMismatch = canCompareOwner && reelOwner.username.toLowerCase() !== expectedUsername.toLowerCase();

                    if (ownerMismatch) {
                        logger('getStories()', `owner mismatch: expected "${expectedUsername}", got "${reelOwner.username}" — refreshing id`);
                        resolveUserIdLive(expectedUsername).then((freshUserInfo) => {
                            const fresh = freshUserInfo?.user?.id ? freshUserInfo : null;

                            if (fresh && putUserIdInCache(expectedUsername, fresh.user.id)) {
                                userIdCache.set(expectedUsername, fresh);
                            }

                            if (fresh && String(fresh.user.id) !== String(userId)) {
                                getStories(String(fresh.user.id), expectedUsername, true).then(resolve, reject);
                            }
                            else {
                                reject('user_mismatch');
                            }
                        }).catch((err) => {
                            logger('getStories()', 'owner-mismatch refresh failed', err);
                            reject('user_mismatch');
                        });
                        return;
                    }

                    if (canCompareOwner) {
                        // Owner matched what we expected — this mapping is now
                        // confirmed for the rest of the tab session.
                        markOwnerVerified(expectedUsername);
                    }

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
 * getUserIdViaProfileHtml
 * @description Try to resolve a username from Instagram's profile HTML.
 * @param {String} username
 * @return {Promise<Object>}
 */
export async function getUserIdViaProfileHtml(username) {
    const normalized = (username || '').replace(/^@+/, '').trim().toLowerCase();

    if (!normalized) {
        throw new Error('No username provided');
    }

    const profileURL = new URL(
        `/${encodeURIComponent(normalized)}/`,
        'https://www.instagram.com'
    );

    const response = await fetch(profileURL.href, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'text/html' }
    });

    if (!response.ok) {
        throw new Error(`Profile HTML failed with HTTP ${response.status}`);
    }

    const html = await response.text();
    const finalURL = new URL(response.url || profileURL.href);
    const finalUsername = finalURL.pathname.split('/').filter(Boolean)[0] || '';

    // Reject a login/challenge redirect that happens to return HTTP 200.
    if (
        !/(^|\.)instagram\.com$/i.test(finalURL.hostname) ||
        finalUsername.toLowerCase() !== normalized
    ) {
        throw new Error('Profile HTML redirected away from the requested profile');
    }

    const doc = new DOMParser().parseFromString(html, 'text/html');

    const patterns = [
        /"profile_id"\s*:\s*"?(\d+)"?/,
        /"(?:logging_page_id|page_id)"\s*:\s*"profilePage_(\d+)"/,
        /"profilePage_(\d+)"/
    ];

    let id = null;

    for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) {
            id = match[1];
            break;
        }
    }

    if (!id) {
        const metaId = doc
            .querySelector('meta[property="instapp:owner_user_id"]')
            ?.getAttribute('content');

        if (/^\d+$/.test(metaId || '')) {
            id = metaId;
        }
    }

    if (!id) {
        throw new Error('Profile HTML did not contain a user ID');
    }

    const profilePicUrl =
        doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ??
        null;

    const result = {
        user: {
            id,
            pk: id,
            username: normalized,
            profile_pic_url: profilePicUrl
        }
    };

    logger('getUserIdViaProfileHtml()', result);
    return result;
}

/**
 * getUserIdFromPolarisSearchBoxRefetchableQuery
 * @description Resolve a username through PolarisSearchBoxRefetchableQuery.
 * @param {String} username
 * @return {Promise<Object>}
 */
async function getUserIdFromPolarisSearchBoxRefetchableQuery(username) {
    const normalized = (username || '').replace(/^@+/, '').trim().toLowerCase();

    if (!normalized) {
        throw new Error('No username provided');
    }

    // Doc ID can change when Instagram updates the query.
    const SEARCH_QUERY_DOC_ID = '27706427925724183';
    const friendlyName = 'PolarisSearchBoxRefetchableQuery';
    const lsd = getLSD();
    const dtsg = getDTSG();
    const apiURL = new URL('/graphql/query', window.location.origin);

    const variables = {
        data: {
            context: 'blended',
            include_reel: 'true',
            query: normalized,
            rank_token: '',
            search_surface: 'web_top_search'
        },
        hasQuery: true
    };

    const body = new URLSearchParams({
        __d: 'www',
        __user: '0',
        __a: '1',
        __req: '1',
        __comet_req: '7',
        fb_api_caller_class: 'RelayModern',
        fb_api_req_friendly_name: friendlyName,
        server_timestamps: 'true',
        doc_id: SEARCH_QUERY_DOC_ID,
        variables: JSON.stringify(variables)
    });

    if (dtsg) {
        body.set('fb_dtsg', dtsg);
        body.set('jazoest', getJazoest(dtsg));
    }

    if (lsd) {
        body.set('lsd', lsd);
    }

    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-FB-Friendly-Name': friendlyName
    };

    if (lsd) {
        headers['X-FB-LSD'] = lsd;
    }

    const response = await fetch(apiURL.href, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: body.toString()
    });

    const responseText = await response.text();
    let json;

    try {
        json = JSON.parse(responseText);
        // eslint-disable-next-line no-unused-vars
    } catch (err) {
        throw new Error(
            `Polaris search returned non-JSON (HTTP ${response.status})`
        );
    }

    if (!response.ok) {
        const apiError = json?.errors
            ?.map((error) => error?.message)
            .filter(Boolean)
            .join('; ');

        throw new Error(
            `Polaris search failed with HTTP ${response.status}` +
            (apiError ? `: ${apiError}` : '')
        );
    }

    const users =
        json?.data?.xdt_api__v1__fbsearch__topsearch_connection?.users;

    if (!Array.isArray(users) || users.length === 0) {
        throw new Error('Polaris search returned no users');
    }

    // Keep the existing behavior: prefer an exact match, otherwise use the first result.
    const result = users.find((item) =>
        item.user?.username?.toLowerCase() === normalized
    ) ?? users[0];

    if (!result?.user) {
        throw new Error('Polaris search result has no user');
    }

    const rawId = result.user.pk ?? result.user.id;

    if (!rawId) {
        throw new Error('Polaris search result has no user ID');
    }

    const id = String(rawId);
    const user = {
        ...result.user,
        id,
        pk: id
    };

    const userInfo = { ...result, user };

    logger('getUserIdFromPolarisSearchBoxRefetchableQuery()', userInfo);
    return userInfo;
}

/**
 * resolveUserIdLive
 * @description Resolve a username live, bypassing both caches.
 * Does not show an alert on failure.
 * @param {String} username
 * @return {Promise<Object>}
 */
export async function resolveUserIdLive(username) {
    let profileHtmlError;

    try {
        return await getUserIdViaProfileHtml(username);
    } catch (err) {
        profileHtmlError = err;
        logger(
            'resolveUserIdLive()',
            'profile HTML failed; trying Polaris search',
            err
        );
    }

    try {
        return await getUserIdFromPolarisSearchBoxRefetchableQuery(username);
    } catch (polarisSearchError) {
        const combinedError = new Error(
            'Both profile HTML and Polaris search failed'
        );
        combinedError.profileHtmlError = profileHtmlError;
        combinedError.polarisSearchError = polarisSearchError;

        logger('resolveUserIdLive()', 'both live methods failed', combinedError);
        throw combinedError;
    }
}

/**
 * getUserId
 * @description Orchestrator + caching multi-layer:
 * 1) in-memory Map
 * 2) persistent GM cache
 * 3) profile HTML
 * 4) Polaris GraphQL search
 *
 * @param {String} username
 * @return {Promise<Object>}
 */
export async function getUserId(username) {
    const normalizedUsername =
        (username || state.GL_username || '').toLowerCase();

    if (userIdCache.has(normalizedUsername)) {
        const cachedUserInfo = userIdCache.get(normalizedUsername);
        const cachedId =
            cachedUserInfo?.user?.pk ?? cachedUserInfo?.user?.id;

        if (cachedId && !findUsernameByUserId(cachedId, normalizedUsername)) {
            logger('getUserId()', 'return from cache:', cachedUserInfo);
            return cachedUserInfo;
        }

        logger(
            'getUserId()',
            `invalid in-memory mapping for @${normalizedUsername}; discarding`
        );
        userIdCache.delete(normalizedUsername);
    }

    const persistedId = state.GL_userIdCache?.[normalizedUsername];

    if (persistedId) {
        if (findUsernameByUserId(persistedId, normalizedUsername)) {
            logger(
                'getUserId()',
                `invalid duplicate mapping: @${normalizedUsername} -> ${persistedId}`
            );
            removeUserIdCacheEntry(normalizedUsername);
        } else {
            logger('getUserId()', 'return from persistent cache:', persistedId);

            const userInfo = {
                user: { id: persistedId, pk: persistedId },
                // This cache entry has not yet been confirmed against a live
                // content API response this session.
                _needsOwnerVerification: true
            };

            userIdCache.set(normalizedUsername, userInfo);
            return userInfo;
        }
    }

    try {
        const result = await resolveUserIdLive(normalizedUsername);
        const id = result.user.pk ?? result.user.id;

        if (putUserIdInCache(normalizedUsername, id)) {
            userIdCache.set(normalizedUsername, result);
        }

        return result;
    } catch (searchErr) {
        userIdCache.delete(normalizedUsername);
        logger('getUserId()', 'both live methods failed', searchErr);
        alert(
            'Cannot find user info from getUserId()\nDetails may be in the console.'
        );
        throw searchErr;
    }
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
                "User-Agent": webViewAgent,
                'X-IG-App-ID': getAppID() || '0',
                'X-CSRFToken': getCookie('csrftoken') || '',
                'X-Fb-Lsd': getLSD(),
                'X-Bloks-Version-ID': getBloks(),
                'X-Asbd-ID': '359341'
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

/**
 * getPolarisPostRootQuery
 * @description Resolve a post/reel through Instagram's PolarisPostRootQuery.
 * Include LSD/DTSG extraction and the current doc_id.
 *
 * @param {String} postPath - Instagram post/reel shortcode.
 * @return {Promise<{ type: 'polaris', data: Object }>}
 */
async function getPolarisPostRootQuery(postPath) {
    if (!postPath) throw new Error('NOPATH');

    // Doc ID (needs to be updated when Instagram rotates it)
    const IG_POST_ROOT_QUERY_DOC_ID = '27852811784380813';

    const lsd = getLSD();
    const dtsg = getDTSG();

    const apiURL = new URL('/graphql/query', window.location.origin);
    const variables = {
        shortcode: postPath,
        __relay_internal__pv__PolarisShortDramaEnabledrelayprovider: false,
        __relay_internal__pv__PolarisMultiCaptionCarouselEnabledrelayprovider: false
    };

    const body = new URLSearchParams({
        __d: 'www',
        __user: '0',
        __a: '1',
        __req: '1',
        __comet_req: '7',
        fb_dtsg: dtsg ?? '',
        lsd: lsd ?? '',
        jazoest: dtsg ? getJazoest(dtsg) : '',
        fb_api_caller_class: 'RelayModern',
        fb_api_req_friendly_name: 'PolarisPostRootQuery',
        server_timestamps: 'true',
        doc_id: IG_POST_ROOT_QUERY_DOC_ID,
        variables: JSON.stringify(variables)
    }).toString();

    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-FB-Friendly-Name': 'PolarisPostRootQuery',
        'X-ASBD-ID': '129477'
    };
    if (lsd) headers['X-FB-LSD'] = lsd;

    const response = await fetch(apiURL.href, {
        method: 'POST',
        credentials: 'include',
        headers,
        body
    });

    const responseText = await response.text();
    let json;
    try {
        json = JSON.parse(responseText);
        // eslint-disable-next-line no-unused-vars
    } catch (err) {
        throw new Error(`PolarisPostRootQuery returned non-JSON (${response.status})`);
    }

    logger('getPolarisPostRootQuery()', postPath, json);

    if (!response.ok) {
        throw new Error(`PolarisPostRootQuery failed with HTTP ${response.status}`);
    }

    const item = json?.data?.xdt_api__v1__media__shortcode__web_info?.items?.[0];
    if (!item) {
        throw new Error('PolarisPostRootQuery returned no media item');
    }

    return { type: 'polaris', data: item };
}

/**
 * extractMediaIdsFromLegacyQueryHash
 * @description Extract the media IDs exposed by the legacy shortcode_media
 *              response. The IDs are used as a discovery/ordering hint for the
 *              Polaris path; PolarisPostRootQuery itself is shortcode-scoped.
 *
 * @param  {Object} data
 * @return {String[]}
 */
function extractMediaIdsFromLegacyQueryHash(data) {
    const resource = filterResourceData(data || {});
    const ids = [];

    const pushId = (value) => {
        if (value == null) return;
        const id = String(value);
        if (id && !ids.includes(id)) ids.push(id);
    };

    if (resource.carousel_media && Array.isArray(resource.carousel_media)) {
        resource.carousel_media.forEach((item) => pushId(item.pk ?? item.id));
    }

    if (resource.edge_sidecar_to_children?.edges) {
        resource.edge_sidecar_to_children.edges.forEach((edge) => {
            const node = edge?.node;
            pushId(node?.id ?? node?.pk);
        });
    }

    pushId(resource.pk ?? resource.id);
    return ids;
}

/**
 * getPostMediaWithProvider
 * @description Resolve post/reel media through the selected provider. When the
 *              Polaris setting is disabled this preserves the legacy path.
 *              With DIRECT_DOWNLOAD_ALL, QueryID is used only to discover media
 *              IDs; media URLs are still resolved by PolarisPostRootQuery.
 *
 *              Every path funnels through here (this is the single call site for
 *              PolarisPostRootQuery/getBlobMediaWithQueryID/getBlobMediaWithQueryHash
 *              from createMediaListDOM and onReels), so once a result is obtained
 *              its owner is used to opportunistically validate/self-heal the
 *              username -> userId cache via reconcileOwnerFromApiResponse(). Shortcode
 *              posts/reels have no "expected username" known ahead of the request
 *              (unlike getStoriesGraphQL/getStories), so this never blocks or delays
 *              serving the resource — the shortcode already fully determines the
 *              correct content on its own.
 *
 * @param  {String}  postPath
 * @param  {{discoverMediaIds?: Boolean}} options
 * @return {Promise<{ type: 'polaris'|'query_id'|'query_hash', data: Object, mediaIds?: String[] }>}
 */
export async function getPostMediaWithProvider(postPath, options = {}) {
    if (state.GL_dataCache.posts && state.GL_dataCache.posts[postPath]) {
        logger('getPostMediaWithProvider() Fetch from memory cache:', postPath);
        return state.GL_dataCache.posts[postPath];
    }

    let result;

    if (!USER_SETTING.FORCE_POLARIS_POST_ROOT_QUERY_FOR_POSTS_AND_REELS) {
        result = await getMediaList(postPath);
    }
    else {
        let discoveredMediaIds = null;

        if (options.discoverMediaIds) {
            try {
                const queryIdResult = await getMediaList(postPath);

                const queryIdResource = queryIdResult?.data;

                if (queryIdResource) {
                    discoveredMediaIds = extractMediaIdsFromLegacyQueryHash(queryIdResource);
                }

                logger('[PolarisPostRootQuery] query_id media-id discovery', {
                    postPath,
                    mediaIds: discoveredMediaIds
                });
            }
            catch (err) {
                // QueryID is discovery-only here. Polaris remains the authoritative
                // source for media URLs, so a failed discovery request must not prevent
                // the Polaris request from being attempted.
                logger(
                    '[PolarisPostRootQuery] query_id discovery failed; continuing with Polaris',
                    postPath,
                    err
                );
            }
        }

        result = await getPolarisPostRootQuery(postPath);

        if (discoveredMediaIds?.length) {
            const resource = filterResourceData(result.data);
            const idSet = new Set(discoveredMediaIds);

            if (Array.isArray(resource.carousel_media)) {
                const matching = resource.carousel_media.filter((item) =>
                    idSet.has(String(item.pk ?? item.id))
                );

                if (matching.length) {
                    resource.carousel_media = matching;
                }
            }

            if (resource.edge_sidecar_to_children?.edges) {
                const matchingEdges = resource.edge_sidecar_to_children.edges.filter((edge) => {
                    const node = edge?.node;

                    return idSet.has(String(node?.id ?? node?.pk));
                });

                if (matchingEdges.length) {
                    resource.edge_sidecar_to_children.edges = matchingEdges;
                }
            }

            result.mediaIds = discoveredMediaIds;
        }
    }

    try {
        const resource = filterResourceData(result.data);
        const ownerId = resource.owner?.pk ?? resource.owner?.id;

        if (resource.owner?.username && ownerId) {
            await reconcileOwnerFromApiResponse(resource.owner.username, ownerId);
        }
    }
    catch (err) {
        logger('getPostMediaWithProvider()', 'owner reconciliation failed', err);
    }

    if (state.GL_dataCache.posts && postPath) {
        // Keep the session cache bounded (oldest entry first)
        const cachedPostKeys = Object.keys(state.GL_dataCache.posts);
        if (cachedPostKeys.length >= POST_CACHE_MAX_ITEMS) {
            delete state.GL_dataCache.posts[cachedPostKeys[0]];
        }
        state.GL_dataCache.posts[postPath] = result;
    }

    return result;
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
 * getStoriesGraphQL
 * @description Fetch a Stories or Highlights tray through Instagram's current
 *              Polaris GraphQL query and normalize its response for existing
 *              story download handlers.
 *
 * @param  {String}   reelId           - Numeric user id or `highlight:{id}`.
 * @param  {String=}  expectedUsername - Optional owner-mismatch guard.
 * @param  {Boolean=} _retried         - Internal retry guard.
 * @return {Promise<Object>}
 */
export async function getStoriesGraphQL(reelId, expectedUsername, _retried) {
    const isHighlight = String(reelId).startsWith('highlight:');
    const friendlyName = isHighlight
        ? 'PolarisStoriesV3HighlightsPageQuery'
        : 'PolarisStoriesV3ReelPageGalleryQuery';
    const docId = isHighlight ? '28325328583775973' : '28262315486766731';
    const tokens = {
        lsd: getLSD(),
        dtsg: getDTSG() || document.querySelector('input[name="fb_dtsg"]')?.value || null
    };

    const variables = {
        initial_reel_id: String(reelId),
        reel_ids: [String(reelId)],
        first: 3,
        last: 2,
        __relay_internal__pv__PolarisCommunityNoteStoriesLabelEnabledrelayprovider: true
    };
    const body = new URLSearchParams({
        __d: 'www',
        __user: '0',
        __a: '1',
        __req: '1',
        __comet_req: '7',
        fb_api_caller_class: 'RelayModern',
        fb_api_req_friendly_name: friendlyName,
        server_timestamps: 'true',
        doc_id: docId,
        variables: JSON.stringify(variables)
    });

    if (tokens.dtsg) {
        body.set('fb_dtsg', tokens.dtsg);
        body.set('jazoest', getJazoest(tokens.dtsg));
    }

    if (tokens.lsd) {
        body.set('lsd', tokens.lsd);
    }

    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-FB-Friendly-Name': friendlyName
    };

    if (tokens.lsd) {
        headers['X-FB-LSD'] = tokens.lsd;
    }

    const apiURL = new URL('/graphql/query', window.location.origin);
    const response = await fetch(apiURL.href, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: body.toString()
    });

    let responseText = await response.text();
    responseText = responseText.replace(/^\s*for\s*\(\s*;;\s*\)\s*;\s*/, '');

    let json;
    try {
        json = JSON.parse(responseText);
    }
    // eslint-disable-next-line no-unused-vars
    catch (parseError) {
        throw new Error(`Stories GraphQL returned non-JSON (HTTP ${response.status})`);
    }

    if (!response.ok || json?.errors?.length) {
        const apiError = json?.errors
            ?.map((error) => error?.message)
            .filter(Boolean)
            .join('; ');
        throw new Error(
            `Stories GraphQL failed with HTTP ${response.status}` +
            (apiError ? `: ${apiError}` : '')
        );
    }

    const connection = json?.data?.['xdt_api__v1__feed__reels_media__connection'];
    const node = connection?.edges?.[0]?.node;

    if (!node || !Array.isArray(node.items)) {
        throw new Error('Stories GraphQL response did not contain a reel node with items');
    }

    const rawOwner = node.user || node.owner || {};
    const owner = {
        ...rawOwner,
        id: rawOwner.id ?? rawOwner.pk,
        pk: rawOwner.pk ?? rawOwner.id
    };
    const reel = {
        ...node,
        id: node.id ?? owner.pk ?? owner.id ?? String(reelId),
        items: node.items.map(normalizeReelsMediaItem),
        owner,
        user: owner
    };

    const ownerCheckNeeded =
        !!expectedUsername &&
        !isHighlight &&
        !_retried &&
        !isOwnerVerifiedThisSession(expectedUsername);
    const canCompareOwner = ownerCheckNeeded && !!owner.username;
    const ownerMismatch =
        canCompareOwner &&
        owner.username.toLowerCase() !== expectedUsername.toLowerCase();

    if (ownerMismatch) {
        logger(
            'getStoriesGraphQL()',
            `owner mismatch: expected "${expectedUsername}", got "${owner.username}" — refreshing id`
        );
        const freshUserInfo = await resolveUserIdLive(expectedUsername);
        const freshId = freshUserInfo?.user?.pk ?? freshUserInfo?.user?.id;

        if (freshId && putUserIdInCache(expectedUsername, freshId)) {
            userIdCache.set(expectedUsername.toLowerCase(), freshUserInfo);
        }

        if (freshId && String(freshId) !== String(reelId)) {
            return getStoriesGraphQL(String(freshId), expectedUsername, true);
        }

        throw new Error('Stories GraphQL returned a different user than requested');
    }

    if (canCompareOwner) {
        markOwnerVerified(expectedUsername);
    }

    const result = {
        data: {
            reels_media: [reel],
            xdt_api__v1__feed__reels_media: { reels_media: [reel] },
            xdt_api__v1__feed__reels_media__connection: { edges: [{ node: reel }] }
        }
    };
    logger('getStoriesGraphQL()', reelId, result);
    return result;
}

/**
 * normalizeReelsMediaItem
 * @description Bridge a Instagram Stories GraphQL item (image_versions2 / video_versions /
 *              pk / taken_at schema) into the shape older code paths expect
 *              (display_resources / video_resources / id / taken_at_timestamp /
 *              is_video). Non-destructive: returns a shallow copy augmented with
 *              the synthesized fields, leaving the original untouched.
 *
 * @param  {Object}  item - Raw reels_media item from getStoriesGraphQL().
 * @return {Object}        Normalized item safe to pass to legacy helpers.
 */
function normalizeReelsMediaItem(item) {
    if (!item) return item;

    const id = item.pk ?? item.id;
    const candidates = item.image_versions2?.candidates || [];
    const imageUrl = candidates[0]?.url || item.display_url || item.display_resources?.[0]?.src || '';
    const videoUrl = item.video_versions?.[0]?.url || item.video_resources?.[0]?.src || '';

    const displayResources = item.display_resources?.length
        ? item.display_resources
        : (candidates.length
            ? candidates.map(c => ({ src: c.url, config_width: c.width ?? 0 }))
            : (imageUrl ? [{ src: imageUrl, config_width: 0 }] : []));

    const videoResources = item.video_resources?.length
        ? item.video_resources
        : (videoUrl ? [{ src: videoUrl }] : []);

    return Object.assign({}, item, {
        id,
        pk: id,
        is_video: item.is_video ?? (item.media_type != null ? item.media_type !== 1 : !!(videoUrl || item.video_dash_manifest)),
        taken_at_timestamp: item.taken_at_timestamp ?? item.taken_at ?? Math.floor(Date.now() / 1000),
        display_url: item.display_url || imageUrl,
        image_versions2: item.image_versions2 || (imageUrl ? { candidates: [{ url: imageUrl, width: 0, height: 0 }] } : item.image_versions2),
        video_versions: item.video_versions || (videoUrl ? [{ url: videoUrl, width: 0, height: 0 }] : item.video_versions),
        display_resources: displayResources,
        video_resources: videoResources,
        owner: item.owner || item.user,
        user: item.user || item.owner
    });
}

/**
 * isReelsMediaVideo
 * @description Determine whether a Instagram Stories GraphQL item is a video.
 *              Media type is decided from the API item itself; image cache
 *              presence must never be used to infer the media type.
 *
 * @param  {Object} item
 * @return {Boolean}
 */
export function isReelsMediaVideo(item) {
    if (!item) return false;
    if (item.is_video === true) return true;
    if (item.is_video === false) return false;
    if (item.video_versions?.length) return true;
    if (item.video_resources?.length) return true;
    if (item.video_dash_manifest) return true;
    if (item.media_type != null) return item.media_type !== 1;
    return false;
}