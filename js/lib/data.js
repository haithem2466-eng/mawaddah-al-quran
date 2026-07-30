// ==========================================================================
// data.js — loads Quran JSON from /data. Everything is fetched from the
// local filesystem only (never a remote API), so the Cache API / service
// worker can make it fully available offline after the first visit.
// ==========================================================================

const surahCache = new Map();
let metaPromise = null;

export function loadMeta() {
  if (!metaPromise) {
    metaPromise = fetch("data/surahs-meta.json").then((r) => {
      if (!r.ok) throw new Error("Could not load surahs-meta.json");
      return r.json();
    });
  }
  return metaPromise;
}

export async function getSurahMeta(number) {
  const { surahs } = await loadMeta();
  return surahs.find((s) => s.number === Number(number));
}

export async function loadSurah(number) {
  const n = Number(number);
  if (surahCache.has(n)) return surahCache.get(n);
  const id = String(n).padStart(3, "0");
  const res = await fetch(`data/surahs/${id}.json`);
  if (!res.ok) {
    // No verified full-text file has been added for this surah yet.
    return null;
  }
  const json = await res.json();
  surahCache.set(n, json);
  return json;
}

// ---- Arabic-aware search helpers ----

// Strip tashkeel / diacritics and normalise common letter variants so a
// search for "الرحمن" also matches "الرَّحْمَٰنِ".
//
// The mushaf (Uthmani) rasm frequently represents the internal long "ا"
// sound *without* writing the letter itself — e.g. "كِتَـٰبٌ" (kitab) has
// no ا at all; the elongation is only marked by a small superscript dagger
// alif (ٰ, U+0670) above the previous letter ("مد الألف" that people don't
// type). The definite article "ال" is also commonly written with a
// dedicated alef wasla (ٱ, U+0671) instead of a plain ا. If those marks are
// simply deleted, "كتاب" no longer matches "كتب" (a letter short), and
// "الرحمن" no longer matches "ٱلرحمن" (different base character) — so a
// normally-typed word would find nothing. Since a person can't be expected
// to type the exact mushaf spelling, every alif-type character (plain,
// hamza-seated, wasla, and the dagger/superscript mark) is dropped
// entirely from *both* the indexed text and the user's query, so its
// presence or absence never affects matching.
export function normalizeArabic(str) {
  return str
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "") // tashkeel + dagger alif
    .replace(/[إأآاٱ]/g, "") // drop every alif variant (incl. alef wasla)
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[\u0640]/g, "") // tatweel
    .trim();
}

export function highlight(text, query) {
  if (!query) return escapeHtml(text);
  const norm = normalizeArabic(text);
  const nq = normalizeArabic(query);
  const idx = norm.toLowerCase().indexOf(nq.toLowerCase());
  if (idx === -1) return escapeHtml(text);
  // Because normalization can change string length (diacritics removed),
  // fall back to a best-effort plain substring match on the raw text too.
  const rawIdx = text.toLowerCase().indexOf(query.toLowerCase());
  if (rawIdx !== -1) {
    return (
      escapeHtml(text.slice(0, rawIdx)) +
      "<mark>" + escapeHtml(text.slice(rawIdx, rawIdx + query.length)) + "</mark>" +
      escapeHtml(text.slice(rawIdx + query.length))
    );
  }
  return escapeHtml(text);
}

