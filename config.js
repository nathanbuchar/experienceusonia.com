import 'dotenv/config';

import client from './lib/client.js';
import engine from './lib/engine.js';

import clean from './lib/plugins/clean.js';
import contentful from './lib/plugins/contentful.js';
import copy from './lib/plugins/copy.js';
import events from './lib/plugins/events.js';

const config = {
  engine,
  plugins: [
    clean('dist'),
    contentful({
      client,
      sources: [
        {
          key: 'pages',
          contentType: 'page',
        },
        {
          key: 'navLinks',
          contentType: 'navLink',
        },
        {
          key: 'opengraph',
          contentType: 'opengraph',
        },
      ],
    }),
    events(),
    copy({
      from: 'src/static',
      to: 'dist',
    }),
  ],
  targets: [
    {
      template: '404.njk',
      dest: 'dist/404.html',
      include: ['navLinks', 'opengraph'],
    },
    {
      template: 'test.njk',
      dest: 'dist/test/index.html',
      include: ['navLinks', 'opengraph'],
    },
    {
      template: 'debug.njk',
      dest: 'dist/debug/index.html',
      include: '*',
    },
    (ctx) => {
      return ctx.pages.map((page) => {
        return {
          template: 'page.njk',
          dest: `dist/${page.fields.url}/index.html`,
          include: '*',
          extraContext: {
            ...page.fields,
          },
        };
      });
    },
  ],
};

export default config;
