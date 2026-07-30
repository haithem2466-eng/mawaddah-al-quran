// ==========================================================================
// page-reader.js — mushaf-style reader, in two selectable modes (see
// settings.js: reader.readingMode):
//   - "paged"  (default): shows exactly one real mushaf page at a time,
//              with swipe/arrow navigation and the page number printed at
//              the bottom, like a printed Mus-haf.
//   - "scroll": pages stack one below another and load continuously as
//              the person scrolls up/down, like a long continuous document.
// Shared by the /surah/:number route (reader.js) and the /page/:number
// route (mushaf-pages.js): both just resolve a starting page number and
// hand off here.
// ==========================================================================

import { icon } from "../lib/icons.js";
import { loadPage, revelationTypeAr, TOTAL_PAGES } from "../lib/data.js";
import { toggleBookmark, isBookmarked, getNote, saveNote, saveLastRead } from "../lib/db.js";
import { copyText, shareText, qs, qsa, el } from "../lib/utils.js";
import { loadReaderSettings } from "../lib/settings.js";

const NO_BASMALAH_SURAH = 9; // At-Tawbah conventionally opens without the Bismillah.
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function toArabicDigits(n) {
  return String(n).replace(/[0-9]/g, (d) => AR_DIGITS[d]);
}

function ayahRowHtml(surahNumber, a, isBookmarkedFlag) {
  return `
    <span class="ayah${a.sajdah ? " has-sajdah" : ""}" id="ayah-${a.number}" data-surah="${surahNumber}" data-ayah="${a.number}">
      <span class="ayah__text">${a.text_uthmani}</span>
      <span class="ayah__marker">
        <button type="button" class="ayah__number-badge" data-role="marker" aria-haspopup="true" aria-expanded="false" aria-label="الآية ${a.number} — خيارات">
          ${icon("starOutline")}<span>${a.number}</span>
        </button>
        <span class="ayah__popover" role="menu">
          <button class="btn-icon" data-action="copy" aria-label="نسخ الآية">${icon("copy")}</button>
          <button class="btn-icon" data-action="share" aria-label="مشاركة الآية">${icon("share")}</button>
          <button class="btn-icon ${isBookmarkedFlag ? "is-active" : ""}" data-action="bookmark" aria-label="حفظ الآية كعلامة مرجعية" aria-pressed="${isBookmarkedFlag}">
            ${icon(isBookmarkedFlag ? "bookmarkFilled" : "bookmark")}
          </button>
          <button class="btn-icon" data-action="note" aria-label="إضافة ملاحظة">${icon("note")}</button>
        </span>
      </span>
      ${a.sajdah ? `<span class="ayah__sajdah-icon" title="سجدة — موضع سجود">${icon("prostration")}</span>` : ""}
    </span>
  `;
}

// Groups consecutive ayahs by surah (a page can contain the tail of one
// surah and the head of the next).
function groupBySurah(entries, bookmarkFlags) {
  const groups = [];
  entries.forEach((e, i) => {
    const last = groups[groups.length - 1];
    if (last && last.surah.number === e.surah.number) {
      last.items.push({ ayah: e.ayah, bookmarked: bookmarkFlags[i] });
    } else {
      groups.push({ surah: e.surah, items: [{ ayah: e.ayah, bookmarked: bookmarkFlags[i] }] });
    }
  });
  return groups;
}

