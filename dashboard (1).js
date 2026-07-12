Auth.guard();
renderShell("dashboard", "Dashboard", "Live overview of assets, allocations, and activity.");

const content = document.getElementById("page-content");
content.innerHTML = `
  <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-bottom:26px" id="kpi-grid">
    ${["Available assets","Allocated","Maintenance today","Active bookings","Overdue returns"]
      .map(l => `<div class="af-kpi"><div class="label">${l}</div><div class="value">—</div><div class="foot">loading…</div></div>`).join("")}
  </div>

  <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:18px" id="dash-grid">
    <div class="af-card" style="padding:18px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <h2 style="font-weight:800;font-size:15px">Recent activity</h2>
      </div>
      <div id="recent-activity"><div class="af-empty">Loading recent activity…</div></div>
    </div>
    <div class="af-card" style="padding:18px">
      <h2 style="font-weight:800;font-size:15px;margin-bottom:10px">Quick actions</h2>
      <div style="display:flex;flex-direction:column;gap:8px">
        <a class="btn btn-secondary" href="assets.html?new=1" style="justify-content:flex-start">＋ Register asset</a>
        <a class="btn btn-secondary" href="allocations.html?new=1" style="justify-content:flex-start">＋ Allocate asset</a>
        <a class="btn btn-secondary" href="bookings.html?new=1" style="justify-content:flex-start">＋ Book resource</a>
        <a class="btn btn-secondary" href="maintenance.html?new=1" style="justify-content:flex-start">＋ Raise maintenance request</a>
      </div>
    </div>
  </div>
`;

applyResponsiveGrid();
function applyResponsiveGrid(){
  if (window.matchMedia("(max-width: 900px)").matches) {
    document.getElementById("kpi-grid").style.gridTemplateColumns = "repeat(2,1fr)";
    document.getElementById("dash-grid").style.gridTemplateColumns = "1fr";
  }
}

(async function loadDashboard() {
  try {
    const summary = await Api.dashboard.summary();
    // Expecting keys like: available_assets, allocated_assets,
    // maintenance_today, active_bookings, overdue_returns, recent_activity: []
    const kpis = [
      { label: "Available assets", value: summary.available_assets, foot: "AVAILABLE" },
      { label: "Allocated", value: summary.allocated_assets, foot: "IN USE" },
      { label: "Maintenance today", value: summary.maintenance_today, foot: "IN SERVICE" },
      { label: "Active bookings", value: summary.active_bookings, foot: "BOOKED" },
      { label: "Overdue returns", value: summary.overdue_returns, foot: "OVERDUE" },
    ];
    document.getElementById("kpi-grid").innerHTML = kpis.map(k => `
      <div class="af-kpi">
        <div class="label">${k.label}</div>
        <div class="value">${k.value ?? "—"}</div>
        <div class="foot">${k.foot}</div>
      </div>`).join("");

    const activity = summary.recent_activity || [];
    document.getElementById("recent-activity").innerHTML = activity.length
      ? `<div style="display:flex;flex-direction:column;gap:10px">${activity.map(a => `
          <div style="display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)">
            <div>
              <div style="font-size:13.5px;font-weight:600">${escapeHtml(a.message || a.description || "Activity")}</div>
              <div style="font-size:11.5px;color:var(--ink-soft)">${escapeHtml(a.actor || "")}</div>
            </div>
            <div style="font-size:11.5px;color:var(--ink-soft);white-space:nowrap">${fmtDateTime(a.timestamp || a.created_at)}</div>
          </div>`).join("")}</div>`
      : emptyState("No recent activity yet", "Actions like allocations and bookings will show up here.");
  } catch (e) {
    document.getElementById("kpi-grid").innerHTML = `<div style="grid-column:1/-1" class="af-empty">Couldn't load dashboard data — ${escapeHtml(e.message)}</div>`;
    document.getElementById("recent-activity").innerHTML = "";
  }
})();
