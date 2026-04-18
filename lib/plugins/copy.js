import fs from 'node:fs/promises';

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
    await fs.mkdir(target.to, {
      recursive: true,
    });

    // Then copy the contents
    await fs.cp(target.from, target.to, {
      recursive: true,
      force: true,
    });
  };
}

export default copyPlugin;
