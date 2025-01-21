import fs from 'fs';
import path from 'path';

/**
 * @typedef {Object} Config
 * @prop {Engine} engine
 * @prop {Plugin[]} [plugins]
 * @prop {(Target | TargetFn)[]} [targets]
 */

/**
 * @typedef {Object} Engine
 * @prop {RenderFn} render
 */

/**
 * @function RenderFn
 * @param {string} template
 * @param {Context} ctx
 * @returns Promise<string>
 */

/**
 * @typedef {Object.<string, any>} Context
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
 * @prop {string[] | '*'} [include]
 * @prop {Object} [extraContext]
 */

/**
 * @function TargetFn
 * @param {Context} ctx
 * @returns {(Target | TargetFn)[]}
 */

class Builder {

  /** @type {Context} */
  static #ctx = {};

  /** @type {Config} */
  static #config = {};

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
        if (err) {
          reject(err);
        } else {
          fs.writeFile(normalizedFilePath, data, (err) => {
            if (err) {
              reject(err);
            } else {
              console.log(`Wrote file "${normalizedFilePath}"`);
              resolve();
            }
          });
        }
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
  static async renderTarget(target, ownCtx) {
    const config = Builder.#config;
    
    const normalizedTemplatePath = path.normalize(target.template);
    const res = await config.engine.render(normalizedTemplatePath, ownCtx);

    await Builder.writeFile(target.dest, res);
  }

  /**
   * Builds a target.
   *
   * @async
   * @param {Target} target
   * @returns {Promise<void>}
   */
  static async buildTarget(target) {
    const ctx = Builder.#ctx;
    const ownCtx = {};

    // Apply included context.
    if (target.include) {
      if (target.include === '*') {
        // Handle wildcard case.
        Object.assign(ownCtx, ctx);
      } else {
        target.include.forEach((key) => {
          ownCtx[key] = ctx[key];
        });
      }
    }

    // Apply extra context.
    if (target.extraContext) {
      Object.assign(ownCtx, target.extraContext);
    }

    await Builder.renderTarget(target, ownCtx);
  }

  /**
   * Builds all targets recursively.
   *
   * @async
   * @param {(Target | TargetFn)[]} targets
   * @returns {Promise<void>}
   */
  static async buildTargets(targets) {
    const ctx = Builder.#ctx;
    const config = Builder.#config;

    for (const target of targets ?? config.targets) {
      let currTarget = target;

      if (Array.isArray(currTarget)) {
        return Builder.buildTargets(currTarget);
      } else {
        const ownCtx = {};

        // Derive target if target is a function.
        if (typeof currTarget === 'function') {
          currTarget = await target(ctx);

          if (Array.isArray(currTarget)) {
            await Builder.buildTargets(currTarget);
            return;
          }
        }

        await Builder.buildTarget(currTarget);
      }
    }
  }

  /**
   * Runs all plugins synchronously.
   * 
   * @returns {Promise<void>}
   */
  static async runPlugins() {
    const ctx = Builder.#ctx;
    const config = Builder.#config;

    for (const plugin of config.plugins) {
      await plugin(config, ctx);
    }
  }

  /**
   * Reads the config file from the directory in which npm
   * was invoked.
   * 
   * @async
   * @returns {Promise<void>}
   */
  static async getConfig() {
    const npmDir = process.cwd();
    const pathToConfig = path.resolve(npmDir, 'config.js');

    try {
      const mod = await import(pathToConfig);

      Builder.#config = {
        plugins: [],
        targets: [],
        ...mod.default,
      };
    } catch (err) {
      throw new Error(`Config file could not be loaded: ${err}`);
    }
  }

  /**
   * Builds the static site.
   *
   * @async
   * @returns {Promise<void>}
   */
  static async init() {
    await Builder.getConfig();
    await Builder.runPlugins();
    await Builder.buildTargets();
  }
}

Builder.init();
