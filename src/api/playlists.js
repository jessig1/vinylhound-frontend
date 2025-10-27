/**
 * Playlists API
 * Endpoints for playlist management
 */

import { get, post, put, del, authHeaders } from "./client.js";

/**
 * Fetch user's playlists
 * @param {string} [token] - Auth token (optional)
 * @returns {Promise<Array>} Array of playlists
 */
export async function fetchPlaylists(token) {
  const headers = token ? authHeaders(token) : {};
  return get("/v1/playlists", { headers });
}

/**
 * Fetch a single playlist by ID
 * @param {string|number} id - Playlist ID
 * @param {string} [token] - Auth token
 * @returns {Promise<Object>} Playlist data
 */
export async function fetchPlaylist(id, token) {
  const headers = token ? authHeaders(token) : {};
  return get(`/v1/playlists/${encodeURIComponent(id)}`, { headers });
}

/**
 * Create a new playlist
 * @param {Object} playlistData - Playlist data
 * @param {string} playlistData.title - Playlist title
 * @param {string} [playlistData.description] - Playlist description
 * @param {boolean} [playlistData.isPublic] - Whether playlist is public
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Created playlist
 */
export async function createPlaylist(playlistData, token) {
  const headers = authHeaders(token);
  return post("/v1/playlists", playlistData, { headers });
}

/**
 * Add a song to a playlist
 * @param {string|number} playlistId - Playlist ID
 * @param {string|number} songId - Song ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Updated playlist
 */
export async function addSongToPlaylist(playlistId, songId, token) {
  const headers = authHeaders(token);
  return post(`/v1/playlists/${encodeURIComponent(playlistId)}/songs`, { song_id: songId }, { headers });
}

/**
 * Update a playlist
 * @param {string|number} playlistId - Playlist ID
 * @param {Object} playlistData - Playlist data to update
 * @param {string} [playlistData.title] - Playlist title
 * @param {string} [playlistData.description] - Playlist description
 * @param {boolean} [playlistData.isPublic] - Whether playlist is public
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Updated playlist
 */
export async function updatePlaylist(playlistId, playlistData, token) {
  const headers = authHeaders(token);
  return put(`/v1/playlists/${encodeURIComponent(playlistId)}`, playlistData, { headers });
}

/**
 * Delete a playlist
 * @param {string|number} playlistId - Playlist ID
 * @param {string} token - Auth token
 * @returns {Promise<void>}
 */
export async function deletePlaylist(playlistId, token) {
  const headers = authHeaders(token);
  return del(`/v1/playlists/${encodeURIComponent(playlistId)}`, { headers });
}

/**
 * Remove a song from a playlist
 * @param {string|number} playlistId - Playlist ID
 * @param {string|number} songId - Song ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Updated playlist
 */
export async function removeSongFromPlaylist(playlistId, songId, token) {
  const headers = authHeaders(token);
  return del(`/v1/playlists/${encodeURIComponent(playlistId)}/songs/${encodeURIComponent(songId)}`, { headers });
}
