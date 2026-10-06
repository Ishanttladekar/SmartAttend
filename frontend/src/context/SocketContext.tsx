import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  joinSessionRoom: (sessionId: string) => void;
  leaveSessionRoom: (sessionId: string) => void;
  joinClassroomRoom: (classroomId: string) => void;
  leaveClassroomRoom: (classroomId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // In dev, connect to window.location.origin (which proxies /socket.io to backend :5000)
    const newSocket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    newSocket.on('connect', () => {
      console.log('[Socket.IO] Connected with socket ID:', newSocket.id);
    });

    newSocket.on('connect_error', (err) => {
      console.warn('[Socket.IO] Connection error:', err.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const joinSessionRoom = (sessionId: string) => {
    if (socket && sessionId) {
      socket.emit('join_session', sessionId);
    }
  };

  const leaveSessionRoom = (sessionId: string) => {
    if (socket && sessionId) {
      socket.emit('leave_session', sessionId);
    }
  };

  const joinClassroomRoom = (classroomId: string) => {
    if (socket && classroomId) {
      socket.emit('join_classroom', classroomId);
    }
  };

  const leaveClassroomRoom = (classroomId: string) => {
    if (socket && classroomId) {
      socket.emit('leave_classroom', classroomId);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        joinSessionRoom,
        leaveSessionRoom,
        joinClassroomRoom,
        leaveClassroomRoom,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

