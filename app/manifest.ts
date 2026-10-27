import type { MetadataRoute } from 'next';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from '@/lib/seo';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_TITLE,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f6f8',
    theme_color: '#000000',
    lang: 'es',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
