import { icon } from "../lib/icons.js";
import { loadMeta, pageForAyah } from "../lib/data.js";
import { getLastRead } from "../lib/db.js";
import { renderPageReader } from "./page-reader.js";

export async function renderSurahDetail(root, number) {
  const { surahs } = await loadMeta();
  const meta = surahs.find((s) => s.number === number);

  if (!meta) {
    root.innerHTML = `<div class="empty-state">${icon("starOutline")}<h2>السورة غير موجودة</h2><a class="btn btn-primary" href="#/surahs">العودة إلى السور</a></div>`;
    return;
  }

  const params = new URLSearchParams(location.hash.split("?")[1] || "");
  const ayahParam = params.get("ayah");

  let initialPage = meta.first_page;
  let highlightAyah = null;

  if (ayahParam) {
    const p = await pageForAyah(number, Number(ayahParam));
    if (p) {
      initialPage = p;
      highlightAyah = Number(ayahParam);
    }
  } else {
    const lastRead = await getLastRead();
    if (lastRead && lastRead.surah === number) {
      const p = await pageForAyah(number, lastRead.ayah);
      if (p) initialPage = p;
    }
  }

  return renderPageReader(root, { initialPage, highlightAyah });
}
