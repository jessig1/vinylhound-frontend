<script>
  import { onMount } from "svelte";
  import { fetchCollections } from "../api/collections.js";

  export let token = "";
  export let type = ""; // 'wishlist', 'owned', or '' for all

  let collections = [];
  let loading = true;
  let error = "";
  let selectedType = type;

  const collectionLabels = {
    wishlist: "Wishlist",
    owned: "Owned Collection",
  };

  const conditionLabels = {
    mint: "Mint",
    near_mint: "Near Mint",
    very_good: "Very Good",
    good: "Good",
    fair: "Fair",
    poor: "Poor",
  };

  async function loadCollections() {
    if (!token) {
      collections = [];
      loading = false;
      return;
    }

    loading = true;
    error = "";

    try {
      const params = { token, limit: 20 };
      if (selectedType) {
        params.type = selectedType;
      }

      const result = await fetchCollections(params);
      collections = result.collections || [];
    } catch (err) {
      console.error("Failed to load collections:", err);

      // Handle unauthorized errors gracefully
      if (err.status === 401 || err.message?.toLowerCase().includes("unauthorized")) {
        error = "Your session has expired. Please log in again.";
      } else {
        error = err.message || "Failed to load collections";
      }
      collections = [];
    } finally {
      loading = false;
    }
  }

  function formatPrice(price) {
    if (!price) return null;
    return `$${price.toFixed(2)}`;
  }

  function formatDate(dateString) {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return null;
    }
  }

  function handleTypeChange(newType) {
    selectedType = newType;
    loadCollections();
  }

  onMount(() => {
    loadCollections();
  });

  $: if (token) {
    loadCollections();
  }
</script>

