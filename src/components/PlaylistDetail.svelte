<script>
  import { createEventDispatcher } from "svelte";
  import TrackItem from "./TrackItem.svelte";
  import AddToPlaylistModal from "./AddToPlaylistModal.svelte";

  export let playlist = {
    title: "Untitled Playlist",
    coverArt: null,
    author: "Unknown",
    createdAt: null,
    updatedAt: null,
    songs: [],
    genres: [],
    description: "",
    isPublic: true,
  };

  export let loading = false;
  export let error = "";
  export let canInteract = false;
  export let isOwner = false;
  export let playlistId = null;
  export let token = null;

  let showPlaylistModal = false;
  let selectedTrack = null;

  const dispatch = createEventDispatcher();

  // Calculate total duration of all songs
  $: totalDurationSeconds = playlist.songs?.reduce((total, song) => {
    const duration = song?.lengthSeconds ?? song?.duration ?? 0;
    return total + duration;
  }, 0) ?? 0;

  // Format total duration
  $: totalDuration = formatTotalDuration(totalDurationSeconds);

  // Get unique genres from all songs
  $: playlistGenres = getUniqueGenres(playlist);

  // Song count
  $: songCount = playlist.songs?.length ?? 0;

  // Format creation date
  $: formattedDate = formatDate(playlist.createdAt);

  // Generate cover art placeholder
  $: coverPlaceholderLetter = (playlist.title || "P").charAt(0).toUpperCase();

  function formatTotalDuration(seconds) {
    if (!seconds || seconds <= 0) return "0:00";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min ${secs} sec`;
  }

  function formatDate(dateString) {
    if (!dateString) return "Unknown date";

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (err) {
      return "Unknown date";
    }
  }

  function getUniqueGenres(playlist) {
    // First try playlist-level genres
    if (Array.isArray(playlist.genres) && playlist.genres.length > 0) {
      return playlist.genres;
    }

    // Otherwise extract from songs
    const genreSet = new Set();
    const songs = playlist.songs || [];

    songs.forEach(song => {
      if (Array.isArray(song.genres)) {
        song.genres.forEach(g => genreSet.add(g));
      } else if (song.genre && typeof song.genre === 'string') {
        genreSet.add(song.genre);
      }
    });

    return Array.from(genreSet).sort();
  }

  function handleTrackRate(event) {
    dispatch("rateTrack", event.detail);
  }

  function handleAddToPlaylist(event) {
    const { track } = event.detail;
    selectedTrack = track;
    showPlaylistModal = true;
  }

  function handlePlaylistModalSuccess(event) {
    const { playlist: targetPlaylist, track, message } = event.detail;
    dispatch("addToPlaylist", {
      track,
      playlist: targetPlaylist,
      playlistId,
      message,
    });
  }

  function handlePlaylistModalClose() {
    showPlaylistModal = false;
    selectedTrack = null;
  }

  function handleEdit() {
    dispatch("edit", { playlist, playlistId });
  }

  function handleDelete() {
    if (confirm(`Are you sure you want to delete "${playlist.title}"?`)) {
      dispatch("delete", { playlist, playlistId });
    }
  }

  function handleShare() {
    dispatch("share", { playlist, playlistId });
  }

  function handleRemoveTrack(track) {
    dispatch("removeTrack", { track, playlist, playlistId });
  }
</script>

<div class="playlist-detail">
  {#if loading}
    <p class="playlist-detail__status">Loading playlist...</p>
  {:else if error}
    <p class="playlist-detail__status playlist-detail__status--error">{error}</p>
  {:else}
    <!-- Header -->
    <div class="playlist-detail__header">
      <div class="playlist-detail__cover">
        {#if playlist.coverArt}
          <img src={playlist.coverArt} alt="Cover art for {playlist.title}" />
        {:else}
          <div class="playlist-detail__placeholder" aria-hidden="true">
            <span class="placeholder__icon">🎵</span>
            <span class="placeholder__letter">{coverPlaceholderLetter}</span>
          </div>
        {/if}
      </div>

      <div class="playlist-detail__summary">
        <div class="playlist-detail__type">PLAYLIST</div>
        <h1 class="playlist-detail__title">{playlist.title || "Untitled Playlist"}</h1>

        {#if playlist.description}
          <p class="playlist-detail__description">{playlist.description}</p>
        {/if}

        <div class="playlist-detail__metadata">
          <span class="metadata__item metadata__item--author">
            <span class="metadata__icon">👤</span>
            <strong>{playlist.author || "Unknown"}</strong>
          </span>
          <span class="metadata__separator">•</span>
          <span class="metadata__item">{songCount} {songCount === 1 ? "song" : "songs"}</span>
          {#if totalDurationSeconds > 0}
            <span class="metadata__separator">•</span>
            <span class="metadata__item">{totalDuration}</span>
          {/if}
        </div>

        <!-- Action Buttons -->
        <div class="playlist-detail__actions">
          {#if isOwner}
            <button class="action-btn action-btn--primary" on:click={handleEdit}>
              <span class="action-icon">✏️</span>
              Edit Playlist
            </button>
            <button class="action-btn action-btn--danger" on:click={handleDelete}>
              <span class="action-icon">🗑️</span>
              Delete
            </button>
          {/if}
          <button class="action-btn" on:click={handleShare}>
            <span class="action-icon">📤</span>
            Share
          </button>
        </div>
      </div>
    </div>

    <!-- Info Grid -->
    <div class="playlist-detail__info">
      <div class="info-card">
        <span class="info-card__label">Created</span>
        <span class="info-card__value">{formattedDate}</span>
      </div>

      {#if playlist.updatedAt && playlist.updatedAt !== playlist.createdAt}
        <div class="info-card">
          <span class="info-card__label">Last Updated</span>
          <span class="info-card__value">{formatDate(playlist.updatedAt)}</span>
        </div>
      {/if}

      {#if playlistGenres.length > 0}
        <div class="info-card info-card--wide">
          <span class="info-card__label">Genres</span>
          <span class="info-card__value">{playlistGenres.join(", ")}</span>
        </div>
      {/if}

      <div class="info-card">
        <span class="info-card__label">Visibility</span>
        <span class="info-card__value">
          {playlist.isPublic ? "🌍 Public" : "🔒 Private"}
        </span>
      </div>
    </div>

    <!-- Track List -->
    <section class="playlist-detail__tracks" aria-label="Playlist tracks">
      <h2>Tracks</h2>

      {#if songCount > 0}
        <div class="tracks-header">
          <span class="tracks-header__col tracks-header__col--index">#</span>
          <span class="tracks-header__col tracks-header__col--title">Title</span>
          <span class="tracks-header__col tracks-header__col--artist">Artist</span>
          <span class="tracks-header__col tracks-header__col--album">Album</span>
          <span class="tracks-header__col tracks-header__col--duration">Duration</span>
          {#if isOwner}
            <span class="tracks-header__col tracks-header__col--actions">Actions</span>
          {/if}
        </div>

        <ol class="tracks-list">
          {#each playlist.songs as song, index (song?.id ?? `song-${index}`)}
            <li class="track-row">
              <div class="track-row__main">
                <span class="track-row__index">{index + 1}</span>

                <div class="track-row__info">
                  <div class="track-row__title">{song.title || "Untitled"}</div>
                  <div class="track-row__artist">{song.artist || "Unknown Artist"}</div>
                </div>

                <div class="track-row__artist-col">
                  {song.artist || "Unknown Artist"}
                </div>

                <div class="track-row__album">
                  {song.album || "—"}
                </div>

                <div class="track-row__duration">
                  {song.lengthLabel || (song.lengthSeconds ? formatTotalDuration(song.lengthSeconds) : "—")}
                </div>

                {#if isOwner}
                  <button
                    class="track-row__remove"
                    on:click={() => handleRemoveTrack(song)}
                    title="Remove from playlist"
                    aria-label="Remove {song.title} from playlist"
                  >
                    ✕
                  </button>
                {/if}
              </div>

              <!-- Expandable track item -->
              <div class="track-row__expanded">
                <TrackItem
                  track={song}
                  trackNumber={index + 1}
                  album={{ title: song.album }}
                  artist={song.artist}
                  {canInteract}
                  on:rate={handleTrackRate}
                  on:addToPlaylist={handleAddToPlaylist}
                />
              </div>
            </li>
          {/each}
        </ol>
      {:else}
        <div class="playlist-detail__empty">
          <span class="empty__icon">🎵</span>
          <p class="empty__text">This playlist is empty</p>
          {#if isOwner}
            <p class="empty__hint">Add songs by clicking "Add to Playlist" on any track</p>
          {/if}
        </div>
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
  .playlist-detail {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    background: rgba(255, 255, 255, 0.92);
    border-radius: 1.35rem;
    padding: 2rem;
    box-shadow: 0 24px 48px rgba(15, 23, 42, 0.14);
  }

  .playlist-detail__status {
    margin: 0;
    padding: 1.5rem;
    border-radius: 0.85rem;
    text-align: center;
    background: rgba(79, 70, 229, 0.08);
    color: #312e81;
  }

  .playlist-detail__status--error {
    background: rgba(248, 113, 113, 0.12);
    color: #b91c1c;
  }

  /* Header Section */
  .playlist-detail__header {
    display: flex;
    gap: 2rem;
    align-items: flex-start;
  }

  .playlist-detail__cover {
    flex: 0 0 auto;
    width: min(240px, 100%);
  }

  .playlist-detail__cover img {
    width: 100%;
    aspect-ratio: 1;
    display: block;
    border-radius: 1rem;
    box-shadow: 0 22px 42px rgba(15, 23, 42, 0.2);
    object-fit: cover;
  }

  .playlist-detail__placeholder {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 1rem;
    background: linear-gradient(135deg, #ec4899, #f97316);
    box-shadow: 0 22px 42px rgba(236, 72, 153, 0.25);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: #ffffff;
  }

  .placeholder__icon {
    font-size: 3.5rem;
  }

  .placeholder__letter {
    font-size: 2.5rem;
    font-weight: 700;
    opacity: 0.7;
  }

  .playlist-detail__summary {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .playlist-detail__type {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: rgba(79, 70, 229, 0.8);
  }

  .playlist-detail__title {
    margin: 0;
    font-size: 2.5rem;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.2;
  }

  .playlist-detail__description {
    margin: 0;
    font-size: 1rem;
    color: rgba(55, 65, 81, 0.85);
    line-height: 1.6;
  }

  .playlist-detail__metadata {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    color: rgba(55, 65, 81, 0.75);
  }

  .metadata__item {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .metadata__item--author strong {
    color: #1f2937;
  }

  .metadata__icon {
    font-size: 1.1rem;
  }

  .metadata__separator {
    color: rgba(148, 163, 184, 0.5);
  }

  .playlist-detail__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem 1.25rem;
    border: 1px solid rgba(148, 163, 184, 0.3);
    border-radius: 0.75rem;
    background: white;
    color: #374151;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .action-btn:hover {
    background: #f9fafb;
    border-color: #4f46e5;
    color: #4f46e5;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
  }

  .action-btn--primary {
    background: linear-gradient(135deg, #4f46e5, #6366f1);
    color: white;
    border: none;
  }

  .action-btn--primary:hover {
    background: linear-gradient(135deg, #4338ca, #4f46e5);
    color: white;
  }

  .action-btn--danger {
    border-color: rgba(239, 68, 68, 0.3);
    color: #dc2626;
  }

  .action-btn--danger:hover {
    background: #fef2f2;
    border-color: #dc2626;
    color: #b91c1c;
  }

  .action-icon {
    font-size: 1.1rem;
  }

  /* Info Grid */
  .playlist-detail__info {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .info-card {
    background: rgba(148, 163, 184, 0.15);
    border-radius: 0.85rem;
    padding: 1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .info-card--wide {
    grid-column: span 2;
  }

  .info-card__label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(71, 85, 105, 0.7);
    font-weight: 600;
  }

  .info-card__value {
    font-weight: 600;
    color: #1f2937;
    font-size: 0.95rem;
  }

  /* Tracks Section */
  .playlist-detail__tracks {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .playlist-detail__tracks h2 {
    margin: 0;
    font-size: 1.5rem;
    color: #1f2937;
  }

  .tracks-header {
    display: grid;
    grid-template-columns: 50px 2fr 1.5fr 1.5fr 100px 80px;
    gap: 1rem;
    padding: 0.75rem 1rem;
    background: rgba(148, 163, 184, 0.1);
    border-radius: 0.5rem;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgba(71, 85, 105, 0.8);
  }

  .tracks-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .track-row {
    display: flex;
    flex-direction: column;
    background: rgba(228, 233, 243, 0.4);
    border-radius: 0.75rem;
    overflow: hidden;
    transition: all 0.2s ease;
  }

  .track-row:hover {
    background: rgba(228, 233, 243, 0.7);
  }

  .track-row__main {
    display: grid;
    grid-template-columns: 50px 2fr 1.5fr 1.5fr 100px 80px;
    gap: 1rem;
    padding: 0.85rem 1rem;
    align-items: center;
  }

  .track-row__index {
    text-align: center;
    color: rgba(71, 85, 105, 0.7);
    font-weight: 600;
    font-size: 0.9rem;
  }

  .track-row__info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .track-row__title {
    font-weight: 600;
    color: #111827;
    font-size: 0.95rem;
  }

  .track-row__artist {
    font-size: 0.85rem;
    color: rgba(71, 85, 105, 0.8);
  }

  .track-row__artist-col {
    color: rgba(55, 65, 81, 0.85);
    font-size: 0.9rem;
  }

  .track-row__album {
    color: rgba(55, 65, 81, 0.75);
    font-size: 0.9rem;
  }

  .track-row__duration {
    text-align: right;
    color: rgba(71, 85, 105, 0.8);
    font-variant-numeric: tabular-nums;
    font-size: 0.9rem;
  }

  .track-row__remove {
    background: transparent;
    border: none;
    color: rgba(239, 68, 68, 0.6);
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.375rem;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .track-row__remove:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #dc2626;
    transform: scale(1.1);
  }

  .track-row__expanded {
    display: none;
  }

  /* Empty State */
  .playlist-detail__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 2rem;
    text-align: center;
    background: rgba(228, 233, 243, 0.3);
    border-radius: 1rem;
    gap: 1rem;
  }

  .empty__icon {
    font-size: 4rem;
    opacity: 0.4;
  }

  .empty__text {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: rgba(71, 85, 105, 0.8);
  }

  .empty__hint {
    margin: 0;
    font-size: 0.9rem;
    color: rgba(71, 85, 105, 0.6);
  }

  /* Responsive Design */
  @media (max-width: 1024px) {
    .tracks-header,
    .track-row__main {
      grid-template-columns: 40px 1fr 1fr 80px 60px;
    }

    .track-row__album,
    .tracks-header__col--album {
      display: none;
    }

    .info-card--wide {
      grid-column: span 1;
    }
  }

  @media (max-width: 768px) {
    .playlist-detail__header {
      flex-direction: column;
      gap: 1.5rem;
    }

    .playlist-detail__cover {
      width: 100%;
      max-width: 280px;
      margin: 0 auto;
    }

    .playlist-detail__title {
      font-size: 2rem;
    }

    .tracks-header {
      display: none;
    }

    .track-row__main {
      grid-template-columns: 40px 1fr 80px;
      gap: 0.75rem;
    }

    .track-row__artist-col,
    .track-row__album,
    .track-row__remove {
      display: none;
    }

    .playlist-detail__info {
      grid-template-columns: 1fr;
    }

    .info-card--wide {
      grid-column: span 1;
    }
  }
</style>
