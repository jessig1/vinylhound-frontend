<script>
  import { createEventDispatcher, onMount } from "svelte";
  import SearchBar from "./SearchBar.svelte";

  export let token = "";
  export let activeUser = "";
  export let currentView = "profile";

  const dispatch = createEventDispatcher();
  let menuOpen = false;
  let menuButton;
  let menuRef;

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

  function handleProfileSelect() {
    closeMenu();
    navigate("profile");
  }

  function handleLogoutSelect() {
    closeMenu();
    handleLogout();
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
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  });

</script>

<header class="app-header">
  <div class="branding">
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
      <nav aria-label="Primary">
        <button
          type="button"
          class:selected={currentView === "albums"}
          on:click={() => navigate("albums")}
        >
          Albums
        </button>
      </nav>
    {/if}
  </div>
  {#if token}
    <div class="search-container">
      <SearchBar {token} />
    </div>
  {/if}
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

  .search-container {
    flex: 1 1 320px;
    min-width: 240px;
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

  nav {
    display: flex;
    gap: 0.75rem;
    background: rgba(79, 70, 229, 0.08);
    padding: 0.4rem;
    border-radius: 999px;
  }

  nav button {
    border: none;
    background: transparent;
    color: #312e81;
    padding: 0.4rem 1.1rem;
    border-radius: 999px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease;
  }

  nav button:hover {
    background: rgba(79, 70, 229, 0.12);
  }

  nav button.selected {
    background: #4f46e5;
    color: #ffffff;
    box-shadow: 0 10px 24px rgba(79, 70, 229, 0.25);
  }

  .session {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-left: auto;
  }

  @media (max-width: 780px) {
    .app-header {
      flex-direction: column;
      align-items: stretch;
    }

    .branding {
      justify-content: space-between;
    }

    nav {
      width: 100%;
      justify-content: space-between;
    }

    .search-container {
      width: 100%;
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
