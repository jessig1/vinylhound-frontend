const rawApiBase = import.meta.env?.VITE_API_BASE_URL ?? "/api";

let API_BASE_ORIGIN = "";
let API_BASE_PATH = "/api";

if (typeof rawApiBase === "string" && rawApiBase.trim()) {
  const trimmed = rawApiBase.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      API_BASE_ORIGIN = `${parsed.protocol}//${parsed.host}`;
      API_BASE_PATH = parsed.pathname || "/";
    } catch (err) {
      console.warn("Invalid VITE_API_BASE_URL, falling back to /api:", err);
      API_BASE_PATH = "/api";
      API_BASE_ORIGIN = "";
    }
  } else {
    API_BASE_PATH = trimmed;
  }
}

if (!API_BASE_PATH.startsWith("/")) {
  API_BASE_PATH = `/${API_BASE_PATH}`;
}
if (API_BASE_PATH !== "/" && API_BASE_PATH.endsWith("/")) {
  API_BASE_PATH = API_BASE_PATH.replace(/\/+$/, "");
}
if (API_BASE_PATH === "/") {
  API_BASE_PATH = "";
}

function parseDurationValue(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number") {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? Math.round(numeric) : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const colonMatch = trimmed.match(/^(\d+):([0-5]?\d)(?::([0-5]?\d))?$/);
    if (colonMatch) {
      const hasHours = colonMatch[3] !== undefined;
      const hours = hasHours ? Number(colonMatch[1]) : 0;
      const minutes = Number(hasHours ? colonMatch[2] : colonMatch[1]);
      const seconds = Number(hasHours ? colonMatch[3] : colonMatch[2]);
      const totalSeconds = hours * 3600 + minutes * 60 + seconds;
      return Number.isFinite(totalSeconds) && totalSeconds >= 0 ? totalSeconds : null;
    }
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) && numeric >= 0 ? Math.round(numeric) : null;
  }
  return null;
}

function normalizeTrackEntry(entry, index) {
  const fallbackTitle = `Track ${index + 1}`;
  if (entry === null || entry === undefined) {
    return null;
  }
  if (typeof entry === "string") {
    const title = entry.trim() || fallbackTitle;
    return {
      id: `track-${index}`,
      title,
      lengthSeconds: null,
      lengthLabel: null,
    };
  }
  if (typeof entry === "object") {
    const title =
      (typeof entry.title === "string" && entry.title.trim()) ||
      (typeof entry.name === "string" && entry.name.trim()) ||
      fallbackTitle;
    const lengthLabelCandidate =
      (typeof entry.length === "string" && entry.length.trim()) ||
      (typeof entry.durationFormatted === "string" && entry.durationFormatted.trim()) ||
      (typeof entry.formattedDuration === "string" && entry.formattedDuration.trim()) ||
      null;
    const lengthSeconds =
      parseDurationValue(entry.lengthSeconds) ??
      parseDurationValue(entry.length_seconds) ??
      parseDurationValue(entry.durationSeconds) ??
      parseDurationValue(entry.duration_seconds) ??
      parseDurationValue(entry.duration) ??
      null;
    return {
      id: entry.id ?? entry.trackId ?? entry.track_id ?? `track-${index}`,
      title,
      lengthSeconds,
      lengthLabel: lengthLabelCandidate,
    };
  }
  return null;
}

function normalizeTrackList(list) {
  if (!Array.isArray(list)) {
    return [];
  }
  const normalized = [];
  for (let i = 0; i < list.length; i += 1) {
    const entry = normalizeTrackEntry(list[i], i);
    if (entry) {
      normalized.push(entry);
    }
  }
  return normalized;
}

