import type { Audit } from './types';
import { businessName } from './business-name';

const COUNTRY_LANGUAGES: Record<string, string> = {
  // Spanish
  AR: 'es', BO: 'es', CL: 'es', CO: 'es', CR: 'es', CU: 'es', DO: 'es', EC: 'es',
  ES: 'es', GQ: 'es', GT: 'es', HN: 'es', MX: 'es', NI: 'es', PA: 'es', PE: 'es',
  PR: 'es', PY: 'es', SV: 'es', UY: 'es', VE: 'es',
  // Portuguese
  AO: 'pt', BR: 'pt', CV: 'pt', GW: 'pt', MZ: 'pt', PT: 'pt', ST: 'pt', TL: 'pt',
  // French
  BE: 'fr', BF: 'fr', BI: 'fr', BJ: 'fr', CD: 'fr', CF: 'fr', CG: 'fr', CI: 'fr',
  CM: 'fr', DJ: 'fr', FR: 'fr', GA: 'fr', GF: 'fr', GN: 'fr', GP: 'fr', HT: 'fr',
  KM: 'fr', LU: 'fr', MC: 'fr', MF: 'fr', MG: 'fr', ML: 'fr', MQ: 'fr', NC: 'fr',
  NE: 'fr', PF: 'fr', PM: 'fr', RE: 'fr', RW: 'fr', SC: 'fr', SN: 'fr', TD: 'fr',
  TG: 'fr', WF: 'fr', YT: 'fr',
  // German
  AT: 'de', CH: 'de', DE: 'de', LI: 'de',
  // Italian
  IT: 'it', SM: 'it', VA: 'it',
  // Dutch
  AW: 'nl', BQ: 'nl', CW: 'nl', NL: 'nl', SR: 'nl', SX: 'nl',
  // Russian & Slavic / Central Asia
  RU: 'ru', BY: 'ru', KZ: 'ru', KG: 'ru',
  UA: 'uk', PL: 'pl', CZ: 'cs', SK: 'sk', BG: 'bg', RS: 'sr', HR: 'hr', SI: 'sl',
  BA: 'hr', ME: 'sr', MK: 'mk',
  // Afghanistan, Iran, Tajikistan, South Asia
  AF: 'ps', IR: 'fa', TJ: 'tg', PK: 'ur', IN: 'hi', BD: 'bn', NP: 'ne', LK: 'si',
  // Arabic world
  AE: 'ar', BH: 'ar', DZ: 'ar', EG: 'ar', EH: 'ar', IQ: 'ar', JO: 'ar', KW: 'ar',
  LB: 'ar', LY: 'ar', MA: 'ar', MR: 'ar', OM: 'ar', PS: 'ar', QA: 'ar', SA: 'ar',
  SD: 'ar', SO: 'ar', SY: 'ar', TN: 'ar', YE: 'ar',
  // East & Southeast Asia
  JP: 'ja', CN: 'zh', TW: 'zh', HK: 'zh', MO: 'zh', KR: 'ko', KP: 'ko', MN: 'mn',
  TH: 'th', VN: 'vi', ID: 'id', MY: 'ms', BN: 'ms', KH: 'km', LA: 'lo', MM: 'my',
  // Europe & Caucasus & Middle East
  TR: 'tr', GR: 'el', CY: 'el', IL: 'he', RO: 'ro', MD: 'ro', HU: 'hu', FI: 'fi',
  SE: 'sv', NO: 'no', DK: 'da', IS: 'is', EE: 'et', LV: 'lv', LT: 'lt', AL: 'sq',
  GE: 'ka', AM: 'hy', AZ: 'az', UZ: 'uz', TM: 'tk', AD: 'ca',
  // Africa local official
  ET: 'am', TZ: 'sw', KE: 'en',
};

const TLD_LANGUAGES: Record<string, string> = {
  af: 'ps', ir: 'fa', ru: 'ru', su: 'ru', by: 'ru', ua: 'uk', pl: 'pl', cz: 'cs',
  sk: 'sk', de: 'de', at: 'de', ch: 'de', fr: 'fr', be: 'fr', it: 'it', pt: 'pt',
  br: 'pt', nl: 'nl', tr: 'tr', gr: 'el', il: 'he', jp: 'ja', cn: 'zh', tw: 'zh',
  hk: 'zh', kr: 'ko', th: 'th', vn: 'vi', id: 'id', ro: 'ro', hu: 'hu', se: 'sv',
  no: 'no', dk: 'da', fi: 'fi', bg: 'bg', rs: 'sr', hr: 'hr', si: 'sl', lt: 'lt',
  lv: 'lv', ee: 'et', ge: 'ka', am: 'hy', az: 'az', kz: 'ru', uz: 'uz', pk: 'ur',
  in: 'hi', bd: 'bn', sa: 'ar', ae: 'ar', eg: 'ar', ma: 'ar', dz: 'ar', tn: 'ar',
  jo: 'ar', kw: 'ar', qa: 'ar', om: 'ar', bh: 'ar',
  es: 'es', pe: 'es', mx: 'es', ar: 'es', cl: 'es', co: 'es', uy: 'es', ec: 'es',
  bo: 'es', py: 'es', ve: 'es', cr: 'es', pa: 'es', gt: 'es', sv: 'es', hn: 'es',
  ni: 'es', do: 'es', cu: 'es',
  uk: 'en', us: 'en', au: 'en', nz: 'en', ca: 'en', ie: 'en', za: 'en', sg: 'en',
};

export function countryLanguage(country: string): string {
  if (!country || country === 'ALL') return 'en';
  return COUNTRY_LANGUAGES[country.toUpperCase()] ?? 'en';
}

export function detectTextScriptLanguage(text: string, country = 'ALL'): string | undefined {
  if (!text) return undefined;
  if (/[ښځڅډړږڼۍ]/.test(text)) return 'ps';
  if (/[پچژگ]/.test(text)) return 'fa';
  if (/[\u0600-\u06FF]{4,}/.test(text)) {
    if (country === 'AF') return 'ps';
    if (country === 'IR') return 'fa';
    if (country === 'PK') return 'ur';
    return 'ar';
  }
  if (/[іїєґІЇЄҐ]{2,}/.test(text)) return 'uk';
  if (/[\u0400-\u04FF]{4,}/.test(text)) {
    if (country === 'BG') return 'bg';
    if (country === 'RS') return 'sr';
    return 'ru';
  }
  if (/[\u3040-\u30FF]{2,}/.test(text)) return 'ja';
  if (/[\uAC00-\uD7AF]{2,}/.test(text)) return 'ko';
  if (/[\u4E00-\u9FFF]{3,}/.test(text)) return 'zh';
  if (/[\u0900-\u097F]{3,}/.test(text)) return country === 'NP' ? 'ne' : 'hi';
  if (/[\u0980-\u09FF]{3,}/.test(text)) return 'bn';
  if (/[\u0E00-\u0E7F]{3,}/.test(text)) return 'th';
  if (/[\u0370-\u03FF]{3,}/.test(text)) return 'el';
  if (/[\u0590-\u05FF]{3,}/.test(text)) return 'he';
  if (/[\u10A0-\u10FF]{3,}/.test(text)) return 'ka';
  if (/[\u0530-\u058F]{3,}/.test(text)) return 'hy';
  return undefined;
}

