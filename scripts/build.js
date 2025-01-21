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
 * @param {Object} context
 * @returns Promise<string>
 */

/**
 * @function Plugin
 * @param {Config} config
 * @param {Object} ctx
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
 * @param {Object} ctx
 * @returns {(Target | TargetFn)[]}
 */

/**
 * Writes a file.
 *
 * @async
 * @param {string} pathToFile
 * @param {string} data
 * @returns {Promise<void>}
 */
async function writeFile(pathToFile, data) {
  await new Promise((resolve, reject) => {
    const dirname = path.dirname(pathToFile);

    fs.mkdir(dirname, { recursive: true }, (err) => {
      if (err) {
        reject(err);
      } else {
        fs.writeFile(pathToFile, data, (err) => {
          if (err) {
            reject(err);
          } else {
            console.log(`Wrote file "${pathToFile}"`);
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
 * @param {Config} config
 * @param {Target} target
 * @param {Object} ctx
 * @returns {Promise<void>}
 */
async function renderTarget(config, target, ctx) {
  const template = path.normalize(target.template);
  const dest = path.normalize(target.dest);
  
  const res = await config.engine.render(template, ctx);

  await writeFile(dest, res);
}

/**
 * Builds a target.
 *
 * @async
 * @param {Config} config
 * @param {Object} ctx
 * @param {Target} target
 * @returns {Promise<void>}
 */
async function buildTarget(config, ctx, target) {
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

  await renderTarget(config, target, ownCtx);
}

/**
 * Builds all targets recursively.
 *
 * @async
 * @param {Config} config
 * @param {Object} ctx
 * @param {(Target | TargetFn)[]} targets
 * @returns {Promise<void>}
 */
async function buildTargets(config, ctx, targets) {
  for (const target of targets) {
    if (typeof target === 'function') {
      const newTarget = await target(ctx);
      const newTargetArr = Array.isArray(newTarget) ? newTarget : [newTarget];

      await buildTargets(config, ctx, newTargetArr);
    } else if (Array.isArray(target)) {
      return buildTargets(config, ctx, target);
    } else {
      await buildTarget(config, ctx, target);
    }
  }
}

/**
 * Runs all plugins synchronously.
 * 
 * @param {Config} config
 * @param {Object} ctx
 * @returns {Promise<void>}
 */
async function runPlugins(config, ctx) {
  for (const plugin of config.plugins) {
    await plugin(config, ctx);
  }
}

/**
 * Reads the config file from the directory in which npm
 * was invoked.
 * 
 * @async
 * @returns {Promise<Config>}
 */
async function getConfig() {
  const npmDir = process.cwd();
  const pathToConfig = path.resolve(npmDir, 'config.js');

  try {
    const mod = await import(pathToConfig);

    return {
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
async function build() {
  const ctx = {};

  const config = await getConfig();

  await runPlugins(config, ctx);
  await buildTargets(config, ctx, config.targets);
}

build();
