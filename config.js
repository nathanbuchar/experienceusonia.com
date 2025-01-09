import 'dotenv/config';

import client from './lib/client.js';
import engine from './lib/engine.js';

/**
 * @typedef {Object} Config
 * @prop {Client} client
 * @prop {Engine} engine
 * @prop {Source[]} [sources]
 * @prop {(Target | TargetFn)[]} [targets]
 */

/**
 * @typedef {Object} Source
 * @prop {string} name
 * @prop {string} contentType
 */

/**
 * @typedef {Object} Target
 * @prop {string} dest
 * @prop {string} [src]
 * @prop {string} [template]
 * @prop {Source['name'][]} [include]
 * @prop {Object} [extraContext]
 */

/**
 * @function TargetFn
 * @param {Data} data
 * @returns {(Target | TargetFn)[]}
 */

/**
 * @type {Config}
 */
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
      include: ['banners']
    },
    {
      template: 'test.njk',
      dest: 'dist/test/index.html',
      include: ['banners']
    },
    {
      template: 'debug.njk',
      dest: 'dist/debug/index.html',
      include: ['banners', 'pages'],
    },
    (data) => data.pages.map((page) => {
      return {
        template: 'page.njk',
        dest: `dist/${page.fields.url}/index.html`,
        include: ['banners', 'pages'],
        extraContext: {
          ...page.fields
        }
      };
    })
  ]
};

export default config;