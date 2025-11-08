/**
 * API Module - Barrel export
 * Exports all API functions and utilities
 */

// Export client utilities
export { ApiError, buildRequestUrl, authHeaders } from "./client.js";

// Export auth API
export { signup, login } from "./auth.js";

// Export content API
export { fetchContent, updateContent } from "./content.js";

// Export albums API
export {
  fetchAlbums,
  fetchAlbum,
  fetchUserAlbums,
  favoriteAlbum,
  rateAlbum,
  removeAlbumPreference,
} from "./albums.js";

// Export playlists API
export {
  fetchPlaylists,
  fetchPlaylist,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
} from "./playlists.js";

// Export songs API
export { searchSongs, fetchSong } from "./songs.js";

// Export search API
export { searchMusic, importAlbum, getProviders, getArtistDetails, getAlbumDetails } from "./search.js";

// Export artists API
export { getArtists, saveArtist } from "./artists.js";

// Export favorites API
export { listFavoriteTracks, favoriteTrack, unfavoriteTrack } from "./favorites.js";

// Export collections API
export {
  fetchCollections,
  fetchCollectionItem,
  addToCollection,
  updateCollectionItem,
  removeFromCollection,
  moveCollection,
  fetchCollectionStats,
} from "./collections.js";
