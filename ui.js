/** Shared shell + small UI helpers used across every page. */

const NAV_ITEMS = [
  { group: "Overview", items: [
    { href: "dashboard.html", label: "Dashboard", key: "dashboard" },
  ]},
  { group: "Assets", items: [
    { href: "assets.html", label: "Assets", key: "assets" },
    { href: "allocations.html", label: "Allocations", key: "allocations" },
    { href: "bookings.html", label: "Resource bookings", key: "bookings" },
    { href: "maintenance.html", label: "Maintenance", key: "maintenance" },
  ]},
  { group: "Organization", items: [
    { href: "departments.html", label: "Departments", key: "departments" },
    { href: "categories.html", label: "Asset categories", key: "categories" },
    { href: "employees.html", label: "Employees", key: "employees" },
  ]},
  { group: "Insight", items: [
    { href: "reports.html", label: "Reports", key: "reports" },
    { href: "audit.html", label: "Audit", key: "audit" },
    { href: "notifications.html", label: "Notifications", key: "notifications" },
  ]},
];

function renderShell(activeKey, pageTitle, subtitle) {
  const user = Auth.getUser() || {};
  const initials = (user.name || user.email || "?").trim().slice(0, 2).toUpperCase();

  const navHtml = NAV_ITEMS.map(g => `
    <div class="group-label">${g.group}</div>
    ${g.items.map(it => `
      <a href="${it.href}" class="${it.key === activeKey ? "active" : ""}">
        <span class="dot"></span>${it.label}
      </a>`).join("")}
  `).join("");

  document.getElementById("app-shell").innerHTML = `
    <aside class="af-sidebar" id="af-sidebar">
      <div class="brand">
        <div class="mark">AF-0001 · ENTERPRISE</div>
        <div class="name">AssetFlow</div>
      </div>
      <nav class="af-nav">${navHtml}</nav>
      <div class="foot">Logged in as<br><strong style="color:#fff">${escapeHtml(user.name || user.email || "user")}</strong></div>
    </aside>
    <div class="af-main">
      <header class="af-topbar">
        <div style="display:flex;align-items:center;gap:12px">
          <button id="af-menu-btn" class="btn-ghost btn" style="display:none" aria-label="Menu">☰</button>
          <span class="tag-stub on-surface">${escapeHtml((user.role || "employee")).toUpperCase()}</span>
        </div>
        <div style="display:flex;align-items:center;gap:14px">
          <a href="notifications.html" class="btn-ghost btn" title="Notifications">🔔</a>
          <div style="width:32px;height:32px;border-radius:50%;background:var(--teal-700);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800">${initials}</div>
          <button class="btn btn-secondary" onclick="Auth.logout()">Log out</button>
        </div>
      </header>
      <main class="af-page">
        <div style="margin-bottom:20px">
          <h1>${pageTitle}</h1>
          ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ""}
        </div>
        <div id="page-content"></div>
      </main>
    </div>
    <div class="af-toast-wrap" id="af-toast-wrap"></div>
  `;

  const menuBtn = document.getElementById("af-menu-btn");
  const sidebar = document.getElementById("af-sidebar");
  if (window.innerWidth <= 900) {
    menuBtn.style.display = "inline-flex";
    menuBtn.addEventListener("click", () => sidebar.classList.toggle("open"));
  }
}

function toast(message, type = "success") {
  const wrap = document.getElementById("af-toast-wrap");
  if (!wrap) return alert(message);
  const el = document.createElement("div");
  el.className = `af-toast ${type === "error" ? "error" : ""}`;
  el.textContent = message;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

function openModal(innerHtml) {
  const backdrop = document.createElement("div");
  backdrop.className = "af-modal-backdrop";
  backdrop.id = "af-modal-backdrop";
  backdrop.innerHTML = `<div class="af-modal">${innerHtml}</div>`;
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeModal(); });
  document.body.appendChild(backdrop);
  return backdrop;
}
function closeModal() {
  const b = document.getElementById("af-modal-backdrop");
  if (b) b.remove();
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function statusChip(status) {
  if (!status) return "";
  const key = String(status).toLowerCase().replace(/\s+/g, "_");
  return `<span class="status-chip status-${key}">${escapeHtml(status)}</span>`;
}

function tagStub(code) {
  return `<span class="tag-stub">${escapeHtml(code)}</span>`;
}

function fmtDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch { return d; }
}
function fmtDateTime(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return d; }
}

function loadingRow(colspan, label = "Loading…") {
  return `<tr><td colspan="${colspan}" style="text-align:center;padding:30px;color:var(--ink-soft)">
    <span class="spin" style="display:inline-block;margin-right:8px">⟳</span>${label}
  </td></tr>`;
}

function emptyState(label, sub) {
  return `<div class="af-empty"><div style="font-weight:700;color:var(--ink);margin-bottom:4px">${escapeHtml(label)}</div>${sub ? `<div>${escapeHtml(sub)}</div>` : ""}</div>`;
}

async function handleApiError(e, fallbackMsg) {
  console.error(e);
  toast(e.message || fallbackMsg || "Something went wrong", "error");
}