function normalizeArtistList(input) {
  if (!input) {
    return [];
  }
  const source = Array.isArray(input) ? input : [input];
  return source
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }
      if (item && typeof item === "object") {
        return (
          (typeof item.name === "string" && item.name.trim()) ||
          (typeof item.fullName === "string" && item.fullName.trim()) ||
          [item.firstName, item.lastName].filter(Boolean).join(" ").trim()
        );
      }
      return null;
    })
    .filter((value) => typeof value === "string" && value);
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function buildRequestUrl(path) {
  if (typeof path === "string" && /^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = `/${String(path || "").replace(/^\/+/, "")}`;

  const versionPrefix = "/v1";
  let relativePath = normalizedPath;

  if (API_BASE_PATH && API_BASE_PATH.endsWith(versionPrefix) && normalizedPath.startsWith(`${versionPrefix}/`)) {
    relativePath = normalizedPath.slice(versionPrefix.length);
    if (!relativePath.startsWith("/")) {
      relativePath = `/${relativePath}`;
    }
  }

  let fullPath = relativePath;

  if (API_BASE_PATH) {
    const alreadyPrefixed =
      relativePath === API_BASE_PATH || relativePath.startsWith(`${API_BASE_PATH}/`);
    if (!alreadyPrefixed) {
      fullPath = `${API_BASE_PATH}${relativePath}`;
    } else {
      fullPath = relativePath;
    }
  }

  fullPath = fullPath.replace(/\/{2,}/g, "/");

  if (API_BASE_ORIGIN) {
    return `${API_BASE_ORIGIN}${fullPath}`;
  }
  return fullPath;
}

async function request(path, options = {}) {
  const { headers, body, ...restOptions } = options;
  const requestInit = {
    ...restOptions,
    headers,
  };

  if (body !== undefined) {
    requestInit.body = body;
  }

  const requestUrl = buildRequestUrl(path);
  const response = await fetch(requestUrl, requestInit);
  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch (err) {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? data.error
        : typeof data === "string" && data
        ? data
        : response.statusText;
    throw new ApiError(message, response.status);
  }

  return data;
}

async function requestWithFallback(paths, options = {}) {
  const candidates = Array.isArray(paths) ? paths : [paths];
  let lastError = null;

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    try {
      return await request(candidate, options);
    } catch (err) {
      const isLast = index === candidates.length - 1;
      if (err instanceof ApiError && err.status === 404 && !isLast) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  if (lastError) {
    throw lastError;
  }
  throw new Error("No request candidates were provided.");
}

function jsonHeaders(options = {}) {
  const headers = new Headers();
  if (options.includeContentType) {
    headers.set("Content-Type", "application/json");
  }
  if (options.token) {
    headers.set("Authorization", "Bearer " + options.token);
  }
  return headers;
}

function normalizeAlbum(raw) {
  if (!raw || typeof raw !== "object") {
    return raw;
  }

  const rawTracks =
    Array.isArray(raw.tracks) && raw.tracks.length
      ? raw.tracks
      : Array.isArray(raw.trackList)
      ? raw.trackList
      : [];
  const tracks = normalizeTrackList(rawTracks);

  const genres =
    Array.isArray(raw.genres) && raw.genres.length
      ? raw.genres
      : Array.isArray(raw.genreList)
      ? raw.genreList
      : [];

  const releaseYear = raw.releaseYear ?? raw.year ?? raw.release_date ?? raw.releaseDate ?? null;
  const rating =
    raw.rating !== undefined && raw.rating !== null
      ? raw.rating
      : raw.averageRating !== undefined
      ? raw.averageRating
      : null;

  const cover =
    raw.coverUrl ??
    raw.cover_url ??
    raw.cover ??
    raw.image ??
    raw.artwork ??
    raw.artworkUrl ??
    raw.thumbnail ??
    null;

  const artists = normalizeArtistList(raw.artists);

  return {
    ...raw,
    id:
      raw.id ??
      raw.albumId ??
      raw._id ??
      raw.slug ??
      (raw.artist && raw.title ? `${raw.artist}-${raw.title}` : raw.title ?? raw.artist ?? null),
    cover,
    coverUrl: cover,
    artwork: cover ?? raw.artwork ?? raw.artworkUrl ?? null,
    image: cover ?? raw.image ?? null,
    artist: raw.artist ?? raw.album?.artist ?? "",
    artists,
    title: raw.title ?? raw.album?.title ?? "",
    releaseYear,
    rating,
    tracks,
    genres,
  };
}

export { normalizeAlbum };

export async function signup(payload) {
  const headers = jsonHeaders({ includeContentType: true });
  await requestWithFallback(["/v1/auth/signup", "/signup"], {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

export async function login(credentials) {
  const headers = jsonHeaders({ includeContentType: true });
  const data = await requestWithFallback(["/v1/auth/login", "/login"], {
    method: "POST",
    headers,
    body: JSON.stringify(credentials),
  });
  return data;
}

export async function fetchContent(token) {
  const headers = jsonHeaders({ token });
  const response = await requestWithFallback(
    ["/v1/users/content", "/me/content"],
    {
      method: "GET",
      headers,
    }
  );
  if (Array.isArray(response)) {
    return response;
  }
  if (response && typeof response === "object" && Array.isArray(response.content)) {
    return response.content;
  }
  return [];
}

export async function updateContent(token, content) {
  const headers = jsonHeaders({ token, includeContentType: true });
  await requestWithFallback(["/v1/users/content", "/me/content"], {
    method: "PUT",
    headers,
    body: JSON.stringify({ content }),
  });
}

export async function fetchAlbum(id, { token } = {}) {
  const headers = token ? jsonHeaders({ token }) : undefined;
  if (!id) {
    const albums = await fetchAlbums({ token });
    return Array.isArray(albums) && albums.length ? albums[0] : null;
  }

  const encodedId = encodeURIComponent(id);
  const data = await requestWithFallback(
    [`/v1/albums/${encodedId}`, `/album?id=${encodedId}`],
    {
      method: "GET",
      headers,
    }
  );

  if (data && typeof data === "object") {
    if ("album" in data && data.album) {
      return normalizeAlbum(data.album);
    }
    return normalizeAlbum(data);
  }

  return data;
}

export async function fetchAlbums({ token } = {}) {
  const headers = token ? jsonHeaders({ token }) : undefined;
  const data = await requestWithFallback(["/v1/albums", "/albums"], {
    method: "GET",
    headers,
  });

  if (Array.isArray(data)) {
    return data.map(normalizeAlbum);
  }

  if (data && typeof data === "object" && Array.isArray(data.albums)) {
    return data.albums.map(normalizeAlbum);
  }

  return [];
}

export async function fetchUserAlbums(token) {
  if (!token) {
    throw new Error("Authentication required to load user albums.");
  }
  const headers = jsonHeaders({ token });
  try {
    const data = await request("/me/albums/preferences", {
      method: "GET",
      headers,
    });
    if (data && typeof data === "object" && Array.isArray(data.preferences)) {
      return data.preferences;
    }
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return [];
    }
    throw err;
  }
}

async function updateAlbumPreference({ token, albumId, rating, favorited }) {
  if (!token) {
    throw new Error("Authentication required to update preferences.");
  }
  if (!albumId) {
    throw new Error("Album identifier is required.");
  }
  const normalizedFavorite =
    favorited !== undefined ? Boolean(favorited) : false;
  let normalizedRating = null;
  if (rating === null || rating === undefined) {
    normalizedRating = null;
  } else {
    const numeric = Number(rating);
    normalizedRating = Number.isFinite(numeric) ? numeric : null;
  }

  const headers = jsonHeaders({ token, includeContentType: true });

  await request(`/me/albums/${encodeURIComponent(albumId)}/preference`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      rating: normalizedRating,
      favorited: normalizedFavorite,
    }),
  });

  return {
    rating: normalizedRating,
    favorited: normalizedFavorite,
  };
}

export async function favoriteAlbum({ token, albumId, favorite, rating }) {
  let ratingValue = null;
  if (rating !== null && rating !== undefined) {
    const numeric = Number(rating);
    ratingValue = Number.isFinite(numeric) ? numeric : null;
  }

  const result = await updateAlbumPreference({
    token,
    albumId,
    favorited: Boolean(favorite),
    rating: ratingValue,
  });
  return {
    supported: true,
    favorite: Boolean(result.favorited),
    favorited: Boolean(result.favorited),
    rating: result.rating,
  };
}

export async function rateAlbum({ token, albumId, rating, favorite = false }) {
  if (rating !== null && rating !== undefined) {
    const value = Number(rating);
    if (!Number.isFinite(value) || value < 1 || value > 5) {
      throw new Error("Rating must be a number between 1 and 5.");
    }
  }

  const result = await updateAlbumPreference({
    token,
    albumId,
    favorited: Boolean(favorite),
    rating: rating === null || rating === undefined ? null : Number(rating),
  });

  return {
    supported: true,
    rating: result.rating ?? null,
    favorited: Boolean(result.favorited),
  };
}

function normalizePlaylist(raw) {
  if (!raw || typeof raw !== "object") {
    return raw;
  }
  const songs = Array.isArray(raw.songs)
    ? raw.songs.map((song) => ({
        id: song.id ?? song.song_id ?? null,
        title: song.title ?? "",
        artist: song.artist ?? "",
        album: song.album ?? "",
        lengthSeconds:
          song.lengthSeconds ??
          song.length_seconds ??
          song.duration ??
          0,
        genre: song.genre ?? "",
      }))
    : [];

  return {
    ...raw,
    id: raw.id ?? raw.playlist_id ?? null,
    title: raw.title ?? "Untitled playlist",
    owner: raw.owner ?? "Unknown curator",
    createdAt: raw.created_at ?? raw.createdAt ?? null,
    songCount: raw.song_count ?? raw.songCount ?? songs.length,
    songs,
  };
}

export async function fetchPlaylists() {
  const data = await request("/v1/playlists", {
    method: "GET",
  });

  if (Array.isArray(data)) {
    return data.map(normalizePlaylist);
  }

  if (data && typeof data === "object" && Array.isArray(data.playlists)) {
    return data.playlists.map(normalizePlaylist);
  }

  return [];
}
