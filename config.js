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
  context: {
    isDevelopment: env.isDevelopment,
    isProduction: env.isProduction,
  },
  watch: {
    dir: 'src',
    enabled: process.argv.includes('--watch'),
  },
  plugins: [
    clean('dist'),
    cache({
      key: 'plugins',
      enabled: env.isDevelopment && !process.argv.includes('--no-cache'),
      run() {
        return Builder.runPlugins([
          tickets(),
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
      include: ['navLinks', 'opengraph'],
    },
    () => {
      if (env.isDevelopment) {
        return [
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
        ];
      }

      return [];
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
