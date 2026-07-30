import { icon } from "../lib/icons.js";
import { loadMeta, normalizeArabic, revelationTypeAr } from "../lib/data.js";
import { debounce, qs, qsa } from "../lib/utils.js";

function surahCardHtml(s) {
  return `
    <a class="card surah-card view-enter" href="#/surah/${s.number}" data-search="${normalizeArabic(s.name_arabic)} ${s.number}">
      <div class="surah-card__number">${icon("starOutline")}<span>${s.number}</span></div>
      <div class="surah-card__meta">
        <div class="surah-card__sub">
          <span class="tag ${s.revelation_type === "Meccan" ? "tag--meccan" : "tag--medinan"}">${revelationTypeAr(s.revelation_type)}</span>
          <span>${s.ayah_count} آية</span>
          ${s.has_full_text ? "" : `<span class="tag" title="لم يُضَف بعد النص الكامل الموثّق">قيد الإضافة</span>`}
        </div>
      </div>
      <div class="surah-card__name-ar">${s.name_arabic}</div>
    </a>
  `;
}

export async function renderSurahs(root) {
  const { surahs } = await loadMeta();

  root.innerHTML = `
    <h1>السور</h1>
    <div class="search-bar" style="margin-bottom:1.5rem;">
      ${icon("search")}
      <input type="search" placeholder="تصفية حسب الاسم أو الرقم…" aria-label="تصفية السور" data-role="filter-input" />
    </div>
    <div data-role="surah-list" style="display:flex; flex-direction:column; gap:.75rem;">
      ${surahs.map(surahCardHtml).join("")}
    </div>
    <div class="empty-state" data-role="empty" hidden>
      ${icon("search")}
      <p>لا توجد سورة مطابقة لهذا البحث.</p>
    </div>
  `;

  const input = qs('[data-role="filter-input"]', root);
  const cards = qsa(".surah-card", root);
  const empty = qs('[data-role="empty"]', root);

  const filter = debounce((value) => {
    const q = normalizeArabic(value.trim()).toLowerCase();
    let visible = 0;
    cards.forEach((card) => {
      const match = !q || card.dataset.search.includes(q);
      card.hidden = !match;
      if (match) visible++;
    });
    empty.hidden = visible !== 0;
  }, 120);

  input.addEventListener("input", (e) => filter(e.target.value));
}