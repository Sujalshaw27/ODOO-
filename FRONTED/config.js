/**
 * AssetFlow frontend config.
 * Point this at wherever your FastAPI backend is running.
 * Since your routers are auth.py, assets.py, allocations.py, bookings.py,
 * maintenance.py, departments.py, categories.py, users.py, dashboard.py,
 * notifications.py, reports.py, audits.py — endpoints below assume they're
 * mounted at these prefixes. Adjust API_ROUTES if your prefixes differ
 * (e.g. if main.py uses APIRouter(prefix="/api/assets") vs "/assets").
 */
window.APP_CONFIG = {
  API_BASE_URL: "http://localhost:8000",

  API_ROUTES: {
    login: "/auth/login",
    signup: "/auth/signup",
    me: "/auth/me",

    users: "/users",
    departments: "/departments",
    categories: "/categories",

    assets: "/assets",
    allocations: "/allocations",
    bookings: "/bookings",
    maintenance: "/maintenance",

    dashboard: "/dashboard",
    notifications: "/notifications",
    reports: "/reports",
    audits: "/audits",
  },

  // Set true while wiring things up to log every request/response to console
  DEBUG: true,
};
