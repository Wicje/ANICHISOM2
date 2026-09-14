import type { MetadataRoute } from 'next';

const SITE_URL = 'https://continuaos.cc';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/os`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ];
}
