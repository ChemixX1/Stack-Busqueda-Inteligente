import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { Montserrat, MuseoModerno } from 'next/font/google';
import { localizedSeo, resolveSiteUrl, SITE_DESCRIPTION, SITE_KEYWORDS, SITE_NAME, SITE_TITLE } from '@/lib/seo';
import './globals.css';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const museoModerno = MuseoModerno({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-museo',
  display: 'swap',
});

const siteUrl = resolveSiteUrl();

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const seo = localizedSeo(requestHeaders.get('x-vercel-ip-country'), requestHeaders.get('accept-language'));
  return {
    metadataBase: new URL(siteUrl),
    applicationName: SITE_NAME,
    title: {
      default: SITE_TITLE,
      template: `%s | ${SITE_NAME}`,
    },
    description: seo.description,
    keywords: SITE_KEYWORDS,
    authors: [{ name: SITE_NAME }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    category: 'technology',
    referrer: 'origin-when-cross-origin',
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    alternates: {
      canonical: '/',
    },
    openGraph: {
      type: 'website',
      locale: seo.locale,
      url: '/',
      siteName: SITE_NAME,
      title: SITE_TITLE,
      description: seo.description,
    },
    twitter: {
      card: 'summary_large_image',
      title: SITE_TITLE,
      description: seo.description,
    },
    robots: {
      index: true,
      follow: true,
      nocache: false,
      googleBot: {
        index: true,
        follow: true,
        noimageindex: false,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: siteUrl,
      name: SITE_NAME,
      alternateName: ['Stack Radar', 'Stack - Búsqueda Inteligente'],
      description: SITE_DESCRIPTION,
      inLanguage: 'es',
    },
    {
      '@type': 'WebApplication',
      '@id': `${siteUrl}/#app`,
      name: SITE_NAME,
      url: siteUrl,
      description: SITE_DESCRIPTION,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'All',
      inLanguage: 'es',
      browserRequirements: 'Requires JavaScript',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      featureList: [
        'Búsqueda global de negocios, servicios, plataformas digitales, tiendas, portales y comunidades en internet',
        'Diagnóstico técnico de rendimiento, adaptación móvil, estructura HTML, accesibilidad y seguridad',
        'Detección de indicios de plantillas sin personalizar o herramientas de inteligencia artificial',
        'Contacto directo con propuestas adaptadas al idioma del sitio web',
      ],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${montserrat.className} ${museoModerno.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
          }}
        />
        {children}
      </body>
    </html>
  );
}
