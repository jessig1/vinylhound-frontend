<script>
  import { createEventDispatcher } from "svelte";

  export let token = "";
  export let currentView = "news";
  export let playlists = [];
  export let open = false;
  export let username = "";

  const dispatch = createEventDispatcher();

  const navItems = [
    { label: "Home", view: "news" },
    { label: "Artists", view: "artists" },
    { label: "My Playlists", view: "playlists" },
  ];

  function handleNavigate(view) {
    dispatch("navigate", { view });
    dispatch("close");
  }

  function handleViewMore() {
    dispatch("viewMore");
    dispatch("close");
  }

  function handleClose() {
    dispatch("close");
  }

  $: normalizedUsername = (username || "").trim().toLowerCase();
  function ownerLabel(owner) {
    if (!owner) {
      return "Unknown curator";
    }
    return normalizedUsername && owner.trim().toLowerCase() === normalizedUsername ? "You" : owner;
  }

  function handlePlaylistClick(playlist) {
    if (!playlist) {
      return;
    }
    dispatch("navigate", { view: "playlists", playlistId: playlist.id ?? null });
    dispatch("close");
  }
</script>

{#if token}
  <aside class="sidebar" class:is-open={open} aria-label="Main navigation">
    <div class="sidebar__inner">
      <button
        type="button"
        class="sidebar__close"
        on:click={handleClose}
        aria-label="Close navigation"
      >
        <span aria-hidden="true">&times;</span>
      </button>
      <div class="sidebar__logo">
        <span aria-hidden="true" class="sidebar__mark">VH</span>
        <span>Vinyhound</span>
      </div>
      <nav class="sidebar__nav">
        {#each navItems as item (item.view)}
          <button
            type="button"
            class:selected={currentView === item.view}
            on:click={() => handleNavigate(item.view)}
          >
            {item.label}
          </button>
        {/each}
      </nav>
      <section class="sidebar__section">
        <header>
          <h2>Recent playlists</h2>
          <p>Your latest curation drops.</p>
        </header>
        {#if playlists.length}
          <ul>
            {#each playlists.slice(0, 5) as playlist, index (playlist.id ?? `${playlist.title}-${index}`)}
              <li>
                <button type="button" on:click={() => handlePlaylistClick(playlist)}>
                  <span class="playlist__title">{playlist.title}</span>
                  <span class="playlist__owner">{ownerLabel(playlist.owner)}</span>
                </button>
              </li>
            {/each}
          </ul>
        {:else}
          <div class="sidebar__empty">
            <p>No playlists yet.</p>
            <p>Create one to see it here.</p>
          </div>
        {/if}
        <button
          type="button"
          class="sidebar__more"
          on:click={handleViewMore}
        >
          View more
        </button>
      </section>
    </div>
  </aside>
{/if}

<style>
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 260px;
    padding: 2rem 1.5rem;
    background: linear-gradient(180deg, #f8fafc 0%, #e0e7ff 100%);
    box-shadow: 10px 0 40px rgba(15, 23, 42, 0.12);
    color: #0f172a;
    display: flex;
    flex-direction: column;
    z-index: 30;
    transition: transform 0.3s ease, opacity 0.3s ease;
  }

  .sidebar__inner {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    height: 100%;
  }

  .sidebar__close {
    display: none;
    align-self: flex-end;
    border: none;
    background: transparent;
    font-size: 1.4rem;
    font-weight: 600;
    cursor: pointer;
    color: rgba(15, 23, 42, 0.65);
  }

  .sidebar__logo {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    font-size: 1.2rem;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  .sidebar__mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.5rem;
    background: rgba(79, 70, 229, 0.2);
    color: #312e81;
    font-weight: 700;
    font-size: 0.95rem;
  }

  .sidebar__nav {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .sidebar__nav button {
    border: none;
    background: rgba(79, 70, 229, 0.08);
    color: #1f2937;
    padding: 0.75rem 0.9rem;
    border-radius: 0.85rem;
    text-align: left;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
  }

  .sidebar__nav button:hover,
  .sidebar__nav button:focus-visible {
    background: rgba(79, 70, 229, 0.18);
    color: #111827;
    box-shadow: 0 10px 24px rgba(79, 70, 229, 0.18);
    outline: none;
  }

  .sidebar__nav button.selected {
    background: #4f46e5;
    color: #ffffff;
    box-shadow: 0 16px 36px rgba(79, 70, 229, 0.3);
  }

  .sidebar__section {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .sidebar__section header h2 {
    margin: 0;
    font-size: 1rem;
  }

  .sidebar__section header p {
    margin: 0.2rem 0 0;
    font-size: 0.85rem;
    color: rgba(15, 23, 42, 0.65);
  }

  .sidebar__section ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    flex: 1;
  }

  .sidebar__section li {
    list-style: none;
  }

  .sidebar__section li button {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.65rem 0.8rem;
    border-radius: 0.85rem;
    border: none;
    background: rgba(15, 23, 42, 0.04);
    box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.05);
    text-align: left;
    cursor: pointer;
    transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
  }

  .sidebar__section li button:hover,
  .sidebar__section li button:focus-visible {
    background: rgba(79, 70, 229, 0.18);
    box-shadow: 0 12px 26px rgba(79, 70, 229, 0.18);
    outline: none;
    transform: translateY(-1px);
  }

  .playlist__title {
    font-weight: 600;
    color: #0f172a;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .playlist__owner {
    font-size: 0.8rem;
    color: rgba(15, 23, 42, 0.6);
  }

  .sidebar__empty {
    border-radius: 0.85rem;
    padding: 1.2rem;
    background: rgba(15, 23, 42, 0.05);
    color: rgba(15, 23, 42, 0.6);
    font-size: 0.9rem;
  }

  .sidebar__empty p {
    margin: 0.25rem 0;
  }

  .sidebar__more {
    border: none;
    background: rgba(79, 70, 229, 0.12);
    color: #312e81;
    border-radius: 999px;
    padding: 0.6rem 0.9rem;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
  }

  .sidebar__more:hover,
  .sidebar__more:focus-visible {
    background: rgba(79, 70, 229, 0.22);
    color: #1f2937;
    box-shadow: 0 12px 28px rgba(79, 70, 229, 0.25);
    outline: none;
  }

  .sidebar__more:disabled {
    cursor: not-allowed;
    background: rgba(148, 163, 184, 0.4);
    color: rgba(71, 85, 105, 0.9);
    box-shadow: none;
  }

  @media (max-width: 920px) {
    .sidebar {
      width: min(80%, 320px);
      transform: translateX(-110%);
      opacity: 0;
      pointer-events: none;
    }

    .sidebar.is-open {
      transform: translateX(0);
      opacity: 1;
      pointer-events: auto;
    }

    .sidebar__inner {
      gap: 1.5rem;
    }

    .sidebar__close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 0.6rem;
      background: rgba(255, 255, 255, 0.65);
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
      font-size: 1.5rem;
      color: #1f2937;
    }
  }
</style>
