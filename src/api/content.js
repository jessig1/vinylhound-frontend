/**
 * User Content API
 * Endpoints for user-generated content
 */

import { get, put, authHeaders } from "./client.js";

/**
 * Fetch user's content
 * @param {string} token - Auth token
 * @returns {Promise<Array<string>>} Array of content lines
 */
export async function fetchContent(token) {
  const headers = authHeaders(token);
  return get("/v1/users/profile", { headers });
}

/**
 * Update user's content
 * @param {string} token - Auth token
 * @param {Array<string>} content - Content lines
 * @returns {Promise<void>}
 */
export async function updateContent(token, content) {
  const headers = authHeaders(token);
  return put("/v1/users/profile", { content }, { headers });
}
