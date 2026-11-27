import { SITE } from './site';

/** schema.org building blocks. Pages hand these to the layout, which emits one JSON-LD @graph. */
type Node = Record<string, unknown>;

export const ids = (origin: string) => ({
  person: `${origin}/#author`,
  website: `${origin}/#website`,
  blog: `${origin}/#blog`,
});

export const personNode = (origin: string): Node => ({
  '@type': 'Person',
  '@id': ids(origin).person,
  name: SITE.author.name,
  url: SITE.author.url,
  sameAs: SITE.author.sameAs,
  knowsAbout: SITE.author.knowsAbout,
});

export const websiteNode = (origin: string): Node => ({
  '@type': 'WebSite',
  '@id': ids(origin).website,
  url: `${origin}/`,
  name: SITE.name,
  description: SITE.description,
  inLanguage: SITE.language,
  publisher: { '@id': ids(origin).person },
  author: { '@id': ids(origin).person },
});

export const blogNode = (origin: string): Node => ({
  '@type': 'Blog',
  '@id': ids(origin).blog,
  url: `${origin}/`,
  name: SITE.name,
  description: SITE.description,
  inLanguage: SITE.language,
  isPartOf: { '@id': ids(origin).website },
  publisher: { '@id': ids(origin).person },
  author: { '@id': ids(origin).person },
});

export interface Crumb {
  name: string;
  path: string;
}

export const breadcrumbNode = (origin: string, crumbs: Crumb[]): Node => ({
  '@type': 'BreadcrumbList',
  itemListElement: crumbs.map((crumb, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: crumb.name,
    item: `${origin}${crumb.path}`,
  })),
});

export const itemListNode = (origin: string, items: { name: string; path: string }[]): Node => ({
  '@type': 'ItemList',
  numberOfItems: items.length,
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    url: `${origin}${item.path}`,
  })),
});

/** External sources a post links to, for the `citation` property. */
export const citationsFrom = (body = '') => {
  const skip = /(^|\.)(saranmahadev\.in|youtube\.com|instagram\.com|t\.co)$/;
  const urls = new Set<string>();
  for (const [, url] of body.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)) {
    try {
      if (!skip.test(new URL(url).hostname)) urls.add(url);
    } catch {
      // ignore malformed URLs
    }
  }
  return [...urls].slice(0, 40).map((url) => ({ '@type': 'CreativeWork', url }));
};

export const wordCount = (body = '') => body.trim().split(/\s+/).filter(Boolean).length;

export interface ArticleInput {
  origin: string;
  url: string;
  headline: string;
  description: string;
  image: string;
  datePublished: Date;
  dateModified: Date;
  keywords: string[];
  section?: string;
  words: number;
  citations: Node[];
  markdownUrl: string;
  series?: { name: string; url: string };
}

export const articleNode = (a: ArticleInput): Node => ({
  '@type': 'BlogPosting',
  '@id': `${a.url}#article`,
  url: a.url,
  mainEntityOfPage: { '@type': 'WebPage', '@id': a.url },
  headline: a.headline,
  description: a.description,
  image: a.image,
  datePublished: a.datePublished.toISOString(),
  dateModified: a.dateModified.toISOString(),
  author: { '@id': ids(a.origin).person },
  publisher: { '@id': ids(a.origin).person },
  isPartOf: a.series ? [{ '@id': ids(a.origin).blog }, { '@type': 'CreativeWorkSeries', name: a.series.name, url: a.series.url }] : { '@id': ids(a.origin).blog },
  keywords: a.keywords.join(', '),
  ...(a.section ? { articleSection: a.section } : {}),
  wordCount: a.words,
  inLanguage: SITE.language,
  isAccessibleForFree: true,
  ...(a.citations.length ? { citation: a.citations } : {}),
  encoding: { '@type': 'MediaObject', contentUrl: a.markdownUrl, encodingFormat: 'text/markdown' },
});
