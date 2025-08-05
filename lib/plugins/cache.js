import fs from 'fs';
import path from 'path';

const now = Date.now();
const cacheDir = '.cache';
const pathToCacheDir = path.join(process.cwd(), cacheDir);
const oneDay = 24 * 60 * 60 * 1000;

function getPathToCacheFile(key) {
  return path.join(pathToCacheDir, `${key}.json`);
}

/**
 * Attempts to load the cached data.
 *
 * @returns {Promise<Object>}
 */
function loadCache(key) {
  return new Promise((resolve, reject) => {
    const pathToCacheFile = getPathToCacheFile(key);

    fs.readFile(pathToCacheFile, 'utf8', (err, data) => {
      if (err) return reject(err);

      try {
        const cache = JSON.parse(data);

        console.log(`Cache: Loaded file "${pathToCacheFile}"`);

        resolve(cache);
      } catch (err) {
        reject(err);
      }
    });
  });
}

/**
 * Attempts to save the context to cache.
 *
 * @param {Object} data
 * @returns {Promise<void>}
 */
function saveCache(data, { key, ttl }) {
  return new Promise((resolve, reject) => {
    const pathToCacheFile = getPathToCacheFile(key);

    try {
      const cached = JSON.stringify({
        key,
        ttl,
        expires: Date.now() + ttl,
        data,
      });

      fs.mkdir(pathToCacheDir, { recursive: true }, (err) => {
        if (err) return reject(err);

        fs.writeFile(pathToCacheFile, cached, (err) => {
          if (err) return reject(err);

          console.log(`Cache: Wrote file "${pathToCacheFile}"`);
          resolve();
        });
      });
    } catch (err) {
      reject(err);
    }
  });
}

function cachePlugin({
  key,
  enabled = true,
  ttl = oneDay,
  run,
}) {
  return async (ctx) => {
    if (enabled) {
      console.log('Cache: Enabled');
      const pathToCacheFile = getPathToCacheFile(key);
      const cacheFileExists = fs.existsSync(pathToCacheFile);

      if (cacheFileExists) {
        const cache = await loadCache(key);

        if (Date.now() > cache.expires) {
          console.log('Cache: Expired');
          const data = await run();
          await saveCache(data, { key, ttl });
          Object.assign(ctx, data);
        } else {
          console.log('Cache: Valid');
          Object.assign(ctx, cache.data);
        }
      } else {
        const data = await run();
        await saveCache(data, { key, ttl });
        Object.assign(ctx, data);
      }
    } else {
      console.log('Cache: Disabled');
      const data = await run();
      Object.assign(ctx, data);
    }
  };
}

export default cachePlugin;
