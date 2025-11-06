<script>
  import { createEventDispatcher, onMount } from "svelte";
  import RatingStars from "./RatingStars.svelte";
  import TrackItem from "./TrackItem.svelte";
  import AddToPlaylistModal from "./AddToPlaylistModal.svelte";
  import LoginPromptModal from "./LoginPromptModal.svelte";
  import { searchSongs, favoriteAlbum, addToCollection, importAlbum } from "../api";
  import {
    coverAltTextForAlbum,
    discoverGenres,
    discoverTrackList,
    normalizeAlbumRating,
  } from "../lib/albumDetailHelpers.js";

  export let album = {
    title: "Untitled album",
    artist: "Unknown artist",
    cover: null,
    genres: [],
    releaseYear: null,
    tracks: [],
  };

  export let loading = false;
  export let error = "";
  export let canInteract = false;
  export let userRating = null;
  export let albumId = null;
  export let token = null;

  let fallbackGenres = [];
  let normalizedTracks = [];
  let currentRating = null;
  let showPlaylistModal = false;
  let selectedTrack = null;
  let loadingSongs = false;
  let songsList = [];
  let showLoginPrompt = false;
  let isFavorited = false;
  let isInWishlist = false;
  let isInOwned = false;
  let loadingFavorite = false;
  let loadingCollection = false;
  let loadingImport = false;
  let importAttempted = false;
  let importSucceeded = false;
  let databaseAlbumId = null; // Store the database ID after import
  let successMessage = "";
  let errorMessage = "";

  const dispatch = createEventDispatcher();

  $: fallbackGenres = discoverGenres(album);
  $: currentRating = normalizeAlbumRating(userRating);

  // Auto-import external albums when viewed (once per album)
  $: if (isExternalAlbum && canInteract && albumId && token && !loadingImport && !importAttempted) {
    autoImportExternalAlbum();
  }

  // Reset import flags when album changes
  $: if (albumId) {
    importAttempted = false;
    importSucceeded = false;
    databaseAlbumId = null;
  }

  // Use database ID if available, otherwise fall back to albumId
  $: effectiveAlbumId = databaseAlbumId || albumId;

  // Load songs from database when album changes, but only if album doesn't already have tracks
  $: if (albumId && (!album.tracks || album.tracks.length === 0)) {
    loadSongsForAlbum(albumId);
  }

  // Use songs from database if available, otherwise fall back to album tracks
  $: normalizedTracks = songsList.length > 0 ? songsList : discoverTrackList(album);

  async function loadSongsForAlbum(id) {
    if (!id) return;

    // Skip if this looks like an external ID (Spotify, etc.) - contains non-numeric characters
    if (typeof id === 'string' && /[^0-9]/.test(id)) {
      console.log('Skipping song load for external album ID:', id);
      return;
    }

    loadingSongs = true;
    try {
      const songs = await searchSongs({ albumId: id, token });
      songsList = songs.map((song, index) => ({
        id: song.id,
        title: song.title,
        artist: song.artist,
        album: song.album,
        albumId: song.albumId,
        duration: song.duration,
        lengthSeconds: song.lengthSeconds,
        trackNumber: song.trackNumber || index + 1,
        lengthLabel: formatDuration(song.duration),
      }));
    } catch (err) {
      console.error("Failed to load songs for album:", err);
      // Fall back to album tracks if song loading fails
      songsList = [];
    } finally {
      loadingSongs = false;
    }
  }

  function formatDuration(seconds) {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }

  const coverAltText = () => coverAltTextForAlbum(album);

  $: albumIdentifier =
    albumId ??
    album?.id ??
    album?.albumId ??
    album?._id ??
    album?.slug ??
    (album?.artist && album?.title ? `${album.artist}-${album.title}` : null);

  // Check if this is an external album (Spotify, etc.) vs database album
  $: isExternalAlbum = albumIdentifier && typeof albumIdentifier === 'string' && /[^0-9]/.test(albumIdentifier);
  // Enable buttons if user is authenticated and either it's not external OR import succeeded
  $: canFavoriteOrCollect = canInteract && (!isExternalAlbum || importSucceeded);

  function resolveAverageRating(record) {
    if (!record || typeof record !== "object") {
      return null;
    }
    const candidates = [
      record.rating,
      record.averageRating,
      record.ratingAverage,
      record.average_rating,
      record.rating_average,
    ];
    for (const candidate of candidates) {
      const numeric = Number(candidate);
      if (Number.isFinite(numeric)) {
        return numeric;
      }
    }
    return null;
  }

  function resolveRatingCount(record) {
    if (!record || typeof record !== "object") {
      return 0;
    }
    const candidates = [
      record.ratingCount,
      record.rating_count,
      record.ratingsCount,
      record.ratings_count,
    ];
    for (const candidate of candidates) {
      const numeric = Number(candidate);
      if (Number.isFinite(numeric) && numeric >= 0) {
        return Math.trunc(numeric);
      }
    }
    return 0;
  }

  $: averageCommunityRating = resolveAverageRating(album);
  $: communityRatingCount = resolveRatingCount(album);
  $: communityRatingDisplay =
    communityRatingCount > 0 ? formatCommunityRating(averageCommunityRating) : null;

  function formatCommunityRating(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return null;
    }
    if (Number.isInteger(numeric)) {
      return `${numeric}/5`;
    }
    return `${numeric.toFixed(1)}/5`;
  }

  function handleRatingChange(event) {
    const next = normalizeAlbumRating(event?.detail?.rating);
    currentRating = next;
    dispatch("rate", {
      albumId: albumIdentifier ?? null,
      album,
      rating: next,
    });
  }

  function handleAddToPlaylist(event) {
    const { track } = event.detail;
    selectedTrack = track;
    showPlaylistModal = true;
  }

  function handlePlaylistModalSuccess(event) {
    const { playlist, track, message } = event.detail;
    dispatch("addToPlaylist", {
      track,
      playlist,
      albumId: albumIdentifier ?? null,
      album,
      message,
    });
  }

  function handlePlaylistModalClose() {
    showPlaylistModal = false;
    selectedTrack = null;
  }

  function handleAddAllToPlaylist() {
    if (normalizedTracks.length === 0) return;
    if (!canInteract) {
      showLoginPrompt = true;
      return;
    }
    // Create a special track object representing all tracks
    selectedTrack = {
      id: null,
      title: `All tracks from ${album?.title || 'this album'}`,
      isAlbum: true,
      allTracks: normalizedTracks,
    };
    showPlaylistModal = true;
  }

  function handleRequiresLogin() {
    showLoginPrompt = true;
  }

  function handleLoginPromptLogin() {
    showLoginPrompt = false;
    dispatch("navigateToLogin");
  }

  function handleLoginPromptSignup() {
    showLoginPrompt = false;
    dispatch("navigateToSignup");
  }

  function handleLoginPromptClose() {
    showLoginPrompt = false;
  }

  async function handleToggleFavorite() {
    if (!canInteract) {
      showLoginPrompt = true;
      return;
    }

    console.log('[AlbumDetail] handleToggleFavorite - State:', {
      isExternalAlbum,
      importSucceeded,
      albumId,
      databaseAlbumId,
      effectiveAlbumId
    });

    if (isExternalAlbum && !importSucceeded) {
      errorMessage = "Please wait while the album is being imported";
      setTimeout(() => errorMessage = "", 5000);
      return;
    }

    if (!effectiveAlbumId || !token) {
      console.error('[AlbumDetail] Cannot favorite - missing ID or token:', { effectiveAlbumId, hasToken: !!token });
      errorMessage = "Unable to favorite: Album ID or token missing";
      setTimeout(() => errorMessage = "", 3000);
      return;
    }

    loadingFavorite = true;
    errorMessage = "";
    successMessage = "";

    try {
      const newFavStatus = !isFavorited;
      console.log('[AlbumDetail] Calling favoriteAlbum with ID:', effectiveAlbumId);

      await favoriteAlbum({
        token,
        albumId: effectiveAlbumId,
        favorite: newFavStatus,
        rating: currentRating
      });

      isFavorited = newFavStatus;
      successMessage = newFavStatus ? "Added to favorites!" : "Removed from favorites";
      setTimeout(() => successMessage = "", 3000);

      dispatch("favoriteToggled", { albumId: effectiveAlbumId, isFavorited: newFavStatus });
    } catch (err) {
      console.error("[AlbumDetail] Failed to toggle favorite:", err);
      errorMessage = err.message || "Failed to update favorite status";
      setTimeout(() => errorMessage = "", 3000);
    } finally {
      loadingFavorite = false;
    }
  }

  async function handleAddToWishlist() {
    if (!canInteract) {
      showLoginPrompt = true;
      return;
    }

    if (isExternalAlbum && !importSucceeded) {
      errorMessage = "Please wait while the album is being imported";
      setTimeout(() => errorMessage = "", 5000);
      return;
    }

    if (!effectiveAlbumId || !token) {
      errorMessage = "Unable to add to wishlist: Album ID or token missing";
      setTimeout(() => errorMessage = "", 3000);
      return;
    }

    loadingCollection = true;
    errorMessage = "";
    successMessage = "";

    try {
      await addToCollection({
        token,
        albumId: effectiveAlbumId,
        collectionType: "wishlist",
        notes: ""
      });

      isInWishlist = true;
      successMessage = "Added to wishlist!";
      setTimeout(() => successMessage = "", 3000);

      dispatch("addedToCollection", { albumId: effectiveAlbumId, collectionType: "wishlist" });
    } catch (err) {
      console.error("Failed to add to wishlist:", err);
      if (err.message.includes("already in this collection")) {
        errorMessage = "Album is already in your wishlist";
      } else {
        errorMessage = err.message || "Failed to add to wishlist";
      }
      setTimeout(() => errorMessage = "", 3000);
    } finally {
      loadingCollection = false;
    }
  }

  async function handleAddToOwned() {
    if (!canInteract) {
      showLoginPrompt = true;
      return;
    }

    if (isExternalAlbum && !importSucceeded) {
      errorMessage = "Please wait while the album is being imported";
      setTimeout(() => errorMessage = "", 5000);
      return;
    }

    if (!effectiveAlbumId || !token) {
      errorMessage = "Unable to add to collection: Album ID or token missing";
      setTimeout(() => errorMessage = "", 3000);
      return;
    }

    loadingCollection = true;
    errorMessage = "";
    successMessage = "";

    try {
      await addToCollection({
        token,
        albumId: effectiveAlbumId,
        collectionType: "owned",
        notes: ""
      });

      isInOwned = true;
      successMessage = "Added to owned collection!";
      setTimeout(() => successMessage = "", 3000);

      dispatch("addedToCollection", { albumId: effectiveAlbumId, collectionType: "owned" });
    } catch (err) {
      console.error("Failed to add to owned collection:", err);
      if (err.message.includes("already in this collection")) {
        errorMessage = "Album is already in your owned collection";
      } else {
        errorMessage = err.message || "Failed to add to owned collection";
      }
      setTimeout(() => errorMessage = "", 3000);
    } finally {
      loadingCollection = false;
    }
  }

  async function autoImportExternalAlbum() {
    if (importAttempted || !albumId || !token) {
      console.log('[AlbumDetail] Skipping auto-import:', { importAttempted, albumId: !!albumId, token: !!token });
      return;
    }

    importAttempted = true;
    loadingImport = true;

    try {
      console.log(`[AlbumDetail] Auto-importing external album: ${albumId}`);
      const result = await importAlbum(albumId, { token, provider: "spotify" });

      console.log("[AlbumDetail] Album imported successfully. Full result:", result);
      importSucceeded = true;

      // Store the database album ID from the import result
      // Try multiple possible locations for the ID
      const dbId = result?.album?.id || result?.id || result?.album_id;
      if (dbId) {
        databaseAlbumId = dbId;
        console.log(`[AlbumDetail] ✓ Stored database album ID: ${databaseAlbumId}`);
      } else {
        console.warn('[AlbumDetail] No database ID found in import result:', result);
      }

      // Dispatch event so parent can refresh the album data
      dispatch("albumImported", { albumId, result });
    } catch (err) {
      console.error("[AlbumDetail] Failed to auto-import album:", err);

      // If album already exists, consider it a success (buttons should work)
      if (err.message.includes("already exists") || err.message.includes("already in")) {
        console.log("[AlbumDetail] Album already exists in library");
        importSucceeded = true;

        // Try to extract the database ID from the error response
        const dbId = err.data?.album?.id || err.data?.id || err.data?.album_id;
        if (dbId) {
          databaseAlbumId = dbId;
          console.log(`[AlbumDetail] ✓ Stored existing database album ID: ${databaseAlbumId}`);
        } else {
          console.warn('[AlbumDetail] No database ID found in error response:', err.data);
        }
      } else {
        // Only show error if it's a real failure
        errorMessage = "Unable to import album automatically";
        setTimeout(() => errorMessage = "", 4000);
      }
    } finally {
      loadingImport = false;
    }
  }