export function revelationTypeAr(type) {
  return type === "Meccan" ? "مكية" : "مدنية";
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---- Structural lookups (Juz / Hizb / Page) ----
// Every ayah in a surah's JSON already carries its own juz/hizb/page number,
// exactly as printed in the margin of a mushaf. That means Juz, Hizb, and
// Page views don't need a separate boundary table at all — they're just a
// live filter over whichever surahs have verified text loaded so far.

async function collectAyahsWhere(predicate) {
  const { surahs } = await loadMeta();
  const results = [];
  for (const s of surahs.filter((s) => s.has_full_text)) {
    const full = await loadSurah(s.number);
    if (!full) continue;
    for (const a of full.ayahs) {
      if (predicate(a)) results.push({ surah: s, ayah: a });
    }
  }
  return results;
}

export function getAyahsByJuz(juz) {
  return collectAyahsWhere((a) => a.juz === Number(juz));
}
export function getAyahsByHizb(hizb) {
  return collectAyahsWhere((a) => a.hizb === Number(hizb));
}
export function getAyahsByPage(page) {
  return collectAyahsWhere((a) => a.page === Number(page));
}

// ---- Single-page (mushaf) reading ----
// Standard Madani mushaf has 604 printed pages. Every surah's first/last
// page is precomputed in surahs-meta.json (from the per-ayah "page" field),
// so a given page only ever needs the 1-2 surahs that actually land on it —
// no need to scan all 114 surah files just to render one page.
export const TOTAL_PAGES = 604;

export async function loadPage(pageNumber) {
  const n = Number(pageNumber);
  const { surahs } = await loadMeta();
  const candidates = surahs.filter((s) => n >= s.first_page && n <= s.last_page);
  const entries = [];
  for (const s of candidates) {
    const full = await loadSurah(s.number);
    if (!full) continue;
    for (const a of full.ayahs) {
      if (a.page === n) entries.push({ surah: s, ayah: a });
    }
  }
  entries.sort((x, y) => x.surah.number - y.surah.number || x.ayah.number - y.ayah.number);
  return entries;
}

export async function firstPageOfSurah(number) {
  const { surahs } = await loadMeta();
  const s = surahs.find((s) => s.number === Number(number));
  return s ? s.first_page : 1;
}

export async function pageForAyah(surahNumber, ayahNumber) {
  const full = await loadSurah(surahNumber);
  if (!full) return null;
  const a = full.ayahs.find((a) => a.number === Number(ayahNumber));
  return a ? a.page : null;
}

// ---- Global search across every downloaded surah ----
// The person picks a scope first (surah name, ayah text, juz, hizb, or
// page — or "all") so results are filtered to that one category instead of
// every match type being dumped into the same list at once.
export const SEARCH_SCOPES = ["all", "surah", "ayah", "juz", "hizb", "page"];

async function matchSurahs(q, nq) {
  const { surahs } = await loadMeta();
  return surahs.filter((s) => {
    return (
      String(s.number) === q ||
      normalizeArabic(s.name_arabic).toLowerCase().includes(nq) ||
      s.name_transliteration.toLowerCase().includes(q.toLowerCase()) ||
      s.name_meaning.toLowerCase().includes(q.toLowerCase())
    );
  });
}

async function matchAyahText(q, nq) {
  const { surahs } = await loadMeta();
  const ayahMatches = [];
  const candidates = surahs.filter((s) => s.has_full_text);
  for (const s of candidates) {
    const full = await loadSurah(s.number);
    if (!full) continue;
    for (const a of full.ayahs) {
      const inArabic = normalizeArabic(a.text_uthmani).toLowerCase().includes(nq);
      const inGloss = (a.translation_en_gloss || "").toLowerCase().includes(q.toLowerCase());
      if (inArabic || inGloss) ayahMatches.push({ surah: s, ayah: a });
    }
  }
  return ayahMatches;
}

// A query for juz/hizb/page is a number within a known valid range. Returns
// null (rather than throwing) when the query isn't a usable number yet, so
// the UI can show a "type a number" hint instead of an empty-results state.
function parseBoundedNumber(q, max) {
  if (!/^\d+$/.test(q)) return null;
  const n = Number(q);
  if (n < 1 || n > max) return null;
  return n;
}

/**
 * @param {string} query
 * @param {"all"|"surah"|"ayah"|"juz"|"hizb"|"page"} scope
 * @returns {Promise<{surahs: any[], ayahs: any[], invalidNumber?: boolean}>}
 */
export async function search(query, scope = "all") {
  const q = query.trim();
  if (!q) return { surahs: [], ayahs: [] };
  const nq = normalizeArabic(q).toLowerCase();

  if (scope === "surah") {
    return { surahs: await matchSurahs(q, nq), ayahs: [] };
  }

  if (scope === "ayah") {
    return { surahs: [], ayahs: (await matchAyahText(q, nq)).slice(0, 100) };
  }

  if (scope === "juz" || scope === "hizb" || scope === "page") {
    const max = scope === "juz" ? 30 : scope === "hizb" ? 60 : TOTAL_PAGES;
    const n = parseBoundedNumber(q, max);
    if (n === null) return { surahs: [], ayahs: [], invalidNumber: true };
    const ayahs =
      scope === "juz" ? await getAyahsByJuz(n) : scope === "hizb" ? await getAyahsByHizb(n) : await getAyahsByPage(n);
    return { surahs: [], ayahs };
  }

  // scope === "all": surah names + ayah text together, same as before.
  const [matchedSurahs, ayahMatches] = await Promise.all([matchSurahs(q, nq), matchAyahText(q, nq)]);
  return { surahs: matchedSurahs, ayahs: ayahMatches.slice(0, 100) };
}