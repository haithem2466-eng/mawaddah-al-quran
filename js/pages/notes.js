import { icon } from "../lib/icons.js";
import { db } from "../lib/db.js";
import { showToast } from "../lib/utils.js";

export async function renderNotes(root) {
  const items = (await db.getAll("notes")).sort((a, b) => b.updatedAt - a.updatedAt);

  if (!items.length) {
    root.innerHTML = `
      <h1>الملاحظات</h1>
      <div class="empty-state">
        ${icon("note")}
        <h3>لا توجد ملاحظات بعد</h3>
        <p>اضغط على أيقونة الملاحظة عند أي آية أثناء القراءة لتدوين خاطرة.</p>
        <a class="btn btn-primary" href="#/surahs">تصفّح السور</a>
      </div>
    `;
    return;
  }

  root.innerHTML = `
    <h1>الملاحظات</h1>
    <div style="display:flex; flex-direction:column; gap:.75rem;" data-role="list">
      ${items
        .map(
          (n) => `
        <div class="card" data-id="${n.id}">
          <div style="display:flex; justify-content:space-between; align-items:start; gap:1rem;">
            <a href="#/surah/${n.surah}?ayah=${n.ayah}" style="font-weight:700; text-decoration:none;">سورة ${n.surah}:${n.ayah}</a>
            <button class="btn-icon" data-action="remove" aria-label="حذف الملاحظة">${icon("close")}</button>
          </div>
          <p style="margin-top:.5rem; margin-bottom:0; color:var(--text-muted);">${escapeHtml(n.text)}</p>
        </div>`
        )
        .join("")}
    </div>
  `;

  root.querySelector('[data-role="list"]').addEventListener("click", async (e) => {
    const btn = e.target.closest('[data-action="remove"]');
    if (!btn) return;
    const card = btn.closest("[data-id]");
    await db.delete("notes", card.dataset.id);
    card.remove();
    showToast("تم حذف الملاحظة");
    if (!root.querySelector('[data-id]')) renderNotes(root);
  });
}

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}