import { icon } from "../lib/icons.js";
import { search, highlight, revelationTypeAr } from "../lib/data.js";
import { debounce, qs, qsa } from "../lib/utils.js";

// Each scope the person can search within. Picking one filters results down
// to that single category instead of showing every match type at once.
const SCOPES = [
  { id: "all", label: "الكل", icon: "search", placeholder: "ابحث عن اسم سورة، أو نص آية، أو جزء، أو صفحة…" },
  { id: "surah", label: "السور", icon: "book", placeholder: "ابحث باسم السورة أو رقمها…" },
  { id: "ayah", label: "الآيات", icon: "starOutline", placeholder: "ابحث عن نص آية…" },
  { id: "juz", label: "الأجزاء", icon: "layers", placeholder: "اكتب رقم الجزء (١ – ٣٠)…" },
  { id: "hizb", label: "الأحزاب", icon: "grid", placeholder: "اكتب رقم الحزب (١ – ٦٠)…" },
  { id: "page", label: "الصفحات", icon: "book", placeholder: "اكتب رقم الصفحة (١ – ٦٠٤)…" },
];

const HINTS = {
  all: "اختر نوعًا محددًا من الأعلى لتضييق نتائج البحث، أو اترك «الكل» للبحث في كل شيء دفعة واحدة.",
  surah: "يبحث هذا القسم في اسم السورة (بالعربية) أو رقمها فقط.",
  ayah: "البحث في نص الآيات يشمل فقط السور التي أُضيف نصها الموثّق محليًا حتى الآن.",
  juz: "اكتب رقم جزء بين 1 و 30 لعرض جميع آياته.",
  hizb: "اكتب رقم حزب بين 1 و 60 لعرض جميع آياته.",
  page: "اكتب رقم صفحة بين 1 و 604 لعرض جميع آياتها.",
};

export async function renderSearch(root, initialQuery = "") {
  let scope = "all";

  root.innerHTML = `
    <h1>بحث</h1>
    <div class="search-scope" role="tablist" aria-label="اختر نوع البحث">
      ${SCOPES.map(
        (s) => `
        <button type="button" class="search-scope__btn${s.id === scope ? " is-active" : ""}" data-scope="${s.id}" role="tab" aria-selected="${s.id === scope}">
          ${icon(s.icon)}<span>${s.label}</span>
        </button>`
      ).join("")}
    </div>
    <div class="search-bar" style="margin-top:1rem;">
      ${icon("search")}
      <input type="search" placeholder="${SCOPES[0].placeholder}" value="${initialQuery}" data-role="q" aria-label="البحث في القرآن" />
      <button class="search-bar__clear btn-icon" data-role="clear" aria-label="مسح البحث" style="width:28px;height:28px;">${icon("close")}</button>
    </div>
    <p data-role="hint" style="color:var(--text-muted); font-size:var(--step--1); margin-top:.75rem;">
      ${HINTS[scope]}
    </p>
    <div data-role="results" class="search-results"></div>
  `;

  const input = qs('[data-role="q"]', root);
  const hintEl = qs('[data-role="hint"]', root);
  const resultsEl = qs('[data-role="results"]', root);
  const scopeButtons = qsa(".search-scope__btn", root);

  const scopeMeta = (id) => SCOPES.find((s) => s.id === id);

  function scopeLabelFor(q, s) {
    if (s === "juz") return `آيات الجزء ${q}`;
    if (s === "hizb") return `آيات الحزب ${q}`;
    if (s === "page") return `آيات صفحة ${q}`;
    return "الآيات";
  }

  async function runSearch(q) {
    if (!q.trim()) {
      resultsEl.innerHTML = "";
      return;
    }
    resultsEl.innerHTML = `<div class="empty-state">${icon("starOutline")}<p>جارٍ البحث…</p></div>`;
    const { surahs, ayahs, invalidNumber } = await search(q, scope);

    if (invalidNumber) {
      const max = scope === "juz" ? 30 : scope === "hizb" ? 60 : 604;
      resultsEl.innerHTML = `<div class="empty-state">${icon("search")}<p>اكتب رقمًا صحيحًا بين 1 و ${max}.</p></div>`;
      return;
    }

    if (!surahs.length && !ayahs.length) {
      resultsEl.innerHTML = `<div class="empty-state">${icon("search")}<p>لا توجد نتائج لـ "${q}".</p></div>`;
      return;
    }

    resultsEl.innerHTML = `
      ${
        surahs.length
          ? `<h3>السور</h3>` +
            surahs
              .map(
                (s) => `
          <a class="search-result" href="#/surah/${s.number}">
            <div style="display:flex; justify-content:space-between;">
              <span><strong>${s.number}. ${s.name_arabic}</strong></span>
              <span class="search-result__ar">${revelationTypeAr(s.revelation_type)}</span>
            </div>
          </a>`
              )
              .join("")
          : ""
      }
      ${
        ayahs.length
          ? `<h3 style="margin-top:1.5rem;">${scopeLabelFor(q, scope)}</h3>` +
            ayahs
              .map(
                ({ surah, ayah }) => `
          <a class="search-result" href="#/surah/${surah.number}?ayah=${ayah.number}">
            <div class="search-result__ar">${highlight(ayah.text_uthmani, q)}</div>
            <div class="search-result__meta">${surah.name_arabic} ${surah.number}:${ayah.number} · الجزء ${ayah.juz} · صفحة ${ayah.page}</div>
          </a>`
              )
              .join("")
          : ""
      }
    `;
  }

  const debouncedSearch = debounce(runSearch, 220);
  input.addEventListener("input", (e) => debouncedSearch(e.target.value));
  qs('[data-role="clear"]', root).addEventListener("click", () => {
    input.value = "";
    resultsEl.innerHTML = "";
    input.focus();
  });

  scopeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.scope === scope) return;
      scope = btn.dataset.scope;
      scopeButtons.forEach((b) => {
        b.classList.toggle("is-active", b === btn);
        b.setAttribute("aria-selected", String(b === btn));
      });
      const meta = scopeMeta(scope);
      input.placeholder = meta.placeholder;
      input.type = scope === "juz" || scope === "hizb" || scope === "page" ? "text" : "search";
      hintEl.textContent = HINTS[scope];
      if (input.value.trim()) runSearch(input.value);
      else resultsEl.innerHTML = "";
    });
  });

  if (initialQuery) runSearch(initialQuery);
}
