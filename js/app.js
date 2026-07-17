// ---------------------------------------------------------------------------
// Fill Your Map — a full-view US map you fill with state stickers.
//
// The map is the whole stage. The stickers live in a "sticker sheet" that
// slides up from the bottom only when you're adding a place — summoned by the
// "＋ Add a sticker" button, or by tapping the empty state you visited.
//
// Placing a sticker (all end up in the same place):
//   • Drag it from the sheet onto the matching state.
//   • Tap the sticker, then tap its state.
//   • Tap an empty state to open the sheet at its sticker.
// Tap a filled-in state to peel its sticker back off.
// ---------------------------------------------------------------------------
import { US_VIEWBOX, US_OUTLINE, US_BORDERS, US_STATES } from "./us-geo.js";
import { mapSceneGroup, mapPhotoGroup, stickerSVG } from "./scenes.js";
import { createStore, emptyData } from "./storage.js";
import { readGps } from "./exif.js";
import { stateAtLatLng } from "./geo-locate.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const store = createStore();

const STATES_50 = US_STATES.filter((s) => s.code !== "DC");
const TOTAL = STATES_50.length; // 50
const byCode = Object.fromEntries(US_STATES.map((s) => [s.code, s]));
const name = (code) => byCode[code]?.name ?? code;
const sortedStates = [...US_STATES].sort((a, b) => a.name.localeCompare(b.name));

let data = emptyData();
let drag = null;            // active pointer-drag session
let selectedSticker = null; // tap-to-place selection
let advCode = null;         // state whose adventure card is open
const el = {};

// --- persistence -------------------------------------------------------------
let saveTimer = null;
function persist({ immediate = false } = {}) {
  clearTimeout(saveTimer);
  const run = () => store.save(data).catch(() => toast("Couldn't save — is storage full?"));
  immediate ? run() : (saveTimer = setTimeout(run, 250));
}
const isPlaced = (code) => Object.prototype.hasOwnProperty.call(data.visited, code);
const placedCount = () => STATES_50.reduce((n, s) => n + (isPlaced(s.code) ? 1 : 0), 0);

// --- placing / removing ------------------------------------------------------
function place(code, { celebrate = true } = {}) {
  if (!byCode[code] || isPlaced(code)) return;
  data.visited[code] = { date: null };
  persist();
  addFill(code);
  clearTarget();
  renderTray();
  renderHeader();
  pulse(code);
  if (celebrate && placedCount() === TOTAL) toast("🎉 All 50 states filled in!");
}

function removeSticker(code) {
  if (!isPlaced(code)) return;
  delete data.visited[code];
  persist();
  removeFill(code);
  renderTray();
  renderHeader();
  toast(`Peeled ${name(code)} back off.`);
}

// --- map fills ---------------------------------------------------------------
// Draw (or redraw) a placed state's fill: its first photo if it has one,
// otherwise the generated scenic sticker.
function addFill(code) {
  el.fills.querySelector(`.fill[data-code="${code}"]`)?.remove();
  const s = byCode[code];
  const photo = data.visited[code]?.photos?.[0];
  const g = document.createElementNS(SVG_NS, "g");
  g.setAttribute("class", "fill");
  g.dataset.code = code;
  g.innerHTML = photo ? mapPhotoGroup(s, photo.src) : mapSceneGroup(s);
  el.fills.appendChild(g);
  setLabelHidden(code, true);
}
function removeFill(code) {
  el.fills.querySelector(`.fill[data-code="${code}"]`)?.remove();
  setLabelHidden(code, false);
}
function setLabelHidden(code, hidden) {
  const t = el.svg.querySelector(`text.label[data-code="${code}"]`);
  if (t) t.style.display = hidden ? "none" : "";
}

// --- rendering ---------------------------------------------------------------
function renderHeader() {
  const n = placedCount();
  const pct = Math.round((n / TOTAL) * 100);
  el.count.textContent = String(n);
  el.progressBar.style.width = `${pct}%`;
  el.progressBar.parentElement.setAttribute("aria-valuenow", String(n));
  el.countNote.textContent = isPlaced("DC") ? " + DC" : "";
  if (document.activeElement !== el.name) el.name.value = data.travelerName;
}

function renderTray() {
  const q = el.search.value.trim().toLowerCase();
  let left = 0;
  for (const item of el.tray.children) {
    const code = item.dataset.code;
    const placed = isPlaced(code);
    if (!placed) left++;
    const match = !q || name(code).toLowerCase().includes(q) || code.toLowerCase().includes(q);
    item.hidden = placed || !match;
    item.classList.toggle("is-selected", code === selectedSticker);
  }
  el.trayLeft.textContent = left ? `· ${left} to go` : "";
  el.trayEmpty.hidden = left !== 0;
  el.addLabel.textContent = left ? "Add a sticker" : "Every state visited 🎉";
}

