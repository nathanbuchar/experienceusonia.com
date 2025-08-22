import 'dotenv/config';

import Builder from './lib/builder.js';

import client from './lib/client.js';
import env from './lib/env.js';
import render from './lib/render.js';

import cache from './lib/plugins/cache.js';
import clean from './lib/plugins/clean.js';
import contentful from './lib/plugins/contentful.js';
import copy from './lib/plugins/copy.js';
import tickets from './lib/plugins/tickets.js';

Builder.build({
  render,
  watch: {
    dir: 'src',
    enabled: process.argv.includes('--watch'),
  },
  plugins: [
    clean('dist'),
    cache({
      key: 'contentful',
      enabled: env.isDevelopment && !process.argv.includes('--no-cache'),
      run() {
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
      enabled: env.isDevelopment && !process.argv.includes('--no-cache'),
      run() {
        return Builder.runPlugins([
          tickets(),
        ]);
      },
    }),
    copy({
      from: 'src/static',
      to: 'dist',
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
      enabled: env.isDevelopment,
    },
    {
      template: 'debug.njk',
      dest: 'dist/debug/index.html',
      include: '*',
      enabled: env.isDevelopment,
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
});