</script>

<div class="album-detail">
  {#if loading}
    <p class="album-detail__status">Loading album details...</p>
  {:else if error}
    <p class="album-detail__status album-detail__status--error">{error}</p>
  {:else}
    <div class="album-detail__header">
      <div class="album-detail__cover">
        {#if album?.cover}
          <img src={album.cover} alt={coverAltText()} />
        {:else}
          <div class="album-detail__placeholder" aria-hidden="true">
            <span>{album?.title?.charAt(0)?.toUpperCase() ?? "A"}</span>
          </div>
        {/if}
      </div>
      <div class="album-detail__summary">
        <h2>{album?.title || "Untitled album"}</h2>
        <p class="album-detail__artist">{album?.artist || "Unknown artist"}</p>
        <div class="album-detail__meta">
          <div>
            <span class="label">Release year</span>
            <span class="value">{album?.releaseYear ?? "Unknown"}</span>
          </div>
          {#if fallbackGenres.length}
            <div>
              <span class="label">Genres</span>
              <span class="value">{fallbackGenres.join(", ")}</span>
            </div>
          {/if}
        </div>

        <!-- Action buttons for favorite and collection -->
        {#if successMessage}
          <div class="action-message action-message--success">{successMessage}</div>
        {/if}
        {#if errorMessage}
          <div class="action-message action-message--error">{errorMessage}</div>
        {/if}

        <div class="album-detail__actions">
          <button
            class="action-btn action-btn--favorite"
            class:active={isFavorited}
            disabled={loadingFavorite || !canFavoriteOrCollect}
            on:click={handleToggleFavorite}
            title={(isExternalAlbum && !importSucceeded) ? "Importing album..." : (isFavorited ? "Remove from favorites" : "Add to favorites")}
          >
            <span class="icon">{isFavorited ? "❤️" : "🤍"}</span>
            {isFavorited ? "Favorited" : "Favorite"}
          </button>

          <button
            class="action-btn action-btn--wishlist"
            class:active={isInWishlist}
            disabled={loadingCollection || !canFavoriteOrCollect || isInWishlist}
            on:click={handleAddToWishlist}
            title={(isExternalAlbum && !importSucceeded) ? "Importing album..." : "Add to wishlist"}
          >
            <span class="icon">⭐</span>
            {isInWishlist ? "In Wishlist" : "Add to Wishlist"}
          </button>

          <button
            class="action-btn action-btn--owned"
            class:active={isInOwned}
            disabled={loadingCollection || !canFavoriteOrCollect || isInOwned}
            on:click={handleAddToOwned}
            title={(isExternalAlbum && !importSucceeded) ? "Importing album..." : "Add to owned collection"}
          >
            <span class="icon">📀</span>
            {isInOwned ? "Owned" : "Mark as Owned"}
          </button>
        </div>
    </div>
  </div>

    <section class="album-detail__insights" aria-label="Album rating">
      <div class="album-detail__rating">
        <h3>Your rating</h3>
        {#if canInteract}
          <RatingStars value={currentRating} on:change={handleRatingChange} />
          <p class="album-detail__rating-summary">
            {#if currentRating}
              You rated this album <strong>{currentRating}</strong> out of 5.
            {:else}
              Select a star rating to share your thoughts.
            {/if}
          </p>
        {:else}
          <p class="album-detail__rating-disabled">Sign in to rate this album.</p>
        {/if}
      </div>
      <div class="album-detail__rating-meta" aria-label="Community rating">
        <span class="label">Community rating</span>
        {#if communityRatingDisplay && communityRatingCount > 0}
          <span class="value">{communityRatingDisplay}</span>
          <span class="meta">
            Based on {communityRatingCount}
            {communityRatingCount === 1 ? "rating" : "ratings"}
          </span>
        {:else}
          <span class="value album-detail__rating-empty">No ratings yet</span>
        {/if}
      </div>
    </section>

    <section class="album-detail__tracks" aria-label="Track list">
      <div class="tracks-header">
        <h3>Track list</h3>
        {#if normalizedTracks.length > 0}
          <button class="btn-add-all" on:click={handleAddAllToPlaylist}>
            <span class="icon">➕</span>
            Add All to Playlist
          </button>
        {/if}
      </div>
      {#if normalizedTracks.length}
        <ol>
          {#each normalizedTracks as track, index (track?.id ?? track?.title ?? track ?? `track-${index}`)}
            <TrackItem
              {track}
              trackNumber={index + 1}
              album={album}
              artist={album?.artist}
              {canInteract}
              {token}
              on:addToPlaylist={handleAddToPlaylist}
              on:requiresLogin={handleRequiresLogin}
            />
          {/each}
        </ol>
      {:else}
        <p class="album-detail__empty">Track information unavailable.</p>
      {/if}
    </section>
  {/if}
</div>

<AddToPlaylistModal
  track={selectedTrack}
  isOpen={showPlaylistModal}
  {token}
  on:success={handlePlaylistModalSuccess}
  on:close={handlePlaylistModalClose}
/>

<LoginPromptModal
  isOpen={showLoginPrompt}
  message="Add tracks to playlists and manage your music collection."
  on:login={handleLoginPromptLogin}
  on:signup={handleLoginPromptSignup}
  on:close={handleLoginPromptClose}
/>

<style>
  .album-detail {
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
    background: rgba(255, 255, 255, 0.92);
    border-radius: 1.35rem;
    padding: 2rem;
    box-shadow: 0 24px 48px rgba(15, 23, 42, 0.14);
  }

  .album-detail__status {
    margin: 0;
    padding: 1.5rem;
    border-radius: 0.85rem;
    text-align: center;
    background: rgba(79, 70, 229, 0.08);
    color: #312e81;
  }

  .album-detail__status--error {
    background: rgba(248, 113, 113, 0.12);
    color: #b91c1c;
  }

  .album-detail__header {
    display: flex;
    flex-wrap: wrap;
    gap: 1.75rem;
    align-items: flex-start;
  }

  .album-detail__cover {
    flex: 0 0 auto;
    width: min(260px, 100%);
  }

  .album-detail__cover img {
    width: 100%;
    display: block;
    border-radius: 1rem;
    box-shadow: 0 22px 42px rgba(15, 23, 42, 0.2);
  }

  .album-detail__placeholder {
    width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: 1rem;
    background: linear-gradient(135deg, #4338ca, #6366f1);
    box-shadow: 0 22px 42px rgba(99, 102, 241, 0.22);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-size: 3rem;
    font-weight: 700;
  }

  .album-detail__summary {
    flex: 1 1 260px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .album-detail__summary h2 {
    margin: 0;
    font-size: 2rem;
    color: #0f172a;
  }

  .album-detail__artist {
    margin: 0;
    font-size: 1.1rem;
    color: rgba(55, 65, 81, 0.85);
  }

  .album-detail__meta {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .album-detail__meta > div {
    background: rgba(148, 163, 184, 0.22);
    border-radius: 0.85rem;
    padding: 0.75rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .album-detail__meta .label {
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(71, 85, 105, 0.7);
  }

  .album-detail__meta .value {
    font-weight: 600;
    color: #1f2937;
  }

  .album-detail__insights {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    background: rgba(79, 70, 229, 0.08);
    border-radius: 1rem;
    padding: 1rem 1.2rem;
  }

  .album-detail__rating {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .album-detail__rating h3 {
    margin: 0;
    font-size: 1.2rem;
    color: #1f2937;
  }

  .album-detail__rating-summary {
    margin: 0;
    font-size: 0.9rem;
    color: rgba(55, 65, 81, 0.85);
  }

  .album-detail__rating-summary strong {
    color: #f59e0b;
  }

  .album-detail__rating-disabled {
    margin: 0;
    font-size: 0.9rem;
    color: rgba(55, 65, 81, 0.7);
  }

  .album-detail__rating-meta {
    display: flex;
    flex-direction: column;
    background: rgba(255, 255, 255, 0.65);
    border-radius: 0.85rem;
    padding: 0.75rem 1rem;
    gap: 0.3rem;
  }

  .album-detail__rating-meta .label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(71, 85, 105, 0.7);
  }

  .album-detail__rating-meta .value {
    font-weight: 600;
    color: #1f2937;
  }

  .album-detail__rating-meta .meta {
    font-size: 0.82rem;
    color: rgba(71, 85, 105, 0.8);
  }

  .album-detail__rating-empty {
    font-weight: 500;
    color: rgba(71, 85, 105, 0.75);
  }

  .album-detail__tracks {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .album-detail__tracks h3 {
    margin: 0;
    font-size: 1.35rem;
    color: #1f2937;
  }

  .album-detail__tracks ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  /* Track item styles are now in TrackItem.svelte */

  .tracks-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .tracks-header h3 {
    margin: 0;
  }

  .btn-add-all {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1rem;
    background: linear-gradient(135deg, #4f46e5, #6366f1);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(79, 70, 229, 0.25);
  }

  .btn-add-all:hover {
    background: linear-gradient(135deg, #4338ca, #4f46e5);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);
  }

  .btn-add-all:active {
    transform: translateY(0);
  }

  .btn-add-all .icon {
    font-size: 1rem;
  }

  .album-detail__empty {
    margin: 0;
    color: rgba(55, 65, 81, 0.75);
  }

  /* Action buttons */
  .album-detail__actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-top: 1rem;
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem 1.1rem;
    border: 2px solid rgba(79, 70, 229, 0.2);
    border-radius: 0.75rem;
    background: white;
    color: #4f46e5;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 6px rgba(79, 70, 229, 0.1);
  }

  .action-btn:hover:not(:disabled) {
    background: rgba(79, 70, 229, 0.05);
    border-color: rgba(79, 70, 229, 0.4);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
  }

  .action-btn:active:not(:disabled) {
    transform: translateY(0);
  }

  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .action-btn.active {
    background: linear-gradient(135deg, #4f46e5, #6366f1);
    color: white;
    border-color: #4f46e5;
  }

  .action-btn--favorite.active {
    background: linear-gradient(135deg, #ef4444, #f87171);
    border-color: #ef4444;
  }

  .action-btn--wishlist.active {
    background: linear-gradient(135deg, #f59e0b, #fbbf24);
    border-color: #f59e0b;
  }

  .action-btn--owned.active {
    background: linear-gradient(135deg, #10b981, #34d399);
    border-color: #10b981;
  }

  .action-btn .icon {
    font-size: 1.1rem;
  }

  .action-message {
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    font-size: 0.9rem;
    font-weight: 600;
    margin-top: 0.75rem;
    animation: slideIn 0.3s ease;
  }

  .action-message--success {
    background: rgba(16, 185, 129, 0.1);
    color: #059669;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }

  .action-message--error {
    background: rgba(239, 68, 68, 0.1);
    color: #dc2626;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 640px) {
    .album-detail {
      padding: 1.75rem;
    }

    .album-detail__insights {
      align-items: flex-start;
    }

    .album-detail__header {
      flex-direction: column;
    }

    .album-detail__actions {
      flex-direction: column;
    }

    .action-btn {
      width: 100%;
      justify-content: center;
    }
  }
</style>
