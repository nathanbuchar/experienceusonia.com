import fs from 'fs';
import createDebug from 'debug';

const debug = createDebug('lib:plugins:watch');

/**
 * Watches a directory for changes.
 *
 * @param {Object} opts
 * @param {string} opts.dir
 * @param {boolean} [opts.enabled]
 * @param {Function} opts.handler
 * @returns {Plugin}
 * @example
 * plugins: [
 *   watch({
 *     dir: 'src',
 *     run() {
 *       return builder.rebuild();
 *     },
 *   }),
 * ]
 */
function watchPlugin(opts) {
  let watcher = null;
  let running = false;
  let queued = false;

  const handleChange = async (_event) => {
    if (running) {
      queued = true;
      return;
    }

    running = true;
    queued = false;

    try {
      await opts.handler();
    } finally {
      running = false;
      if (queued) {
        handleChange();
      }
    }
  };

  return {
    async afterBuild() {
      if (watcher) return;
      if (opts.enabled === false) return;

      debug('Watching for changes…');

      watcher = fs.watch(opts.dir, { recursive: true });

      watcher.on('change', (event) => {
        debug('Changes detected. Running change handler…');
        handleChange(event);
      });

      process.on('SIGINT', () => {
        if (watcher) {
          watcher.close();
        }
        process.exit();
      });

      // Keep watching indefinitely.
      await new Promise(() => { });
    },
  };
}

export default watchPlugin;