function pulse(code) {
  const p = el.svg.querySelector(`path.state[data-code="${code}"]`);
  if (!p) return;
  p.classList.remove("pulse");
  void p.getBoundingClientRect();
  p.classList.add("pulse");
}

let toastTimer = null;
function toast(msg) {
  el.toast.textContent = msg;
  el.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove("show"), 2600);
}

// --- one-time build ----------------------------------------------------------
function buildMap() {
  const states = US_STATES.map(
    (s) => `<path class="state" data-code="${s.code}" d="${s.d}" tabindex="0" role="button" ` +
      `aria-label="${s.name}"><title>${s.name}</title></path>`
  ).join("");
  const labels = US_STATES.filter((s) => s.big)
    .map((s) => `<text class="label" data-code="${s.code}" x="${s.labelX}" y="${s.labelY}">${s.code}</text>`)
    .join("");
  el.svg.setAttribute("viewBox", US_VIEWBOX);
  applyMapAlign();
  el.svg.innerHTML =
    `<g class="states">${states}</g>` +
    `<g class="fills"></g>` +
    `<path class="borders" d="${US_BORDERS}" />` +
    `<path class="outline" d="${US_OUTLINE}" />` +
    `<g class="labels">${labels}</g>`;
  el.fills = el.svg.querySelector(".fills");
}

function buildTray() {
  el.tray.innerHTML = sortedStates
    .map((s) => `<button type="button" class="tray-item" data-code="${s.code}" role="listitem" ` +
      `aria-label="${s.name} sticker"><span class="tray-art">${stickerSVG(s)}</span>` +
      `<span class="tray-name">${s.name}</span></button>`)
    .join("");
}

// --- sticker sheet (bottom drawer) -------------------------------------------
function openSheet({ clearSearch = true } = {}) {
  if (clearSearch && el.search.value) { el.search.value = ""; renderTray(); }
  el.sheet.classList.add("open");
  document.body.classList.add("sheet-open");
  el.addBtn.setAttribute("aria-expanded", "true");
}
function closeSheet() {
  el.sheet.classList.remove("open");
  document.body.classList.remove("sheet-open");
  el.addBtn.setAttribute("aria-expanded", "false");
  clearSelection();
}
const sheetIsOpen = () => el.sheet.classList.contains("open");

// On a tall phone the wide map would float dead-center; anchor it to the top
// there. On wider screens keep it centered in the available space.
function applyMapAlign() {
  const portrait = window.matchMedia("(orientation: portrait)").matches && window.innerWidth < 760;
  el.svg.setAttribute("preserveAspectRatio", portrait ? "xMidYMin meet" : "xMidYMid meet");
}

// --- drag & drop (pointer events: mouse + touch) -----------------------------
function startGhost(code, x, y) {
  const ghost = document.createElement("div");
  ghost.className = "sticker-ghost";
  ghost.innerHTML = stickerSVG(byCode[code]);
  document.body.appendChild(ghost);
  document.body.classList.add("is-dragging");
  markTarget(code);
  moveGhost(ghost, x, y);
  return ghost;
}
function moveGhost(ghost, x, y) {
  ghost.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
}
function clearDrag() {
  if (drag?.ghost) drag.ghost.remove();
  document.body.classList.remove("is-dragging");
  clearTarget();
  drag = null;
}
function stateUnder(x, y) {
  return document.elementFromPoint(x, y)?.closest?.("path.state") || null;
}
function markTarget(code) {
  clearTarget();
  el.svg.querySelector(`path.state[data-code="${code}"]`)?.classList.add("is-target");
}
function clearTarget() {
  el.svg.querySelector("path.state.is-target")?.classList.remove("is-target");
}

