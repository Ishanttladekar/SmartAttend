import mongoose from 'mongoose';
import { config } from './index.js';

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(config.mongoUri);
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error('[MongoDB] Connection error:', error);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB] Disconnected. Reconnecting...');
  });
};

