'use client';

const SITE_URL = 'https://continuaos.cc';

const softwareApplication = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Continua',
  description:
    'A computing continuity layer that lets your identity, workspace, and work context move between physical machines. Pick up exactly where you stopped — on any device.',
  url: SITE_URL,
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Web, macOS, Linux, Windows',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  featureList: [
    'Device trust and identity chain',
    'Workspace capture and restore',
    'Cross-device context continuity',
    'Relevance-scored resource restoration',
    'Team workspace sharing',
    'Real-time collaboration',
    'Privacy-first architecture',
  ],
  screenshot: `${SITE_URL}/images/landing/coding-dark.jpg`,
  softwareVersion: '1.0.0',
  releaseDate: '2026-01-01',
  applicationSubCategory: 'Productivity, Workflow Automation',
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '120',
  },
};

const organization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Continua',
  url: SITE_URL,
  logo: `${SITE_URL}/icons/icon-512.png`,
  description:
    'Building the persistent context layer for developers who work across devices.',
  sameAs: [],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: 'hello@continuaos.cc',
  },
};

const website = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Continua',
  url: SITE_URL,
  description:
    'The persistent context layer. Pick up exactly where you stopped.',
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/search?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};

const breadcrumbs = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: SITE_URL,
    },
  ],
};

export function JsonLd() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplication) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
    </>
  );
}
