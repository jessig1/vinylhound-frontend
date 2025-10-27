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
