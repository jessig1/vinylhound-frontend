<script>
  import { createEventDispatcher, onDestroy } from "svelte";
  import {
    searchQuery,
    searchResults,
    searchLoading,
    searchError,
    hasSearchResults,
    runSearch,
    clearSearchState,
  } from "../stores/search.js";

  const dispatch = createEventDispatcher();
  const DEBOUNCE_MS = 300;

  let localQuery = "";
  let debounceId;

  $: if ($searchQuery !== localQuery) {
    localQuery = $searchQuery;
  }

  function handleInput(event) {
    localQuery = event.currentTarget.value;
    scheduleSearch(localQuery);
  }

  function handleSubmit(event) {
    event.preventDefault();
    triggerSearch(localQuery);
  }

  function handleClear() {
    localQuery = "";
    cancelScheduledSearch();
    clearSearchState();
  }

  function scheduleSearch(value) {
    cancelScheduledSearch();
    const trimmed = value.trim();
    if (!trimmed) {
      clearSearchState();
      return;
    }

    debounceId = setTimeout(() => {
      debounceId = undefined;
      void runSearch(trimmed);
    }, DEBOUNCE_MS);
  }

  function triggerSearch(value) {
    cancelScheduledSearch();
    const trimmed = (value || "").trim();
    if (!trimmed) {
      clearSearchState();
      return;
    }

    void runSearch(trimmed);
  }

  function cancelScheduledSearch() {
    if (debounceId) {
      clearTimeout(debounceId);
      debounceId = undefined;
    }
  }

  function selectArtist(artist) {
    dispatch("selectartist", artist);
  }

  function selectAlbum(album) {
    dispatch("selectalbum", album);
  }

  function selectTrack(track) {
    dispatch("selecttrack", track);
  }

  onDestroy(() => {
    cancelScheduledSearch();
  });
</script>

