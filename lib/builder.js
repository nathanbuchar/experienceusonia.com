import fs from 'fs';
import path from 'path';
import createDebug from 'debug';

const debug = createDebug('lib:builder');

/**
  * @typedef {Object} Config
  * @property {RenderFn} render
  * @property {Plugin[]} [plugins]
  * @property {Target[]} [targets]
  */

/**
  * @typedef {Function} RenderFn
  * @param {string} template
  * @param {Context} ctx
  * @returns {Promise<string>}
  */

/**
  * @typedef {Object} Plugin
  * @property {PluginMethodFn} [run]
  * @property {PluginMethodFn} [afterBuild]
  */

/**
  * @typedef {Function} PluginMethodFn
  * @param {Context} ctx
  * @param {Builder} builder
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

  /** @type {Config} */
  _config;

  /**
   * Creates a new Builder instance.
   *
   * @param {Config} config
   * @returns {Builder}
   */
  constructor(config) {
    this._config = {
      plugins: [],
      targets: [],
      ...config,
    };
  }

  /**
    * Runs plugins and returns context.
    *
    * @async
    * @static
    * @param {Plugin[]} plugins
    * @param {Context} [ctx]
    * @param {string} [method]
    * @returns {Promise<Context>}
    */
  static async runPlugins(plugins, ctx = {}, method = 'run') {
    debug('Running plugins…');

    for (const plugin of plugins) {
      if (method in plugin) {
        try {
          await plugin[method](ctx, this);
        } catch (err) {
          debug('Plugin error:', err);
          throw err;
        }
      }
    }

    return ctx;
  }

  /**
   * Writes file to disk.
   *
   * @async
   * @static
   * @param {string} filePath
   * @param {string} data
   * @returns {Promise<void>}
   */
  static async writeFile(filePath, data) {
    const normalizedPath = path.normalize(filePath);
    const dir = path.dirname(normalizedPath);

    await new Promise((resolve, reject) => {
      fs.mkdir(dir, { recursive: true }, (err) => {
        if (err) return reject(err);

        fs.writeFile(normalizedPath, data, (err) => {
          if (err) return reject(err);

          debug(`Wrote file "${normalizedPath}"`);
          resolve();
        });
      });
    });
  }

  /**
    * Renders all targets in a target tree.
    *
    * @async
    * @static
    * @param {RenderFn} render
    * @param {Array<Target|TargetFn>} targets
    * @param {Context} ctx
    * @returns {Promise<void>}
    */
  static async renderTargets(render, targets, ctx) {
    debug('Building targets…');

    for (const target of targets) {
      if (Array.isArray(target)) {
        await Builder.renderTargets(render, target, ctx);
      } else if (typeof target === 'function') {
        const result = await target(ctx);
        const newTarget = Array.isArray(result) ? result : [result];

        await Builder.renderTargets(render, newTarget, ctx);
      } else {
        await Builder.renderTarget(render, target, ctx);
      }
    }
  }

  /**
   * Renders a single target.
   *
   * @async
   * @static
   * @param {RenderFn} render
   * @param {Target} target
   * @param {Context} ctx
   * @returns {Promise<void>}
   */
  static async renderTarget(render, target, ctx) {
    if (target.enabled === false) return;

    const targetCtx = {};

    if (target.include) {
      if (target.include === '*') {
        Object.assign(targetCtx, ctx);
      } else if (Array.isArray(target.include)) {
        for (const key of target.include) {
          targetCtx[key] = ctx[key];
        }
      }
    }

    if (target.extraContext) {
      Object.assign(targetCtx, target.extraContext);
    }

    const html = await render(target.template, targetCtx);

    await Builder.writeFile(target.dest, html);
  }

  /**
   * Builds the site.
   *
   * @async
   * @param {Context} [ctx]
   * @returns {Promise<void>}
   */
  async build(ctx = {}) {
    debug('Building…');

    const { render, plugins, targets } = this._config;

    await Builder.runPlugins(plugins, ctx);
    await Builder.renderTargets(render, targets, ctx);
    await Builder.runPlugins(plugins, ctx, 'afterBuild');

    debug('Build finished');
  }
}

export default Builder;
