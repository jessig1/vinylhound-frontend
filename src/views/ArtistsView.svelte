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
    // If we have a fully loaded artist with external_id, make sure it's in the artists list
    else if ($selectedArtist && $selectedArtist.external_id && $selectedArtist.albums && $selectedArtist.albums.length > 0) {
      console.log('[ArtistsView] Artist has full data, ensuring it\'s in the artists list:', $selectedArtist.name);

      // Check if artist is already in the list
      const existsInList = $artists.some(a => a.slug === $selectedArtist.slug);

      if (!existsInList) {
        console.log('[ArtistsView] Artist not in list, adding:', $selectedArtist.name);
        artists.update(currentArtists => {
          return [...currentArtists, $selectedArtist];
        });
      } else {
        console.log('[ArtistsView] Artist already in list:', $selectedArtist.name);
      }
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

      // Add this artist to the artists list if not already present
      artists.update(currentArtists => {
        const existingIndex = currentArtists.findIndex(a => a.slug === slug);
        if (existingIndex >= 0) {
          // Update existing artist with full data
          console.log('[ArtistsView] Updating existing artist in list:', enrichedArtist.name);
          const updated = [...currentArtists];
          updated[existingIndex] = enrichedArtist;
          return updated;
        } else {
          // Add new artist to the list
          console.log('[ArtistsView] Adding new artist to list:', enrichedArtist.name);
          return [...currentArtists, enrichedArtist];
        }
      });
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

  async function handleSelect(event) {
    const artist = event.detail;
    if (!artist) {
      return;
    }
    const match = $artists.find((item) => item.slug === artist.slug) || artist;

    // Set the artist immediately to show the UI
    selectedArtist.set(match);

    // Update URL to reflect the selected artist
    if (match.slug) {
      navigateTo(`/artists/${match.slug}`);
    }

    // If this artist doesn't have full data (no external_id), try to fetch it from Spotify
    if (!match.external_id && match.name) {
      console.log('[ArtistsView] Artist from collection lacks external_id, searching Spotify for:', match.name);
      try {
        // Search Spotify for this artist by name
        const { searchArtists } = await import("../api/search.js");
        const results = await searchArtists(match.name, 1);

        if (results && results.length > 0) {
          const spotifyArtist = results[0];
          console.log('[ArtistsView] Found Spotify match:', spotifyArtist.name, 'ID:', spotifyArtist.id);

          // Fetch full artist details with albums
          await refreshArtistData(spotifyArtist.id, match.slug);
        } else {
          console.log('[ArtistsView] No Spotify match found for:', match.name);
        }
      } catch (err) {
        console.error('[ArtistsView] Failed to fetch Spotify artist data:', err);
      }
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
