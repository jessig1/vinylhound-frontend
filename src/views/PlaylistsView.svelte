<script>
  import { createEventDispatcher } from "svelte";
  import { playlists, playlistsLoading, playlistsError, selectedPlaylistId, activeUser, token } from "../stores";
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
    // Refresh playlists after saving
    // The parent App.svelte should handle reloading playlists
    dispatch("refresh");
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
/>
