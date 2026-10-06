import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartattend',
  jwtSecret: process.env.JWT_SECRET || 'smartattend_jwt_secret_fallback_key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  rpName: process.env.RP_NAME || 'SmartAttend',
  rpId: process.env.RP_ID || 'localhost',
  origin: process.env.ORIGIN || 'http://localhost:5173',
  defaultAllowedRadiusMeters: parseInt(process.env.DEFAULT_ALLOWED_RADIUS_METERS || '25', 10),
  gpsMaxAccuracyThreshold: parseInt(process.env.GPS_MAX_ACCURACY_THRESHOLD || '35', 10),
};

