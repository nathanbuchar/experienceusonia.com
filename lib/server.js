import 'dotenv/config';

import express from 'express';

import debug from './debug.js';

const app = express();

app.use(express.static('dist', {
  dotfiles: 'allow',
}));

app.listen(3000, () => {
  debug.server('Listening on port 3000...');
});
