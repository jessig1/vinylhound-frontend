import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildRoute } from './router';

describe('Router', () => {
  describe('buildRoute', () => {
    it('should build home route', () => {
      expect(buildRoute.home()).toBe('/');
    });

    it('should build profile route', () => {
      expect(buildRoute.profile()).toBe('/profile');
    });

    it('should build news route', () => {
      expect(buildRoute.news()).toBe('/news');
    });

    it('should build album route with ID', () => {
      expect(buildRoute.album('neon-reverie')).toBe('/album/neon-reverie');
      expect(buildRoute.album(123)).toBe('/album/123');
    });

    it('should build artists route', () => {
      expect(buildRoute.artists()).toBe('/artists');
    });

    it('should build artist detail route', () => {
      expect(buildRoute.artist('lina-harper')).toBe('/artists/lina-harper');
    });

    it('should build playlists route', () => {
      expect(buildRoute.playlists()).toBe('/playlists');
    });

    it('should build playlist detail route', () => {
      expect(buildRoute.playlist('sample-1')).toBe('/playlists/sample-1');
    });

    it('should encode special characters in IDs', () => {
      expect(buildRoute.album('artist name-album title')).toBe('/album/artist%20name-album%20title');
    });
  });
});
