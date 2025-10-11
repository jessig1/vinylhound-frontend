<script>
  import { createEventDispatcher } from "svelte";

  export let album = {
    artist: "",
    title: "",
    releaseYear: "",
    rating: 0,
    genres: [],
    tracks: [],
  };
  export let favorite = false;
  export let userRating = null;
  export let canInteract = false;
  export let interactionMessage = "";

  const maxRating = 5;
  const userRatingScale = [1, 2, 3, 4, 5];
  const dispatch = createEventDispatcher();

  function toggleFavorite() {
    if (!canInteract) {
      return;
    }
    dispatch("favorite", { favorite: !favorite });
  }

  function setRating(value) {
    if (!canInteract) {
      return;
    }
    const next = userRating === value ? null : value;
    dispatch("rate", { rating: next });
  }
</script>

<section class="album">
  <header class="album__header">
    <h1 class="album__title">{album.title}</h1>
    <p class="album__artist">By {album.artist}</p>
    <div class="album__meta">
      <span class="album__year">
        <span class="label">Release Year</span>
        <span class="value">{album.releaseYear}</span>
      </span>
      <span class="album__rating" aria-label={`Rated ${album.rating} out of ${maxRating}`}>
        <span class="label">Rating</span>
        <span class="value">{album.rating} / {maxRating}</span>
      </span>
    </div>
    <div class="album__actions">
      <button
        type="button"
        class="album__favorite"
        class:selected={favorite}
        on:click={toggleFavorite}
        disabled={!canInteract}
        aria-pressed={favorite}
      >
        {favorite ? "Favorited" : "Add to favorites"}
      </button>
      <div
        class="album__ratings"
        role="radiogroup"
        aria-label="Your rating for this album"
      >
        {#each userRatingScale as value}
          <button
            type="button"
            class:selected={userRating >= value}
            on:click={() => setRating(value)}
            disabled={!canInteract}
            aria-pressed={userRating >= value}
            aria-label={`Rate ${value} out of ${maxRating}`}
          >
            <span aria-hidden="true">&#9733;</span>
          </button>
        {/each}
      </div>
    </div>
    <div class="album__actions-hint">
      {#if interactionMessage}
        <p class={!canInteract ? "is-disabled" : ""}>{interactionMessage}</p>
      {:else if canInteract}
        <p>Favorites and ratings appear in your profile.</p>
      {:else}
        <p class="is-disabled">Log in to manage your favorites and ratings.</p>
      {/if}
      {#if userRating}
        <p class="current-rating">Your rating: {userRating} / {maxRating}</p>
      {/if}
    </div>
  </header>

  {#if album.genres?.length}
    <section class="album__genres" aria-label="Genres">
      <h2>Genres</h2>
      <ul>
        {#each album.genres as genre}
          <li>{genre}</li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if album.tracks?.length}
    <section class="album__tracks" aria-label="Track list">
      <h2>Track List</h2>
      <ol>
        {#each album.tracks as track}
          <li>{track}</li>
        {/each}
      </ol>
    </section>
  {/if}
</section>

<style>
  .album {
    background: #ffffff;
    border-radius: 1rem;
    box-shadow: 0 20px 40px rgba(38, 38, 78, 0.12);
    padding: 2.5rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .album__header {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .album__title {
    margin: 0;
    font-size: clamp(2.2rem, 4vw, 2.8rem);
    font-weight: 700;
    color: #111827;
  }

  .album__artist {
    margin: 0;
    font-size: 1.1rem;
    color: #4b5563;
  }

  .album__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem;
    font-size: 0.95rem;
    color: #30373d;
  }

  .album__meta .label {
    display: block;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #6b7280;
    margin-bottom: 0.25rem;
  }

  .album__meta .value {
    font-weight: 600;
    font-size: 1.05rem;
  }

  .album__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.9rem;
    align-items: center;
  }

  .album__favorite {
    border: none;
    background: #4f46e5;
    color: #ffffff;
    border-radius: 999px;
    padding: 0.55rem 1.4rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.2s ease;
  }

  .album__favorite:hover:not(:disabled) {
    background: #4338ca;
    transform: translateY(-1px);
  }

  .album__favorite.selected {
    background: #f97316;
  }

  .album__favorite:disabled {
    background: #94a3b8;
    cursor: not-allowed;
  }

  .album__ratings {
    display: inline-flex;
    gap: 0.35rem;
  }

  .album__ratings button {
    border: none;
    width: 2.4rem;
    height: 2.4rem;
    border-radius: 50%;
    background: rgba(226, 232, 240, 0.7);
    color: #cbd5f5;
    font-size: 1.1rem;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.2s ease, color 0.2s ease;
  }

  .album__ratings button:hover:not(:disabled) {
    background: rgba(199, 210, 254, 0.9);
    color: #4338ca;
    transform: translateY(-1px);
  }

  .album__ratings button.selected {
    background: #4f46e5;
    color: #fde68a;
  }

  .album__ratings button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
    transform: none;
  }

  .album__actions-hint {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.9rem;
    color: #475569;
  }

  .album__actions-hint p {
    margin: 0;
  }

  .album__actions-hint .is-disabled {
    color: #b91c1c;
  }

  .album__actions-hint .current-rating {
    color: #1f2937;
    font-weight: 600;
  }

  .album__genres h2,
  .album__tracks h2 {
    margin: 0 0 0.85rem;
    font-size: 1.4rem;
    color: #1f2937;
  }

  .album__genres ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
  }

  .album__genres li {
    background: #ede9fe;
    color: #4c1d95;
    padding: 0.4rem 0.9rem;
    border-radius: 999px;
    font-size: 0.95rem;
    font-weight: 600;
  }

  .album__tracks ol {
    margin: 0;
    padding-left: 1.2rem;
    display: grid;
    gap: 0.45rem;
  }

  .album__tracks li {
    background: #f3f4f6;
    border-radius: 0.6rem;
    padding: 0.65rem 0.9rem;
  }

  @media (max-width: 640px) {
    .album {
      padding: 1.75rem;
    }
  }
</style>
