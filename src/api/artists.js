import { get, post, authHeaders } from "./client.js";

/**
 * Get all artists from the database
 * @param {Object} [options] - Additional request options
 * @param {string} [options.token] - Auth token for the request
 * @returns {Promise<Array>} Array of artist objects
 */
export async function getArtists(options = {}) {
  console.log('[Artists API] Fetching all artists from database');

  const { token, headers: extraHeaders } = options ?? {};
  const headers = {
    ...(extraHeaders || {}),
    ...(token ? authHeaders(token) : {}),
  };

  const response = await get('/v1/artists', { headers });

  console.log(`[Artists API] Received ${response?.artists?.length || 0} artists`);
  return response?.artists || [];
}

/**
 * Save an artist to the database
 * @param {Object} artist - The artist object to save
 * @param {string} artist.external_id - External provider ID (e.g., Spotify ID)
 * @param {string} artist.name - Artist name
 * @param {string} artist.provider - Provider name (e.g., "spotify")
 * @param {string} [artist.image_url] - Artist image URL
 * @param {string} [artist.biography] - Artist biography
 * @param {Array<string>} [artist.genres] - Artist genres
 * @param {number} [artist.popularity] - Popularity score
 * @param {string} [artist.external_url] - External URL
 * @param {Object} [options] - Additional request options
 * @param {string} [options.token] - Auth token for the request
 * @returns {Promise<{message: string}>}
 */
export async function saveArtist(artist, options = {}) {
  console.log(`[Artists API] Saving artist: ${artist.name}`);

  const { token, headers: extraHeaders } = options ?? {};
  const headers = {
    ...(extraHeaders || {}),
    ...(token ? authHeaders(token) : {}),
  };

  const response = await post(
    '/v1/artists',
    {
      external_id: artist.external_id || artist.id || '',
      name: artist.name,
      provider: artist.provider || 'spotify',
      image_url: artist.image_url || artist.imageURL || '',
      biography: artist.biography || '',
      genres: artist.genres || [],
      popularity: artist.popularity || 0,
      external_url: artist.external_url || artist.externalURL || '',
    },
    { headers }
  );

  console.log(`[Artists API] Artist saved: ${artist.name}`);
  return response;
}
