"use strict";

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

let statusTimer;
function announce(message) {
  clearTimeout(statusTimer);
  const status = document.querySelector("#status");
  status.textContent = message;
  statusTimer = setTimeout(() => { status.textContent = ""; }, 4500);
}

async function copyText(text, button) {
  let copied = false;
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch { /* Try the legacy clipboard path next. */ }
  }
  if (!copied) {
    const previousFocus = document.activeElement;
    const field = element("textarea");
    field.value = text;
    field.setAttribute("aria-label", "Temporary clipboard text");
    field.style.position = "fixed";
    field.style.left = "-9999px";
    document.body.append(field);
    field.select();
    try { copied = document.execCommand("copy"); } catch { copied = false; }
    field.remove();
    previousFocus?.focus({ preventScroll: true });
  }
  if (copied) {
    announce("Copied to clipboard.");
    const original = button.textContent;
    button.textContent = "Copied";
    button.disabled = true;
    setTimeout(() => {
      button.textContent = original;
      button.disabled = false;
    }, 1400);
  } else {
    const dialog = document.querySelector("#copy-dialog");
    const field = document.querySelector("#manual-copy");
    field.value = text;
    dialog.showModal();
    field.focus();
    field.select();
  }
}

function readStore(key) {
  try {
    const stored = localStorage.getItem(key);
    const value = stored ? JSON.parse(stored) : null;
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch { return null; }
}

function writeStore(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}

// Platform switch: detected by default; the choice is a per-browser convenience.
const OS_KEY = "tsp-getting-started-os-v1";
function setPlatform(os, remember) {
  document.documentElement.dataset.os = os;
  document.querySelectorAll("[data-os-choice]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.osChoice === os)));
  if (remember) writeStore(OS_KEY, { os });
}
function initPlatform() {
  const saved = readStore(OS_KEY)?.os;
  const detected = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "mac" : "win";
  setPlatform(saved === "mac" || saved === "win" ? saved : detected, false);
  document.addEventListener("click", event => {
    const button = event.target.closest("[data-os-choice]");
    if (button) setPlatform(button.dataset.osChoice, true);
  });
}

// Setup ticks: one value per key, mirrored wherever the same check appears.
const SETUP_KEY = "tsp-getting-started-setup-v1";
const setupSections = {
  install: ["vscode", "git", "python", "pydeps", "codex", "github"],
  ready: ["vscode", "git", "python", "pydeps", "codex", "github"]
};
let setupState = {};
function setupBoxes() { return [...document.querySelectorAll("input[data-setup]")]; }
function renderSetup() {
  setupBoxes().forEach(box => { box.checked = setupState[box.dataset.setup] === true; });
  const missing = setupSections.ready.filter(key => !setupState[key]).length;
  const status = document.querySelector("#ready-status");
  status.classList.toggle("is-complete", missing === 0);
  status.textContent = missing === 0
    ? "✓ Everything is ticked. Your computer is ready."
    : `${missing} of ${setupSections.ready.length} items still open.`;
  updateNavigation();
}
function initSetup() {
  setupState = readStore(SETUP_KEY) || {};
  setupBoxes().forEach(box => box.addEventListener("change", () => {
    setupState[box.dataset.setup] = box.checked;
    writeStore(SETUP_KEY, setupState);
    renderSetup();
  }));
  document.querySelector("#reset-setup").addEventListener("click", () => {
    setupState = {};
    writeStore(SETUP_KEY, setupState);
    renderSetup();
    announce("Ticks cleared.");
  });
}

// Repository name, derived as the Framework's Solution Identity Contract describes:
// <CLIENT>_<SOLUTION-ID>_<SHORT-DESCRIPTION>, case preserved, at most 100 characters.
const IDENTIFIER = /^[A-Za-z0-9](?:[A-Za-z0-9_.-]*[A-Za-z0-9_-])?$/;
function shortDescription(name) {
  return name.normalize("NFKD").replace(/[^\x00-\x7F]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function initRepositoryName() {
  const inputs = ["#client-input", "#solution-input", "#name-input"].map(selector => document.querySelector(selector));
  const [clientInput, solutionInput, nameInput] = inputs;
  const output = document.querySelector("#repo-name");
  const status = document.querySelector("#repo-name-status");
  const placeholder = output.textContent;
  const example = status.innerHTML;
  function show(message, state) {
    status.textContent = message;
    status.classList.remove("is-error", "is-ok");
    if (state) status.classList.add(state);
  }
  function update() {
    inputs.forEach(input => input.removeAttribute("aria-invalid"));
    const client = clientInput.value.trim();
    const solution = solutionInput.value.trim();
    const description = shortDescription(nameInput.value);
    output.textContent = placeholder;
    if (!client && !solution && !nameInput.value.trim()) {
      status.innerHTML = example;
      status.classList.remove("is-error", "is-ok");
      return;
    }
    for (const [input, value, label] of [[clientInput, client, "Client"], [solutionInput, solution, "Solution ID"]]) {
      if (value && !IDENTIFIER.test(value)) {
        input.setAttribute("aria-invalid", "true");
        show(`${label}: use only letters, numbers, dots, _ or -. Start with a letter or number. No spaces.`, "is-error");
        return;
      }
    }
    if (!client || !solution || !description) {
      show("Fill in all three fields.", null);
      return;
    }
    const name = `${client}_${solution}_${description}`;
    if (name.length > 100) {
      nameInput.setAttribute("aria-invalid", "true");
      show(`This name has ${name.length} characters. The maximum is 100. Use a shorter solution name.`, "is-error");
      return;
    }
    output.textContent = name;
    show("Use this exact name on GitHub. Give Codex the same Client, Solution ID and solution name.", "is-ok");
  }
  inputs.forEach(input => input.addEventListener("input", update));
  update();
}

// Progress: current step from scroll position; ✓ for ticked setup steps and passed orientation steps.
const visited = new Set();
let navLinks = [];
let navSections = [];
function stepDone(step) {
  if (setupSections[step]) return setupSections[step].every(key => setupState[key]);
  if (step === "welcome" || step === "workflow") return visited.has(step);
  return false;
}
let navUpdatePending = false;
function updateNavigation() {
  if (!navSections.length) return;
  let current = navSections[0];
  navSections.forEach(section => {
    if (section.getBoundingClientRect().top <= window.innerHeight * 0.3) current = section;
  });
  const index = navSections.indexOf(current);
  navSections.slice(0, index).forEach(section => visited.add(section.id));
  navLinks.forEach(link => {
    const step = link.dataset.step;
    if (step === current.id) link.setAttribute("aria-current", "step");
    else link.removeAttribute("aria-current");
    if (stepDone(step)) link.dataset.state = "done";
    else delete link.dataset.state;
  });
  const items = [...document.querySelectorAll("#guide-nav > *")];
  const active = document.querySelector(`#guide-nav a[data-step="${current.id}"]`);
  const part = items.slice(0, items.indexOf(active)).reverse().find(node => node.classList.contains("nav-label"));
  document.querySelector("#mobile-part").textContent = part ? part.firstChild.textContent.trim().toLowerCase() : "";
  document.querySelector("#mobile-step").textContent = active ? active.textContent.trim().replace(/\s+/g, " ") : "";
  navUpdatePending = false;
}
function scheduleNavigationUpdate() {
  if (navUpdatePending) return;
  navUpdatePending = true;
  requestAnimationFrame(updateNavigation);
}
function initNavigation() {
  const mobileNav = document.querySelector("#guide-nav").cloneNode(true);
  mobileNav.id = "guide-nav-mobile";
  mobileNav.setAttribute("aria-label", "Guide progress (compact)");
  const slot = document.querySelector("#mobile-nav-slot");
  slot.append(mobileNav, document.querySelector(".sidebar .os-switch").cloneNode(true));
  slot.addEventListener("click", event => {
    if (event.target.closest("a")) document.querySelector("#mobile-progress").open = false;
  });
  navLinks = [...document.querySelectorAll("#guide-nav a, #guide-nav-mobile a")];
  navSections = [...document.querySelectorAll("#guide-nav a")].map(link => document.querySelector(link.hash));
  window.addEventListener("scroll", scheduleNavigationUpdate, { passive: true });
  window.addEventListener("resize", scheduleNavigationUpdate);
}

initNavigation();
initPlatform();
initSetup();
renderSetup();
initRepositoryName();

document.addEventListener("click", event => {
  const button = event.target.closest("[data-copy]");
  if (button) copyText(document.getElementById(button.dataset.copy).textContent, button);
});
document.querySelector("#close-copy-dialog").addEventListener("click", () => document.querySelector("#copy-dialog").close());
