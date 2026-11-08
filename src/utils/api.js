import { userIdCache, state, POST_CACHE_MAX_ITEMS } from "../settings";
import {
    logger, getAppID, getCookie, getLSD, getBloks, getDTSG, getSiteData, getJazoest,
    genWebSessionId,
    getHasteBitMapParams
} from "./general";
import {
    reconcileOwnerFromApiResponse, isOwnerVerifiedThisSession, putUserIdInCache,
    markOwnerVerified, findUsernameByUserId, removeUserIdCacheEntry
} from "./cache";
import { filterResourceData } from "../functions/post";
import { initPersistentCache } from "./persistent_cache";
/*! ESLINT IMPORT END !*/

/**
 * getHighlightStories
 * @description Get a list of all stories in highlight Id. A highlightId isn't a
 *              userId, so there's no "expected username" to check the request
 *              against before it's made (unlike getStories). Once
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
        const api = buildGraphQLData(
            '29299425373007309',
            {
                "initial_reel_id": `highlight:${highlightId}`,
                "reel_ids": [`highlight:${highlightId}`],
                "first": 999,
                "last": 0,
                "__relay_internal__pv__PolarisCommunityNoteStoriesLabelEnabledrelayprovider": true
            },
            "PolarisStoriesV3HighlightsPageQuery",
            "comet.igweb.PolarisProfilePostsTabRoute",
            "xdt_api__v1__feed__reels_media__connection"
        );

        GM_xmlhttpRequest({
            method: "POST",
            url: api.url,
            data: api.body,
            headers: api.headers,
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
 *              trusted without re-checking until the tab is refreshed.
 *
 * @param  {Integer}  userId
 * @param  {String=}  expectedUsername - Optional owner-mismatch guard.
 * @param  {Boolean=} _retried         - Internal flag to prevent infinite retry loops.
 * @return {Object}
 */
