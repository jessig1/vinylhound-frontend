import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";
import sampleAlbums from "./src/lib/sampleAlbums.json" assert { type: "json" };

const useMockAlbums = process.env.MOCK_ALBUMS === "true";
const keepApiPrefix = process.env.KEEP_API_PREFIX !== "false";
const mockUserAlbums = new Map();

function findSampleAlbum(id) {
  if (!id) {
    return sampleAlbums[0] || null;
  }
  return sampleAlbums.find((album) => album.id === id) || null;
}

function ensureUserAlbum(albumId) {
  if (!mockUserAlbums.has(albumId)) {
    const album = findSampleAlbum(albumId) || { id: albumId };
    mockUserAlbums.set(albumId, {
      albumId,
      favorited: false,
      rating: null,
      album,
    });
  }
  return mockUserAlbums.get(albumId);
}

function cleanupUserAlbum(albumId) {
  const entry = mockUserAlbums.get(albumId);
  if (!entry) {
    return;
  }
  if (!entry.favorited && (entry.rating === null || entry.rating === undefined)) {
    mockUserAlbums.delete(albumId);
  }
}

function serializeUserAlbums() {
  return Array.from(mockUserAlbums.values()).map((entry) => ({
    album: entry.album,
    favorited: Boolean(entry.favorited),
    rating: entry.rating,
  }));
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      if (!chunks.length) {
        resolve(null);
        return;
      }
      try {
        const text = Buffer.concat(chunks).toString("utf-8");
        resolve(text ? JSON.parse(text) : null);
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function handleMockAlbums(req, res) {
  if (!useMockAlbums) {
    return false;
  }

  const method = (req.method || "GET").toUpperCase();
  if (method !== "GET") {
    return false;
  }

  const originalUrl = req.url || "";
  if (!originalUrl.startsWith("/api/album")) {
    return false;
  }

  const url = new URL(originalUrl, "http://localhost");
  const { pathname, searchParams } = url;

  res.setHeader("Content-Type", "application/json");

  if (pathname === "/api/albums") {
    res.statusCode = 200;
    res.end(JSON.stringify(sampleAlbums));
    return true;
  }

  if (pathname === "/api/album") {
    const albumId = searchParams.get("id");
    const album = findSampleAlbum(albumId);
    if (album) {
      res.statusCode = 200;
      res.end(JSON.stringify(album));
    } else {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: "Album not found." }));
    }
    return true;
  }

  if (pathname.startsWith("/api/albums/")) {
    const albumId = pathname.replace("/api/albums/", "");
    const album = findSampleAlbum(decodeURIComponent(albumId));
    if (album) {
      res.statusCode = 200;
      res.end(JSON.stringify(album));
    } else {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: "Album not found." }));
    }
    return true;
  }

  return false;
}

export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
        rewrite: path => (keepApiPrefix ? path : path.replace(/^\/api/, "")),
        bypass(req, res) {
          const served = handleMockAlbums(req, res);
          if (served) {
            return false;
          }
          return;
        }
      }
    },
    configureServer(server) {
      if (!useMockAlbums) {
        return;
      }

      server.middlewares.use((req, res, next) => {
        const url = req.url || "";
        if (!url.startsWith("/api/me/albums")) {
          return next();
        }

        const method = (req.method || "GET").toUpperCase();
        const parsedUrl = new URL(url, "http://localhost");
        const pathname = parsedUrl.pathname;
        res.setHeader("Content-Type", "application/json");

        const send = (status, payload = null) => {
          res.statusCode = status;
          if (payload === null) {
            res.end();
          } else {
            res.end(JSON.stringify(payload));
          }
        };

        if (method === "GET" && pathname === "/api/me/albums/preferences") {
          send(200, { preferences: serializeUserAlbums() });
          return;
        }

        const preferenceMatch = pathname.match(/^\/api\/me\/albums\/([^/]+)\/preference$/);
        if (preferenceMatch) {
          const albumId = decodeURIComponent(preferenceMatch[1] || "");
          if (!albumId) {
            send(400, { error: "Album identifier is required." });
            return;
          }

          if (method === "PUT") {
            readRequestBody(req)
              .then((body) => {
                const payload = body && typeof body === "object" ? body : {};
                const entry = ensureUserAlbum(albumId);
                const hasRating = Object.prototype.hasOwnProperty.call(payload, "rating");
                const ratingValue = hasRating ? payload.rating : entry.rating;
                let nextRating = null;
                if (ratingValue === null || ratingValue === undefined) {
                  nextRating = null;
                } else {
                  const numeric = Number(ratingValue);
                  if (!Number.isFinite(numeric) || numeric < 1 || numeric > 5) {
                    send(400, { error: "Rating must be between 1 and 5." });
                    return;
                  }
                  nextRating = numeric;
                }

                const hasFavorited = Object.prototype.hasOwnProperty.call(payload, "favorited");
                const nextFavorited = hasFavorited
                  ? Boolean(payload.favorited)
                  : Boolean(entry.favorited);

                entry.album = entry.album || findSampleAlbum(albumId) || { id: albumId };
                entry.rating = nextRating;
                entry.favorited = nextFavorited;
                cleanupUserAlbum(albumId);
                send(204, null);
              })
              .catch((err) => {
                send(400, { error: err?.message || "Invalid request body." });
              });
            return;
          }

          if (method === "DELETE") {
            mockUserAlbums.delete(albumId);
            send(204, null);
            return;
          }

          send(405, { error: "Method not allowed." });
          return;
        }

        next();
      });
    }
  }
});
