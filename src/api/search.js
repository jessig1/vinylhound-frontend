import { post, get, authHeaders } from "./client.js";

/**
 * Search for music across Spotify
 * @param {string} query - The search query
 * @param {string} type - Type of search: "artist", "album", "track", or "all"
 * @param {number} limit - Maximum number of results (default: 20)
 * @param {boolean} storeResults - Whether to store results in database (default: false)
 * @param {Object} [options] - Additional request options
 * @param {string} [options.token] - Auth token for the request
 * @param {Object} [options.headers] - Additional headers to merge into the request
 * @returns {Promise<{artists: Array, albums: Array, tracks: Array}>}
 */
export async function searchMusic(query, type = "all", limit = 20, storeResults = false, options = {}) {
  console.log(`[Search API] Searching for "${query}" (type: ${type}, limit: ${limit})`);

  const { token, headers: extraHeaders } = options ?? {};
  const headers = {
    ...(extraHeaders || {}),
    ...(token ? authHeaders(token) : {}),
  };

  const response = await post(
    "/v1/search",
    {
      query,
      type,
      provider: "spotify",
      limit,
      store_results: storeResults,
    },
    {
      headers: Object.keys(headers).length ? headers : undefined,
    }
  );

  console.log(`[Search API] Search results:`, response);
  return response;
}

/**
 * Import a complete album from Spotify
 * @param {string} albumId - The Spotify album ID
 * @returns {Promise<{message: string}>}
 */
export async function importAlbum(albumId) {
    console.log(`[Search API] Importing album ${albumId}`);

    const response = await post('/v1/import/album', {
        album_id: albumId,
        provider: "spotify"
    });

    console.log(`[Search API] Import response:`, response);
    return response;
}

/**
 * Get list of available music providers
 * @returns {Promise<{providers: Array}>}
 */
export async function getProviders() {
    return await get('/v1/providers');
}

/**
 * Get full artist details with all albums from Spotify
 * @param {string} artistId - The Spotify artist ID
 * @returns {Promise<{artist: Object, albums: Array}>}
 */
export async function getArtistDetails(artistId) {
    console.log(`[Search API] Getting artist details for ${artistId}`);

    const response = await get(`/v1/artist?id=${artistId}`);

    console.log(`[Search API] Artist details:`, response);
    return response;
}

/**
 * Get full album details with all tracks from Spotify
 * @param {string} albumId - The Spotify album ID
 * @returns {Promise<{album: Object, tracks: Array}>}
 */
export async function getAlbumDetails(albumId) {
    console.log(`[Search API] Getting album details for ${albumId}`);

    const response = await get(`/v1/album/details?id=${albumId}`);

    console.log(`[Search API] Album details:`, response);
    return response;
}
