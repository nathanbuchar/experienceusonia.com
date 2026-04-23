import 'dotenv/config';

import createDebug from 'debug';
import express from 'express';

const debug = createDebug('lib:server');

const app = express();

app.use(express.static('dist', {
  dotfiles: 'allow',
}));

app.listen(3000, () => {
  debug('Listening on port 3000...');
});
