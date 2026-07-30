// ==========================================================================
// app.js — application bootstrap. Builds the shell (header / side nav /
// tab bar), wires the router to page modules, and registers the service
// worker so the whole thing keeps working with no network at all.
// ==========================================================================

import { icon } from "./lib/icons.js";
import { route, notFound, startRouter, navigate, getCurrentPath } from "./lib/router.js";
import { initSettings } from "./lib/settings.js";
import { getSetting, setSetting } from "./lib/db.js";
import { qs, qsa } from "./lib/utils.js";

import { renderHome } from "./pages/home.js";
import { renderSurahs } from "./pages/surahs.js";
import { renderSurahDetail } from "./pages/reader.js";
import { renderJuz, renderJuzDetail } from "./pages/juz.js";
import { renderHizb, renderHizbDetail } from "./pages/hizb.js";
import { renderPages, renderPageDetail } from "./pages/mushaf-pages.js";
import { renderSearch } from "./pages/search.js";
import { renderBookmarks } from "./pages/bookmarks.js";
import { renderNotes } from "./pages/notes.js";
import { renderSettingsPage } from "./pages/settings.js";
import { renderAbout } from "./pages/about.js";

const NAV_ITEMS = [
  { path: "/", label: "الرئيسية", icon: "home" },
  { path: "/surahs", label: "السور", icon: "book" },
  { path: "/juz", label: "الأجزاء", icon: "layers" },
  { path: "/hizb", label: "الأحزاب", icon: "grid" },
  { path: "/pages", label: "الصفحات", icon: "book" },
  { path: "/search", label: "بحث", icon: "search" },
  { path: "/bookmarks", label: "العلامات المرجعية", icon: "bookmark" },
  { path: "/notes", label: "الملاحظات", icon: "note" },
  { path: "/settings", label: "الإعدادات", icon: "settings" },
  { path: "/about", label: "حول التطبيق", icon: "info" },
];

const TAB_ITEMS = ["/", "/surahs", "/search", "/bookmarks", "/settings"];

function buildShell() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <a href="#main" class="skip-link">تخطَّ إلى المحتوى</a>
    <div class="side-nav__scrim" data-role="scrim"></div>
    <nav class="side-nav" data-role="side-nav" aria-label="التنقل الرئيسي">
      <div class="side-nav__top">
        <a class="app-header__brand" style="margin-bottom:0;" href="#/" aria-label="الذهاب إلى الصفحة الرئيسية">
          ${icon("star")}<span class="brand-text">مَوَدَّةُ القُرْآنِ</span>
        </a>
        <button class="btn-icon side-nav__collapse-btn" data-role="nav-collapse" aria-label="طي الشريط الجانبي" title="طي الشريط الجانبي">
          ${icon("chevronRight")}
        </button>
        <button class="btn-icon side-nav__close-btn" data-role="nav-close" aria-label="إغلاق القائمة" title="إغلاق القائمة">
          ${icon("close")}
        </button>
      </div>
      ${NAV_ITEMS.map(
        (item) => `
        <a class="side-nav__link" href="#${item.path}" data-path="${item.path}">
          ${icon(item.icon)}<span>${item.label}</span>
        </a>`
      ).join("")}
    </nav>
    <header class="app-header">
      <button class="menu-btn menu-btn--drawer" data-role="menu-toggle" aria-label="فتح القائمة" aria-expanded="false">
        ${icon("menu")}
      </button>
      <button class="btn-icon side-nav__expand-btn" data-role="nav-expand" aria-label="توسيع الشريط الجانبي" title="توسيع الشريط الجانبي" style="transform:scaleX(-1);">
        ${icon("chevronRight")}
      </button>
