<script>
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

  const fallbackGenres = Array.isArray(album?.genres) ? album.genres : [];
  const normalizedTracks = Array.isArray(album?.tracks) ? album.tracks : [];

  function coverAltText() {
    const title = album?.title || "this album";
    const artist = album?.artist || "unknown artist";
    return `Cover art for ${title} by ${artist}`;
  }

  function trackTitle(track, index) {
    if (!track) {
      return `Track ${index + 1}`;
    }
    if (typeof track === "string") {
      const trimmed = track.trim();
      return trimmed || `Track ${index + 1}`;
    }
    if (typeof track === "object") {
      const title =
        (typeof track.title === "string" && track.title.trim()) ||
        (typeof track.name === "string" && track.name.trim());
      return title || `Track ${index + 1}`;
    }
    return `Track ${index + 1}`;
  }

  function trackLength(track) {
    if (!track || typeof track !== "object") {
      return null;
    }
    const labelCandidates = [
      track.lengthLabel,
      track.length,
      track.duration,
      track.durationLabel,
      track.formattedDuration,
    ];
    for (const entry of labelCandidates) {
      if (typeof entry === "string" && entry.trim()) {
        return entry.trim();
      }
    }
    const numericCandidates = [
      track.lengthSeconds,
      track.length_seconds,
      track.durationSeconds,
      track.duration_seconds,
      track.seconds,
    ];
    for (const candidate of numericCandidates) {
      const numeric = Number(candidate);
      if (Number.isFinite(numeric) && numeric >= 0) {
        const minutes = Math.floor(numeric / 60);
        const seconds = Math.floor(numeric % 60)
          .toString()
          .padStart(2, "0");
        return `${minutes}:${seconds}`;
      }
    }
    return null;
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

    <section class="album-detail__tracks" aria-label="Track list">
      <h3>Track list</h3>
      {#if normalizedTracks.length}
        <ol>
          {#each normalizedTracks as track, index (track?.id ?? track?.title ?? track ?? `track-${index}`)}
            <li>
              <span class="track__index">{index + 1}</span>
              <span class="track__title">{trackTitle(track, index)}</span>
              {#if trackLength(track)}
                <span class="track__length">{trackLength(track)}</span>
              {/if}
            </li>
          {/each}
        </ol>
      {:else}
        <p class="album-detail__empty">Track information unavailable.</p>
      {/if}
    </section>
  {/if}
</div>

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

  .album-detail__tracks li {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 0.75rem;
    background: rgba(228, 233, 243, 0.6);
    border-radius: 0.75rem;
    padding: 0.6rem 0.85rem;
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

  .album-detail__empty {
    margin: 0;
    color: rgba(55, 65, 81, 0.75);
  }

  @media (max-width: 640px) {
    .album-detail {
      padding: 1.75rem;
    }

    .album-detail__header {
      flex-direction: column;
    }
  }
</style>