// Pointer-down starts a *potential* drag on a tray item. The move/up listeners
// live on `window` (see wireEvents) so events keep flowing once the pointer
// leaves the sheet and travels up across the map — no pointer-capture needed.
function onTrayPointerDown(e) {
  const item = e.target.closest(".tray-item");
  if (!item || e.button > 0) return;
  drag = { code: item.dataset.code, item, x0: e.clientX, y0: e.clientY, pid: e.pointerId, moved: false, ghost: null };
}
function onPointerMove(e) {
  if (!drag || e.pointerId !== drag.pid) return;
  if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return;
  if (!drag.moved) { drag.moved = true; drag.ghost = startGhost(drag.code, e.clientX, e.clientY); }
  e.preventDefault();
  moveGhost(drag.ghost, e.clientX, e.clientY);
  const hovered = stateUnder(e.clientX, e.clientY);
  for (const p of el.svg.querySelectorAll("path.state.is-hover")) p.classList.remove("is-hover");
  if (hovered && hovered.dataset.code === drag.code) hovered.classList.add("is-hover");
}
function onPointerUp(e) {
  if (!drag || e.pointerId !== drag.pid) return;
  const d = drag;
  if (!d.moved) { clearDrag(); selectSticker(d.code); return; } // it was a tap
  if (d.ghost) d.ghost.style.display = "none"; // don't let the ghost intercept the hit-test
  const target = stateUnder(e.clientX, e.clientY);
  clearDrag();
  el.svg.querySelector("path.state.is-hover")?.classList.remove("is-hover");
  if (target && target.dataset.code === d.code) place(d.code);
  else if (target) toast(`That's ${name(target.dataset.code)} — try ${name(d.code)}'s outline.`);
  else toast(`Drop ${name(d.code)} on its spot on the map.`);
}

// --- tap-to-place ------------------------------------------------------------
function selectSticker(code) {
  selectedSticker = selectedSticker === code ? null : code;
  clearTarget();
  if (selectedSticker) {
    markTarget(code);
    toast(`Now tap ${name(code)} on the map.`);
  }
  renderTray();
}
function clearSelection() {
  if (!selectedSticker) return;
  selectedSticker = null;
  clearTarget();
  renderTray();
}

function onMapActivate(e) {
  const path = e.target.closest("path.state");
  if (!path) return;
  e.preventDefault();
  const code = path.dataset.code;
  if (selectedSticker) {
    if (code === selectedSticker) { place(code); clearSelection(); }
    else toast(`That's ${name(code)} — tap ${name(selectedSticker)}.`);
    return;
  }
  if (isPlaced(code)) openAdventure(code); // open its photos & memory
  else { openSheet(); flashSticker(code); markTarget(code); } // tapped a place they've been
}

function flashSticker(code) {
  if (el.search.value) { el.search.value = ""; renderTray(); }
  const item = el.tray.querySelector(`.tray-item[data-code="${code}"]`);
  if (!item) return;
  item.scrollIntoView({ block: "center", behavior: "smooth" });
  item.classList.remove("flash");
  void item.getBoundingClientRect();
  item.classList.add("flash");
  toast(`Peel the ${name(code)} sticker and drop it on the map.`);
}

// --- overflow menu -----------------------------------------------------------
function openMenu() {
  el.menu.hidden = false;
  el.scrim.hidden = false;
  el.menuBtn.setAttribute("aria-expanded", "true");
}
function closeMenu() {
  el.menu.hidden = true;
  el.scrim.hidden = true;
  el.menuBtn.setAttribute("aria-expanded", "false");
}

// --- adventure card (a state's photos + date + memory) -----------------------
// Photos are downscaled and stored on-device (data URLs) for this prototype.
// The real version swaps `photo.src` for a Google Photos / Drive reference.
function loadDownscaled(file, maxDim = 900, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      try { resolve(c.toDataURL("image/jpeg", quality)); }
      catch (err) { reject(err); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad image")); };
    img.src = url;
  });
}

function openAdventure(code) {
  advCode = code;
  const entry = (data.visited[code] ||= { date: null, note: "", photos: [] });
  el.advTitle.textContent = byCode[code].name;
  el.advDate.value = entry.date || "";
  el.advNote.value = entry.note || "";
  renderAdvPhotos();
  el.adventure.hidden = false;
  document.body.classList.add("modal-open");
}
function closeAdventure() {
  persist({ immediate: true }); // don't lose a just-typed note/date
  el.adventure.hidden = true;
  document.body.classList.remove("modal-open");
  advCode = null;
}
function renderAdvPhotos() {
  const photos = data.visited[advCode]?.photos || [];
  el.advPhotos.innerHTML = photos.length
    ? photos.map((p, i) =>
        `<figure class="adv-thumb"><img src="${p.src}" alt="Photo ${i + 1} of ${name(advCode)}" />` +
        `<button class="adv-thumb-x" data-i="${i}" type="button" aria-label="Remove photo">✕</button></figure>`
      ).join("")
    : `<p class="adv-empty">No photos yet — add one from this adventure.</p>`;
}

