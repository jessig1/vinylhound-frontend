<script>
  import { createEventDispatcher, onMount } from "svelte";
  import RatingStars from "./RatingStars.svelte";
  import TrackItem from "./TrackItem.svelte";
  import AddToPlaylistModal from "./AddToPlaylistModal.svelte";
  import { searchSongs } from "../api";
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

  const dispatch = createEventDispatcher();

  $: fallbackGenres = discoverGenres(album);
  $: currentRating = normalizeAlbumRating(userRating);

  // Load songs from database when album changes
  $: if (albumId) {
    loadSongsForAlbum(albumId);
  }

  // Use songs from database if available, otherwise fall back to album tracks
  $: normalizedTracks = songsList.length > 0 ? songsList : discoverTrackList(album);

  async function loadSongsForAlbum(id) {
    if (!id) return;

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

  function handleTrackRate(event) {
    const { track, rating } = event.detail;
    dispatch("rateTrack", {
      track,
      rating,
      albumId: albumIdentifier ?? null,
      album,
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
    if (!canInteract || normalizedTracks.length === 0) return;
    // Create a special track object representing all tracks
    selectedTrack = {
      id: null,
      title: `All tracks from ${album?.title || 'this album'}`,
      isAlbum: true,
      allTracks: normalizedTracks,
    };
    showPlaylistModal = true;
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
        {#if canInteract && normalizedTracks.length > 0}
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
              on:rate={handleTrackRate}
              on:addToPlaylist={handleAddToPlaylist}
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
  }
</style>
