/**
 * Caching utility.
 *
 * Provides a Cacher class for caching data with TTL (time-
 * to-live) to speed up development builds and minimize
 * unnecessary API requests to prevent rate limiting for
 * free tiers.
 *
 * @author Nate Meyer <hi@n8.engineer>
 * @module lib/cacher
 */

import fs from 'fs';
import path from 'path';

import { CACHE_DIR } from '#lib/constants.js';
import { siteDebug } from '#lib/utils/debug.js';

const debug = siteDebug.extend('cacher');

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
      ttl: 24 * 60 * 60 * 1000, // one day
      ...opts,
    };
  }

  /**
   * Returns the path to the cache file with the specified
   * cache key.
   *
   * @param {string} key
   * @returns {string}
   */
  getPathToCacheFile() {
    const { key } = this.opts;

    return path.join(CACHE_DIR, `${key}.json`);
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
    const pathToCacheFile = this.getPathToCacheFile();

    const cached = JSON.stringify({
      key,
      ttl,
      expires: Date.now() + ttl,
      data,
    });

    return new Promise((resolve, reject) => {
      fs.mkdir(CACHE_DIR, { recursive: true }, (err) => {
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
    const pathToCacheFile = this.getPathToCacheFile();

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
    const { key, enabled } = this.opts;

    // If caching is disabled, fetch directly
    if (!enabled) {
      debug('Cache is disabled for "%s". Hydrating…', key);
      return hydrate();
    }

    const pathToCacheFile = this.getPathToCacheFile();
    const cacheExists = fs.existsSync(pathToCacheFile);

    // Check if cache exists and is fresh
    if (cacheExists) {
      const cache = await this.loadCache();

      if (Date.now() <= cache.expires) {
        debug('Fresh cache found for "%s"', key);
        return cache.data;
      }
    }

    // Cache doesn't exist or is expired - fetch and save
    debug('Cache is expired or doesn\'t exist for "%s". Hydrating…', key);
    const data = await hydrate();
    await this.saveCache(data);
    return data;
  }
}

export default Cacher;
