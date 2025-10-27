import { http, HttpResponse } from 'msw';
import sampleAlbums from '../lib/sampleAlbums.json';

// In-memory storage for mock data
const mockUserAlbums = new Map();

export const handlers = [
  // Get all albums
  http.get('/api/v1/albums', () => {
    return HttpResponse.json(sampleAlbums);
  }),

  // Get single album
  http.get('/api/v1/albums/:id', ({ params }) => {
    const { id } = params;
    const album = sampleAlbums.find((a) => a.id === id);
    if (!album) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(album);
  }),

  // Get user album preferences
  http.get('/api/v1/me/albums', () => {
    const preferences = Array.from(mockUserAlbums.entries()).map(([albumId, pref]) => ({
      albumId,
      ...pref,
    }));
    return HttpResponse.json(preferences);
  }),

  // Update album preference
  http.put('/api/v1/me/albums/:id/preference', async ({ params, request }) => {
    const { id } = params;
    const body = await request.json();

    const existing = mockUserAlbums.get(id) || {};
    const updated = {
      ...existing,
      favorite: body.favorite ?? existing.favorite ?? false,
      rating: body.rating ?? existing.rating ?? null,
    };

    mockUserAlbums.set(id, updated);
    return HttpResponse.json(updated);
  }),

  // Delete album preference
  http.delete('/api/v1/me/albums/:id/preference', ({ params }) => {
    const { id } = params;
    mockUserAlbums.delete(id);
    return new HttpResponse(null, { status: 204 });
  }),
];
