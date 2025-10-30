import { get, writable, derived } from "svelte/store";
import { searchMusic } from "../api/search.js";
import { token as authToken } from "./auth";

const createEmptyResults = () => ({
  artists: [],
  albums: [],
  tracks: [],
});

export const searchQuery = writable("");
export const searchResults = writable(createEmptyResults());
export const searchLoading = writable(false);
export const searchError = writable(null);
export const searchTimestamp = writable(null);

export const hasSearchResults = derived(searchResults, ($results) => {
  if (!$results || typeof $results !== "object") {
    return false;
  }

  const artistCount = Array.isArray($results.artists) ? $results.artists.length : 0;
  const albumCount = Array.isArray($results.albums) ? $results.albums.length : 0;
  const trackCount = Array.isArray($results.tracks) ? $results.tracks.length : 0;

  return artistCount + albumCount + trackCount > 0;
});

let activeRequestId = 0;

export async function runSearch(term, options = {}) {
  const normalizedTerm = typeof term === "string" ? term.trim() : "";
  searchQuery.set(normalizedTerm);

  if (!normalizedTerm) {
    clearSearchState();
    return;
  }

  const { type = "all", limit = 20, storeResults = false, token: overrideToken } = options || {};

  const requestId = ++activeRequestId;
  searchLoading.set(true);
  searchError.set(null);

  try {
    const headersOptions = {};
    const resolvedToken = overrideToken ?? get(authToken);
    if (resolvedToken) {
      headersOptions.token = resolvedToken;
    }

    const rawResults = await searchMusic(normalizedTerm, type, limit, storeResults, headersOptions);

    if (requestId !== activeRequestId) {
      return;
    }

    searchResults.set(normalizeResults(rawResults));
    searchTimestamp.set(Date.now());
  } catch (error) {
    if (requestId !== activeRequestId) {
      return;
    }

    const message =
      error instanceof Error
        ? error.message || "Search failed. Please try again."
        : "Search failed. Please try again.";

    searchError.set(message);
    searchResults.set(createEmptyResults());
    searchTimestamp.set(Date.now());
  } finally {
    if (requestId === activeRequestId) {
      searchLoading.set(false);
    }
  }
}

export function clearSearchState() {
  activeRequestId += 1;
  searchQuery.set("");
  searchResults.set(createEmptyResults());
  searchError.set(null);
  searchLoading.set(false);
  searchTimestamp.set(null);
}

function normalizeResults(raw) {
  if (!raw || typeof raw !== "object") {
    return createEmptyResults();
  }

  return {
    artists: Array.isArray(raw.artists) ? raw.artists.slice() : [],
    albums: Array.isArray(raw.albums) ? raw.albums.slice() : [],
    tracks: Array.isArray(raw.tracks) ? raw.tracks.slice() : [],
  };
}
