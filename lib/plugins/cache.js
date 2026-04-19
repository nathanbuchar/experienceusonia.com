import fs from 'fs';
import path from 'path';

const cacheDir = '.cache';
const pathToCacheDir = path.join(process.cwd(), cacheDir);
const oneDay = 24 * 60 * 60 * 1000;

/**
 * Loads cached data.
 *
 * @param {string} key
 * @returns {Promise<Object>}
 */
function loadCache(key) {
  const pathToCacheFile = path.join(pathToCacheDir, `${key}.json`);

  return new Promise((resolve, reject) => {
    fs.readFile(pathToCacheFile, 'utf8', (err, data) => {
      if (err) return reject(err);

      try {
        const cache = JSON.parse(data);

        resolve(cache);
      } catch (err) {
        reject(err);
      }
    });
  });
}

/**
 * Saves data to cache.
 *
 * @param {Object} data
 * @param {Object} options
 * @param {string} options.key
 * @param {number} options.ttl
 * @returns {Promise<void>}
 */
function saveCache(data, { key, ttl }) {
  const pathToCacheFile = path.join(pathToCacheDir, `${key}.json`);

  const cached = JSON.stringify({
    key,
    ttl,
    expires: Date.now() + ttl,
    data,
  });

  return new Promise((resolve, reject) => {
    fs.mkdir(pathToCacheDir, { recursive: true }, (err) => {
      if (err) return reject(err);

      fs.writeFile(pathToCacheFile, cached, (err) => {
        if (err) return reject(err);

        resolve();
      });
    });
  });
}

/**
 * @typedef {Object} CachePluginOptions
 * @property {string} key
 * @property {boolean} [enabled]
 * @property {number} [ttl]
 * @property {Function} run
 */

/**
 * Caches plugin output with TTL.
 *
 * @param {CachePluginOptions} options
 * @returns {Plugin}
 * @example
 * plugins: [
 *   cache({
 *     key: 'blog',
 *     run() {
 *       return builder.runPlugins([
 *         blogPosts(),
 *       ]);
 *     },
 *   }),
 * ]
 */
function cachePlugin({
  key,
  enabled = true,
  ttl = oneDay,
  run,
}) {
  return async (ctx) => {
    if (enabled) {
      const pathToCacheFile = path.join(pathToCacheDir, `${key}.json`);
      const cacheFileExists = fs.existsSync(pathToCacheFile);

      if (cacheFileExists) {
        const cache = await loadCache(key);

        if (Date.now() > cache.expires) {
          const data = await run();
          await saveCache(data, { key, ttl });
          Object.assign(ctx, data);
        } else {
          Object.assign(ctx, cache.data);
        }
      } else {
        const data = await run();
        await saveCache(data, { key, ttl });
        Object.assign(ctx, data);
      }
    } else {
      const data = await run();
      Object.assign(ctx, data);
    }
  };
}

export default cachePlugin;
