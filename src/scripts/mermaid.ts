import { onPage } from './on-page';

/**
 * Posts write diagrams as standard ```mermaid fences. Astro highlights them as code, so without
 * JavaScript readers still see the source. Here we swap each block for a rendered diagram,
 * loading the Mermaid library only when a page actually has one.
 */

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const themeVariables = () => ({
  background: 'transparent',
  fontFamily: cssVar('--font-ui'),
  fontSize: '13px',
  primaryColor: cssVar('--surface-strong'),
  primaryTextColor: cssVar('--foreground'),
  primaryBorderColor: cssVar('--foreground'),
  secondaryColor: cssVar('--surface-elevated'),
  tertiaryColor: cssVar('--surface'),
  lineColor: cssVar('--text-secondary'),
  textColor: cssVar('--foreground'),
  noteBkgColor: cssVar('--surface-strong'),
  noteTextColor: cssVar('--foreground'),
});

let counter = 0;

onPage(async () => {
  const blocks = [...document.querySelectorAll<HTMLPreElement>('pre[data-language="mermaid"]')];
  if (!blocks.length) return;

  const { default: mermaid } = await import('mermaid');

  const diagrams = blocks.map((pre) => {
    const host = document.createElement('div');
    host.className = 'diagram';
    host.dataset.source = pre.textContent ?? '';
    pre.replaceWith(host);
    return host;
  });

  const draw = async () => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: themeVariables(),
      securityLevel: 'strict',
      // Natural size, scrolled by the container on narrow screens, so labels stay readable.
      // SVG text labels: measured and drawn by the same engine, so page CSS cannot make them wrap or clip.
      htmlLabels: false,
      flowchart: { useMaxWidth: false, htmlLabels: false, padding: 10, nodeSpacing: 28, rankSpacing: 28 },
      sequence: { useMaxWidth: false },
    });
    for (const host of diagrams) {
      try {
        const { svg } = await mermaid.render(`diagram-${counter++}`, host.dataset.source ?? '');
        host.innerHTML = svg;
        // The container scrolls on narrow screens, so keyboard users must be able to focus it.
        host.tabIndex = 0;
        host.setAttribute('role', 'group');
        host.setAttribute('aria-label', host.querySelector('svg title')?.textContent?.trim() || 'Diagram');
      } catch {
        // Invalid diagram source: show it as text rather than leaving a hole.
        host.textContent = host.dataset.source ?? '';
        host.classList.add('diagram-failed');
      }
    }
  };

  await draw();

  // Redraw with the new palette whenever the theme changes.
  const observer = new MutationObserver(() => void draw());
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  document.addEventListener('astro:before-swap', () => observer.disconnect(), { once: true });
});
