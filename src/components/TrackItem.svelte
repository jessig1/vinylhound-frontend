<script>
  import { createEventDispatcher } from "svelte";

  export let track;
  export let trackNumber;
  export let album;
  export let artist;
  export let canInteract = false;

  const dispatch = createEventDispatcher();

  let showActions = false;
  let showMusicServices = false;
  let currentRating = track?.rating || null; // thumbs up (1), thumbs down (-1), or null

  // Generate search URLs for music services
  $: searchQuery = encodeURIComponent(`${artist} ${track?.title || ""}`);
  $: albumQuery = encodeURIComponent(`${artist} ${album?.title || ""}`);

  const musicServices = [
    {
      name: "Spotify",
      icon: "🎵",
      url: `https://open.spotify.com/search/${searchQuery}`,
      color: "#1DB954",
    },
    {
      name: "Apple Music",
      icon: "🍎",
      url: `https://music.apple.com/search?term=${searchQuery}`,
      color: "#FA243C",
    },
    {
      name: "YouTube Music",
      icon: "▶️",
      url: `https://music.youtube.com/search?q=${searchQuery}`,
      color: "#FF0000",
    },
    {
      name: "SoundCloud",
      icon: "☁️",
      url: `https://soundcloud.com/search?q=${searchQuery}`,
      color: "#FF5500",
    },
    {
      name: "Tidal",
      icon: "🌊",
      url: `https://listen.tidal.com/search?q=${searchQuery}`,
      color: "#000000",
    },
    {
      name: "Bandcamp",
      icon: "⛺",
      url: `https://bandcamp.com/search?q=${searchQuery}`,
      color: "#629AA9",
    },
  ];

  function toggleActions() {
    showActions = !showActions;
    if (!showActions) {
      showMusicServices = false;
    }
  }

  function handleThumbsUp() {
    const newRating = currentRating === 1 ? null : 1;
    currentRating = newRating;
    dispatch("rate", {
      track,
      rating: newRating,
    });
  }

  function handleThumbsDown() {
    const newRating = currentRating === -1 ? null : -1;
    currentRating = newRating;
    dispatch("rate", {
      track,
      rating: newRating,
    });
  }

  function handleAddToPlaylist() {
    dispatch("addToPlaylist", { track });
  }

  function openMusicService(service) {
    window.open(service.url, "_blank", "noopener,noreferrer");
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleActions();
    }
  }
</script>

