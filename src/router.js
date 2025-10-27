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
    albumViewId.set(albumId);
    navigate("album");

    // Load album data
    albumViewLoading.set(true);
    albumViewError.set("");

    try {
      const currentToken = get(token);
      const requestOptions = currentToken ? { token: currentToken } : undefined;
      const albumData = await fetchAlbum(albumId, requestOptions);
      albumViewData.set(albumData);
    } catch (err) {
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
    // Artist will be loaded by ArtistsView based on slug
    navigate("artists");
    // Store slug for later lookup
    selectedArtist.update((current) => {
      if (current?.slug === slug) return current;
      return { slug }; // Placeholder, will be hydrated by ArtistsView
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