export function detectHtmlLanguage(htmlLangRaw: string, sampleText: string, country = 'ALL'): string | undefined {
  const byScript = detectTextScriptLanguage(sampleText, country);
  if (byScript) return byScript;
  const cleaned = htmlLangRaw.trim().toLowerCase().replace(/_/g, '-');
  const match = cleaned.match(/^([a-z]{2,3})(?:-[a-z0-9]{2,8})*$/);
  if (!match) return undefined;
  const primary = match[1] === 'prs' ? 'fa' : match[1];
  if (primary === 'en' && country !== 'ALL' && countryLanguage(country) !== 'en') {
    if (/\b(nosotros|servicios|contacto|inicio|empresa|productos|reservas|clientes|tienda)\b/i.test(sampleText)) return 'es';
    if (/\b(welcome|services|about|contact|our|company|products|booking|shop)\b/i.test(sampleText)) return 'en';
    return countryLanguage(country);
  }
  return primary;
}

export function resolveSiteLanguage(site: Pick<Audit, 'country' | 'domain' | 'name' | 'description' | 'language'>): string {
  const sample = `${site.name} ${site.description}`;
  const scriptLang = detectTextScriptLanguage(sample, site.country);
  if (scriptLang) return scriptLang;

  if (site.language) {
    const primary = site.language.split('-')[0].toLowerCase();
    if (primary && (primary !== 'en' || site.country === 'ALL' || countryLanguage(site.country) === 'en' || /\b(welcome|services|about|contact|our|company|shop|store|hotel|clinic)\b/i.test(sample))) {
      return primary;
    }
  }

  if (site.country && site.country !== 'ALL') {
    return countryLanguage(site.country);
  }

  const parts = site.domain.toLowerCase().split('.');
  const last = parts[parts.length - 1] ?? '';
  if (TLD_LANGUAGES[last]) return TLD_LANGUAGES[last];

  if (/\b(welcome|services|about|contact|our|company|shop|store|hotel|clinic|repair)\b/i.test(sample)) return 'en';
  return 'es';
}

type TemplatePack = {
  subject: (name: string) => string;
  opening: (name: string, sender: string) => string;
  findings: {
    mobile: string;
    placeholder: string;
    structure: string;
    overload: string;
    performance: string;
    accessibility: string;
    security: string;
    unreachable: string;
    blocked: string;
    default: string;
  };
  benefits: {
    commerce: string;
    hospitality: string;
    health: string;
    realestate: string;
    services: string;
    default: string;
  };
  closing: string;
};

