import fs from 'fs';
import path from 'path';

import debug from './debug.js';

/** @type {Config} */
const defaultConfig = {
  render: () => {},
  watch: {},
  plugins: [],
  targets: [],
};

class Builder {

  /**
   * @typedef {Object} Config
   * @prop {boolean} [watch]
   * @prop {Plugin[]} [plugins]
   * @prop {(Target | TargetFn)[]} [targets]
   * @prop {RenderFn} [render]
   */

  /**
   * @typedef {Function} RenderFn
   * @param {string} template
   * @param {Context} ctx
   * @returns {Promise<string>}
   */

  /**
   * @typedef {Object<string, any>} Context
   */

  /**
   * @typedef {Function} Plugin
   * @param {Config} config
   * @param {Context} ctx
   * @returns {Promise<void>}
   */

  /**
   * @typedef {Object} Target
   * @prop {string} template
   * @prop {string} dest
   * @prop {boolean} [enabled]
   * @prop {Context} [extraContext]
   */

  /**
   * @typedef {Function} TargetFn
   * @param {Context} ctx
   * @returns {(Target | TargetFn)[]}
   */

  /**
   * Writes file to disk, creating directories as needed.
   *
   * @async
   * @static
   * @param {string} filePath
   * @param {string} data
   * @returns {Promise<void>}
   */
  static async writeFile(filePath, data) {
    const normalizedFilePath = path.normalize(filePath);
    const dirname = path.dirname(normalizedFilePath);

    return new Promise((resolve, reject) => {
      fs.mkdir(dirname, { recursive: true }, (err) => {
        if (err) return reject(err);

        fs.writeFile(filePath, data, (err) => {
          if (err) return reject(err);

          debug.builder(`Wrote file "${normalizedFilePath}"`);

          resolve();
        });
      });
    });
  }

  /**
   * Builds a target.
   *
   * @async
   * @static
   * @param {Target} target
   * @param {RenderFn} render
   * @param {Context} ctx
   * @returns {Promise<void>}
   */
  static async buildTarget(target, render, ctx) {
    const ownContext = {};

    if (target.enabled === false) return;

    if (target.include) {
      if (target.include === '*') {
        Object.assign(ownContext, ctx);
      } else {
        for (const key of target.include) {
          ownContext[key] = ctx[key];
        }
      }
    }

    if (target.extraContext) {
      Object.assign(ownContext, target.extraContext);
    }

    const result = await render(target.template, ownContext);

    await Builder.writeFile(target.dest, result);
  }

  /**
   * Builds all targets recursively.
   *
   * @async
   * @static
   * @param {Array<Target | TargetFn>} targets
   * @param {RenderFn} render
   * @param {Context} ctx
   * @returns {Promise<void>}
   */
  static async buildTargets(targets, render, ctx) {
    debug.builder('Rendering targets…');

    for (const target of targets) {
      if (Array.isArray(target)) {
        await Builder.buildTargets(target, render, ctx);
      } else {
        let finalTarget = target;

        if (typeof target === 'function') {
          finalTarget = await target(ctx);

          if (Array.isArray(finalTarget)) {
            await Builder.buildTargets(finalTarget, render, ctx);
            continue;
          }
        }

        await Builder.buildTarget(finalTarget, render, ctx);
      }
    }

    debug.builder('Finished rendering targets');
  }

  /**
   * Runs all plugins synchronously.
   *
   * @async
   * @static
   * @param {Plugin[]} plugins
   * @returns {Promise<Context>}
   */
  static async runPlugins(plugins) {
    const ctx = {};

    debug.builder('Running plugins…');

    for (const plugin of plugins) {
      await plugin(ctx);
    }

    debug.builder('Finished running plugins');

    return Object.freeze(ctx);
  }

  /**
   * Watches for changes.
   *
   * @async
   * @static
   * @param {Object} opts
   * @param {string} opts.dir
   * @param {boolean} opts.enabled
   * @param {Function} fn
   */
  static async watch(opts, fn) {
    debug.builder('Watching for changes…');

    let buildInProgress = false;
    let buildQueued = false;

    const debouncedHandler = async () => {
      if (buildInProgress) {
        buildQueued = true;
        return;
      }

      buildInProgress = true;
      buildQueued = false;

      try {
        await fn();
      } finally {
        buildInProgress = false;
        if (buildQueued) {
          debouncedHandler();
        }
      }
    };

    const watcher = fs.watch(opts.dir, {
      recursive: true,
    });

    for await (const _ of watcher) {
      debug.builder('Changes detected. Rebuilding…');
      debouncedHandler();
    }
  }

  /**
   * Builds the project.
   *
   * @async
   * @static
   * @param {Config} options
   * @returns {Promise<void>}
   */
  static async build(options) {
    const { plugins, targets, render, watch } = Object.assign(defaultConfig, options);

    const buildFn = async () => {
      debug.builder('Building…');

      const ctx = await Builder.runPlugins(plugins);
      await Builder.buildTargets(targets, render, ctx);

      debug.builder('Build finished');
    }

    await buildFn();

    if (watch && watch.enabled) {
      Builder.watch(watch, buildFn);
    }
  }
}

export default Builder;
