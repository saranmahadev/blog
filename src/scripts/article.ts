import { onPage } from './on-page';

const progress = () => {
  const bar = document.querySelector<HTMLElement>('.progress span');
  if (!bar) return;
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
  };
  // Page-scoped listener: removed when the page is swapped out.
  window.addEventListener('scroll', update, { passive: true });
  document.addEventListener('astro:before-swap', () => window.removeEventListener('scroll', update), { once: true });
  update();
};

const copyLink = () => {
  const button = document.querySelector<HTMLButtonElement>('.copy-link');
  button?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      button.textContent = 'Copied';
    } catch {
      button.textContent = 'Press Ctrl+C to copy';
    }
    setTimeout(() => { button.textContent = 'Copy link'; }, 2000);
  });
};

const codeBlocks = () => {
  document.querySelectorAll<HTMLPreElement>('.prose pre').forEach((pre) => {
    if (pre.dataset.language === 'mermaid' || pre.parentElement?.classList.contains('code-block')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block';
    pre.replaceWith(wrapper);
    wrapper.append(pre);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'code-copy';
    button.textContent = 'Copy';
    button.setAttribute('aria-label', 'Copy code to clipboard');
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pre.textContent ?? '');
        button.textContent = 'Copied';
      } catch {
        button.textContent = 'Failed';
      }
      setTimeout(() => { button.textContent = 'Copy'; }, 2000);
    });
    wrapper.append(button);
  });
};

const tableOfContents = () => {
  // Both versions (rail and inline) are in the page; highlight the current section in each.
  const links = [...document.querySelectorAll<HTMLAnchorElement>('.toc a[href^="#"]')];
  if (!links.length) return;
  const idOf = (link: HTMLAnchorElement) => decodeURIComponent(link.hash.slice(1));
  const headings = links
    .map((link) => document.getElementById(idOf(link)))
    .filter((el): el is HTMLElement => el !== null);

  const line = 140; // px from the top of the viewport: below the sticky header
  const update = () => {
    let current = headings[0];
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= line) current = heading;
    }
    links.forEach((link) => {
      if (current && idOf(link) === current.id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };

  window.addEventListener('scroll', update, { passive: true });
  document.addEventListener('astro:before-swap', () => window.removeEventListener('scroll', update), { once: true });
  update();
};

onPage(() => {
  progress();
  copyLink();
  codeBlocks();
  tableOfContents();
});