const TEMPLATES: Record<string, TemplatePack> = {
  en: {
    subject: name => `A quick idea for ${name}'s website`,
    opening: (name, sender) => `Hello ${name} team, I'm reaching out from ${sender}.`,
    findings: {
      mobile: 'While reviewing your website, I noticed mobile layout signals that could make browsing harder on phones.',
      placeholder: 'While reviewing your website, I noticed template placeholder content that still appears unfinished.',
      structure: 'While reviewing your website, I spotted structure and heading details that could be organized more clearly.',
      overload: 'While reviewing your website, I noticed a high concentration of content on the homepage that could be simplified to guide visitors better.',
      performance: 'While reviewing your website, I spotted clear opportunities to improve loading speed and responsiveness.',
      accessibility: 'While reviewing your website, I noticed accessibility details—such as missing image descriptions or zoom limits—that would be helpful to improve.',
      security: 'While reviewing your website, I noticed connection and security configuration details worth updating to build visitor trust.',
      unreachable: 'I tried visiting your website during a review and could not reach it; it may be a temporary outage.',
      blocked: 'I tried reviewing your website, though automated access is restricted; even so, I would love to share a few improvement ideas.',
      default: 'I would love to chat about how to improve your website experience.',
    },
    benefits: {
      commerce: 'We can help you showcase your products more clearly and make purchasing easier.',
      hospitality: 'We can help you present your offering better and make inquiries and bookings effortless.',
      health: 'We can help you build stronger trust and make it easier for patients and clients to book appointments.',
      realestate: 'We can help you showcase your projects clearly and capture more inquiries from interested buyers.',
      services: 'We can help you present your services clearly and generate more client inquiries.',
      default: 'We can help you have a clearer, faster, and easier-to-use website.',
    },
    closing: 'Would you like me to share a brief proposal?',
  },
  pt: {
    subject: name => `Uma ideia para o site da ${name}`,
    opening: (name, sender) => `Olá, equipe da ${name}. Falo da ${sender}.`,
    findings: {
      mobile: 'Ao revisar o seu site, notei sinais de adaptação móvel que podem dificultar a navegação no celular.',
      placeholder: 'Ao revisar o seu site, encontrei textos de modelo que parecem pendentes de personalização.',
      structure: 'Ao revisar o seu site, notei detalhes na estrutura e nos títulos que poderiam ser melhor organizados.',
      overload: 'Ao revisar o seu site, vi bastante informação concentrada na página inicial que pode ser simplificada para guiar melhor o visitante.',
      performance: 'Ao revisar o seu site, identifiquei boas oportunidades para melhorar a velocidade de carregamento.',
      accessibility: 'Ao revisar o seu site, notei detalhes de acessibilidade que valeria a pena ajustar.',
      security: 'Ao revisar o seu site, observei detalhes de segurança e conexão HTTPS que seria importante revisar.',
      unreachable: 'Tentei acessar o seu site durante uma revisão, mas ele não respondeu; talvez seja algo temporário.',
      blocked: 'Tentei revisar o seu site, mas o acesso automático está restrito; ainda assim gostaria de compartilhar algumas ideias.',
      default: 'Gostaria de conversar sobre como melhorar a experiência do seu site.',
    },
    benefits: {
      commerce: 'Podemos ajudar a apresentar melhor seus produtos e facilitar as compras.',
      hospitality: 'Podemos ajudar a destacar sua proposta e facilitar consultas e reservas.',
      health: 'Podemos ajudar a transmitir mais confiança e facilitar o agendamento de consultas.',
      realestate: 'Podemos ajudar a apresentar melhor seus projetos e facilitar o contato de interessados.',
      services: 'Podemos ajudar a apresentar seus serviços com mais clareza e gerar novos contatos.',
      default: 'Podemos ajudar você a ter um site mais claro, rápido e fácil de usar.',
    },
    closing: 'Gostaria que eu enviasse uma breve proposta?',
  },
  fr: {
    subject: name => `Une idée pour le site web de ${name}`,
    opening: (name, sender) => `Bonjour à l'équipe de ${name}, je vous contacte de la part de ${sender}.`,
    findings: {
      mobile: 'En consultant votre site web, j’ai remarqué des détails d’affichage mobile qui pourraient gêner la navigation sur téléphone.',
      placeholder: 'En consultant votre site web, j’ai remarqué du contenu de modèle qui semble encore à personnaliser.',
      structure: 'En consultant votre site web, j’ai relevé des éléments de structure et de titres qui pourraient être mieux organisés.',
      overload: 'En consultant votre site web, j’ai remarqué une forte densité d’informations sur l’accueil qui pourrait être simplifiée.',
      performance: 'En consultant votre site web, j’ai identifié des pistes concrètes pour améliorer la vitesse de chargement.',
      accessibility: 'En consultant votre site web, j’ai noté quelques détails d’accessibilité utiles à améliorer.',
      security: 'En consultant votre site web, j’ai observé des paramètres de sécurité et HTTPS qu’il serait utile de vérifier.',
      unreachable: 'J’ai tenté de consulter votre site web mais il semblait inaccessible, peut-être de façon temporaire.',
      blocked: 'J’ai tenté d’analyser votre site web mais l’accès automatique est restreint ; j’aimerais tout de même vous partager quelques idées.',
      default: 'J’aimerais échanger avec vous sur l’amélioration de votre site web.',
    },
    benefits: {
      commerce: 'Nous pouvons vous aider à mieux mettre en valeur vos produits et faciliter les achats.',
      hospitality: 'Nous pouvons vous aider à valoriser votre offre et faciliter les demandes et réservations.',
      health: 'Nous pouvons vous aider à renforcer la confiance et simplifier la prise de rendez-vous.',
      realestate: 'Nous pouvons vous aider à mieux présenter vos projets et faciliter la prise de contact.',
      services: 'Nous pouvons vous aider à présenter vos services plus clairement et générer davantage de demandes.',
      default: 'Nous pouvons vous aider à disposer d’un site plus clair, rapide et agréable à utiliser.',
    },
    closing: 'Souhaitez-vous que je vous partage une brève proposition ?',
  },
  de: {
    subject: name => `Eine Idee für die Website von ${name}`,
    opening: (name, sender) => `Hallo liebes Team von ${name}, ich melde mich von ${sender}.`,
    findings: {
      mobile: 'Beim Prüfen Ihrer Website sind mir Hinweise zur mobilen Darstellung aufgefallen, die die Nutzung auf Smartphones erschweren könnten.',
      placeholder: 'Beim Prüfen Ihrer Website sind mir Platzhaltertexte aufgefallen, die noch nicht angepasst wirken.',
      structure: 'Beim Prüfen Ihrer Website sind mir Details in der Seitenstruktur und den Überschriften aufgefallen, die sich klarer gliedern lassen.',
      overload: 'Beim Prüfen Ihrer Website ist mir aufgefallen, dass die Startseite sehr viele Inhalte bündelt und übersichtlicher gestaltet werden könnte.',
      performance: 'Beim Prüfen Ihrer Website habe ich klare Möglichkeiten gesehen, die Ladezeit zu verbessern.',
      accessibility: 'Beim Prüfen Ihrer Website sind mir Details zur Barrierefreiheit aufgefallen, die verbessert werden könnten.',
      security: 'Beim Prüfen Ihrer Website sind mir Sicherheits- und HTTPS-Einstellungen aufgefallen, die geprüft werden sollten.',
      unreachable: 'Ich wollte Ihre Website aufrufen, konnte sie jedoch nicht erreichen – möglicherweise liegt eine vorübergehende Störung vor.',
      blocked: 'Ich wollte Ihre Website prüfen, der automatische Zugriff ist jedoch eingeschränkt; gerne teile ich dennoch ein paar Ideen.',
      default: 'Ich würde mich gerne darüber austauschen, wie wir den Auftritt Ihrer Website verbessern können.',
    },
    benefits: {
      commerce: 'Wir unterstützen Sie dabei, Ihre Produkte überzeugender zu präsentieren und den Kauf zu erleichtern.',
      hospitality: 'Wir helfen Ihnen, Ihr Angebot ansprechender zu zeigen und Anfragen sowie Reservierungen zu vereinfachen.',
      health: 'Wir helfen Ihnen, mehr Vertrauen aufzubauen und die Terminvereinbarung für Kunden zu erleichtern.',
      realestate: 'Wir helfen Ihnen, Ihre Projekte übersichtlich zu präsentieren und mehr Anfragen zu gewinnen.',
      services: 'Wir helfen Ihnen, Ihre Leistungen klarer darzustellen und neue Kundenanfragen zu fördern.',
      default: 'Wir unterstützen Sie mit einer übersichtlichen, schnellen und benutzerfreundlichen Website.',
    },
    closing: 'Darf ich Ihnen dazu einen kurzen Vorschlag zusenden?',
  },
  it: {
    subject: name => `Un'idea per il sito web di ${name}`,
    opening: (name, sender) => `Ciao team di ${name}, vi scrivo da ${sender}.`,
    findings: {
      mobile: 'Visitando il vostro sito ho notato segnali di adattamento mobile che potrebbero rendere meno comoda la navigazione da telefono.',
      placeholder: 'Visitando il vostro sito ho notato testi segnaposto di modello che sembrano ancora da personalizzare.',
      structure: 'Visitando il vostro sito ho notato dettagli nella struttura e nei titoli che si potrebbero ordinare meglio.',
      overload: 'Visitando il vostro sito ho visto molte informazioni concentrate nella pagina iniziale che potrebbero essere semplificate.',
      performance: 'Visitando il vostro sito ho individuato chiare opportunità per migliorare la velocità di caricamento.',
      accessibility: 'Visitando il vostro sito ho notato alcuni dettagli di accessibilità utili da migliorare.',
      security: 'Visitando il vostro sito ho osservato impostazioni HTTPS e di sicurezza che converrebbe verificare.',
      unreachable: 'Ho provato a visitare il vostro sito ma non risultava raggiungibile; forse si tratta di un problema temporaneo.',
      blocked: 'Ho provato ad analizzare il vostro sito ma l’accesso automatico è limitato; mi piacerebbe comunque condividere qualche idea.',
      default: 'Mi piacerebbe parlare di come migliorare l’esperienza del vostro sito web.',
    },
    benefits: {
      commerce: 'Possiamo aiutarvi a presentare meglio i prodotti e semplificare gli acquisti.',
      hospitality: 'Possiamo aiutarvi a valorizzare la vostra offerta e facilitare richieste e prenotazioni.',
      health: 'Possiamo aiutarvi a trasmettere maggiore fiducia e facilitare la prenotazione di appuntamenti.',
      realestate: 'Possiamo aiutarvi a mostrare meglio i vostri progetti e facilitare il contatto dei clienti.',
      services: 'Possiamo aiutarvi a presentare con più chiarezza i vostri servizi e ricevere nuove richieste.',
      default: 'Possiamo aiutarvi ad avere un sito più chiaro, veloce e facile da usare.',
    },
    closing: 'Vi farebbe piacere ricevere una breve proposta?',
  },
  ru: {
    subject: name => `Идея по улучшению сайта ${name}`,
    opening: (name, sender) => `Здравствуйте, команда ${name}! Пишу вам из ${sender}.`,
    findings: {
      mobile: 'При просмотре вашего сайта я заметил особенности мобильной адаптации, которые могут затруднять использование с телефона.',
      placeholder: 'При просмотре вашего сайта я заметил шаблонный текст, который, похоже, ещё не был заменён.',
      structure: 'При просмотре вашего сайта я обратил внимание на детали структуры и заголовков, которые можно упорядочить лучше.',
      overload: 'При просмотре вашего сайта я заметил высокую плотность информации на главной странице, которую можно упростить для удобства посетителей.',
      performance: 'При просмотре вашего сайта я увидел хорошие возможности для ускорения загрузки страниц.',
      accessibility: 'При просмотре вашего сайта я заметил детали доступности и оформления изображений, которые стоит улучшить.',
      security: 'При просмотре вашего сайта я обратил внимание на настройки защищённого соединения HTTPS и безопасности, которые стоит проверить.',
      unreachable: 'Я попытался открыть ваш сайт во время обзора, но он не ответил — возможно, это временная неполадка.',
      blocked: 'Я попробовал проверить ваш сайт, но автоматический доступ ограничен; тем не менее буду рад поделиться идеями по улучшению.',
      default: 'Хотел бы обсудить, как можно сделать ваш сайт удобнее и эффективнее для клиентов.',
    },
    benefits: {
      commerce: 'Мы поможем нагляднее представить ваши товары и упростить оформление покупок.',
      hospitality: 'Мы поможем лучше показать ваше предложение и упростить заявки и бронирование.',
      health: 'Мы поможем повысить доверие посетителей и упростить запись на приём.',
      realestate: 'Мы поможем выигрышно представить ваши проекты и увеличить число обращений.',
      services: 'Мы поможем понятнее рассказать о ваших услугах и упростить получение новых заявок.',
      default: 'Мы поможем сделать ваш сайт более понятным, быстрым и удобным для посетителей.',
    },
    closing: 'Подскажите, вам было бы интересно получить короткое предложение?',
  },
  ps: {
    subject: name => `د ${name} د وېب‌پاڼې د ښه‌والي لپاره یو وړاندیز`,
    opening: (name, sender) => `سلام د ${name} درنو همکارانو، زه د ${sender} له لوري له تاسو سره اړیکه نیسم.`,
    findings: {
      mobile: 'ستاسو د وېب‌پاڼې د کتنې پر مهال مې په موبایل کې د ښودنې ځینې برخې ولیدلې چې ښايي د موبایل کاروونکو ته ستونزمنې وي.',
      placeholder: 'ستاسو د وېب‌پاڼې د کتنې پر مهال مې د نمونې ځینې متنونه ولیدل چې لا هم بشپړ شوي نه ښکاري.',
      structure: 'ستاسو د وېب‌پاڼې د کتنې پر مهال مې په جوړښت او سرلیکونو کې ځینې ټکي ولیدل چې لا ښه تنظیمېدای شي.',
      overload: 'ستاسو د وېب‌پاڼې په لومړي مخ کې ډېر معلومات راټول شوي چې د ساده کولو له لارې لیدونکو ته اسانتیا برابرېدای شي.',
      performance: 'ستاسو د وېب‌پاڼې د کتنې پر مهال مې د پاڼې د چټکتیا د لوړولو لپاره ښه فرصتونه ولیدل.',
      accessibility: 'ستاسو د وېب‌پاڼې د لاسرسي او انځورونو په برخه کې ځینې کوچني ټکي شته چې ښه کېدای شي.',
      security: 'ستاسو د وېب‌پاڼې د خوندي اړیکې (HTTPS) او امنیتي تنظیماتو ځینې برخې بیاکتنې ته اړتیا لري.',
      unreachable: 'ما هڅه وکړه ستاسو وېب‌پاڼه وګورم خو خلاصه نه شوه؛ کېدای شي دا یوه لنډمهاله ستونزه وي.',
      blocked: 'ما غوښتل ستاسو وېب‌پاڼه وګورم خو اتومات لاسرسی محدود دی؛ بیا هم غواړم د ښه‌والي ځینې نظرونه درسره شریک کړم.',
      default: 'غواړم ستاسو د وېب‌پاڼې د تجربې د لا ښه کولو په اړه درسره خبرې وکړم.',
    },
    benefits: {
      commerce: 'موږ کولی شو ستاسو محصولات په لا روښانه بڼه وړاندې کړو او د پېرودلو بهیر اسانه کړو.',
      hospitality: 'موږ کولی شو ستاسو خدمات ښه وښیو او د پوښتنو او ریزرویشن بهیر اسانه کړو.',
      health: 'موږ کولی شو د مراجعینو باور زیات کړو او د وخت اخیستلو بهیر ورته اسانه کړو.',
      realestate: 'موږ کولی شو ستاسو پروژې په غوره بڼه معرفي کړو او د علاقه‌مندانو اړیکه اسانه کړو.',
      services: 'موږ کولی شو ستاسو خدمات په روښانه توګه وړاندې کړو او نوې اړیکې زیاتې کړو.',
      default: 'موږ کولی شو تاسو سره د یوې روښانه، چټکې او اسانه وېب‌پاڼې په لرلو کې مرسته وکړو.',
    },
    closing: 'آیا غواړئ چې یو لنډ وړاندیز درسره شریک کړم؟',
  },
  fa: {
    subject: name => `پیشنهادی برای بهبود وب‌سایت ${name}`,
    opening: (name, sender) => `سلام به تیم محترم ${name}، من از طرف ${sender} با شما در تماس هستم.`,
    findings: {
      mobile: 'هنگام بررسی وب‌سایت شما متوجه نکاتی در نمایش موبایل شدم که ممکن است استفاده با تلفن همراه را دشوار کند.',
      placeholder: 'هنگام بررسی وب‌سایت شما متوجه متن‌های نمونه قالب شدم که به نظر می‌رسد هنوز شخصی‌سازی نشده‌اند.',
      structure: 'هنگام بررسی وب‌سایت شما به نکاتی در ساختار صفحه و عنوان‌ها برخوردم که می‌توانند منظم‌تر شوند.',
      overload: 'هنگام بررسی وب‌سایت شما دیدم حجم زیادی از اطلاعات در صفحه اصلی جمع شده که ساده‌سازی آن مسیر بازدیدکننده را روشن‌تر می‌کند.',
      performance: 'هنگام بررسی وب‌سایت شما فرصت‌های خوبی برای افزایش سرعت بارگذاری صفحه مشاهده کردم.',
      accessibility: 'هنگام بررسی وب‌سایت شما نکاتی در دسترس‌پذیری و توضیحات تصاویر دیدم که بهبود آن‌ها مفید خواهد بود.',
      security: 'هنگام بررسی وب‌سایت شما نکاتی در تنظیمات امنیتی و اتصال HTTPS مشاهده کردم که بررسی آن‌ها به اعتماد بیشتر کاربران کمک می‌کند.',
      unreachable: 'در جریان بررسی تلاش کردم وارد وب‌سایت شما شوم اما در دسترس نبود؛ شاید مشکلی موقتی باشد.',
      blocked: 'قصد بررسی وب‌سایت شما را داشتم اما دسترسی خودکار محدود شده است؛ با این حال خوشحال می‌شوم چند ایده بهبود را با شما در میان بگذارم.',
      default: 'خوشحال می‌شوم درباره بهبود تجربه کاربری وب‌سایت شما گفت‌وگو کنیم.',
    },
    benefits: {
      commerce: 'می‌توانیم کمک کنیم محصولات خود را بهتر نمایش دهید و فرآیند خرید را آسان‌تر کنید.',
      hospitality: 'می‌توانیم کمک کنیم خدمات خود را بهتر معرفی کنید و ثبت درخواست و رزرو را ساده‌تر سازید.',
      health: 'می‌توانیم به جلب اعتماد بیشتر مراجعان و ساده‌تر شدن نوبت‌گیری کمک کنیم.',
      realestate: 'می‌توانیم پروژه‌های شما را شفاف‌تر معرفی کنیم و ارتباط مشتریان علاقه‌مند را آسان‌تر سازیم.',
      services: 'می‌توانیم خدمات شما را روشن‌تر ارائه دهیم و دریافت درخواست‌های جدید را ساده‌تر کنیم.',
      default: 'می‌توانیم به شما کمک کنیم وب‌سایتی شفاف‌تر، سریع‌تر و کاربرپسندتر داشته باشید.',
    },
    closing: 'آیا تمایل دارید یک پیشنهاد کوتاه برایتان ارسال کنم؟',
  },
  ar: {
    subject: name => `فكرة لتطوير الموقع الإلكتروني لـ ${name}`,
    opening: (name, sender) => `مرحباً فريق ${name}، أتواصل معكم من ${sender}.`,
    findings: {
      mobile: 'أثناء مراجعة موقعكم الإلكتروني لاحظت بعض التفاصيل في التوافق مع الهواتف المحمولة قد تصعّب التصفح.',
      placeholder: 'أثناء مراجعة موقعكم لاحظت نصوصاً تجريبية من القالب يبدو أنها بحاجة إلى تخصيص.',
      structure: 'أثناء مراجعة موقعكم لاحظت تفاصيل في هيكلة الصفحة والعناوين يمكن تنظيمها بشكل أوضح.',
      overload: 'أثناء مراجعة موقعكم لاحظت كثافة كبيرة في المحتوى بالصفحة الرئيسية يمكن تبسيطها لتوجيه الزائر بسهولة.',
      performance: 'أثناء مراجعة موقعكم وجدت فرصاً واضحة لتحسين سرعة التحميل والأداء.',
      accessibility: 'أثناء مراجعة موقعكم لاحظت تفاصيل تتعلق بإمكانية الوصول ووصف الصور يُفضّل تحسينها.',
      security: 'أثناء مراجعة موقعكم لاحظت إعدادات تتعلق بالأمان واتصال HTTPS يُستحسن التحقق منها.',
      unreachable: 'حاولت زيارة موقعكم أثناء المراجعة لكن تعذر الوصول إليه، وربما يكون الأمر مؤقتاً.',
      blocked: 'حاولت مراجعة موقعكم لكن الوصول التلقائي مقيد؛ ومع ذلك يسعدني مشاركة بعض الأفكار لتحسين الموقع.',
      default: 'يسعدني التحدث معكم حول كيفية تحسين تجربة الزوار في موقعكم الإلكتروني.',
    },
    benefits: {
      commerce: 'يمكننا مساعدتكم في عرض منتجاتكم بصورة أفضل وتسهيل عملية الشراء.',
      hospitality: 'يمكننا مساعدتكم في إبراز خدماتكم وتسهيل الاستفسارات والحجوزات.',
      health: 'يمكننا مساعدتكم في تعزيز ثقة المراجعين وتسهيل حجز المواعيد.',
      realestate: 'يمكننا مساعدتكم في عرض مشاريعكم بوضوح وتسهيل تواصل المهتمين.',
      services: 'يمكننا مساعدتكم في تقديم خدماتكم بوضوح أكبر وزيادة استفسارات العملاء.',
      default: 'يمكننا مساعدتكم في الحصول على موقع أوضح وأسرع وأسهل استخداماً.',
    },
    closing: 'هل ترغبون في أن أشارككم مقترحاً مختصراً؟',
  },
  zh: {
    subject: name => `关于优化 ${name} 网站的一点建议`,
    opening: (name, sender) => `${name} 团队您好，我来自 ${sender}。`,
    findings: {
      mobile: '在浏览贵司网站时，我注意到移动端适配方面存在一些细节，可能会影响手机用户的浏览体验。',
      placeholder: '在浏览贵司网站时，我发现页面中仍保留了部分模板示例文字，似乎尚未完全替换。',
      structure: '在浏览贵司网站时，我注意到页面结构与标题层级可以进一步梳理得更清晰。',
      overload: '在浏览贵司网站时，我看到首页集中了较多内容，适当精简排版能帮助访客更快找到重点。',
      performance: '在浏览贵司网站时，我发现页面加载速度和响应表现还有明显的提升空间。',
      accessibility: '在浏览贵司网站时，我注意到部分图片说明与无障碍细节可以进一步完善。',
      security: '在浏览贵司网站时，我注意到 HTTPS 与安全配置方面有一些值得检查的细节。',
      unreachable: '我在尝试访问贵司网站时未能正常打开，这可能只是暂时性的连接问题。',
      blocked: '我尝试查看贵司网站，但自动访问受到限制；不过仍希望与您分享几点网站优化建议。',
      default: '希望能与您交流如何进一步提升贵司网站的浏览体验。',
    },
    benefits: {
      commerce: '我们可以协助您更清晰地展示产品，让客户购买流程更顺畅。',
      hospitality: '我们可以协助您更好地呈现特色服务，方便客户咨询与预订。',
      health: '我们可以协助您增强访客信任感，让预约流程更加便捷。',
      realestate: '我们可以协助您更直观地展示项目信息，方便意向客户联系。',
      services: '我们可以协助您更清晰地介绍服务内容，带来更多有效咨询。',
      default: '我们可以协助您打造更清晰、快速且易用的网站。',
    },
    closing: '方便为您发送一份简短的优化方案吗？',
  },
  ja: {
    subject: name => `${name}様のWebサイト改善に関するご提案`,
    opening: (name, sender) => `${name} ご担当者様、${sender}よりご連絡いたしました。`,
    findings: {
      mobile: '貴社サイトを拝見したところ、スマートフォン表示の最適化に改善できそうな点が見受けられました。',
      placeholder: '貴社サイトを拝見したところ、テンプレートの仮テキストが一部残っているようでした。',
      structure: '貴社サイトを拝見したところ、ページ構成や見出しの整理でさらに分かりやすくできる点がありました。',
      overload: '貴社サイトを拝見したところ、トップページに情報が多く集まっており、整理することで案内しやすくなると感じました。',
      performance: '貴社サイトを拝見したところ、ページの表示速度をさらに改善できる余地がありました。',
      accessibility: '貴社サイトを拝見したところ、画像の代替テキストなどアクセシビリティ面で改善できる点がありました。',
      security: '貴社サイトを拝見したところ、HTTPS通信やセキュリティ設定について確認しておきたい点がありました。',
      unreachable: '貴社サイトを確認しようとしましたがアクセスできませんでした。一時的な不具合かもしれません。',
      blocked: '貴社サイトの自動確認は制限されておりましたが、改善アイデアをぜひ共有できれば幸いです。',
      default: '貴社サイトの使いやすさ向上についてぜひ一度ご相談できれば幸いです。',
    },
    benefits: {
      commerce: '商品の魅力をより分かりやすく伝え、購入しやすい導線づくりをお手伝いできます。',
      hospitality: 'サービスの魅力を伝え、お問い合わせやご予約をスムーズにするお手伝いができます。',
      health: '安心感を高め、お客様が予約しやすいサイトづくりをお手伝いできます。',
      realestate: '実績や物件情報を分かりやすく掲載し、お問い合わせ増加につなげるお手伝いができます。',
      services: 'サービス内容を明確に伝え、新しいご相談につながる構成をご提案できます。',
      default: 'より見やすく、高速で使いやすいWebサイトづくりをお手伝いできます。',
    },
    closing: '簡単なご提案資料をお送りしてもよろしいでしょうか？',
  },
  ko: {
    subject: name => `${name} 웹사이트 개선을 위한 간단한 제안`,
    opening: (name, sender) => `안녕하세요, ${name} 담당자님. ${sender}에서 연락드립니다.`,
    findings: {
      mobile: '귀사의 웹사이트를 살펴보면서 모바일 화면 최적화 부분에서 개선하면 좋을 점을 발견했습니다.',
      placeholder: '귀사의 웹사이트를 살펴보면서 아직 수정되지 않은 템플릿 예시 문구가 남아 있는 것을 확인했습니다.',
      structure: '귀사의 웹사이트를 살펴보면서 페이지 구조와 제목 배치를 더 명확하게 정리할 수 있는 부분이 보였습니다.',
      overload: '귀사의 첫 화면에 많은 정보가 집중되어 있어 핵심 내용을 찾기 쉽게 정리하면 좋겠다고 느꼈습니다.',
      performance: '귀사의 웹사이트에서 로딩 속도와 반응성을 높일 수 있는 분명한 개선 여지를 확인했습니다.',
      accessibility: '귀사의 웹사이트에서 이미지 대체 텍스트 등 접근성 측면의 개선 포인트를 확인했습니다.',
      security: '귀사의 웹사이트에서 HTTPS 연결 및 보안 설정과 관련해 점검해 보면 좋을 항목이 있었습니다.',
      unreachable: '검토 중 귀사의 웹사이트에 접속을 시도했으나 연결되지 않았습니다. 일시적인 현상일 수 있습니다.',
      blocked: '자동 점검 접근이 제한되어 있었지만, 웹사이트 개선 아이디어를 간단히 공유드리고 싶습니다.',
      default: '웹사이트 사용자 경험을 개선할 수 있는 방법에 대해 이야기를 나누고 싶습니다.',
    },
    benefits: {
      commerce: '제품을 더욱 매력적으로 소개하고 구매 과정을 편리하게 만들 수 있도록 도와드립니다.',
      hospitality: '브랜드의 강점을 잘 보여주고 문의 및 예약이 쉬워지도록 개선해 드릴 수 있습니다.',
      health: '방문자에게 더 큰 신뢰를 주고 예약 절차를 간편하게 만들 수 있습니다.',
      realestate: '프로젝트 정보를 한눈에 보여주고 관심 고객의 문의를 늘릴 수 있도록 도와드립니다.',
      services: '서비스 내용을 명확히 전달하고 신규 고객 문의를 늘릴 수 있도록 지원해 드립니다.',
      default: '더 깔끔하고 빠르며 사용하기 쉬운 웹사이트로 개선해 드릴 수 있습니다.',
    },
    closing: '간단한 제안서를 보내드려도 괜찮을까요?',
  },
  nl: {
    subject: name => `Een idee voor de website van ${name}`,
    opening: (name, sender) => `Hallo team van ${name}, ik neem contact op namens ${sender}.`,
    findings: {
      mobile: 'Bij het bekijken van jullie website vielen mij mobiele weergavedetails op die het gebruik op telefoons lastiger kunnen maken.',
      placeholder: 'Bij het bekijken van jullie website zag ik standaard sjabloontekst die nog niet aangepast lijkt.',
      structure: 'Bij het bekijken van jullie website zag ik punten in de structuur en koppen die overzichtelijker kunnen.',
      overload: 'Bij het bekijken van jullie website viel op dat er veel informatie op de startpagina staat die eenvoudiger gepresenteerd kan worden.',
      performance: 'Bij het bekijken van jullie website zag ik duidelijke kansen om de laadsnelheid te verbeteren.',
      accessibility: 'Bij het bekijken van jullie website vielen enkele toegankelijkheidsdetails op die verbeterd kunnen worden.',
      security: 'Bij het bekijken van jullie website zag ik beveiligings- en HTTPS-instellingen die het waard zijn om na te kijken.',
      unreachable: 'Ik probeerde jullie website te bezoeken, maar deze was op dat moment niet bereikbaar.',
      blocked: 'Ik wilde jullie website bekijken, maar automatische toegang is beperkt; toch deel ik graag enkele verbeterideeën.',
      default: 'Ik kom graag in contact over hoe we jullie website gebruiksvriendelijker kunnen maken.',
    },
    benefits: {
      commerce: 'We kunnen helpen om jullie producten duidelijker te presenteren en bestellen makkelijker te maken.',
      hospitality: 'We kunnen helpen om jullie aanbod beter te tonen en aanvragen en reserveringen te vereenvoudigen.',
      health: 'We kunnen helpen om meer vertrouwen uit te stralen en het maken van afspraken eenvoudiger te maken.',
      realestate: 'We kunnen helpen om projecten overzichtelijker te presenteren en meer aanvragen aan te trekken.',
      services: 'We kunnen helpen om jullie diensten helder te presenteren en nieuwe aanvragen te stimuleren.',
      default: 'We kunnen helpen met een duidelijkere, snellere en gebruiksvriendelijkere website.',
    },
    closing: 'Zal ik een kort voorstel met jullie delen?',
  },
  tr: {
    subject: name => `${name} web sitesi için kısa bir öneri`,
    opening: (name, sender) => `Merhaba ${name} ekibi, size ${sender} adına ulaşıyorum.`,
    findings: {
      mobile: 'Web sitenizi incelerken mobil uyumlulukla ilgili telefon kullanımını zorlaştırabilecek bazı detaylar fark ettim.',
      placeholder: 'Web sitenizi incelerken henüz güncellenmemiş şablon metinleri olduğunu fark ettim.',
      structure: 'Web sitenizi incelerken sayfa yapısı ve başlıklarda daha düzenli hale getirilebilecek noktalar gördüm.',
      overload: 'Web sitenizin ana sayfasında yoğun bilgi bulunduğunu ve sadeleştirilerek ziyaretçilerin daha rahat yönlendirilebileceğini gördüm.',
      performance: 'Web sitenizi incelerken açılış hızını artırabilecek net fırsatlar tespit ettim.',
      accessibility: 'Web sitenizi incelerken görsel açıklamaları ve erişilebilirlik açısından iyileştirilebilecek detaylar gördüm.',
      security: 'Web sitenizi incelerken HTTPS ve güvenlik yapılandırmasıyla ilgili kontrol edilmesi faydalı olacak noktalar fark ettim.',
      unreachable: 'İnceleme sırasında web sitenize ulaşmaya çalıştım ancak erişemedim; geçici bir durum olabilir.',
      blocked: 'Web sitenizi incelemek istedim ancak otomatik erişim kısıtlı; yine de birkaç geliştirme fikri paylaşmak isterim.',
      default: 'Web sitenizin ziyaretçi deneyimini nasıl geliştirebileceğimiz üzerine görüşmek isterim.',
    },
    benefits: {
      commerce: 'Ürünlerinizi daha net sergilemenize ve satın alma sürecini kolaylaştırmanıza yardımcı olabiliriz.',
      hospitality: 'Hizmetlerinizi daha iyi tanıtarak iletişim ve rezervasyonları kolaylaştırmanıza destek olabiliriz.',
      health: 'Ziyaretçilere daha fazla güven vererek randevu alma sürecini kolaylaştırabiliriz.',
      realestate: 'Projelerinizi daha etkili sunmanıza ve ilgilenen müşterilerin size kolayca ulaşmasına yardımcı olabiliriz.',
      services: 'Hizmetlerinizi daha anlaşılır sunmanıza ve yeni müşteri talepleri almanıza destek olabiliriz.',
      default: 'Daha anlaşılır, hızlı ve kullanımı kolay bir web sitesine sahip olmanıza yardımcı olabiliriz.',
    },
    closing: 'Size kısa bir öneri paylaşmamı ister misiniz?',
  },
  pl: {
    subject: name => `Pomysł na ulepszenie strony ${name}`,
    opening: (name, sender) => `Dzień dobry zespołowi ${name}, piszę z ${sender}.`,
    findings: {
      mobile: 'Przeglądając Państwa stronę, zauważyłem sygnały dotyczące wersji mobilnej, które mogą utrudniać korzystanie na telefonie.',
      placeholder: 'Przeglądając Państwa stronę, zauważyłem przykładowe teksty szablonu, które wyglądają na nieuzupełnione.',
      structure: 'Przeglądając Państwa stronę, zwróciłem uwagę na strukturę i nagłówki, które można lepiej uporządkować.',
      overload: 'Przeglądając Państwa stronę, zauważyłem duże nagromadzenie treści na stronie głównej, które warto uprościć.',
      performance: 'Przeglądając Państwa stronę, dostrzegłem wyraźne możliwości przyspieszenia jej ładowania.',
      accessibility: 'Przeglądając Państwa stronę, zauważyłem detale dostępności, które warto poprawić.',
      security: 'Przeglądając Państwa stronę, zwróciłem uwagę na ustawienia HTTPS i bezpieczeństwa warte sprawdzenia.',
      unreachable: 'Próbowałem odwiedzić Państwa stronę podczas przeglądu, ale była niedostępna — być może to chwilowa przerwa.',
      blocked: 'Chciałem przejrzeć Państwa stronę, choć dostęp automatyczny jest ograniczony; mimo to chętnie podzielę się kilkoma pomysłami.',
      default: 'Chętnie porozmawiam o tym, jak poprawić wygodę korzystania z Państwa strony.',
    },
    benefits: {
      commerce: 'Pomożemy lepiej zaprezentować produkty i ułatwić zakupy klientom.',
      hospitality: 'Pomożemy lepiej pokazać ofertę oraz ułatwić zapytania i rezerwacje.',
      health: 'Pomożemy zwiększyć zaufanie i ułatwić umawianie wizyt.',
      realestate: 'Pomożemy czytelniej przedstawić inwestycje i ułatwić kontakt zainteresowanym.',
      services: 'Pomożemy przejrzyście przedstawić usługi i zwiększyć liczbę zapytań.',
      default: 'Pomożemy stworzyć bardziej przejrzystą, szybką i wygodną stronę internetową.',
    },
    closing: 'Czy chcieliby Państwo, abym przesłał krótką propozycję?',
  },
  uk: {
    subject: name => `Ідея щодо покращення сайту ${name}`,
    opening: (name, sender) => `Вітаю команду ${name}! Пишу вам із ${sender}.`,
    findings: {
      mobile: 'Переглядаючи ваш сайт, я помітив деталі мобільної адаптації, які можуть ускладнювати користування з телефону.',
      placeholder: 'Переглядаючи ваш сайт, я помітив шаблонний текст, який ще потребує заміни.',
      structure: 'Переглядаючи ваш сайт, я звернув увагу на структуру та заголовки, які можна впорядкувати краще.',
      overload: 'Переглядаючи ваш сайт, я помітив велику кількість інформації на головній сторінці, яку варто спростити.',
      performance: 'Переглядаючи ваш сайт, я побачив можливості для пришвидшення завантаження сторінок.',
      accessibility: 'Переглядаючи ваш сайт, я помітив деталі доступності, які варто покращити.',
      security: 'Переглядаючи ваш сайт, я звернув увагу на налаштування HTTPS і безпеки, які варто перевірити.',
      unreachable: 'Під час огляду я спробував відкрити ваш сайт, але він не відповідав — можливо, це тимчасово.',
      blocked: 'Я спробував перевірити ваш сайт, але автоматичний доступ обмежено; проте радо поділюся ідеями покращення.',
      default: 'Хотів би обговорити, як зробити ваш сайт зручнішим для клієнтів.',
    },
    benefits: {
      commerce: 'Ми допоможемо краще представити ваші товари та спростити оформлення замовлень.',
      hospitality: 'Ми допоможемо краще показати вашу пропозицію та спростити бронювання й звернення.',
      health: 'Ми допоможемо підвищити довіру відвідувачів і спростити запис на прийом.',
      realestate: 'Ми допоможемо наочно представити ваші проєкти та збільшити кількість звернень.',
      services: 'Ми допоможемо чіткіше представити ваші послуги та залучити нові запити.',
      default: 'Ми допоможемо зробити ваш сайт зрозумілішим, швидшим і зручнішим.',
    },
    closing: 'Чи було б вам цікаво отримати коротку пропозицію?',
  },
  hi: {
    subject: name => `${name} की वेबसाइट को बेहतर बनाने के लिए एक सुझाव`,
    opening: (name, sender) => `नमस्ते ${name} टीम, मैं ${sender} की ओर से संपर्क कर रहा हूँ।`,
    findings: {
      mobile: 'आपकी वेबसाइट देखते समय मुझे मोबाइल डिस्प्ले से जुड़े कुछ संकेत मिले जिनसे फ़ोन पर उपयोग थोड़ा कठिन हो सकता है।',
      placeholder: 'आपकी वेबसाइट देखते समय मुझे टेम्पलेट का डिफ़ॉल्ट टेक्स्ट दिखा जिसे अभी कस्टमाइज़ किया जाना बाकी लगता है।',
      structure: 'आपकी वेबसाइट देखते समय मुझे पेज की संरचना और शीर्षकों में सुधार के अवसर दिखाई दिए।',
      overload: 'आपकी वेबसाइट के होमपेज पर काफी अधिक जानकारी एक साथ दिखी जिसे सरल बनाकर विज़िटर का मार्गदर्शन बेहतर किया जा सकता है।',
      performance: 'आपकी वेबसाइट देखते समय मुझे पेज लोडिंग स्पीड बेहतर करने के स्पष्ट अवसर दिखे।',
      accessibility: 'आपकी वेबसाइट में इमेज विवरण और एक्सेसिबिलिटी से जुड़े कुछ बिंदु बेहतर किए जा सकते हैं।',
      security: 'आपकी वेबसाइट में HTTPS और सुरक्षा सेटिंग्स से जुड़े कुछ बिंदु जाँचना उपयोगी रहेगा।',
      unreachable: 'समीक्षा के दौरान मैंने आपकी वेबसाइट खोलने का प्रयास किया लेकिन वह उपलब्ध नहीं थी; हो सकता है यह अस्थायी समस्या हो।',
      blocked: 'मैंने आपकी वेबसाइट देखने की कोशिश की पर स्वचालित एक्सेस सीमित है; फिर भी मैं सुधार के कुछ विचार साझा करना चाहूँगा।',
      default: 'मैं आपकी वेबसाइट के अनुभव को और बेहतर बनाने के बारे में बात करना चाहूँगा।',
    },
    benefits: {
      commerce: 'हम आपके उत्पादों को बेहतर ढंग से प्रस्तुत करने और खरीदारी को आसान बनाने में मदद कर सकते हैं।',
      hospitality: 'हम आपकी सेवाओं को बेहतर दिखाने तथा पूछताछ और बुकिंग आसान बनाने में मदद कर सकते हैं।',
      health: 'हम ग्राहकों का भरोसा बढ़ाने और अपॉइंटमेंट बुक करना सरल बनाने में मदद कर सकते हैं।',
      realestate: 'हम आपके प्रोजेक्ट्स को स्पष्ट रूप से दिखाने और इच्छुक ग्राहकों का संपर्क बढ़ाने में मदद कर सकते हैं।',
      services: 'हम आपकी सेवाओं को अधिक स्पष्टता से प्रस्तुत करने और नई पूछताछ बढ़ाने में मदद कर सकते हैं।',
      default: 'हम आपको एक अधिक स्पष्ट, तेज़ और उपयोग में आसान वेबसाइट बनाने में मदद कर सकते हैं।',
    },
    closing: 'क्या आप चाहेंगे कि मैं एक संक्षिप्त प्रस्ताव साझा करूँ?',
  },
};

