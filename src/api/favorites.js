/**
 * Favorites API
 * Endpoints for managing the authenticated user's favorite tracks
 */

import { get, put, del, authHeaders } from "./client.js";

const FAVORITES_BASE_PATH = "/v1/me/favorites/tracks";

/**
 * List all favorite tracks for the authenticated user.
 * @param {string} token - Auth token
 * @returns {Promise<Array>} Array of favorite track entries
 */
export async function listFavoriteTracks(token) {
  if (!token) {
    throw new Error("Auth token is required to list favorite tracks.");
  }
  const headers = authHeaders(token);
  const response = await get(FAVORITES_BASE_PATH, { headers });
  const tracks = Array.isArray(response?.tracks) ? response.tracks : [];
  return tracks.map(normalizeFavoriteTrack);
}

/**
 * Mark a track as favorite.
 * @param {number|string} trackId - Track identifier
 * @param {string} token - Auth token
 * @returns {Promise<Object|null>} Normalized favorite track data, or null if unchanged
 */
export async function favoriteTrack(trackId, token) {
  if (!token) {
    throw new Error("Auth token is required to favorite a track.");
  }
  const headers = authHeaders(token);
  const endpoint = `${FAVORITES_BASE_PATH}/${encodeURIComponent(trackId)}`;
  const response = await put(endpoint, undefined, { headers });

  if (!response) {
    return null;
  }

  if (response.track) {
    return normalizeFavoriteTrack(response.track);
  }

  return normalizeFavoriteTrack(response);
}

/**
 * Remove a track from favorites.
 * @param {number|string} trackId - Track identifier
 * @param {string} token - Auth token
 * @returns {Promise<void>}
 */
export async function unfavoriteTrack(trackId, token) {
  if (!token) {
    throw new Error("Auth token is required to unfavorite a track.");
  }
  const headers = authHeaders(token);
  const endpoint = `${FAVORITES_BASE_PATH}/${encodeURIComponent(trackId)}`;
  await del(endpoint, { headers });
}

function normalizeFavoriteTrack(entry) {
  if (!entry || typeof entry !== "object") {
    return {
      trackId: null,
      favoritedAt: null,
      track: null,
    };
  }

  const trackId =
    entry.track_id ??
    entry.trackId ??
    entry.id ??
    (entry.track && (entry.track.id ?? entry.track.track_id)) ??
    null;

  const favoritedAt = entry.favorited_at ?? entry.favoritedAt ?? null;
  const track = normalizeNestedTrack(entry.track, trackId);

  return {
    trackId,
    favoritedAt,
    track,
  };
}

function normalizeNestedTrack(track, fallbackId) {
  if (!track || typeof track !== "object") {
    return track ?? null;
  }

  return {
    id: track.id ?? track.track_id ?? fallbackId ?? null,
    title: track.title ?? track.name ?? null,
    artist: track.artist ?? track.artist_name ?? null,
    album: track.album ?? track.album_title ?? null,
    duration: track.duration ?? track.length_seconds ?? null,
    lengthSeconds: track.length_seconds ?? track.duration ?? null,
    genres: Array.isArray(track.genres)
      ? track.genres
      : track.genre
      ? [track.genre]
      : [],
  };
}
