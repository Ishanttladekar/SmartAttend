import http from 'http';
import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { connectDB } from './config/db.js';
import { initSocketIO } from './socket/index.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import classroomRoutes from './routes/classroomRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import biometricRoutes from './routes/biometricRoutes.js';
import reportRoutes from './routes/reportRoutes.js';

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initSocketIO(server);

// Middleware
app.use(
  cors({
    origin: '*', // Allow development origins and network IP
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'SmartAttend API',
    version: '1.0.0',
    geofenceRadiusDefault: config.defaultAllowedRadiusMeters,
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/biometrics', biometricRoutes);
app.use('/api/reports', reportRoutes);

// 404 Handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Centralized Error Handler
app.use(errorHandler);

// Start Server
async function startServer() {
  await connectDB();

  server.listen(config.port, () => {
    console.log(`===============================================`);
    console.log(`🚀 SmartAttend Backend running on port ${config.port}`);
    console.log(`📡 Environment: ${config.nodeEnv}`);
    console.log(`📍 Geofence Radius: ${config.defaultAllowedRadiusMeters} meters`);
    console.log(`===============================================`);
  });
}

startServer();

