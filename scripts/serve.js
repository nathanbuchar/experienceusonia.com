#!/usr/bin/env node

import 'dotenv/config';

import express from 'express';

import { dist } from '#lib/utils/paths.js';
import { siteDebug } from '#lib/utils/debug.js';

const debug = siteDebug.extend('server');

const serve = (port = 3000) => {
  const app = express();

  // Express middleware.
  app.use(express.static(dist(), {
    dotfiles: 'allow',
  }));

  // Start the Express server.
  app.listen(port, () => {
    debug('Listening on port %d...', port);
  });

  return app;
};

serve();
