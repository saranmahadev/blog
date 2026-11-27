/** Facts about the site and its publisher, in one place. */
export const SITE = {
  name: 'Drafted',
  tagline: 'Writing by Saran Mahadev',
  homeTitle: 'Drafted | Saran Mahadev on AI, software and systems',
  description:
    "Drafted is Saran Mahadev's blog on AI, software engineering and systems: long-form posts, plainly explained, with diagrams and sources.",
  language: 'en',
  locale: 'en_IN',
  email: 'mail@saranmahadev.in',
  author: {
    name: 'Saran Mahadev',
    url: 'https://saranmahadev.in',
    sameAs: [
      'https://saranmahadev.in',
      'https://www.youtube.com/@saranmahadev',
      'https://www.instagram.com/everything.by.dev',
      'https://www.instagram.com/lyf.as.dev',
    ],
    knowsAbout: ['Artificial intelligence', 'Software engineering', 'Systems design', 'Developer education'],
  },
  themeColor: { light: '#F5EFE5', dark: '#100D0B' },
} as const;

/** Meta descriptions over ~155 characters get cut by search engines: end them cleanly instead. */
export const clip = (text: string, max = 155) => {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,.;:\s]+$/, '') + '…';
};
