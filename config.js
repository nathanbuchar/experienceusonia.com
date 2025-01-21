import 'dotenv/config';

import clean from './lib/clean.js';
import contentful from './lib/contentful.js';
import copy from './lib/copy.js';
import engine from './lib/engine.js';
import eventbrite from './lib/eventbrite.js';

const config = {
  engine,
  plugins: [
    clean('dist'),
    contentful([
      {
        key: 'pages',
        contentType: 'page',
      },
      {
        key: 'opengraph',
        contentType: 'opengraph',
      },
    ]),
    eventbrite(),
    copy([
      {
        from: 'src/static', 
        to: 'dist',
      },
    ]),
  ],
  targets: [
    {
      template: '404.njk',
      dest: 'dist/404.html',
      include: ['opengraph'],
    },
    {
      template: 'test.njk',
      dest: 'dist/test/index.html',
      include: ['opengraph'],
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