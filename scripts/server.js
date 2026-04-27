import 'dotenv/config';

import createDebug from 'debug';
import express from 'express';

const debug = createDebug('lib:server');

const server = () => {
  const app = express();

  // Express plugins.
  app.use(express.static('dist', {
    dotfiles: 'allow',
  }));

  // Start the Express server.
  app.listen(3000, () => {
    debug('Listening on port 3000...');
  });
};

server();
