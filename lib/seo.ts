import { countryLanguage } from './i18n';
import { countries } from './catalog';

export const SITE_NAME = 'Stack';

export const SITE_TITLE = 'Stack - Búsqueda Inteligente';

export const SITE_DESCRIPTION =
  '¿Eres desarrollador? Encuentra sitios web que necesitan impulsar su rendimiento o creados con IA sin criterio. Contacta con negocios y plataformas reales y transfórmalos.';

export const SITE_KEYWORDS = [
  'Stack',
  'Stack Radar',
  'auditoría web',
  'buscar clientes desarrollo web',
  'prospectos para desarrolladores',
  'optimización de rendimiento web',
  'diagnóstico técnico web',
  'rediseño de sitios web',
  'sitios creados con inteligencia artificial',
  'freelance desarrollo web',
  'agencia web',
  'prospección de clientes web',
  'análisis de páginas web',
];

export const SEO_DESCRIPTIONS = {
  es: SITE_DESCRIPTION,
  en: 'Are you a developer? Find websites that need better performance or were built carelessly with AI. Contact real businesses and platforms and transform them.',
  pt: 'Você é desenvolvedor? Encontre sites que precisam melhorar o desempenho ou foram criados com IA sem critério. Entre em contato com negócios e plataformas reais e transforme-os.',
  fr: 'Vous développez des sites web ? Trouvez des sites à optimiser ou créés sans discernement avec l’IA. Contactez des entreprises et des plateformes réelles et transformez-les.',
  de: 'Du entwickelst Websites? Finde Seiten, die mehr Leistung brauchen oder unbedacht mit KI erstellt wurden. Kontaktiere echte Unternehmen und Plattformen und verbessere sie.',
  it: 'Sei uno sviluppatore? Trova siti da ottimizzare o creati con IA senza criterio. Contatta attività e piattaforme reali e trasformale.',
  nl: 'Ben je ontwikkelaar? Vind websites die beter moeten presteren of ondoordacht met AI zijn gemaakt. Neem contact op met echte bedrijven en platforms en verbeter ze.',
  ru: 'Вы разработчик? Находите сайты, которым нужна оптимизация или которые созданы с ИИ без должного внимания. Связывайтесь с реальными компаниями и платформами и улучшайте их.',
  uk: 'Ви розробник? Знаходьте сайти, що потребують оптимізації або створені з ШІ без належної уваги. Зв’язуйтеся з реальними компаніями й платформами та вдосконалюйте їх.',
  pl: 'Tworzysz strony internetowe? Znajdź witryny wymagające optymalizacji lub bezrefleksyjnie stworzone z AI. Skontaktuj się z prawdziwymi firmami i platformami i ulepsz je.',
  cs: 'Jste vývojář? Najděte weby, které potřebují optimalizaci nebo byly bez rozmyslu vytvořeny pomocí AI. Oslovte skutečné firmy a platformy a vylepšete je.',
  ro: 'Ești dezvoltator? Găsește site-uri care au nevoie de performanță mai bună sau au fost create neglijent cu AI. Contactează companii și platforme reale și transformă-le.',
  hu: 'Fejlesztő vagy? Találj optimalizálásra szoruló vagy átgondolatlanul, MI-vel készített weboldalakat. Lépj kapcsolatba valódi cégekkel és platformokkal, és fejleszd őket.',
  el: 'Είσαι προγραμματιστής; Βρες ιστοτόπους που χρειάζονται καλύτερη απόδοση ή δημιουργήθηκαν άκριτα με AI. Επικοινώνησε με πραγματικές επιχειρήσεις και πλατφόρμες και βελτίωσέ τες.',
  tr: 'Geliştirici misiniz? Performansı iyileştirilmesi gereken veya yapay zekâyla özensizce oluşturulan siteleri bulun. Gerçek işletme ve platformlarla iletişime geçip onları dönüştürün.',
  sv: 'Är du utvecklare? Hitta webbplatser som behöver bättre prestanda eller har skapats ogenomtänkt med AI. Kontakta riktiga företag och plattformar och förbättra dem.',
  no: 'Er du utvikler? Finn nettsteder som trenger bedre ytelse eller er laget ukritisk med KI. Kontakt virkelige bedrifter og plattformer og forbedre dem.',
  da: 'Er du udvikler? Find websteder, der har brug for bedre ydeevne eller er lavet ukritisk med AI. Kontakt rigtige virksomheder og platforme, og forbedr dem.',
  fi: 'Oletko kehittäjä? Löydä sivustoja, joiden suorituskykyä pitää parantaa tai jotka on tehty harkitsemattomasti tekoälyllä. Ota yhteyttä oikeisiin yrityksiin ja alustoihin ja uudista ne.',
  ar: 'هل أنت مطوّر؟ اكتشف مواقع تحتاج إلى تحسين الأداء أو أُنشئت بالذكاء الاصطناعي دون عناية. تواصل مع شركات ومنصات حقيقية وساعد في تطويرها.',
  he: 'מפתחים אתרים? מצאו אתרים שזקוקים לשיפור ביצועים או נבנו בחוסר שיקול דעת עם AI. צרו קשר עם עסקים ופלטפורמות אמיתיים ושפרו אותם.',
  fa: 'توسعه‌دهنده هستید؟ وب‌سایت‌هایی را پیدا کنید که به بهبود عملکرد نیاز دارند یا بدون دقت با هوش مصنوعی ساخته شده‌اند. با کسب‌وکارها و پلتفرم‌های واقعی تماس بگیرید و آن‌ها را بهبود دهید.',
  hi: 'क्या आप डेवलपर हैं? ऐसी वेबसाइट खोजें जिन्हें बेहतर प्रदर्शन की ज़रूरत है या जो AI से बिना सोचे-समझे बनाई गई हैं। वास्तविक व्यवसायों और प्लेटफ़ॉर्म से संपर्क करके उन्हें बेहतर बनाएँ।',
  bn: 'আপনি কি ডেভেলপার? এমন ওয়েবসাইট খুঁজুন যেগুলোর কর্মক্ষমতা উন্নত করা দরকার বা AI দিয়ে অযত্নে তৈরি করা হয়েছে। বাস্তব ব্যবসা ও প্ল্যাটফর্মের সঙ্গে যোগাযোগ করে সেগুলো উন্নত করুন।',
  ur: 'کیا آپ ڈویلپر ہیں؟ ایسی ویب سائٹس تلاش کریں جن کی کارکردگی بہتر بنانے کی ضرورت ہے یا جو AI سے لاپروائی سے بنائی گئی ہیں۔ حقیقی کاروباروں اور پلیٹ فارمز سے رابطہ کریں اور انہیں بہتر بنائیں۔',
  ja: '開発者の方へ。性能改善が必要なサイトや、AIで十分に検討せず作られたサイトを見つけましょう。実在する企業やプラットフォームに連絡し、サイトを改善できます。',
  zh: '你是开发者吗？寻找需要提升性能或未经充分考虑就用 AI 创建的网站。联系真实的企业和平台，帮助它们改进网站。',
  ko: '개발자이신가요? 성능 개선이 필요하거나 충분한 검토 없이 AI로 만든 웹사이트를 찾아보세요. 실제 기업과 플랫폼에 연락하고 웹사이트를 개선하세요.',
  id: 'Anda pengembang? Temukan situs yang perlu ditingkatkan kinerjanya atau dibuat sembarangan dengan AI. Hubungi bisnis dan platform nyata, lalu bantu perbaiki situs mereka.',
  ms: 'Anda pembangun web? Cari laman yang perlu ditingkatkan prestasinya atau dibina secara cuai dengan AI. Hubungi perniagaan dan platform sebenar dan bantu menambah baiknya.',
  vi: 'Bạn là lập trình viên? Tìm các website cần cải thiện hiệu suất hoặc được tạo bằng AI thiếu cân nhắc. Liên hệ doanh nghiệp và nền tảng thực tế để cải thiện chúng.',
  th: 'คุณเป็นนักพัฒนาหรือไม่? ค้นหาเว็บไซต์ที่ต้องปรับปรุงประสิทธิภาพหรือสร้างด้วย AI โดยขาดความใส่ใจ ติดต่อธุรกิจและแพลตฟอร์มจริงเพื่อช่วยพัฒนาเว็บไซต์ของพวกเขา',
  ca: 'Ets desenvolupador? Troba llocs web que necessiten millorar el rendiment o creats amb IA sense criteri. Contacta amb negocis i plataformes reals i transforma’ls.',
} as const;

