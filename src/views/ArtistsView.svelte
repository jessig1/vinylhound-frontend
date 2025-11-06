<script>
  import { createEventDispatcher, onMount } from "svelte";
  import { artists, artistsLoading, artistsError, selectedArtist } from "../stores";
  import { navigateTo } from "../router";
  import ArtistList from "../components/ArtistList.svelte";
  import ArtistDetail from "../components/ArtistDetail.svelte";
  import { getArtistDetails } from "../api/search.js";
  import { token } from "../stores/auth";
  import { get } from "svelte/store";

  const dispatch = createEventDispatcher();

  let isRefreshingArtist = false;

  // Hydrate selectedArtist if it's just a placeholder with a slug
  $: if ($selectedArtist && $selectedArtist.slug && !$selectedArtist.name && $artists.length > 0) {
    const fullArtist = $artists.find((a) => a.slug === $selectedArtist.slug);
    if (fullArtist) {
      console.log('[ArtistsView] Hydrating artist from albums:', fullArtist.name);
      selectedArtist.set(fullArtist);
    } else {
      console.warn('[ArtistsView] Artist not found in albums:', $selectedArtist.slug);
    }
  }

  // Check if we need to refresh artist data on mount (for external artists from search)
  onMount(async () => {
    console.log('[ArtistsView] onMount - selectedArtist:', $selectedArtist);

    // If we have an artist with external_id but no albums, refresh the data
    if ($selectedArtist && $selectedArtist.external_id && (!$selectedArtist.albums || $selectedArtist.albums.length === 0)) {
      console.log('[ArtistsView] Refreshing artist data from API for:', $selectedArtist.name, 'ID:', $selectedArtist.external_id);
      await refreshArtistData($selectedArtist.external_id, $selectedArtist.slug);
    }
  });

  async function refreshArtistData(artistId, slug) {
    if (isRefreshingArtist) {
      console.log('[ArtistsView] Already refreshing artist data');
      return;
    }

    isRefreshingArtist = true;
    try {
      console.log('[ArtistsView] Fetching artist details for ID:', artistId);
      const data = await getArtistDetails(artistId);
      const fetchedArtist = data?.artist ?? {};
      const fetchedAlbums = Array.isArray(data?.albums) ? data.albums : [];

      console.log('[ArtistsView] Received artist data:', {
        name: fetchedArtist.name,
        albumCount: fetchedAlbums.length,
        genres: fetchedArtist.genres
      });

      const enrichedArtist = {
        id: artistId,
        external_id: artistId,
        slug: slug,
        ...fetchedArtist,
        image: fetchedArtist.image_url,
        albums: fetchedAlbums.map((album) => ({
          ...album,
          cover: album.cover_url,
          releaseYear: album.release_year,
          id: album.external_id,
        })),
        counts: {
          albums: fetchedAlbums.length,
          songs: 0,
        },
      };

      console.log('[ArtistsView] Setting enriched artist:', enrichedArtist.name);
      selectedArtist.set(enrichedArtist);
    } catch (err) {
      console.error('[ArtistsView] Failed to refresh artist data:', err);
    } finally {
      isRefreshingArtist = false;
    }
  }

  // Determine if we should show the detail view
  // Only show if selectedArtist has actual data (name), not just a slug placeholder
  $: shouldShowDetail = $selectedArtist && $selectedArtist.name;

  // Debug logging
  $: console.log('[ArtistsView] Render state:', {
    hasSelectedArtist: !!$selectedArtist,
    artistName: $selectedArtist?.name,
    artistSlug: $selectedArtist?.slug,
    hasAlbums: $selectedArtist?.albums?.length || 0,
    shouldShowDetail,
    isRefreshingArtist
  });

  function handleSelect(event) {
    const artist = event.detail;
    if (!artist) {
      return;
    }
    const match = $artists.find((item) => item.slug === artist.slug) || artist;
    selectedArtist.set(match);

    // Update URL to reflect the selected artist
    if (match.slug) {
      navigateTo(`/artists/${match.slug}`);
    }
  }

  function handleBack() {
    selectedArtist.set(null);
    navigateTo("/artists");
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

{#if shouldShowDetail}
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
