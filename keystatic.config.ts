import { collection, config, fields } from '@keystatic/core';

export default config({
  storage: { kind: 'local' },
  collections: {
    series: collection({
      label: 'Series',
      slugField: 'title',
      path: 'src/content/series/*',
      format: { contentField: 'content' },
      entryLayout: 'content',
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        description: fields.text({
          label: 'Description',
          multiline: true,
        }),
        content: fields.mdx({
          label: 'Introduction',
        }),
      },
    }),
    legal: collection({
      label: 'Legal pages',
      slugField: 'title',
      path: 'src/content/legal/*',
      format: { contentField: 'content' },
      entryLayout: 'content',
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        description: fields.text({ label: 'Description', multiline: true }),
        updatedAt: fields.date({ label: 'Last updated', description: 'Shown on the page. Update it whenever the text changes.' }),
        content: fields.mdx({ label: 'Content' }),
      },
    }),
    posts: collection({
      label: 'Posts',
      slugField: 'title',
      path: 'src/content/posts/*',
      format: { contentField: 'content' },
      entryLayout: 'content',
      schema: {
        title: fields.slug({
          name: {
            label: 'Title',
            description: 'Used to create the URL. Keep it short and descriptive.',
          },
        }),
        description: fields.text({
          label: 'Description',
          multiline: true,
          description: 'A concise summary for listings and search results.',
        }),
        publishedAt: fields.date({ label: 'Published date' }),
        series: fields.relationship({
          label: 'Series',
          collection: 'series',
          description: 'The series this article belongs to.',
        }),
        order: fields.integer({
          label: 'Order in series',
          description: 'Part number inside the series. Leave empty to order by publish date.',
          validation: { min: 1 },
        }),
        seoTitle: fields.text({
          label: 'SEO title',
          description: 'Optional shorter title for search results and tabs (max 60 characters, "| Drafted" is added).',
          validation: { length: { max: 60 } },
        }),
        coverWord: fields.text({
          label: 'Cover word',
          description: 'Optional one-word display text inside the cover, e.g. "Proof". Max 12 characters.',
          validation: { length: { max: 12 } },
        }),
        featured: fields.checkbox({
          label: 'Featured on homepage',
          defaultValue: false,
          description: 'Show this article in the homepage featured section.',
        }),
        tags: fields.array(fields.text({ label: 'Tag' }), {
          label: 'Tags',
          itemLabel: (props) => props.value,
        }),
        draft: fields.checkbox({
          label: 'Draft',
          defaultValue: true,
        }),
        content: fields.mdx({
          label: 'Content',
          options: {
            image: {
              directory: 'public/images/posts',
              publicPath: '/images/posts/',
            },
          },
        }),
      },
    }),
  },
});
