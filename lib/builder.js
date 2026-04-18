import fs from 'node:fs/promises';
import path from 'node:path';

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
   * @prop {Object} [extraContext]
   */

  /**
   * @typedef {Function} TargetFn
   * @param {Context} ctx
   * @returns {(Target | TargetFn)[]}
   */

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
   * Renders a target and writes the output to the
   * specified file path.
   *
   * @async
   * @param {Target} target
   * @param {Object} context
   * @returns {Promise<void>}
   */
  async renderTarget(target, context) {
    const { render } = this.config;
    const { dest, template } = target;

    const result = await render(template, context);
    const normalizedFilePath = path.normalize(dest);
    const dirname = path.dirname(normalizedFilePath);

    await fs.mkdir(dirname, { recursive: true });
    await fs.writeFile(normalizedFilePath, result);

    debug.builder(`Wrote target "${normalizedFilePath}"`);
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

    await this.renderTarget(target, ownContext);
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
   * @returns {Promise<void>}
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

    const watcher = fs.watch(this.config.watch.dir, {
      recursive: true,
    });

    for await (const _ of watcher) {
      debug.builder('Changes detected. Rebuilding…');
      debouncedBuild();
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

      await this.runPlugins(plugins);
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
