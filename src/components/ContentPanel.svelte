<script>
  import { createEventDispatcher } from "svelte";

  export let content = [];
  export let draft = "";
  export let loading = false;
  export let favoriteAlbums = [];
  export let ratedAlbums = [];

  const dispatch = createEventDispatcher();

  function submit(event) {
    event.preventDefault();
    dispatch("save", { draft });
  }

  function refresh() {
    dispatch("refresh");
  }

  function albumTitle(item) {
    return item?.album?.title || item?.title || "Untitled album";
  }

  function albumArtist(item) {
    return item?.album?.artist || item?.artist || "Unknown artist";
  }

  function albumId(item) {
    return item?.albumId || item?.id || item?.album?.id || albumTitle(item);
  }

  function albumRating(item) {
    const raw = item?.rating ?? item?.album?.rating ?? null;
    const numeric = Number(raw);
    return Number.isFinite(numeric) ? numeric : null;
  }

  function selectAlbum(item) {
    if (!item) {
      return;
    }
    const id = albumId(item);
    const album = item?.album ?? null;
    const key =
      item?.key ??
      album?.id ??
      album?.slug ??
      (album?.artist && album?.title ? `${album.artist} - ${album.title}` : null) ??
      (typeof id === "string" ? id : null);
    dispatch("selectalbum", {
      albumId: id,
      album,
      key,
      title: albumTitle(item),
      artist: albumArtist(item),
    });
  }
</script>

<section class="panel">
  <h2>Your content</h2>
  <p class="hint">Each line will be saved as a separate item.</p>
  <form on:submit={submit} class="content-form">
    <textarea
      bind:value={draft}
      rows="8"
      placeholder="Add one entry per line"
      aria-label="Content entries"
    ></textarea>
    <div class="actions">
      <button type="submit" disabled={loading}>Save</button>
      <button type="button" on:click={refresh} disabled={loading}>Refresh</button>
    </div>
  </form>
  {#if content.length}
    <ul class="content-list">
      {#each content as item}
        <li>{item}</li>
      {/each}
    </ul>
  {:else}
    <p class="empty">No content yet. Add some above!</p>
  {/if}

  <div class="album-summary">
    <div class="album-summary__header">
      <h3>Your albums</h3>
      <p class="hint">Albums you have favorited or rated.</p>
    </div>

    {#if favoriteAlbums.length || ratedAlbums.length}
      <div class="album-summary__grid">
        {#if favoriteAlbums.length}
          <section class="album-card" aria-label="Favorited albums">
            <h4>Favorited</h4>
            <ul>
              {#each favoriteAlbums as item (albumId(item))}
                <li>
                  <button type="button" class="album-card__item" on:click={() => selectAlbum(item)}>
                    <span class="album-card__title">{albumTitle(item)}</span>
                    <span class="album-card__artist">{albumArtist(item)}</span>
                  </button>
                </li>
              {/each}
            </ul>
          </section>
        {/if}

        {#if ratedAlbums.length}
          <section class="album-card" aria-label="Rated albums">
            <h4>Rated</h4>
            <ul>
              {#each ratedAlbums as item (albumId(item))}
                <li>
                  <button type="button" class="album-card__item" on:click={() => selectAlbum(item)}>
                    <span class="album-card__title">{albumTitle(item)}</span>
                    <span class="album-card__artist">{albumArtist(item)}</span>
                    {#if albumRating(item)}
                      <span class="album-card__rating">{albumRating(item)} / 5</span>
                    {/if}
                  </button>
                </li>
              {/each}
            </ul>
          </section>
        {/if}
      </div>
    {:else}
      <p class="empty">Favorite or rate an album to see it here.</p>
    {/if}
  </div>
</section>

<style>
  .content-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .content-list {
    list-style: none;
    padding: 0;
    margin: 1rem 0 0;
    display: grid;
    gap: 0.75rem;
  }

  .content-list li {
    padding: 0.7rem 0.9rem;
    background: #eef2ff;
    border-radius: 0.7rem;
  }

  .empty {
    margin-top: 1rem;
    color: #64748b;
  }

  .album-summary {
    margin-top: 2.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .album-summary__header {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .album-summary__header h3 {
    margin: 0;
    font-size: 1.35rem;
    color: #111827;
  }

  .album-summary__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1.25rem;
  }

  .album-card {
    background: #f8fafc;
    border-radius: 0.9rem;
    padding: 1rem 1.2rem;
    box-shadow: inset 0 0 0 1px rgba(79, 70, 229, 0.08);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .album-card h4 {
    margin: 0;
    font-size: 1.05rem;
    color: #1e293b;
  }

  .album-card ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .album-card li {
    list-style: none;
  }

  .album-card__item {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    font-size: 0.95rem;
    color: #1f2937;
    background: transparent;
    border: none;
    text-align: left;
    padding: 0.35rem 0.4rem;
    border-radius: 0.65rem;
    cursor: pointer;
    transition: background 0.2s ease, box-shadow 0.2s ease;
  }

  .album-card__item:hover,
  .album-card__item:focus-visible {
    background: rgba(79, 70, 229, 0.1);
    box-shadow: inset 0 0 0 1px rgba(79, 70, 229, 0.2);
    outline: none;
  }

  .album-card__item:focus-visible {
    box-shadow: inset 0 0 0 2px rgba(79, 70, 229, 0.25);
  }

  .album-card__title {
    font-weight: 600;
  }

  .album-card__artist {
    font-size: 0.85rem;
    color: #475569;
  }

  .album-card__rating {
    margin-top: 0.1rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: #4338ca;
  }
</style>
