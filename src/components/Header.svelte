<script>
  import { createEventDispatcher } from "svelte";

  export let token = "";
  export let activeUser = "";
  export let currentView = "profile";

  const dispatch = createEventDispatcher();

  function handleLogout() {
    dispatch("logout");
  }

  function navigate(view) {
    dispatch("navigate", { view });
  }
</script>

<header class="app-header">
  <div class="branding">
    <h1>Vinyhound</h1>
    <nav aria-label="Primary">
      <button
        type="button"
        class:selected={currentView === "profile"}
        on:click={() => navigate("profile")}
      >
        Profile
      </button>
      <button
        type="button"
        class:selected={currentView === "albums"}
        on:click={() => navigate("albums")}
      >
        Albums
      </button>
    </nav>
  </div>
  {#if token}
    <div class="session">
      <span>Signed in as <strong>{activeUser}</strong></span>
      <button type="button" on:click={handleLogout}>Log out</button>
    </div>
  {/if}
</header>

<style>
  .app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    gap: 1.5rem;
  }

  .branding {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  h1 {
    font-size: 2.5rem;
    margin: 0;
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
    display: flex;
    gap: 1rem;
    align-items: center;
    font-size: 0.95rem;
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
  }
</style>
