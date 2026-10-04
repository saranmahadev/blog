// Puts the inline banner after the introduction of an .mdx post: just before the first section heading.
// Posts with no section heading, plain .md posts, and posts with `sponsors: false` get none.
import path from 'node:path';

export function remarkSponsorSlot() {
  return (tree, file) => {
    const p = String(file.path ?? '');
    if (!p.endsWith('.mdx') || file.data?.astro?.frontmatter?.sponsors === false) return;
    const rel = path.relative(path.resolve('src/content'), p).split(path.sep);
    const key = rel[0] === 'posts' ? rel[1].replace(/\.mdx$/, '') : rel[0] === 'series' ? `${rel[1]}/${rel[2].replace(/\.mdx$/, '')}` : '';
    const at = tree.children.findIndex((n) => n.type === 'heading' && n.depth === 2);
    if (!key || at < 1) return;
    tree.children.splice(at, 0, {
      type: 'mdxJsxFlowElement',
      name: 'SponsorSlot',
      attributes: [
        { type: 'mdxJsxAttribute', name: 'size', value: 'inline' },
        { type: 'mdxJsxAttribute', name: 'postKey', value: key },
      ],
      children: [],
    });
  };
}