export function getStories(userId, expectedUsername, _retried) {
    return new Promise((resolve, reject) => {
        const api = buildGraphQLData(
            "29170422829314651",
            {
                "reel_ids_arr": [userId],
                "__relay_internal__pv__PolarisCommunityNoteStoriesLabelEnabledrelayprovider": true
            },
            "PolarisStoriesV3ReelPageStandaloneQuery",
            "comet.igweb.PolarisProfilePostsTabRoute",
            "xdt_api__v1__feed__reels_media"
        );

        GM_xmlhttpRequest({
            method: "POST",
            url: api.url,
            data: api.body,
            headers: api.headers,
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
                            const freshId = freshUserInfo?.user?.pk ?? freshUserInfo?.user?.id;

                            if (freshId && putUserIdInCache(expectedUsername, freshId)) {
                                userIdCache.set(expectedUsername.toLowerCase(), freshUserInfo);
                            }

                            if (freshId && String(freshId) !== String(userId)) {
                                getStories(String(freshId), expectedUsername, true).then(resolve, reject);
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
 * 2) persistent cache (IndexedDB)
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

    // Make sure the persistent cache is loaded before falling through to a live lookup.
    await initPersistentCache();
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
        const api = buildGraphQLData(
            "40158838120366999",
            {
                "enable_integrity_filters": true,
                "id": userId,
                "__relay_internal__pv__PolarisCannesGuardianExperienceEnabledrelayprovider": true,
                "__relay_internal__pv__PolarisCASB976ProfileEnabledrelayprovider": false,
                "__relay_internal__pv__PolarisProfileInformTreatmentBannerEnabledrelayprovider": false,
                "__relay_internal__pv__PolarisWebSchoolsEnabledrelayprovider": false,
                "__relay_internal__pv__PolarisProfileRingsGradientEnabledrelayprovider": true,
                "__relay_internal__pv__PolarisRepostsConsumptionEnabledrelayprovider": true,
                "__relay_internal__pv__PolarisShortDramaEnabledrelayprovider": true
            },
            "PolarisProfilePageContentQuery",
            "comet.igweb.PolarisExploreRoute",
            null
        );

        GM_xmlhttpRequest({
            method: "POST",
            url: api.url,
            data: api.body,
            headers: api.headers,
            onload: function (response) {
                try {
                    let obj = JSON.parse(response.response);
                    logger('getUserHighSizeProfile()', obj);
                    resolve(obj.data.user.hd_profile_pic_url_info?.url);
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
 * getPostMediaWithProvider
 * @description Unified aggregation point for post resources.
 *
 * @param  {String}  postPath
 * @return {Promise<{ type: 'GraphQL', data: Object }>}
 */
export async function getPostMediaWithProvider(postPath) {
    if (state.GL_dataCache.posts && state.GL_dataCache.posts[postPath]) {
        logger('getPostMediaWithProvider() Fetch from memory cache:', postPath);
        return state.GL_dataCache.posts[postPath];
    }

    let result = await getMediaList(postPath);

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
        const api = buildGraphQLData(
            '39422285384081769',
            {
                "shortcode": postPath,
                "__relay_internal__pv__PolarisShortDramaEnabledrelayprovider": true,
                "__relay_internal__pv__PolarisThreadsStyleCommentsEnabledrelayprovider": false,
                "__relay_internal__pv__PolarisMultiCaptionCarouselEnabledrelayprovider": true
            },
            'PolarisPostRootQuery',
            'comet.igweb.PolarisFeedRoute',
            'xdt_api__v1__media__shortcode__web_info'
        );

        GM_xmlhttpRequest({
            method: "POST",
            url: api.url,
            data: api.body,
            headers: api.headers,
            onload: function (response) {
                try {
                    let obj = JSON.parse(response.response);
                    logger("getMediaList()", obj);

                    resolve({ type: 'GraphQL', data: obj.data.xdt_api__v1__media__shortcode__web_info.items[0] });
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


export function buildGraphQLData(docId, variables, friendlyName, crn, rootName) {
    const siteData = getSiteData();
    const hasteData = getHasteBitMapParams();
    logger('buildGraphQLData', { docId, variables, friendlyName, crn, rootName, siteData, hasteData });

    let body = {
        av: getCookie('ds_user_id') || '0',
        fb_api_caller_class: 'RelayModern',
        fb_api_req_friendly_name: friendlyName,
        server_timestamps: 'true',
        doc_id: docId,
        lsd: getLSD(),
        fb_dtsg: getDTSG(),
        __hs: siteData?.haste_session || '',
        __hsi: siteData?.hsi || '',
        __rev: siteData?.client_revision || '',
        __spin_r: siteData?.__spin_r || '',
        __spin_b: siteData?.__spin_b || '',
        __spin_t: siteData?.__spin_t || '',
        __comet_req: siteData?.comet_env || '',
        ...hasteData,
        __ccg: 'EXCELLENT',
        dpr: '3',
        jazoest: getJazoest(getDTSG()),
        __user: '0',
        __a: '1',
        __d: 'www',
        __req: '1',
        __s: genWebSessionId(),
        variables: JSON.stringify(variables)
    };

    if (crn) {
        body.__crn = crn;
    }

    let headers = {
        // "User-Agent": webViewAgent,
        'Dpr': '3',
        'Sec-Ch-Dpr': '3',
        'Viewport-Width': '3840',
        'Sec-Ch-Viewport-Width': '3840',
        'X-IG-App-ID': getAppID() || '0',
        'X-CSRFToken': getCookie('csrftoken') || '',
        'X-Fb-Friendly-Name': friendlyName,
        'X-Fb-Lsd': getLSD(),
        'X-Bloks-Version-ID': getBloks(),
        'X-Asbd-ID': '359341'
    };

    if (rootName) {
        headers['X-Root-Field-Name'] = rootName;
    }

    const formData = new FormData();

    for (const [key, value] of Object.entries(body)) {
        formData.append(key, value);
    }

    return {
        url: new URL('/graphql/query', window.location.origin).href,
        body: formData,
        headers
    };
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