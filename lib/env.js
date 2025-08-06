export const nodeEnv = process.env.NODE_ENV;

export default {
  nodeEnv,
  isDevelopment: nodeEnv === 'development',
  isProduction: nodeEnv === 'production',
};
