import { writable, derived } from "svelte/store";

// Album interactions state
export const albumInteractions = writable({});

// Derived collections
export const favoriteAlbums = derived(albumInteractions, ($interactions) => {
  return Object.values($interactions || {}).filter((item) => item.favorite);
});

export const ratedAlbums = derived(albumInteractions, ($interactions) => {
  return Object.values($interactions || {}).filter((item) => Number.isFinite(item?.rating));
});

// Artists state
export const artists = writable([]);
export const artistsLoading = writable(false);
export const artistsError = writable("");
export const artistsInitialized = writable(false);
export const selectedArtist = writable(null);

// Album view state
export const albumViewId = writable(null);
export const albumViewData = writable(null);
export const albumViewLoading = writable(false);
export const albumViewError = writable("");

// Helper functions
function normalizeAlbumKey(identifier) {
  if (identifier === null || identifier === undefined) {
    return null;
  }
  if (typeof identifier === "number" && Number.isFinite(identifier)) {
    return String(identifier);
  }
  const numeric = Number(identifier);
  if (Number.isFinite(numeric)) {
    return String(numeric);
  }
  return String(identifier);
}

function resolveAlbumIdValue(album, fallback) {
  if (album && typeof album === "object") {
    if (album.id !== undefined && album.id !== null) {
      return album.id;
    }
    if (album.albumId !== undefined && album.albumId !== null) {
      return album.albumId;
    }
  }
  return fallback;
}

// Album interactions actions
export function applyAlbumInteractions(entries = []) {
  const map = {};
  for (const entry of entries) {
    const albumId =
      entry?.albumId ||
      entry?.id ||
      entry?.album?.id ||
      entry?.album?._id ||
      entry?.album?.slug ||
      (entry?.album?.artist && entry?.album?.title
        ? `${entry.album.artist} - ${entry.album.title}`
        : null);

    if (!albumId) {
      continue;
    }

    const albumKey = normalizeAlbumKey(albumId);
    if (!albumKey) {
      continue;
    }

    const source = entry?.preference || entry;
    const numericRating =
      source?.rating !== undefined && source?.rating !== null && Number.isFinite(Number(source.rating))
        ? Number(source.rating)
        : null;

    const favoritedValue =
      source?.favorited !== undefined
        ? Boolean(source.favorited)
        : source?.favorite !== undefined
        ? Boolean(source.favorite)
        : false;

    if (!favoritedValue && numericRating === null) {
      continue;
    }

    const resolvedAlbumId = resolveAlbumIdValue(entry?.album, albumId);
    map[albumKey] = {
      albumKey,
      albumId: resolvedAlbumId ?? albumId,
      favorite: favoritedValue,
      favorited: favoritedValue,
      rating: numericRating,
      album: entry?.album || entry?.preference?.album || null,
      title: entry?.title || entry?.album?.title || null,
      artist: entry?.artist || entry?.album?.artist || null,
    };
  }
  albumInteractions.set(map);
}

export function updateAlbumEntry(albumId, updates, album) {
  const albumKey = normalizeAlbumKey(albumId);
  if (!albumKey) {
    return;
  }

  albumInteractions.update(($interactions) => {
    const existing = $interactions[albumKey] || {};
    const mergedAlbum = album || existing.album || null;
    const derivedTitle = album?.title || mergedAlbum?.title || existing.title || null;
    const derivedArtist = album?.artist || mergedAlbum?.artist || existing.artist || null;
    const resolvedAlbumId =
      resolveAlbumIdValue(mergedAlbum, albumId ?? existing.albumId ?? albumKey) ?? albumKey;

    const base = {
      ...existing,
      albumKey,
      albumId: resolvedAlbumId,
      album: mergedAlbum,
      title: derivedTitle,
      artist: derivedArtist,
    };

    const normalizedUpdates = { ...updates };
    if ("favorite" in normalizedUpdates && !("favorited" in normalizedUpdates)) {
      normalizedUpdates.favorited = Boolean(normalizedUpdates.favorite);
    }
    if ("favorited" in normalizedUpdates && !("favorite" in normalizedUpdates)) {
      normalizedUpdates.favorite = Boolean(normalizedUpdates.favorited);
    }

    const next = { ...base, ...normalizedUpdates };
    const hasFavorite = Boolean(next.favorite);
    const hasRating = Number.isFinite(next.rating);

    if (!hasFavorite && !hasRating) {
      const { [albumKey]: removed, ...rest } = $interactions;
      return rest;
    }

    return {
      ...$interactions,
      [albumKey]: next,
    };
  });
}

export function getAlbumInteractionById(interactions, identifier) {
  const key = normalizeAlbumKey(identifier);
  if (!key) {
    return null;
  }
  if (Object.prototype.hasOwnProperty.call(interactions, key)) {
    return interactions[key];
  }
  return null;
}

export function resetAlbumCollections() {
  albumInteractions.set({});
}

export function resetAlbumView() {
  albumViewId.set(null);
  albumViewData.set(null);
  albumViewError.set("");
  albumViewLoading.set(false);
}
