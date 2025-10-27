/**
 * Songs API
 * Endpoints for song/track data
 */

import { get, authHeaders } from "./client.js";

/**
 * Search for songs
 * @param {Object} options - Search options
 * @param {string} [options.query] - Search query
 * @param {string} [options.artist] - Filter by artist
 * @param {string} [options.album] - Filter by album
 * @param {string} [options.albumId] - Filter by album ID
 * @param {string} [options.token] - Auth token
 * @returns {Promise<Array>} Array of songs
 */
export async function searchSongs({ query, artist, album, albumId, token } = {}) {
  const params = new URLSearchParams();

  if (query) params.set("q", query);
  if (artist) params.set("artist", artist);
  if (album) params.set("album", album);
  if (albumId) params.set("album_id", albumId);

  const endpoint = `/v1/songs${params.toString() ? `?${params}` : ""}`;
  const headers = token ? authHeaders(token) : {};

  const response = await get(endpoint, { headers });
  const songs = response?.songs || [];

  // Normalize song data
  return songs.map(song => ({
    id: song.id,
    title: song.title,
    artist: song.artist,
    album: song.album,
    albumId: song.album_id || song.albumId,
    duration: song.duration,
    lengthSeconds: song.duration,
    trackNumber: song.track_num || song.trackNumber,
    genre: song.genre,
    genres: song.genres || (song.genre ? [song.genre] : []),
  }));
}

/**
 * Fetch a single song by ID
 * @param {string|number} id - Song ID
 * @param {string} [token] - Auth token
 * @returns {Promise<Object>} Song data
 */
export async function fetchSong(id, token) {
  const headers = token ? authHeaders(token) : {};
  const song = await get(`/v1/songs/${encodeURIComponent(id)}`, { headers });

  // Normalize song data
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    album: song.album,
    albumId: song.album_id || song.albumId,
    duration: song.duration,
    lengthSeconds: song.duration,
    trackNumber: song.track_num || song.trackNumber,
    genre: song.genre,
    genres: song.genres || (song.genre ? [song.genre] : []),
  };
}
