<script>
  import { createEventDispatcher, onMount } from "svelte";
  import SpotifySearchSimple from "./SpotifySearchSimple.svelte";

  export let token = "";
  export let activeUser = "";
  export let currentView = "profile";

  const dispatch = createEventDispatcher();
  let menuOpen = false;
  let menuButton;
  let menuRef;

  function emitMenuToggle() {
    dispatch("menutoggle");
  }

  function handleLogout() {
    dispatch("logout");
  }

  function navigate(view) {
    dispatch("navigate", { view });
  }

  function goHome() {
    if (token) {
      navigate("news");
    } else {
      navigate("profile");
    }
  }

  function toggleMenu() {
    menuOpen = !menuOpen;
  }

  function closeMenu() {
    if (menuOpen) {
      menuOpen = false;
    }
  }

  function forwardArtistSelect(event) {
    if (!event?.detail) {
      return;
    }
    dispatch("selectartist", event.detail);
  }

  function forwardAlbumSelect(event) {
    if (!event?.detail) {
      return;
    }
    dispatch("selectalbum", event.detail);
  }

  function handleProfileSelect() {
    closeMenu();
    navigate("profile");
  }

  function handleLogoutSelect() {
    closeMenu();
    handleLogout();
  }

  function handleWindowKeydown(event) {
    if (event.key === "Escape" && menuOpen) {
      closeMenu();
    }
  }

  function handleDocumentClick(event) {
    if (!menuOpen) {
      return;
    }
    const target = event.target;
    if (menuButton?.contains(target) || menuRef?.contains(target)) {
      return;
    }
    closeMenu();
  }

  onMount(() => {
    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("keydown", handleWindowKeydown, true);
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("keydown", handleWindowKeydown, true);
    };
  });

  $: if (!token) {
    closeMenu();
  }
</script>

