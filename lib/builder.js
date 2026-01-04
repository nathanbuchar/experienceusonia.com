import fs from 'node:fs';
import path from 'node:path';
import { encryptHTML } from 'pagecrypt';

/** * @type {Config} */
const defaultConfig = {
  render: {},
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
   * @prop {Render} [render]
   */

  /**
   * @typedef {Object} Render
   * @prop {RenderFn} [renderFn]
   * @prop {boolean} [encryption.enabled]
   * @prop {string} [encryption.password]
   */

  /**
   * @function RenderFn
   * @param {string} template
   * @param {Context} ctx
   * @returns {Promise<string>}
   */

  /**
   * @typedef {Object<string, any>} Context
   */

  /**
   * @function Plugin
   * @param {Config} config
   * @param {Context} ctx
   * @returns {Promise<void>}
   */

  /**
   * @typedef {Object} Target
   * @prop {string} template
   * @prop {string} dest
   * @prop {boolean} [enabled]
   * @prop {Object} [extraContext]
   */

  /**
   * @function TargetFn
   * @param {Context} ctx
   * @returns {(Target | TargetFn)[]}
   */

  /**
   * Writes a file.
   *
   * @async
   * @static
   * @param {string} filePath
   * @param {string} data
   * @returns {Promise<void>}
   */
  static async writeFile(filePath, data) {
    await new Promise((resolve, reject) => {
      const normalizedFilePath = path.normalize(filePath);
      const dirname = path.dirname(normalizedFilePath);

      fs.mkdir(dirname, { recursive: true }, (err) => {
        if (err) return reject(err);

        fs.writeFile(normalizedFilePath, data, (err) => {
          if (err) return reject(err);

          console.log(`Builder: Wrote file "${normalizedFilePath}"`);
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
   * @param {Target | TargetFn} target
   * @param {RenderFn} render
   * @param {Context} [ctx]
   * @returns {Promise<void>}
   */
  static async renderTarget(target, render, ctx = {}) {
    const ownCtx = {};

    // Derive target if target is a function.
    if (typeof target === 'function') {
      const derivedTarget = await target(ctx);

      if (Array.isArray(derivedTarget)) {
        await Builder.renderTargets(derivedTarget, render, ctx);
        return;
      }
    }

    // Do not render the target if it's not enabled.
    if (target.enabled === false) {
      return;
    }

    // Apply included context.
    if (target.include) {
      if (target.include === '*') {
        // Handle wildcard case.
        Object.assign(ownCtx, ctx);
      } else {
        for (const key of target.include) {
          ownCtx[key] = ctx[key];
        }
      }
    }

    // Apply extra context.
    if (target.extraContext) {
      Object.assign(ownCtx, target.extraContext);
    }

    // Render the target.
    const res = await render.renderFn(target.template, ownCtx);

    // Encrypt the output.
    if (render?.encryption?.enabled) {
      const encryptedRes = await encryptHTML(res, render.encryption.password);
      await Builder.writeFile(target.dest, encryptedRes);
      return;
    }

    await Builder.writeFile(target.dest, res);
  }

  /**
   * Builds all targets recursively.
   *
   * @async
   * @static
   * @param {(Target | TargetFn)[]} targets
   * @param {RenderFn} render
   * @param {Context} [ctx]
   * @returns {Promise<void>}
   */
  static async renderTargets(targets, render, ctx = {}) {
    for (const target of targets) {
      if (Array.isArray(target)) {
        await Builder.renderTargets(target, render, ctx);
      } else {
        await Builder.renderTarget(target, render, ctx);
      }
    }
  }

  /**
   * Runs all plugins synchronously.
   *
   * @async
   * @static
   * @param {Plugin[]} plugins
   * @returns {Promise<void>}
   */
  static async runPlugins(plugins) {
    const ctx = {};

    for (const plugin of plugins) {
      await plugin(ctx);
    }

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
    console.log('Builder: Watching for changes…');

    let buildInProgress = false;
    let buildQueued = false;

    const debouncedBuild = async () => {
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
          debouncedBuild();
        }
      }
    };

    fs.watch(opts.dir, { recursive: true }, () => {
      console.log('Builder: Changes detected. Rebuilding…');
      debouncedBuild();
    });
  }

  /**
   * Builds the site.
   *
   * @async
   * @static
   * @param {Config} options
   * @returns {Promise<void>}
   */
  static async build(options) {
    const {
      watch,
      plugins,
      targets,
      render,
    } = Object.assign(defaultConfig, options);

    const buildFn = () => {
      console.log('Builder: Build started');

      return Builder
        .runPlugins(plugins)
        .then((ctx) => {
          return Builder
            .renderTargets(targets, render, ctx)
            .then(() => {
              console.log('Builder: Build complete');
            });
        });
    };

    await buildFn();

    if (watch && watch.enabled) {
      Builder.watch(watch, buildFn);
    }
  }
}

export default Builder;
