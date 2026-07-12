Auth.guard();
renderShell("assets", "Assets", "Everything the company owns — search, filter, and manage lifecycle status.");

const ASSET_STATUSES = ["Available", "Allocated", "Reserved", "Under Maintenance", "Lost", "Retired", "Disposed"];
let assetsCache = [];
let categoriesCache = [];
let departmentsCache = [];

const content = document.getElementById("page-content");
content.innerHTML = `
  <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:space-between;align-items:center;margin-bottom:16px">
    <div style="display:flex;gap:10px;flex-wrap:wrap;flex:1;min-width:260px">
      <input class="af-input" id="search-input" placeholder="Search by name, tag, or serial…" style="max-width:280px">
      <select class="af-select" id="filter-category" style="max-width:180px"><option value="">All categories</option></select>
      <select class="af-select" id="filter-status" style="max-width:180px">
        <option value="">All statuses</option>
        ${ASSET_STATUSES.map(s => `<option value="${s}">${s}</option>`).join("")}
      </select>
    </div>
    <button class="btn btn-primary" id="new-asset-btn">＋ Register asset</button>
  </div>

  <div class="af-card" style="overflow-x:auto">
    <table class="af-table">
      <thead><tr>
        <th>Asset</th><th>Tag</th><th>Category</th><th>Location</th><th>Status</th><th>Acquired</th><th></th>
      </tr></thead>
      <tbody id="assets-tbody">${loadingRow(7)}</tbody>
    </table>
  </div>
`;

document.getElementById("search-input").addEventListener("input", debounce(renderTable, 200));
document.getElementById("filter-category").addEventListener("change", renderTable);
document.getElementById("filter-status").addEventListener("change", renderTable);
document.getElementById("new-asset-btn").addEventListener("click", () => openAssetForm());

function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

async function loadAll() {
  try {
    const [assets, categories, departments] = await Promise.all([
      Api.assets.list(),
      Api.categories.list().catch(() => []),
      Api.departments.list().catch(() => []),
    ]);
    assetsCache = Array.isArray(assets) ? assets : (assets.items || []);
    categoriesCache = Array.isArray(categories) ? categories : (categories.items || []);
    departmentsCache = Array.isArray(departments) ? departments : (departments.items || []);

    const catSel = document.getElementById("filter-category");
    catSel.innerHTML = `<option value="">All categories</option>` +
      categoriesCache.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");

    renderTable();

    if (new URLSearchParams(location.search).get("new") === "1") openAssetForm();
  } catch (e) {
    document.getElementById("assets-tbody").innerHTML =
      `<tr><td colspan="7">${emptyState("Couldn't load assets", e.message)}</td></tr>`;
  }
}

function renderTable() {
  const q = document.getElementById("search-input").value.trim().toLowerCase();
  const catFilter = document.getElementById("filter-category").value;
  const statusFilter = document.getElementById("filter-status").value;

  let rows = assetsCache.filter(a => {
    const matchesQ = !q || [a.name, a.asset_tag, a.serial_number].some(v => (v || "").toLowerCase().includes(q));
    const matchesCat = !catFilter || String(a.category_id) === String(catFilter);
    const matchesStatus = !statusFilter || (a.status || "").toLowerCase() === statusFilter.toLowerCase();
    return matchesQ && matchesCat && matchesStatus;
  });

  const tbody = document.getElementById("assets-tbody");
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="7">${emptyState("No assets match", "Try clearing filters or register a new asset.")}</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(a => `
    <tr>
      <td><div style="font-weight:700">${escapeHtml(a.name)}</div><div style="font-size:11.5px;color:var(--ink-soft)">${escapeHtml(a.serial_number || "")}</div></td>
      <td>${tagStub(a.asset_tag || "—")}</td>
      <td>${escapeHtml(categoryName(a.category_id) )}</td>
      <td>${escapeHtml(a.location || "—")}</td>
      <td>${statusChip(a.status)}</td>
      <td>${fmtDate(a.acquisition_date)}</td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn btn-ghost" data-edit="${a.id}">Edit</button>
        <button class="btn btn-ghost" style="color:var(--red-700)" data-delete="${a.id}">Delete</button>
      </td>
    </tr>`).join("");

  tbody.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => openAssetForm(assetsCache.find(x => String(x.id) === b.dataset.edit))));
  tbody.querySelectorAll("[data-delete]").forEach(b => b.addEventListener("click", () => deleteAsset(b.dataset.delete)));
}

function categoryName(id) {
  const c = categoriesCache.find(c => String(c.id) === String(id));
  return c ? c.name : "—";
}

