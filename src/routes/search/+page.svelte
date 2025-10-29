<script lang="ts">
  import { onDestroy } from "svelte";
  import { search, type SearchItem, type SectionResult } from "$lib/search/api";

  const DEBOUNCE_MS = 300;

  let query = "";
  let results: SectionResult[] = [];
  let loading = false;
  let error: string | null = null;

  let debounceId: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | null = null;

  function handleInput(event: Event) {
    query = (event.currentTarget as HTMLInputElement).value;
    scheduleSearch();
  }

  function handleSubmit(event: Event) {
    event.preventDefault();
    scheduleSearch(true);
  }

  function scheduleSearch(immediate = false) {
    if (debounceId) {
      clearTimeout(debounceId);
      debounceId = undefined;
    }

    const trimmed = query.trim();
    if (trimmed.length === 0) {
      resetState();
      return;
    }

    if (immediate) {
      void runSearch(trimmed);
      return;
    }

    debounceId = setTimeout(() => {
      debounceId = undefined;
      void runSearch(trimmed);
    }, DEBOUNCE_MS);
  }

  async function runSearch(term: string) {
    controller?.abort();
    const currentController = new AbortController();
    controller = currentController;

    loading = true;
    error = null;

    try {
      const sectionResults = await search(term, { signal: currentController.signal });
      if (!currentController.signal.aborted && controller === currentController) {
        results = sectionResults;
      }
    } catch (err) {
      if (isAbortError(err)) {
        return;
      }

      error = err instanceof Error ? err.message : "Unexpected error performing search.";
      results = [];
    } finally {
      if (controller === currentController && !currentController.signal.aborted) {
        loading = false;
      }
    }
  }

  function resetState() {
    results = [];
    error = null;
    loading = false;
    controller?.abort();
    controller = null;
  }

  function isAbortError(error: unknown): boolean {
    return (
      error instanceof DOMException
        ? error.name === "AbortError"
        : error instanceof Error
        ? error.name === "AbortError"
        : false
    );
  }

  function formatSectionName(name: string): string {
    return name
      .split(/[_\s-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function itemTitle(item: SearchItem): string {
    if (typeof item.title === "string" && item.title.length > 0) {
      return item.title;
    }

    if (typeof item.name === "string" && item.name.length > 0) {
      return item.name;
    }

    if (item.id !== undefined && item.id !== null) {
      return String(item.id);
    }

    return "Untitled";
  }

  function itemSubtitle(item: SearchItem): string | undefined {
    if (typeof item.subtitle === "string" && item.subtitle.length > 0) {
      return item.subtitle;
    }

    if (typeof item.description === "string" && item.description.length > 0) {
      return item.description;
    }

    if (typeof (item as Record<string, unknown>).artist === "string") {
      return (item as Record<string, string>).artist;
    }

    if (typeof (item as Record<string, unknown>).album === "string") {
      return (item as Record<string, string>).album;
    }

    return undefined;
  }

  function itemHref(item: SearchItem): string | undefined {
    if (typeof item.href === "string" && item.href.length > 0) {
      return item.href;
    }

    if (typeof item.url === "string" && item.url.length > 0) {
      return item.url;
    }

    const externalUrls = (item as Record<string, unknown>).external_urls;
    if (isRecord(externalUrls) && typeof externalUrls.spotify === "string") {
      return externalUrls.spotify;
    }

    return undefined;
  }

  function isRecord(value: unknown): value is Record<string, any> {
    return typeof value === "object" && value !== null;
  }

  onDestroy(() => {
    if (debounceId) {
      clearTimeout(debounceId);
    }

    controller?.abort();
  });
</script>

<form class="search-form" on:submit={handleSubmit}>
  <label class="field">
    <span class="field__label">Search</span>
    <input
      aria-label="Search"
      autocomplete="off"
      autocapitalize="off"
      class="field__input"
      name="q"
      placeholder="Search albums, artists, tracks..."
      type="search"
      bind:value={query}
      on:input={handleInput}
    />
  </label>
</form>

{#if error}
  <p class="status status--error">{error}</p>
{:else if loading}
  <p class="status status--loading">Searching…</p>
{:else if results.length > 0}
  {#each results as section (section.name)}
    <section class="section">
      <h2 class="section__title">{formatSectionName(section.name)}</h2>
      <ul class="section__list">
        {#each section.items as item (item.id ?? itemTitle(item))}
          <li class="result">
            {#if itemHref(item)}
              <a class="result__link" href={itemHref(item)} rel="noreferrer" target="_blank">
                <span class="result__title">{itemTitle(item)}</span>
                {#if itemSubtitle(item)}
                  <span class="result__subtitle">{itemSubtitle(item)}</span>
                {/if}
              </a>
            {:else}
              <span class="result__title">{itemTitle(item)}</span>
              {#if itemSubtitle(item)}
                <span class="result__subtitle">{itemSubtitle(item)}</span>
              {/if}
            {/if}
          </li>
        {/each}
      </ul>
    </section>
  {/each}
{:else if query.trim().length > 0}
  <p class="status status--empty">No results for “{query}”.</p>
{:else}
  <p class="status status--idle">Start typing to search the catalog.</p>
{/if}

<style>
  :global(body) {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .search-form {
    margin-bottom: 1.5rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .field__label {
    font-weight: 600;
    color: #1f2933;
  }

  .field__input {
    padding: 0.75rem 1rem;
    border: 1px solid #cbd5e1;
    border-radius: 0.75rem;
    font-size: 1rem;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .field__input:focus {
    border-color: #6366f1;
    outline: none;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
  }

  .section + .section {
    margin-top: 2rem;
  }

  .section__title {
    margin-bottom: 0.75rem;
    font-size: 1.1rem;
    font-weight: 600;
    color: #1f2933;
  }

  .section__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .result {
    padding: 0.75rem 1rem;
    background: #f8fafc;
    border-radius: 0.75rem;
    border: 1px solid #e2e8f0;
  }

  .result__link {
    color: inherit;
    text-decoration: none;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .result__link:hover .result__title {
    text-decoration: underline;
  }

  .result__title {
    font-weight: 600;
    color: #0f172a;
  }

  .result__subtitle {
    font-size: 0.875rem;
    color: #475569;
  }

  .status {
    margin-top: 1rem;
    color: #475569;
  }

  .status--error {
    color: #dc2626;
  }

  .status--loading {
    color: #6366f1;
  }

  .status--empty,
  .status--idle {
    color: #334155;
  }
</style>
