<script>
  import { onMount } from "svelte";
  import Header from "./components/Header.svelte";
  import FlashMessage from "./components/FlashMessage.svelte";
  import AuthPanel from "./components/AuthPanel.svelte";
  import ContentPanel from "./components/ContentPanel.svelte";
  import AlbumMainPage from "./components/AlbumMainPage.svelte";
  import {
    signup as apiSignup,
    login as apiLogin,
    fetchContent,
    updateContent,
    fetchUserAlbums,
    favoriteAlbum,
    rateAlbum,
    ApiError,
  } from "./lib/api";
  import { normalizeContent } from "./lib/content";
  import { readSession, writeSession, clearSession } from "./lib/session";

  let token = "";
  let activeUser = "";
  let content = [];
  let contentDraft = "";
  let loading = false;
  let message = "";
  let messageKind = "info";
  let authPanel;
  let currentView = "profile";
  let albumInteractions = {};
  let favoriteAlbums = [];
  let ratedAlbums = [];

  onMount(() => {
    const stored = readSession();
    if (!stored) {
      return;
    }
    token = stored.token;
    activeUser = stored.username;
    loadContent({ silent: true });
    loadUserAlbums({ silent: true });
  });

  function setMessage(value = "", kind = "info") {
    message = value;
    messageKind = kind;
  }

  function clearMessage() {
    setMessage();
  }

  function resetAlbumCollections() {
    albumInteractions = {};
    favoriteAlbums = [];
    ratedAlbums = [];
  }

  function applyAlbumInteractions(entries = []) {
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
      const source = entry?.preference || entry;
      const numericRating =
        source?.rating !== undefined && source?.rating !== null && Number.isFinite(Number(source.rating))
          ? Number(source.rating)
          : null;
      const favorite = source?.favorite !== undefined ? Boolean(source.favorite) : false;
      if (!favorite && numericRating === null) {
        continue;
      }
      map[albumId] = {
        albumId,
        favorite,
        rating: numericRating,
        album: entry?.album || entry?.preference?.album || null,
        title: entry?.title || entry?.album?.title || null,
        artist: entry?.artist || entry?.album?.artist || null,
      };
    }
    albumInteractions = map;
    syncAlbumCollections();
  }

  function syncAlbumCollections() {
    const entries = Object.values(albumInteractions || {});
    favoriteAlbums = entries.filter((item) => item.favorite);
    ratedAlbums = entries.filter((item) => Number.isFinite(item?.rating));
  }

  async function execute(task, fallbackMessage) {
    loading = true;
    try {
      await task();
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout(false);
        setMessage("Session expired. Please log in again.", "error");
      } else {
        setMessage(err?.message || fallbackMessage, "error");
      }
      return false;
    } finally {
      loading = false;
    }
  }

  function applySession(newToken, username) {
    token = newToken;
    activeUser = username;
    if (newToken && username) {
      writeSession({ token: newToken, username });
    } else {
      clearSession();
    }
  }

  function logout(showMessage = true) {
    applySession("", "");
    content = [];
    contentDraft = "";
    currentView = "profile";
    resetAlbumCollections();
    if (showMessage) {
      setMessage("You have been signed out.", "info");
    }
  }

  function handleNavigate(event) {
    const nextView = event.detail?.view || "profile";
    if (currentView === nextView) {
      return;
    }
    currentView = nextView;
    if (nextView !== "profile") {
      clearMessage();
    }
    if (nextView === "albums" && token && !Object.keys(albumInteractions || {}).length) {
      loadUserAlbums({ silent: true });
    }
  }

  async function loadContent({ silent } = { silent: false }) {
    if (!token) {
      content = [];
      contentDraft = "";
      resetAlbumCollections();
      return;
    }

    if (!silent) {
      clearMessage();
    }

    await execute(async () => {
      const data = await fetchContent(token);
      content = Array.isArray(data) ? data : [];
      contentDraft = content.join("\n");
    }, "Unable to load content.");
  }

  async function loadUserAlbums({ silent } = { silent: false }) {
    if (!token) {
      resetAlbumCollections();
      return;
    }

    if (!silent) {
      clearMessage();
    }

    try {
      const data = await fetchUserAlbums(token);
      if (Array.isArray(data)) {
        applyAlbumInteractions(data);
      } else if (data && typeof data === "object") {
        applyAlbumInteractions(Object.values(data));
      } else {
        resetAlbumCollections();
      }
    } catch (err) {
      if (!silent) {
        setMessage(err?.message || "Unable to load your albums.", "error");
      }
    }
  }

  async function handleSignup(event) {
    const detail = event.detail || {};
    const username = (detail.username || "").trim();
    const password = detail.password || "";
    const initialContent = normalizeContent(detail.content || "");

    if (!username || !password) {
      setMessage("Username and password are required.", "error");
      return;
    }

    clearMessage();
    const succeeded = await execute(async () => {
      await apiSignup({ username, password, content: initialContent });
    }, "Unable to sign up.");

    if (succeeded) {
      setMessage(`Account created for ${username}. You can log in now.`, "success");
      authPanel?.resetSignup?.();
    }
  }

  async function handleLogin(event) {
    const detail = event.detail || {};
    const username = (detail.username || "").trim();
    const password = detail.password || "";

    if (!username || !password) {
      setMessage("Username and password are required.", "error");
      return;
    }

    clearMessage();
    const succeeded = await execute(async () => {
      const data = await apiLogin({ username, password });
      const tokenValue = data?.token || "";
      if (!tokenValue) {
        throw new Error("Login response missing token.");
      }
      applySession(tokenValue, username);
      authPanel?.resetLogin?.();
    }, "Unable to log in.");

    if (succeeded) {
      await loadContent({ silent: true });
      await loadUserAlbums({ silent: true });
      setMessage(`Welcome back, ${username}!`, "success");
      currentView = "profile";
    }
  }

  async function handleSaveContent(event) {
    if (!token) {
      setMessage("You need to be logged in to save.", "error");
      return;
    }

    clearMessage();
    const draftValue = event.detail?.draft ?? contentDraft;
    const entries = normalizeContent(draftValue);

    const succeeded = await execute(async () => {
      await updateContent(token, entries);
    }, "Unable to save content.");

    if (succeeded) {
      content = entries;
      contentDraft = entries.join("\n");
      setMessage("Content updated.", "success");
    }
  }

  async function handleRefreshContent() {
    await loadContent({ silent: false });
  }

  function ensureAlbumEntry(albumId, album) {
    const existing = albumInteractions[albumId] || {};
    const mergedAlbum = album || existing.album || null;
    const derivedTitle = album?.title || mergedAlbum?.title || existing.title || null;
    const derivedArtist = album?.artist || mergedAlbum?.artist || existing.artist || null;
    return {
      ...existing,
      albumId,
      album: mergedAlbum,
      title: derivedTitle,
      artist: derivedArtist,
    };
  }

  function updateAlbumEntry(albumId, updates, album) {
    if (!albumId) {
      return;
    }
    const base = ensureAlbumEntry(albumId, album);
    const next = {
      ...base,
      ...updates,
    };

    const hasFavorite = Boolean(next.favorite);
    const hasRating = Number.isFinite(next.rating);

    if (!hasFavorite && !hasRating) {
      const { [albumId]: removed, ...rest } = albumInteractions;
      albumInteractions = rest;
    } else {
      albumInteractions = {
        ...albumInteractions,
        [albumId]: next,
      };
    }
    syncAlbumCollections();
  }

  async function handleAlbumFavorite(event) {
    if (!token) {
      setMessage("You need to be logged in to favorite albums.", "error");
      return;
    }
    const detail = event.detail || {};
    const albumId = detail.albumId;
    if (!albumId) {
      return;
    }
    const favorite = Boolean(detail.favorite);
    const previousEntry = albumInteractions[albumId];
    updateAlbumEntry(
      albumId,
      {
        favorite,
        rating: previousEntry?.rating ?? null,
      },
      detail.album
    );
    try {
      const result = await favoriteAlbum({ token, albumId, favorite });
      updateAlbumEntry(
        albumId,
        {
          favorite: Boolean(result?.favorite ?? favorite),
          rating: previousEntry?.rating ?? null,
        },
        detail.album
      );
    } catch (err) {
      updateAlbumEntry(
        albumId,
        {
          favorite: Boolean(previousEntry?.favorite ?? false),
          rating: previousEntry?.rating ?? null,
        },
        detail.album
      );
      if (err instanceof ApiError && err.status === 401) {
        logout(false);
        setMessage("Session expired. Please log in again.", "error");
      } else {
        setMessage(err?.message || "Unable to update favorite.", "error");
      }
    }
  }

  async function handleAlbumRate(event) {
    if (!token) {
      setMessage("You need to be logged in to rate albums.", "error");
      return;
    }
    const detail = event.detail || {};
    const albumId = detail.albumId;
    if (!albumId) {
      return;
    }
    const rating = detail.rating;
    const previousEntry = albumInteractions[albumId];
    const desired = rating === null || rating === undefined ? null : rating;
    updateAlbumEntry(
      albumId,
      {
        favorite: Boolean(previousEntry?.favorite ?? false),
        rating: desired === null ? null : Number(desired),
      },
      detail.album
    );

    try {
      const result = await rateAlbum({ token, albumId, rating: desired });
      const resolved =
        result?.rating === null || result?.rating === undefined
          ? null
          : Number(result.rating);
      updateAlbumEntry(
        albumId,
        {
          favorite: Boolean(previousEntry?.favorite ?? false),
          rating: resolved,
        },
        detail.album
      );
    } catch (err) {
      updateAlbumEntry(
        albumId,
        {
          favorite: Boolean(previousEntry?.favorite ?? false),
          rating: previousEntry?.rating ?? null,
        },
        detail.album
      );
      if (err instanceof ApiError && err.status === 401) {
        logout(false);
        setMessage("Session expired. Please log in again.", "error");
      } else {
        setMessage(err?.message || "Unable to update rating.", "error");
      }
    }
  }
</script>

<main>
  <Header
    {token}
    {activeUser}
    {currentView}
    on:logout={() => logout(true)}
    on:navigate={handleNavigate}
  />

  <FlashMessage {message} kind={messageKind} />

  {#if currentView === "profile"}
    {#if token}
      <ContentPanel
        {content}
        bind:draft={contentDraft}
        favoriteAlbums={favoriteAlbums}
        ratedAlbums={ratedAlbums}
        {loading}
        on:save={handleSaveContent}
        on:refresh={handleRefreshContent}
      />
    {:else}
      <AuthPanel
        bind:this={authPanel}
        {loading}
        on:signup={handleSignup}
        on:login={handleLogin}
      />
    {/if}
  {:else if currentView === "albums"}
    <AlbumMainPage
      {token}
      userAlbums={albumInteractions}
      on:favorite={handleAlbumFavorite}
      on:rate={handleAlbumRate}
    />
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: "Segoe UI", Roboto, sans-serif;
    background: radial-gradient(circle at top left, #f5f5ff, #eef2f7 45%, #dde4ee);
    min-height: 100vh;
    color: #1f2933;
  }

  main {
    max-width: 960px;
    margin: 0 auto;
    padding: 2.5rem 1.5rem 4rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
</style>
