<script>
  import { createEventDispatcher, onDestroy, onMount } from "svelte";
  import { searchMusic } from "../api/search.js";
  import { buildRoute, navigateTo } from "../router";

  export let placeholder = "Search for artists and albums...";

  const MIN_QUERY_LENGTH = 2;
  const SUGGESTION_LIMIT = 4;
  const DEBOUNCE_MS = 250;

  const dispatch = createEventDispatcher();

  let container;
  let query = "";
  let trimmedQuery = "";
  let suggestions = [];
  let suggestionsLoading = false;
  let suggestionsError = "";
  let highlightedIndex = -1;
  let lastRequestedTerm = "";

  let debounceTimer = null;
  let requestSequence = 0;

  $: trimmedQuery = query.trim();

  function handleInput(event) {
    query = event.currentTarget.value;
    scheduleSuggestions(query);
  }

  function scheduleSuggestions(rawValue) {
    const term = rawValue.trim();
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    if (term.length < MIN_QUERY_LENGTH) {
      resetSuggestions();
      return;
    }

    debounceTimer = setTimeout(() => {
      fetchSuggestions(term);
    }, DEBOUNCE_MS);
  }

  async function fetchSuggestions(term) {
    const currentSequence = ++requestSequence;
    suggestionsLoading = true;
    suggestionsError = "";

    try {
      const data = await searchMusic(term, "all", 10, false);
      if (currentSequence !== requestSequence) {
        return;
      }
      suggestions = buildSuggestions(data, term);
      highlightedIndex = -1;
      lastRequestedTerm = term;
      if (!suggestions.length) {
        suggestionsError = "";
      }
    } catch (err) {
      if (currentSequence !== requestSequence) {
        return;
      }
      suggestions = [];
      suggestionsError = err?.message || "Search failed";
      dispatch("error", { error: suggestionsError });
    } finally {
      if (currentSequence === requestSequence) {
        suggestionsLoading = false;
      }
    }
  }

  function resetSuggestions() {
    suggestions = [];
    suggestionsError = "";
    highlightedIndex = -1;
    suggestionsLoading = false;
    lastRequestedTerm = "";
  }

  function clearSearch() {
    query = "";
    resetSuggestions();
  }

  function handleSearch() {
    const term = trimmedQuery;
    if (!term) {
      resetSuggestions();
      return;
    }
    navigateTo(`/search?q=${encodeURIComponent(term)}`);
    dispatch("fullsearch", { query: term });
    resetSuggestions();
  }

  function handleKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        selectSuggestion(suggestions[highlightedIndex]);
      } else {
        handleSearch();
      }
    } else if (event.key === "ArrowDown") {
      if (!suggestions.length) {
        return;
      }
      event.preventDefault();
      highlightedIndex = (highlightedIndex + 1) % suggestions.length;
      ensureHighlightedVisible();
    } else if (event.key === "ArrowUp") {
      if (!suggestions.length) {
        return;
      }
      event.preventDefault();
      highlightedIndex = (highlightedIndex - 1 + suggestions.length) % suggestions.length;
      ensureHighlightedVisible();
    } else if (event.key === "Escape") {
      event.preventDefault();
      resetSuggestions();
    }
  }

  function ensureHighlightedVisible() {
    requestAnimationFrame(() => {
      const list = container?.querySelector(".suggestion-list");
      if (!list) return;
      const item = list.children?.[highlightedIndex];
      if (item?.scrollIntoView) {
        item.scrollIntoView({ block: "nearest" });
      }
    });
  }

  function selectSuggestion(item) {
    if (!item) return;

    if (item.type === "artist") {
      dispatch("selectartist", item.raw);
      if (item.href) {
        navigateTo(item.href);
      }
    } else if (item.type === "album") {
      dispatch("selectalbum", item.raw);
    } else if (item.href) {
      navigateTo(item.href);
    }

    query = "";
    resetSuggestions();
  }

  function buildSuggestions(data, fallbackTerm) {
    const items = [];
    const seen = new Set();

    if (Array.isArray(data?.artists)) {
      for (const artist of data.artists) {
        if (items.length >= SUGGESTION_LIMIT) break;
        const id = normalizeId(artist);
        if (!id || seen.has(`artist-${id}`)) continue;
        seen.add(`artist-${id}`);
        items.push({
          key: `artist-${id}`,
          type: "artist",
          title: artist.name ?? fallbackTerm,
          subtitle:
            Array.isArray(artist.genres) && artist.genres.length
              ? artist.genres[0]
              : "Artist",
          image: artist.image_url,
          href: artistHref(artist),
          raw: artist,
        });
      }
    }

    if (items.length < SUGGESTION_LIMIT && Array.isArray(data?.albums)) {
      for (const album of data.albums) {
        if (items.length >= SUGGESTION_LIMIT) break;
        const id = normalizeAlbumId(album);
        if (!id || seen.has(`album-${id}`)) continue;
        seen.add(`album-${id}`);
        const releaseYear = extractYear(album.release_date ?? album.releaseYear);
        items.push({
          key: `album-${id}`,
          type: "album",
          title: album.title ?? fallbackTerm,
          subtitle: releaseYear
            ? `${album.artist ?? "Album"} • ${releaseYear}`
            : album.artist ?? "Album",
          image: album.image_url ?? album.cover,
          raw: album,
        });
      }
    }

    return items.slice(0, SUGGESTION_LIMIT);
  }

  function normalizeId(entity) {
    return (
      entity?.external_id ||
      entity?.id ||
      entity?.spotify_id ||
      entity?.slug ||
      entity?.name ||
      null
    );
  }

  function normalizeAlbumId(album) {
    return (
      album?.id ||
      album?.external_id ||
      album?.spotify_id ||
      (album?.artist && album?.title && `${album.artist}-${album.title}`) ||
      null
    );
  }

  function extractYear(value) {
    if (!value) return "";
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.getFullYear();
    }
    const match = String(value).match(/\d{4}/);
    return match ? match[0] : "";
  }

  function toSlug(value) {
    return String(value ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function artistHref(artist) {
    const directSlug =
      (typeof artist?.slug === "string" && artist.slug.trim()) ||
      toSlug(artist?.name) ||
      String(artist?.external_id ?? "") ||
      String(artist?.id ?? "");

    const finalSlug = directSlug.trim() ? directSlug.trim() : toSlug(artist?.id);
    if (!finalSlug) {
      return buildRoute.artists();
    }
    return buildRoute.artist(finalSlug);
  }

  function handleDocumentClick(event) {
    if (!container?.contains(event.target)) {
      resetSuggestions();
    }
  }

  onMount(() => {
    document.addEventListener("click", handleDocumentClick, true);
  });

  onDestroy(() => {
    document.removeEventListener("click", handleDocumentClick, true);
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
  });
</script>

<div class="spotify-search-simple" bind:this={container}>
  <div class="search-box">
    <input
      type="text"
      class="search-input"
      bind:value={query}
      on:input={handleInput}
      on:keydown={handleKeyDown}
      {placeholder}
    />
    <div class="search-buttons">
      {#if query}
        <button type="button" class="btn-clear" title="Clear" on:click={clearSearch}>
          ✕
        </button>
      {/if}
      <button
        type="button"
        class="btn-search"
        on:click={handleSearch}
        disabled={!trimmedQuery}
      >
        Search
      </button>
    </div>
  </div>

  {#if suggestionsError}
    <div class="error-message">{suggestionsError}</div>
  {:else if suggestionsLoading && !suggestions.length}
    <div class="suggestion-status">Searching…</div>
  {/if}

  {#if suggestions.length}
    <ul class="suggestion-list">
      {#each suggestions as item, index (item.key)}
        <li class:selected={index === highlightedIndex}>
          <button type="button" class="suggestion" on:click={() => selectSuggestion(item)}>
            {#if item.image}
              <img src={item.image} alt={item.title} />
            {:else}
              <div class="placeholder">{item.title.charAt(0)}</div>
            {/if}
            <div class="meta">
              <span class="title">{item.title}</span>
              <span class="subtitle">{item.subtitle}</span>
            </div>
            <span class="badge">{item.type}</span>
          </button>
        </li>
      {/each}
    </ul>
  {:else if !suggestionsLoading && trimmedQuery.length >= MIN_QUERY_LENGTH}
    <div class="suggestion-status">No quick matches for “{trimmedQuery}”. Press Enter to search.</div>
  {/if}
</div>

<style>
  .spotify-search-simple {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .search-box {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .search-input {
    flex: 1;
    padding: 0.65rem 1rem;
    border-radius: 0.9rem;
    border: 1px solid rgba(99, 102, 241, 0.35);
    font-size: 0.95rem;
    transition: box-shadow 0.2s ease, border-color 0.2s ease;
  }

  .search-input:focus {
    outline: none;
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.18);
  }

  .search-buttons {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .btn-clear,
  .btn-search {
    border: none;
    border-radius: 0.85rem;
    padding: 0.55rem 1rem;
    font-size: 0.9rem;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
  }

  .btn-clear {
    background: rgba(79, 70, 229, 0.08);
    color: #312e81;
  }

  .btn-clear:hover,
  .btn-clear:focus-visible {
    background: rgba(79, 70, 229, 0.18);
    outline: none;
  }

  .btn-search {
    background: linear-gradient(135deg, #4f46e5, #6366f1);
    color: #ffffff;
    font-weight: 600;
  }

  .btn-search:disabled {
    background: rgba(99, 102, 241, 0.25);
    cursor: not-allowed;
  }

  .btn-search:not(:disabled):hover,
  .btn-search:not(:disabled):focus-visible {
    transform: translateY(-1px);
    box-shadow: 0 12px 20px rgba(79, 70, 229, 0.26);
    outline: none;
  }

  .error-message,
  .suggestion-status {
    font-size: 0.85rem;
    color: rgba(79, 70, 229, 0.7);
    padding: 0 0.4rem;
  }

  .error-message {
    color: #dc2626;
  }

  .suggestion-list {
    list-style: none;
    margin: 0;
    padding: 0.4rem 0;
    border-radius: 1rem;
    border: 1px solid rgba(148, 163, 184, 0.35);
    box-shadow: 0 18px 36px rgba(15, 23, 42, 0.18);
    background: rgba(255, 255, 255, 0.96);
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    max-height: 18rem;
    overflow-y: auto;
  }

  .suggestion-list li.selected .suggestion {
    background: rgba(79, 70, 229, 0.12);
  }

  .suggestion {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.55rem 0.9rem;
    border: none;
    background: transparent;
    text-align: left;
    cursor: pointer;
    border-radius: 0.85rem;
    transition: background 0.2s ease, transform 0.2s ease;
  }

  .suggestion:hover,
  .suggestion:focus-visible {
    background: rgba(79, 70, 229, 0.1);
    outline: none;
  }

  .suggestion img,
  .suggestion .placeholder {
    width: 2.45rem;
    height: 2.45rem;
    border-radius: 0.75rem;
    object-fit: cover;
    flex: 0 0 auto;
    background: rgba(79, 70, 229, 0.2);
    display: grid;
    place-items: center;
    color: #1f2937;
    font-weight: 700;
    text-transform: uppercase;
  }

  .meta {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    flex: 1;
    min-width: 0;
  }

  .title {
    font-weight: 600;
    color: #111827;
    font-size: 0.95rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .subtitle {
    font-size: 0.8rem;
    color: rgba(55, 65, 81, 0.75);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .badge {
    text-transform: uppercase;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: #4338ca;
    background: rgba(79, 70, 229, 0.16);
    padding: 0.25rem 0.55rem;
    border-radius: 999px;
  }

  @media (max-width: 920px) {
    .suggestion-list {
      position: static;
      box-shadow: none;
      border: 1px solid rgba(148, 163, 184, 0.28);
    }
  }
</style>
