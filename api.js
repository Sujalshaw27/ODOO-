/**
 * Thin API client. All requests go through `request()`, which attaches the
 * JWT (if present) and normalizes errors. Adjust field names in the
 * resource helpers below if your Pydantic schemas differ slightly.
 */
const AF_TOKEN_KEY = "af_token";
const AF_USER_KEY = "af_user";

const Auth = {
  getToken: () => localStorage.getItem(AF_TOKEN_KEY),
  setToken: (t) => localStorage.setItem(AF_TOKEN_KEY, t),
  clearToken: () => localStorage.removeItem(AF_TOKEN_KEY),

  getUser: () => {
    try { return JSON.parse(localStorage.getItem(AF_USER_KEY) || "null"); }
    catch { return null; }
  },
  setUser: (u) => localStorage.setItem(AF_USER_KEY, JSON.stringify(u)),
  clearUser: () => localStorage.removeItem(AF_USER_KEY),

  isLoggedIn: () => !!Auth.getToken(),
  logout: () => { Auth.clearToken(); Auth.clearUser(); window.location.href = "index.html"; },

  /** Redirect to login if no token. Call at top of every protected page. */
  guard: () => {
    if (!Auth.isLoggedIn()) window.location.href = "index.html";
  },
};

async function request(path, { method = "GET", body, query, auth = true } = {}) {
  const base = window.APP_CONFIG.API_BASE_URL.replace(/\/$/, "");
  let url = base + path;
  if (query) {
    const qs = new URLSearchParams(
      Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    if (qs) url += "?" + qs;
  }

  const headers = { "Content-Type": "application/json" };
  if (auth && Auth.getToken()) headers["Authorization"] = `Bearer ${Auth.getToken()}`;

  if (window.APP_CONFIG.DEBUG) console.log("[API]", method, url, body || "");

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new Error(
      `Could not reach the backend at ${base}. Is it running? (${e.message})`
    );
  }

  if (res.status === 401) {
    Auth.logout();
    throw new Error("Session expired. Please log in again.");
  }

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const msg =
      (data && (data.detail || data.message)) ||
      (typeof data === "string" ? data : null) ||
      `Request failed (${res.status})`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data;
}

const R = window.APP_CONFIG ? window.APP_CONFIG.API_ROUTES : {};

const Api = {
  // ---- Auth ----
  login: (email, password) =>
    request(window.APP_CONFIG.API_ROUTES.login, {
      method: "POST",
      body: { email, password },
      auth: false,
    }),
  signup: (payload) =>
    request(window.APP_CONFIG.API_ROUTES.signup, { method: "POST", body: payload, auth: false }),
  me: () => request(window.APP_CONFIG.API_ROUTES.me),

  // ---- Generic CRUD factory ----
  _crud(routeKey) {
    const base = () => window.APP_CONFIG.API_ROUTES[routeKey];
    return {
      list: (query) => request(base(), { query }),
      get: (id) => request(`${base()}/${id}`),
      create: (payload) => request(base(), { method: "POST", body: payload }),
      update: (id, payload) => request(`${base()}/${id}`, { method: "PUT", body: payload }),
      remove: (id) => request(`${base()}/${id}`, { method: "DELETE" }),
    };
  },

  get users() { return Api._crud("users"); },
  get departments() { return Api._crud("departments"); },
  get categories() { return Api._crud("categories"); },
  get assets() { return Api._crud("assets"); },
  get bookings() { return Api._crud("bookings"); },
  get maintenance() { return Api._crud("maintenance"); },
  get audits() { return Api._crud("audits"); },

  // ---- Allocations (extra actions beyond CRUD) ----
  allocations: {
    list: (query) => request(window.APP_CONFIG.API_ROUTES.allocations, { query }),
    create: (payload) =>
      request(window.APP_CONFIG.API_ROUTES.allocations, { method: "POST", body: payload }),
    return: (id, payload) =>
      request(`${window.APP_CONFIG.API_ROUTES.allocations}/${id}/return`, {
        method: "POST",
        body: payload,
      }),
    transfer: (id, payload) =>
      request(`${window.APP_CONFIG.API_ROUTES.allocations}/${id}/transfer`, {
        method: "POST",
        body: payload,
      }),
  },

  // ---- Dashboard / Notifications / Reports ----
  dashboard: {
    summary: () => request(window.APP_CONFIG.API_ROUTES.dashboard),
  },
  notifications: {
    list: () => request(window.APP_CONFIG.API_ROUTES.notifications),
    markRead: (id) =>
      request(`${window.APP_CONFIG.API_ROUTES.notifications}/${id}/read`, { method: "POST" }),
  },
  reports: {
    byDepartment: () => request(`${window.APP_CONFIG.API_ROUTES.reports}/by-department`),
    byCategory: () => request(`${window.APP_CONFIG.API_ROUTES.reports}/by-category`),
    byStatus: () => request(`${window.APP_CONFIG.API_ROUTES.reports}/by-status`),
    maintenanceFrequency: () => request(`${window.APP_CONFIG.API_ROUTES.reports}/maintenance-frequency`),
  },
};
