import type { MetadataRoute } from 'next';
import { resolveSiteUrl } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = resolveSiteUrl();
  return [
    {
      url: siteUrl,
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
