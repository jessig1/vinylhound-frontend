<script>
  import { createEventDispatcher } from "svelte";
  import { playlists, playlistsLoading, playlistsError, selectedPlaylistId, activeUser, token, updatePlaylist, removePlaylist } from "../stores";
  import PlaylistList from "../components/PlaylistList.svelte";

  const dispatch = createEventDispatcher();

  // Filter user playlists
  $: normalizedUser = ($activeUser || "").trim().toLowerCase();
  $: userPlaylists =
    $playlists && normalizedUser
      ? $playlists.filter(
          (item) =>
            item &&
            typeof item.owner === "string" &&
            item.owner.trim().toLowerCase() === normalizedUser
        )
      : [];

  function handleSelect(event) {
    const id = event.detail?.id ?? null;
    selectedPlaylistId.set(id);
  }

  function handlePlaylistSaved(event) {
    const { playlist } = event.detail || {};

    // Update the specific playlist in the store with the returned data
    if (playlist) {
      updatePlaylist(playlist);
    } else {
      // Fallback: refresh all playlists if no specific playlist data was returned
      dispatch("refresh");
    }
  }

  function handlePlaylistDeleted(event) {
    const { playlistId } = event.detail || {};

    // Remove the playlist from the store
    if (playlistId) {
      removePlaylist(playlistId);
      // Clear selection if the deleted playlist was selected
      if ($selectedPlaylistId === playlistId) {
        selectedPlaylistId.set(null);
      }
    }
  }

  function handleSelectArtist(event) {
    const artist = event.detail;
    dispatch("selectartist", artist);
  }

  function handleSelectAlbum(event) {
    const album = event.detail;
    dispatch("selectalbum", album);
  }
</script>

<PlaylistList
  playlists={userPlaylists}
  loading={$playlistsLoading}
  error={$playlistsError}
  username={$activeUser}
  selectedId={$selectedPlaylistId}
  token={$token}
  on:select={handleSelect}
  on:playlistSaved={handlePlaylistSaved}
  on:playlistDeleted={handlePlaylistDeleted}
  on:selectartist={handleSelectArtist}
  on:selectalbum={handleSelectAlbum}
/>
