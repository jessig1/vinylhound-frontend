<script>
  import { isAuthenticated, loading } from "../stores";
  import { content, contentDraft, favoriteAlbums, ratedAlbums } from "../stores";
  import AuthPanel from "../components/AuthPanel.svelte";
  import ContentPanel from "../components/ContentPanel.svelte";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();
  let authPanel;

  function handleSignup(event) {
    dispatch("signup", event.detail);
  }

  function handleLogin(event) {
    dispatch("login", event.detail);
  }

  function handleSave(event) {
    dispatch("save", event.detail);
  }

  function handleRefresh(event) {
    dispatch("refresh", event.detail);
  }

  function handleSelectAlbum(event) {
    dispatch("selectalbum", event.detail);
  }

  export { authPanel };
</script>

{#if $isAuthenticated}
  <ContentPanel
    content={$content}
    bind:draft={$contentDraft}
    favoriteAlbums={$favoriteAlbums}
    ratedAlbums={$ratedAlbums}
    loading={$loading}
    on:save={handleSave}
    on:refresh={handleRefresh}
    on:selectalbum={handleSelectAlbum}
  />
{:else}
  <AuthPanel
    bind:this={authPanel}
    loading={$loading}
    on:signup={handleSignup}
    on:login={handleLogin}
  />
{/if}
