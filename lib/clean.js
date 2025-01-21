import fs from 'fs';

function clean(dest) {
  return async () => {
    return new Promise((resolve, reject) => {
      fs.rm(dest, { recursive: true }, (err) => {
        if (err && err.code !== 'ENOENT') {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  };
}

export default clean;