function groupsHtml(groups) {
  return groups
    .map((g) => {
      const startsSurah = g.items[0].ayah.number === 1;
      const banner = startsSurah
        ? `
        <div class="surah-banner">
          <span class="frame-corner frame-corner--tl">${icon("cornerFrame")}</span>
          <span class="frame-corner frame-corner--tr">${icon("cornerFrame")}</span>
          <span class="frame-corner frame-corner--bl">${icon("cornerFrame")}</span>
          <span class="frame-corner frame-corner--br">${icon("cornerFrame")}</span>
          <div class="surah-banner__name">${g.surah.name_arabic}</div>
          <div class="surah-banner__meta">${g.surah.number} · ${revelationTypeAr(g.surah.revelation_type)} · ${g.surah.ayah_count} آية</div>
        </div>
        ${g.surah.number !== 1 && g.surah.number !== NO_BASMALAH_SURAH ? `<div class="bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>` : ""}
      `
        : "";
      return `
        ${banner}
        <div class="ayah-flow">
          ${g.items.map((it) => ayahRowHtml(g.surah.number, it.ayah, it.bookmarked)).join("")}
        </div>
      `;
    })
    .join("");
}

// Renders one mushaf page as a self-contained section, complete with its
// own page-footer (juz + page-number badge), reused in both paged mode (one
// mounted at a time) and scroll mode (many stacked on top of each other).
async function pageSectionHtml(pageNumber) {
  const entries = await loadPage(pageNumber);
  if (!entries.length) {
    return {
      entries,
      html: `
        <section class="page-section" data-page="${pageNumber}">
          <div class="empty-state">${icon("info")}<h3>الصفحة ${toArabicDigits(pageNumber)}</h3><p>تعذّر تحميل بيانات هذه الصفحة.</p></div>
        </section>`,
    };
  }
  const bookmarkFlags = await Promise.all(entries.map((e) => isBookmarked(e.surah.number, e.ayah.number)));
  const groups = groupBySurah(entries, bookmarkFlags);
  const juz = entries[0]?.ayah.juz;
  const html = `
    <section class="page-section" data-page="${pageNumber}">
      ${groupsHtml(groups)}
      <div class="page-footer">
        <span class="page-footer__juz">${juz ? `الجزء ${toArabicDigits(juz)}` : ""}</span>
        <span class="page-footer__number">${toArabicDigits(pageNumber)}</span>
      </div>
    </section>`;
  return { entries, groups, html };
}

export async function renderPageReader(root, { initialPage = 1, highlightAyah = null } = {}) {
  const readerSettings = await loadReaderSettings();
  const mode = readerSettings.readingMode === "scroll" ? "scroll" : "paged";

  let currentPage = Math.min(TOTAL_PAGES, Math.max(1, Number(initialPage) || 1));
  let pendingHighlight = highlightAyah ? Number(highlightAyah) : null;
  // Every entry ever mounted, keyed by page number — used to look up the
  // surah/ayah objects behind a click, in either mode.
  const pageEntriesMap = new Map();

  root.innerHTML = `
    <div class="reader-toolbar" data-role="toolbar">
      <button type="button" class="btn-icon" data-role="prev-page" style="transform:scaleX(-1);" aria-label="الصفحة السابقة">${icon("chevronRight")}</button>
      <a class="btn-icon" href="#/pages" aria-label="كل الصفحات">${icon("grid")}</a>
      <span class="page-reader__context" data-role="context"></span>
      <a class="btn-icon" href="#/settings" aria-label="إعدادات القراءة">${icon("settings")}</a>
      <button type="button" class="btn-icon" data-role="next-page" aria-label="الصفحة التالية">${icon("chevronRight")}</button>
    </div>
    <div class="page-viewport" data-role="viewport">
      ${mode === "scroll" ? `<div class="scroll-sentinel" data-role="sentinel-top"></div>` : ""}
      <div class="reader" data-role="page-body"></div>
      ${mode === "scroll" ? `<div class="scroll-sentinel" data-role="sentinel-bottom"></div>` : ""}
    </div>
  `;

  const toolbarEl = qs('[data-role="toolbar"]', root);
  const bodyEl = qs('[data-role="page-body"]', root);
  const viewportEl = qs('[data-role="viewport"]', root);
  const contextEl = qs('[data-role="context"]', root);
  const prevBtn = qs('[data-role="prev-page"]', root);
  const nextBtn = qs('[data-role="next-page"]', root);

  // ---- Keep the screen awake while actively reading ----
  let wakeLock = null;
  async function requestWakeLock() {
    try {
      if ("wakeLock" in navigator) {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => {
          wakeLock = null;
        });
      }
    } catch {
      // Unsupported browser, battery saver mode, etc. — reading still works,
      // the screen will just be able to sleep as normal.
    }
  }
  async function releaseWakeLock() {
    try {
      await wakeLock?.release();
    } catch {
      /* noop */
    }
    wakeLock = null;
  }
  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") requestWakeLock();
  };
  document.addEventListener("visibilitychange", onVisibilityChange);
  requestWakeLock();

  function bindMarkers() {
    qsa('[data-role="marker"]', bodyEl).forEach((marker) => {
      marker.addEventListener("mouseenter", () => positionPopover(marker));
      marker.addEventListener("focus", () => positionPopover(marker));
    });
  }

  const POPOVER_EDGE_MARGIN = 8;
  function positionPopover(marker) {
    const popover = qs(".ayah__popover", marker.parentElement);
    if (!popover) return;
    const markerRect = marker.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const popoverWidth = popover.offsetWidth;
    const desiredCenterX = markerRect.left + markerRect.width / 2;
    let left = desiredCenterX - popoverWidth / 2;
    left = Math.max(POPOVER_EDGE_MARGIN, Math.min(left, viewportWidth - popoverWidth - POPOVER_EDGE_MARGIN));
    const arrowLeft = desiredCenterX - left; // px offset of the marker's center within the (possibly shifted) popover box
    popover.style.left = `${left}px`;
    popover.style.bottom = `${window.innerHeight - markerRect.top + 10}px`;
    popover.style.setProperty("--popover-arrow-left", `${arrowLeft}px`);
  }

  const onWindowResize = () => {
    const open = qs(".ayah.is-open", bodyEl);
    if (!open) return;
    const marker = qs('[data-role="marker"]', open);
    if (marker) positionPopover(marker);
  };
  window.addEventListener("resize", onWindowResize);

  function closeOpenPopover() {
    const open = qs(".ayah.is-open", bodyEl);
    if (!open) return;
    open.classList.remove("is-open");
    qs('[data-role="marker"]', open)?.setAttribute("aria-expanded", "false");
  }

  function findEntry(surahNumber, ayahNumber) {
    for (const entries of pageEntriesMap.values()) {
      const found = entries.find((en) => en.surah.number === surahNumber && en.ayah.number === ayahNumber);
      if (found) return found;
    }
    return null;
  }

  let saveTimer = null;
  function scheduleSaveLastRead(entries) {
    if (!entries.length) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveLastRead(entries[0].surah.number, entries[0].ayah.number), 500);
  }

  function applyHighlight(pageNumber) {
    if (!pendingHighlight) return;
    const sectionEl =
      mode === "scroll" ? qs(`.page-section[data-page="${pageNumber}"]`, bodyEl) : bodyEl;
    const targetEl = qs(`#ayah-${pendingHighlight}`, sectionEl || bodyEl);
    if (targetEl) {
      targetEl.classList.add("is-highlighted");
      requestAnimationFrame(() =>
        targetEl.scrollIntoView({ block: "center", behavior: "instant" in window ? "instant" : "auto" })
      );
      setTimeout(() => targetEl.classList.remove("is-highlighted"), 2600);
      pendingHighlight = null;
    }
  }

  // ==========================================================================
  // PAGED MODE — one page mounted at a time, swipe/arrow-key/button nav.
  // ==========================================================================
  async function renderPagedCurrentPage() {
    pageEntriesMap.clear();
    const { entries, groups, html } = await pageSectionHtml(currentPage);
    pageEntriesMap.set(currentPage, entries);

    bodyEl.innerHTML = html;
    bindMarkers();
    // The window itself is what scrolls in this layout (.page-viewport has
    // no overflow of its own), so a page turn has to reset the window's
    // scroll position, not the viewport div's (that would be a no-op).
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });

    const names = groups ? [...new Set(groups.map((g) => g.surah.name_arabic))] : [];
    contextEl.textContent = names.join(" · ");

    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= TOTAL_PAGES;

    applyHighlight(currentPage);
    scheduleSaveLastRead(entries);
  }

  function goToPage(target, direction) {
    const next = Math.min(TOTAL_PAGES, Math.max(1, target));
    if (next === currentPage) return;
    currentPage = next;
    closeOpenPopover();
    viewportEl.classList.remove("page-turn-next", "page-turn-prev");
    void viewportEl.offsetWidth; // reflow so the animation restarts every turn
    viewportEl.classList.add(direction === "next" ? "page-turn-next" : "page-turn-prev");
    renderPagedCurrentPage();
  }

  // ---- Swipe navigation: swipe right → previous page, swipe left → next
  // page (matches flipping pages in a printed, right-to-left mushaf). ----
  let touchStartX = null;
  let touchStartY = null;
  const SWIPE_MIN_DISTANCE = 45;
  function onTouchStart(e) {
    if (e.touches.length !== 1) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
  function onTouchEnd(e) {
    if (touchStartX === null) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    touchStartX = null;
    touchStartY = null;
    if (Math.abs(dx) < SWIPE_MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    if (dx > 0) goToPage(currentPage - 1, "prev");
    else goToPage(currentPage + 1, "next");
  }

  // ---- Keyboard: → previous page, ← next page (paged mode only) ----
  const onKeydownPaged = (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (e.key === "Escape") {
      closeOpenPopover();
    } else if (e.key === "ArrowRight") {
      goToPage(currentPage - 1, "prev");
    } else if (e.key === "ArrowLeft") {
      goToPage(currentPage + 1, "next");
    }
  };

  // ==========================================================================
  // SCROLL MODE — pages stack vertically and mount continuously as the
  // person scrolls up or down, like a long continuous document.
  // ==========================================================================
  let minLoaded = currentPage;
  let maxLoaded = currentPage;
  let activePage = currentPage;
  let loadingNext = false;
  let loadingPrev = false;
  let scrollObserver = null;
  let sentinelTopEl = null;
  let sentinelBottomEl = null;

  function updateScrollNavButtons() {
    prevBtn.disabled = activePage <= 1;
    nextBtn.disabled = activePage >= TOTAL_PAGES;
  }

  function updateActivePage(pageNumber) {
    if (pageNumber === activePage) return;
    activePage = pageNumber;
    const entries = pageEntriesMap.get(pageNumber) || [];
    const names = [...new Set(entries.map((e) => e.surah.name_arabic))];
    contextEl.textContent = names.join(" · ");
    updateScrollNavButtons();
    scheduleSaveLastRead(entries);
  }

  function detectActivePage() {
    const probeY = toolbarEl.getBoundingClientRect().bottom + 8;
    const probeEl = document.elementFromPoint(window.innerWidth / 2, probeY);
    const section = probeEl?.closest(".page-section");
    if (section) updateActivePage(Number(section.dataset.page));
  }

  let scrollTicking = false;
  const onScroll = () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      detectActivePage();
      scrollTicking = false;
    });
  };

  async function scrollLoadNext() {
    if (loadingNext || maxLoaded >= TOTAL_PAGES) return;
    loadingNext = true;
    const nextPage = maxLoaded + 1;
    const { entries, html } = await pageSectionHtml(nextPage);
    pageEntriesMap.set(nextPage, entries);
    maxLoaded = nextPage;
    bodyEl.insertAdjacentHTML("beforeend", html);
    bindMarkers();
    applyHighlight(nextPage);
    loadingNext = false;
  }

  async function scrollLoadPrev() {
    if (loadingPrev || minLoaded <= 1) return;
    loadingPrev = true;
    const prevPage = minLoaded - 1;
    const { entries, html } = await pageSectionHtml(prevPage);
    pageEntriesMap.set(prevPage, entries);
    minLoaded = prevPage;
    // Prepending changes document height above the fold, which would
    // otherwise yank the visible content — so restore the exact scroll
    // position relative to what the person was looking at.
    const prevScrollHeight = document.documentElement.scrollHeight;
    const prevScrollTop = window.scrollY;
    bodyEl.insertAdjacentHTML("afterbegin", html);
    bindMarkers();
    requestAnimationFrame(() => {
      const newScrollHeight = document.documentElement.scrollHeight;
      window.scrollTo(0, prevScrollTop + (newScrollHeight - prevScrollHeight));
    });
    applyHighlight(prevPage);
    loadingPrev = false;
  }

  async function gotoAdjacentScroll(delta) {
    const target = activePage + delta;
    if (target < 1 || target > TOTAL_PAGES) return;
    while (target < minLoaded) await scrollLoadPrev();
    while (target > maxLoaded) await scrollLoadNext();
    qs(`.page-section[data-page="${target}"]`, bodyEl)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function renderScrollInitial() {
    pageEntriesMap.clear();
    minLoaded = currentPage;
    maxLoaded = currentPage;
    activePage = currentPage;
    const { entries, groups, html } = await pageSectionHtml(currentPage);
    pageEntriesMap.set(currentPage, entries);
    bodyEl.innerHTML = html;
    bindMarkers();
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });

    const names = groups ? [...new Set(groups.map((g) => g.surah.name_arabic))] : [];
    contextEl.textContent = names.join(" · ");
    updateScrollNavButtons();
    applyHighlight(currentPage);
    scheduleSaveLastRead(entries);

    sentinelTopEl = qs('[data-role="sentinel-top"]', root);
    sentinelBottomEl = qs('[data-role="sentinel-bottom"]', root);
    scrollObserver = new IntersectionObserver(
      (observed) => {
        observed.forEach((entry) => {
          if (!entry.isIntersecting) return;
          if (entry.target === sentinelBottomEl) scrollLoadNext();
          else if (entry.target === sentinelTopEl) scrollLoadPrev();
        });
      },
      { root: null, rootMargin: "800px 0px 800px 0px", threshold: 0 }
    );
    scrollObserver.observe(sentinelTopEl);
    scrollObserver.observe(sentinelBottomEl);
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  const onKeydownScroll = (e) => {
    if (e.key === "Escape") closeOpenPopover();
  };

  // ---- Ayah action popover (copy / share / bookmark / note) — shared by
  // both modes, since it delegates from the root and looks entries up via
  // pageEntriesMap regardless of how many pages are mounted. ----
  root.addEventListener("click", async (e) => {
    const marker = e.target.closest('[data-role="marker"]');
    if (marker) {
      const ayahEl = marker.closest(".ayah");
      const wasOpen = ayahEl.classList.contains("is-open");
      closeOpenPopover();
      if (!wasOpen) {
        ayahEl.classList.add("is-open");
        marker.setAttribute("aria-expanded", "true");
        positionPopover(marker);
      }
      return;
    }

    const btn = e.target.closest("[data-action]");
    if (!btn) {
      closeOpenPopover();
      return;
    }
    const ayahEl = btn.closest(".ayah");
    const surahNumber = Number(ayahEl.dataset.surah);
    const ayahNumber = Number(ayahEl.dataset.ayah);
    const entry = findEntry(surahNumber, ayahNumber);
    if (!entry) return;
    const { surah, ayah } = entry;
    const action = btn.dataset.action;

    if (action === "copy") {
      await copyText(`${ayah.text_uthmani} — ${surah.name_arabic} ${surah.number}:${ayahNumber}`);
    } else if (action === "share") {
      await shareText(`${surah.name_arabic} ${surah.number}:${ayahNumber}`, `${ayah.text_uthmani}\n\n${surah.name_arabic} (${surah.number}:${ayahNumber})`);
    } else if (action === "bookmark") {
      const nowBookmarked = await toggleBookmark(surah.number, ayahNumber, surah.name_arabic);
      btn.setAttribute("aria-pressed", String(nowBookmarked));
      btn.classList.toggle("is-active", nowBookmarked);
      btn.innerHTML = icon(nowBookmarked ? "bookmarkFilled" : "bookmark");
      return; // keep the popover open so the user sees the state change
    } else if (action === "note") {
      openNoteSheet(surah, ayahNumber);
    }
    closeOpenPopover();
  });

  const onDocumentClick = (e) => {
    if (!qs(".ayah.is-open", bodyEl)) return;
    if (root.contains(e.target)) return; // handled by the listener above
    closeOpenPopover();
  };
  document.addEventListener("click", onDocumentClick);

  // ==========================================================================
  // Boot the selected mode.
  // ==========================================================================
  if (mode === "scroll") {
    prevBtn.addEventListener("click", () => gotoAdjacentScroll(-1));
    nextBtn.addEventListener("click", () => gotoAdjacentScroll(1));
    document.addEventListener("keydown", onKeydownScroll);
    await renderScrollInitial();
  } else {
    prevBtn.addEventListener("click", () => goToPage(currentPage - 1, "prev"));
    nextBtn.addEventListener("click", () => goToPage(currentPage + 1, "next"));
    viewportEl.addEventListener("touchstart", onTouchStart, { passive: true });
    viewportEl.addEventListener("touchend", onTouchEnd);
    document.addEventListener("keydown", onKeydownPaged);
    await renderPagedCurrentPage();
  }

  return () => {
    document.removeEventListener("click", onDocumentClick);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("resize", onWindowResize);
    clearTimeout(saveTimer);
    releaseWakeLock();
    if (mode === "scroll") {
      document.removeEventListener("keydown", onKeydownScroll);
      window.removeEventListener("scroll", onScroll);
      scrollObserver?.disconnect();
    } else {
      document.removeEventListener("keydown", onKeydownPaged);
      viewportEl.removeEventListener("touchstart", onTouchStart);
      viewportEl.removeEventListener("touchend", onTouchEnd);
    }
  };
}

