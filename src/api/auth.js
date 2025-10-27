/**
 * Authentication API
 * User signup and login endpoints
 */

import { post } from "./client.js";

/**
 * Sign up a new user
 * @param {Object} credentials - User credentials
 * @param {string} credentials.username - Username
 * @param {string} credentials.password - Password
 * @param {Array<string>} [credentials.content] - Initial user content
 * @returns {Promise<Object>} Signup response
 */
export async function signup({ username, password, content }) {
  const payload = { username, password };
  if (content && Array.isArray(content)) {
    payload.content = content;
  }

  return post("/v1/auth/signup", payload);
}

/**
 * Log in an existing user
 * @param {Object} credentials - User credentials
 * @param {string} credentials.username - Username
 * @param {string} credentials.password - Password
 * @returns {Promise<Object>} Login response with token
 */
export async function login({ username, password }) {
  return post("/v1/auth/login", { username, password });
}
