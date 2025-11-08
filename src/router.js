import page from "page";
import { get } from "svelte/store";
import { navigate, currentView, setMessage } from "./stores/ui";
import { token } from "./stores/auth";
import {
  selectedArtist,
  albumViewId,
  albumViewData,
  albumViewLoading,
  albumViewError,
  resetAlbumView
} from "./stores/albums";
import { selectedPlaylistId } from "./stores/playlists";
import { fetchAlbum, ApiError } from "./api";
import { runSearch, clearSearchState, searchQuery, searchLoading } from "./stores/search";

/**
 * Router configuration using page.js
 * Maps URL routes to view states
 */

/**
 * Auth guard middleware - redirects to /profile if not authenticated
 * @param {Object} ctx - Page.js context
 * @param {Function} next - Next middleware function
 */
function requireAuth(ctx, next) {
  const currentToken = get(token);
  if (!currentToken) {
    setMessage("Please log in or sign up to continue.", "info");
    page.redirect("/profile");
    return;
  }
  next();
}

// Route definitions
export const routes = {
  HOME: "/",
  PROFILE: "/profile",
  NEWS: "/news",
  ALBUM: "/album/:id",
  ARTISTS: "/artists",
  ARTIST_DETAIL: "/artists/:slug",
  PLAYLISTS: "/playlists",
  PLAYLIST_DETAIL: "/playlists/:id",
  SEARCH: "/search",
};

/**
 * Initialize the router
 * Sets up all route handlers
 */
export function initRouter() {
  // Home route - redirect to profile or news based on auth
  page("/", (ctx) => {
    // Will be handled by App.svelte based on auth state
    navigate("profile");
  });

  // Profile/Auth page
  page("/profile", (ctx) => {
    navigate("profile");
  });

  // News feed - protected route
  page("/news", requireAuth, (ctx) => {
    navigate("news");
  });

  // Album detail - fetch data on route load
  page("/album/:id", async (ctx) => {
    const albumId = ctx.params.id;
    console.log('[Router] Album detail route - ID from URL:', albumId);

    albumViewId.set(albumId);
    navigate("album");

    // Check if album data is already loaded (e.g., from localStorage or Spotify search)
    const currentAlbumData = get(albumViewData);
    console.log('[Router] Current albumViewData:', currentAlbumData ? {
      title: currentAlbumData.title,
      artist: currentAlbumData.artist,
      id: currentAlbumData.id,
      external_id: currentAlbumData.external_id,
      trackCount: currentAlbumData.tracks?.length || 0
    } : null);

    const isAlreadyLoaded = currentAlbumData &&
                           (currentAlbumData.id === albumId ||
                            currentAlbumData.external_id === albumId ||
                            currentAlbumData.spotify_id === albumId);

    // Skip fetching if data is already loaded or if ID looks like external ID
    const isExternalId = typeof albumId === 'string' && /[^0-9]/.test(albumId);
    if (isAlreadyLoaded || isExternalId) {
      console.log('[Router] ✓ Album data already loaded for ID:', albumId, 'Title:', currentAlbumData?.title);
      return;
    }

    // Load album data from database
    console.log('[Router] Fetching album from API for ID:', albumId);
    albumViewLoading.set(true);
    albumViewError.set("");

    try {
      const currentToken = get(token);
      const requestOptions = currentToken ? { token: currentToken } : undefined;
      const albumData = await fetchAlbum(albumId, requestOptions);
      console.log('[Router] Received album data:', {
        title: albumData?.title,
        artist: albumData?.artist,
        trackCount: albumData?.tracks?.length || 0
      });
      albumViewData.set(albumData);
    } catch (err) {
      console.error('[Router] Failed to fetch album:', err);
      const errorMsg = err instanceof ApiError && err.status === 404
        ? "Album not found."
        : err?.message || "Unable to load album details.";
      albumViewError.set(errorMsg);
    } finally {
      albumViewLoading.set(false);
    }
  });

  // Artists list - protected route
  page("/artists", requireAuth, (ctx) => {
    selectedArtist.set(null);
    navigate("artists");
  });

  // Artist detail - protected route
  page("/artists/:slug", requireAuth, (ctx) => {
    const slug = ctx.params.slug;
    navigate("artists");

    // Only update if current artist doesn't match the slug
    selectedArtist.update((current) => {
      console.log('[Router] Artist detail route - slug from URL:', slug);
      console.log('[Router] Current selectedArtist:', current);

      // If we already have full artist data for this slug, keep it
      if (current && current.slug === slug && current.name) {
        console.log('[Router] ✓ Artist data already loaded for slug:', slug, 'Name:', current.name, 'Albums:', current.albums?.length || 0);
        return current;
      }
      // If slug doesn't match, set placeholder (will be hydrated by ArtistsView)
      console.log('[Router] Setting placeholder for slug:', slug);
      return { slug };
    });
  });

  // Playlists list - protected route
  page("/playlists", requireAuth, (ctx) => {
    selectedPlaylistId.set(null);
    navigate("playlists");
  });

  // Playlist detail - protected route
  page("/playlists/:id", requireAuth, (ctx) => {
    const id = ctx.params.id;
    selectedPlaylistId.set(id);
    navigate("playlists");
  });

  // Search results route
  page("/search", requireAuth, async (ctx) => {
    const params = new URLSearchParams(ctx.querystring ?? "");
    const term = params.get("q") ?? "";
    const previousQuery = get(searchQuery);
    const wasLoading = get(searchLoading);
    const trimmed = term.trim();

    if (!trimmed) {
      navigate("search");
      clearSearchState();
      return;
    }

    navigate("search");
    searchQuery.set(trimmed);

    if (trimmed === previousQuery && wasLoading) {
      return;
    }

    await runSearch(trimmed);
  });

  // 404 - redirect to home
  page("*", (ctx) => {
    console.warn("Route not found:", ctx.path);
    page.redirect("/");
  });

  // Start the router
  page.start();
}

/**
 * Navigate to a route programmatically
 * @param {string} path - The route path
 */
export function navigateTo(path) {
  page(path);
}

/**
 * Build route URLs with parameters
 */
export const buildRoute = {
  home: () => "/",
  profile: () => "/profile",
  news: () => "/news",
  album: (id) => `/album/${encodeURIComponent(id)}`,
  artists: () => "/artists",
  artist: (slug) => `/artists/${encodeURIComponent(slug)}`,
  playlists: () => "/playlists",
  playlist: (id) => `/playlists/${encodeURIComponent(id)}`,
};

/**
 * Stop the router (for cleanup)
 */
export function stopRouter() {
  page.stop();
}
