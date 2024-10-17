export default {
  entries: [
    {
      key: 'pages',
      contentType: 'page'
    }
  ],
  targets: [
    {
      template: '404.njk',
      dest: 'dist/404.html',
      include: ['pages']
    },
    {
      entries: 'pages',
      handler(entry) {
        return {
          template: 'page.njk',
          dest: `dist/${entry.fields.url}/index.html`,
          include: ['pages'],
          extraContext: {
            ...entry.fields
          }
        };
      }
    }
  ]
};
