<script>
  import Collection from "./Collection.svelte";

  export let content = [];
  export let favoriteAlbums = [];
  export let ratedAlbums = [];
  export let loading = false;
  export let token = "";

  const MAX_ITEMS = 10;

  function createSnippet(text = "") {
    if (!text) {
      return "";
    }
    const trimmed = text.trim().replace(/\s+/g, " ");
    return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed;
  }

  function buildFeedItems() {
    const items = [];
    const now = Date.now();

    (Array.isArray(content) ? content : []).forEach((entry, index) => {
      const snippet = createSnippet(entry);
      if (!snippet) {
        return;
      }
      items.push({
        id: `content-${index}`,
        heading: "Personal update",
        title: snippet,
        meta: "From your collection notes",
        timestamp: now - index * 60_000,
      });
    });

    (Array.isArray(favoriteAlbums) ? favoriteAlbums : []).forEach((album, index) => {
      const title = album?.title || album?.album?.title || "Favorited album";
      const artist = album?.artist || album?.album?.artist || "";
      items.push({
        id: `favorite-${album?.albumId || index}`,
        heading: "New favorite",
        title,
        meta: artist ? `${artist} · Marked as favorite` : "Marked as favorite",
        timestamp: now - (index + 1) * 90_000,
      });
    });

    (Array.isArray(ratedAlbums) ? ratedAlbums : []).forEach((album, index) => {
      const rating = Number.isFinite(album?.rating) ? album.rating : null;
      if (rating === null) {
        return;
      }
      const title = album?.title || album?.album?.title || "Rated album";
      const artist = album?.artist || album?.album?.artist || "";
      items.push({
        id: `rated-${album?.albumId || index}`,
        heading: "Recent rating",
        title,
        meta: `${artist ? `${artist} · ` : ""}Rated ${rating}/5`,
        timestamp: now - (index + 1) * 120_000,
      });
    });

    items.sort((a, b) => b.timestamp - a.timestamp);
    return items.slice(0, MAX_ITEMS);
  }

  $: feedItems = buildFeedItems();
</script>

<section class="feed">
  <header class="feed__header">
    <h2>News feed</h2>
    <p>Catch up on highlights from your collection.</p>
  </header>

  {#if loading}
    <div class="feed__state">Loading updates…</div>
  {:else if !feedItems.length}
    <div class="feed__state">
      <strong>No updates yet.</strong>
      <p>Add notes, favorite albums, or leave ratings to see them appear here.</p>
    </div>
  {:else}
    <ul class="feed__list">
      {#each feedItems as item (item.id)}
        <li class="feed__item">
          <article class="card">
            <span class="card__label">{item.heading}</span>
            <h3>{item.title}</h3>
            <p>{item.meta}</p>
          </article>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<!-- Collection section displayed below the news feed -->
<Collection {token} />

<style>
  .feed {
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
  }

  .feed__header h2 {
    margin: 0;
    font-size: 2rem;
    color: #1f2937;
  }

  .feed__header p {
    margin: 0.35rem 0 0;
    color: rgba(55, 65, 81, 0.85);
    font-size: 1rem;
  }

  .feed__state {
    border-radius: 1.25rem;
    padding: 2.5rem 2rem;
    text-align: center;
    background: #f8fafc;
    color: #334155;
    box-shadow: inset 0 0 0 1px rgba(79, 70, 229, 0.1);
  }

  .feed__state strong {
    display: block;
    font-size: 1.1rem;
    margin-bottom: 0.35rem;
  }

  .feed__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 1.25rem;
  }

  .feed__item {
    margin: 0;
  }

  .card {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    border-radius: 1.35rem;
    padding: 1.5rem;
    background: linear-gradient(150deg, rgba(99, 102, 241, 0.12), rgba(79, 70, 229, 0.05));
    box-shadow: 0 18px 38px rgba(79, 70, 229, 0.15);
    color: #111827;
    min-height: 160px;
  }

  .card__label {
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(79, 70, 229, 0.9);
  }

  .card h3 {
    margin: 0;
    font-size: 1.15rem;
  }

  .card p {
    margin: 0;
    color: rgba(55, 65, 81, 0.85);
    font-size: 0.95rem;
  }
</style>
