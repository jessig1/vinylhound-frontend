import { writable } from "svelte/store";

// View/routing state
export const currentView = writable("profile");
export const previousView = writable("news");
export const sidebarOpen = writable(false);

// Loading and messages
export const loading = writable(false);
export const message = writable("");
export const messageKind = writable("info");

// UI actions
export function setMessage(value = "", kind = "info") {
  message.set(value);
  messageKind.set(kind);
}

export function clearMessage() {
  message.set("");
  messageKind.set("info");
}

export function toggleSidebar() {
  sidebarOpen.update((open) => !open);
}

export function closeSidebar() {
  sidebarOpen.set(false);
}

export function navigate(view) {
  currentView.update((current) => {
    previousView.set(current);
    return view;
  });
  closeSidebar();
}
