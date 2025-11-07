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
      headers,
    }
  );

  console.log(`[Search API] Search results:`, response);
  return response;
}

/**
 * Import a complete album from Spotify into the authenticated user's library
 * @param {string} albumId - The Spotify album ID
 * @param {Object} [options]
 * @param {string} [options.token] - Auth token for the user performing the import
 * @param {string} [options.provider="spotify"] - Music provider identifier
 * @returns {Promise<{message: string}>}
 */
export async function importAlbum(albumId, options = {}) {
  const { token, provider = "spotify", headers: extraHeaders } = options ?? {};

  console.log(`[Search API] Importing album ${albumId} via ${provider}`);

  const headers = {
    ...(extraHeaders || {}),
    ...(token ? authHeaders(token) : {}),
  };

  const response = await post(
    "/v1/import/album",
    {
      album_id: albumId,
      provider,
    },
    {
      headers,
    }
  );

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
 * Search for artists by name
 * @param {string} query - Artist name to search for
 * @param {number} limit - Maximum number of results (default: 5)
 * @returns {Promise<Array>} Array of artist objects
 */
export async function searchArtists(query, limit = 5) {
    console.log(`[Search API] Searching for artist "${query}"`);

    const response = await searchMusic(query, "artist", limit, false);
    return response?.artists || [];
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
