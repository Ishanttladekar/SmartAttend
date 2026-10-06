import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { config } from '../config/index.js';

let io: SocketIOServer | null = null;

export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*', // Allow frontend development port and production
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    // Join session room (teacher and students)
    socket.on('join_session', (sessionId: string) => {
      if (sessionId) {
        socket.join(`session:${sessionId}`);
      }
    });

    socket.on('leave_session', (sessionId: string) => {
      if (sessionId) {
        socket.leave(`session:${sessionId}`);
      }
    });

    // Join classroom room (for session announcements)
    socket.on('join_classroom', (classroomId: string) => {
      if (classroomId) {
        socket.join(`classroom:${classroomId}`);
      }
    });

    socket.on('leave_classroom', (classroomId: string) => {
      if (classroomId) {
        socket.leave(`classroom:${classroomId}`);
      }
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
}

export function emitAttendanceMarked(sessionId: string, recordData: any): void {
  if (io) {
    io.to(`session:${sessionId}`).emit('attendance_marked', recordData);
  }
}

export function emitSessionStarted(classroomId: string, sessionData: any): void {
  if (io) {
    io.to(`classroom:${classroomId}`).emit('session_started', sessionData);
  }
}

export function emitSessionEnded(sessionId: string, classroomId: string): void {
  if (io) {
    io.to(`session:${sessionId}`).emit('session_ended', { sessionId });
    io.to(`classroom:${classroomId}`).emit('session_ended', { sessionId });
  }
}

