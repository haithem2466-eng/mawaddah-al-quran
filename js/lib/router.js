// ==========================================================================
// router.js — tiny hash router. No history-API dependency, so it works
// fully offline and from a file:// or any static host without server config.
// ==========================================================================

import { showToast } from "./utils.js";

const routes = [];
let notFoundHandler = () => {};
let currentCleanup = null;

// Paths that count as "the last stop" — pressing back from here should ask
// for confirmation instead of letting the wrapped Android app close instantly.
const ROOT_PATHS = new Set(["/", ""]);

let exitArmed = false;
let exitArmTimer = null;

function isRootPath(path) {
  return ROOT_PATHS.has(path);
}

// Guards the hardware/APK back button so a single press never closes the
// whole app unless the user is already on the home screen and confirms by
// pressing back a second time within 2 seconds.
function armBackGuard() {
  exitArmed = true;
  showToast("اضغط رجوع مرة أخرى للخروج من التطبيق");
  // Re-push a history entry so the WebView wrapper (which usually calls
  // canGoBack()/goBack() on the native back button) still finds something
  // to "go back" to on the next press, instead of exiting immediately.
  try {
    history.pushState({ __backGuard: true }, "", location.href);
  } catch { /* no-op if history API unavailable */ }
  clearTimeout(exitArmTimer);
  exitArmTimer = setTimeout(() => {
    exitArmed = false;
  }, 2000);
}

function handlePopState() {
  const path = currentPath();
  if (isRootPath(path)) {
    if (!exitArmed) {
      armBackGuard();
    }
    // Second press within the window: we deliberately do nothing here, so
    // the next native back press has no extra entry to consume and the
    // wrapper app is allowed to actually close.
  } else {
    // User is somewhere inside the app — a normal back navigation already
    // happened (hashchange re-rendered the previous screen). Reset the
    // guard so it only triggers again once they're back at the home screen.
    exitArmed = false;
    clearTimeout(exitArmTimer);
  }
}

export function route(pattern, handler) {
  // pattern like "/surah/:number"
  const paramNames = [];
  const regex = new RegExp(
    "^" +
      pattern.replace(/:[^/]+/g, (m) => {
        paramNames.push(m.slice(1));
        return "([^/]+)";
      }) +
      "$"
  );
  routes.push({ regex, paramNames, handler });
}

export function notFound(handler) {
  notFoundHandler = handler;
}

function currentPath() {
  const hash = location.hash.slice(1) || "/";
  return hash.split("?")[0];
}

function currentQuery() {
  const hash = location.hash.slice(1);
  const qIndex = hash.indexOf("?");
  return new URLSearchParams(qIndex === -1 ? "" : hash.slice(qIndex + 1));
}

async function handle() {
  const path = currentPath();
  const query = currentQuery();
  if (typeof currentCleanup === "function") {
    try { currentCleanup(); } catch { /* noop */ }
    currentCleanup = null;
  }
  for (const r of routes) {
    const m = path.match(r.regex);
    if (m) {
      const params = {};
      r.paramNames.forEach((name, i) => (params[name] = m[i + 1]));
      const cleanup = await r.handler(params, query);
      if (typeof cleanup === "function") currentCleanup = cleanup;
      window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
      return;
    }
  }
  notFoundHandler();
}

export function navigate(path) {
  location.hash = path;
}

export function startRouter() {
  window.addEventListener("hashchange", handle);
  window.addEventListener("popstate", handlePopState);
  handle();
}

export function getCurrentPath() {
  return currentPath();
}