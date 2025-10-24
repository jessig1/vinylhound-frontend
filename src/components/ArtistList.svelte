<script>
  import { createEventDispatcher } from "svelte";

  export let artists = [];
  export let loading = false;
  export let error = "";

  const dispatch = createEventDispatcher();

  function getInitial(name = "") {
    const trimmed = (name || "").trim();
    if (!trimmed) {
      return "#";
    }
    const first = trimmed.charAt(0).toUpperCase();
    return /[A-Z]/.test(first) ? first : "#";
  }

  function compareInitial(a, b) {
    if (a === b) {
      return 0;
    }
    if (a === "#") {
      return 1;
    }
    if (b === "#") {
      return -1;
    }
    return a.localeCompare(b, undefined, { sensitivity: "base" });
  }

  function gradientForName(name = "") {
    let hash = 0;
    const source = (name || "").toLowerCase();
    for (let i = 0; i < source.length; i += 1) {
      hash = source.charCodeAt(i) + ((hash << 5) - hash);
      hash |= 0;
    }
    const hue = Math.abs(hash) % 360;
    const secondaryHue = (hue + 45) % 360;
    return {
      background: `linear-gradient(135deg, hsl(${hue} 80% 55%), hsl(${secondaryHue} 70% 45%))`,
      shadow: `0 10px 30px hsla(${hue}, 80%, 40%, 0.4)`,
    };
  }

  function createArtistEntry(artist) {
    const name = (artist?.name || "").trim();
    const initial = getInitial(name);
    const palette = gradientForName(name);
    return {
      ...artist,
      name,
      initial,
      background: palette.background,
      shadow: palette.shadow,
    };
  }

  $: groups = (() => {
    if (!Array.isArray(artists) || !artists.length) {
      return [];
    }
    const map = new Map();
    for (const artist of artists) {
      if (!artist) {
        continue;
      }
      const entry = createArtistEntry(artist);
      const { initial } = entry;
      if (!map.has(initial)) {
        map.set(initial, []);
      }
      map.get(initial).push(entry);
    }
    return Array.from(map.entries())
      .map(([initial, entries]) => ({
        initial,
        entries: [...entries].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
      }))
      .sort((a, b) => compareInitial(a.initial, b.initial));
  })();

  function handleRetry() {
    dispatch("retry");
  }

  function handleSelect(artist) {
    if (!artist) {
      return;
    }
    dispatch("select", artist);
  }
</script>

<section class="artist-directory">
  <header class="artist-directory__header">
    <h2>Artist directory</h2>
    <p>Browse the artists shaping the Vinyhound catalog.</p>
  </header>

  {#if loading}
    <div class="artist-directory__status">Loading artists...</div>
  {:else if error}
    <div class="artist-directory__status artist-directory__status--error">
      <span>{error}</span>
      <button type="button" on:click={handleRetry}>Try again</button>
    </div>
  {:else if groups.length}
    <div class="artist-directory__grid">
      {#each groups as group (group.initial)}
        <section class="artist-group">
          <h3 class="artist-group__title" id={`artists-${group.initial}`}>{group.initial}</h3>
          <ul class="artist-group__list" aria-labelledby={`artists-${group.initial}`}>
            {#each group.entries as artist (artist.slug)}
              <li>
                <button
                  type="button"
                  class="artist-item"
                  on:click={() => handleSelect(artist)}
                >
                  <span
                    class="artist-thumb"
                    style={`--thumb-bg:${artist.background}; --thumb-shadow:${artist.shadow};`}
                    aria-hidden="true"
                  >
                    {artist.initial}
                  </span>
                  <span class="artist-content">
                    <span class="artist-name">{artist.name}</span>
                    {#if artist.genres?.length}
                      <span class="artist-meta">{artist.genres.slice(0, 3).join(" · ")}</span>
                    {/if}
                  </span>
                </button>
              </li>
            {/each}
          </ul>
        </section>
      {/each}
    </div>
  {:else}
    <div class="artist-directory__status">
      No artists to show yet. Add albums to see featured performers here.
    </div>
  {/if}
</section>

<style>
  .artist-directory {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 1.25rem;
    padding: 2rem;
    box-shadow: 0 18px 42px rgba(79, 70, 229, 0.18);
  }

  .artist-directory__header h2 {
    margin: 0;
    font-size: 1.75rem;
    color: #1f2937;
  }

  .artist-directory__header p {
    margin: 0.35rem 0 0;
    color: rgba(75, 85, 99, 0.9);
    font-size: 0.95rem;
  }

  .artist-directory__status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.1rem 1.25rem;
    border-radius: 0.9rem;
    background: rgba(79, 70, 229, 0.08);
    color: #4338ca;
    font-size: 0.95rem;
  }

  .artist-directory__status--error {
    background: rgba(239, 68, 68, 0.1);
    color: #b91c1c;
  }

  .artist-directory__status button {
    border: none;
    background: rgba(79, 70, 229, 0.15);
    color: #312e81;
    padding: 0.45rem 0.85rem;
    border-radius: 999px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
  }

  .artist-directory__status button:hover,
  .artist-directory__status button:focus-visible {
    background: rgba(79, 70, 229, 0.3);
    color: #1f2937;
    box-shadow: 0 12px 28px rgba(79, 70, 229, 0.25);
    outline: none;
  }

  .artist-directory__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1.5rem;
  }

  .artist-group {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .artist-group__title {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 700;
    color: #312e81;
  }

  .artist-group__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .artist-group__list li {
    list-style: none;
  }

  .artist-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.55rem 0.65rem;
    border-radius: 0.9rem;
    background: rgba(255, 255, 255, 0.65);
    box-shadow: 0 8px 20px rgba(30, 41, 59, 0.08);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    width: 100%;
    border: none;
    cursor: pointer;
    text-align: left;
    outline: none;
  }

  .artist-item:hover,
  .artist-item:focus-within {
    transform: translateY(-2px);
    box-shadow: 0 16px 30px rgba(30, 41, 59, 0.12);
  }

  .artist-thumb {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 50%;
    font-weight: 700;
    font-size: 1.2rem;
    color: #ffffff;
    background: var(--thumb-bg);
    box-shadow: var(--thumb-shadow, 0 10px 25px rgba(79, 70, 229, 0.2));
  }

  .artist-content {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .artist-name {
    font-size: 0.95rem;
    font-weight: 600;
    color: #1f2937;
  }

  .artist-meta {
    font-size: 0.8rem;
    color: rgba(71, 85, 105, 0.9);
  }

  @media (max-width: 640px) {
    .artist-directory {
      padding: 1.5rem;
    }

    .artist-directory__grid {
      grid-template-columns: 1fr;
    }
  }
</style>
