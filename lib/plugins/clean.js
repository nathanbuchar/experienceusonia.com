import fs from 'node:fs/promises';

/**
 * A plugin which recursively deletes the given directory.
 *
 * @example
 *
 * plugins: [
 *   clean('dist'),
 * ]
 *
 * @param {string} dest
 * @returns {Plugin}
 */
function cleanPlugin(dest) {
  return async () => {
    await fs.rm(dest, {
      recursive: true,
      force: true,
    });
  };
}

export default cleanPlugin;
