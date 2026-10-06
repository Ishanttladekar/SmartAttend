import mongoose from 'mongoose';
import { Classroom } from '../models/Classroom.js';
import { ClassroomMember } from '../models/ClassroomMember.js';
import { AttendanceSession } from '../models/AttendanceSession.js';
import { AttendanceRecord } from '../models/AttendanceRecord.js';
import { User } from '../models/User.js';
import { StudentProfile } from '../models/StudentProfile.js';

export interface StudentAttendanceSummary {
  studentId: string;
  name: string;
  email: string;
  rollNumber: string;
  totalClasses: number;
  attendedClasses: number;
  missedClasses: number;
  attendancePercentage: number;
  isLowAttendance: boolean; // < 75%
}

export class AttendanceStatsService {
  /**
   * Calculates comprehensive attendance statistics for all students in a classroom
   */
  static async getClassroomAttendanceSummary(classroomId: string): Promise<{
    classroom: any;
    totalSessions: number;
    students: StudentAttendanceSummary[];
    classAveragePercentage: number;
    lowAttendanceCount: number;
  }> {
    const classroom = await Classroom.findById(classroomId).populate('teacherId', 'name email');
    if (!classroom) {
      throw new Error('Classroom not found');
    }

    // Total non-cancelled sessions
    const totalSessions = await AttendanceSession.countDocuments({
      classroomId: new mongoose.Types.ObjectId(classroomId),
      status: { $in: ['ACTIVE', 'COMPLETED'] },
    });

    // Enrolled students
    const memberships = await ClassroomMember.find({
      classroomId: new mongoose.Types.ObjectId(classroomId),
    }).populate('studentId', 'name email');

    // Get all attendance records for this classroom
    const records = await AttendanceRecord.find({
      classroomId: new mongoose.Types.ObjectId(classroomId),
    });

    // Student profile map for roll numbers
    const studentUserIds = memberships.map((m) => m.studentId._id);
    const profiles = await StudentProfile.find({ userId: { $in: studentUserIds } });
    const profileMap = new Map<string, any>();
    profiles.forEach((p) => profileMap.set(p.userId.toString(), p));

    // Record count map
    const studentRecordCount = new Map<string, number>();
    records.forEach((r) => {
      const sId = r.studentId.toString();
      studentRecordCount.set(sId, (studentRecordCount.get(sId) || 0) + 1);
    });

    const students: StudentAttendanceSummary[] = memberships.map((m) => {
      const studentUser = m.studentId as any;
      const sId = studentUser._id.toString();
      const profile = profileMap.get(sId);
      const attended = studentRecordCount.get(sId) || 0;
      const missed = Math.max(0, totalSessions - attended);
      const percentage =
        totalSessions === 0 ? 100 : Math.round((attended / totalSessions) * 1000) / 10;

      return {
        studentId: sId,
        name: studentUser.name || 'Unknown',
        email: studentUser.email,
        rollNumber: profile?.rollNumber || 'N/A',
        totalClasses: totalSessions,
        attendedClasses: attended,
        missedClasses: missed,
        attendancePercentage: percentage,
        isLowAttendance: totalSessions > 0 && percentage < 75,
      };
    });

    // Sort students by roll number
    students.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true }));

    const sumPercentages = students.reduce((sum, s) => sum + s.attendancePercentage, 0);
    const classAveragePercentage =
      students.length > 0 ? Math.round((sumPercentages / students.length) * 10) / 10 : 0;
    const lowAttendanceCount = students.filter((s) => s.isLowAttendance).length;

    return {
      classroom,
      totalSessions,
      students,
      classAveragePercentage,
      lowAttendanceCount,
    };
  }

  /**
   * Calculates student's attendance summary across all their enrolled classrooms
   */
  static async getStudentOverallSummary(studentId: string) {
    const memberships = await ClassroomMember.find({
      studentId: new mongoose.Types.ObjectId(studentId),
    }).populate('classroomId');

    const subjectsSummary = [];

    for (const membership of memberships) {
      const classroom = membership.classroomId as any;
      if (!classroom) continue;

      const totalSessions = await AttendanceSession.countDocuments({
        classroomId: classroom._id,
        status: { $in: ['ACTIVE', 'COMPLETED'] },
      });

      const attended = await AttendanceRecord.countDocuments({
        classroomId: classroom._id,
        studentId: new mongoose.Types.ObjectId(studentId),
      });

      const missed = Math.max(0, totalSessions - attended);
      const percentage =
        totalSessions === 0 ? 100 : Math.round((attended / totalSessions) * 1000) / 10;

      subjectsSummary.push({
        classroomId: classroom._id,
        subjectName: classroom.subjectName,
        subjectCode: classroom.subjectCode,
        section: classroom.section,
        semester: classroom.semester,
        academicYear: classroom.academicYear,
        totalClasses: totalSessions,
        attendedClasses: attended,
        missedClasses: missed,
        attendancePercentage: percentage,
        isLowAttendance: totalSessions > 0 && percentage < 75,
      });
    }

    const totalConducted = subjectsSummary.reduce((acc, s) => acc + s.totalClasses, 0);
    const totalAttended = subjectsSummary.reduce((acc, s) => acc + s.attendedClasses, 0);
    const overallPercentage =
      totalConducted === 0 ? 100 : Math.round((totalAttended / totalConducted) * 1000) / 10;

    return {
      subjects: subjectsSummary,
      totalClasses: totalConducted,
      totalAttended,
      totalMissed: Math.max(0, totalConducted - totalAttended),
      overallPercentage,
    };
  }
}

