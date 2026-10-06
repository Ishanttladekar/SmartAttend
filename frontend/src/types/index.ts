export type UserRole = 'teacher' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  profile?: {
    rollNumber?: string;
    employeeId?: string;
    department?: string;
    semester?: number;
    isFaceEnrolled?: boolean;
    isPasskeyEnrolled?: boolean;
    faceEnrolledAt?: string;
  };
}

export interface Classroom {
  _id: string;
  id?: string;
  subjectName: string;
  subjectCode: string;
  section: string;
  semester: number;
  academicYear: string;
  description?: string;
  joinCode: string;
  isActive: boolean;
  studentCount?: number;
  totalSessions?: number;
  hasActiveSession?: boolean;
  activeSessionId?: string | null;
  teacherId?: {
    _id: string;
    name: string;
    email: string;
  };
}

export interface StudentEnrolledClassroom {
  id: string;
  subjectName: string;
  subjectCode: string;
  section: string;
  semester: number;
  academicYear: string;
  teacherName: string;
  joinCode: string;
  joinedAt: string;
  hasActiveSession: boolean;
  activeSessionId: string | null;
  alreadyMarkedForActiveSession: boolean;
  stats: {
    totalSessions: number;
    attendedSessions: number;
    missedSessions: number;
    percentage: number;
    isLowAttendance: boolean;
  };
}

export interface AttendanceSession {
  id: string;
  _id?: string;
  code: string;
  sessionCode?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  allowedRadiusMeters: number;
  authorizedLocation: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
  };
  sessionNonce: string;
}

export interface AttendanceRecord {
  id: string;
  recordId?: string;
  studentId: string;
  name?: string;
  rollNumber?: string;
  subjectName?: string;
  subjectCode?: string;
  timestamp: string;
  distanceMeters: number;
  verificationMethods: {
    locationVerified: boolean;
    faceVerified: boolean;
    passkeyVerified: boolean;
  };
  status: string;
}

export interface StudentAttendanceSummary {
  studentId: string;
  name: string;
  email: string;
  rollNumber: string;
  totalClasses: number;
  attendedClasses: number;
  missedClasses: number;
  attendancePercentage: number;
  isLowAttendance: boolean;
}

export interface ClassroomStats {
  classroom: Classroom;
  totalSessions: number;
  students: StudentAttendanceSummary[];
  classAveragePercentage: number;
  lowAttendanceCount: number;
}

