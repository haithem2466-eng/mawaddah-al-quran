import { icon } from "../lib/icons.js";
import { loadMeta, loadSurah } from "../lib/data.js";
import { getLastRead } from "../lib/db.js";

export async function renderHome(root) {
  const { surahs } = await loadMeta();
  const lastRead = await getLastRead();

  let continueCardHtml = "";
  if (lastRead) {
    const surah = surahs.find((s) => s.number === lastRead.surah);
    if (surah) {
      continueCardHtml = `
        <a class="card" style="display:flex; align-items:center; gap:1rem; text-decoration:none; margin-bottom:2rem;"
           href="#/surah/${surah.number}?ayah=${lastRead.ayah}">
          <div style="color:var(--accent-gold); flex-shrink:0;">${icon("book")}</div>
          <div style="min-width:0;">
            <div style="font-size:var(--step--1); color:var(--text-muted);">متابعة القراءة</div>
            <div style="font-weight:700;">${surah.name_arabic} · آية ${lastRead.ayah}</div>
          </div>
          <div style="margin-inline-start:auto; color:var(--text-muted);">${icon("chevronRight")}</div>
        </a>
      `;
    }
  }

  const quickLinks = [
    { path: "/surahs", label: "السور", sub: "114 سورة", icon: "book" },
    { path: "/juz", label: "الأجزاء", sub: "30 جزءًا", icon: "layers" },
    { path: "/hizb", label: "الأحزاب", sub: "60 حزبًا", icon: "grid" },
    { path: "/pages", label: "الصفحات", sub: "عرض المصحف", icon: "book" },
  ];

  // Pull a short verse to feature — prefer whichever verified surah exists locally.
  let featured = "";
  const sampleCandidates = surahs.filter((s) => s.has_full_text);
  if (sampleCandidates.length) {
    const pick = sampleCandidates[Math.floor(Math.random() * sampleCandidates.length)];
    const full = await loadSurah(pick.number);
    if (full && full.ayahs.length) {
      const a = full.ayahs[0];
      featured = `
        <div class="card" style="text-align:center; padding:2.5rem 1.5rem; margin-bottom:2rem;">
          <div class="arabic" style="font-family:var(--font-arabic-display); font-size:clamp(1.6rem,5vw,2.4rem); line-height:2; margin-bottom:1rem;">
            ${a.text_uthmani}
          </div>
          <div style="color:var(--text-muted); font-size:var(--step--1);">${pick.name_arabic} — آية ${a.number}</div>
          <a href="#/surah/${pick.number}" class="btn btn-ghost" style="margin-top:1rem;">قراءة هذه السورة ${icon("chevronRight")}</a>
        </div>
      `;
    }
  }

  root.innerHTML = `
<h1>السلام عليكم ورحمة الله وبركاته</h1>
<p style="color:var(--text-muted); margin-bottom:2rem;">
نسأل الله أن ينفع بهذا العمل، وأن يجعله خالصًا لوجهه الكريم.
</p>
    ${continueCardHtml}
    ${featured}

    <div class="ornamental-divider">${icon("star")}</div>

    <div class="grid-cards">
      ${quickLinks
        .map(
          (q) => `
        <a class="card" href="#${q.path}" style="text-align:center; text-decoration:none;">
          <div style="color:var(--accent); margin-bottom:.5rem;">${icon(q.icon)}</div>
          <div style="font-weight:700;">${q.label}</div>
          <div style="font-size:var(--step--1); color:var(--text-muted);">${q.sub}</div>
        </a>`
        )
        .join("")}
    </div>
  `;
}