import { onPage } from './on-page';

/**
 * A table wider than the screen scrolls sideways inside its own area. Keyboard users can only scroll
 * it if it can take focus, so tables that actually overflow become focusable (and named); tables that
 * fit are left alone so they add no pointless tab stops. Table semantics are not changed.
 */
const update = () => {
  document.querySelectorAll<HTMLTableElement>('.prose table').forEach((table) => {
    if (table.scrollWidth > table.clientWidth + 1) {
      table.tabIndex = 0;
      const before = table.previousElementSibling;
      const caption = before?.matches('p') ? before.textContent?.trim() : '';
      table.setAttribute('aria-label', caption && caption.length < 120 ? caption : 'Table, scrolls sideways');
    } else {
      table.removeAttribute('tabindex');
      table.removeAttribute('aria-label');
    }
  });
};

onPage(() => {
  update();
  window.addEventListener('resize', update, { passive: true });
  document.addEventListener('astro:before-swap', () => window.removeEventListener('resize', update), { once: true });
});
