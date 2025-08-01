import fs from 'fs';
import path from 'path';

const cacheDir = '.cache';
const pathToCacheDir = path.join(process.cwd(), cacheDir);

function cachePlugin(opts = {}) {
  const { disabled = false, plugins = [] } = opts;

  return (ctx, builder) => {
    return new Promise(async (resolve) => {
      const now = Date.now()
      const msPerDay = 24 * 60 * 60 * 1000;
      const daysSinceEpoch = Math.floor(now / msPerDay);
      const pathToCacheFile = path.join(pathToCacheDir, `${daysSinceEpoch}.json`);
      const cacheFileExists = fs.existsSync(pathToCacheFile);

      if (!disabled && cacheFileExists) {
        console.log('Cache: Enabled');

        fs.readFile(pathToCacheFile, 'utf8', (err, data) => {
          if (err) throw err;

          try {
            const cachedCtx = JSON.parse(data);

            Object.assign(ctx, cachedCtx);

            console.log(`Cache: Loaded file "${pathToCacheFile}`);
            resolve();
          } catch (err) {
            throw new Error('Cache: Cache file malformed');
          }
        });
      } else {
        console.log('Cache: Disabled');

        const cachedCtx = await builder.runPlugins(plugins);
        const str = JSON.stringify(cachedCtx);

        fs.mkdir(pathToCacheDir, { recursive: true }, (err) => {
          if (err) throw err;

          fs.writeFile(pathToCacheFile, str, (err) => {
            if (err) throw err;

            Object.assign(ctx, cachedCtx);

            console.log(`Cache: Wrote file "${pathToCacheFile}"`);
            resolve();
          });
        });
      }
    });
  };
}

export default cachePlugin;
