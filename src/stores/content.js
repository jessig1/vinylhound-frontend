import { writable } from "svelte/store";

export const content = writable([]);
export const contentDraft = writable("");

export function resetContent() {
  content.set([]);
  contentDraft.set("");
}
