<script>
  import { createEventDispatcher } from "svelte";
  import Discography from "./Discography.svelte";

  export let artist = null;

  const dispatch = createEventDispatcher();

  function getInitial(value = "") {
    const trimmed = (value || "").trim();
    if (!trimmed) {
      return "#";
    }
    const first = trimmed.charAt(0).toUpperCase();
    return /[A-Z]/.test(first) ? first : "#";
  }

  function gradientForKey(key = "") {
    let hash = 0;
    const source = (key || "").toLowerCase();
    for (let i = 0; i < source.length; i += 1) {
      hash = source.charCodeAt(i) + ((hash << 5) - hash);
      hash |= 0;
    }
    const hue = Math.abs(hash) % 360;
    const secondaryHue = (hue + 60) % 360;
    return {
      background: `linear-gradient(140deg, hsl(${hue} 80% 55%), hsl(${secondaryHue} 70% 45%))`,
      shadow: `0 22px 45px hsla(${hue}, 78%, 35%, 0.4)`,
    };
  }

  $: name = artist?.name || "Unknown artist";
  $: heroInitial = getInitial(name);
  $: heroPalette = gradientForKey(name);
  $: topGenres = Array.isArray(artist?.genres) ? artist.genres.slice(0, 3) : [];
  function sortedDiscography(list = []) {
    if (!Array.isArray(list)) {
      return [];
    }
    return [...list].sort((a, b) => {
      const yearA = Number(a?.releaseYear ?? a?.year ?? 0);
      const yearB = Number(b?.releaseYear ?? b?.year ?? 0);
      return yearB - yearA;
    });
  }

  $: albumList = sortedDiscography(Array.isArray(artist?.albums) ? artist.albums : []);
  $: singlesList = sortedDiscography(Array.isArray(artist?.singles) ? artist.singles : []);
  $: previewAlbums = albumList;
  $: albumCount = artist?.counts?.albums ?? 0;
  $: songCount = artist?.counts?.songs ?? 0;
  $: newsItems = [
    `Stay tuned for more updates from ${name}.`,
    "Connect the catalogue to surface discography highlights.",
    "New releases will appear here once available.",
  ];
  let showDiscography = false;

  function handleBack() {
    dispatch("back");
  }

  function handleRefresh() {
    dispatch("refresh");
  }

  function formatReleaseYear(album) {
    return album?.releaseYear ?? album?.year ?? "Year unknown";
  }

  function topGenresLabel(album) {
    if (!Array.isArray(album?.genres) || !album.genres.length) {
      return "";
    }
    return album.genres.slice(0, 2).join(", ");
  }

  function deriveAlbumId(album) {
    if (!album) {
      return null;
    }
    const baseId = album.id ?? album._id ?? album.slug ?? null;
    if (baseId) {
      return baseId;
    }
    const artistName = album.artist ?? artist?.name ?? "";
    const title = album.title ?? "";
    if (!artistName && !title) {
      return null;
    }
    return `${artistName}-${title}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function triggerAlbumSelect(album) {
    if (!album) {
      return;
    }
    const normalized = {
      ...album,
      artist: album.artist ?? artist?.name ?? "",
    };
    const albumId = deriveAlbumId(normalized);
    dispatch("selectalbum", { album: normalized, albumId });
  }
</script>

{#if artist}
  <section class="artist-detail">
    <div class="artist-detail__actions">
      <button type="button" class="artist-detail__back" on:click={handleBack}>
        &lt; Back to artists
      </button>
      <button type="button" class="artist-detail__refresh" on:click={handleRefresh}>
        Refresh
      </button>
    </div>

    <header class="artist-detail__header">
      <div
        class="artist-detail__avatar"
        class:artist-detail__avatar--has-cover={Boolean(artist?.image)}
        style={`--hero-bg:${heroPalette.background}; --hero-shadow:${heroPalette.shadow};`}
      >
        {#if artist?.image}
          <img src={artist.image} alt={`Artwork representing ${name}`} />
        {:else}
          <span aria-hidden="true">{heroInitial}</span>
        {/if}
      </div>
      <div class="artist-detail__summary">
        <h2>{name}</h2>
        {#if topGenres.length}
          <ul class="artist-detail__genres">
            {#each topGenres as genre}
              <li>{genre}</li>
            {/each}
          </ul>
        {/if}
        <div class="artist-detail__stats">
          <div>
            <span class="stat__value">{albumCount}</span>
            <span class="stat__label">Albums</span>
          </div>
          <div>
            <span class="stat__value">{songCount}</span>
            <span class="stat__label">Songs catalogued</span>
          </div>
        </div>
      </div>
    </header>

    <section class="artist-detail__news">
      <header>
        <h3>Artist updates</h3>
      </header>
      <ul>
        {#each newsItems as item, index (`news-${index}`)}
          <li>{item}</li>
        {/each}
      </ul>
    </section>

    <section class="artist-detail__discography">
      <header>
        <h3>Discography</h3>
        <h4>Albums</h4>
      </header>
      {#if previewAlbums.length}
        <ul class="artist-detail__preview-list">
          {#each previewAlbums as album, index (album.id ?? album.title ?? `album-${index}`)}
            <li>
              <button
                type="button"
                class="preview-card-button"
                on:click={() => triggerAlbumSelect(album)}
              >
                <article class="preview-card">
                  <div class="preview-card__cover">
                    {#if album.cover}
                      <img src={album.cover} alt={`Cover art for ${album.title}`} />
                    {:else}
                      <span aria-hidden="true">{album?.title?.charAt(0)?.toUpperCase() ?? "A"}</span>
                    {/if}
                  </div>
                  <div class="preview-card__body">
                    <h4>{album.title ?? "Untitled album"}</h4>
                    <p>{formatReleaseYear(album)}</p>
                    {#if topGenresLabel(album)}
                      <p class="preview-card__genres">{topGenresLabel(album)}</p>
                    {/if}
                  </div>
                </article>
              </button>
            </li>
          {/each}
        </ul>
      {:else}
        <p>
          We’re gathering release information for this artist. Connect the album service or check back later to explore
          the full discography.
        </p>
      {/if}
      {#if previewAlbums.length}
        <button
          type="button"
          class="artist-detail__more"
          on:click={() => {
            showDiscography = !showDiscography;
          }}
        >
          {showDiscography ? "Hide albums" : "See all albums"}
        </button>
      {/if}
      {#if previewAlbums.length && showDiscography}
        <Discography
          title="All releases"
          albums={albumList}
          singles={singlesList}
          on:select={(event) => {
            triggerAlbumSelect(event.detail?.release ?? null);
          }}
        />
      {/if}
    </section>
  </section>
{:else}
  <section class="artist-detail artist-detail--empty">
    <p>No artist selected.</p>
    <button type="button" class="artist-detail__back" on:click={handleBack}>
      View artist list
    </button>
  </section>
{/if}

<style>
  .artist-detail {
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 1.35rem;
    padding: 2.25rem;
    box-shadow: 0 24px 50px rgba(15, 23, 42, 0.12);
  }

  .artist-detail__actions {
    display: flex;
    gap: 0.75rem;
    justify-content: space-between;
    flex-wrap: wrap;
  }

  .artist-detail__back,
  .artist-detail__refresh {
    border: none;
    border-radius: 0.75rem;
    padding: 0.55rem 1.15rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  }

  .artist-detail__back {
    background: rgba(79, 70, 229, 0.12);
    color: #312e81;
  }

  .artist-detail__back:hover,
  .artist-detail__back:focus-visible {
    background: rgba(79, 70, 229, 0.22);
    outline: none;
  }

  .artist-detail__refresh {
    background: #4f46e5;
    color: #ffffff;
  }

  .artist-detail__refresh:hover,
  .artist-detail__refresh:focus-visible {
    transform: translateY(-1px);
    box-shadow: 0 12px 28px rgba(79, 70, 229, 0.3);
    outline: none;
  }

  .artist-detail__header {
    display: flex;
    gap: 1.75rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .artist-detail__avatar {
    flex: 0 0 auto;
    width: min(240px, 100%);
    aspect-ratio: 1 / 1;
    border-radius: 1.15rem;
    background: var(--hero-bg);
    box-shadow: var(--hero-shadow);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-size: 4rem;
    font-weight: 700;
    overflow: hidden;
  }

  .artist-detail__avatar--has-cover {
    background: none;
    box-shadow: 0 22px 45px rgba(15, 23, 42, 0.18);
  }

  .artist-detail__avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .artist-detail__summary {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    flex: 1 1 260px;
  }

  .artist-detail__summary h2 {
    margin: 0;
    font-size: 2.25rem;
    color: #0f172a;
  }

  .artist-detail__genres {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
  }

  .artist-detail__genres li {
    background: rgba(99, 102, 241, 0.15);
    color: #312e81;
    border-radius: 999px;
    padding: 0.35rem 0.75rem;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .artist-detail__stats {
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .artist-detail__stats div {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    background: rgba(15, 23, 42, 0.04);
    padding: 0.75rem 1rem;
    border-radius: 0.85rem;
    min-width: 130px;
  }

  .stat__value {
    font-size: 1.6rem;
    font-weight: 700;
    color: #1f2937;
  }

  .stat__label {
    text-transform: uppercase;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    color: rgba(55, 65, 81, 0.75);
  }

  .artist-detail__news {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    background: rgba(79, 70, 229, 0.08);
    border-radius: 1rem;
    padding: 1.5rem 1.75rem;
  }

  .artist-detail__news header h3 {
    margin: 0;
    font-size: 1.35rem;
    color: #312e81;
  }

  .artist-detail__news header p {
    margin: 0.3rem 0 0;
    color: rgba(55, 65, 81, 0.85);
  }

  .artist-detail__news ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    color: #1f2937;
  }

  .artist-detail__discography {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    background: rgba(241, 245, 249, 0.85);
    border-radius: 1rem;
    padding: 1.5rem 1.75rem;
    color: #1f2937;
    box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.2);
  }

  .artist-detail__discography header h3 {
    margin: 0;
    font-size: 1.3rem;
    color: #1f2937;
  }

  .artist-detail__discography header p {
    margin: 0.35rem 0 0;
    color: rgba(55, 65, 81, 0.82);
  }

  .artist-detail__preview-list {
    list-style: none;
    margin: 0;
    padding: 0 0 0.5rem;
    display: flex;
    gap: 1rem;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
  }

  .artist-detail__preview-list li {
    list-style: none;
    flex: 0 0 auto;
    width: min(220px, 70vw);
    scroll-snap-align: start;
  }

  .preview-card-button {
    width: 100%;
    border: none;
    background: transparent;
    padding: 0;
    text-align: left;
    cursor: pointer;
    display: block;
    border-radius: 1rem;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .preview-card-button:hover,
  .preview-card-button:focus-visible {
    transform: translateY(-2px);
    outline: none;
  }

  .preview-card {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    background: #ffffff;
    border-radius: 0.95rem;
    padding: 0.75rem;
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
  }

  .preview-card__cover {
    flex: 0 0 auto;
    width: 56px;
    height: 56px;
    border-radius: 0.75rem;
    overflow: hidden;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-weight: 700;
  }

  .preview-card__cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .preview-card__body {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .preview-card__body h4 {
    margin: 0;
    font-size: 1rem;
    color: #111827;
  }

  .preview-card__body p {
    margin: 0;
    font-size: 0.85rem;
    color: rgba(55, 65, 81, 0.82);
  }

  .preview-card__genres {
    color: rgba(79, 70, 229, 0.85);
    font-weight: 600;
  }

  .artist-detail__more {
    align-self: flex-start;
    border: none;
    background: rgba(79, 70, 229, 0.15);
    color: #312e81;
    border-radius: 999px;
    padding: 0.5rem 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
  }

.artist-detail__more:hover,
  .artist-detail__more:focus-visible {
    background: rgba(79, 70, 229, 0.25);
    box-shadow: 0 12px 28px rgba(79, 70, 229, 0.25);
    outline: none;
    transform: translateY(-1px);
  }

  .artist-detail--empty {
    align-items: flex-start;
    gap: 1rem;
  }

@media (max-width: 720px) {
  .artist-detail {
    padding: 1.75rem;
  }

  .artist-detail__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .artist-detail__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .artist-detail__avatar {
    width: min(220px, 60vw);
  }
}
</style>