async function advAddPhotos(files) {
  const entry = data.visited[advCode];
  if (!entry) return;
  entry.photos ||= [];
  let added = 0;
  for (const f of files) {
    if (!f.type.startsWith("image/")) continue;
    try {
      const src = await loadDownscaled(f);
      entry.photos.push({ id: `p${Date.now().toString(36)}${Math.round(Math.random() * 1e4)}`, src });
      added++;
    } catch { toast("Couldn't read that image."); }
  }
  if (!added) return;
  try {
    await store.save(data);
    renderAdvPhotos();
    addFill(advCode); // the first photo now fills the state on the map
    if (data.visited[advCode].photos.length === added) pulse(advCode);
  } catch {
    entry.photos.splice(entry.photos.length - added, added); // roll back what didn't fit
    renderAdvPhotos();
    toast("Photo storage is full on this device — cloud photos are coming.");
  }
}

function advRemovePhoto(i) {
  const photos = data.visited[advCode]?.photos;
  if (!photos || !photos[i]) return;
  photos.splice(i, 1);
  persist({ immediate: true });
  renderAdvPhotos();
  addFill(advCode); // fall back to the next photo or the scenic sticker
}

// --- auto-sort a batch of photos onto the map by their GPS location ----------
async function autoSortPhotos(files) {
  const imgs = [...files].filter((f) => f.type.startsWith("image/"));
  if (!imgs.length) return;
  const label = el.autoFillBtn.textContent;
  el.autoFillBtn.disabled = true;
  el.autoFillBtn.textContent = `Sorting ${imgs.length} photo${imgs.length !== 1 ? "s" : ""}…`;

  let sorted = 0, noLocation = 0;
  const touched = new Set();
  for (const f of imgs) {
    let code = null;
    try {
      const gps = readGps(await f.arrayBuffer());
      if (gps) code = stateAtLatLng(gps.lat, gps.lng);
    } catch { /* unreadable — treat as no location */ }
    if (!code) { noLocation++; continue; }
    try {
      const src = await loadDownscaled(f);
      const entry = (data.visited[code] ||= { date: null, note: "", photos: [] });
      entry.photos ||= [];
      entry.photos.push({ id: `p${Date.now().toString(36)}${Math.round(Math.random() * 1e4)}`, src });
      sorted++;
      touched.add(code);
    } catch { /* skip images we can't process */ }
  }

  el.autoFillBtn.disabled = false;
  el.autoFillBtn.textContent = label;

  let saveErr = false;
  try { await store.save(data); } catch { saveErr = true; }
  renderAll();
  if (touched.size) { closeSheet(); touched.forEach(pulse); }

  const parts = [];
  if (sorted) parts.push(`Sorted ${sorted} photo${sorted !== 1 ? "s" : ""} onto ${touched.size} state${touched.size !== 1 ? "s" : ""} 🎉`);
  if (noLocation) parts.push(`${noLocation} had no location — open a state to add ${noLocation !== 1 ? "them" : "it"} by hand.`);
  if (saveErr) parts.push("storage is full on this device (cloud photos coming)");
  toast(parts.join(" · ") || "Those photos had no location saved.");
}

// --- backup / restore --------------------------------------------------------
function exportData() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const who = data.travelerName ? data.travelerName.replace(/[^\w-]+/g, "-") + "-" : "";
  a.href = url;
  a.download = `${who}fill-your-map.json`;
  a.click();
  URL.revokeObjectURL(url);
}
function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      data = emptyData();
      if (typeof parsed.travelerName === "string") data.travelerName = parsed.travelerName;
      if (parsed.visited && typeof parsed.visited === "object") {
        for (const [code, entry] of Object.entries(parsed.visited)) {
          const key = String(code).toUpperCase();
          if (byCode[key]) data.visited[key] = { date: entry && entry.date ? entry.date : null };
        }
      }
      persist({ immediate: true });
      renderAll();
      toast("Backup restored.");
    } catch {
      toast("That file didn't look like a backup.");
    }
  };
  reader.readAsText(file);
}
function resetAll() {
  const n = placedCount();
  if (n > 0 && !confirm(`Peel off all ${n} stickers and start over?`)) return;
  data = emptyData();
  persist({ immediate: true });
  renderAll();
}

// --- full render (load / import / reset) -------------------------------------
function renderAll() {
  el.fills.innerHTML = "";
  for (const s of US_STATES) setLabelHidden(s.code, false);
  for (const code of Object.keys(data.visited)) if (byCode[code]) addFill(code);
  renderHeader();
  renderTray();
}

