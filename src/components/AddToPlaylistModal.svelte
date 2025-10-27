<script>
  import { createEventDispatcher, onMount } from "svelte";
  import { fetchPlaylists, createPlaylist, addSongToPlaylist } from "../api/playlists.js";
  import { activeUser } from "../stores";

  export let track = null;
  export let isOpen = false;
  export let token = null;

  const dispatch = createEventDispatcher();

  let playlists = [];
  let loading = true;
  let error = null;
  let selectedPlaylistId = null;
  let showCreateForm = false;
  let newPlaylistTitle = "";
  let creating = false;
  let adding = false;

  $: if (isOpen && token) {
    loadPlaylists();
  }

  async function loadPlaylists() {
    loading = true;
    error = null;
    try {
      const response = await fetchPlaylists(token);
      playlists = response?.playlists || [];
    } catch (err) {
      error = err.message || "Failed to load playlists";
      console.error("Failed to load playlists:", err);
    } finally {
      loading = false;
    }
  }

  async function handleCreatePlaylist() {
    if (!newPlaylistTitle.trim()) {
      error = "Playlist title is required";
      return;
    }

    creating = true;
    error = null;

    try {
      // Backend requires 'title' and 'owner' fields
      const newPlaylist = await createPlaylist(
        {
          title: newPlaylistTitle,
          owner: $activeUser || "",
        },
        token
      );

      // Add the song to the newly created playlist
      if (track?.id && newPlaylist?.id) {
        await addSongToPlaylist(newPlaylist.id, track.id, token);
      }

      dispatch("success", {
        playlist: newPlaylist,
        track,
        message: `Added "${track?.title}" to new playlist "${newPlaylist.title}"`,
      });

      close();
    } catch (err) {
      error = err.message || "Failed to create playlist";
      console.error("Failed to create playlist:", err);
    } finally {
      creating = false;
    }
  }

  async function handleAddToPlaylist() {
    if (!selectedPlaylistId) {
      error = "Please select a playlist";
      return;
    }

    adding = true;
    error = null;

    try {
      await addSongToPlaylist(selectedPlaylistId, track.id, token);

      const selectedPlaylist = playlists.find((p) => p.id === selectedPlaylistId);

      dispatch("success", {
        playlistId: selectedPlaylistId,
        playlist: selectedPlaylist,
        track,
        message: `Added "${track?.title}" to "${selectedPlaylist?.title}"`,
      });

      close();
    } catch (err) {
      error = err.message || "Failed to add song to playlist";
      console.error("Failed to add to playlist:", err);
    } finally {
      adding = false;
    }
  }

  function close() {
    isOpen = false;
    showCreateForm = false;
    selectedPlaylistId = null;
    newPlaylistTitle = "";
    error = null;
    dispatch("close");
  }

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      close();
    }
  }

  function handleKeydown(event) {
    if (event.key === "Escape") {
      close();
    }
  }

  function toggleCreateForm() {
    showCreateForm = !showCreateForm;
    selectedPlaylistId = null;
    error = null;
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <div class="modal-backdrop" on:click={handleBackdropClick} role="dialog" aria-modal="true">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Add to Playlist</h2>
        <button class="close-button" on:click={close} aria-label="Close">
          &times;
        </button>
      </div>

      {#if track}
        <div class="track-info">
          <strong>{track.title}</strong>
          {#if track.artist}
            <span class="artist">by {track.artist}</span>
          {/if}
        </div>
      {/if}

      <div class="modal-body">
        {#if error}
          <div class="error-message">{error}</div>
        {/if}

        {#if !showCreateForm}
          <!-- Existing Playlists -->
          <div class="section">
            <h3>Select a Playlist</h3>

            {#if loading}
              <div class="loading">Loading playlists...</div>
            {:else if playlists.length === 0}
              <div class="empty-state">
                <p>You don't have any playlists yet.</p>
                <button class="btn btn-primary" on:click={toggleCreateForm}>
                  Create Your First Playlist
                </button>
              </div>
            {:else}
              <div class="playlist-list">
                {#each playlists as playlist}
                  <label class="playlist-item">
                    <input
                      type="radio"
                      name="playlist"
                      value={playlist.id}
                      bind:group={selectedPlaylistId}
                    />
                    <div class="playlist-info">
                      <div class="playlist-title">{playlist.title}</div>
                      {#if playlist.songCount !== undefined}
                        <div class="playlist-meta">
                          {playlist.songCount} {playlist.songCount === 1 ? "song" : "songs"}
                        </div>
                      {/if}
                    </div>
                  </label>
                {/each}
              </div>

              <div class="button-group">
                <button
                  class="btn btn-primary"
                  on:click={handleAddToPlaylist}
                  disabled={!selectedPlaylistId || adding}
                >
                  {adding ? "Adding..." : "Add to Playlist"}
                </button>
                <button class="btn btn-secondary" on:click={toggleCreateForm}>
                  Create New Playlist
                </button>
              </div>
            {/if}
          </div>
        {:else}
          <!-- Create New Playlist Form -->
          <div class="section">
            <h3>Create New Playlist</h3>

            <form on:submit|preventDefault={handleCreatePlaylist}>
              <div class="form-group">
                <label for="playlist-title">Title *</label>
                <input
                  id="playlist-title"
                  type="text"
                  bind:value={newPlaylistTitle}
                  placeholder="My Awesome Playlist"
                  required
                  autofocus
                />
              </div>

              <div class="button-group">
                <button type="submit" class="btn btn-primary" disabled={creating || !newPlaylistTitle.trim()}>
                  {creating ? "Creating..." : "Create & Add Song"}
                </button>
                <button type="button" class="btn btn-secondary" on:click={toggleCreateForm}>
                  Back to Playlists
                </button>
              </div>
            </form>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal-content {
    background: white;
    border-radius: 12px;
    max-width: 500px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e0e0e0;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .close-button {
    background: none;
    border: none;
    font-size: 2rem;
    cursor: pointer;
    color: #666;
    line-height: 1;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
  }

  .close-button:hover {
    background-color: #f5f5f5;
    color: #333;
  }

  .track-info {
    padding: 1rem 1.5rem;
    background-color: #f9f9f9;
    border-bottom: 1px solid #e0e0e0;
  }

  .track-info strong {
    display: block;
    margin-bottom: 0.25rem;
  }

  .track-info .artist {
    color: #666;
    font-size: 0.9rem;
  }

  .modal-body {
    padding: 1.5rem;
  }

  .section h3 {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .error-message {
    background-color: #fee;
    color: #c33;
    padding: 0.75rem 1rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }

  .loading {
    text-align: center;
    padding: 2rem;
    color: #666;
  }

  .empty-state {
    text-align: center;
    padding: 2rem;
  }

  .empty-state p {
    color: #666;
    margin-bottom: 1rem;
  }

  .playlist-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    max-height: 300px;
    overflow-y: auto;
  }

  .playlist-item {
    display: flex;
    align-items: center;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .playlist-item:hover {
    background-color: #f9f9f9;
    border-color: #999;
  }

  .playlist-item input[type="radio"] {
    margin-right: 0.75rem;
    cursor: pointer;
  }

  .playlist-info {
    flex: 1;
  }

  .playlist-title {
    font-weight: 500;
    margin-bottom: 0.25rem;
  }

  .playlist-meta {
    font-size: 0.85rem;
    color: #666;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  .form-group input[type="text"],
  .form-group textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 1rem;
    font-family: inherit;
  }

  .form-group input[type="text"]:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
  }

  .checkbox-group label {
    display: flex;
    align-items: center;
    font-weight: normal;
    cursor: pointer;
  }

  .checkbox-group input[type="checkbox"] {
    margin-right: 0.5rem;
    cursor: pointer;
  }

  .button-group {
    display: flex;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    flex: 1;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background-color: #007bff;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background-color: #0056b3;
  }

  .btn-secondary {
    background-color: #6c757d;
    color: white;
  }

  .btn-secondary:hover:not(:disabled) {
    background-color: #545b62;
  }

  @media (max-width: 600px) {
    .modal-content {
      max-height: 95vh;
    }

    .button-group {
      flex-direction: column;
    }

    .btn {
      width: 100%;
    }
  }
</style>
