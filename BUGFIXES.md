# Bug Fixes - Phase 1 Refactoring

## Issues Fixed

### Issue 1: NewsFeed prop error
**Error:**
```
NewsFeed.svelte:64 <NewsFeed> was created with unknown prop '$content'
```

**Cause:** In [NewsView.svelte](src/views/NewsView.svelte), was passing `$content={$content}` instead of `content={$content}`

**Fix:** Changed to `content={$content}` (prop name should not have `$` prefix)

**File:** [src/views/NewsView.svelte](src/views/NewsView.svelte:7)

---

### Issue 2: albumInteractions undefined in handleAlbumRate
**Error:**
```
Uncaught (in promise) ReferenceError: albumInteractions is not defined
    at AlbumView.handleAlbumRate (App.svelte:782:5)
```

**Cause:**
1. Missing import of `albumInteractions` store from `./stores/albums`
2. Missing import of `get()` function from `svelte/store`
3. Using incorrect `.subscribe()()` pattern instead of `get()` to read store value

**Fix:**
1. Added `import { get } from "svelte/store"` to [App.svelte](src/App.svelte:3)
2. Added `albumInteractions` to imports from `./stores/albums` ([App.svelte](src/App.svelte:43))
3. Changed store access pattern in two functions:

**In `handleAlbumFavorite()` ([App.svelte](src/App.svelte:720-726)):**
```javascript
// Before (incorrect):
let currentRating = null;
albumInteractions.subscribe((interactions) => {
  const key = String(resolvedIdentifier);
  const entry = interactions[key];
  if (entry?.rating !== undefined && entry?.rating !== null) {
    currentRating = Number(entry.rating);
  }
})();

// After (correct):
const interactions = get(albumInteractions);
const key = String(resolvedIdentifier);
const entry = interactions[key];
const currentRating = entry?.rating !== undefined && entry?.rating !== null
  ? Number(entry.rating)
  : null;
```

**In `handleAlbumRate()` ([App.svelte](src/App.svelte:781-784)):**
```javascript
// Before (incorrect):
let currentFavorite = false;
albumInteractions.subscribe((interactions) => {
  const key = String(resolvedIdentifier);
  const entry = interactions[key];
  if (entry) {
    currentFavorite = Boolean(entry.favorite);
  }
})();

// After (correct):
const interactions = get(albumInteractions);
const key = String(resolvedIdentifier);
const entry = interactions[key];
const currentFavorite = entry ? Boolean(entry.favorite) : false;
```

---

## Why These Patterns Work

### Reading Store Values

**In Svelte templates:**
```svelte
{$storeName}  <!-- Automatic subscription -->
```

**In script (reactive):**
```javascript
$: derivedValue = $storeName + 1;  // Automatic subscription
```

**In event handlers (one-time read):**
```javascript
import { get } from 'svelte/store';

function handleClick() {
  const value = get(storeName);  // One-time read, no subscription
  console.log(value);
}
```

**When you need updates:**
```javascript
let value;
const unsubscribe = storeName.subscribe(v => value = v);
// Remember to call unsubscribe() when done!
```

### The `.subscribe()()` Anti-Pattern

**Don't do this:**
```javascript
storeName.subscribe(value => {
  // do something
})();  // ❌ Immediately calls unsubscribe function
```

This pattern:
1. Creates a subscription
2. Immediately calls the unsubscribe function
3. Doesn't actually keep the subscription active
4. Can cause memory leaks

**Instead use:**
```javascript
const value = get(storeName);  // ✅ Clean one-time read
```

---

## Testing

After fixes, verified:
- ✅ Build succeeds: `npm run build`
- ✅ No runtime errors in album rating functionality
- ✅ Store values correctly accessed in event handlers

---

## Related Files

- [src/App.svelte](src/App.svelte) - Main app component (fixed store access)
- [src/views/NewsView.svelte](src/views/NewsView.svelte) - News view (fixed prop name)
- [src/stores/albums.js](src/stores/albums.js) - Album store definitions

---

## Prevention

To avoid these issues in the future:

1. **Always import stores you use** - TypeScript would catch this
2. **Use `get()` for one-time reads** in event handlers
3. **Use `$store` syntax** only in templates and reactive statements
4. **Prop names never have `$`** - that's only for store access syntax
5. **Consider adding TypeScript** to catch these at compile time
