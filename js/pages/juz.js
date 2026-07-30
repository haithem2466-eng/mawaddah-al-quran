import { icon } from "../lib/icons.js";
import { getAyahsByJuz } from "../lib/data.js";

export async function renderJuz(root) {
  const items = Array.from({ length: 30 }, (_, i) => i + 1);
  root.innerHTML = `
    <h1>الأجزاء</h1>
    <p style="color:var(--text-muted); margin-bottom:1.5rem;">القرآن مقسّم إلى 30 جزءًا متساويًا، تُستخدم تقليديًا لختم القرآن في شهر.</p>
    <div class="grid-cards">
      ${items
        .map(
          (n) => `
        <a class="card" href="#/juz/${n}" style="text-align:center; text-decoration:none;">
          <div style="color:var(--accent-gold); margin-bottom:.4rem;">${icon("starOutline")}</div>
          <div style="font-weight:700;">الجزء ${n}</div>
        </a>`
        )
        .join("")}
    </div>
  `;
}

export async function renderJuzDetail(root, number) {
  root.innerHTML = `<div class="empty-state">${icon("starOutline")}<p>جارٍ تحميل الجزء ${number}…</p></div>`;
  const results = await getAyahsByJuz(number);

  if (!results.length) {
    root.innerHTML = `
      <a class="btn-icon" href="#/juz" style="transform:scaleX(-1); margin-bottom:1rem;">${icon("chevronRight")}</a>
      <h1>الجزء ${number}</h1>
      <div class="data-pending-notice">
        ${icon("info")}
        <p>فهرسة الأجزاء لم تُفعَّل بعد في هذه النسخة. نص كل سورة الموثّق محمّل بالكامل
        ويمكن قراءته من قائمة السور — لكن أرقام الجزء لكل آية لم تُضَف بعد إلى
        <code>data/surahs/*.json</code>، لذا لا يمكن التصفح حسب الجزء حتى تُضاف هذه البيانات.</p>
      </div>
    `;
    return;
  }

  root.innerHTML = `
    <a class="btn-icon" href="#/juz" style="transform:scaleX(-1); margin-bottom:1rem;">${icon("chevronRight")}</a>
    <h1>الجزء ${number}</h1>
    <div style="display:flex; flex-direction:column; gap:.75rem;">
      ${results
        .map(
          ({ surah, ayah }) => `
        <a class="card" href="#/surah/${surah.number}?ayah=${ayah.number}" style="display:flex; justify-content:space-between; align-items:center; text-decoration:none;">
          <div>
            <div class="arabic" style="font-family:var(--font-arabic-display); font-size:var(--step-1);">${ayah.text_uthmani}</div>
            <div style="font-size:var(--step--1); color:var(--text-muted);">${surah.name_arabic} ${surah.number}:${ayah.number} · صفحة ${ayah.page}</div>
          </div>
          ${icon("chevronRight")}
        </a>`
        )
        .join("")}
    </div>
  `;
}