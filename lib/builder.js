import fs from 'fs';
import path from 'path';

import debug from './debug.js';

/**
 * @typedef {Object} BuildConfig
 * @property {RenderFn} render
 * @property {Plugin[]} [plugins]
 * @property {Target[]} [targets]
 * @property {WatchConfig} [watch]
 */

/**
 * @typedef {Object} WatchConfig
 * @property {boolean} enabled
 * @property {string} dir
 */

/**
 * @typedef {Function} RenderFn
 * @param {string} template
 * @param {Context} ctx
 * @returns {Promise<string>}
 */

/**
 * @typedef {Function} Plugin
 * @param {Context} ctx
 * @returns {Promise<void>}
 */

/**
 * @typedef {Object} Target
 * @property {string} template
 * @property {string} dest
 * @property {boolean} [enabled]
 * @property {string[]|'*'} [include]
 * @property {Object} [extraContext]
 */

/**
 * @typedef {Function} TargetFn
 * @param {Context} ctx
 * @returns {Target|Target[]|TargetFn|Array<Target|TargetFn>}
 */

/**
 * @typedef {Object<string, any>} Context
 */

class Builder {

  /**
   * Runs plugins and returns context.
   *
   * @param {Plugin[]} plugins
   * @returns {Promise<Context>}
   */
  static async runPlugins(plugins) {
    debug.builder('Running plugins…');

    const ctx = {};
    for (const plugin of plugins) {
      await plugin(ctx);
    }

    debug.builder('Finished running plugins');
    return Object.freeze(ctx);
  }

  /**
   * Writes file to disk.
   *
   * @param {string} filePath
   * @param {string} data
   * @returns {Promise<void>}
   */
  static writeFile(filePath, data) {
    const normalizedPath = path.normalize(filePath);
    const dir = path.dirname(normalizedPath);

    return new Promise((resolve, reject) => {
      fs.mkdir(dir, { recursive: true }, (err) => {
        if (err) return reject(err);

        fs.writeFile(normalizedPath, data, (err) => {
          if (err) return reject(err);

          debug.builder(`Wrote file "${normalizedPath}"`);
          resolve();
        });
      });
    });
  }

  /**
   * Builds context for a target.
   *
   * @param {Target} target
   * @param {Context} ctx
   * @returns {Context}
   */
  static buildTargetContext(target, ctx) {
    const targetCtx = {};

    if (target.include === '*') {
      Object.assign(targetCtx, ctx);
    } else if (Array.isArray(target.include)) {
      for (const key of target.include) {
        targetCtx[key] = ctx[key];
      }
    }

    if (target.extraContext) {
      Object.assign(targetCtx, target.extraContext);
    }

    return targetCtx;
  }

  /**
   * Builds a single target.
   *
   * @param {Target} target
   * @param {RenderFn} render
   * @param {Context} ctx
   * @returns {Promise<void>}
   */
  static async renderTarget(target, render, ctx) {
    if (target.enabled === false) return;

    const targetCtx = Builder.buildTargetContext(target, ctx);
    const html = await render(target.template, targetCtx);

    await Builder.writeFile(target.dest, html);
  }

  /**
   * Flattens target tree.
   *
   * @param {Target|TargetFn|Array<Target|TargetFn>} target
   * @param {Context} ctx
   * @returns {Promise<Target[]>}
   */
  static async flattenTargets(target, ctx) {
    if (Array.isArray(target)) {
      const results = await Promise.all(
        target.map((target) => Builder.flattenTargets(target, ctx))
      );

      return results.flat();
    }

    if (typeof target === 'function') {
      const result = await target(ctx);

      return Builder.flattenTargets(result, ctx);
    }

    return [target];
  }

  /**
   * Builds all targets.
   *
   * @param {Array<Target|TargetFn>} targets
   * @param {RenderFn} render
   * @param {Context} ctx
   * @returns {Promise<void>}
   */
  static async renderTargets(targets, render, ctx) {
    debug.builder('Rendering targets…');

    const flatTargets = await Builder.flattenTargets(targets, ctx);

    for (const target of flatTargets) {
      await Builder.renderTarget(target, render, ctx);
    }

    debug.builder('Finished rendering targets');
  }

  /**
   * Watches for file changes.
   *
   * @param {WatchConfig} config
   * @param {Function} fn
   * @returns {Promise<void>}
   */
  static async watch(config, fn) {
    debug.builder('Watching for changes…');

    let building = false;
    let queued = false;

    const build = async () => {
      if (building) {
        queued = true;
        return;
      }

      building = true;
      queued = false;

      try {
        await fn();
      } finally {
        building = false;
        if (queued) build();
      }
    };

    const watcher = fs.watch(config.dir, { recursive: true });

    for await (const _ of watcher) {
      debug.builder('Changes detected. Rebuilding…');
      build();
    }
  }

  /**
   * Builds the site.
   *
   * @param {BuildConfig} config
   * @returns {Promise<void>}
   */
  static async build(config) {
    const { render, plugins = [], targets = [], watch } = config;

    const buildFn = async () => {
      debug.builder('Building…');

      const ctx = await Builder.runPlugins(plugins);
      await Builder.renderTargets(targets, render, ctx);

      debug.builder('Build finished');
    };

    await buildFn();

    if (watch?.enabled) {
      await Builder.watch(watch, buildFn);
    }
  }
}

export default Builder;
