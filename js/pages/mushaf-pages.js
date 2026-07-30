import { icon } from "../lib/icons.js";
import { TOTAL_PAGES } from "../lib/data.js";
import { renderPageReader } from "./page-reader.js";

export async function renderPages(root) {
  root.innerHTML = `
    <h1>الصفحات</h1>
    <p style="color:var(--text-muted); margin-bottom:1.5rem;">تصفّح حسب تقسيم ${TOTAL_PAGES} صفحة في المصحف المدني القياسي.</p>
    <div class="search-bar" style="margin-bottom:1.5rem; max-width:20rem;">
      ${icon("search")}
      <input type="number" min="1" max="${TOTAL_PAGES}" placeholder="الانتقال إلى صفحة…" data-role="jump" aria-label="الانتقال إلى رقم صفحة" />
    </div>
    <div class="grid-cards" data-role="page-grid" style="grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));">
      ${Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1)
        .map((n) => `<a class="card" href="#/page/${n}" style="text-align:center; padding:.75rem; text-decoration:none;">${n}</a>`)
        .join("")}
    </div>
    <p style="color:var(--text-muted); font-size:var(--step--1); margin-top:1rem;">تُعرض جميع الصفحات وعددها ${TOTAL_PAGES}. استخدم مربع الانتقال أعلاه للذهاب مباشرةً إلى صفحة معيّنة.</p>
  `;

  root.querySelector('[data-role="jump"]').addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.value) {
      location.hash = `/page/${Math.min(TOTAL_PAGES, Math.max(1, Number(e.target.value)))}`;
    }
  });
}

export async function renderPageDetail(root, number) {
  const n = Math.min(TOTAL_PAGES, Math.max(1, Number(number) || 1));
  return renderPageReader(root, { initialPage: n });
}
