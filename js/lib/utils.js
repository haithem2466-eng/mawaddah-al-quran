// ==========================================================================
// utils.js — small shared helpers used across pages.
// ==========================================================================

export function debounce(fn, wait = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

let toastTimer = null;
export function showToast(message) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("is-open");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-open"), 2400);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("تم النسخ إلى الحافظة");
  } catch {
    // Fallback for browsers/contexts without Clipboard API permission.
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showToast("تم النسخ إلى الحافظة");
    } catch {
      showToast("تعذّر النسخ — يُرجى تحديد النص يدويًا");
    }
    ta.remove();
  }
}

export async function shareText(title, text) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return;
    } catch {
      // user cancelled or share failed — fall through to copy
    }
  }
  await copyText(text);
  showToast("المشاركة غير مدعومة هنا — تم النسخ بدلاً من ذلك");
}

export function qs(sel, root = document) {
  return root.querySelector(sel);
}
export function qsa(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

export function el(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

export function formatDate(ts) {
  return new Date(ts).toLocaleDateString("ar", { year: "numeric", month: "long", day: "numeric" });
}