<script>
  import { createEventDispatcher } from "svelte";
  import { searchMusic } from "../api/search.js";

  export let placeholder = "Search Spotify for artists and albums...";

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
      // Search for artists and albums only (no tracks)
      const data = await searchMusic(query.trim(), "all", 10, true);

      // Filter to only show artists and albums
      results = {
        artists: data.artists || [],
        albums: data.albums || []
      };

      dispatch("results", results);
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

  function clearSearch() {
    query = "";
    results = null;
    error = "";
  }
</script>

<div class="spotify-search-simple">
  <div class="search-box">
    <input
      type="text"
      bind:value={query}
      on:keydown={handleKeyDown}
      {placeholder}
      class="search-input"
      disabled={searching}
    />
    <div class="search-buttons">
      {#if query}
        <button type="button" on:click={clearSearch} class="btn-clear" title="Clear">
          ✕
        </button>
      {/if}
      <button
        type="button"
        on:click={handleSearch}
        class="btn-search"
        disabled={searching || !query.trim()}
      >
        {searching ? "..." : "Search"}
      </button>
    </div>
  </div>

  {#if error}
    <div class="error-message">{error}</div>
  {/if}

  {#if results}
    <div class="results">
      {#if results.artists && results.artists.length > 0}
        <section class="result-section">
          <h4>Artists</h4>
          <div class="result-list">
            {#each results.artists as artist}
              <button type="button" class="result-card" on:click={() => selectArtist(artist)}>
                {#if artist.image_url}
                  <img src={artist.image_url} alt={artist.name} class="result-img" />
                {:else}
                  <div class="result-img-placeholder">{artist.name.charAt(0)}</div>
                {/if}
                <div class="result-info">
                  <div class="result-title">{artist.name}</div>
                  {#if artist.genres && artist.genres.length > 0}
                    <div class="result-subtitle">{artist.genres[0]}</div>
                  {/if}
                </div>
              </button>
            {/each}
          </div>
        </section>
      {/if}

      {#if results.albums && results.albums.length > 0}
        <section class="result-section">
          <h4>Albums</h4>
          <div class="result-list">
            {#each results.albums as album}
              <button type="button" class="result-card" on:click={() => selectAlbum(album)}>
                {#if album.image_url}
                  <img src={album.image_url} alt={album.title} class="result-img" />
                {:else}
                  <div class="result-img-placeholder">{album.title.charAt(0)}</div>
                {/if}
                <div class="result-info">
                  <div class="result-title">{album.title}</div>
                  <div class="result-subtitle">{album.artist}</div>
                  {#if album.release_date}
                    <div class="result-year">{new Date(album.release_date).getFullYear()}</div>
                  {/if}
                </div>
              </button>
            {/each}
          </div>
        </section>
      {/if}

      {#if (!results.artists || results.artists.length === 0) && (!results.albums || results.albums.length === 0)}
        <div class="no-results">No results found for "{query}"</div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .spotify-search-simple {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .search-box {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .search-input {
    flex: 1;
    padding: 0.65rem 1rem;
    border: 2px solid rgba(79, 70, 229, 0.2);
    border-radius: 0.75rem;
    font-size: 0.95rem;
    transition: all 0.2s ease;
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

  .search-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .btn-clear {
    padding: 0.65rem 0.9rem;
    background: rgba(239, 68, 68, 0.1);
    border: none;
    border-radius: 0.75rem;
    color: #b91c1c;
    cursor: pointer;
    font-weight: 600;
    transition: background 0.2s ease;
    font-size: 0.9rem;
  }

  .btn-clear:hover {
    background: rgba(239, 68, 68, 0.2);
  }

  .btn-search {
    padding: 0.65rem 1.25rem;
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    border: none;
    border-radius: 0.75rem;
    color: white;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.9rem;
    transition: all 0.2s ease;
    min-width: 80px;
  }

  .btn-search:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(79, 70, 229, 0.3);
  }

  .btn-search:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error-message {
    padding: 0.65rem 1rem;
    background: rgba(239, 68, 68, 0.1);
    border-radius: 0.75rem;
    color: #b91c1c;
    font-size: 0.85rem;
  }

  .results {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    max-height: 400px;
    overflow-y: auto;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 0.75rem;
  }

  .result-section h4 {
    margin: 0 0 0.6rem 0;
    font-size: 1rem;
    color: #312e81;
    font-weight: 700;
  }

  .result-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.75rem;
  }

  .result-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    border-radius: 0.75rem;
    background: white;
    border: none;
    cursor: pointer;
    text-align: center;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(30, 41, 59, 0.08);
  }

  .result-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(30, 41, 59, 0.15);
  }

  .result-img,
  .result-img-placeholder {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 0.5rem;
    object-fit: cover;
  }

  .result-img-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    color: white;
    font-weight: 700;
    font-size: 2rem;
  }

  .result-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    width: 100%;
  }

  .result-title {
    font-weight: 600;
    color: #1f2937;
    font-size: 0.85rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .result-subtitle,
  .result-year {
    font-size: 0.75rem;
    color: rgba(71, 85, 105, 0.9);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .no-results {
    padding: 1.5rem;
    text-align: center;
    color: rgba(71, 85, 105, 0.9);
    font-size: 0.9rem;
  }

  @media (max-width: 640px) {
    .result-list {
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    }
  }
</style>
