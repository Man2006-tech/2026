// src/config/configuration.ts
export default () => ({
  // Application
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  appName: process.env.APP_NAME || 'Raahein',
});