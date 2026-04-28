import fs from 'fs';
import path from 'path';

const cacheDir = '.cache';
const pathToCacheDir = path.resolve(cacheDir);
const oneDay = 24 * 60 * 60 * 1000;

/**
 * @typedef {Object} CacherOptions
 * @property {string} key
 * @property {boolean} [enabled]
 * @property {number} [ttl]
 */

class Cacher {

  /** @type {CacherOptions} */
  opts;

  /**
   * Creates a new Cacher instance.
   *
   * @param {CacherOptions} opts
   * @returns {Cacher}
   */
  constructor(opts) {
    this.opts = {
      key: 'data',
      enabled: true,
      ttl: oneDay,
      ...opts,
    };
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
  saveCache(data) {
    const { key, ttl } = this.opts;
    const pathToCacheFile = path.normalize(pathToCacheDir, `${key}.json`);

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
   * Loads cached data.
   *
   * @returns {Promise<Object>}
   */
  loadCache() {
    const { key } = this.opts;
    const pathToCacheFile = path.normalize(pathToCacheDir, `${key}.json`);

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
   * Wraps data fetching with caching.
   *
   * @param {Function} hydrate - Async function that fetches data
   * @returns {Promise<Object>}
   */
  async wrap(hydrate) {
    const { enabled, key } = this.opts;

    // If caching is disabled, fetch directly
    if (!enabled) {
      return hydrate();
    }

    const pathToCacheFile = path.normalize(pathToCacheDir, `${key}.json`);
    const cacheExists = fs.existsSync(pathToCacheFile);

    // Check if cache exists and is fresh
    if (cacheExists) {
      const cache = await this.loadCache();

      if (Date.now() <= cache.expires) {
        return cache.data;
      }
    }

    // Cache doesn't exist or is expired - fetch and save
    const data = await hydrate();
    console.log(data);
    await this.saveCache(data);
    return data;
  }
}

export default Cacher;
