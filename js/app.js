// ---------------------------------------------------------------------------
// US States Tracker — main app logic
//
// A tap-to-fill map of the United States. Tap a state (on the map or in the
// list) to mark it visited; tap again to clear it. Everything is saved on the
// device via the storage layer. No account needed yet.
// ---------------------------------------------------------------------------
import { US_VIEWBOX, US_OUTLINE, US_BORDERS, US_STATES } from "./us-geo.js";
import { createStore, emptyData } from "./storage.js";

const store = createStore();

// DC is on the map and visitable, but the cultural target is "the 50 states,"
// so it doesn't count toward the X / 50 total or the percentage.
const STATES_50 = US_STATES.filter((s) => s.code !== "DC");
const TOTAL = STATES_50.length; // 50
const byCode = Object.fromEntries(US_STATES.map((s) => [s.code, s]));

let data = emptyData(); // in-memory copy of what's saved
let selected = null; // currently highlighted state code

// --- element handles (assigned in init) --------------------------------------
const el = {};

// --- persistence helper: save the current in-memory data ---------------------
let saveTimer = null;
function persist({ immediate = false } = {}) {
  clearTimeout(saveTimer);
  const run = () => store.save(data).catch(() => flashToast("Couldn't save — is storage full?"));
  if (immediate) run();
  else saveTimer = setTimeout(run, 250); // debounce rapid taps / typing
}

// --- state mutations ---------------------------------------------------------
function isVisited(code) {
  return Object.prototype.hasOwnProperty.call(data.visited, code);
}

function setVisited(code, visited, { silent = false } = {}) {
  if (!byCode[code]) return;
  if (visited && !isVisited(code)) {
    data.visited[code] = { date: null };
  } else if (!visited && isVisited(code)) {
    delete data.visited[code];
  }
  persist();
  if (!silent) render();
}

function toggle(code) {
  const nowVisited = !isVisited(code);
  setVisited(code, nowVisited, { silent: true });
  selected = code;
  render();
  if (nowVisited) pulse(code);
}

function setDate(code, date) {
  if (!isVisited(code)) data.visited[code] = { date: null };
  data.visited[code].date = date || null;
  persist();
  renderDetail();
}

function setName(name) {
  data.travelerName = name;
  persist();
  renderHeader();
}

// --- rendering ---------------------------------------------------------------
function render() {
  renderHeader();
  renderMap();
  renderChips();
  renderDetail();
}

function visitedCount() {
  return STATES_50.reduce((n, s) => n + (isVisited(s.code) ? 1 : 0), 0);
}

function renderHeader() {
  const count = visitedCount();
  const pct = Math.round((count / TOTAL) * 100);
  el.count.textContent = String(count);
  el.percent.textContent = `${pct}%`;
  el.progressBar.style.width = `${pct}%`;
  el.progressBar.parentElement.setAttribute("aria-valuenow", String(count));
  const dcNote = isVisited("DC") ? " + DC" : "";
  el.countNote.textContent = dcNote;
  if (document.activeElement !== el.name) el.name.value = data.travelerName;
  // Encouraging little milestone line.
  el.milestone.textContent =
    count === 0 ? "Tap a state to begin the map."
    : count === TOTAL ? "🎉 All 50 states — the whole map is full!"
    : `${TOTAL - count} to go.`;
}

function renderMap() {
  for (const path of el.svg.querySelectorAll("path.state")) {
    const code = path.dataset.code;
    const visited = isVisited(code);
    path.classList.toggle("is-visited", visited);
    path.classList.toggle("is-selected", code === selected);
    path.setAttribute("aria-pressed", String(visited));
  }
}

function renderChips() {
  const q = el.search.value.trim().toLowerCase();
  for (const chip of el.chips.children) {
    const code = chip.dataset.code;
    const s = byCode[code];
    const visited = isVisited(code);
    chip.classList.toggle("is-visited", visited);
    chip.classList.toggle("is-selected", code === selected);
    chip.setAttribute("aria-pressed", String(visited));
    const match = !q || s.name.toLowerCase().includes(q) || code.toLowerCase().includes(q);
    chip.hidden = !match;
  }
}

function renderDetail() {
  if (!selected) {
    el.detail.hidden = true;
    return;
  }
  const s = byCode[selected];
  const visited = isVisited(selected);
  el.detail.hidden = false;
  el.detailName.textContent = s.name + (selected === "DC" ? " (bonus)" : "");
  el.detailToggle.textContent = visited ? "Visited ✓" : "Mark visited";
  el.detailToggle.classList.toggle("is-visited", visited);
  el.detailToggle.setAttribute("aria-pressed", String(visited));
  el.dateRow.hidden = !visited;
  el.dateInput.value = (visited && data.visited[selected].date) || "";
}

