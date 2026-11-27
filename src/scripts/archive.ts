import { onPage } from './on-page';

onPage(() => {
  const chips = document.querySelectorAll<HTMLButtonElement>('.chip');
  const rows = document.querySelectorAll<HTMLElement>('.rows .row');
  const groups = document.querySelectorAll<HTMLElement>('.year-group');
  const status = document.getElementById('filter-status');

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const tag = chip.dataset.tag ?? '';
      let shown = 0;

      chips.forEach((other) => other.setAttribute('aria-pressed', String(other === chip)));
      rows.forEach((row) => {
        const match = !tag || (row.dataset.tags ?? '').split(',').includes(tag);
        row.hidden = !match;
        if (match) shown += 1;
      });
      // A year with no matching posts should not leave its heading behind.
      groups.forEach((group) => {
        group.hidden = ![...group.querySelectorAll<HTMLElement>('.row')].some((row) => !row.hidden);
      });
      if (status) status.textContent = `${shown} ${shown === 1 ? 'post' : 'posts'} shown`;
    });
  });
});
