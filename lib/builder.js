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

  /** @type {Context} */
  #ctx = {};

  /** @type {Config} */
  #config = {};

  /**
   * Creates a new Builder instance.
   *
   * @constructor
   * @param {Config} config
   * @returns {void}
   */
  constructor(config) {
    this.#config = Object.freeze({
      plugins: [],
      targets: [],
      ...config,
    });
  }

  /**
   * Writes a file.
   *
   * @async
   * @param {string} filePath
   * @param {string} data
   * @returns {Promise<void>}
   */
  async writeFile(filePath, data) {
    await new Promise((resolve, reject) => {
      const normalizedFilePath = path.normalize(filePath);
      const dirname = path.dirname(normalizedFilePath);

      fs.mkdir(dirname, { recursive: true }, (err) => {
        if (err) return reject(err);

        fs.writeFile(normalizedFilePath, data, (err) => {
          if (err) return reject(err);

          console.log(`Wrote file "${normalizedFilePath}"`);
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
   * @param {Context} ownCtx
   * @returns {Promise<void>}
   */
  async renderTarget(target, ownCtx) {
    const config = this.#config;

    const normalizedTemplatePath = path.normalize(target.template);
    const res = await config.render(normalizedTemplatePath, ownCtx);

    await this.writeFile(target.dest, res);
  }

  /**
   * Builds a target.
   *
   * @async
   * @param {Target | TargetFn} target
   * @returns {Promise<void>}
   */
  async buildTarget(target) {
    const ctx = this.#ctx;
    const ownCtx = {};

    // Derive target if target is a function.
    if (typeof target === 'function') {
      target = await target(ctx);

      if (Array.isArray(target)) {
        await this.buildTargets(target);
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

    await this.renderTarget(target, ownCtx);
  }

  /**
   * Builds all targets recursively.
   *
   * @async
   * @param {(Target | TargetFn)[]} targets
   * @returns {Promise<void>}
   */
  async buildTargets(targets) {
    const config = this.#config;

    for (const target of targets ?? config.targets) {
      if (Array.isArray(target)) {
        await this.buildTargets(target);
      } else {
        await this.buildTarget(target);
      }
    }
  }

  /**
   * Runs all plugins synchronously.
   *
   * @returns {Promise<void>}
   */
  async runPlugins() {
    const ctx = this.#ctx;
    const config = this.#config;

    for (const plugin of config.plugins) {
      await plugin(config, ctx);
    }

    // Beyond this point, context may not be changed.
    Object.freeze(ctx);
  }

  /**
   * Builds the site.
   *
   * @async
   * @returns {Promise<void>}
   */
  async build() {
    await this.runPlugins();
    await this.buildTargets();
  }
}

export default Builder;
