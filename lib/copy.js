import fs from 'fs';

export default (targets) => {
  return async function plugin(config, ctx) {
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
};