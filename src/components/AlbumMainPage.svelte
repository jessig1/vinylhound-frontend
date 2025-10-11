<script>
  import { onMount, createEventDispatcher } from "svelte";
  import AlbumPage from "./AlbumPage.svelte";
  import { fetchAlbum, fetchAlbums, ApiError } from "../lib/api";
  import { sampleAlbums, findSampleAlbum } from "../lib/sampleAlbums";

  export let token = "";
  export let userAlbums = {};

  let albums = [];
  let loading = true;
  let error = "";
  let search = "";
  let genre = "all";
  let searchTerm = "";
  let filteredAlbums = [];
  let availableGenres = [];
  let selectedAlbumKey = null;
  let selectedAlbumFetchId = null;
  let albumDetail = null;
  let detailLoading = false;
  let detailError = "";
  let usingSampleData = false;
  const dispatch = createEventDispatcher();
  let lastToken = token;

  let mounted = false;
  let detailRequestId = 0;

  onMount(() => {
    mounted = true;
    loadAlbums();
    return () => {
      mounted = false;
    };
  });

  $: searchTerm = search.trim().toLowerCase();

  $: if (mounted && token !== lastToken) {
    lastToken = token;
    loadAlbums();
  }

  $: availableGenres = computeGenres(albums);

  $: if (genre !== "all" && availableGenres.length && !availableGenres.includes(genre)) {
    genre = "all";
  }

  $: filteredAlbums = applyFilters(albums, searchTerm, genre);

  $: if (selectedAlbumKey && !filteredAlbums.some((album) => getAlbumKey(album) === selectedAlbumKey)) {
    selectedAlbumKey = null;
    selectedAlbumFetchId = null;
    albumDetail = null;
    detailError = "";
    detailLoading = false;
  }

  async function loadAlbums() {
    loading = true;
    error = "";
    detailError = "";
    detailLoading = false;
    usingSampleData = false;
    try {
      const data = await fetchAlbums({ token });
      albums = Array.isArray(data) ? data : [];
      if (albums.length) {
        await selectAlbum(albums[0]);
      } else {
        await selectAlbum(null);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        albums = sampleAlbums;
        usingSampleData = true;
        if (albums.length) {
          await selectAlbum(albums[0]);
        } else {
          await selectAlbum(null);
        }
      } else {
        albums = [];
        await selectAlbum(null);
        error = err?.message || "Unable to load albums.";
      }
    } finally {
      loading = false;
    }
  }

  function computeGenres(list) {
    const collected = new Set();
    for (const album of list) {
      for (const value of normalizeGenres(album?.genres)) {
        collected.add(value);
      }
    }
    return Array.from(collected).sort((a, b) => a.localeCompare(b));
  }

  function applyFilters(list, term, genreFilter) {
    return list.filter((album) => {
      const matchesSearch =
        !term ||
        [album?.title, album?.artist]
          .map((value) => (typeof value === "string" ? value.toLowerCase() : ""))
          .some((value) => value.includes(term));
      const albumGenres = normalizeGenres(album?.genres);
      const matchesGenre =
        genreFilter === "all" ||
        albumGenres.some((value) => value.toLowerCase() === genreFilter.toLowerCase());
      return matchesSearch && matchesGenre;
    });
  }

  function normalizeGenres(genres) {
    if (!genres) {
      return [];
    }
    if (Array.isArray(genres)) {
      return genres
        .map((value) => (typeof value === "string" ? value.trim() : String(value).trim()))
        .filter(Boolean);
    }
    if (typeof genres === "string") {
      return genres
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
    }
    return [];
  }

  function getAlbumKey(album) {
    if (!album) {
      return null;
    }
    return (
      album?.id ??
      album?._id ??
      album?.slug ??
      [album?.artist, album?.title].filter(Boolean).join(" - ") ??
      null
    );
  }

  function getAlbumFetchId(album) {
    if (!album) {
      return null;
    }
    return album?.id ?? album?._id ?? album?.slug ?? null;
  }

  function getInteractionByAlbum(album) {
    const id = getAlbumFetchId(album) || getAlbumKey(album);
    if (!id) {
      return null;
    }
    return userAlbums?.[id] || null;
  }

  function isFavoriteAlbum(album) {
    const interaction = getInteractionByAlbum(album);
    return Boolean(interaction?.favorite);
  }

  function getAlbumRating(album) {
    const interaction = getInteractionByAlbum(album);
    const value = interaction?.rating;
    return Number.isFinite(value) ? Number(value) : null;
  }

  function canInteract() {
    return Boolean(token) && !usingSampleData;
  }

  function interactionMessage() {
    if (!token) {
      return "Log in to favorite and rate albums.";
    }
    if (usingSampleData) {
      return "Album service is offline; favorites and ratings won't sync.";
    }
    return "Favorites and ratings appear in your profile.";
  }

  function sendFavorite(album, nextFavorite) {
    if (!canInteract()) {
      return;
    }
    const albumId = getAlbumFetchId(album) || getAlbumKey(album);
    if (!albumId) {
      return;
    }
    const favoriteValue =
      nextFavorite === undefined || nextFavorite === null ? !isFavoriteAlbum(album) : Boolean(nextFavorite);
    dispatch("favorite", { albumId, favorite: favoriteValue, album });
  }

  function sendRating(album, value) {
    if (!canInteract()) {
      return;
    }
    const albumId = getAlbumFetchId(album) || getAlbumKey(album);
    if (!albumId) {
      return;
    }
    let ratingValue = null;
    if (value !== undefined && value !== null) {
      const numeric = Number(value);
      ratingValue = Number.isFinite(numeric) ? numeric : null;
    }
    dispatch("rate", { albumId, rating: ratingValue, album });
  }

  async function selectAlbum(album) {
    if (!album) {
      selectedAlbumKey = null;
      selectedAlbumFetchId = null;
      albumDetail = null;
      detailError = "";
      detailLoading = false;
      return;
    }

    const key = getAlbumKey(album);
    const fetchId = getAlbumFetchId(album);

    selectedAlbumKey = key;
    selectedAlbumFetchId = fetchId;
    albumDetail = album;
    detailError = "";

    if (!fetchId || (album?.tracks && album.tracks.length)) {
      detailLoading = false;
      return;
    }

    const requestId = ++detailRequestId;
    detailLoading = true;

    try {
      const data = await fetchAlbum(fetchId, { token });
      if (detailRequestId === requestId) {
        albumDetail = {
          ...album,
          ...data,
        };
      }
    } catch (err) {
      if (detailRequestId === requestId) {
        if (err instanceof ApiError && err.status === 404) {
          const sample = findSampleAlbum(fetchId);
          if (sample) {
            albumDetail = sample;
            detailError = "";
            usingSampleData = true;
          } else {
            detailError = "Album details are unavailable.";
          }
        } else {
          detailError = err?.message || "Unable to load album details.";
        }
      }
    } finally {
      if (detailRequestId === requestId) {
        detailLoading = false;
      }
    }
  }

  function retryDetail() {
    if (!selectedAlbumKey) {
      return;
    }
    const base = albums.find((item) => getAlbumKey(item) === selectedAlbumKey);
    if (base) {
      selectAlbum(base);
    }
  }

  function clearFilters() {
    search = "";
    genre = "all";
  }
