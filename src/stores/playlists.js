import { writable } from "svelte/store";

export const playlists = writable([]);
export const playlistsLoading = writable(false);
export const playlistsError = writable("");
export const selectedPlaylistId = writable(null);

export function resetPlaylists() {
  playlists.set([]);
  selectedPlaylistId.set(null);
  playlistsError.set("");
}

export function updatePlaylist(updatedPlaylist) {
  playlists.update(current => {
    const index = current.findIndex(p => p.id === updatedPlaylist.id);
    if (index !== -1) {
      // Replace the existing playlist with the updated one
      current[index] = updatedPlaylist;
      return [...current];
    }
    // If playlist not found in store, add it
    return [...current, updatedPlaylist];
  });
}

export function removePlaylist(playlistId) {
  playlists.update(current => {
    return current.filter(p => p.id !== playlistId);
  });
}
