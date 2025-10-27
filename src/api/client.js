/**
 * HTTP client with error handling
 * Base functionality for making API requests
 */

// API configuration
const rawApiBase = import.meta.env?.VITE_API_BASE_URL ?? "/api";
let API_BASE_ORIGIN = "";
let API_BASE_PATH = "/api";

if (typeof rawApiBase === "string" && rawApiBase.trim()) {
  const trimmed = rawApiBase.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      API_BASE_ORIGIN = `${parsed.protocol}//${parsed.host}`;
      API_BASE_PATH = parsed.pathname || "/";
    } catch (err) {
      console.warn("Invalid VITE_API_BASE_URL, falling back to /api:", err);
      API_BASE_PATH = "/api";
      API_BASE_ORIGIN = "";
    }
  } else {
    API_BASE_PATH = trimmed;
  }
}

if (!API_BASE_PATH.startsWith("/")) {
  API_BASE_PATH = `/${API_BASE_PATH}`;
}
if (API_BASE_PATH !== "/" && API_BASE_PATH.endsWith("/")) {
  API_BASE_PATH = API_BASE_PATH.replace(/\/+$/, "");
}
if (API_BASE_PATH === "/") {
  API_BASE_PATH = "";
}

/**
 * Custom API error class
 */
export class ApiError extends Error {
  /**
   * @param {string} message - Error message
   * @param {number} status - HTTP status code
   * @param {*} data - Response data
   */
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Build a complete request URL
 * @param {string} endpoint - API endpoint path
 * @returns {string} Complete URL
 */
export function buildRequestUrl(endpoint) {
  if (!endpoint) {
    return API_BASE_ORIGIN ? `${API_BASE_ORIGIN}${API_BASE_PATH}` : API_BASE_PATH;
  }

  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  if (API_BASE_ORIGIN) {
    return `${API_BASE_ORIGIN}${API_BASE_PATH}${path}`;
  }

  return `${API_BASE_PATH}${path}`;
}

/**
 * Make an HTTP request
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<*>} Response data
 * @throws {ApiError} On HTTP error
 */
export async function request(endpoint, options = {}) {
  const url = buildRequestUrl(endpoint);
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errorData = null;

    try {
      errorData = await response.json();
      if (errorData?.error) {
        errorMessage = errorData.error;
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      }
    } catch (e) {
      // Response wasn't JSON, use status text
    }

    throw new ApiError(errorMessage, response.status, errorData);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  return await response.json();
}

/**
 * Make a GET request
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Request options
 * @returns {Promise<*>} Response data
 */
export async function get(endpoint, options = {}) {
  return request(endpoint, {
    ...options,
    method: "GET",
  });
}

/**
 * Make a POST request
 * @param {string} endpoint - API endpoint
 * @param {*} data - Request body
 * @param {Object} options - Request options
 * @returns {Promise<*>} Response data
 */
export async function post(endpoint, data, options = {}) {
  return request(endpoint, {
    ...options,
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Make a PUT request
 * @param {string} endpoint - API endpoint
 * @param {*} data - Request body
 * @param {Object} options - Request options
 * @returns {Promise<*>} Response data
 */
export async function put(endpoint, data, options = {}) {
  return request(endpoint, {
    ...options,
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * Make a DELETE request
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Request options
 * @returns {Promise<*>} Response data
 */
export async function del(endpoint, options = {}) {
  return request(endpoint, {
    ...options,
    method: "DELETE",
  });
}

/**
 * Create authorization headers
 * @param {string} token - Auth token
 * @returns {Object} Headers object
 */
export function authHeaders(token) {
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
}
