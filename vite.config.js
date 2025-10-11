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
      favorite: false,
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
  if (!entry.favorite && (entry.rating === null || entry.rating === undefined)) {
    mockUserAlbums.delete(albumId);
  }
}

function serializeUserAlbums() {
  return Array.from(mockUserAlbums.values()).map((entry) => ({
    albumId: entry.albumId,
    favorite: entry.favorite,
    rating: entry.rating,
    album: entry.album,
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
  const { pathname } = url;

  res.setHeader("Content-Type", "application/json");

  if (pathname === "/api/albums") {
    res.statusCode = 200;
    res.end(JSON.stringify(sampleAlbums));
    return true;
  }

  if (pathname === "/api/album") {
    const album = findSampleAlbum();
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

        if (method === "GET" && pathname === "/api/me/albums") {
          send(200, serializeUserAlbums());
          return;
        }

        if (method === "PUT" && pathname.endsWith("/favorite")) {
          readRequestBody(req)
            .then((body) => {
              const albumId = pathname.replace("/api/me/albums/", "").replace("/favorite", "");
              if (!albumId) {
                send(400, { error: "Album identifier is required." });
                return;
              }
              const favorite = Boolean(body?.favorite);
              const entry = ensureUserAlbum(albumId);
              entry.favorite = favorite;
              cleanupUserAlbum(albumId);
              send(200, entry);
            })
            .catch((err) => {
              send(400, { error: err?.message || "Invalid request body." });
            });
          return;
        }

        if (method === "PUT" && pathname.endsWith("/rating")) {
          readRequestBody(req)
            .then((body) => {
              const albumId = pathname.replace("/api/me/albums/", "").replace("/rating", "");
              if (!albumId) {
                send(400, { error: "Album identifier is required." });
                return;
              }
              const ratingValue = Number(body?.rating);
              if (!Number.isFinite(ratingValue) || ratingValue < 1 || ratingValue > 5) {
                send(400, { error: "Rating must be between 1 and 5." });
                return;
              }
              const entry = ensureUserAlbum(albumId);
              entry.rating = ratingValue;
              send(200, entry);
            })
            .catch((err) => {
              send(400, { error: err?.message || "Invalid request body." });
            });
          return;
        }

        if (method === "DELETE" && pathname.endsWith("/rating")) {
          const albumId = pathname.replace("/api/me/albums/", "").replace("/rating", "");
          if (!albumId) {
            send(400, { error: "Album identifier is required." });
            return;
          }
          ensureUserAlbum(albumId).rating = null;
          cleanupUserAlbum(albumId);
          send(204, null);
          return;
        }

        if (method === "GET" && pathname.startsWith("/api/me/albums/")) {
          const albumId = pathname.replace("/api/me/albums/", "");
          const entry = ensureUserAlbum(albumId);
          send(200, entry);
          return;
        }

        next();
      });
    }
  }
});
