// Delegated so the toggle keeps working after the router swaps the body.
document.addEventListener('click', (event) => {
  if (!(event.target as HTMLElement).closest('.theme-toggle')) return;

  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem('theme', next);
  } catch {
    // Private mode: the choice just will not persist.
  }
});
