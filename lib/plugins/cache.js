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
  key,
  enabled,
  ttl,
  hydrate,
}) {
  const cacher = new Cacher({ key, enabled, ttl });

  return {
    async run(ctx) {
      const data = await cacher.wrap(() => hydrate());

      Object.assign(ctx, data);
    },
  };
}

export default cachePlugin;
