<script>
  import { createEventDispatcher } from "svelte";

  export let playlists = [];
  export let loading = false;
  export let error = "";
  export let username = "";
  export let selectedId = null;

  const dispatch = createEventDispatcher();

  function formatDate(value) {
    if (!value) {
      return "Unknown date";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Unknown date";
    }
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  }

  function formatDuration(seconds) {
    const total = Number(seconds);
    if (!Number.isFinite(total) || total <= 0) {
      return "0:00";
    }
    const minutes = Math.floor(total / 60);
    const remaining = Math.round(total % 60);
    return `${minutes}:${String(remaining).padStart(2, "0")}`;
  }

  function totalDuration(songs = []) {
    return songs.reduce((sum, song) => sum + (song?.lengthSeconds ?? 0), 0);
  }

  $: normalizedUsername = (username || "").trim().toLowerCase();
  function ownerLabel(owner) {
    if (!owner) {
      return "Unknown curator";
    }
    return normalizedUsername && owner.trim().toLowerCase() === normalizedUsername ? "You" : owner;
  }

  $: headerTitle = normalizedUsername ? "Your playlists" : "Playlists";
  $: headerSubtitle = normalizedUsername
    ? "Browse the mixes you've created and their track details."
    : "Browse curated mixes and their track details.";
  $: emptyMessage = normalizedUsername
    ? "You haven't created any playlists yet."
    : "No playlists available yet. Start curating your collection.";

  function selectPlaylist(playlist) {
    if (!playlist) {
      return;
    }
    dispatch("select", { id: playlist.id ?? null });
  }

  function handleCardKeydown(event, playlist) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectPlaylist(playlist);
    }
  }
</script>

<section class="playlists">
  <header class="playlists__header">
    <h2>{headerTitle}</h2>
    <p>{headerSubtitle}</p>
  </header>

  {#if loading}
    <div class="playlists__state">
      <p>Loading playlists…</p>
    </div>
  {:else if error}
    <div class="playlists__state playlists__state--error">
      <p>{error}</p>
    </div>
  {:else if !Array.isArray(playlists) || playlists.length === 0}
    <div class="playlists__state">
      <p>{emptyMessage}</p>
    </div>
  {:else}
    <div class="playlists__grid">
      {#each playlists as playlist (playlist.id ?? playlist.title)}
        <article
          class="playlist-card {selectedId != null && String(selectedId) === String(playlist.id) ? 'selected' : ''}"
          role="button"
          tabindex="0"
          on:click={() => selectPlaylist(playlist)}
          on:keydown={(event) => handleCardKeydown(event, playlist)}
        >
          <header class="playlist-card__header">
            <div>
              <h3>{playlist.title}</h3>
              <p class="playlist-card__meta">
                Created {formatDate(playlist.createdAt)} • {ownerLabel(playlist.owner)}
              </p>
            </div>
            <div class="playlist-card__stats">
              <span><strong>{playlist.songCount ?? playlist.songs?.length ?? 0}</strong> songs</span>
              <span><strong>{formatDuration(totalDuration(playlist.songs))}</strong> total time</span>
            </div>
          </header>

          {#if playlist.songs && playlist.songs.length}
            <div class="playlist-card__body">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Song</th>
                    <th scope="col">Artist</th>
                    <th scope="col">Album</th>
                    <th scope="col">Genre</th>
                    <th scope="col" class="numeric">Length</th>
                  </tr>
                </thead>
                <tbody>
                  {#each playlist.songs as song (song.id ?? `${song.title}-${song.artist}`)}
                    <tr>
                      <td data-label="Song">{song.title}</td>
                      <td data-label="Artist">{song.artist}</td>
                      <td data-label="Album">{song.album || "—"}</td>
                      <td data-label="Genre">{song.genre || "—"}</td>
                      <td data-label="Length" class="numeric">{formatDuration(song.lengthSeconds)}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {:else}
            <div class="playlist-card__empty">
              <p>No songs in this playlist yet.</p>
            </div>
          {/if}
        </article>
      {/each}
    </div>
  {/if}
</section>

<style>
  .playlists {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .playlists__header h2 {
    margin: 0;
    font-size: 1.85rem;
    color: #1f2937;
  }

  .playlists__header p {
    margin: 0.35rem 0 0;
    font-size: 1rem;
    color: rgba(55, 65, 81, 0.8);
  }

  .playlists__state {
    border-radius: 1.2rem;
    padding: 2rem;
    background: rgba(255, 255, 255, 0.76);
    box-shadow: 0 18px 40px rgba(79, 70, 229, 0.16);
    text-align: center;
    color: rgba(55, 65, 81, 0.85);
  }

  .playlists__state--error {
    color: #b91c1c;
    box-shadow: 0 18px 40px rgba(185, 28, 28, 0.18);
  }

  .playlists__grid {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .playlist-card {
    border-radius: 1.25rem;
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 20px 48px rgba(79, 70, 229, 0.18);
    padding: 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    border: 2px solid transparent;
    transition: box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
  }

  .playlist-card:hover,
  .playlist-card:focus-visible {
    box-shadow: 0 24px 56px rgba(79, 70, 229, 0.25);
    transform: translateY(-2px);
    outline: none;
  }

  .playlist-card.selected {
    border-color: rgba(79, 70, 229, 0.6);
    box-shadow: 0 26px 60px rgba(79, 70, 229, 0.28);
  }

  .playlist-card__header {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .playlist-card__header h3 {
    margin: 0;
    font-size: 1.4rem;
    color: #1f2937;
  }

  .playlist-card__meta {
    margin: 0.35rem 0 0;
    color: rgba(55, 65, 81, 0.75);
    font-size: 0.95rem;
  }

  .playlist-card__stats {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    color: rgba(55, 65, 81, 0.9);
    font-size: 0.95rem;
    text-align: right;
  }

  .playlist-card__stats strong {
    font-size: 1.05rem;
    color: #312e81;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    padding: 0.6rem 0.75rem;
    text-align: left;
    font-size: 0.95rem;
    color: #1f2937;
  }

  th {
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: 0.8rem;
    color: rgba(55, 65, 81, 0.75);
    border-bottom: 1px solid rgba(148, 163, 184, 0.25);
  }

  tbody tr:nth-child(even) {
    background: rgba(79, 70, 229, 0.04);
  }

  .numeric {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .playlist-card__empty {
    padding: 1.25rem;
    border-radius: 0.9rem;
    background: rgba(79, 70, 229, 0.08);
    color: rgba(55, 65, 81, 0.85);
    text-align: center;
  }

  @media (max-width: 720px) {
    .playlist-card__stats {
      flex-direction: row;
      justify-content: flex-start;
      gap: 1.25rem;
      text-align: left;
    }

    th {
      display: none;
    }

    table,
    tbody,
    tr,
    td {
      display: block;
      width: 100%;
    }

    tr {
      border-bottom: 1px solid rgba(148, 163, 184, 0.2);
      padding: 0.45rem 0;
    }

    td {
      padding: 0.2rem 0;
    }

    td::before {
      content: attr(data-label) ": ";
      font-weight: 600;
      color: rgba(55, 65, 81, 0.75);
    }

    .numeric {
      text-align: left;
    }
  }
</style>
