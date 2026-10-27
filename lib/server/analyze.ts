import { load } from 'cheerio';
import { createHash } from 'node:crypto';
import { detectHtmlLanguage } from '../i18n';
import type { Audit, Contact, Issue } from '../types';
import type { PublicResponse } from './safe-fetch';

const clean = (value: string, max = 300) => value.replace(/\s+/g, ' ').trim().slice(0, max);
const wordSegmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
const countWords = (value: string) => {
  let count = 0;
  for (const segment of wordSegmenter.segment(value)) if (segment.isWordLike) count++;
  return count;
};
const normalizedText = (value: string) => clean(value, 200000).toLocaleLowerCase();
const boilerplate = /lorem ipsum|your business name|insert (?:your )?(?:company|business|text) here|aquí va tu texto|reemplaza este texto/i;

// Correlated symptoms in one area should not overwhelm the overall priority.
export function priorityScore(issues: Issue[]): number {
  const caps: Record<Issue['category'], number> = { structure: 45, mobile: 30, performance: 30, accessibility: 20, security: 30, availability: 0 };
  const totals: Partial<Record<Issue['category'], number>> = {};
  for (const issue of issues) totals[issue.category] = (totals[issue.category] ?? 0) + issue.points;
  return Math.min(100, Object.entries(totals).reduce((sum, [category, points]) => sum + Math.min(caps[category as Issue['category']], points), 0));
}

function usefulDescription(value: string): boolean {
  if (!value || boilerplate.test(value)) return false;
  const words = normalizedText(value).match(/[\p{L}\p{N}]+/gu) ?? [];
  if (words.length < 18) return true;
  const triples = words.slice(2).map((word, index) => `${words[index]} ${words[index + 1]} ${word}`);
  return triples.length - new Set(triples).size < Math.max(4, triples.length * .2);
}

