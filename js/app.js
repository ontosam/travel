// ---------------------------------------------------------------------------
// Fill Your Map — drag a state's sticker onto its outline to fill it in.
//
// Three ways to place a sticker (all end up in the same place):
//   • Drag it from the tray onto the matching state.
//   • Tap the sticker, then tap its state (great on phones / keyboards).
//   • Tap an empty state to jump to its sticker in the tray.
// Tap a filled-in state to peel its sticker back off.
// ---------------------------------------------------------------------------
import { US_VIEWBOX, US_OUTLINE, US_BORDERS, US_STATES } from "./us-geo.js";
import { mapSceneGroup, stickerSVG } from "./scenes.js";
import { createStore, emptyData } from "./storage.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const store = createStore();

const STATES_50 = US_STATES.filter((s) => s.code !== "DC");
const TOTAL = STATES_50.length; // 50
const byCode = Object.fromEntries(US_STATES.map((s) => [s.code, s]));
const name = (code) => byCode[code]?.name ?? code;
const sortedStates = [...US_STATES].sort((a, b) => a.name.localeCompare(b.name));

let data = emptyData();
let drag = null;          // active pointer-drag session
let selectedSticker = null; // tap-to-place selection
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
function addFill(code) {
  if (el.fills.querySelector(`.fill[data-code="${code}"]`)) return;
  const g = document.createElementNS(SVG_NS, "g");
  g.setAttribute("class", "fill");
  g.dataset.code = code;
  g.innerHTML = mapSceneGroup(byCode[code]);
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
  el.percent.textContent = `${pct}%`;
  el.progressBar.style.width = `${pct}%`;
  el.progressBar.parentElement.setAttribute("aria-valuenow", String(n));
  el.countNote.textContent = isPlaced("DC") ? " + DC" : "";
  if (document.activeElement !== el.name) el.name.value = data.travelerName;
  el.milestone.textContent =
    n === 0 ? "Drag a sticker from below onto its outline."
    : n === TOTAL ? "🎉 The whole map is full — every state visited!"
    : `${TOTAL - n} to go.`;
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
  el.trayLeft.textContent = left ? `· ${left} left` : "";
  el.trayEmpty.hidden = left !== 0;
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

// --- drag & drop (pointer events: mouse + touch) -----------------------------
function startGhost(code, x, y) {
  const ghost = document.createElement("div");
  ghost.className = "sticker-ghost";
  ghost.innerHTML = stickerSVG(byCode[code]);
  document.body.appendChild(ghost);
  document.body.classList.add("is-dragging");
  el.svg.querySelector(`path.state[data-code="${code}"]`)?.classList.add("is-target");
  moveGhost(ghost, x, y);
  return ghost;
}
function moveGhost(ghost, x, y) {
  ghost.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
}
function clearDrag() {
  if (drag?.ghost) drag.ghost.remove();
  document.body.classList.remove("is-dragging");
  el.svg.querySelector("path.state.is-target")?.classList.remove("is-target");
  drag = null;
}
function stateUnder(x, y) {
  return document.elementFromPoint(x, y)?.closest?.("path.state") || null;
}

// Pointer-down starts a *potential* drag on a tray item. The move/up listeners
// live on `window` (see wireEvents) so events keep flowing once the pointer
// leaves the tray and travels across the map — no pointer-capture needed.
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
  el.svg.querySelector("path.state.is-target")?.classList.remove("is-target");
  if (selectedSticker) {
    el.svg.querySelector(`path.state[data-code="${code}"]`)?.classList.add("is-target");
    toast(`Now tap ${name(code)} on the map.`);
  }
  renderTray();
}
function clearSelection() {
  selectedSticker = null;
  el.svg.querySelector("path.state.is-target")?.classList.remove("is-target");
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
  if (isPlaced(code)) removeSticker(code);
  else flashSticker(code); // help find its sticker in the tray
}

function flashSticker(code) {
  el.search.value = "";
  renderTray();
  const item = el.tray.querySelector(`.tray-item[data-code="${code}"]`);
  if (!item) return;
  item.scrollIntoView({ block: "nearest", behavior: "smooth" });
  item.classList.remove("flash");
  void item.getBoundingClientRect();
  item.classList.add("flash");
  toast(`Find the ${name(code)} sticker below.`);
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

  el.search.addEventListener("input", renderTray);
  el.name.addEventListener("input", () => { data.travelerName = el.name.value; persist(); });

  el.exportBtn.addEventListener("click", exportData);
  el.resetBtn.addEventListener("click", resetAll);
  el.importBtn.addEventListener("click", () => el.importInput.click());
  el.importInput.addEventListener("change", () => {
    if (el.importInput.files[0]) importData(el.importInput.files[0]);
    el.importInput.value = "";
  });

  // Esc cancels a pending tap-selection.
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && selectedSticker) clearSelection(); });

  // Install to home screen (Android/desktop Chrome).
  let deferred = null;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; el.installBtn.hidden = false; });
  el.installBtn.addEventListener("click", async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    deferred = null;
    el.installBtn.hidden = true;
  });
}

// --- boot --------------------------------------------------------------------
async function init() {
  for (const id of ["svg", "name", "count", "countNote", "percent", "progressBar", "milestone",
    "tray", "trayLeft", "trayEmpty", "search", "toast", "exportBtn", "importBtn", "importInput",
    "resetBtn", "installBtn"]) {
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
