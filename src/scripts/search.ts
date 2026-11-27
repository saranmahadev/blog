/**
 * Search palette backed by Pagefind. The index is built after `astro build`
 * (see the `build` script), so in `astro dev` the palette explains how to see it.
 * Listeners are delegated on `document` so they survive page transitions.
 */

// Makes this file a module so helper names like `open` and `status` do not collide with window globals.
export {};

interface PagefindResult {
  url: string;
  excerpt: string;
  meta: { title?: string };
}

interface Pagefind {
  options: (options: { baseUrl: string }) => Promise<void>;
  debouncedSearch: (
    query: string,
  ) => Promise<{ results: { data: () => Promise<PagefindResult> }[] } | null>;
}

let pagefind: Promise<Pagefind | null> | undefined;

const loadPagefind = () =>
  (pagefind ??= (async () => {
    try {
      const url = '/pagefind/pagefind.js';
      const instance: Pagefind = await import(/* @vite-ignore */ url);
      await instance.options({ baseUrl: '/' });
      return instance;
    } catch {
      return null;
    }
  })());

const dialog = () => document.getElementById('search') as HTMLDialogElement | null;
const input = () => document.getElementById('search-input') as HTMLInputElement | null;
const list = () => document.getElementById('search-results') as HTMLOListElement | null;
const status = () => document.getElementById('search-status');

const setStatus = (text: string) => {
  const el = status();
  if (el) el.textContent = text;
};

const open = () => {
  const el = dialog();
  if (!el || el.open) return;
  el.showModal();
  input()?.focus();
  void loadPagefind();
};

const render = (results: PagefindResult[], query: string) => {
  const target = list();
  if (!target) return;
  target.replaceChildren(
    ...results.map((result) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      const title = document.createElement('strong');
      const excerpt = document.createElement('p');
      link.href = result.url;
      title.textContent = result.meta.title ?? result.url;
      // Pagefind excerpts only contain <mark> highlights around text from our own content.
      excerpt.innerHTML = result.excerpt;
      link.append(title, excerpt);
      item.append(link);
      return item;
    }),
  );
  setStatus(
    results.length
      ? `${results.length} ${results.length === 1 ? 'result' : 'results'} for "${query}"`
      : `No results for "${query}"`,
  );
};

const search = async (query: string) => {
  const target = list();
  if (!query.trim()) {
    target?.replaceChildren();
    setStatus('');
    return;
  }

  const instance = await loadPagefind();
  if (!instance) {
    target?.replaceChildren();
    setStatus('Search runs on the built site. Run "npm run build" then "npm run preview".');
    return;
  }

  const response = await instance.debouncedSearch(query);
  if (!response) return; // a newer keystroke superseded this query
  const data = await Promise.all(response.results.slice(0, 8).map((result) => result.data()));
  render(data, query);
};

document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  if (target.closest('[data-search-open]')) {
    open();
  } else if (target === dialog()) {
    dialog()?.close(); // click on the backdrop
  }
});

document.addEventListener('input', (event) => {
  if ((event.target as HTMLElement).id === 'search-input') void search((event.target as HTMLInputElement).value);
});

document.addEventListener('keydown', (event) => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((event.target as HTMLElement).tagName) ||
    (event.target as HTMLElement).isContentEditable;

  if ((event.key === 'k' && (event.metaKey || event.ctrlKey)) || (event.key === '/' && !typing)) {
    event.preventDefault();
    open();
    return;
  }

  if (!dialog()?.open) return;

  // In a type="search" field the browser's first Escape only clears the text. Close straight away.
  if (event.key === 'Escape') {
    event.preventDefault();
    dialog()?.close();
    return;
  }

  const links = [...(list()?.querySelectorAll('a') ?? [])];
  const index = links.indexOf(document.activeElement as HTMLAnchorElement);

  if (event.key === 'ArrowDown' && links.length) {
    event.preventDefault();
    links[Math.min(index + 1, links.length - 1)].focus();
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    if (index <= 0) input()?.focus();
    else links[index - 1].focus();
  } else if (event.key === 'Enter' && document.activeElement === input() && links[0]) {
    links[0].click();
  }
});

// 'close' does not bubble, so listen in the capture phase. Reset so the next open starts clean.
document.addEventListener(
  'close',
  (event) => {
    if ((event.target as HTMLElement).id !== 'search') return;
    const field = input();
    if (field) field.value = '';
    list()?.replaceChildren();
    setStatus('');
  },
  true,
);

// A transition replaces the body, so a dialog left open would not survive; make sure it closes cleanly.
document.addEventListener('astro:before-swap', () => dialog()?.close());
