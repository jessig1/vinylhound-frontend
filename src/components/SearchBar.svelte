<script>
  import { createEventDispatcher, onMount } from "svelte";
  import { fetchAlbums, ApiError } from "../lib/api";
  import { sampleAlbums } from "../lib/sampleAlbums";

  export let token = "";

  let query = "";
  let loading = false;
  let error = "";
  let entries = [];
  let open = false;
  let inputRef;
  let panelRef;
  let lastToken = null;
  const dispatch = createEventDispatcher();

  const TYPE_PRIORITY = {
    album: 0,
    artist: 1,
    song: 2,
  };

  function sanitizeKey(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  function uniqueId(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function buildEntries(albums = []) {
    const output = [];
    const artistEntries = new Map();

    for (const album of albums) {
      if (!album || typeof album !== "object") {
        continue;
      }

      const albumTitle = (album.title || "").trim() || "Untitled album";
      const albumArtist = (album.artist || "").trim() || "Unknown artist";
      const yearFragment = album.releaseYear ? ` - ${album.releaseYear}` : "";
      const normalizedAlbumKey = sanitizeKey(`${albumArtist}-${albumTitle}`);
      const albumId =
        album.id ??
        album._id ??
        album.slug ??
        (normalizedAlbumKey || uniqueId("album"));
      const albumKey = normalizedAlbumKey || albumId;

      output.push({
        id: `album-${albumId}`,
        type: "album",
        title: albumTitle,
        description: `Album - ${albumArtist}${yearFragment}`,
        searchText: `${albumTitle} ${albumArtist} album`.toLowerCase(),
        albumId,
        album,
        artist: albumArtist,
        releaseYear: album.releaseYear ?? null,
        key: albumKey,
      });

      const artistKey = albumArtist.toLowerCase();
      if (artistKey && !artistEntries.has(artistKey)) {
        const normalizedArtistKey = sanitizeKey(albumArtist) || uniqueId("artist");
        const artistEntry = {
          id: `artist-${normalizedArtistKey}`,
          type: "artist",
          title: albumArtist,
          description: `Artist - Featured on "${albumTitle}"`,
          searchText: `${albumArtist} artist`.toLowerCase(),
          artist: albumArtist,
          albums: [album],
          key: normalizedArtistKey,
        };
        artistEntries.set(artistKey, artistEntry);
        output.push(artistEntry);
      } else if (artistKey && artistEntries.has(artistKey)) {
        artistEntries.get(artistKey).albums.push(album);
      }

      if (Array.isArray(album.tracks)) {
        album.tracks.forEach((track, index) => {
          const name =
            typeof track === "string"
              ? track.trim()
              : (track?.title ?? track?.name ?? "").trim();

          if (!name) {
            return;
          }

          const songKey = `song-${albumId}-${index}`;
          output.push({
            id: songKey,
            type: "song",
            title: name,
            description: `Song - ${albumArtist} - ${albumTitle}`,
            searchText: `${name} ${albumArtist} ${albumTitle} song`.toLowerCase(),
            albumId,
            album,
            track,
            trackIndex: index,
            artist: albumArtist,
            key: songKey,
          });
        });
      }
    }

    return output;
  }
  async function loadCatalog(currentToken) {
    loading = true;
    error = "";
    try {
      const albums = await fetchAlbums({ token: currentToken });
      if (currentToken !== token) {
        loading = false;
        return;
      }
      entries = buildEntries(albums);
    } catch (err) {
      if (currentToken !== token) {
        loading = false;
        return;
      }
      if (err instanceof ApiError && err.status === 404) {
        entries = buildEntries(sampleAlbums);
      } else {
        error = err?.message || "Unable to load search catalogue.";
        entries = [];
      }
    } finally {
      loading = false;
    }
  }

  function closePanel() {
    if (open) {
      open = false;
    }
  }

  function handleDocumentClick(event) {
    if (!open) {
      return;
    }
    const target = event.target;
    if (inputRef?.contains(target) || panelRef?.contains(target)) {
      return;
    }
    closePanel();
  }

  onMount(() => {
    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  });

  $: if (token !== lastToken) {
    lastToken = token;
    query = "";
    closePanel();
    if (token) {
      loadCatalog(token);
    } else {
      entries = [];
      error = "";
    }
  }

  $: normalizedQuery = query.trim().toLowerCase();

  function scoreEntry(entry, term) {
    const priority = TYPE_PRIORITY[entry.type] ?? 3;
    const titleLower = entry.title.toLowerCase();
    const startsWith = titleLower.startsWith(term) ? -0.4 : 0;
    const exact = titleLower === term ? -0.6 : 0;
    return priority + startsWith + exact;
  }

  function filterEntries(list, term) {
    if (!term) {
      return [];
    }
    const matches = [];
    for (const entry of list) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      if (entry.searchText.includes(term)) {
        matches.push({
          entry,
          rank: scoreEntry(entry, term),
        });
      }
    }
    matches.sort((a, b) => {
      if (a.rank !== b.rank) {
        return a.rank - b.rank;
      }
      return a.entry.title.localeCompare(b.entry.title);
    });
    return matches.map((item) => item.entry);
  }

  $: filteredResults = filterEntries(entries, normalizedQuery).slice(0, 10);

  function handleFocus() {
    if (!open) {
      open = true;
    }
  }

  function handleInput(event) {
    query = event.currentTarget.value;
    dispatch("input", { query });
    if (query.trim()) {
      open = true;
    }
  }

  function handleKeydown(event) {
    if (event.key === "Escape") {
      closePanel();
      inputRef?.blur();
    } else if (event.key === "Enter") {
      const term = query.trim();
      if (term) {
        event.preventDefault();
        dispatch("submit", { query: term });
      }
    }
  }

  export function setQuery(value = "") {
    query = value;
    dispatch("input", { query });
    if (query.trim()) {
      open = true;
    } else {
      open = false;
    }
    setTimeout(() => {
      inputRef?.focus();
    }, 0);
  }

  function selectResult(item) {
    if (!item) {
      return;
    }
    const detail = {
      item,
      query: query.trim(),
    };
    dispatch("select", detail);
    query = item.title;
    dispatch("input", { query });
    closePanel();
  }
</script>

<div class="search">
  <label class="search__field">
    <span class="search__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" role="img" focusable="false">
        <path
          d="M16.5 14.5h-.79l-.28-.27a6.471 6.471 0 0 0 1.57-4.23A6.5 6.5 0 1 0 10.5 16.5c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 5L21.5 19.5l-5-5Zm-6 0A4.5 4.5 0 1 1 15 10a4.5 4.5 0 0 1-4.5 4.5Z"
        />
      </svg>
    </span>
    <input
      type="search"
      placeholder="Search albums, artists, songs"
      bind:this={inputRef}
      value={query}
      on:focus={handleFocus}
      on:input={handleInput}
      on:keydown={handleKeydown}
      autocomplete="off"
    />
  </label>
  {#if open}
    <div class="search__panel" bind:this={panelRef}>
      {#if loading}
        <div class="search__status">Loading catalogue...</div>
      {:else if error}
        <div class="search__status search__status--error">{error}</div>
      {:else if !normalizedQuery}
        <div class="search__status">Start typing to explore the catalogue.</div>
      {:else if !filteredResults.length}
        <div class="search__status">No matches found.</div>
      {:else}
        <ul class="search__results">
          {#each filteredResults as item (item.id)}
            <li>
              <button type="button" class="result" on:click={() => selectResult(item)}>
                <span class="result__title">{item.title}</span>
                <span class="result__meta">{item.description}</span>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
</div>

<style>
  .search {
    position: relative;
    width: 100%;
  }

  .search__field {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.5rem 0.75rem;
    border-radius: 999px;
    background: rgba(79, 70, 229, 0.08);
    box-shadow: inset 0 0 0 1px rgba(79, 70, 229, 0.12);
    transition: box-shadow 0.2s ease;
  }

  .search__field:focus-within {
    box-shadow: inset 0 0 0 2px rgba(79, 70, 229, 0.35);
  }

  .search__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    color: #4338ca;
  }

  .search__icon svg {
    width: 100%;
    height: 100%;
    fill: currentColor;
  }

  input[type="search"] {
    border: none;
    background: transparent;
    outline: none;
    font-size: 0.95rem;
    width: 100%;
    color: #1f2937;
  }

  input[type="search"]::placeholder {
    color: rgba(79, 70, 229, 0.7);
  }

  .search__panel {
    position: absolute;
    top: calc(100% + 0.4rem);
    left: 0;
    right: 0;
    background: #ffffff;
    border-radius: 1rem;
    box-shadow: 0 24px 50px rgba(15, 23, 42, 0.18);
    padding: 0.75rem;
    z-index: 15;
    max-height: 360px;
    overflow-y: auto;
  }

  .search__status {
    padding: 1rem;
    text-align: center;
    color: #475569;
    font-size: 0.95rem;
  }

  .search__status--error {
    color: #b91c1c;
  }

  .search__results {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .result {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 0.65rem 0.75rem;
    border-radius: 0.75rem;
    transition: background 0.2s ease;
    border: none;
    background: transparent;
    width: 100%;
    text-align: left;
    cursor: pointer;
  }

  .result:hover {
    background: rgba(79, 70, 229, 0.08);
  }

  .result:focus-visible {
    background: rgba(79, 70, 229, 0.12);
    outline: 2px solid rgba(79, 70, 229, 0.45);
    outline-offset: 2px;
  }

  .result__title {
    font-weight: 600;
    color: #111827;
  }

  .result__meta {
    font-size: 0.85rem;
    color: rgba(71, 85, 105, 0.9);
  }

  @media (max-width: 640px) {
    .search__panel {
      position: static;
      margin-top: 0.6rem;
      max-height: none;
    }
  }
</style>

