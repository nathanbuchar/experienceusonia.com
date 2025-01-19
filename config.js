import 'dotenv/config';

import engine from './lib/engine.js';

import ContentfulClient from './lib/contentful.js';
import EventbriteClient from './lib/eventbrite.js';

const config = {
  engine,
  sources: [
    {
      client: ContentfulClient,
      args: [
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
      ]
    },
    {
      client: EventbriteClient,
      args: []
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