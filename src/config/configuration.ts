export default () => ({
  // Application
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  appName: process.env.APP_NAME || 'Raahein',

  // Database - MySQL
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '3306', 10),
    username: process.env.DATABASE_USERNAME || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'raahein_db',
    url:
      process.env.DATABASE_URL ||
      'mysql://root:lKfUHljVJckBEFwyJwqBVceXXMQsxWpP@yamabiko.proxy.rlwy.net:30621/railway',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRATION || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '30d',
  },

  // Google Maps
  googleMaps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  },

  // AWS S3
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    bucketName: process.env.AWS_S3_BUCKET_NAME || 'raahein-uploads',
    region: process.env.AWS_REGION || 'us-east-1',
  },

  // CORS
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
  },

  // OTP
  otp: {
    expirationMinutes: parseInt(process.env.OTP_EXPIRATION_MINUTES || '10', 10),
    length: parseInt(process.env.OTP_LENGTH || '6', 10),
  },

  // Pagination
  pagination: {
    defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE || '10', 10),
    maxPageSize: parseInt(process.env.MAX_PAGE_SIZE || '100', 10),
  },

  // Logging
  logLevel: process.env.LOG_LEVEL || 'debug',

  // Admin
  admin: {
    phone: process.env.ADMIN_PHONE || '',
    password: process.env.ADMIN_PASSWORD || '',
  },
});
