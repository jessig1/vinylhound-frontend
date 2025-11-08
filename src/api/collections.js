/**
 * Collections API
 * Endpoints for album wishlist and owned collection management
 */

import { get, post, put, del, authHeaders } from "./client.js";

/**
 * Fetch user's collection items
 * @param {Object} options - Request options
 * @param {string} options.token - Auth token
 * @param {string} [options.type] - Collection type ('wishlist' or 'owned')
 * @param {string} [options.artist] - Filter by artist
 * @param {string} [options.genre] - Filter by genre
 * @param {number} [options.yearFrom] - Filter by year from
 * @param {number} [options.yearTo] - Filter by year to
 * @param {string} [options.condition] - Filter by condition
 * @param {string} [options.search] - Search term
 * @param {number} [options.limit] - Limit results
 * @param {number} [options.offset] - Offset for pagination
 * @returns {Promise<Object>} Collection items with count
 */
export async function fetchCollections({
  token,
  type,
  artist,
  genre,
  yearFrom,
  yearTo,
  condition,
  search,
  limit,
  offset
} = {}) {
  const params = new URLSearchParams();

  if (type) params.set("type", type);
  if (artist) params.set("artist", artist);
  if (genre) params.set("genre", genre);
  if (yearFrom) params.set("year_from", yearFrom);
  if (yearTo) params.set("year_to", yearTo);
  if (condition) params.set("condition", condition);
  if (search) params.set("search", search);
  if (limit) params.set("limit", limit);
  if (offset) params.set("offset", offset);

  const endpoint = `/v1/collections${params.toString() ? `?${params}` : ""}`;
  const headers = authHeaders(token);

  const response = await get(endpoint, { headers });

  // Normalize the response data
  const collections = response?.collections || [];
  return {
    collections: collections.map(item => normalizeCollectionItem(item)),
    count: response?.count || collections.length,
  };
}

/**
 * Fetch a single collection item by ID
 * @param {string|number} id - Collection item ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Collection item
 */
export async function fetchCollectionItem(id, token) {
  const headers = authHeaders(token);
  const item = await get(`/v1/collections/${encodeURIComponent(id)}`, { headers });
  return normalizeCollectionItem(item);
}

/**
 * Add an album to a collection
 * @param {Object} options - Request options
 * @param {string} options.token - Auth token
 * @param {number} options.albumId - Album ID
 * @param {string} options.collectionType - Collection type ('wishlist' or 'owned')
 * @param {string} [options.notes] - Notes about the album
 * @param {string} [options.dateAcquired] - Date acquired (ISO string, for owned)
 * @param {number} [options.purchasePrice] - Purchase price (for owned)
 * @param {string} [options.condition] - Condition (for owned)
 * @returns {Promise<Object>} Created collection item
 */
export async function addToCollection({
  token,
  albumId,
  collectionType,
  notes,
  dateAcquired,
  purchasePrice,
  condition
}) {
  const headers = authHeaders(token);
  const payload = {
    album_id: albumId,
    collection_type: collectionType,
  };

  if (notes) payload.notes = notes;
  if (dateAcquired) payload.date_acquired = dateAcquired;
  if (purchasePrice !== null && purchasePrice !== undefined) {
    payload.purchase_price = purchasePrice;
  }
  if (condition) payload.condition = condition;

  const item = await post("/v1/collections", payload, { headers });
  return normalizeCollectionItem(item);
}

/**
 * Update a collection item
 * @param {Object} options - Request options
 * @param {string} options.token - Auth token
 * @param {number} options.id - Collection item ID
 * @param {string} [options.notes] - Notes
 * @param {string} [options.dateAcquired] - Date acquired (ISO string)
 * @param {number} [options.purchasePrice] - Purchase price
 * @param {string} [options.condition] - Condition
 * @returns {Promise<Object>} Updated collection item
 */
export async function updateCollectionItem({
  token,
  id,
  notes,
  dateAcquired,
  purchasePrice,
  condition
}) {
  const headers = authHeaders(token);
  const payload = {};

  if (notes !== undefined) payload.notes = notes;
  if (dateAcquired !== undefined) payload.date_acquired = dateAcquired;
  if (purchasePrice !== undefined) payload.purchase_price = purchasePrice;
  if (condition !== undefined) payload.condition = condition;

  const item = await put(`/v1/collections/${encodeURIComponent(id)}`, payload, { headers });
  return normalizeCollectionItem(item);
}

/**
 * Remove an album from collection
 * @param {string} token - Auth token
 * @param {number} id - Collection item ID
 * @returns {Promise<void>}
 */
export async function removeFromCollection(token, id) {
  const headers = authHeaders(token);
  return del(`/v1/collections/${encodeURIComponent(id)}`, { headers });
}

/**
 * Move a collection item to a different collection type
 * @param {Object} options - Request options
 * @param {string} options.token - Auth token
 * @param {number} options.id - Collection item ID
 * @param {string} options.targetType - Target collection type ('wishlist' or 'owned')
 * @returns {Promise<void>}
 */
export async function moveCollection({ token, id, targetType }) {
  const headers = authHeaders(token);
  const payload = { target_type: targetType };
  return post(`/v1/collections/${encodeURIComponent(id)}/move`, payload, { headers });
}

/**
 * Get collection statistics
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Collection statistics
 */
export async function fetchCollectionStats(token) {
  const headers = authHeaders(token);
  const stats = await get("/v1/collections/stats", { headers });

  return {
    totalWishlist: stats?.total_wishlist || 0,
    totalOwned: stats?.total_owned || 0,
    totalValue: stats?.total_value || 0,
    byGenre: stats?.by_genre || {},
    byCondition: stats?.by_condition || {},
  };
}

/**
 * Normalize collection item data from snake_case to camelCase
 * @param {Object} item - Raw collection item
 * @returns {Object} Normalized collection item
 */
function normalizeCollectionItem(item) {
  if (!item) return null;

  return {
    id: item.id,
    userId: item.user_id,
    albumId: item.album_id,
    collectionType: item.collection_type,
    notes: item.notes || "",
    dateAdded: item.date_added,
    dateAcquired: item.date_acquired,
    purchasePrice: item.purchase_price,
    condition: item.condition,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    // Album details (from join)
    albumTitle: item.album_title || item.title,
    albumArtist: item.album_artist || item.artist,
    albumReleaseYear: item.album_release_year || item.release_year,
    albumGenre: item.album_genre || item.genre,
    albumCoverUrl: item.album_cover_url || item.cover_url,
  };
}
