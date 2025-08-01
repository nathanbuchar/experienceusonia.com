import fs from 'fs';
import path from 'path';

const now = Date.now()
const cacheDir = '.cache';
const pathToCacheDir = path.join(process.cwd(), cacheDir);
const msPerDay = 24 * 60 * 60 * 1000;
const daysSinceEpoch = Math.floor(now / msPerDay) * msPerDay;
const pathToCacheFile = path.join(pathToCacheDir, `${daysSinceEpoch}.json`);

/**
 * Attempts to load the cached data.
 *
 * @returns {Promise<Object>}
 */
function loadCache() {
  return new Promise((resolve, reject) => {
    fs.readFile(pathToCacheFile, 'utf8', (err, data) => {
      if (err) return reject(err);

      try {
        const ctx = JSON.parse(data);

        console.log(`Cache: Loaded file "${pathToCacheFile}"`);

        resolve(ctx);
      } catch (err) {
        reject(err);
      }
    });
  });
}

/**
 * Attempts to save the context to cache.
 *
 * @param {Object} ctx
 * @returns {Promise<void>}
 */
function saveCache(ctx) {
  return new Promise((resolve, reject) => {
    try {
      const data = JSON.stringify(ctx);

      fs.mkdir(pathToCacheDir, { recursive: true }, (err) => {
        if (err) return reject(err);

        fs.writeFile(pathToCacheFile, data, (err) => {
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

function cachePlugin(opts = {}) {
  const { enabled = true, plugins = [] } = opts;

  return async (ctx, builder) => {
    const ownCtx = {};

    if (enabled) {
      console.log('Cache: Enabled');
      const cacheFileExists = fs.existsSync(pathToCacheFile);

      if (cacheFileExists) {
        const cachedCtx = await loadCache();
        Object.assign(ownCtx, cachedCtx);
      } else {
        const pluginCtx = await builder.runPlugins(plugins);
        await saveCache(pluginCtx);
        Object.assign(ownCtx, pluginCtx);
      }
    } else {
      console.log('Cache: Disabled');
      const pluginCtx = await builder.runPlugins(plugins);
      Object.assign(ownCtx, pluginCtx);
    }

    Object.assign(ctx, ownCtx);
  };
}

export default cachePlugin;
