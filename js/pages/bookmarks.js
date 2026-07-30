import { icon } from "../lib/icons.js";
import { db } from "../lib/db.js";
import { showToast, formatDate } from "../lib/utils.js";

export async function renderBookmarks(root) {
  const items = (await db.getAll("bookmarks")).sort((a, b) => b.createdAt - a.createdAt);

  if (!items.length) {
    root.innerHTML = `
      <h1>العلامات المرجعية</h1>
      <div class="empty-state">
        ${icon("bookmark")}
        <h3>لا توجد علامات مرجعية بعد</h3>
        <p>اضغط على أيقونة العلامة المرجعية عند أي آية أثناء القراءة لحفظها هنا.</p>
        <a class="btn btn-primary" href="#/surahs">تصفّح السور</a>
      </div>
    `;
    return;
  }

  root.innerHTML = `
    <h1>العلامات المرجعية</h1>
    <div style="display:flex; flex-direction:column; gap:.75rem;" data-role="list">
      ${items
        .map(
          (b) => `
        <div class="card" style="display:flex; align-items:center; gap:1rem;" data-id="${b.id}">
          <a href="#/surah/${b.surah}?ayah=${b.ayah}" style="flex:1; text-decoration:none;">
            <div style="font-weight:700;">${b.surahName} ${b.surah}:${b.ayah}</div>
            <div style="font-size:var(--step--1); color:var(--text-muted);">حُفظت في ${formatDate(b.createdAt)}</div>
          </a>
          <button class="btn-icon" data-action="remove" aria-label="حذف العلامة المرجعية">${icon("close")}</button>
        </div>`
        )
        .join("")}
    </div>
  `;

  root.querySelector('[data-role="list"]').addEventListener("click", async (e) => {
    const btn = e.target.closest('[data-action="remove"]');
    if (!btn) return;
    const card = btn.closest("[data-id]");
    await db.delete("bookmarks", card.dataset.id);
    card.remove();
    showToast("تم حذف العلامة المرجعية");
    if (!root.querySelector('[data-id]')) renderBookmarks(root);
  });
}