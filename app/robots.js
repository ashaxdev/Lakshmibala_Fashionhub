export default function robots() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lakshmibalaclothing.com';
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/api'] }
    ],
    sitemap: `${siteUrl}/sitemap.xml`
  };
}