export function extractContacts(html: string, source: string): Contact[] {
  const $ = load(html); $('script,style,noscript').remove();
  const contacts: Contact[] = [];
  const add = (type: Contact['type'], raw: string) => {
    if (type !== 'email' && !/^\+?[\d\s().-]+$/.test(raw.trim())) return;
    const value = type === 'email' ? raw.toLowerCase().trim() : raw.replace(/[^\d+]/g, '');
    if (type === 'email' && (value.length > 254 || !/^[a-z\d.!#$%&'*+/=?^_`{|}~-]+@(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z]{2,63}$/i.test(value) || /(?:example\.|test@|noreply@|no-reply@|\.(png|jpg|svg|webp)$)/i.test(value))) return;
    if (type !== 'email' && (value.replace(/\D/g, '').length < 8 || value.replace(/\D/g, '').length > 15)) return;
    if (type === 'whatsapp' && !/^\+?[1-9]\d{7,14}$/.test(value)) return;
    if (!contacts.some(c => c.type === type && c.value === value)) contacts.push({ type, value, source });
  };
  $('a[href]').each((_, element) => {
    const href = $(element).attr('href') ?? '';
    if (/^mailto:/i.test(href)) { try { for (const address of decodeURIComponent(href.slice(7).split('?')[0]).split(/[,;]/)) add('email', address); } catch { /* invalid public link */ } }
    if (/^tel:/i.test(href)) { try { add('phone', decodeURIComponent(href.slice(4).split(/[?;]/)[0])); } catch { /* invalid public link */ } }
    try {
      const url = new URL(href, source);
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return;
      if (url.hostname === 'wa.me' && /^\/\+?\d+\/?$/.test(url.pathname)) add('whatsapp', url.pathname.replace(/^\/|\/$/g, ''));
      if (['api.whatsapp.com', 'web.whatsapp.com', 'www.whatsapp.com'].includes(url.hostname)) add('whatsapp', url.searchParams.get('phone') ?? '');
    } catch { /* not a web link */ }
  });
  const text = $('body').find('*').addBack().contents().filter((_, node) => node.type === 'text').map((_, node) => $(node).text()).get().join(' ');
  for (const email of text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []) add('email', email);
  // Require a contact label: arbitrary digit strings can be tax IDs, dates or prices.
  for (const match of text.matchAll(/\b(?:tel[eé]fonos?|telefones?|telephone|téléphone|telefon|phone|mobile|call us|tel\.|celular(?:es)?|cel\.|m[oó]vil|ll[aá]manos|whatsapp)\s*[:.\-]?\s*(\+?\d[\d\s().-]{6,24}\d)(?!\d)/gi)) add('phone', match[1]);
  return contacts.slice(0, 12);
}

export function contactPages(html: string, base: string): string[] {
  const $ = load(html); const origin = new URL(base).origin; const urls: { url: string; priority: number }[] = [];
  $('a[href]').each((_, el) => {
    const text = `${$(el).text()} ${$(el).attr('href')}`;
    if (!/contact|contato|kontakt|contatti|quienes-somos|sobre-nosotros|acerca|about|soporte|support|impressum|联系我们|お問い合わせ|تواصل|контакты/i.test(text)) return;
    try { const url = new URL($(el).attr('href')!, base); url.hash = ''; if (url.origin === origin && url.href !== base && !urls.some(item => item.url === url.href) && !/\.(pdf|jpg|png|zip)$/i.test(url.pathname)) urls.push({ url: url.href, priority: /contact|contato|kontakt|contatti/i.test(text) ? 0 : 1 }); } catch { /* invalid link */ }
  });
  return urls.sort((a, b) => a.priority - b.priority).slice(0, 2).map(item => item.url);
}

export function analyzeHtml(response: PublicResponse, country = 'ALL', category = 'Otros'): Audit {
  const $ = load(response.body); const url = new URL(response.url); const issues: Issue[] = [];
  const add = (id: string, title: string, detail: string, issueCategory: Issue['category'], severity: Issue['severity'], points: number) => issues.push({ id, title, detail, category: issueCategory, severity, points });
  const title = clean($('title').first().text(), 100);
  const metaDescription = clean($('meta[name="description"]').attr('content') ?? $('meta[property="og:description"]').attr('content') ?? '', 400);
  const viewportContent = $('meta[name="viewport"]').attr('content') ?? '';
  const viewport = /width\s*=\s*device-width/i.test(viewportContent);
  const visible = load(response.body);
  visible('script,style,noscript,template,svg,[hidden],[aria-hidden="true"],.slick-cloned,.swiper-slide-duplicate').remove();
  visible('[style]').filter((_, el) => /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden)\s*(?:!important\s*)?(?:;|$)/i.test(visible(el).attr('style') ?? '')).remove();
  const main = visible('main,[role="main"]').first();
  const content = (main.length ? main : visible('body')).clone();
  content.find('nav,footer,aside,form,button,[role="navigation"],[role="banner"],[role="contentinfo"]').remove();
  const readText = (element: typeof content) => clean(element.find('*').addBack().contents().filter((_, node) => node.type === 'text').map((_, node) => visible(node).text()).get().join(' '), 200000);
  // Responsive copies of complete sections are not additional content.
  const sectionsSeen = new Map<string, object>();
  content.find('section,article').each((_, element) => {
    const text = normalizedText(readText(visible(element)));
    if (text.length < 100) return;
    const previous = sectionsSeen.get(text);
    if (previous && !visible(element).parents().toArray().some(parent => parent === previous)) visible(element).remove();
    else if (!previous) sectionsSeen.set(text, element);
  });
  const paragraphTexts = content.find('p').map((_, element) => readText(visible(element))).get().filter(Boolean);
  const uniqueContent = content.clone();
  const blocksSeen = new Set<string>();
  uniqueContent.find('p,li,h1,h2,h3,h4,h5,h6').each((_, element) => {
    const text = normalizedText(readText(visible(element)));
    if (text.length < 40) return;
    if (blocksSeen.has(text)) visible(element).remove();
    else blocksSeen.add(text);
  });
  const contentText = readText(uniqueContent);
  const plainText = readText(visible('body'));
  const clientShell = plainText.length < 120 && $('script[src]').length > 0 && $('#root,#app,#__next,[ng-app]').length > 0 && !visible('h1,h2,p,article').filter((_, el) => !!clean(visible(el).text())).length;
  const h1 = visible('h1').length; const images = visible('img');
  const imageAltMissing = images.filter((_, el) => visible(el).attr('alt') === undefined).length;
  const wordCount = countWords(contentText);
  const headingCount = content.find('h1,h2,h3,h4,h5,h6').filter((_, element) => !!clean(visible(element).text())).length;
  const links = new Set(visible('a[href]').map((_, element) => {
    try { const target = new URL(visible(element).attr('href')!, url); return /^https?:$/.test(target.protocol) ? target.href : ''; } catch { return ''; }
  }).get().filter(Boolean));
  const linkCount = links.size;
  const domElements = $('body *').length;
  const blockingScripts = $('head script[src]').filter((_, element) => {
    const script = $(element); const type = script.attr('type')?.toLowerCase() ?? '';
    return !script.is('[async],[defer],[nomodule]') && ['', 'text/javascript', 'application/javascript'].includes(type);
  }).length;
  const homePage = /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:(?:index|default)\.(?:html?|php|aspx?)|home)?\/?$/i.test(url.pathname);
  if (!title) add('missing-title', 'Falta el título de página', 'No se encontró un <title> con contenido en el HTML recibido. Dificulta identificar la página en buscadores y pestañas.', 'structure', 'medium', 12);
  if (!metaDescription) add('missing-description', 'Descripción de búsqueda ausente', 'No se observó una metadescripción. El buscador puede generar su propio resumen; conviene definir uno específico para el negocio.', 'structure', 'low', 5);
  else if (!usefulDescription(metaDescription)) add('repetitive-description', 'Descripción con texto repetido o de plantilla', `La descripción publicada contiene secuencias repetidas o texto de relleno: «${clean(metaDescription, 190)}». Conviene resumir la actividad del negocio con una frase concreta.`, 'structure', 'low', 5);
  if (!viewport) add('viewport', 'Configuración móvil incompleta', 'No se encontró una etiqueta viewport con width=device-width. Es una señal técnica de posible escala incorrecta en teléfonos; requiere comprobar la página renderizada.', 'mobile', 'high', 25);
  if (/user-scalable\s*=\s*(?:no|0)|maximum-scale\s*=\s*1(?:\s|,|$)/i.test(viewportContent)) add('zoom', 'El zoom puede estar restringido', `La configuración viewport contiene «${clean(viewportContent, 160)}». Puede dificultar ampliar el contenido.`, 'accessibility', 'medium', 8);
  if (!h1 && !clientShell) add('missing-h1', 'No se observa un encabezado principal', 'El HTML recibido no incluye H1. Conviene revisar la jerarquía de títulos y el contenido generado con JavaScript.', 'structure', 'medium', 10);
  if (h1 > 1) add('multiple-h1', 'Jerarquía de encabezados a revisar', `Se encontraron ${h1} encabezados H1. Su pertinencia depende de la estructura semántica; no constituye por sí sola un error de accesibilidad.`, 'structure', 'low', 2);
  if (imageAltMissing) add('image-alt', 'Imágenes sin atributo alternativo', `${imageAltMissing} de ${images.length} imágenes no tienen atributo alt. Las imágenes informativas necesitan una alternativa; las decorativas pueden usar alt vacío.`, 'accessibility', imageAltMissing > 4 ? 'medium' : 'low', Math.min(10, 3 + imageAltMissing));
  const fixed = $('[style]').filter((_, el) => /(?:^|;)\s*(?:min-)?width\s*:\s*(?:[7-9]\d{2}|\d{4,})px/i.test($(el).attr('style') ?? '')).length;
  if (fixed) add('fixed-width', 'Anchos fijos que conviene probar en móvil', `${fixed} elementos incluyen anchos en línea de al menos 700 px. CSS externo podría corregirlos; revisa si producen desbordamiento en pantallas pequeñas.`, 'mobile', 'medium', 10);
  const obsoleteElements = $('font,center,marquee,blink,[bgcolor]').length + $('table table').length;
  if (obsoleteElements >= 2) add('obsolete-markup', 'Maquetación o etiquetas visuales antiguas', `Se observaron ${obsoleteElements} etiquetas o tablas anidadas propias de maquetación antigua (<font>, <center>, <marquee>, bgcolor o tablas anidadas). Suele indicar un diseño visual desactualizado.`, 'structure', 'medium', 10);
  const inlineStyledElements = $('body [style]').length;
  if (inlineStyledElements >= 35) add('inline-styles', 'Abundancia de estilos visuales en línea', `El cuerpo contiene ${inlineStyledElements} elementos con atributos style directos. Puede dificultar mantener una jerarquía visual uniforme en distintas pantallas.`, 'structure', 'low', 6);
  if (homePage && (wordCount >= 2400 || (wordCount >= 1400 && (headingCount >= 30 || linkCount >= 160)))) add('content-overload', 'Inicio con una gran concentración de contenido', `Se contaron ${wordCount.toLocaleString('es')} palabras de contenido, ${headingCount} títulos y ${linkCount} enlaces distintos. Se excluyeron navegación, contenido oculto explícito y bloques duplicados del recuento de palabras. Conviene simplificar el inicio y repartir el contenido; la longitud real del scroll requiere abrir la web.`, 'structure', wordCount >= 4000 ? 'high' : 'medium', wordCount >= 4000 ? 20 : 12);
  if (wordCount >= 700 && content.find('h2,h3').length < 2 && headingCount < 4) add('unstructured-content', 'Mucho texto con pocas divisiones', `${wordCount.toLocaleString('es')} palabras de contenido y solo ${headingCount} encabezados. La falta de secciones puede dificultar encontrar servicios, precios o información de contacto.`, 'structure', 'medium', 12);
  const longParagraphs = [...new Set(paragraphTexts)].map(text => countWords(text)).filter(words => words >= 180);
  if (longParagraphs.length >= 2) add('text-walls', 'Párrafos extensos que dificultan el escaneo', `${longParagraphs.length} párrafos distintos superan las 180 palabras; el más largo tiene ${Math.max(...longParagraphs)}. Conviene dividirlos con subtítulos, listas o resúmenes.`, 'structure', 'medium', 8);
  const paragraphCounts = new Map<string, { count: number; words: number; sample: string }>();
  for (const paragraph of paragraphTexts) {
    const words = countWords(paragraph);
    if (words < 15) continue;
    const key = normalizedText(paragraph);
    const previous = paragraphCounts.get(key);
    paragraphCounts.set(key, { count: (previous?.count ?? 0) + 1, words, sample: paragraph });
  }
  const repeatedParagraphs = [...paragraphCounts.values()].filter(item => item.count >= 3);
  const repeatedWords = repeatedParagraphs.reduce((sum, item) => sum + (item.count - 1) * item.words, 0);
  if (repeatedWords >= 90 && repeatedWords >= (wordCount + repeatedWords) * .25) add('repeated-content', 'Bloques de texto repetidos', `${repeatedWords} palabras proceden de copias repetidas de párrafos. Por ejemplo, «${clean(repeatedParagraphs[0].sample, 120)}» aparece ${repeatedParagraphs[0].count} veces. Revisa si todas las copias se muestran o si el CSS las alterna.`, 'structure', 'medium', 8);
  const headingLevels = content.find('h1,h2,h3,h4,h5,h6').toArray().map(element => Number(element.tagName.slice(1)));
  const headingSkips = headingLevels.filter((level, index) => index > 0 && level > headingLevels[index - 1] + 1).length;
  if (headingSkips >= 3) add('heading-order', 'Saltos repetidos en la jerarquía de títulos', `Se observaron ${headingSkips} saltos de más de un nivel entre encabezados consecutivos. Revisa que los títulos describan secciones y subsecciones en un orden comprensible.`, 'structure', 'medium', 6);
  const genericPhrases = [...new Set(contentText.match(/soluciones integrales|somos (?:tu|su) mejor opción|comprometidos con (?:la )?excelencia|calidad y (?:buen )?servicio|líderes en el mercado|your (?:trusted|reliable) partner|best[- ]in[- ]class solutions|committed to excellence|quality and service|soluções (?:completas|integradas)|compromisso com a excelência|solutions sur mesure|qualité et service/gi) ?? [])];
  if (homePage && genericPhrases.length >= 3 && wordCount < 650) add('generic-copy', 'Presentación con varias frases poco específicas', `Se encontraron ${genericPhrases.length} expresiones generales: ${genericPhrases.slice(0, 3).map(phrase => `«${phrase}»`).join(', ')}. Revisa si la presentación también concreta servicios, ubicación y diferencias del negocio.`, 'structure', 'low', 6);
  if (homePage && linkCount >= 180) add('link-overload', 'Demasiados destinos en la página de inicio', `El HTML incluye ${linkCount} destinos de enlace distintos. Un catálogo amplio puede justificarlo; comprueba si la navegación distingue lo principal de lo secundario.`, 'structure', 'medium', 8);
  if (domElements >= 1800) add('large-dom', 'Estructura HTML muy compleja', `El cuerpo contiene ${domElements.toLocaleString('es')} elementos HTML, incluidos los ocultos. Un árbol grande aumenta el trabajo de cálculo de estilos y diseño; no equivale por sí solo a una medición de lentitud.`, 'performance', domElements >= 3500 ? 'high' : 'medium', domElements >= 3500 ? 15 : 9);
  if (blockingScripts >= 5) add('blocking-scripts', 'Varios scripts pueden bloquear el contenido inicial', `${blockingScripts} scripts clásicos externos en la cabecera no declaran async ni defer. Su descarga y ejecución puede retrasar el análisis del HTML.`, 'performance', 'medium', 8);
  const externalScripts = new Set($('script[src]').map((_, element) => $(element).attr('src') ?? '').get().filter(Boolean)).size;
  if (externalScripts >= 25 && blockingScripts < 5) add('many-scripts', 'Carga de numerosos archivos JavaScript', `El documento referencia ${externalScripts} scripts externos distintos. Revisa los que no son necesarios para la primera vista; el HTML no permite conocer su tamaño transferido ni tiempo de ejecución.`, 'performance', 'medium', 7);
  const eagerImages = images.filter((_, element) => !!(visible(element).attr('src') || visible(element).attr('srcset')) && visible(element).attr('loading')?.toLowerCase() !== 'lazy').length;
  if (eagerImages >= 18) add('eager-images', 'Muchas imágenes sin carga diferida declarada', `${eagerImages} de ${images.length} imágenes no declaran loading="lazy". Revisa la carga de imágenes fuera de la primera vista; algunos sitios la gestionan con JavaScript.`, 'performance', 'medium', 8);
  if (response.bytes > 350000) add('large-html', 'Documento HTML pesado', `El HTML recibido ocupa ${(response.bytes / 1024).toFixed(0)} KB, sin contar imágenes ni otros recursos. Puede incrementar el trabajo de carga y análisis.`, 'performance', 'medium', 8);
  if (response.responseMs > 2500) add('server-time', 'Respuesta lenta en esta consulta', `La descarga del HTML tardó ${(response.responseMs / 1000).toFixed(1)} s desde el servidor de Stack. No representa la carga total ni el tiempo de todos los visitantes.`, 'performance', response.responseMs > 6000 ? 'high' : 'medium', response.responseMs > 6000 ? 15 : 8);
  if (url.protocol === 'http:') add('http', 'La página consultada usa HTTP', 'La respuesta final se recibió mediante HTTP sin cifrado de transporte. No se han probado credenciales ni formularios.', 'security', 'high', 15);
  if (url.protocol === 'https:') {
    const mixed = $('script[src],link[rel="stylesheet"][href],img[src],iframe[src],video[src],audio[src],source[src]').filter((_, el) => /^http:\/\//i.test($(el).attr('src') ?? $(el).attr('href') ?? '')).length;
    if (mixed) add('mixed-content', 'Referencias a recursos sin HTTPS', `Se encontraron ${mixed} recursos con URL HTTP dentro de una página HTTPS. El navegador podría bloquearlos o actualizar su protocolo.`, 'security', 'medium', 10);
    if (!response.headers['strict-transport-security']) add('hsts', 'Cabecera HSTS no observada', 'La respuesta recibida no incluye Strict-Transport-Security. Es una recomendación de configuración, no una vulnerabilidad confirmada.', 'security', 'low', 2);
  }
  if (!response.headers['content-security-policy'] && !$('meta[http-equiv]').filter((_, el) => $(el).attr('http-equiv')?.toLowerCase() === 'content-security-policy').length) add('csp', 'Política CSP no observada', 'No se observó Content-Security-Policy en la cabecera ni en una etiqueta meta. Una política adecuada puede reforzar la protección; su ausencia no demuestra que la web sea vulnerable.', 'security', 'low', 2);
  const insecureForms = $('form').filter((_, el) => {
    try { return new URL($(el).attr('action') || url.href, url).protocol === 'http:'; } catch { return false; }
  }).length;
  if (insecureForms) add('form-http', 'Formularios con destino HTTP', `Se encontraron ${insecureForms} formularios cuyo destino resuelto usa HTTP. Revisar el cifrado del envío; no se ha enviado ningún dato.`, 'security', 'high', 12);
  const passwordGetForms = $('form').filter((_, element) => $(element).find('input[type="password"]').length > 0 && ($(element).attr('method') ?? 'get').toLowerCase() === 'get').length;
  if (passwordGetForms) add('password-get', 'Formularios de contraseña declaran envío GET', `${passwordGetForms} formularios con campo de contraseña usan GET o no declaran método. Un envío nativo podría incluir datos en la URL; verifica si JavaScript modifica el envío. No se enviaron credenciales.`, 'security', 'high', 18);
  const technologies: string[] = [];
  const generator = clean($('meta[name="generator"]').attr('content') ?? '', 100);
  if (generator) technologies.push(generator);
  if (/\/wp-content\//i.test(response.body)) technologies.push('WordPress');
  if (/cdn\.shopify\.com|Shopify\.theme/i.test(response.body)) technologies.push('Shopify');
  if (/wixstatic\.com|wix-code-sdk/i.test(response.body)) technologies.push('Wix');
  if (/__NEXT_DATA__|\/_next\/static\//.test(response.body)) technologies.push('Next.js');
  const aiEvidence: string[] = [];
  if ($('a[href*="lovable.dev"]').length || /lovable-tagger/.test(response.body)) aiEvidence.push('Referencia técnica a Lovable en el HTML.');
  if ($('a[href*="bolt.new"]').length) aiEvidence.push('Enlace a Bolt en el HTML.');
  if ($('a[href*="v0.dev"],a[href*="v0.app"]').length) aiEvidence.push('Enlace a v0 en el HTML.');
  const explicit = plainText.match(/(?:creado|generado|diseñado|built|generated|created)\s+(?:con|por|with|by)\s+(?:inteligencia artificial|IA\b|AI\b)/i);
  if (explicit) aiEvidence.push(`La página declara «${explicit[0]}».`);
  const placeholderText = plainText;
  const placeholders = [...new Set(placeholderText.match(/lorem ipsum(?: dolor sit amet)?|your business name|insert (?:your )?(?:company|business|text) here|\[nombre de (?:tu |la )?empresa\]|aquí va tu texto|reemplaza este texto/gi) ?? [])];
  if (placeholders.length) add('placeholder-content', 'Texto de plantilla sin reemplazar', `Se observó texto de relleno visible en el HTML: ${placeholders.slice(0, 3).map(t => `«${t}»`).join(', ')}. Confirma su contexto: podría aparecer en una demostración o artículo. No prueba un origen IA.`, 'structure', 'high', 20);
  const name = clean($('meta[property="og:site_name"]').attr('content') ?? '', 80) || title || url.hostname;
  const introduction = paragraphTexts.find(text => text.length >= 60 && countWords(text) >= 10 && usefulDescription(text) && !/cookies?|privacy policy|política de privacidad|all rights reserved|todos los derechos reservados/i.test(text));
  const description = usefulDescription(metaDescription) ? metaDescription : introduction ? clean(introduction, 350) : 'El sitio no publica una descripción breve y clara de su actividad. Abre la web para conocer el negocio.';
  const limitations = [
    'Inspección del HTML y cabeceras públicos. La puntuación mide señales técnicas observadas, no calidad visual ni vulnerabilidades confirmadas.',
    'El país y el rubro son el contexto de búsqueda y deben confirmarse con la información del negocio.',
    'El diseño responsive requiere revisión visual o una medición móvil. No se ejecutó JavaScript en esta inspección.',
    'Los recuentos de texto excluyen elementos ocultos declarados en HTML; CSS externo puede ocultar más contenido. No se midió el scroll ni la carga completa de recursos.',
  ];
  if (plainText.length < 120 && $('script').length) limitations.push('La página parece depender de JavaScript. Los elementos ausentes pueden generarse después de la carga.');
  if (clientShell) limitations.push('Sin puntuación: el HTML solo contiene el contenedor de una aplicación. Es necesario renderizar JavaScript para evaluar su contenido y estructura.');
  if (aiEvidence.length) limitations.push('Una referencia a una herramienta de IA no confirma que toda la web haya sido creada con IA.');
  let previewImage: string | undefined;
  const image = $('meta[property="og:image"]').attr('content') ?? $('meta[name="twitter:image"]').attr('content');
  if (image) try { const imageUrl = new URL(image, url); if (imageUrl.protocol === 'https:' && !imageUrl.username && !imageUrl.password) previewImage = imageUrl.href; } catch { /* no cover available */ }
  const htmlLangAttr = $('html').attr('lang') ?? $('meta[property="og:locale"]').attr('content') ?? $('meta[http-equiv="content-language"]').attr('content') ?? '';
  const detectedLanguage = detectHtmlLanguage(htmlLangAttr, `${title} ${metaDescription} ${plainText.slice(0, 1200)}`, country);
  return {
    id: createHash('sha256').update(url.hostname.replace(/^www\./, '')).digest('hex').slice(0, 16),
    url: url.href, domain: url.hostname.replace(/^www\./, ''), name, description,
    country, category, status: 'active', score: clientShell ? null : priorityScore(issues), issues,
    contacts: extractContacts(response.body, response.url), aiEvidence: { detected: aiEvidence.length > 0, label: aiEvidence.length ? 'Indicios de herramienta IA · por confirmar' : 'Origen IA no confirmado', evidence: aiEvidence },
    metrics: { responseMs: response.responseMs, htmlBytes: response.bytes, viewport, title: !!title, h1, imageAltMissing, performance: null, accessibility: null, wordCount, linkCount, domElements, headingCount, imageCount: images.length, blockingScripts },
    checkedAt: new Date().toISOString(), source: response.url, limitations, previewImage, technologies: [...new Set(technologies)],
    ...(detectedLanguage ? { language: detectedLanguage } : {}),
  };
}