<header class="app-header">
  <div class="branding">
    {#if token}
      <button
        type="button"
        class="menu-toggle"
        on:click={emitMenuToggle}
        aria-label="Open navigation"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
    {/if}
    <h1>
      <button
        type="button"
        class="logo-button"
        on:click={goHome}
        aria-label="Go to news feed"
      >
        Vinyhound
      </button>
    </h1>
    {#if token}
      <div class="header-search">
        <div class="spotify-search-section">
          <SpotifySearchSimple
            on:selectartist={forwardArtistSelect}
            on:selectalbum={forwardAlbumSelect}
          />
        </div>
      </div>
    {/if}
  </div>
  {#if token}
    <div class="session">
      <button
        type="button"
        class="session__trigger"
        aria-haspopup="true"
        aria-expanded={menuOpen}
        bind:this={menuButton}
        on:click={toggleMenu}
      >
        <span class="session__avatar" aria-hidden="true">
          <svg viewBox="0 0 24 24" role="img" focusable="false">
            <path
              d="M12 12.75a4.125 4.125 0 1 0 0-8.25 4.125 4.125 0 0 0 0 8.25Zm0 2.25c-3.456 0-6.75 1.742-6.75 3.938 0 .621.504 1.062 1.125 1.062h11.25c.621 0 1.125-.441 1.125-1.062 0-2.196-3.294-3.938-6.75-3.938Z"
            />
          </svg>
        </span>
        <span class="session__name">{activeUser}</span>
      </button>
      {#if menuOpen}
        <div class="session__menu" role="menu" bind:this={menuRef}>
          <button type="button" role="menuitem" on:click={handleProfileSelect}>
            Profile
          </button>
          <button type="button" role="menuitem" on:click={handleLogoutSelect}>
            Sign out
          </button>
        </div>
      {/if}
    </div>
  {/if}
</header>

<style>
  .app-header {
    display: flex;
    align-items: center;
    margin-bottom: 2rem;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .branding {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    flex-wrap: wrap;
    flex: 0 0 auto;
  }

  .menu-toggle {
    display: none;
    flex-direction: column;
    justify-content: center;
    gap: 0.25rem;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.75rem;
    border: none;
    background: rgba(15, 23, 42, 0.08);
    cursor: pointer;
    padding: 0.4rem;
    transition: background 0.2s ease, box-shadow 0.2s ease;
  }

  .menu-toggle span {
    display: block;
    height: 2px;
    border-radius: 999px;
    background: #1f2937;
    width: 100%;
  }

  .menu-toggle:hover,
  .menu-toggle:focus-visible {
    background: rgba(79, 70, 229, 0.16);
    box-shadow: 0 0 0 1px rgba(79, 70, 229, 0.2);
    outline: none;
  }

  h1 {
    font-size: 2.5rem;
    margin: 0;
  }

  .logo-button {
    border: none;
    background: transparent;
    font: inherit;
    color: inherit;
    cursor: pointer;
    padding: 0;
  }

  .logo-button:hover,
  .logo-button:focus-visible {
    color: #4f46e5;
    outline: none;
  }

  .header-search {
    flex: 1 1 360px;
    max-width: 540px;
    min-width: 260px;
  }

  .header-search .spotify-search-section {
    background: rgba(255, 255, 255, 0.85);
    border-radius: 1rem;
    padding: 1rem 1.25rem;
    box-shadow: 0 12px 28px rgba(79, 70, 229, 0.18);
    border: 1px solid rgba(79, 70, 229, 0.2);
  }

  .header-search .spotify-search-section h3 {
    margin: 0 0 0.75rem 0;
    font-size: 1.05rem;
    color: #312e81;
  }

  .header-search :global(.spotify-search-simple) {
    gap: 0.75rem;
  }

  .session {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-left: auto;
  }

  @media (max-width: 920px) {
    .menu-toggle {
      display: inline-flex;
    }

    .app-header {
      align-items: stretch;
    }

    .header-search {
      flex-basis: 100%;
      max-width: none;
    }

    .header-search .spotify-search-section {
      padding: 1rem;
    }
  }

  @media (max-width: 780px) {
    .app-header {
      flex-direction: column;
      align-items: stretch;
    }

    .branding {
      justify-content: space-between;
    }

    .session {
      width: 100%;
      justify-content: flex-end;
      margin-left: 0;
    }
  }

  .session__trigger {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    border: none;
    background: transparent;
    cursor: pointer;
    padding: 0.4rem 0.5rem;
    border-radius: 999px;
    font-size: 0.95rem;
    font-weight: 600;
    color: #1f2937;
    transition: background 0.2s ease, box-shadow 0.2s ease;
  }

  .session__trigger:hover,
  .session__trigger:focus-visible {
    background: rgba(79, 70, 229, 0.08);
    box-shadow: 0 0 0 1px rgba(79, 70, 229, 0.2);
    outline: none;
  }

  .session__avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 50%;
    background: linear-gradient(135deg, #4f46e5, #6366f1);
    color: #ffffff;
    box-shadow: 0 10px 24px rgba(99, 102, 241, 0.3);
  }

  .session__avatar svg {
    width: 1.2rem;
    height: 1.2rem;
    fill: currentColor;
  }

  .session__name {
    max-width: 10rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .session__menu {
    position: absolute;
    top: calc(100% + 0.4rem);
    right: 0;
    min-width: 160px;
    background: #ffffff;
    border-radius: 0.85rem;
    box-shadow: 0 18px 42px rgba(15, 23, 42, 0.2);
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    z-index: 20;
  }

  .session__menu button {
    border: none;
    background: transparent;
    text-align: left;
    padding: 0.65rem 0.75rem;
    border-radius: 0.65rem;
    font-size: 0.95rem;
    color: #1f2937;
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease;
  }

  .session__menu button:hover,
  .session__menu button:focus-visible {
    background: rgba(79, 70, 229, 0.08);
    color: #312e81;
    outline: none;
  }

</style>