export function hasNativeTemplate(lang: string): boolean {
  return lang === 'es' || Object.hasOwn(TEMPLATES, lang);
}

export function localizedEmailSubject(name: string, lang: string): string {
  name = businessName(name);
  if (lang === 'es') return `Una idea para la web de ${name}`;
  const pack = TEMPLATES[lang] ?? TEMPLATES.en;
  return pack.subject(name);
}

export function localizedContactMessage(site: Audit, sender = 'Stack', lang = 'en'): string {
  const cleanSender = sender.trim() || 'Stack';
  const pack = TEMPLATES[lang] ?? TEMPLATES.en;
  const issue = [...site.issues].sort((a, b) => b.points - a.points)[0];

  let finding = pack.findings.default;
  if (site.status === 'active' && issue) {
    if (/placeholder|plantilla|relleno/i.test(issue.id + issue.title)) {
      finding = pack.findings.placeholder;
    } else if (['content-overload', 'unstructured-content', 'text-walls', 'link-overload'].includes(issue.id)) {
      finding = pack.findings.overload;
    } else if (issue.category === 'mobile' || ['viewport', 'fixed-width'].includes(issue.id)) {
      finding = pack.findings.mobile;
    } else if (issue.category === 'performance') {
      finding = pack.findings.performance;
    } else if (issue.category === 'accessibility') {
      finding = pack.findings.accessibility;
    } else if (issue.category === 'security') {
      finding = pack.findings.security;
    } else {
      finding = pack.findings.structure;
    }
  } else if (site.status === 'unreachable') {
    finding = pack.findings.unreachable;
  } else if (site.status === 'blocked') {
    finding = pack.findings.blocked;
  }

  const benefit = /comercio|tienda/i.test(site.category)
    ? pack.benefits.commerce
    : /restaurante|turismo|hotel|deporte|fitness/i.test(site.category)
      ? pack.benefits.hospitality
      : /salud|belleza/i.test(site.category)
        ? pack.benefits.health
        : /inmobiliaria|construcci/i.test(site.category)
          ? pack.benefits.realestate
          : /servicios|educaci|automotriz|tecnolog|arte|dise[ñn]o|portafolio/i.test(site.category)
            ? pack.benefits.services
            : pack.benefits.default;

  return `${pack.opening(businessName(site.name), cleanSender)}\n\n${finding} ${benefit}\n\n${pack.closing}`;
}
