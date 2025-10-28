<script>
  import { createEventDispatcher } from "svelte";
  import { searchSongs } from "../api/songs.js";
  import { createPlaylist, updatePlaylist, deletePlaylist } from "../api/playlists.js";

  export let playlist = null; // If editing existing playlist
  export let isOpen = false;
  export let token = null;
  export let username = null; // Current user's username (required for owner field)

  const dispatch = createEventDispatcher();

  // Form state
  let title = "";
  let isPublic = false;
  let tags = [];
  let tagInput = "";
  let songs = [];

  // Search state
  let searchQuery = "";
  let searchResults = [];
  let searching = false;
  let searchError = null;

  // Saving state
  let saving = false;
  let error = null;

  // Track the last loaded playlist to avoid re-initializing on every reactive update
  let lastLoadedPlaylistId = null;
  let wasOpen = false;

  // Initialize form data only when modal opens or playlist changes
  $: {
    // Only run when modal state changes or a different playlist is loaded
    if (isOpen && !wasOpen) {
      // Modal just opened
      wasOpen = true;
      if (playlist && playlist.id) {
        // Load playlist data for editing
        console.log("[PlaylistEditor] Modal opened with playlist:", playlist);
        console.log("[PlaylistEditor] Playlist songs from prop:", playlist.songs);
        lastLoadedPlaylistId = playlist.id;
        title = playlist.title || "";
        isPublic = playlist.is_public || playlist.isPublic || false;
        tags = Array.isArray(playlist.tags) ? [...playlist.tags] : [];
        songs = Array.isArray(playlist.songs) ? [...playlist.songs] : [];
        console.log("[PlaylistEditor] Loaded playlist for editing:", {
          id: playlist.id,
          title,
          isPublic,
          tags,
          songsCount: songs.length,
          songsList: songs
        });
      } else {
        // Creating new playlist
        lastLoadedPlaylistId = null;
        title = "";
        isPublic = false;
        tags = [];
        songs = [];
        console.log("[PlaylistEditor] Reset form for new playlist");
      }
    } else if (!isOpen && wasOpen) {
      // Modal just closed
      wasOpen = false;
    } else if (isOpen && playlist && playlist.id !== lastLoadedPlaylistId) {
      // Different playlist loaded while modal is open
      console.log("[PlaylistEditor] Different playlist loaded:", playlist);
      console.log("[PlaylistEditor] Different playlist songs:", playlist.songs);
      lastLoadedPlaylistId = playlist.id;
      title = playlist.title || "";
      isPublic = playlist.is_public || playlist.isPublic || false;
      tags = Array.isArray(playlist.tags) ? [...playlist.tags] : [];
      songs = Array.isArray(playlist.songs) ? [...playlist.songs] : [];
      console.log("[PlaylistEditor] Loaded different playlist for editing:", {
        id: playlist.id,
        title,
        isPublic,
        tags,
        songsCount: songs.length,
        songsList: songs
      });
    }
  }

  $: isEditing = !!playlist;
  $: canSave = title.trim().length > 0;

  async function handleSearch() {
    if (!searchQuery.trim()) {
      searchResults = [];
      return;
    }

    searching = true;
    searchError = null;

    try {
      const results = await searchSongs({ query: searchQuery, token });
      searchResults = results || [];
    } catch (err) {
      searchError = err.message || "Failed to search songs";
      console.error("Search error:", err);
    } finally {
      searching = false;
    }
  }

  function handleSearchInput(event) {
    searchQuery = event.target.value;
    // Debounce search
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      handleSearch();
    }, 300);
  }

  function addSong(song) {
    // Check if song already in playlist
    if (songs.some(s => s.id === song.id)) {
      console.log("[PlaylistEditor] Song already in playlist:", song);
      return;
    }

    console.log("[PlaylistEditor] Adding song to playlist:", song);
    songs = [...songs, song];
    console.log("[PlaylistEditor] Updated songs array:", songs);
    searchQuery = "";
    searchResults = [];
  }

  function removeSong(songId) {
    songs = songs.filter(s => s.id !== songId);
  }

  function formatDuration(seconds) {
    if (!seconds || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function addTag() {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      tags = [...tags, tag];
      tagInput = "";
    }
  }

  function removeTag(tagToRemove) {
    tags = tags.filter(t => t !== tagToRemove);
  }

  function handleTagInputKeydown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      addTag();
    }
  }

  async function handleSave() {
    if (!canSave) return;

    saving = true;
    error = null;

    try {
      // Backend requires 'title', 'owner', and 'songs' array
      // Convert songs to PlaylistSong format
      const playlistSongs = songs.map(song => ({
        id: song.id,
        title: song.title,
        artist: song.artist,
        album: song.album || "",
        length_seconds: song.lengthSeconds || song.duration || 0,
        genre: song.genre || "",
      }));

      const playlistData = {
        title: title.trim(),
        description: "", // Optional description field
        owner: username || "", // Username of the current user
        tags: tags,
        isPublic: isPublic, // Use camelCase to match backend expectation
        songs: playlistSongs,
      };

      let savedPlaylist;

      if (isEditing) {
        // Update existing playlist with new songs
        savedPlaylist = await updatePlaylist(playlist.id, playlistData, token);
      } else {
        // Create new playlist with songs included
        savedPlaylist = await createPlaylist(playlistData, token);
      }

      dispatch("save", { playlist: savedPlaylist });
      close();
    } catch (err) {
      error = err.message || "Failed to save playlist";
      console.error("Save error:", err);
    } finally {
      saving = false;
    }
  }

  async function handleDelete() {
    if (!isEditing || !playlist?.id) return;

    if (!confirm(`Are you sure you want to delete "${playlist.title}"? This action cannot be undone.`)) {
      return;
    }

    saving = true;
    error = null;

    try {
      await deletePlaylist(playlist.id, token);
      dispatch("delete", { playlistId: playlist.id });
      close();
    } catch (err) {
      error = err.message || "Failed to delete playlist";
      console.error("Delete error:", err);
    } finally {
      saving = false;
    }
  }

  function close() {
    dispatch("close");
    // Reset form state
    wasOpen = false;
    lastLoadedPlaylistId = null;
    title = "";
    isPublic = false;
    tags = [];
    tagInput = "";
    songs = [];
    searchQuery = "";
    searchResults = [];
    error = null;
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
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <div class="modal-backdrop" on:click={handleBackdropClick} role="dialog" aria-modal="true">
    <div class="modal-content">
      <div class="modal-header">
        <h2>{isEditing ? "Edit Playlist" : "Create New Playlist"}</h2>
        <button class="close-button" on:click={close} aria-label="Close">
          &times;
        </button>
      </div>

      <div class="modal-body">
        {#if error}
          <div class="error-message">{error}</div>
        {/if}

        <!-- Playlist Details Form -->
        <form on:submit|preventDefault={handleSave}>
          <div class="form-section">
            <h3>Playlist Details</h3>

            <div class="form-group">
              <label for="playlist-title">Title *</label>
              <input
                id="playlist-title"
                type="text"
                bind:value={title}
                placeholder="My Awesome Playlist"
                required
                autofocus
              />
            </div>

            <div class="form-group">
              <label for="playlist-tags">Tags</label>
              <div class="tags-input-container">
                <input
                  id="playlist-tags"
                  type="text"
                  bind:value={tagInput}
                  on:keydown={handleTagInputKeydown}
                  placeholder="Add tags (press Enter)"
                />
                <button type="button" class="btn-add-tag" on:click={addTag} disabled={!tagInput.trim()}>
                  + Add
                </button>
              </div>
              {#if tags.length > 0}
                <div class="tags-list">
                  {#each tags as tag (tag)}
                    <span class="tag">
                      {tag}
                      <button type="button" class="tag-remove" on:click={() => removeTag(tag)} aria-label="Remove tag">
                        ×
                      </button>
                    </span>
                  {/each}
                </div>
              {/if}
            </div>

            <div class="form-group checkbox-group">
              <label>
                <input type="checkbox" bind:checked={isPublic} />
                Make this playlist public
              </label>
            </div>
          </div>

          <!-- Song Search and Management -->
          <div class="form-section">
            <h3>Songs ({songs.length})</h3>

            <div class="search-section">
              <div class="search-box">
                <input
                  type="text"
                  placeholder="Search for songs to add..."
                  value={searchQuery}
                  on:input={handleSearchInput}
                />
                {#if searching}
                  <span class="search-indicator">Searching...</span>
                {/if}
              </div>

              {#if searchError}
                <div class="search-error">{searchError}</div>
              {/if}

              {#if searchResults.length > 0}
                <div class="search-results">
                  {#each searchResults as song (song.id)}
                    <button
                      type="button"
                      class="search-result-item"
                      on:click={() => addSong(song)}
                      disabled={songs.some(s => s.id === song.id)}
                    >
                      <div class="song-info">
                        <div class="song-title">{song.title}</div>
                        <div class="song-meta">
                          {song.artist}
                          {#if song.album}
                            • {song.album}
                          {/if}
                          {#if song.duration}
                            • {formatDuration(song.duration)}
                          {/if}
                        </div>
                      </div>
                      {#if songs.some(s => s.id === song.id)}
                        <span class="added-badge">Added</span>
                      {:else}
                        <span class="add-icon">+</span>
                      {/if}
                    </button>
                  {/each}
                </div>
              {:else if searchQuery.trim() && !searching}
                <div class="search-empty">No songs found</div>
              {/if}
            </div>

            <!-- Current Songs List -->
            {#if songs.length > 0}
              <div class="songs-list">
                <h4>Songs in Playlist</h4>
                <ol>
                  {#each songs as song, index (song.id)}
                    <li class="song-item">
                      <span class="song-number">{index + 1}</span>
                      <div class="song-info">
                        <div class="song-title">{song.title}</div>
                        <div class="song-meta">
                          {song.artist}
                          {#if song.album}
                            • {song.album}
                          {/if}
                          {#if song.duration}
                            • {formatDuration(song.duration)}
                          {/if}
                        </div>
                      </div>
                      <button
                        type="button"
                        class="remove-button"
                        on:click={() => removeSong(song.id)}
                        aria-label="Remove song"
                      >
                        &times;
                      </button>
                    </li>
                  {/each}
                </ol>
              </div>
            {:else}
              <div class="songs-empty">
                <p>No songs added yet. Search above to add songs.</p>
              </div>
            {/if}
          </div>

          <!-- Action Buttons -->
          <div class="button-group">
            <div class="button-group-left">
              <button type="submit" class="btn btn-primary" disabled={!canSave || saving}>
                {saving ? "Saving..." : isEditing ? "Update Playlist" : "Create Playlist"}
              </button>
              <button type="button" class="btn btn-secondary" on:click={close}>
                Cancel
              </button>
            </div>
            {#if isEditing}
              <button type="button" class="btn btn-danger" on:click={handleDelete} disabled={saving}>
                {saving ? "Deleting..." : "Delete Playlist"}
              </button>
            {/if}
          </div>
        </form>
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
    max-width: 800px;
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
    position: sticky;
    top: 0;
    background: white;
    z-index: 10;
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

  .modal-body {
    padding: 1.5rem;
  }

  .error-message {
    background-color: #fee;
    color: #c33;
    padding: 0.75rem 1rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }

  .form-section {
    margin-bottom: 2rem;
  }

  .form-section h3 {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #333;
  }

  .form-section h4 {
    margin: 0 0 0.75rem 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: #555;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #333;
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

  .tags-input-container {
    display: flex;
    gap: 0.5rem;
  }

  .tags-input-container input {
    flex: 1;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 1rem;
    font-family: inherit;
  }

  .tags-input-container input:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
  }

  .btn-add-tag {
    padding: 0.75rem 1rem;
    background-color: #28a745;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
    white-space: nowrap;
  }

  .btn-add-tag:hover:not(:disabled) {
    background-color: #218838;
  }

  .btn-add-tag:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .tags-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  .tag {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background-color: #007bff;
    color: white;
    padding: 0.4rem 0.75rem;
    border-radius: 16px;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .tag-remove {
    background: none;
    border: none;
    color: white;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background-color 0.2s;
  }

  .tag-remove:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }

  .search-section {
    margin-bottom: 1.5rem;
  }

  .search-box {
    position: relative;
    margin-bottom: 0.75rem;
  }

  .search-box input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 1rem;
  }

  .search-box input:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
  }

  .search-indicator {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #666;
    font-size: 0.9rem;
  }

  .search-error {
    background-color: #fee;
    color: #c33;
    padding: 0.5rem;
    border-radius: 4px;
    font-size: 0.9rem;
    margin-bottom: 0.75rem;
  }

  .search-results {
    border: 1px solid #ddd;
    border-radius: 6px;
    max-height: 300px;
    overflow-y: auto;
  }

  .search-result-item {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    border: none;
    border-bottom: 1px solid #f0f0f0;
    background: white;
    cursor: pointer;
    text-align: left;
    transition: background-color 0.2s;
  }

  .search-result-item:last-child {
    border-bottom: none;
  }

  .search-result-item:hover:not(:disabled) {
    background-color: #f9f9f9;
  }

  .search-result-item:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .search-empty {
    text-align: center;
    padding: 1.5rem;
    color: #666;
    font-size: 0.9rem;
  }

  .song-info {
    flex: 1;
  }

  .song-title {
    font-weight: 500;
    margin-bottom: 0.25rem;
    color: #333;
  }

  .song-meta {
    font-size: 0.85rem;
    color: #666;
  }

  .add-icon {
    font-size: 1.5rem;
    color: #007bff;
    font-weight: bold;
  }

  .added-badge {
    background-color: #28a745;
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 500;
  }

  .songs-list {
    background-color: #f9f9f9;
    border-radius: 6px;
    padding: 1rem;
  }

  .songs-list ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .song-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: white;
    border-radius: 6px;
    border: 1px solid #e0e0e0;
  }

  .song-number {
    font-weight: 600;
    color: #666;
    min-width: 24px;
    text-align: center;
  }

  .remove-button {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: #dc3545;
    cursor: pointer;
    padding: 0;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .remove-button:hover {
    background-color: #fee;
  }

  .songs-empty {
    text-align: center;
    padding: 2rem;
    color: #666;
    font-size: 0.9rem;
    background-color: #f9f9f9;
    border-radius: 6px;
  }

  .button-group {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e0e0e0;
  }

  .button-group-left {
    display: flex;
    gap: 0.75rem;
    flex: 1;
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

  .btn-danger {
    background-color: #dc3545;
    color: white;
    flex: 0 0 auto;
  }

  .btn-danger:hover:not(:disabled) {
    background-color: #c82333;
  }

  @media (max-width: 600px) {
    .modal-content {
      max-height: 95vh;
    }

    .button-group {
      flex-direction: column;
    }

    .button-group-left {
      width: 100%;
    }

    .btn {
      width: 100%;
    }
  }
</style>
