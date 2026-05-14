import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/platform/', '/dashboard/', '/settings/', '/team/'],
      },
    ],
    sitemap: 'https://cleandaycrm.com/sitemap.xml',
  };
}
