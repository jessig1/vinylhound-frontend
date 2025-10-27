const defaultTitlePrefix = "Track";

export function discoverTrackList(record) {
  if (!record || typeof record !== "object") {
    return [];
  }
  const candidates = [
    record.tracks,
    record.trackList,
    record.tracklist,
    record.track_list,
    record.songs,
    record.songList,
    record.song_list,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length) {
      return candidate;
    }
  }
  return Array.isArray(record.tracks) ? record.tracks : [];
}

export function discoverGenres(record) {
  if (!record || typeof record !== "object") {
    return [];
  }
  if (Array.isArray(record.genres) && record.genres.length) {
    return record.genres;
  }
  if (Array.isArray(record.genreList) && record.genreList.length) {
    return record.genreList;
  }
  const singular =
    record.genre ??
    record.primaryGenre ??
    (Array.isArray(record.genreTags) && record.genreTags.length ? record.genreTags : null);
  if (typeof singular === "string" && singular.trim()) {
    return [singular.trim()];
  }
  if (Array.isArray(singular)) {
    return singular;
  }
  return [];
}

export function coverAltTextForAlbum(album) {
  const title = album?.title || "this album";
  const artist = album?.artist || "unknown artist";
  return `Cover art for ${title} by ${artist}`;
}

export function trackTitleForEntry(track, index = 0) {
  if (!track) {
    return `${defaultTitlePrefix} ${index + 1}`;
  }
  if (typeof track === "string") {
    const trimmed = track.trim();
    return trimmed || `${defaultTitlePrefix} ${index + 1}`;
  }
  if (typeof track === "object") {
    const title =
      (typeof track.title === "string" && track.title.trim()) ||
      (typeof track.name === "string" && track.name.trim());
    return title || `${defaultTitlePrefix} ${index + 1}`;
  }
  return `${defaultTitlePrefix} ${index + 1}`;
}

export function trackLengthForEntry(track) {
  if (!track || typeof track !== "object") {
    return null;
  }
  const labelCandidates = [
    track.lengthLabel,
    track.length,
    track.duration,
    track.durationLabel,
    track.formattedDuration,
  ];
  for (const entry of labelCandidates) {
    if (typeof entry === "string" && entry.trim()) {
      return entry.trim();
    }
  }
  const numericCandidates = [
    track.lengthSeconds,
    track.length_seconds,
    track.durationSeconds,
    track.duration_seconds,
    track.seconds,
  ];
  for (const candidate of numericCandidates) {
    const numeric = Number(candidate);
    if (Number.isFinite(numeric) && numeric >= 0) {
      const minutes = Math.floor(numeric / 60);
      const seconds = Math.floor(numeric % 60)
        .toString()
        .padStart(2, "0");
      return `${minutes}:${seconds}`;
    }
  }
  return null;
}

export function normalizeAlbumRating(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  if (numeric < 1 || numeric > 5) {
    return null;
  }
  return Math.round(numeric);
}
