const API_BASE = "/api";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
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

  const response = await fetch(API_BASE + path, requestInit);
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

  const tracks =
    Array.isArray(raw.tracks) && raw.tracks.length
      ? raw.tracks
      : Array.isArray(raw.trackList)
      ? raw.trackList
      : [];

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

  return {
    ...raw,
    id:
      raw.id ??
      raw.albumId ??
      raw._id ??
      raw.slug ??
      (raw.artist && raw.title ? `${raw.artist}-${raw.title}` : raw.title ?? raw.artist ?? null),
    artist: raw.artist ?? raw.album?.artist ?? "",
    title: raw.title ?? raw.album?.title ?? "",
    releaseYear,
    rating,
    tracks,
    genres,
  };
}

export async function signup(payload) {
  const headers = jsonHeaders({ includeContentType: true });
  await request("/signup", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

export async function login(credentials) {
  const headers = jsonHeaders({ includeContentType: true });
  const data = await request("/login", {
    method: "POST",
    headers,
    body: JSON.stringify(credentials),
  });
  return data;
}

export async function fetchContent(token) {
  const headers = jsonHeaders({ token });
  return await request("/me/content", {
    method: "GET",
    headers,
  });
}

export async function updateContent(token, content) {
  const headers = jsonHeaders({ token, includeContentType: true });
  await request("/me/content", {
    method: "PUT",
    headers,
    body: JSON.stringify({ content }),
  });
}

export async function fetchAlbum(id, { token } = {}) {
  const query = id ? `?id=${encodeURIComponent(id)}` : "";
  const headers = token ? jsonHeaders({ token }) : undefined;
  const data = await request(`/album${query}`, {
    method: "GET",
    headers,
  });

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
  const data = await request("/albums", {
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
