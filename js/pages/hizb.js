import { icon } from "../lib/icons.js";
import { getAyahsByHizb } from "../lib/data.js";

export async function renderHizb(root) {
  const items = Array.from({ length: 60 }, (_, i) => i + 1);
  root.innerHTML = `
    <h1>الأحزاب</h1>
    <p style="color:var(--text-muted); margin-bottom:1.5rem;">كل جزء ينقسم إلى حزبين، وكل حزب إلى أربعة أرباع — وهي علامات الربع المطبوعة في هامش المصحف.</p>
    <div class="grid-cards">
      ${items
        .map(
          (n) => `
        <a class="card" href="#/hizb/${n}" style="text-align:center; text-decoration:none;">
          <div style="color:var(--accent-gold); margin-bottom:.4rem;">${icon("starOutline")}</div>
          <div style="font-weight:700;">الحزب ${n}</div>
        </a>`
        )
        .join("")}
    </div>
  `;
}

export async function renderHizbDetail(root, number) {
  root.innerHTML = `<div class="empty-state">${icon("starOutline")}<p>جارٍ تحميل الحزب ${number}…</p></div>`;
  const results = await getAyahsByHizb(number);

  if (!results.length) {
    root.innerHTML = `
      <a class="btn-icon" href="#/hizb" style="transform:scaleX(-1); margin-bottom:1rem;">${icon("chevronRight")}</a>
      <h1>الحزب ${number}</h1>
      <div class="data-pending-notice">
        ${icon("info")}
        <p>فهرسة الأحزاب لم تُفعَّل بعد في هذه النسخة. نص كل سورة الموثّق محمّل بالكامل —
        لكن أرقام الحزب لكل آية لم تُضَف بعد إلى <code>data/surahs/*.json</code>، لذا لا يمكن
        التصفح حسب الحزب حتى تُضاف هذه البيانات.</p>
      </div>
    `;
    return;
  }

  root.innerHTML = `
    <a class="btn-icon" href="#/hizb" style="transform:scaleX(-1); margin-bottom:1rem;">${icon("chevronRight")}</a>
    <h1>الحزب ${number}</h1>
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