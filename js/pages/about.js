import { icon } from "../lib/icons.js";

export async function renderAbout(root) {
  root.innerHTML = `
    <h1>حول التطبيق</h1>

    <p style="color:var(--text-muted);">
      <strong> مَوَدَّةُ القُرْآنِ</strong> هو تطبيق يتيح لك قراءة كتاب الله تعالى بسهولة، ويعمل بالكامل
      دون الحاجة إلى الاتصال بالإنترنت، ليكون رفيقك في كل وقت ومكان.
    </p>

    <div class="ornamental-divider">${icon("star")}</div>

    <h3>مميزات التطبيق</h3>

    <ul style="color:var(--text-muted); padding-inline-start:1.4rem;">
      <li>📖 قراءة القرآن الكريم كاملًا بالرسم العثماني.</li>
      <li>🔍 البحث السريع داخل آيات القرآن الكريم.</li>
      <li>🔖 حفظ العلامات المرجعية للعودة إلى موضع القراءة.</li>
      <li>📝 إضافة ملاحظات على الآيات.</li>
      <li>🌙 دعم الوضع الليلي لتجربة قراءة مريحة.</li>
      <li>📱 يعمل بالكامل بدون اتصال بالإنترنت.</li>
      <li>⚡ تصميم بسيط وأداء سريع وسهل الاستخدام.</li>
    </ul>

    <div class="ornamental-divider">${icon("star")}</div>

    <h3>صدقة جارية</h3>

    <p style="color:var(--text-muted);">
      تم تطوير هذا التطبيق وإتاحته مجانًا ليكون
      <strong>صدقة جارية</strong> على روح والدي الغالي
      <strong>محمد كامل عيد</strong> رحمه الله تعالى.
    </p>

    <p style="color:var(--text-muted);">
      نسأل الله عز وجل أن يتقبله قبولًا حسنًا، وأن يغفر له ويرحمه،
      ويجعل هذا العمل في ميزان حسناته، وأن يجعل القرآن الكريم شفيعًا له يوم القيامة.
    </p>

    <p style="color:var(--text-muted);">
      إن وجدت في هذا التطبيق خيرًا أو انتفعت به، فلا تنسَ والدي من صالح دعائك
      بالرحمة والمغفرة، فالدعاء من أعظم الهدايا التي تصل إلى الميت بإذن الله.
    </p>

    <div class="ornamental-divider">${icon("star")}</div>

<h3>عن التطبيق</h3>

<p style="color:var(--text-muted);">
تم تطوير هذا التطبيق بعناية ليكون سهل الاستخدام، ونسعد دائمًا بملاحظاتكم واقتراحاتكم لتطويره.
</p>

<p style="margin-top:1rem;">
  <a
    href="https://www.linkedin.com/in/haithem-mohamed-8b7143243/"
    target="_blank"
    rel="noopener noreferrer"
    style="
      color:var(--accent);
      text-decoration:none;
      font-weight:600;
    "
  >
    تواصل عبر LinkedIn
  </a>
</p>

    <div class="ornamental-divider">${icon("star")}</div>

    <div class="ornamental-divider">${icon("star")}</div>

    <blockquote style="
      margin:1.5rem 0;
      padding:1rem;
      border-inline-start:4px solid var(--accent);
      background:var(--surface-2);
      color:var(--text-muted);
      border-radius:12px;
      line-height:1.9;
    ">
      <strong>﴿ وَقُل رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا ﴾</strong>
      <br><br>
      اللهم اغفر له وارحمه، وعافه واعف عنه، وأكرم نزله، ووسع مدخله،
      واجعل القرآن الكريم نورًا لقبره، وشفيعًا له يوم القيامة.
    </blockquote>

    <p style="
      color:var(--text-muted);
      text-align:center;
      font-size:var(--step--1);
      margin-top:2rem;
    ">
      نسأل الله أن ينفع بهذا التطبيق كل مسلم، وأن يجعله خالصًا لوجهه الكريم.
    </p>

    <p style="text-align:center; margin-top:2rem;">
      <a
        href="privacy-policy.html"
        target="_blank"
        rel="noopener noreferrer"
        style="color:var(--accent); text-decoration:none; font-weight:600;"
      >
        سياسة الخصوصية
      </a>
    </p>
  `;
}