export type SeoLanguage = keyof typeof SEO_DESCRIPTIONS;

const SEO_LOCALES: Record<SeoLanguage, string> = {
  es: 'es_ES', en: 'en_US', pt: 'pt_BR', fr: 'fr_FR', de: 'de_DE', it: 'it_IT', nl: 'nl_NL',
  ru: 'ru_RU', uk: 'uk_UA', pl: 'pl_PL', cs: 'cs_CZ', ro: 'ro_RO', hu: 'hu_HU', el: 'el_GR',
  tr: 'tr_TR', sv: 'sv_SE', no: 'nb_NO', da: 'da_DK', fi: 'fi_FI', ar: 'ar_SA', he: 'he_IL',
  fa: 'fa_IR', hi: 'hi_IN', bn: 'bn_BD', ur: 'ur_PK', ja: 'ja_JP', zh: 'zh_CN', ko: 'ko_KR',
  id: 'id_ID', ms: 'ms_MY', vi: 'vi_VN', th: 'th_TH', ca: 'ca_ES',
};

function supportedLanguage(value: string): SeoLanguage | undefined {
  const primary = value.trim().toLowerCase().replace(/_/g, '-').split('-')[0];
  const language = primary === 'nb' || primary === 'nn' ? 'no' : primary;
  return Object.hasOwn(SEO_DESCRIPTIONS, language) ? language as SeoLanguage : undefined;
}

export function resolveSeoLanguage(country?: string | null, acceptLanguage?: string | null): SeoLanguage {
  const region = country?.trim().toUpperCase();
  if (region && region !== 'ALL' && countries.some(([code]) => code === region)) {
    const language = supportedLanguage(countryLanguage(region));
    if (language) return language;
  }

  const preferences = (acceptLanguage ?? '').slice(0, 2048).split(',').map((part, index) => {
    const [tag, ...parameters] = part.trim().split(';');
    const quality = parameters.find(value => /^\s*q=/i.test(value));
    const q = quality ? Number(quality.split('=')[1]) : 1;
    return { language: supportedLanguage(tag), q, index };
  }).filter(item => item.language && Number.isFinite(item.q) && item.q > 0 && item.q <= 1)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  return preferences[0]?.language ?? 'es';
}

export function localizedSeo(country?: string | null, acceptLanguage?: string | null) {
  const language = resolveSeoLanguage(country, acceptLanguage);
  return { language, description: SEO_DESCRIPTIONS[language], locale: SEO_LOCALES[language] };
}

export function resolveSiteUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
  ];

  for (const candidate of candidates) {
    if (!candidate?.trim()) continue;
    const raw = candidate.trim().replace(/\/+$/, '');
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      const url = new URL(withProtocol);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) continue;
      return url.origin;
    } catch {
      continue;
    }
  }

  return 'https://stack-busqueda-inteligente.vercel.app';
}
