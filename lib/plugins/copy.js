import fs from 'fs';

function copyPlugin(targets) {
  return async (config, ctx) => {
    for (const target of targets) {
      await new Promise((resolve, reject) => {
        fs.cp(target.from, target.to, { recursive: true }, (err) => {
          if (err && err.code !== 'ENOENT') {
            reject(err);
          } else {
            console.log(`Copied "${target.from}" to "${target.to}"`);
            resolve();
          }
        });
      });
    }
  };
}

export default copyPlugin;