// Brief "fill" animation when a state is newly marked.
function pulse(code) {
  const path = el.svg.querySelector(`path.state[data-code="${code}"]`);
  if (!path) return;
  path.classList.remove("pulse");
  void path.getBoundingClientRect(); // restart animation
  path.classList.add("pulse");
}

let toastTimer = null;
function flashToast(msg) {
  el.toast.textContent = msg;
  el.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove("show"), 2600);
}

// --- one-time DOM construction ----------------------------------------------
function buildMap() {
  const labels = US_STATES.filter((s) => s.big)
    .map((s) => `<text class="label" x="${s.labelX}" y="${s.labelY}">${s.code}</text>`)
    .join("");
  const states = US_STATES.map(
    (s) =>
      `<path class="state" data-code="${s.code}" d="${s.d}" tabindex="0" ` +
      `role="button" aria-pressed="false" aria-label="${s.name}">` +
      `<title>${s.name}</title></path>`
  ).join("");
  el.svg.setAttribute("viewBox", US_VIEWBOX);
  el.svg.innerHTML =
    `<path class="outline" d="${US_OUTLINE}" />` +
    `<g class="states">${states}</g>` +
    `<path class="borders" d="${US_BORDERS}" />` +
    `<g class="labels">${labels}</g>`;
}

function buildChips() {
  el.chips.innerHTML = US_STATES.map(
    (s) =>
      `<button type="button" class="chip" data-code="${s.code}" aria-pressed="false">` +
      `<span class="chip-code">${s.code}</span>` +
      `<span class="chip-name">${s.name}</span></button>`
  ).join("");
}

// --- backup / restore --------------------------------------------------------
function exportData() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const who = data.travelerName ? data.travelerName.replace(/[^\w-]+/g, "-") + "-" : "";
  a.href = url;
  a.download = `${who}us-states-backup.json`;
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
      selected = null;
      persist({ immediate: true });
      render();
      flashToast("Backup restored.");
    } catch {
      flashToast("That file didn't look like a backup.");
    }
  };
  reader.readAsText(file);
}

function resetAll() {
  const n = visitedCount();
  if (n > 0 && !confirm(`Clear all ${n} filled-in states? This can't be undone.`)) return;
  data = emptyData();
  selected = null;
  persist({ immediate: true });
  render();
}

// --- events ------------------------------------------------------------------
function wireEvents() {
  // Map: click or keyboard-activate a state.
  const activateFromEvent = (e) => {
    const path = e.target.closest("path.state");
    if (!path) return;
    e.preventDefault();
    toggle(path.dataset.code);
  };
  el.svg.addEventListener("click", activateFromEvent);
  el.svg.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") activateFromEvent(e);
  });

  // Chips.
  el.chips.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (chip) toggle(chip.dataset.code);
  });

  el.search.addEventListener("input", renderChips);

  // Detail card.
  el.detailToggle.addEventListener("click", () => selected && toggle(selected));
  el.dateInput.addEventListener("change", () => selected && setDate(selected, el.dateInput.value));
  el.detailClose.addEventListener("click", () => {
    selected = null;
    render();
  });

  // Name.
  el.name.addEventListener("input", () => setName(el.name.value));

  // Menu actions.
  el.exportBtn.addEventListener("click", exportData);
  el.resetBtn.addEventListener("click", resetAll);
  el.importBtn.addEventListener("click", () => el.importInput.click());
  el.importInput.addEventListener("change", () => {
    if (el.importInput.files[0]) importData(el.importInput.files[0]);
    el.importInput.value = "";
  });

  // Install-to-home-screen prompt (Android/desktop Chrome).
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    el.installBtn.hidden = false;
  });
  el.installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    el.installBtn.hidden = true;
  });
}

// --- boot --------------------------------------------------------------------
async function init() {
  const ids = [
    "svg", "count", "countNote", "percent", "progressBar", "milestone", "name",
    "chips", "search", "detail", "detailName", "detailToggle", "detailClose",
    "dateRow", "dateInput", "toast", "exportBtn", "importBtn", "importInput",
    "resetBtn", "installBtn",
  ];
  for (const id of ids) el[id] = document.getElementById(id);

  buildMap();
  buildChips();
  wireEvents();

  data = await store.load();
  render();

  // Register the service worker so the app works offline / installs.
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }
}

init();