// --- events ------------------------------------------------------------------
function wireEvents() {
  // drag from the sheet; move/up on window so the drag survives leaving the sheet
  el.tray.addEventListener("pointerdown", onTrayPointerDown);
  window.addEventListener("pointermove", onPointerMove, { passive: false });
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", () => { if (drag) clearDrag(); });
  el.tray.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const item = e.target.closest(".tray-item");
    if (item) { e.preventDefault(); selectSticker(item.dataset.code); }
  });

  el.svg.addEventListener("click", onMapActivate);
  el.svg.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") onMapActivate(e);
  });
  window.addEventListener("resize", applyMapAlign);
  window.addEventListener("orientationchange", applyMapAlign);
  // flush any pending debounced save if the page is being hidden/closed
  window.addEventListener("pagehide", () => { clearTimeout(saveTimer); store.save(data).catch(() => {}); });

  // sheet open/close
  el.addBtn.addEventListener("click", () => (sheetIsOpen() ? closeSheet() : openSheet()));
  el.sheetClose.addEventListener("click", closeSheet);
  el.sheetGrip.addEventListener("click", closeSheet);
  el.search.addEventListener("input", renderTray);
  el.autoFillBtn.addEventListener("click", () => el.autoFillInput.click());
  el.autoFillInput.addEventListener("change", () => {
    if (el.autoFillInput.files.length) autoSortPhotos([...el.autoFillInput.files]);
    el.autoFillInput.value = "";
  });

  el.name.addEventListener("input", () => { data.travelerName = el.name.value; persist(); });

  // overflow menu
  el.menuBtn.addEventListener("click", () => (el.menu.hidden ? openMenu() : closeMenu()));
  el.scrim.addEventListener("click", closeMenu);
  el.exportBtn.addEventListener("click", () => { closeMenu(); exportData(); });
  el.importBtn.addEventListener("click", () => { closeMenu(); el.importInput.click(); });
  el.resetBtn.addEventListener("click", () => { closeMenu(); resetAll(); });
  el.importInput.addEventListener("change", () => {
    if (el.importInput.files[0]) importData(el.importInput.files[0]);
    el.importInput.value = "";
  });

  // adventure card
  el.advClose.addEventListener("click", closeAdventure);
  el.advBackdrop.addEventListener("click", closeAdventure);
  el.advDate.addEventListener("change", () => { if (advCode) { data.visited[advCode].date = el.advDate.value || null; persist(); } });
  el.advNote.addEventListener("input", () => { if (advCode) { data.visited[advCode].note = el.advNote.value; persist(); } });
  el.advAddPhoto.addEventListener("click", () => el.advPhotoInput.click());
  el.advPhotoInput.addEventListener("change", () => {
    if (el.advPhotoInput.files.length) advAddPhotos([...el.advPhotoInput.files]);
    el.advPhotoInput.value = "";
  });
  el.advPhotos.addEventListener("click", (e) => {
    const btn = e.target.closest(".adv-thumb-x");
    if (btn) advRemovePhoto(Number(btn.dataset.i));
  });
  el.advRemove.addEventListener("click", () => { const c = advCode; closeAdventure(); removeSticker(c); });

  // Esc closes the topmost surface / cancels a selection.
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!el.adventure.hidden) closeAdventure();
    else if (!el.menu.hidden) closeMenu();
    else if (selectedSticker) clearSelection();
    else if (sheetIsOpen()) closeSheet();
  });

  // Install to home screen (Android/desktop Chrome).
  let deferred = null;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; el.installBtn.hidden = false; });
  el.installBtn.addEventListener("click", async () => {
    closeMenu();
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    deferred = null;
    el.installBtn.hidden = true;
  });
}

// --- boot --------------------------------------------------------------------
async function init() {
  for (const id of ["svg", "name", "count", "countNote", "progressBar", "tray", "trayLeft",
    "trayEmpty", "search", "toast", "exportBtn", "importBtn", "importInput", "resetBtn",
    "installBtn", "menuBtn", "menu", "sheet", "sheetClose", "sheetGrip", "addBtn", "addLabel",
    "scrim", "adventure", "advBackdrop", "advClose", "advTitle", "advDate", "advPhotos",
    "advAddPhoto", "advPhotoInput", "advNote", "advRemove", "autoFillBtn", "autoFillInput"]) {
    el[id] = document.getElementById(id);
  }
  buildMap();
  buildTray();
  wireEvents();
  data = await store.load();
  renderAll();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}

init();
