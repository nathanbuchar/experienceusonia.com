import fs from 'fs';
import path from 'path';

/**
 * A plugin which recursively copies a file or directory to
 * another location.
 *
 * @example
 *
 * plugins: [
 *   copy({
 *     from: 'src/static',
 *     to: 'dist',
 *   }),
 * ]
 *
 * @param {Object} target
 * @param {string} target.from
 * @param {string} target.to
 * @returns {Plugin}
 */
function copyPlugin(target) {
  return async () => {
    // Ensure the destination directory exists first
    await new Promise((resolve, reject) => {
      fs.mkdir(target.to, { recursive: true }, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    // Then copy the contents
    await new Promise((resolve, reject) => {
      fs.cp(target.from, target.to, { recursive: true, force: true }, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`Copy: Copied "${target.from}" to "${target.to}"`);
          resolve();
        }
      });
    });
  };
}

export default copyPlugin;
