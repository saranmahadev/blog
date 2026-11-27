/**
 * Run `init` once per page view. With the view-transitions router present, module scripts
 * only execute on the first load, so setup must re-run on `astro:page-load`.
 */
export const onPage = (init: () => void) => {
  if (document.querySelector('meta[name="astro-view-transitions-enabled"]')) {
    document.addEventListener('astro:page-load', init);
  } else {
    init();
  }
};
