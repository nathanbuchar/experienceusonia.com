/**
 * Cache plugin.
 *
 * @author Nate Meyer <hi@n8.engineer>
 * @module lib/plugins/cache
*/

import Cacher from '#lib/cacher.js';

/**
 * @typedef {Object} CachePluginOptions
 * @property {string} key
 * @property {boolean} [enabled]
 * @property {number} [ttl]
 * @property {Function} hydrate
 */

/**
 * Caches plugin output with TTL.
 *
 * @param {CachePluginOptions} opts
 * @returns {Plugin}
 * @example
 * plugins: [
 *   cache({
 *     key: 'blog',
 *     hydrate() {
 *       return Builder.runPlugins([
 *         blogPosts(),
 *       ]);
 *     },
 *   }),
 * ]
 */
function cachePlugin({
  hydrate,
  ...cacherOpts
}) {
  const cacher = new Cacher(cacherOpts);

  return {
    async run(ctx) {
      const data = await cacher.wrap(() => hydrate());

      Object.assign(ctx, data);
    },
  };
}

export default cachePlugin;
