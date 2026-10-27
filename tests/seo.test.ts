import test from 'node:test';
import assert from 'node:assert/strict';
import { localizedSeo, resolveSeoLanguage, resolveSiteUrl, SEO_DESCRIPTIONS, SITE_DESCRIPTION, SITE_TITLE } from '../lib/seo';
import robots from '../app/robots';
import sitemap from '../app/sitemap';
import manifest from '../app/manifest';

test('SEO metadata description and site URL resolution are clean, indexable and non-redundant', () => {
  assert.equal(SITE_TITLE, 'Stack - Búsqueda Inteligente');
  assert.match(SITE_DESCRIPTION, /^¿Eres desarrollador\?/);
  assert.match(SITE_DESCRIPTION, /impulsar su rendimiento/);
  assert.match(SITE_DESCRIPTION, /IA sin criterio/);
  assert.match(SITE_DESCRIPTION, /Contacta con negocios y plataformas reales y transfórmalos\./);
  assert.equal((SITE_DESCRIPTION.match(/negocios/gi) ?? []).length, 1);

  const prevPublic = process.env.NEXT_PUBLIC_SITE_URL;
  const prevVercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const prevPreview = process.env.VERCEL_URL;
  try {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://stack-radar.vercel.app/';
    assert.equal(resolveSiteUrl(), 'https://stack-radar.vercel.app');

    const robotsConfig = robots();
    assert.equal(robotsConfig.sitemap, 'https://stack-radar.vercel.app/sitemap.xml');
    assert.deepEqual(robotsConfig.rules, [{ userAgent: '*', allow: '/', disallow: ['/api/'] }]);
    const entries = sitemap();
    assert.equal(entries[0].url, 'https://stack-radar.vercel.app');
    assert.equal(entries[0].priority, 1);

    const webManifest = manifest();
    assert.equal(webManifest.short_name, 'Stack');
    assert.equal(webManifest.description, SITE_DESCRIPTION);

    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'stack-prod.vercel.app';
    assert.equal(resolveSiteUrl(), 'https://stack-prod.vercel.app');

    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    process.env.VERCEL_URL = 'stack-private-preview.vercel.app';
    assert.equal(resolveSiteUrl(), 'https://stack-radar-taupe.vercel.app');
    process.env.NEXT_PUBLIC_SITE_URL = 'https://user:secret@example.com';
    assert.equal(resolveSiteUrl(), 'https://stack-radar-taupe.vercel.app');
  } finally {
    if (prevPublic === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = prevPublic;
    if (prevVercelProd === undefined) delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    else process.env.VERCEL_PROJECT_PRODUCTION_URL = prevVercelProd;
    if (prevPreview === undefined) delete process.env.VERCEL_URL;
    else process.env.VERCEL_URL = prevPreview;
  }
});

test('SEO descriptions follow the request country without changing the product title', () => {
  for (const [country, language] of [['PE', 'es'], ['US', 'en'], ['BR', 'pt'], ['FR', 'fr'], ['JP', 'ja'], ['CN', 'zh'], ['KR', 'ko'], ['EG', 'ar'], ['IN', 'hi'], ['RU', 'ru']]) {
    const seo = localizedSeo(country, 'es');
    assert.equal(seo.language, language);
    assert.equal(seo.description, SEO_DESCRIPTIONS[language as keyof typeof SEO_DESCRIPTIONS]);
    assert.match(seo.locale, /^[a-z]{2}_[A-Z]{2}$/);
  }
  assert.equal(localizedSeo('pe', 'en').description, SITE_DESCRIPTION);
});

test('SEO language negotiation handles unavailable geolocation, quality values and unsupported languages', () => {
  assert.equal(resolveSeoLanguage(null, 'fr-CA,es;q=0.8,en;q=0.5'), 'fr');
  assert.equal(resolveSeoLanguage('XX', 'de;q=0.3,en;q=0.9'), 'en');
  assert.equal(resolveSeoLanguage('ZZ', 'ja-JP'), 'ja');
  assert.equal(resolveSeoLanguage(null, 'es;q=0,pt-BR;q=0.7'), 'pt');
  assert.equal(resolveSeoLanguage(null, 'xx,ja;q=invalid,fr;q=1.2,de;q=0.8'), 'de');
  assert.equal(resolveSeoLanguage(null, 'nb-NO'), 'no');
  assert.equal(resolveSeoLanguage(null, '*'), 'es');
  assert.equal(resolveSeoLanguage(null, ''), 'es');
});
