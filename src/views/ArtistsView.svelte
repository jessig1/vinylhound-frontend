<script>
  import { createEventDispatcher } from "svelte";
  import { artists, artistsLoading, artistsError, selectedArtist } from "../stores";
  import ArtistList from "../components/ArtistList.svelte";
  import ArtistDetail from "../components/ArtistDetail.svelte";

  const dispatch = createEventDispatcher();

  function handleSelect(event) {
    const artist = event.detail;
    if (!artist) {
      return;
    }
    const match = $artists.find((item) => item.slug === artist.slug) || artist;
    selectedArtist.set(match);
  }

  function handleBack() {
    selectedArtist.set(null);
  }

  function handleRefresh() {
    dispatch("refresh");
  }

  function handleRetry() {
    dispatch("retry");
  }

  function handleSelectAlbum(event) {
    dispatch("selectalbum", event.detail);
  }
</script>

{#if $selectedArtist}
  <ArtistDetail
    artist={$selectedArtist}
    on:back={handleBack}
    on:refresh={handleRefresh}
    on:selectalbum={handleSelectAlbum}
  />
{:else}
  <ArtistList
    artists={$artists}
    loading={$artistsLoading}
    error={$artistsError}
    on:retry={handleRetry}
    on:select={handleSelect}
    on:selectalbum={handleSelectAlbum}
  />
{/if}
