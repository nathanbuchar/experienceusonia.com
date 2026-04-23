import 'dotenv/config';

import Builder from '#lib/builder.js';

import client from '#lib/client.js';
import render from '#lib/render.js';
import runtime from '#lib/runtime.js';

import cache from '#lib/plugins/cache.js';
import clean from '#lib/plugins/clean.js';
import contentful from '#lib/plugins/contentful.js';
import copy from '#lib/plugins/copy.js';
import tickets from '#lib/plugins/tickets.js';
import watch from '#lib/plugins/watch.js';

const watchEnabled = process.argv.includes('--watch');
const cacheDisabled = process.argv.includes('--no-cache');

const builder = new Builder({
  render,
  plugins: [
    clean('dist'),
    cache({
      key: 'contentful',
      enabled: !cacheDisabled,
      hydrate() {
        return Builder.runPlugins([
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
                key: 'banners',
                contentType: 'banner',
              },
              {
                key: 'opengraph',
                contentType: 'opengraph',
              },
            ],
          }),
        ]);
      },
    }),
    cache({
      key: 'tickets',
      enabled: !cacheDisabled,
      hydrate() {
        return Builder.runPlugins([
          tickets(),
        ]);
      },
    }),
    copy({
      from: 'src/static',
      to: 'dist',
    }),
    watch({
      dir: 'src',
      enabled: watchEnabled,
      async handler() {
        await builder.build();
      },
    }),
  ],
  targets: [
    {
      template: '404.njk',
      dest: 'dist/404.html',
      include: ['navLinks', 'banners', 'opengraph'],
    },
    {
      template: 'test.njk',
      dest: 'dist/test/index.html',
      include: ['navLinks', 'banners', 'opengraph'],
      enabled: runtime.isDevelopment,
    },
    {
      template: 'debug.njk',
      dest: 'dist/debug/index.html',
      include: '*',
      enabled: runtime.isDevelopment,
    },
    (ctx) => [
      ...ctx.pages.map((page) => ({
        template: 'page.njk',
        dest: `dist/${page.fields.url}/index.html`,
        include: '*',
        extraContext: {
          ...page.fields,
        },
      })),
    ],
  ],
});

builder.build();
