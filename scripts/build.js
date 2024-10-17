import 'dotenv/config';

import fs from 'fs';
import path from 'path';

import config from '../config.js';
import client from '../lib/contentful.js';
import nunjucks from '../lib/nunjucks.js';

/**
 * Removes the dist directory.
 *
 * @returns {Promise<void>}
 */
function clean() {
  return new Promise((resolve, reject) => {
    fs.rm('dist', { recursive: true }, (err) => {
      if (err && err.code !== 'ENOENT') {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Copies the src/static directory to dist.
 *
 * @returns {Promise<void>}
 */
function copyStatic() {
  return new Promise((resolve, reject) => {
    fs.cp('src/static', 'dist', { recursive: true }, (err) => {
      if (err && err.code !== 'ENOENT') {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Writes a file.
 *
 * @param {string} pathToFile
 * @param {string} data
 * @returns {Promise<void>}
 */
function writeFile(pathToFile, data) {
  return new Promise((resolve, reject) => {
    const dirname = path.dirname(pathToFile);

    fs.mkdir(dirname, { recursive: true }, (err) => {
      if (err) return reject(err);

      fs.writeFile(pathToFile, data, (err) => {
        if (err) return reject(err);

        resolve();
      });
    });
  });
}

/**
 * Fetches entries from the Contentful CDN and returns them
 * as a key-value map.
 *
 * @returns {Promise<{string: Object[]}>}
 */
function getData() {
  return Promise.all([
    ...config.entries.map(({ key, contentType }) => {
      return (
        client
          .getEntries({ content_type: contentType })
          .then((data) => {
            return [key, data.items];
          })
      );
    })
  ]).then(Object.fromEntries);
}

/**
 * Renders a Nunjucks template.
 *
 * @param {string} template
 * @param {Object} ctx
 * @returns {Promise<string>}
 */
function renderTemplate(template, ctx) {
  return new Promise((resolve, reject) => {
    nunjucks.render(template, ctx, (err, res) => {
      if (err) return reject(err);

      resolve(res);
    });
  });
}

/**
 * Renders a target.
 *
 * @param {Object} target
 * @param {Object} ctx
 * @returns {Promise<void>}
 */
function renderTarget(target, ctx) {
  const template = path.normalize(target.template);
  const dest = path.normalize(target.dest);

  return (
    renderTemplate(template, ctx)
      .then((res) => writeFile(dest, res))
      .then(() => {
        console.log(`Wrote file "${dest}"`);
      })
  );
}

/**
 * Builds a target.
 *
 * @param {Object} target
 * @param {Object} data
 * @returns {Promise<void>}
 */
function buildTarget(target, data) {
  const ctx = {};

  // Insert included data.
  if (target.include) {
    target.include.forEach((key) => {
      ctx[key] = data[key];
    });
  }

  // Insert extra context.
  if (target.extraContext) {
    Object.assign(ctx, target.extraContext);
  }

  return renderTarget(target, ctx);
}

/**
 * Builds all targets recursively.
 *
 * @param {Object[]} targets
 * @param {Object} data
 * @returns {Promise<void>}
 */
function buildTargets(targets, data) {
  return Promise.all([
    ...targets.map((target) => {
      if (target.entries) {
        return data[target.entries].map((entry, ...rest) => {
          const newTarget = target.handler(entry, ...rest);
          const newTargetArr = Array.isArray(newTarget) ? newTarget : [newTarget];

          return buildTargets(newTargetArr, data);
        });
      } else {
        return buildTarget(target, data);
      }
    })
  ]);
}

/**
 * Builds the static site.
 *
 * @returns {Promise<void>}
 */
function build() {
  return (
    clean()
      .then(() => copyStatic())
      .then(() => getData())
      .then((data) => buildTargets(config.targets, data))
  );
}

build();