async function openNoteSheet(meta, ayahNumber) {
  let backdrop = qs(".sheet-backdrop");
  let sheet = qs(".sheet");
  if (!backdrop) {
    backdrop = el(`<div class="sheet-backdrop"></div>`);
    document.body.appendChild(backdrop);
  }
  if (!sheet) {
    sheet = el(`<div class="sheet" role="dialog" aria-modal="true"></div>`);
    document.body.appendChild(sheet);
  }

  const existing = await getNote(meta.number, ayahNumber);

  sheet.innerHTML = `
    <div class="sheet__handle"></div>
    <h3>ملاحظة — ${meta.name_arabic} ${meta.number}:${ayahNumber}</h3>
    <div class="field">
      <label for="note-text">ملاحظتك</label>
      <textarea id="note-text" rows="5" placeholder="اكتب خاطرة أو تذكيرًا أو سؤالًا…">${existing ? existing.text : ""}</textarea>
    </div>
    <div style="display:flex; gap:.75rem; justify-content:flex-end;">
      <button class="btn btn-ghost" data-role="cancel">إلغاء</button>
      <button class="btn btn-primary" data-role="save">حفظ الملاحظة</button>
    </div>
  `;

  const close = () => {
    sheet.classList.remove("is-open");
    backdrop.classList.remove("is-open");
  };

  backdrop.onclick = close;
  qs('[data-role="cancel"]', sheet).onclick = close;
  qs('[data-role="save"]', sheet).onclick = async () => {
    const text = qs("#note-text", sheet).value;
    await saveNote(meta.number, ayahNumber, text);
    const { showToast } = await import("../lib/utils.js");
    showToast(text.trim() ? "تم حفظ الملاحظة" : "تم حذف الملاحظة");
    close();
  };

  requestAnimationFrame(() => {
    backdrop.classList.add("is-open");
    sheet.classList.add("is-open");
  });
}
