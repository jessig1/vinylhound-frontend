<script>
  import { onMount } from "svelte";
  import Header from "./components/Header.svelte";
  import Sidebar from "./components/Sidebar.svelte";
  import FlashMessage from "./components/FlashMessage.svelte";
  import AuthPanel from "./components/AuthPanel.svelte";
  import ContentPanel from "./components/ContentPanel.svelte";
  import AlbumDetail from "./components/AlbumDetail.svelte";
  import NewsFeed from "./components/NewsFeed.svelte";
  import PlaylistList from "./components/PlaylistList.svelte";
  import ArtistList from "./components/ArtistList.svelte";
  import ArtistDetail from "./components/ArtistDetail.svelte";
  import {
    signup as apiSignup,
    login as apiLogin,
    fetchContent,
    updateContent,
    fetchAlbums,
    fetchAlbum,
    fetchUserAlbums,
    fetchPlaylists,
    favoriteAlbum,
    rateAlbum,
    ApiError,
  } from "./lib/api";
  import { normalizeContent } from "./lib/content";
  import { sampleAlbums, findSampleAlbum } from "./lib/sampleAlbums";
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
  let sidebarOpen = false;
  let playlists = [];
  let playlistsLoading = false;
  let playlistsError = "";
  let selectedPlaylistId = null;
  let selectedArtist = null;
  let artists = [];
  let artistsLoading = false;
  let artistsError = "";
  let artistsInitialized = false;
  let previousView = "news";
  let albumViewId = null;
  let albumViewLoading = false;
  let albumViewError = "";
  let albumViewData = null;
  const samplePlaylists = [
    { id: "sample-1", title: "Morning Warmup Jams", owner: "Editorial Team" },
    { id: "sample-2", title: "Late Night Loops", owner: "Vinyhound Radio" },
    { id: "sample-3", title: "Indie Discoveries", owner: "Marina Flores" },
    { id: "sample-4", title: "Synthwave Ride", owner: "Alex Mercer" },
    { id: "sample-5", title: "Lo-Fi Study", owner: "Chloe Kim" },
    { id: "sample-6", title: "Festival Throwbacks", owner: "Riley Chen" },
    { id: "sample-7", title: "Fresh Pressings", owner: "Editorial Team" },
  ];

  function sanitizeSlug(value = "") {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  function coerceYear(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
  }

  function deriveAlbumIdCandidate(album = {}, fallback = null) {
    if (!album) {
      return fallback;
    }
    return (
      album.id ??
      album._id ??
      album.slug ??
      fallback ??
      (album.artist || album.title
        ? sanitizeSlug(`${album.artist ?? ""}-${album.title ?? ""}`)
        : null)
    );
  }

  function mergeAlbumData(base, incoming) {
    if (!base) {
      return incoming || null;
    }
    if (!incoming) {
      return base;
    }
    const incomingTracks = Array.isArray(incoming.tracks) && incoming.tracks.length ? incoming.tracks : null;
    const incomingGenres = Array.isArray(incoming.genres) && incoming.genres.length ? incoming.genres : null;
    return {
      ...base,
      ...incoming,
      tracks: incomingTracks ?? base.tracks ?? [],
      genres: incomingGenres ?? base.genres ?? [],
      releaseYear: incoming.releaseYear ?? incoming.year ?? base.releaseYear ?? base.year ?? null,
    };
  }

  function buildArtistDirectory(albums = []) {
    if (!Array.isArray(albums) || !albums.length) {
      return [];
    }

    const map = new Map();

    for (const album of albums) {
      if (!album) {
        continue;
      }
      const name = (album.artist || "").trim();
      if (!name) {
        continue;
      }
      const key = name.toLowerCase();
      let entry = map.get(key);
      if (!entry) {
        entry = {
          name,
          slug: sanitizeSlug(name) || key || `artist-${map.size + 1}`,
          albums: [],
          genreCounts: new Map(),
          genreLabels: new Map(),
          songCounts: new Map(),
        };
        map.set(key, entry);
      }

      const releaseYear = coerceYear(
        album.releaseYear ?? album.year ?? album.release_date ?? album.releaseDate
      );

      const albumRecord = {
        id: album.id ?? sanitizeSlug(`${name}-${album.title ?? entry.albums.length + 1}`),
        title: (album.title || "").trim() || "Untitled album",
        releaseYear,
        cover:
          album.coverUrl ??
          album.cover ??
          album.image ??
          album.artwork ??
          album.artworkUrl ??
          album.thumbnail ??
          null,
        rating:
          album.rating !== undefined && album.rating !== null && Number.isFinite(Number(album.rating))
            ? Number(album.rating)
            : null,
      };
      entry.albums.push(albumRecord);

      if (Array.isArray(album.genres)) {
        for (const rawGenre of album.genres) {
          const genre = (rawGenre || "").trim();
          if (!genre) {
            continue;
          }
          const genreKey = genre.toLowerCase();
          const count = entry.genreCounts.get(genreKey) ?? 0;
          entry.genreCounts.set(genreKey, count + 1);
          if (!entry.genreLabels.has(genreKey)) {
            entry.genreLabels.set(genreKey, genre);
          }
        }
      }

      if (Array.isArray(album.tracks)) {
        for (const rawTrack of album.tracks) {
          const trackName =
            typeof rawTrack === "string"
              ? rawTrack.trim()
              : (rawTrack?.title ?? rawTrack?.name ?? "").trim();
          if (!trackName) {
            continue;
          }
          const trackKey = trackName.toLowerCase();
          if (entry.songCounts.has(trackKey)) {
            const current = entry.songCounts.get(trackKey);
            current.count += 1;
          } else {
            entry.songCounts.set(trackKey, { name: trackName, count: 1 });
          }
        }
      }
    }

    const artists = [];
    for (const entry of map.values()) {
      const sortedAlbums = [...entry.albums].sort((a, b) => {
        const yearA = a.releaseYear ?? -Infinity;
        const yearB = b.releaseYear ?? -Infinity;
        if (yearA === yearB) {
          return a.title.localeCompare(b.title);
        }
        return yearB - yearA;
      });

      const genreList = Array.from(entry.genreCounts.entries())
        .sort((a, b) => {
          if (b[1] !== a[1]) {
            return b[1] - a[1];
          }
          return a[0].localeCompare(b[0]);
        })
        .slice(0, 3)
        .map(([key]) => entry.genreLabels.get(key) || key);

      const popularSongs = Array.from(entry.songCounts.values())
        .sort((a, b) => {
          if (b.count !== a.count) {
            return b.count - a.count;
          }
          return a.name.localeCompare(b.name);
        })
        .slice(0, 6)
        .map((item) => item.name);

      const primaryImage = sortedAlbums.find((album) => album.cover)?.cover ?? null;

      artists.push({
        name: entry.name,
        slug: entry.slug,
        genres: genreList,
        recentAlbums: sortedAlbums.slice(0, 4),
        albums: sortedAlbums,
        popularSongs,
        image: primaryImage,
        counts: {
          albums: entry.albums.length,
          songs: entry.songCounts.size,
        },
      });
    }

    return artists.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }

  $: normalizedUser = (activeUser || "").trim().toLowerCase();
  $: userPlaylists =
    playlists && normalizedUser
      ? playlists.filter(
          (item) =>
            item &&
            typeof item.owner === "string" &&
            item.owner.trim().toLowerCase() === normalizedUser
        )
      : [];
  $: sidebarSource = userPlaylists.length ? userPlaylists : samplePlaylists;
  $: playlistSummaries = sidebarSource.map((item, index) => {
    const id = item.id != null ? `playlist-${item.id}` : `playlist-${index}`;
    const ownerLabel =
      normalizedUser && typeof item.owner === "string" && item.owner.trim().toLowerCase() === normalizedUser
        ? "You"
        : item.owner || "Unknown curator";
    return {
      id,
      title: item.title || `Playlist ${index + 1}`,
      owner: ownerLabel,
    };
  });
  $: if (currentView === "artists" && !artistsInitialized && !artistsLoading && !artistsError) {
    loadArtists({ silent: true });
  }

  onMount(() => {
    const stored = readSession();
    if (!stored) {
      return;
    }
    token = stored.token;
    activeUser = stored.username;
    currentView = "news";
    loadContent({ silent: true });
    loadUserAlbums({ silent: true });
    loadPlaylists({ silent: true });
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
      const favoritedValue =
        source?.favorited !== undefined
          ? Boolean(source.favorited)
          : source?.favorite !== undefined
          ? Boolean(source.favorite)
          : false;
      if (!favoritedValue && numericRating === null) {
        continue;
      }
      map[albumId] = {
        albumId,
        favorite: favoritedValue,
        favorited: favoritedValue,
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
    sidebarOpen = false;
    playlists = [];
    playlistsError = "";
    artists = [];
    artistsError = "";
    artistsLoading = false;
    artistsInitialized = false;
    selectedArtist = null;
    resetAlbumCollections();
    resetAlbumView();
    if (showMessage) {
      setMessage("You have been signed out.", "info");
    }
  }

  function handleNavigate(event) {
    const detail = event.detail || {};
    const nextView = detail.view || "profile";
    if (!token && nextView !== "profile") {
      if (currentView !== "profile") {
        currentView = "profile";
      }
      setMessage("Please log in or sign up to continue.", "info");
      return;
    }
    if (currentView === nextView) {
      selectedPlaylistId = detail.playlistId ?? selectedPlaylistId;
      if (nextView === "artists") {
        selectedArtist = null;
      }
      sidebarOpen = false;
      return;
    }
    previousView = currentView;
    if (currentView === "album" && nextView !== "album") {
      resetAlbumView();
    }
    currentView = nextView;
    if (nextView === "artists") {
      selectedArtist = null;
    }
    selectedPlaylistId = detail.playlistId ?? null;
    sidebarOpen = false;
    if (nextView !== "profile") {
      clearMessage();
    }
    if (nextView === "playlists" && (!userPlaylists.length || !playlists.length)) {
      loadPlaylists({ silent: true });
    }
  }

  function handleViewMorePlaylists() {
    selectedPlaylistId = null;
    handleNavigate({ detail: { view: "playlists" } });
  }

  function handleMenuToggle() {
    sidebarOpen = !sidebarOpen;
  }

  function handleSidebarClose() {
    sidebarOpen = false;
  }

  function handleSearchSelection(event) {
    const item = event?.detail?.item;
    if (!item) {
      return;
    }

    if (item.type === "album" || item.type === "song") {
      const album = item.album ?? null;
      const albumId = item.albumId ?? album?.id ?? null;
      openAlbumDetail({ album, albumId });
      sidebarOpen = false;
      return;
    }
  }

  function handleContentAlbumSelect(event) {
    const detail = event?.detail ?? {};
    openAlbumDetail({
      album: detail.album ?? null,
      albumId: detail.albumId ?? null,
    });
    sidebarOpen = false;
  }

  function resetAlbumView() {
    albumViewId = null;
    albumViewData = null;
    albumViewError = "";
    albumViewLoading = false;
  }

  async function openAlbumDetail({ album = null, albumId = null } = {}) {
    const derivedId = deriveAlbumIdCandidate(album ?? {}, albumId ?? null);
    const normalizedId = derivedId ? String(derivedId) : null;
    previousView = currentView !== "album" ? currentView : previousView;
    currentView = "album";
    sidebarOpen = false;

    albumViewLoading = true;
    albumViewError = "";
    albumViewId = normalizedId;
    if (album) {
      albumViewData = mergeAlbumData(albumViewData, {
        ...album,
        artist: album.artist ?? selectedArtist?.name ?? "",
      });
    }

    const requestOptions = token ? { token } : undefined;

    if (!normalizedId && !albumViewData) {
      albumViewError = "Album details are unavailable.";
      albumViewLoading = false;
      return;
    }

    try {
      if (normalizedId) {
        const fetched = await fetchAlbum(normalizedId, requestOptions);
        albumViewData = mergeAlbumData(albumViewData, fetched);
      }

      if ((!albumViewData || !albumViewData.tracks?.length) && normalizedId) {
        const sample = findSampleAlbum(normalizedId);
        if (sample) {
          albumViewData = mergeAlbumData(albumViewData, sample);
        }
      }

      if (!albumViewData) {
        albumViewError = "Album details are unavailable.";
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404 && normalizedId) {
        const sample = findSampleAlbum(normalizedId);
        if (sample) {
          albumViewData = mergeAlbumData(albumViewData, sample);
          albumViewError = "";
        } else {
          albumViewError = "Album details are unavailable.";
        }
      } else {
        albumViewError = err?.message || "Unable to load album details.";
      }
    } finally {
      albumViewLoading = false;
    }
  }

  function handleArtistAlbumSelect(event) {
    const detail = event?.detail ?? {};
    openAlbumDetail({
      album: detail.album ?? null,
      albumId: detail.albumId ?? null,
    });
  }

  function handleAlbumBack() {
    const fallback =
      previousView && previousView !== "album" ? previousView : token ? "artists" : "news";
    currentView = fallback;
    resetAlbumView();
  }

  async function loadArtists({ silent = false, force = false } = {}) {
    if (artistsLoading) {
      return;
    }
    if (!force && artistsInitialized) {
      return;
    }
    if (!silent) {
      clearMessage();
    }
    artistsError = "";
    artistsLoading = true;
    try {
      const albums = await fetchAlbums({ token });
      const source = Array.isArray(albums) && albums.length ? albums : sampleAlbums;
      artists = buildArtistDirectory(source);
      if (selectedArtist) {
        const updated = artists.find((item) => item.slug === selectedArtist.slug);
        selectedArtist = updated || null;
      }
      artistsInitialized = true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        artists = buildArtistDirectory(sampleAlbums);
        if (selectedArtist) {
          const updated = artists.find((item) => item.slug === selectedArtist.slug);
          selectedArtist = updated || null;
        }
        artistsInitialized = true;
      } else {
        artistsError = err?.message || "Unable to load artists.";
        if (!silent) {
          setMessage(artistsError, "error");
        }
        artistsInitialized = false;
      }
    } finally {
      artistsLoading = false;
    }
  }

  async function loadPlaylists({ silent = false } = {}) {
    if (!token || !activeUser) {
      playlists = [];
      return;
    }
    playlistsLoading = true;
    playlistsError = "";
    try {
      const data = await fetchPlaylists();
      playlists = Array.isArray(data) ? data : [];
      if (selectedPlaylistId) {
        const exists = playlists.some((item) => `${item.id}` === `${selectedPlaylistId}`);
        if (!exists) {
          selectedPlaylistId = null;
        }
      }
    } catch (err) {
      playlistsError = err?.message || "Unable to load playlists.";
      if (!silent) {
        setMessage(playlistsError, "error");
      }
    } finally {
      playlistsLoading = false;
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
      await loadPlaylists({ silent: true });
      await loadArtists({ silent: true, force: true });
      setMessage(`Welcome back, ${username}!`, "success");
      currentView = "news";
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
    const normalizedUpdates = { ...updates };
    if ("favorite" in normalizedUpdates && !("favorited" in normalizedUpdates)) {
      normalizedUpdates.favorited = Boolean(normalizedUpdates.favorite);
    }
    if ("favorited" in normalizedUpdates && !("favorite" in normalizedUpdates)) {
      normalizedUpdates.favorite = Boolean(normalizedUpdates.favorited);
    }
    const next = {
      ...base,
      ...normalizedUpdates,
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
    const ratingValue = Number(previousEntry?.rating);
    const currentRating = Number.isFinite(ratingValue) ? ratingValue : null;
    updateAlbumEntry(
      albumId,
      {
        favorite,
        favorited: favorite,
        rating: currentRating,
      },
      detail.album
    );
    try {
      const result = await favoriteAlbum({ token, albumId, favorite, rating: currentRating });
      updateAlbumEntry(
        albumId,
        {
          favorite: Boolean(result?.favorited ?? favorite),
          favorited: Boolean(result?.favorited ?? favorite),
          rating: result?.rating ?? currentRating,
        },
        detail.album
      );
    } catch (err) {
      updateAlbumEntry(
        albumId,
        {
          favorite: Boolean(previousEntry?.favorite ?? false),
          favorited: Boolean(previousEntry?.favorited ?? previousEntry?.favorite ?? false),
          rating: currentRating,
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
    const currentFavorite = Boolean(previousEntry?.favorite ?? false);
    updateAlbumEntry(
      albumId,
      {
        favorite: currentFavorite,
        favorited: currentFavorite,
        rating: desired === null ? null : Number(desired),
      },
      detail.album
    );

    try {
      const result = await rateAlbum({ token, albumId, rating: desired, favorite: currentFavorite });
      const resolved =
        result?.rating === null || result?.rating === undefined
          ? null
          : Number(result.rating);
      updateAlbumEntry(
        albumId,
        {
          favorite: currentFavorite,
          favorited: currentFavorite,
          rating: resolved,
        },
        detail.album
      );
    } catch (err) {
      updateAlbumEntry(
        albumId,
        {
          favorite: currentFavorite,
          favorited: currentFavorite,
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

<main class:has-sidebar={Boolean(token)}>
  <Sidebar
    {token}
    {currentView}
    playlists={playlistSummaries}
    open={sidebarOpen}
    username={activeUser}
    on:navigate={handleNavigate}
    on:viewMore={handleViewMorePlaylists}
    on:close={handleSidebarClose}
  />

  {#if token && sidebarOpen}
    <div class="sidebar-overlay" on:click={handleSidebarClose} />
  {/if}

  <div class="app-content">
    <Header
      {token}
      {activeUser}
      {currentView}
      on:logout={() => logout(true)}
      on:navigate={handleNavigate}
      on:menutoggle={handleMenuToggle}
      on:searchselect={handleSearchSelection}
    />

    <FlashMessage {message} kind={messageKind} />

    {#if currentView === "news"}
      {#if token}
        <NewsFeed
          {content}
          {favoriteAlbums}
          {ratedAlbums}
          {loading}
        />
      {/if}
    {:else if currentView === "profile"}
      {#if token}
        <ContentPanel
          {content}
          bind:draft={contentDraft}
          favoriteAlbums={favoriteAlbums}
          ratedAlbums={ratedAlbums}
          {loading}
          on:save={handleSaveContent}
          on:refresh={handleRefreshContent}
          on:selectalbum={handleContentAlbumSelect}
        />
      {:else}
        <AuthPanel
          bind:this={authPanel}
          {loading}
          on:signup={handleSignup}
          on:login={handleLogin}
        />
      {/if}
    {:else if currentView === "album"}
      <section class="album-page">
        <button type="button" class="album-page__back" on:click={handleAlbumBack}>
          &larr; Back
        </button>
        <AlbumDetail album={albumViewData ?? {}} loading={albumViewLoading} error={albumViewError} />
      </section>
    {:else if currentView === "artists"}
      {#if selectedArtist}
        <ArtistDetail
          artist={selectedArtist}
          on:back={() => {
            selectedArtist = null;
          }}
          on:refresh={() => loadArtists({ force: true })}
          on:selectalbum={handleArtistAlbumSelect}
        />
      {:else}
        <ArtistList
          {artists}
          loading={artistsLoading}
          error={artistsError}
          on:retry={() => loadArtists({ force: true })}
          on:select={(event) => {
            const artist = event.detail;
            if (!artist) {
              return;
            }
            const match = artists.find((item) => item.slug === artist.slug) || artist;
            selectedArtist = match;
          }}
        />
      {/if}
    {:else if currentView === "playlists-new"}
      <section class="placeholder">
        <h2>Create playlist</h2>
        <p>Playlist creation tools are on the roadmap. Stay tuned!</p>
      </section>
    {:else if currentView === "playlists"}
      <PlaylistList
        playlists={userPlaylists}
        loading={playlistsLoading}
        error={playlistsError}
        username={activeUser}
        selectedId={selectedPlaylistId}
        on:select={(event) => {
          const id = event.detail?.id ?? null;
          selectedPlaylistId = id;
        }}
      />
    {/if}
  </div>
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
    min-height: 100vh;
  }

  main.has-sidebar {
    padding-left: calc(260px + 3rem);
  }

  .app-content {
    max-width: 960px;
    margin: 0 auto;
    padding: 2.5rem 1.5rem 4rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .placeholder {
    border-radius: 1.25rem;
    padding: 2.5rem 2rem;
    background: rgba(255, 255, 255, 0.72);
    box-shadow: 0 18px 42px rgba(79, 70, 229, 0.18);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .placeholder h2 {
    margin: 0;
    font-size: 1.75rem;
  }

  .placeholder p {
    margin: 0;
    font-size: 1rem;
    color: rgba(55, 65, 81, 0.85);
  }

  .album-page {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .album-page__back {
    align-self: flex-start;
    border: none;
    border-radius: 0.75rem;
    padding: 0.5rem 1.2rem;
    background: rgba(79, 70, 229, 0.15);
    color: #312e81;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
  }

  .album-page__back:hover,
  .album-page__back:focus-visible {
    background: rgba(79, 70, 229, 0.25);
    box-shadow: 0 12px 28px rgba(79, 70, 229, 0.25);
    outline: none;
    transform: translateY(-1px);
  }

  .sidebar-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.4);
    backdrop-filter: blur(2px);
    z-index: 25;
  }

  @media (min-width: 921px) {
    .sidebar-overlay {
      display: none;
    }
  }

  @media (max-width: 920px) {
    main.has-sidebar {
      padding-left: 0;
    }
  }
</style>
