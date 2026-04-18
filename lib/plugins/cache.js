import fs from 'node:fs/promises';
import path from 'node:path';

const cacheDir = '.cache';
const pathToCacheDir = path.join(process.cwd(), cacheDir);
const oneDay = 24 * 60 * 60 * 1000;

/**
 * Gets the path to the cache file.
 *
 * @param {string} key
 * @returns {string}
 */
function getPathToCacheFile(key) {
  return path.join(pathToCacheDir, `${key}.json`);
}

/**
 * Attempts to load the cached data.
 *
 * @returns {Promise<Object>}
 */
async function loadCache(key) {
  const pathToCacheFile = getPathToCacheFile(key);

  const data = await fs.readFile(pathToCacheFile, 'utf8');
  const cache = JSON.parse(data);

  return cache;
}

/**
 * Attempts to save the context to cache.
 *
 * @param {Object} data
 * @returns {Promise<void>}
 */
async function saveCache(data, { key, ttl }) {
  const pathToCacheFile = getPathToCacheFile(key);

  const cached = JSON.stringify({
    key,
    ttl,
    expires: Date.now() + ttl,
    data,
  });

  await fs.mkdir(pathToCacheDir, { recursive: true });
  await fs.writeFile(pathToCacheFile, cached);
}

/**
 * @typedef {Object} CachePluginOptions
 * @property {string} key
 * @property {boolean} [enabled]
 * @proeprty {number} [ttl]
 * @property {Function} run

/**
 * A plugin which caches the output.
 *
 * @example
 *
 * plugins: [
 *   cache({
 *     key: 'blog',
 *     run() {
 *       builder.runPlugins([
 *         blogPosts(),
 *       ]);
 *     },
 *   }),
 * ]
 *
 * @param {CachePluginOptions} options
 * @returns {Plugin}
 */
function cachePlugin({
  key,
  enabled = true,
  ttl = oneDay,
  run,
}) {
  return async (ctx) => {
    if (enabled) {
      const pathToCacheFile = getPathToCacheFile(key);

      let cacheFileExists = false;
      try {
        await fs.stat(pathToCacheFile);
        cacheFileExists = true;
      } catch (err) {
        // File doesn't exist
      }

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
