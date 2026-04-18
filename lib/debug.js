import createDebug from 'debug';

const debug = {
  builder: createDebug('lib:builder'),
  server: createDebug('lib:server'),
};

export default debug;
