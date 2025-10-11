import sampleAlbumsData from "./sampleAlbums.json";

export const sampleAlbums = sampleAlbumsData;

export function findSampleAlbum(id) {
  if (!id) {
    return sampleAlbums[0] || null;
  }
  return sampleAlbums.find((album) => album.id === id) || null;
}
