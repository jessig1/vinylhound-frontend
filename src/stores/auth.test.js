import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { token, activeUser, isAuthenticated, login, logout, loadSession } from './auth';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

global.window = { localStorage: localStorageMock };

describe('Auth Store', () => {
  beforeEach(() => {
    localStorageMock.clear();
    token.set('');
    activeUser.set('');
  });

  it('should initialize with empty values', () => {
    expect(get(token)).toBe('');
    expect(get(activeUser)).toBe('');
    expect(get(isAuthenticated)).toBe(false);
  });

  it('should login and set token and user', () => {
    login('test-token-123', 'testuser');

    expect(get(token)).toBe('test-token-123');
    expect(get(activeUser)).toBe('testuser');
    expect(get(isAuthenticated)).toBe(true);
  });

  it('should persist session to localStorage on login', () => {
    login('test-token-123', 'testuser');

    expect(localStorageMock.getItem('vinyhound:token')).toBe('test-token-123');
    expect(localStorageMock.getItem('vinyhound:user')).toBe('testuser');
  });

  it('should logout and clear values', () => {
    login('test-token-123', 'testuser');
    logout();

    expect(get(token)).toBe('');
    expect(get(activeUser)).toBe('');
    expect(get(isAuthenticated)).toBe(false);
  });

  it('should clear localStorage on logout', () => {
    login('test-token-123', 'testuser');
    logout();

    expect(localStorageMock.getItem('vinyhound:token')).toBeNull();
    expect(localStorageMock.getItem('vinyhound:user')).toBeNull();
  });

  it('should load session from localStorage', () => {
    localStorageMock.setItem('vinyhound:token', 'stored-token');
    localStorageMock.setItem('vinyhound:user', 'storeduser');

    const loaded = loadSession();

    expect(loaded).toBe(true);
    expect(get(token)).toBe('stored-token');
    expect(get(activeUser)).toBe('storeduser');
    expect(get(isAuthenticated)).toBe(true);
  });

  it('should return false when no session exists', () => {
    const loaded = loadSession();

    expect(loaded).toBe(false);
    expect(get(token)).toBe('');
    expect(get(activeUser)).toBe('');
  });

  it('should derive isAuthenticated correctly', () => {
    expect(get(isAuthenticated)).toBe(false);

    token.set('some-token');
    expect(get(isAuthenticated)).toBe(false); // Still false, no user

    activeUser.set('testuser');
    expect(get(isAuthenticated)).toBe(true); // Both set

    token.set('');
    expect(get(isAuthenticated)).toBe(false); // Token cleared
  });
});
