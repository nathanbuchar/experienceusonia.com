import fs from 'fs';
import path from 'path';

/** * @type {Config} */
const defaultConfig = {
  watch: {},
  context: {},
  plugins: [],
  targets: [],
  render: (str) => str,
};

class Builder {

  /**
   * @typedef {Object} Config
   * @prop {Context} [context]
   * @prop {boolean} [watch]
   * @prop {Plugin[]} [plugins]
   * @prop {(Target | TargetFn)[]} [targets]
   * @prop {RenderFn} [render]
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
    const res = await render(target.template, ownCtx);

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
   * @param {Context} [initialContext]
   * @returns {Promise<void>}
   */
  static async runPlugins(plugins, initialContext = {}) {
    const ctx = { ...initialContext };

    for (const plugin of plugins) {
      await plugin(ctx);
    }

    return Object.freeze(ctx);
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
      context,
      watch,
      plugins,
      targets,
      render,
    } = Object.assign(defaultConfig, options);

    const buildFn = () => {
      console.log('Builder: Build started');

      return Builder
        .runPlugins(plugins, context)
        .then((ctx) => {
          return Builder
            .renderTargets(targets, render, ctx)
            .then(() => {
              console.log('Builder: Build complete');
            });
        });
    };

    await buildFn();

    if (watch.enabled) {
      console.log('Builder: Watching for changes…');
      fs.watch(watch.dir, { recursive: true }, () => {
        console.log('Builder: Changes detected. Rebuilding…');
        buildFn();
      });
    }
  }
}

export default Builder;
