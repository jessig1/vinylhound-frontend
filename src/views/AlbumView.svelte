<script>
  import { createEventDispatcher } from "svelte";
  import {
    albumViewData,
    albumViewLoading,
    albumViewError,
    albumViewId,
    albumInteractions,
    isAuthenticated,
  } from "../stores";
  import { getAlbumInteractionById } from "../stores/albums";
  import AlbumDetail from "../components/AlbumDetail.svelte";

  const dispatch = createEventDispatcher();

  function handleRate(event) {
    dispatch("rate", event.detail);
  }

  function handleBack() {
    dispatch("back");
  }

  // Derive album interaction
  $: albumViewInteraction = deriveAlbumViewInteraction($albumViewData, $albumViewId, $albumInteractions);

  function deriveAlbumViewInteraction(viewData, viewId, interactions) {
    const candidates = [];
    if (viewData) {
      const potential = [
        viewData.id,
        viewData._id,
        viewData.albumId,
        viewData.slug,
        viewData.title && viewData.artist ? `${viewData.artist}-${viewData.title}` : null,
      ];
      for (const candidate of potential) {
        if (candidate !== null && candidate !== undefined) {
          candidates.push(candidate);
        }
      }
    }
    if (viewId !== null && viewId !== undefined) {
      candidates.push(viewId);
    }
    for (const candidate of candidates) {
      const entry = getAlbumInteractionById(interactions, candidate);
      if (entry) {
        return entry;
      }
    }
    return null;
  }
</script>

<section class="album-page">
  <button type="button" class="album-page__back" on:click={handleBack}>&larr; Back</button>
  <AlbumDetail
    album={$albumViewData ?? {}}
    loading={$albumViewLoading}
    error={$albumViewError}
    albumId={$albumViewData?.id ?? $albumViewData?.albumId ?? $albumViewId ?? null}
    canInteract={$isAuthenticated}
    userRating={albumViewInteraction?.rating ?? null}
    on:rate={handleRate}
  />
</section>

<style>
  .album-page {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .album-page__back {
    align-self: flex-start;
    border: none;
    border-radius: 0.75rem;
    padding: 0.5rem 1.2rem;
    background: rgba(79, 70, 229, 0.15);
    color: #312e81;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
  }

  .album-page__back:hover,
  .album-page__back:focus-visible {
    background: rgba(79, 70, 229, 0.25);
    box-shadow: 0 12px 28px rgba(79, 70, 229, 0.25);
    outline: none;
    transform: translateY(-1px);
  }
</style>
