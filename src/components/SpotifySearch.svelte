<script>
  import { createEventDispatcher } from "svelte";
  import { searchMusic } from "../api/search.js";

  export let searchType = "all"; // "artist", "album", "track", or "all"
  export let placeholder = "Search Spotify...";
  export let storeResults = true;
  export let compact = false; // Compact mode for header

  const dispatch = createEventDispatcher();

  let query = "";
  let searching = false;
  let results = null;
  let error = "";

  async function handleSearch() {
    if (!query.trim()) {
      results = null;
      return;
    }

    searching = true;
    error = "";

    try {
      const data = await searchMusic(query.trim(), searchType, 20, storeResults);
      results = data;
      dispatch("results", data);
    } catch (err) {
      error = err.message || "Search failed";
      results = null;
      dispatch("error", { error: err.message });
    } finally {
      searching = false;
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter") {
      handleSearch();
    }
  }

  function selectArtist(artist) {
    dispatch("selectartist", artist);
    query = "";
    results = null;
  }

  function selectAlbum(album) {
    dispatch("selectalbum", album);
    query = "";
    results = null;
  }

  function selectTrack(track) {
    dispatch("selecttrack", track);
    query = "";
    results = null;
  }

  function clearSearch() {
    query = "";
    results = null;
    error = "";
  }
</script>

<div class="spotify-search">
  <div class="search-input-container">
    <input
      type="text"
      bind:value={query}
      on:keydown={handleKeyDown}
      {placeholder}
      class="search-input"
      disabled={searching}
    />
    <div class="search-actions">
      {#if query}
        <button type="button" on:click={clearSearch} class="clear-button" title="Clear search">
          ✕
        </button>
      {/if}
      <button
        type="button"
        on:click={handleSearch}
        class="search-button"
        disabled={searching || !query.trim()}
      >
        {searching ? "Searching..." : "Search"}
      </button>
    </div>
  </div>

  {#if error}
    <div class="search-error">
      <span>{error}</span>
    </div>
  {/if}

  {#if results}
    <div class="search-results">
      {#if searchType === "all" || searchType === "artist"}
        {#if results.artists && results.artists.length > 0}
          <section class="results-section">
            <h3>Artists</h3>
            <ul class="results-list">
              {#each results.artists as artist}
                <li>
                  <button type="button" class="result-item" on:click={() => selectArtist(artist)}>
                    {#if artist.image_url}
                      <img src={artist.image_url} alt={artist.name} class="result-image" />
                    {:else}
                      <div class="result-image-placeholder">{artist.name.charAt(0)}</div>
                    {/if}
                    <div class="result-content">
                      <span class="result-name">{artist.name}</span>
                      {#if artist.genres && artist.genres.length > 0}
                        <span class="result-meta">{artist.genres.slice(0, 2).join(", ")}</span>
                      {/if}
                    </div>
                  </button>
                </li>
              {/each}
            </ul>
          </section>
        {/if}
      {/if}

      {#if searchType === "all" || searchType === "album"}
        {#if results.albums && results.albums.length > 0}
          <section class="results-section">
            <h3>Albums</h3>
            <ul class="results-list">
              {#each results.albums as album}
                <li>
                  <button type="button" class="result-item" on:click={() => selectAlbum(album)}>
                    {#if album.image_url}
                      <img src={album.image_url} alt={album.title} class="result-image" />
                    {:else}
                      <div class="result-image-placeholder">{album.title.charAt(0)}</div>
                    {/if}
                    <div class="result-content">
                      <span class="result-name">{album.title}</span>
                      <span class="result-meta">{album.artist}</span>
                      {#if album.release_date}
                        <span class="result-meta">{new Date(album.release_date).getFullYear()}</span>
                      {/if}
                    </div>
                  </button>
                </li>
              {/each}
            </ul>
          </section>
        {/if}
      {/if}

      {#if searchType === "all" || searchType === "track"}
        {#if results.tracks && results.tracks.length > 0}
          <section class="results-section">
            <h3>Tracks</h3>
            <ul class="results-list">
              {#each results.tracks as track}
                <li>
                  <button type="button" class="result-item" on:click={() => selectTrack(track)}>
                    {#if track.image_url}
                      <img src={track.image_url} alt={track.title} class="result-image" />
                    {:else}
                      <div class="result-image-placeholder">{track.title.charAt(0)}</div>
                    {/if}
                    <div class="result-content">
                      <span class="result-name">{track.title}</span>
                      <span class="result-meta">{track.artist}</span>
                      {#if track.album}
                        <span class="result-meta">{track.album}</span>
                      {/if}
                    </div>
                  </button>
                </li>
              {/each}
            </ul>
          </section>
        {/if}
      {/if}

      {#if (!results.artists || results.artists.length === 0) && (!results.albums || results.albums.length === 0) && (!results.tracks || results.tracks.length === 0)}
        <div class="no-results">
          No results found for "{query}"
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .spotify-search {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .search-input-container {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .search-input {
    flex: 1;
    padding: 0.75rem 1rem;
    border: 2px solid rgba(79, 70, 229, 0.2);
    border-radius: 0.75rem;
    font-size: 1rem;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    background: white;
  }

  .search-input:focus {
    outline: none;
    border-color: rgba(79, 70, 229, 0.5);
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }

  .search-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .search-actions {
    display: flex;
    gap: 0.5rem;
  }

  .clear-button {
    padding: 0.75rem 1rem;
    background: rgba(239, 68, 68, 0.1);
    border: none;
    border-radius: 0.75rem;
    color: #b91c1c;
    cursor: pointer;
    font-weight: 600;
    transition: background 0.2s ease;
  }

  .clear-button:hover {
    background: rgba(239, 68, 68, 0.2);
  }

  .search-button {
    padding: 0.75rem 1.5rem;
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    border: none;
    border-radius: 0.75rem;
    color: white;
    cursor: pointer;
    font-weight: 600;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .search-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(79, 70, 229, 0.3);
  }

  .search-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .search-error {
    padding: 0.75rem 1rem;
    background: rgba(239, 68, 68, 0.1);
    border-radius: 0.75rem;
    color: #b91c1c;
    font-size: 0.9rem;
  }

  .search-results {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-height: 500px;
    overflow-y: auto;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 0.75rem;
  }

  .results-section h3 {
    margin: 0 0 0.75rem 0;
    font-size: 1.1rem;
    color: #312e81;
    font-weight: 700;
  }

  .results-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .result-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.65rem;
    border-radius: 0.75rem;
    background: white;
    border: none;
    cursor: pointer;
    width: 100%;
    text-align: left;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    box-shadow: 0 2px 8px rgba(30, 41, 59, 0.08);
  }

  .result-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(30, 41, 59, 0.12);
  }

  .result-image,
  .result-image-placeholder {
    width: 48px;
    height: 48px;
    border-radius: 0.5rem;
    object-fit: cover;
    flex-shrink: 0;
  }

  .result-image-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    color: white;
    font-weight: 700;
    font-size: 1.2rem;
  }

  .result-content {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    overflow: hidden;
  }

  .result-name {
    font-weight: 600;
    color: #1f2937;
    font-size: 0.95rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .result-meta {
    font-size: 0.8rem;
    color: rgba(71, 85, 105, 0.9);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .no-results {
    padding: 2rem;
    text-align: center;
    color: rgba(71, 85, 105, 0.9);
    font-size: 0.95rem;
  }
</style>
