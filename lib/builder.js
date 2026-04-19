import fs from 'fs';
import path from 'path';

import debug from './debug.js';

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

/** @type {Config} */
const defaultConfig = {
  render: () => {},
  watch: {},
  plugins: [],
  targets: [],
};

class Builder {

  /**
   * @type {Config}
   */
  config = {};

  /**
   * @type {Context}
   */
  context = {};

  /**
   * Creates a new Builder instance.
   *
   * @param {Config} options
   */
  constructor(options) {
    this.config = Object.assign(defaultConfig, options);
  }

  /**
   * Writes file to disk, creating directories as needed.
   *
   * @async
   * @param {string} filePath
   * @param {string} data
   * @returns {Promise<void>}
   */
  async writeFile(filePath, data) {
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
   * @param {Target} target
   * @returns {Promise<void>}
   */
  async buildTarget(target) {
    const ownContext = {};

    if (target.enabled === false) return;

    if (target.include) {
      if (target.include === '*') {
        Object.assign(ownContext, this.context);
      } else {
        for (const key of target.include) {
          ownContext[key] = this.context[key];
        }
      }
    }

    if (target.extraContext) {
      Object.assign(ownContext, target.extraContext);
    }

    const result = await this.config.render(target.template, this.context);

    await this.writeFile(target.dest, result);
  }

  /**
   * Builds all targets recursively.
   *
   * @async
   * @param {Array<Target | TargetFn>} targets
   * @returns {Promise<void>}
   */
  async buildTargets(targets = this.config.targets) {
    debug.builder('Rendering targets…');

    for (const target of targets) {
      if (Array.isArray(target)) {
        await this.buildTargets(target);
      } else {
        let finalTarget = target;

        if (typeof target === 'function') {
          finalTarget = await target(this.context);

          if (Array.isArray(finalTarget)) {
            await this.buildTargets(finalTarget);
            continue;
          }
        }

        await this.buildTarget(finalTarget);
      }
    }

    debug.builder('Finished rendering targets');
  }

  /**
   * Runs all plugins synchronously.
   *
   * @async
   * @param {Plugin[]} plugins
   * @returns {Promise<Context>}
   */
  async runPlugins(plugins) {
    debug.builder('Running plugins…');

    for (const plugin of plugins) {
      await plugin(this.context);
    }

    debug.builder('Finished running plugins');
  }

  /**
   * Watches for changes.
   *
   * @async
   * @param {Function} fn
   */
  async watch(fn) {
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

    const watcher = fs.watch(this.config.watch.dir, {
      recursive: true,
    });

    for await (const _ of watcher) {
      debug.builder('Changes detected. Rebuilding…');
      debouncedHandler();
    }
  }

  /**
   * Builds the site.
   *
   * @async
   * @returns {Promise<void>}
   */
  async build() {
    const { plugins, watch } = this.config;

    const buildFn = async () => {
      debug.builder('Building…');

      const ctx = await this.runPlugins(plugins);
      Object.assign(this.context, ctx);
      await this.buildTargets();

      debug.builder('Build finished');
    }

    await buildFn();

    if (watch.enabled) {
      this.watch(buildFn);
    }
  }
}

export default Builder;
