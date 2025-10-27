/**
 * Albums API
 * Endpoints for album and artist data
 */

import { get, put, del, authHeaders } from "./client.js";

/**
 * Fetch all albums
 * @param {Object} options - Request options
 * @param {string} [options.token] - Auth token
 * @param {boolean} [options.includeTracks] - Include track data
 * @returns {Promise<Array>} Array of albums
 */
export async function fetchAlbums({ token, includeTracks } = {}) {
  const params = new URLSearchParams();
  if (includeTracks) {
    params.set("tracks", "true");
  }

  const endpoint = `/v1/albums${params.toString() ? `?${params}` : ""}`;
  const headers = token ? authHeaders(token) : {};

  const response = await get(endpoint, { headers });

  // Extract albums array from response and normalize field names
  const albums = response?.albums || [];
  return albums.map(album => ({
    ...album,
    // Normalize snake_case to camelCase
    coverUrl: album.cover_url || album.coverUrl,
    releaseYear: album.release_year || album.releaseYear,
    // Convert genre string to genres array for consistency
    genres: album.genres || (album.genre ? [album.genre] : []),
  }));
}

/**
 * Fetch a single album by ID
 * @param {string|number} id - Album ID
 * @param {Object} options - Request options
 * @param {string} [options.token] - Auth token
 * @returns {Promise<Object>} Album data
 */
export async function fetchAlbum(id, { token } = {}) {
  const headers = token ? authHeaders(token) : {};
  const album = await get(`/v1/albums/${encodeURIComponent(id)}`, { headers });

  // Fetch tracks/songs for this album
  let tracks = [];
  try {
    const songsResponse = await get(`/v1/songs?album_id=${encodeURIComponent(id)}`, { headers });
    const songs = songsResponse?.songs || [];

    // Normalize track data
    tracks = songs
      .sort((a, b) => (a.track_num || 0) - (b.track_num || 0))
      .map((song, index) => ({
        id: song.id,
        title: song.title || `Track ${index + 1}`,
        trackNumber: song.track_num || index + 1,
        lengthSeconds: song.duration,
        lengthLabel: song.duration ? formatDuration(song.duration) : null,
      }));
  } catch (err) {
    console.warn(`Unable to fetch tracks for album ${id}:`, err);
  }

  // Normalize the album data to match component expectations
  return {
    ...album,
    // Normalize snake_case to camelCase
    coverUrl: album.cover_url || album.coverUrl,
    releaseYear: album.release_year || album.releaseYear,
    // Convert genre string to genres array for consistency
    genres: album.genres || (album.genre ? [album.genre] : []),
    // Add fetched tracks
    tracks,
  };
}

/**
 * Format duration in seconds to MM:SS
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
function formatDuration(seconds) {
  if (!seconds || seconds < 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Fetch user's album preferences (favorites and ratings)
 * @param {string} token - Auth token
 * @returns {Promise<Array>} Array of album preferences
 */
export async function fetchUserAlbums(token) {
  const headers = authHeaders(token);
  return get("/v1/me/albums", { headers });
}

/**
 * Update album favorite status
 * @param {Object} options - Request options
 * @param {string} options.token - Auth token
 * @param {string|number} options.albumId - Album ID
 * @param {boolean} options.favorite - Favorite status
 * @param {number} [options.rating] - Rating (1-5)
 * @returns {Promise<Object>} Updated preference
 */
export async function favoriteAlbum({ token, albumId, favorite, rating }) {
  const headers = authHeaders(token);
  const payload = { favorited: Boolean(favorite) };
  if (rating !== null && rating !== undefined) {
    payload.rating = rating;
  }

  return put(
    `/v1/me/albums/${encodeURIComponent(albumId)}/preference`,
    payload,
    { headers }
  );
}

/**
 * Update album rating
 * @param {Object} options - Request options
 * @param {string} options.token - Auth token
 * @param {string|number} options.albumId - Album ID
 * @param {number|null} options.rating - Rating (1-5) or null to remove
 * @param {boolean} [options.favorite] - Favorite status
 * @returns {Promise<Object>} Updated preference
 */
export async function rateAlbum({ token, albumId, rating, favorite }) {
  const headers = authHeaders(token);
  const payload = { rating: rating === null ? null : Number(rating) };
  if (favorite !== undefined) {
    payload.favorited = Boolean(favorite);
  }

  return put(
    `/v1/me/albums/${encodeURIComponent(albumId)}/preference`,
    payload,
    { headers }
  );
}

/**
 * Remove album preference
 * @param {string} token - Auth token
 * @param {string|number} albumId - Album ID
 * @returns {Promise<void>}
 */
export async function removeAlbumPreference(token, albumId) {
  const headers = authHeaders(token);
  return del(`/v1/me/albums/${encodeURIComponent(albumId)}/preference`, { headers });
}
