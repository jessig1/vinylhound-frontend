import sampleAlbumsData from "./sampleAlbums.json";
import { normalizeAlbum } from "./api";

function sanitize(value = "") {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const sampleAlbums = sampleAlbumsData.map((album) => normalizeAlbum(album) || album);

const sampleAlbumLookup = new Map();

for (const album of sampleAlbums) {
  if (!album) {
    continue;
  }
  const keys = new Set();
  const id = album.id ?? album._id ?? null;
  if (id) {
    keys.add(id);
    keys.add(sanitize(id));
  }
  const slug = album.slug ?? sanitize(`${album.artist ?? ""}-${album.title ?? ""}`);
  if (slug) {
    keys.add(slug);
    keys.add(sanitize(slug));
  }
  if (album.title) {
    keys.add(album.title);
    keys.add(sanitize(album.title));
  }
  if (album.artist && album.title) {
    const combo = `${album.artist}-${album.title}`;
    keys.add(combo);
    keys.add(sanitize(combo));
  }
  for (const key of keys) {
    if (key) {
      sampleAlbumLookup.set(key, album);
    }
  }
}

export function findSampleAlbum(identifier) {
  if (!identifier) {
    return sampleAlbums[0] || null;
  }
  const direct = sampleAlbumLookup.get(identifier);
  if (direct) {
    return direct;
  }
  const normalized = sanitize(identifier);
  return sampleAlbumLookup.get(normalized) || null;
}
