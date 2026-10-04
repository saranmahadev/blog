// Which house banner a slot shows. The counter is kept for the tab only (sessionStorage), so a reload moves on to the next one;
// each slot on a page adds its own offset so the inline, end and rail banners differ.

/** The counter for this page load: random on the first load in a tab, then one more than last time. */
export function nextCounter(last: number | null, count: number, rand: () => number = Math.random): number {
  if (count <= 1) return 0;
  if (last === null || !Number.isFinite(last) || last < 0) return Math.floor(rand() * count);
  return (Math.floor(last) + 1) % count;
}

/** The banner index for a slot, given the page's counter. */
export const indexFor = (counter: number, offset: number, count: number): number => (count <= 1 ? 0 : (counter + offset) % count);
