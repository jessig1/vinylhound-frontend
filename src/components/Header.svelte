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
  let searchPanelOpen = false;
  let mobileSearch;
  let recentSearches = [];
  const RECENT_SEARCHES_KEY = "vh_recent_searches";

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

  function toggleSearchPanel() {
    searchPanelOpen = !searchPanelOpen;
    if (searchPanelOpen) {
      setTimeout(() => {
        mobileSearch?.setQuery("");
      }, 0);
    }
  }

  function closeSearchPanel() {
    if (searchPanelOpen) {
      searchPanelOpen = false;
    }
  }

  function loadRecentSearches() {
    if (typeof localStorage === "undefined") {
      recentSearches = [];
      return;
    }
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (!stored) {
        recentSearches = [];
        return;
      }
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        recentSearches = parsed.filter((item) => typeof item === "string" && item.trim());
      } else {
        recentSearches = [];
      }
    } catch {
      recentSearches = [];
    }
  }

  function persistRecentSearches() {
    if (typeof localStorage === "undefined") {
      return;
    }
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches));
    } catch {
      // Ignore storage errors (e.g., quota exceeded)
    }
  }

  function recordRecentSearch(term) {
    const clean = term.trim();
    if (!clean) {
      return;
    }
    const normalized = clean.toLowerCase();
    const filtered = recentSearches.filter((item) => item.toLowerCase() !== normalized);
    recentSearches = [clean, ...filtered].slice(0, 5);
    persistRecentSearches();
  }

  function handleSearchSubmit(event) {
    const term = (event?.detail?.query || "").trim();
    if (!term) {
      return;
    }
    recordRecentSearch(term);
  }

  function handleSearchSelect(event) {
    const detail = event?.detail ?? {};
    const item = detail.item;
    if (!item) {
      return;
    }
    const query = (detail.query ?? item.title ?? "").trim();
    if (query) {
      recordRecentSearch(query);
    }
    dispatch("searchselect", detail);
    mobileSearch?.setQuery?.(item.title ?? "");
    closeSearchPanel();
  }

  function handleRecentSelect(term) {
    recordRecentSearch(term);
    searchPanelOpen = true;
    setTimeout(() => {
      mobileSearch?.setQuery(term);
    }, 0);
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
    if (event.key === "Escape") {
      if (menuOpen) {
        closeMenu();
      }
      if (searchPanelOpen) {
        closeSearchPanel();
      }
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
    loadRecentSearches();
    let mediaQuery;
    const handleMediaChange = (event) => {
      if (!event.matches) {
        closeSearchPanel();
      }
    };
    if (typeof window !== "undefined" && "matchMedia" in window) {
      mediaQuery = window.matchMedia("(max-width: 920px)");
      mediaQuery.addEventListener("change", handleMediaChange);
    }
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("keydown", handleWindowKeydown, true);
      if (mediaQuery) {
        mediaQuery.removeEventListener("change", handleMediaChange);
      }
    };
  });

  $: if (!token) {
    closeMenu();
    closeSearchPanel();
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
        <SearchBar
          {token}
          on:submit={handleSearchSubmit}
          on:select={handleSearchSelect}
        />
      </div>
      <button
        type="button"
        class="search-toggle"
        on:click={toggleSearchPanel}
        aria-label="Open search"
      >
        <svg viewBox="0 0 24 24" role="img" focusable="false">
          <path
            d="M16.5 14.5h-.79l-.28-.27a6.471 6.471 0 0 0 1.57-4.23A6.5 6.5 0 1 0 10.5 16.5c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 5L21.5 19.5l-5-5Zm-6 0A4.5 4.5 0 1 1 15 10a4.5 4.5 0 0 1-4.5 4.5Z"
          />
        </svg>
      </button>
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

{#if token && searchPanelOpen}
  <div class="search-overlay" on:click={closeSearchPanel}></div>
  <section class="mobile-search" role="dialog" aria-modal="true" aria-label="Search catalogue">
    <header class="mobile-search__header">
      <h2>Search</h2>
      <button type="button" aria-label="Close search" on:click={closeSearchPanel}>
        &times;
      </button>
    </header>
    <div class="mobile-search__body">
      <SearchBar
        bind:this={mobileSearch}
        {token}
        on:submit={handleSearchSubmit}
        on:select={handleSearchSelect}
      />
      <div class="mobile-search__recent">
        <h3>Recent searches</h3>
        {#if recentSearches.length}
          <ul>
            {#each recentSearches as term (term)}
              <li>
                <button type="button" on:click={() => handleRecentSelect(term)}>{term}</button>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="mobile-search__empty">No recent searches yet.</p>
        {/if}
      </div>
    </div>
  </section>
{/if}

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

  .search-toggle {
    display: none;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.75rem;
    border: none;
    background: rgba(15, 23, 42, 0.08);
    cursor: pointer;
    padding: 0.4rem;
    transition: background 0.2s ease, box-shadow 0.2s ease;
  }

  .search-toggle svg {
    width: 1.35rem;
    height: 1.35rem;
    fill: #1f2937;
  }

  .search-toggle:hover,
  .search-toggle:focus-visible {
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
    flex: 1 1 320px;
    max-width: 520px;
    min-width: 240px;
  }

  .header-search :global(.search) {
    width: 100%;
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

    .header-search {
      display: none;
    }

    .search-toggle {
      display: inline-flex;
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

  .search-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    backdrop-filter: blur(2px);
    z-index: 45;
  }

  .mobile-search {
    position: fixed;
    top: 6%;
    left: 50%;
    transform: translateX(-50%);
    width: min(92vw, 420px);
    background: #ffffff;
    border-radius: 1.2rem;
    box-shadow: 0 30px 60px rgba(15, 23, 42, 0.25);
    padding: 1.25rem 1.5rem 1.5rem;
    z-index: 50;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .mobile-search__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .mobile-search__header h2 {
    margin: 0;
    font-size: 1.25rem;
  }

  .mobile-search__header button {
    border: none;
    background: transparent;
    font-size: 1.75rem;
    line-height: 1;
    cursor: pointer;
    color: rgba(15, 23, 42, 0.7);
    border-radius: 0.5rem;
    padding: 0.25rem 0.5rem;
    transition: background 0.2s ease, color 0.2s ease;
  }

  .mobile-search__header button:hover,
  .mobile-search__header button:focus-visible {
    background: rgba(79, 70, 229, 0.1);
    color: #312e81;
    outline: none;
  }

  .mobile-search__body {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .mobile-search__recent h3 {
    margin: 0 0 0.5rem 0;
    font-size: 0.95rem;
    color: rgba(15, 23, 42, 0.8);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .mobile-search__recent ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .mobile-search__recent li button {
    width: 100%;
    border: none;
    background: rgba(79, 70, 229, 0.08);
    color: #312e81;
    border-radius: 0.75rem;
    padding: 0.6rem 0.8rem;
    text-align: left;
    font-size: 0.95rem;
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
  }

  .mobile-search__recent li button:hover,
  .mobile-search__recent li button:focus-visible {
    background: rgba(79, 70, 229, 0.18);
    color: #111827;
    box-shadow: 0 12px 26px rgba(79, 70, 229, 0.18);
    outline: none;
  }

  .mobile-search__empty {
    margin: 0;
    font-size: 0.95rem;
    color: rgba(55, 65, 81, 0.75);
  }

  @media (min-width: 921px) {
    .search-overlay,
    .mobile-search {
      display: none;
    }
  }
</style>