<a class="app-header__brand" href="#/" aria-label="الذهاب إلى الصفحة الرئيسية">
        ${icon("star")}<span class="brand-text"> مَوَدَّةُ القُرْآنِ</span>
      </a>
      <div class="app-header__actions">
        <a class="btn-icon" href="#/search" aria-label="بحث">${icon("search")}</a>
        <button class="btn-icon" data-role="theme-toggle" aria-label="تبديل المظهر">${icon("starOutline")}</button>
      </div>
    </header>
    <main id="main" tabindex="-1"></main>
    <nav class="tab-bar" aria-label="التنقل الرئيسي المختصر">
      ${TAB_ITEMS.map((path) => {
        const item = NAV_ITEMS.find((n) => n.path === path);
        return `<a class="tab-bar__item" href="#${path}" data-path="${path}">${icon(item.icon)}<span>${item.label}</span></a>`;
      }).join("")}
    </nav>
  `;

  qs('[data-role="menu-toggle"]').addEventListener("click", () => {
    const nav = qs('[data-role="side-nav"]');
    const scrim = qs('[data-role="scrim"]');
    const willOpen = !nav.classList.contains("is-open");
    nav.classList.toggle("is-open", willOpen);
    scrim.classList.toggle("is-open", willOpen);
    qs('[data-role="menu-toggle"]').setAttribute("aria-expanded", String(willOpen));
  });
  qs('[data-role="scrim"]').addEventListener("click", () => {
    qs('[data-role="side-nav"]').classList.remove("is-open");
    qs('[data-role="scrim"]').classList.remove("is-open");
  });
  qs('[data-role="nav-close"]').addEventListener("click", () => {
    qs('[data-role="side-nav"]').classList.remove("is-open");
    qs('[data-role="scrim"]').classList.remove("is-open");
    qs('[data-role="menu-toggle"]').setAttribute("aria-expanded", "false");
  });

  qs('[data-role="theme-toggle"]').addEventListener("click", async () => {
    const { applyTheme, THEMES } = await import("./lib/settings.js");
    const cyclable = THEMES.filter((t) => t !== "custom");
    const current = document.documentElement.getAttribute("data-theme") || "light";
    const next = cyclable[(cyclable.indexOf(current) + 1) % cyclable.length];
    await applyTheme(next);
    const { showToast } = await import("./lib/utils.js");
    const { THEME_LABELS_AR } = await import("./lib/settings.js");
    showToast(`المظهر: ${THEME_LABELS_AR[next] || next}`);
  });

  qs('[data-role="nav-collapse"]').addEventListener("click", () => setNavCollapsed(true));
  qs('[data-role="nav-expand"]').addEventListener("click", () => setNavCollapsed(false));
}

function setNavCollapsed(collapsed) {
  document.getElementById("app").classList.toggle("nav-collapsed", collapsed);
  setSetting("sideNavCollapsed", collapsed);
}

async function restoreNavCollapsed() {
  const collapsed = await getSetting("sideNavCollapsed", false);
  document.getElementById("app").classList.toggle("nav-collapsed", collapsed);
}

function highlightActiveNav() {
  const path = getCurrentPath();
  const topLevel = "/" + (path.split("/")[1] || "");
  qsa("[data-path]").forEach((linkEl) => {
    linkEl.classList.toggle("is-active", linkEl.dataset.path === (topLevel === "/" ? "/" : topLevel));
  });
  // Close mobile drawer on navigation
  qs('[data-role="side-nav"]')?.classList.remove("is-open");
  qs('[data-role="scrim"]')?.classList.remove("is-open");
}

function mountView(html) {
  const main = document.getElementById("main");
  main.innerHTML = `<div class="container view-enter">${html}</div>`;
  return main;
}

function registerRoutes() {
  route("/", async () => {
    mountView(`<div data-slot="home"></div>`);
    await renderHome(qs('[data-slot="home"]'));
    highlightActiveNav();
  });

  route("/surahs", async () => {
    mountView(`<div data-slot="surahs"></div>`);
    await renderSurahs(qs('[data-slot="surahs"]'));
    highlightActiveNav();
  });

  route("/surah/:number", async (params) => {
    mountView(`<div data-slot="reader"></div>`);
    const cleanup = await renderSurahDetail(qs('[data-slot="reader"]'), Number(params.number));
    highlightActiveNav();
    return cleanup;
  });

  route("/juz", async () => {
    mountView(`<div data-slot="juz"></div>`);
    await renderJuz(qs('[data-slot="juz"]'));
    highlightActiveNav();
  });

  route("/juz/:number", async (params) => {
    mountView(`<div data-slot="juz-detail"></div>`);
    await renderJuzDetail(qs('[data-slot="juz-detail"]'), Number(params.number));
    highlightActiveNav();
  });

  route("/hizb", async () => {
    mountView(`<div data-slot="hizb"></div>`);
    await renderHizb(qs('[data-slot="hizb"]'));
    highlightActiveNav();
  });

  route("/hizb/:number", async (params) => {
    mountView(`<div data-slot="hizb-detail"></div>`);
    await renderHizbDetail(qs('[data-slot="hizb-detail"]'), Number(params.number));
    highlightActiveNav();
  });

  route("/pages", async () => {
    mountView(`<div data-slot="pages"></div>`);
    await renderPages(qs('[data-slot="pages"]'));
    highlightActiveNav();
  });

  route("/page/:number", async (params) => {
    mountView(`<div data-slot="page-detail"></div>`);
    const cleanup = await renderPageDetail(qs('[data-slot="page-detail"]'), Number(params.number));
    highlightActiveNav();
    return cleanup;
  });

  route("/search", async (params, query) => {
    mountView(`<div data-slot="search"></div>`);
    await renderSearch(qs('[data-slot="search"]'), query.get("q") || "");
    highlightActiveNav();
  });

  route("/bookmarks", async () => {
    mountView(`<div data-slot="bookmarks"></div>`);
    await renderBookmarks(qs('[data-slot="bookmarks"]'));
    highlightActiveNav();
  });

  route("/notes", async () => {
    mountView(`<div data-slot="notes"></div>`);
    await renderNotes(qs('[data-slot="notes"]'));
    highlightActiveNav();
  });

  route("/settings", async () => {
    mountView(`<div data-slot="settings"></div>`);
    await renderSettingsPage(qs('[data-slot="settings"]'));
    highlightActiveNav();
  });

  route("/about", async () => {
    mountView(`<div data-slot="about"></div>`);
    await renderAbout(qs('[data-slot="about"]'));
    highlightActiveNav();
  });

  notFound(() => {
    mountView(`
      <div class="empty-state">
        ${icon("starOutline")}
        <h2>الصفحة غير موجودة</h2>
        <p>هذه الصفحة غير موجودة. جرِّب العودة إلى الصفحة الرئيسية.</p>
        <a class="btn btn-primary" href="#/">الذهاب إلى الرئيسية</a>
      </div>
    `);
  });
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    // scope './' keeps this working when the app is hosted in a subfolder
    await navigator.serviceWorker.register("service-worker.js");
  } catch (err) {
    console.warn("Service worker registration failed:", err);
  }
}

function setupInstallPrompt() {
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.querySelector('[data-role="install-btn"]');
    if (btn) btn.hidden = false;
  });
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest('[data-role="install-btn"]');
    if (!btn || !deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    btn.hidden = true;
  });
}

async function main() {
  buildShell();
  await initSettings();
  await restoreNavCollapsed();
  registerRoutes();
  startRouter();
  setupInstallPrompt();
  await registerServiceWorker();
  window.addEventListener("hashchange", highlightActiveNav);
}

main();