<section class="search-view">
  <header class="search-header">
    <h1>Search Music</h1>
    <p>Find artists, albums, and tracks from Spotify.</p>
    <form class="search-form" on:submit={handleSubmit}>
      <div class="input-wrapper">
        <input
          aria-label="Search music"
          autocomplete="off"
          autocapitalize="off"
          placeholder="Search for artists, albums, or tracks…"
          type="search"
          bind:value={localQuery}
          on:input={handleInput}
        />
        {#if localQuery}
          <button type="button" class="clear-button" on:click={handleClear} aria-label="Clear search">
            ✕
          </button>
        {/if}
      </div>
      <button type="submit" class="submit-button" disabled={$searchLoading}>
        {$searchLoading ? "Searching…" : "Search"}
      </button>
    </form>
  </header>

  {#if $searchError}
    <p class="status status--error">{$searchError}</p>
  {:else if $searchLoading && !$hasSearchResults}
    <p class="status status--loading">Searching…</p>
  {:else if !$hasSearchResults && !$searchQuery}
    <p class="status status--idle">Start typing to see Spotify results.</p>
  {:else if !$hasSearchResults && $searchQuery}
    <p class="status status--empty">
      No results found for “{$searchQuery}”.
      Try refining your search terms.
    </p>
  {/if}

  {#if $hasSearchResults}
    <div class="results-grid">
      {#if $searchResults.artists?.length}
        <section class="result-section">
          <h2>Artists</h2>
          <ul>
            {#each $searchResults.artists as artist (artist.external_id ?? artist.id ?? artist.name)}
              <li>
                <button type="button" on:click={() => selectArtist(artist)}>
                  {#if artist.image_url}
                    <img src={artist.image_url} alt={artist.name} />
                  {:else}
                    <span class="placeholder">{artist.name?.charAt(0) ?? "?"}</span>
                  {/if}
                  <div class="details">
                    <strong>{artist.name}</strong>
                    {#if artist.genres?.length}
                      <span>{artist.genres.slice(0, 2).join(", ")}</span>
                    {/if}
                  </div>
                </button>
              </li>
            {/each}
          </ul>
        </section>
      {/if}

      {#if $searchResults.albums?.length}
        <section class="result-section">
          <h2>Albums</h2>
          <ul>
            {#each $searchResults.albums as album (album.external_id ?? album.id ?? album.title)}
              <li>
                <button type="button" on:click={() => selectAlbum(album)}>
                  {#if album.image_url}
                    <img src={album.image_url} alt={album.title} />
                  {:else}
                    <span class="placeholder">{album.title?.charAt(0) ?? "?"}</span>
                  {/if}
                  <div class="details">
                    <strong>{album.title}</strong>
                    <span>{album.artist}</span>
                    {#if album.release_date}
                      <span class="muted">{new Date(album.release_date).getFullYear()}</span>
                    {/if}
                  </div>
                </button>
              </li>
            {/each}
          </ul>
        </section>
      {/if}

      {#if $searchResults.tracks?.length}
        <section class="result-section">
          <h2>Tracks</h2>
          <ul>
            {#each $searchResults.tracks as track (track.external_id ?? track.id ?? track.title)}
              <li>
                <button type="button" on:click={() => selectTrack(track)}>
                  {#if track.image_url}
                    <img src={track.image_url} alt={track.title} />
                  {:else}
                    <span class="placeholder">{track.title?.charAt(0) ?? "?"}</span>
                  {/if}
                  <div class="details">
                    <strong>{track.title}</strong>
                    <span>{track.artist}</span>
                    {#if track.album}
                      <span class="muted">{track.album}</span>
                    {/if}
                  </div>
                </button>
              </li>
            {/each}
          </ul>
        </section>
      {/if}
    </div>
  {/if}
</section>

<style>
  .search-view {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .search-header {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .search-header h1 {
    margin: 0;
    font-size: 2rem;
    color: #1f2933;
  }

  .search-header p {
    margin: 0;
    color: #52606d;
  }

  .search-form {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .input-wrapper {
    position: relative;
    flex: 1;
    min-width: 240px;
  }

  .input-wrapper input {
    width: 100%;
    padding: 0.85rem 1rem;
    padding-right: 2.5rem;
    border: 2px solid rgba(79, 70, 229, 0.18);
    border-radius: 0.75rem;
    font-size: 1rem;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    background: white;
  }

  .input-wrapper input:focus {
    border-color: rgba(79, 70, 229, 0.6);
    box-shadow: 0 8px 20px rgba(79, 70, 229, 0.12);
    outline: none;
  }

  .clear-button {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    border: none;
    background: transparent;
    color: #64748b;
    font-size: 1rem;
    cursor: pointer;
  }

  .submit-button {
    padding: 0.85rem 1.5rem;
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
    color: white;
    border: none;
    border-radius: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .submit-button:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .submit-button:not(:disabled):hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 25px rgba(124, 58, 237, 0.16);
  }

  .status {
    padding: 1rem 1.25rem;
    border-radius: 0.75rem;
    font-weight: 500;
  }

  .status--idle {
    background: rgba(99, 102, 241, 0.08);
    color: #4338ca;
  }

  .status--loading {
    background: rgba(59, 130, 246, 0.08);
    color: #1d4ed8;
  }

  .status--empty {
    background: rgba(15, 118, 110, 0.08);
    color: #0f766e;
  }

  .status--error {
    background: rgba(239, 68, 68, 0.1);
    color: #b91c1c;
  }

  .results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 1.5rem;
  }

  .result-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .result-section h2 {
    margin: 0;
    font-size: 1.1rem;
    color: #1f2933;
  }

  .result-section ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .result-section li button {
    width: 100%;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.75rem;
    align-items: center;
    padding: 0.75rem;
    border: none;
    border-radius: 0.75rem;
    background: rgba(244, 245, 255, 0.6);
    cursor: pointer;
    text-align: left;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .result-section li button:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 24px rgba(79, 70, 229, 0.12);
  }

  .result-section img {
    width: 56px;
    height: 56px;
    object-fit: cover;
    border-radius: 0.5rem;
  }

  .placeholder {
    width: 56px;
    height: 56px;
    border-radius: 0.5rem;
    background: rgba(79, 70, 229, 0.12);
    color: #4f46e5;
    display: grid;
    place-items: center;
    font-weight: 600;
    font-size: 1.1rem;
  }

  .details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .details strong {
    font-size: 1rem;
    color: #1f2933;
  }

  .details span {
    font-size: 0.9rem;
    color: #52606d;
  }

  .details span.muted {
    color: #7b8794;
  }

  @media (max-width: 640px) {
    .submit-button {
      width: 100%;
    }

    .results-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
