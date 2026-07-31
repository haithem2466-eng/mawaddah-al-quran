import { icon } from "../lib/icons.js";
import {
  applyTheme,
  THEMES,
  THEME_LABELS_AR,
  FONT_OPTIONS,
  READING_MODES,
  READING_MODE_LABELS_AR,
  loadReaderSettings,
  applyReaderSettings,
  getCustomThemeColor,
  applyCustomThemeColor,
} from "../lib/settings.js";
import { db } from "../lib/db.js";
import { showToast, qs, qsa } from "../lib/utils.js";

const THEME_PREVIEW = {
  light: { bg: "#FAFAFA", fg: "#059669" },
  dark: { bg: "#101112", fg: "#34D399" },
  sepia: { bg: "#EFE3C8", fg: "#7A5A28" },
  amoled: { bg: "#000000", fg: "#34D399" },
};

export async function renderSettingsPage(root) {
  const currentTheme =
    document.documentElement.getAttribute("data-theme") || "light";
  const reader = await loadReaderSettings();
  const customColor = await getCustomThemeColor();
  const presetThemes = THEMES.filter((t) => t !== "custom");

  root.innerHTML = `
    <h1>الإعدادات</h1>

    <h3>المظهر</h3>
    <div class="theme-swatches" data-role="themes">
      ${presetThemes
        .map(
          (t) => `
        <button class="theme-swatch ${t === currentTheme ? "is-active" : ""}" data-theme="${t}">
          <div class="theme-swatch__preview" style="background:${THEME_PREVIEW[t].bg}; border:1px solid var(--border); display:flex; align-items:center; justify-content:center; color:${THEME_PREVIEW[t].fg};"></div>
          <span>${THEME_LABELS_AR[t]}</span>
        </button>`,
        )
        .join("")}
      <label class="theme-swatch theme-swatch--custom ${currentTheme === "custom" ? "is-active" : ""}" data-role="custom-swatch">
        <div class="theme-swatch__preview theme-swatch__preview--custom" data-role="custom-preview" style="background:${customColor}; border:1px solid var(--border);">
          ${icon("settings")}
        </div>
        <span>مخصص</span>
        <input type="color" data-role="custom-color" value="${customColor}" />
      </label>
    </div>
    <p style="color:var(--text-muted); font-size:var(--step--1); margin-top:.5rem;">
      اختر لون «مخصص» ليحدد التطبيق تلقائيًا ألوان الخلفية والنص المناسبة لقراءة مريحة بأي لون تريده.
    </p>

    <div class="ornamental-divider">${icon("star")}</div>

    <h3>طريقة القراءة</h3>
    <div class="theme-swatches" data-role="reading-modes">
      ${READING_MODES.map(
        (m) => `
        <button class="theme-swatch ${m === reader.readingMode ? "is-active" : ""}" data-reading-mode="${m}">
          <div class="theme-swatch__preview" style="background:var(--surface-2); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; color:var(--accent-strong);">
            ${icon(m === "paged" ? "book" : "chevronDown")}
          </div>
          <span>${READING_MODE_LABELS_AR[m]}</span>
        </button>`,
      ).join("")}
    </div>
    <p style="color:var(--text-muted); font-size:var(--step--1); margin-top:.5rem;">
      «تقليب الصفحات» يعرض صفحة واحدة في كل مرة كالمصحف الورقي، و«تمرير متصل» يجعل الصفحات تتوالى تحت بعضها لتقرأ بالتمرير لأسفل.
    </p>

    <div class="ornamental-divider">${icon("star")}</div>

    <h3>القارئ</h3>

    <div class="field">
      <label>الخط</label>
      <select data-role="font-family" style="padding:.6em; border-radius:var(--radius-md); border:1px solid var(--border); background:var(--surface);">
        ${FONT_OPTIONS.map((f) => `<option value="${f.id}" ${f.id === reader.fontFamily ? "selected" : ""}>${f.label}</option>`).join("")}
      </select>
    </div>

    <div class="range-row">
      <label for="font-size">حجم الخط</label>
      <input type="range" id="font-size" min="20" max="56" step="1" value="${reader.fontSize}" data-role="font-size" />
    </div>
    <div class="range-row">
      <label for="line-height">تباعد الأسطر</label>
      <input type="range" id="line-height" min="1.6" max="3.4" step="0.1" value="${reader.lineHeight}" data-role="line-height" />
    </div>
    <div class="range-row">
      <label for="letter-spacing">تباعد الحروف</label>
      <input type="range" id="letter-spacing" min="-1" max="4" step="0.5" value="${reader.letterSpacing}" data-role="letter-spacing" />
    </div>
    <div class="range-row">
      <label for="reading-width">عرض القراءة</label>
      <input type="range" id="reading-width" min="32" max="64" step="1" value="${reader.readingWidth}" data-role="reading-width" />
    </div>

    <div class="reader" style="margin-top:1rem; --reader-max-width: 100%; border:1px solid var(--border); border-radius:var(--radius-md); padding:1.5rem; overflow-wrap:break-word;">
      <div class="ayah-flow" style="text-align:center; text-align-last:center;"><span class="ayah__text">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</span></div>
    </div>

    <div class="ornamental-divider">${icon("star")}</div>

    
    <div class="field">
      <button class="btn btn-ghost" data-role="clear-data">مسح العلامات المرجعية والملاحظات وسجل القراءة</button>
    </div>
    <p style="color:var(--text-muted); font-size:var(--step--1);">تبقى الإعدادات ونص القرآن محفوظَين للاستخدام بلا اتصال؛ هذا الخيار يمسح فقط علاماتك المرجعية وملاحظاتك وآخر موضع قراءة.</p>
  `;

  const themeSwatches = () => qsa('[data-role="themes"] .theme-swatch', root);
  const customSwatch = qs('[data-role="custom-swatch"]', root);
  const customPreview = qs('[data-role="custom-preview"]', root);
  const customColorInput = qs('[data-role="custom-color"]', root);

  qsa('[data-role="themes"] button.theme-swatch', root).forEach((btn) => {
    btn.addEventListener("click", async () => {
      await applyTheme(btn.dataset.theme);
      themeSwatches().forEach((b) =>
        b.classList.toggle("is-active", b === btn),
      );
    });
  });

  // Picking a colour applies it immediately and switches the active theme
  // to "custom"; opening the picker (without changing anything) doesn't.
  customColorInput.addEventListener("input", async (e) => {
    const hex = e.target.value;
    customPreview.style.background = hex;
    await applyCustomThemeColor(hex);
    themeSwatches().forEach((b) =>
      b.classList.toggle("is-active", b === customSwatch),
    );
  });

  qsa('[data-role="reading-modes"] button', root).forEach((btn) => {
    btn.addEventListener("click", async () => {
      await applyReaderSettings({ readingMode: btn.dataset.readingMode });
      qsa('[data-role="reading-modes"] button', root).forEach((b) =>
        b.classList.toggle("is-active", b === btn),
      );
    });
  });

  qs('[data-role="font-family"]', root).addEventListener("change", (e) =>
    applyReaderSettings({ fontFamily: e.target.value }),
  );
  qs('[data-role="font-size"]', root).addEventListener("input", (e) =>
    applyReaderSettings({ fontSize: Number(e.target.value) }),
  );
  qs('[data-role="line-height"]', root).addEventListener("input", (e) =>
    applyReaderSettings({ lineHeight: Number(e.target.value) }),
  );
  qs('[data-role="letter-spacing"]', root).addEventListener("input", (e) =>
    applyReaderSettings({ letterSpacing: Number(e.target.value) }),
  );
  qs('[data-role="reading-width"]', root).addEventListener("input", (e) =>
    applyReaderSettings({ readingWidth: Number(e.target.value) }),
  );

  qs('[data-role="clear-data"]', root).addEventListener("click", async () => {
    if (
      !confirm(
        "سيؤدي هذا إلى حذف جميع العلامات المرجعية والملاحظات وسجل القراءة من هذا الجهاز. المتابعة؟",
      )
    )
      return;
    await Promise.all([
      db.clear("bookmarks"),
      db.clear("notes"),
      db.clear("lastRead"),
    ]);
    showToast("تم مسح بياناتك الشخصية");
  });
}
