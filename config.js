import 'dotenv/config';

import client from './lib/client.js';
import engine from './lib/engine.js';

const config = {
  client,
  engine,
  sources: [
    {
      name: 'pages',
      contentType: 'page'
    },
    {
      name: 'banners',
      contentType: 'banner'
    },
    {
      name: 'opengraph',
      contentType: 'opengraph'
    }
  ],
  targets: [
    {
      src: 'src/static',
      dest: 'dist'
    },
    {
      template: '404.njk',
      dest: 'dist/404.html',
      include: ['opengraph', 'banners'],
    },
    {
      template: 'test.njk',
      dest: 'dist/test/index.html',
      include: ['opengraph', 'banners'],
    },
    {
      template: 'debug.njk',
      dest: 'dist/debug/index.html',
      include: '*',
    },
    (data) => {
      return data.pages.map((page) => {
        return {
          template: 'page.njk',
          dest: `dist/${page.fields.url}/index.html`,
          include: '*',
          extraContext: {
            ...page.fields
          }
        };
      });
    }
  ]
};

export default config;