function openAssetForm(asset) {
  const isEdit = !!asset;
  const backdrop = openModal(`
    <div style="padding:22px">
      <h2 style="font-weight:800;font-size:17px;margin-bottom:16px">${isEdit ? "Edit asset" : "Register asset"}</h2>
      <form id="asset-form">
        <label class="af-label">Name</label>
        <input class="af-input" id="f-name" required value="${escapeHtml(asset?.name || "")}" style="margin-bottom:12px">

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div>
            <label class="af-label">Category</label>
            <select class="af-select" id="f-category">
              <option value="">Select…</option>
              ${categoriesCache.map(c => `<option value="${c.id}" ${String(asset?.category_id) === String(c.id) ? "selected" : ""}>${escapeHtml(c.name)}</option>`).join("")}
            </select>
          </div>
          <div>
            <label class="af-label">Status</label>
            <select class="af-select" id="f-status">
              ${ASSET_STATUSES.map(s => `<option ${asset?.status === s ? "selected" : ""}>${s}</option>`).join("")}
            </select>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div>
            <label class="af-label">Asset tag ${isEdit ? "" : "(leave blank to auto-generate)"}</label>
            <input class="af-input font-mono-tag" id="f-tag" value="${escapeHtml(asset?.asset_tag || "")}" ${isEdit ? "readonly" : ""}>
          </div>
          <div>
            <label class="af-label">Serial number</label>
            <input class="af-input" id="f-serial" value="${escapeHtml(asset?.serial_number || "")}">
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div>
            <label class="af-label">Location</label>
            <input class="af-input" id="f-location" value="${escapeHtml(asset?.location || "")}">
          </div>
          <div>
            <label class="af-label">Department</label>
            <select class="af-select" id="f-department">
              <option value="">Select…</option>
              ${departmentsCache.map(d => `<option value="${d.id}" ${String(asset?.department_id) === String(d.id) ? "selected" : ""}>${escapeHtml(d.name)}</option>`).join("")}
            </select>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div>
            <label class="af-label">Condition</label>
            <select class="af-select" id="f-condition">
              ${["New","Good","Fair","Poor"].map(c => `<option ${asset?.condition === c ? "selected" : ""}>${c}</option>`).join("")}
            </select>
          </div>
          <div>
            <label class="af-label">Acquisition date</label>
            <input class="af-input" type="date" id="f-acq" value="${asset?.acquisition_date ? asset.acquisition_date.substring(0,10) : ""}">
          </div>
        </div>

        <label style="display:flex;align-items:center;gap:8px;font-size:13.5px;margin-bottom:18px">
          <input type="checkbox" id="f-bookable" ${asset?.is_bookable ? "checked" : ""}> Bookable as a shared resource
        </label>

        <div id="asset-form-error" style="color:var(--red-700);font-size:12.5px;min-height:16px;margin-bottom:8px"></div>

        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
          <button type="submit" class="btn btn-primary" id="save-btn">${isEdit ? "Save changes" : "Register asset"}</button>
        </div>
      </form>
    </div>
  `);

  document.getElementById("cancel-btn").addEventListener("click", closeModal);
  document.getElementById("asset-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = document.getElementById("asset-form-error");
    const btn = document.getElementById("save-btn");
    const payload = {
      name: document.getElementById("f-name").value.trim(),
      category_id: document.getElementById("f-category").value || null,
      status: document.getElementById("f-status").value,
      asset_tag: document.getElementById("f-tag").value.trim() || undefined,
      serial_number: document.getElementById("f-serial").value.trim(),
      location: document.getElementById("f-location").value.trim(),
      department_id: document.getElementById("f-department").value || null,
      condition: document.getElementById("f-condition").value,
      acquisition_date: document.getElementById("f-acq").value || null,
      is_bookable: document.getElementById("f-bookable").checked,
    };
    btn.disabled = true; btn.textContent = "Saving…";
    try {
      if (isEdit) await Api.assets.update(asset.id, payload);
      else await Api.assets.create(payload);
      closeModal();
      toast(isEdit ? "Asset updated." : "Asset registered.");
      loadAll();
    } catch (err) {
      errEl.textContent = err.message;
    } finally {
      btn.disabled = false; btn.textContent = isEdit ? "Save changes" : "Register asset";
    }
  });
}

async function deleteAsset(id) {
  if (!confirm("Delete this asset? This cannot be undone.")) return;
  try {
    await Api.assets.remove(id);
    toast("Asset deleted.");
    loadAll();
  } catch (e) {
    handleApiError(e, "Couldn't delete asset");
  }
}

loadAll();
