import fs from 'fs';

export default (dest) => {
  return async function plugin(config, ctx) {
    return new Promise((resolve, reject) => {
      fs.rm(dest, { recursive: true }, (err) => {
        if (err && err.code !== 'ENOENT') {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
};