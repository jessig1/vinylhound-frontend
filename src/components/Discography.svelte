<script>
  import { createEventDispatcher } from "svelte";

  export let albums = [];
  export let singles = [];
  export let title = "Discography";

  const dispatch = createEventDispatcher();

  function normalize(list) {
    return Array.isArray(list) ? list : [];
  }

  const normalizedAlbums = normalize(albums);
  const normalizedSingles = normalize(singles);

  function releaseLabel(item) {
    const parts = [];
    if (item?.releaseYear || item?.year) {
      parts.push(item.releaseYear ?? item.year);
    }
    if (Array.isArray(item?.genres) && item.genres.length) {
      parts.push(item.genres.slice(0, 2).join(", "));
    }
    return parts.join(" • ") || "Details forthcoming";
  }

  function emitSelection(release, kind) {
    dispatch("select", { release, kind });
  }
</script>

<section class="discography">
  <header class="discography__header">
    <h2>{title}</h2>
  </header>

  {#if !normalizedAlbums.length && !normalizedSingles.length}
    <p class="discography__empty">No releases recorded yet. Connect the catalogue to load albums and singles.</p>
  {:else}
    {#if normalizedAlbums.length}
      <section class="discography__group" aria-label="Albums">
        <ul>
          {#each normalizedAlbums as album, index (album.id ?? album.title ?? `album-${index}`)}
            <li>
              <button
                type="button"
                class="release-card-button"
                on:click={() => emitSelection(album, "album")}
              >
                <article class="release-card">
                  <div class="release-card__cover">
                    {#if album.cover}
                      <img src={album.cover} alt={`Cover art for ${album.title}`} />
                    {:else}
                      <span aria-hidden="true">{album?.title?.charAt(0)?.toUpperCase() ?? "A"}</span>
                    {/if}
                  </div>
                  <div class="release-card__body">
                    <h4>{album.title ?? "Untitled album"}</h4>
                    <p>{releaseLabel(album)}</p>
                  </div>
                </article>
              </button>
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    {#if normalizedSingles.length}
      <section class="discography__group" aria-label="Singles">
        <h3>Singles</h3>
        <ul>
          {#each normalizedSingles as single, index (single.id ?? single.title ?? `single-${index}`)}
            <li>
              <button
                type="button"
                class="release-card-button"
                on:click={() => emitSelection(single, "single")}
              >
                <article class="release-card">
                  <div class="release-card__cover release-card__cover--single">
                    {#if single.cover}
                      <img src={single.cover} alt={`Cover art for ${single.title}`} />
                    {:else}
                      <span aria-hidden="true">{single?.title?.charAt(0)?.toUpperCase() ?? "S"}</span>
                    {/if}
                  </div>
                  <div class="release-card__body">
                    <h4>{single.title ?? "Untitled single"}</h4>
                    <p>{releaseLabel(single)}</p>
                  </div>
                </article>
              </button>
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  {/if}
</section>

<style>
  .discography {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    background: rgba(255, 255, 255, 0.92);
    border-radius: 1.25rem;
    padding: 1.75rem;
    box-shadow: 0 20px 48px rgba(15, 23, 42, 0.12);
  }

  .discography__header h2 {
    margin: 0;
    font-size: 1.8rem;
    color: #111827;
  }

  .discography__header p {
    margin: 0.35rem 0 0;
    color: rgba(55, 65, 81, 0.75);
  }

  .discography__empty {
    margin: 0;
    padding: 1.5rem;
    border-radius: 0.85rem;
    background: rgba(148, 163, 184, 0.18);
    color: #1f2937;
    text-align: center;
  }

  .discography__group {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .discography__group h3 {
    margin: 0;
    font-size: 1.35rem;
    color: #1f2937;
  }

  .discography__group ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
  }

  .discography__group li {
    list-style: none;
  }

  .release-card-button {
    width: 100%;
    border: none;
    background: transparent;
    padding: 0;
    text-align: left;
    cursor: pointer;
  }

  .release-card-button:focus-visible {
    outline: 2px solid rgba(79, 70, 229, 0.45);
    outline-offset: 3px;
  }

  .release-card {
    display: flex;
    gap: 0.85rem;
    align-items: center;
    background: #ffffff;
    border-radius: 1rem;
    padding: 0.9rem;
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
  }

  .release-card__cover {
    flex: 0 0 auto;
    width: 68px;
    height: 68px;
    border-radius: 0.9rem;
    overflow: hidden;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-weight: 700;
    font-size: 1.2rem;
  }

  .release-card__cover--single {
    background: linear-gradient(135deg, #ec4899, #f97316);
  }

  .release-card__cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .release-card__body {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .release-card__body h4 {
    margin: 0;
    font-size: 1rem;
    color: #111827;
  }

  .release-card__body p {
    margin: 0;
    font-size: 0.85rem;
    color: rgba(55, 65, 81, 0.8);
  }

  @media (max-width: 640px) {
    .discography {
      padding: 1.5rem;
    }
  }
</style>