<section class="collection">
  <header class="collection__header">
    <div class="collection__title-row">
      <h2>My Collection</h2>
      <div class="collection__filters">
        <button
          class="filter-btn"
          class:active={selectedType === ""}
          on:click={() => handleTypeChange("")}
        >
          All
        </button>
        <button
          class="filter-btn"
          class:active={selectedType === "wishlist"}
          on:click={() => handleTypeChange("wishlist")}
        >
          Wishlist
        </button>
        <button
          class="filter-btn"
          class:active={selectedType === "owned"}
          on:click={() => handleTypeChange("owned")}
        >
          Owned
        </button>
      </div>
    </div>
    <p>Track albums you want and albums you own.</p>
  </header>

  {#if loading}
    <div class="collection__state">Loading collection…</div>
  {:else if error}
    <div class="collection__state collection__state--error">
      <strong>Error loading collection</strong>
      <p>{error}</p>
    </div>
  {:else if !token}
    <div class="collection__state">
      <strong>Sign in to view your collection</strong>
      <p>Track your wishlist and owned albums.</p>
    </div>
  {:else if !collections.length}
    <div class="collection__state">
      <strong>No items in your collection yet.</strong>
      <p>
        {#if selectedType === "wishlist"}
          Add albums to your wishlist to track what you want to buy.
        {:else if selectedType === "owned"}
          Add albums you own to track your physical collection.
        {:else}
          Start adding albums to your wishlist or owned collection.
        {/if}
      </p>
    </div>
  {:else}
    <div class="collection__grid">
      {#each collections as item (item.id)}
        <article class="collection-card">
          <div class="collection-card__header">
            <span class="collection-card__type">
              {collectionLabels[item.collectionType] || item.collectionType}
            </span>
            {#if item.condition}
              <span class="collection-card__condition">
                {conditionLabels[item.condition] || item.condition}
              </span>
            {/if}
          </div>

          <div class="collection-card__content">
            {#if item.albumCoverUrl}
              <img
                src={item.albumCoverUrl}
                alt={item.albumTitle}
                class="collection-card__cover"
              />
            {:else}
              <div class="collection-card__cover collection-card__cover--placeholder">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
            {/if}

            <div class="collection-card__info">
              <h3 class="collection-card__title">{item.albumTitle || "Untitled"}</h3>
              <p class="collection-card__artist">{item.albumArtist || "Unknown Artist"}</p>

              {#if item.albumReleaseYear}
                <p class="collection-card__year">{item.albumReleaseYear}</p>
              {/if}

              {#if item.collectionType === "owned"}
                <div class="collection-card__details">
                  {#if item.purchasePrice}
                    <span class="detail-badge">{formatPrice(item.purchasePrice)}</span>
                  {/if}
                  {#if item.dateAcquired}
                    <span class="detail-badge">{formatDate(item.dateAcquired)}</span>
                  {/if}
                </div>
              {/if}

              {#if item.notes}
                <p class="collection-card__notes">{item.notes}</p>
              {/if}
            </div>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</section>

<style>
  .collection {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin-top: 2rem;
  }

  .collection__header {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .collection__title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .collection__header h2 {
    margin: 0;
    font-size: 2rem;
    color: #1f2937;
  }

  .collection__header p {
    margin: 0;
    color: rgba(55, 65, 81, 0.85);
    font-size: 1rem;
  }

  .collection__filters {
    display: flex;
    gap: 0.5rem;
  }

  .filter-btn {
    padding: 0.5rem 1rem;
    border: 2px solid rgba(79, 70, 229, 0.2);
    border-radius: 0.75rem;
    background: white;
    color: #4f46e5;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .filter-btn:hover {
    background: rgba(79, 70, 229, 0.05);
    border-color: rgba(79, 70, 229, 0.4);
  }

  .filter-btn.active {
    background: #4f46e5;
    color: white;
    border-color: #4f46e5;
  }

  .collection__state {
    border-radius: 1.25rem;
    padding: 2.5rem 2rem;
    text-align: center;
    background: #f8fafc;
    color: #334155;
    box-shadow: inset 0 0 0 1px rgba(79, 70, 229, 0.1);
  }

  .collection__state--error {
    background: #fef2f2;
    color: #991b1b;
    box-shadow: inset 0 0 0 1px rgba(220, 38, 38, 0.2);
  }

  .collection__state strong {
    display: block;
    font-size: 1.1rem;
    margin-bottom: 0.35rem;
  }

  .collection__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
  }

  .collection-card {
    display: flex;
    flex-direction: column;
    border-radius: 1.25rem;
    padding: 1.25rem;
    background: white;
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.08), 0 0 0 1px rgba(79, 70, 229, 0.05);
    transition: all 0.2s ease;
  }

  .collection-card:hover {
    box-shadow: 0 8px 24px rgba(79, 70, 229, 0.15), 0 0 0 1px rgba(79, 70, 229, 0.1);
    transform: translateY(-2px);
  }

  .collection-card__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    gap: 0.5rem;
  }

  .collection-card__type {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.25rem 0.75rem;
    border-radius: 0.5rem;
    background: rgba(79, 70, 229, 0.1);
    color: #4f46e5;
  }

  .collection-card__condition {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: 0.4rem;
    background: rgba(16, 185, 129, 0.1);
    color: #059669;
  }

  .collection-card__content {
    display: flex;
    gap: 1rem;
  }

  .collection-card__cover {
    width: 80px;
    height: 80px;
    border-radius: 0.75rem;
    object-fit: cover;
    flex-shrink: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .collection-card__cover--placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  }

  .collection-card__cover--placeholder svg {
    width: 40px;
    height: 40px;
  }

  .collection-card__info {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 0;
    flex: 1;
  }

  .collection-card__title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 600;
    color: #111827;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .collection-card__artist {
    margin: 0;
    font-size: 0.9rem;
    color: rgba(55, 65, 81, 0.8);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .collection-card__year {
    margin: 0;
    font-size: 0.85rem;
    color: rgba(55, 65, 81, 0.6);
  }

  .collection-card__details {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.25rem;
    flex-wrap: wrap;
  }

  .detail-badge {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.2rem 0.5rem;
    border-radius: 0.4rem;
    background: rgba(99, 102, 241, 0.1);
    color: #4f46e5;
  }

  .collection-card__notes {
    margin: 0.5rem 0 0;
    font-size: 0.85rem;
    color: rgba(55, 65, 81, 0.7);
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  @media (max-width: 768px) {
    .collection__title-row {
      flex-direction: column;
      align-items: flex-start;
    }

    .collection__grid {
      grid-template-columns: 1fr;
    }
  }
</style>