</script>

<section class="albums">
  <div class="albums__controls">
    <div class="controls__group">
      <label>
        <span class="label">Search</span>
        <input
          type="search"
          placeholder="Search by artist or title"
          bind:value={search}
          aria-label="Search albums by name"
        />
      </label>
      <label>
        <span class="label">Genre</span>
        <select bind:value={genre} aria-label="Filter albums by genre">
          <option value="all">All genres</option>
          {#each availableGenres as item}
            <option value={item}>{item}</option>
          {/each}
        </select>
      </label>
    </div>
    <div class="controls__actions">
      <button type="button" class="secondary" on:click={clearFilters}>Clear filters</button>
      <button type="button" on:click={loadAlbums} disabled={loading}>
        {#if loading}
          Refreshing...
        {:else}
          Refresh
        {/if}
      </button>
    </div>
  </div>

  <div class="albums__layout">
    <div class="albums__list">
      {#if loading}
        <p class="status">Loading albums...</p>
      {:else if error}
        <div class="status status--error">
          <p>{error}</p>
          <button type="button" on:click={loadAlbums}>Try again</button>
        </div>
      {:else if !filteredAlbums.length}
        <p class="status">No albums match your filters.</p>
      {:else}
        {#if usingSampleData}
          <p class="status status--notice">
            Showing sample albums. Start the API service to see live data.
          </p>
        {/if}
        <ul>
          {#each filteredAlbums as album (getAlbumKey(album))}
            <li>
              <button
                type="button"
                class:selected={getAlbumKey(album) === selectedAlbumKey}
                on:click={() => selectAlbum(album)}
              >
                <div class="album-title-row">
                  <span class="album-title">{album?.title || "Untitled album"}</span>
                  {#if isFavoriteAlbum(album)}
                    <span class="album-badge" aria-label="Favorited">&#9733;</span>
                  {/if}
                </div>
                <span class="album-artist">{album?.artist || "Unknown artist"}</span>
                <span class="album-meta">
                  {#if album?.releaseYear}
                    <span>{album.releaseYear}</span>
                  {/if}
                  {#if album?.rating}
                    <span>Rating: {album.rating} / 5</span>
                  {/if}
                </span>
                {#if getAlbumRating(album)}
                  <span class="album-user-rating">Your rating: {getAlbumRating(album)} / 5</span>
                {/if}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    <div class="albums__detail">
      {#if detailLoading}
        <p class="status">Loading album details...</p>
      {:else if detailError}
        <div class="status status--error">
          <p>{detailError}</p>
          <button type="button" on:click={retryDetail}>Try again</button>
        </div>
      {:else if albumDetail}
        <AlbumPage
          album={albumDetail}
          favorite={isFavoriteAlbum(albumDetail)}
          userRating={getAlbumRating(albumDetail)}
          canInteract={canInteract()}
          interactionMessage={interactionMessage()}
          on:favorite={(event) => sendFavorite(albumDetail, event.detail?.favorite)}
          on:rate={(event) => sendRating(albumDetail, event.detail?.rating)}
        />
      {:else}
        <p class="status">Select an album to view its details.</p>
      {/if}
    </div>
  </div>
</section>

<style>
  .albums {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .albums__controls {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    align-items: flex-end;
  }

  .controls__group {
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-weight: 600;
    color: #1e293b;
  }

  .label {
    text-transform: uppercase;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    color: #64748b;
  }

  input,
  select {
    border: 1px solid #cbd5e1;
    border-radius: 0.6rem;
    padding: 0.65rem 0.85rem;
    font-size: 1rem;
    font-family: inherit;
  }

  input:focus,
  select:focus {
    outline: none;
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
  }

  .controls__actions {
    display: flex;
    gap: 0.75rem;
  }

  .controls__actions button {
    border: none;
    border-radius: 0.6rem;
    padding: 0.6rem 1.2rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.2s ease;
  }

  .controls__actions button:not(.secondary) {
    background: #4f46e5;
    color: #ffffff;
  }

  .controls__actions button:not(.secondary):hover:not(:disabled) {
    background: #4338ca;
    transform: translateY(-1px);
  }

  .controls__actions button.secondary {
    background: #e2e8f0;
    color: #1f2937;
  }

  .controls__actions button.secondary:hover {
    background: #cbd5f5;
  }

  .controls__actions button:disabled {
    background: #94a3b8;
    cursor: wait;
  }

  .albums__layout {
    display: grid;
    grid-template-columns: minmax(240px, 320px) 1fr;
    gap: 2rem;
    align-items: start;
  }

  .albums__list {
    background: #ffffff;
    border-radius: 1rem;
    box-shadow: 0 12px 30px rgba(79, 70, 229, 0.08);
    padding: 1.5rem;
  }

  .albums__list ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .albums__list li button {
    width: 100%;
    text-align: left;
    background: #eef2ff;
    border: none;
    border-radius: 0.8rem;
    padding: 0.85rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    color: #1f2937;
    cursor: pointer;
    font-size: 0.95rem;
    transition: background 0.2s ease, transform 0.2s ease;
  }

  .albums__list li button:hover {
    background: #e0e7ff;
    transform: translateY(-1px);
  }

  .albums__list li button.selected {
    background: #4f46e5;
    color: #ffffff;
    box-shadow: 0 10px 24px rgba(79, 70, 229, 0.25);
  }

  .album-title {
    font-weight: 700;
  }

  .album-artist {
    font-size: 0.9rem;
    color: inherit;
    opacity: 0.85;
  }

  .album-meta {
    display: flex;
    gap: 0.75rem;
    font-size: 0.85rem;
    opacity: 0.8;
  }

  .album-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.65rem;
  }

  .album-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.6rem;
    height: 1.6rem;
    border-radius: 50%;
    background: rgba(252, 211, 77, 0.25);
    color: #f59e0b;
    font-size: 1rem;
    font-weight: 700;
  }

  .album-user-rating {
    font-size: 0.85rem;
    color: rgba(15, 23, 42, 0.8);
  }

  .albums__detail {
    min-height: 360px;
  }

  .status {
    padding: 1.75rem;
    border-radius: 1rem;
    background: #f8fafc;
    color: #1f2937;
    box-shadow: inset 0 0 0 1px rgba(79, 70, 229, 0.12);
    text-align: center;
  }

  .status--error {
    background: #fef2f2;
    color: #b91c1c;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .status--error button {
    border: none;
    background: #ef4444;
    color: #ffffff;
    border-radius: 999px;
    padding: 0.5rem 1.2rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.2s ease;
  }

  .status--error button:hover {
    background: #dc2626;
    transform: translateY(-1px);
  }

  .status--notice {
    background: #f1f5f9;
    color: #0f172a;
    margin-bottom: 1rem;
  }

  @media (max-width: 920px) {
    .albums__layout {
      grid-template-columns: 1fr;
    }

    .albums__detail {
      order: -1;
    }
  }
</style>
