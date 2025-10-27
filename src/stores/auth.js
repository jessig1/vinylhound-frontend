import { writable, derived } from "svelte/store";
import { readSession, writeSession, clearSession } from "../lib/session";

// Core auth state
export const token = writable("");
export const activeUser = writable("");

// Derived state
export const isAuthenticated = derived(
  [token, activeUser],
  ([$token, $activeUser]) => Boolean($token && $activeUser)
);

// Auth actions
export function login(newToken, username) {
  token.set(newToken);
  activeUser.set(username);
  writeSession({ token: newToken, username });
}

export function logout() {
  token.set("");
  activeUser.set("");
  clearSession();
}

export function loadSession() {
  const stored = readSession();
  if (stored) {
    token.set(stored.token);
    activeUser.set(stored.username);
    return true;
  }
  return false;
}