<li class="track-item" class:expanded={showActions}>
  <button
    class="track-item__main"
    on:click={toggleActions}
    on:keydown={handleKeyDown}
    aria-expanded={showActions}
    aria-label={`Track ${trackNumber}: ${track?.title || "Untitled"}. Click for options.`}
  >
    <span class="track__index">{trackNumber}</span>
    <span class="track__title">{track?.title || `Track ${trackNumber}`}</span>
    {#if track?.lengthLabel}
      <span class="track__length">{track.lengthLabel}</span>
    {/if}
    <span class="track__expand-icon" aria-hidden="true">
      {showActions ? "▼" : "▶"}
    </span>
  </button>

  {#if showActions}
    <div class="track-item__actions" transition:slide={{ duration: 200 }}>
      <!-- Music Services -->
      <div class="action-section">
        <button
          class="action-btn action-btn--primary"
          on:click={() => (showMusicServices = !showMusicServices)}
        >
          <span class="action-icon">🎧</span>
          Play on Music Service
        </button>

        {#if showMusicServices}
          <div class="music-services" transition:slide={{ duration: 150 }}>
            {#each musicServices as service}
              <button
                class="music-service-btn"
                style="--service-color: {service.color}"
                on:click={() => openMusicService(service)}
                title="Open in {service.name}"
              >
                <span class="service-icon">{service.icon}</span>
                <span class="service-name">{service.name}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Rating Section -->
      {#if canInteract}
        <div class="action-section">
          <div class="rating-buttons">
            <button
              class="action-btn action-btn--thumbs"
              class:active={currentRating === 1}
              on:click={handleThumbsUp}
              aria-label="Thumbs up"
              title="I like this track"
            >
              <span class="action-icon" class:active={currentRating === 1}>👍</span>
              Thumbs Up
            </button>
            <button
              class="action-btn action-btn--thumbs"
              class:active={currentRating === -1}
              on:click={handleThumbsDown}
              aria-label="Thumbs down"
              title="I don't like this track"
            >
              <span class="action-icon" class:active={currentRating === -1}>👎</span>
              Thumbs Down
            </button>
          </div>
        </div>

        <!-- Playlist Section -->
        <div class="action-section">
          <button class="action-btn" on:click={handleAddToPlaylist}>
            <span class="action-icon">➕</span>
            Add to Playlist
          </button>
        </div>
      {:else}
        <p class="signin-prompt">Sign in to rate tracks and create playlists</p>
      {/if}
    </div>
  {/if}
</li>

<script context="module">
  import { slide } from "svelte/transition";
</script>

<style>
  .track-item {
    display: flex;
    flex-direction: column;
    background: rgba(228, 233, 243, 0.6);
    border-radius: 0.75rem;
    overflow: hidden;
    transition: all 0.2s ease;
  }

  .track-item.expanded {
    background: rgba(228, 233, 243, 0.9);
  }

  .track-item__main {
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0.85rem;
    border: none;
    background: transparent;
    cursor: pointer;
    text-align: left;
    width: 100%;
    transition: background-color 0.2s ease;
  }

  .track-item__main:hover {
    background: rgba(79, 70, 229, 0.08);
  }

  .track-item__main:focus {
    outline: 2px solid #4f46e5;
    outline-offset: 2px;
  }

  .track__index {
    width: 1.6rem;
    height: 1.6rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(79, 70, 229, 0.3);
    color: #312e81;
    font-weight: 600;
    font-size: 0.85rem;
  }

  .track__title {
    font-weight: 600;
    color: #111827;
  }

  .track__length {
    font-variant-numeric: tabular-nums;
    color: rgba(55, 65, 81, 0.8);
    font-size: 0.9rem;
  }

  .track__expand-icon {
    color: rgba(79, 70, 229, 0.7);
    font-size: 0.75rem;
    transition: transform 0.2s ease;
  }

  .track-item.expanded .track__expand-icon {
    transform: rotate(0deg);
  }

  .track-item__actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0 0.85rem 0.85rem;
    background: rgba(255, 255, 255, 0.5);
  }

  .action-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid rgba(148, 163, 184, 0.3);
    border-radius: 0.5rem;
    background: white;
    color: #374151;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .action-btn:hover {
    background: #f9fafb;
    border-color: #4f46e5;
    color: #4f46e5;
    transform: translateY(-1px);
  }

  .action-btn:active {
    transform: translateY(0);
  }

  .action-btn--primary {
    background: linear-gradient(135deg, #4f46e5, #6366f1);
    color: white;
    border: none;
  }

  .action-btn--primary:hover {
    background: linear-gradient(135deg, #4338ca, #4f46e5);
    transform: translateY(-1px);
  }

  .action-btn--thumbs.active {
    background: #4f46e5;
    color: white;
    border-color: #4f46e5;
  }

  .action-icon {
    font-size: 1.1rem;
    transition: transform 0.2s ease;
  }

  .action-btn:hover .action-icon {
    transform: scale(1.15);
  }

  .action-icon.active {
    animation: bounce 0.5s ease;
  }

  @keyframes bounce {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.3); }
  }

  .rating-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .music-services {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.5rem;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 0.5rem;
  }

  .music-service-btn {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.6rem 0.75rem;
    border: 1px solid rgba(148, 163, 184, 0.25);
    border-radius: 0.5rem;
    background: white;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.85rem;
    color: #374151;
  }

  .music-service-btn:hover {
    background: var(--service-color);
    color: white;
    border-color: var(--service-color);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .service-icon {
    font-size: 1.2rem;
  }

  .service-name {
    font-weight: 500;
    white-space: nowrap;
  }

  .signin-prompt {
    margin: 0;
    padding: 0.75rem;
    text-align: center;
    color: rgba(55, 65, 81, 0.7);
    font-size: 0.875rem;
    font-style: italic;
  }

  @media (max-width: 640px) {
    .track-item__main {
      grid-template-columns: auto 1fr auto;
      gap: 0.5rem;
    }

    .track__expand-icon {
      grid-column: 3;
    }

    .track__length {
      grid-column: 2;
      text-align: right;
      font-size: 0.8rem;
    }

    .music-services {
      grid-template-columns: 1fr;
    }

    .rating-buttons {
      grid-template-columns: 1fr;
    }
  }
</style>
