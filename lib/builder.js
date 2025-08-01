import fs from 'fs';
import path from 'path';

class Builder {

  /**
   * @typedef {Object} Config
   * @prop {RenderFn} render
   * @prop {Plugin[]} [plugins]
   * @prop {(Target | TargetFn)[]} [targets]
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
   * Renders a target.
   *
   * @async
   * @param {Target} target
   * @param {Config} config
   * @param {Context} ownCtx
   * @returns {Promise<void>}
   */
  static async renderTarget(target, config, ownCtx) {
    const { render } = config;

    const normalizedTemplatePath = path.normalize(target.template);
    const res = await render(normalizedTemplatePath, ownCtx);

    await this.writeFile(target.dest, res);
  }

  /**
   * Builds a target.
   *
   * @async
   * @param {Target | TargetFn} target
   * @param {Config} config
   * @param {Context} ctx
   * @returns {Promise<void>}
   */
  static async buildTarget(target, config, ctx) {
    const ownCtx = {};

    // Derive target if target is a function.
    if (typeof target === 'function') {
      target = await target(ctx);

      if (Array.isArray(target)) {
        await this.buildTargets(target, config, ctx);
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
          if (ctx.hasOwnProperty(key)) {
            ownCtx[key] = ctx[key];
          }
        }
      }
    }

    // Apply extra context.
    if (target.extraContext) {
      Object.assign(ownCtx, target.extraContext);
    }

    await this.renderTarget(target, config, ownCtx);
  }

  /**
   * Builds all targets recursively.
   *
   * @async
   * @param {(Target | TargetFn)[]} targets
   * @param {Config} config
   * @param {Context} ctx
   * @returns {Promise<void>}
   */
  static async buildTargets(targets, config, ctx) {
    for (const target of targets) {
      if (Array.isArray(target)) {
        await this.buildTargets(target, config, ctx);
      } else {
        await this.buildTarget(target, config, ctx);
      }
    }
  }

  /**
   * Runs all plugins synchronously.
   *
   * @returns {Promise<void>}
   */
  static async runPlugins(plugins) {
    const ctx = {};

    for (const plugin of plugins) {
      await plugin(ctx, this);
    }

    // Beyond this point, context may not be changed.
    return Object.freeze(ctx);
  }

  /**
   * Builds the site.
   *
   * @async
   * @returns {Promise<void>}
   */
  static async build(config) {
    const { plugins, targets } = config;

    const ctx = await Builder.runPlugins(plugins);

    await Builder.buildTargets(targets, config, ctx);
  }
}

export default Builder;
