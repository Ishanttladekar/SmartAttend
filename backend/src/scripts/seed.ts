import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config/index.js';
import { User } from '../models/User.js';
import { TeacherProfile } from '../models/TeacherProfile.js';
import { StudentProfile } from '../models/StudentProfile.js';
import { Classroom } from '../models/Classroom.js';
import { ClassroomMember } from '../models/ClassroomMember.js';
import { AttendanceSession } from '../models/AttendanceSession.js';
import { AttendanceRecord } from '../models/AttendanceRecord.js';
import { generateNonce } from '../utils/nonce.js';

async function seedDatabase() {
  console.log('[Seed] Connecting to MongoDB at', config.mongoUri);
  await mongoose.connect(config.mongoUri);

  console.log('[Seed] Clearing existing collections...');
  await User.deleteMany({});
  await TeacherProfile.deleteMany({});
  await StudentProfile.deleteMany({});
  await Classroom.deleteMany({});
  await ClassroomMember.deleteMany({});
  await AttendanceSession.deleteMany({});
  await AttendanceRecord.deleteMany({});

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create Teacher
  console.log('[Seed] Creating demo teacher...');
  const teacherUser = await User.create({
    name: 'Dr. Alan Turing',
    email: 'teacher@smartattend.edu',
    passwordHash,
    role: 'teacher',
  });

  await TeacherProfile.create({
    userId: teacherUser._id,
    employeeId: 'FAC-CS-042',
    department: 'Computer Science & Engineering',
    phone: '+1 555 019 2834',
  });

  // 2. Create Students
  console.log('[Seed] Creating demo students...');
  const studentData = [
    { name: 'Rahul Sharma', email: 'rahul@student.edu', roll: 'CS-2023-01' },
    { name: 'Priya Patel', email: 'priya@student.edu', roll: 'CS-2023-02' },
    { name: 'Aman Verma', email: 'aman@student.edu', roll: 'CS-2023-03' },
    { name: 'Sneha Reddy', email: 'sneha@student.edu', roll: 'CS-2023-04' },
    { name: 'Vikram Singh', email: 'vikram@student.edu', roll: 'CS-2023-05' },
  ];

  const studentUsers = [];
  for (const s of studentData) {
    const user = await User.create({
      name: s.name,
      email: s.email,
      passwordHash,
      role: 'student',
    });

    // Provide a sample normalized 128-float face embedding vector for testing biometric match
    // Deterministic embedding vector for Rahul
    const sampleDescriptor = Array.from({ length: 128 }, (_, i) => Math.sin(i + 1) * 0.1);

    await StudentProfile.create({
      userId: user._id,
      rollNumber: s.roll,
      department: 'Computer Science & Engineering',
      semester: 5,
      faceDescriptor: s.email === 'rahul@student.edu' ? sampleDescriptor : null,
      faceEnrolledAt: s.email === 'rahul@student.edu' ? new Date() : undefined,
    });

    studentUsers.push(user);
  }

  // 3. Create Classrooms
  console.log('[Seed] Creating demo classrooms...');
  const classroom1 = await Classroom.create({
    teacherId: teacherUser._id,
    subjectName: 'Data Structures & Algorithms',
    subjectCode: 'CS301',
    section: 'Section A',
    semester: 5,
    academicYear: '2025-2026',
    description: 'Comprehensive study of arrays, trees, graphs, and dynamic programming.',
    joinCode: 'DSA2026',
    isActive: true,
  });

  const classroom2 = await Classroom.create({
    teacherId: teacherUser._id,
    subjectName: 'Database Management Systems',
    subjectCode: 'CS302',
    section: 'Section B',
    semester: 5,
    academicYear: '2025-2026',
    description: 'Relational algebra, SQL, indexing, and ACID transactions.',
    joinCode: 'DBMS26',
    isActive: true,
  });

  // 4. Enroll Students
  console.log('[Seed] Enrolling students in classrooms...');
  for (const stu of studentUsers) {
    await ClassroomMember.create({
      classroomId: classroom1._id,
      studentId: stu._id,
    });
    await ClassroomMember.create({
      classroomId: classroom2._id,
      studentId: stu._id,
    });
  }

  // 5. Create Past Completed Sessions and Records for Classroom 1
  console.log('[Seed] Creating past attendance sessions...');
  // Baseline location (e.g., Campus Hall: 12.9716 N, 77.5946 E)
  const baseLat = 12.9716;
  const baseLng = 77.5946;

  // Session 1 (Completed 3 days ago)
  const pastSession1 = await AttendanceSession.create({
    classroomId: classroom1._id,
    teacherId: teacherUser._id,
    sessionCode: 'SES-001001',
    startTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    endTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
    status: 'COMPLETED',
    authorizedLocation: {
      latitude: baseLat,
      longitude: baseLng,
      accuracy: 8,
      address: 'Academic Block 3, Hall 204',
    },
    allowedRadiusMeters: 25,
    sessionNonce: generateNonce(24),
  });

  // Students who attended session 1: Rahul, Priya, Aman, Sneha (Vikram absent)
  for (let i = 0; i < 4; i++) {
    await AttendanceRecord.create({
      sessionId: pastSession1._id,
      classroomId: classroom1._id,
      studentId: studentUsers[i]._id,
      timestamp: new Date(pastSession1.startTime.getTime() + (i + 1) * 60000),
      studentLocation: {
        latitude: baseLat + 0.00005 * (i % 2 === 0 ? 1 : -1),
        longitude: baseLng + 0.00005 * (i % 3 === 0 ? 1 : -1),
        accuracy: 9,
        distanceMeters: 8 + i * 2.5,
      },
      verificationMethods: {
        locationVerified: true,
        faceVerified: true,
        passkeyVerified: false,
      },
      status: 'PRESENT',
    });
  }

  // Session 2 (Completed yesterday)
  const pastSession2 = await AttendanceSession.create({
    classroomId: classroom1._id,
    teacherId: teacherUser._id,
    sessionCode: 'SES-001002',
    startTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    endTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 50 * 60 * 1000),
    status: 'COMPLETED',
    authorizedLocation: {
      latitude: baseLat,
      longitude: baseLng,
      accuracy: 7,
      address: 'Academic Block 3, Hall 204',
    },
    allowedRadiusMeters: 25,
    sessionNonce: generateNonce(24),
  });

  // Students who attended session 2: Rahul, Priya, Vikram (Aman and Sneha absent)
  for (const idx of [0, 1, 4]) {
    await AttendanceRecord.create({
      sessionId: pastSession2._id,
      classroomId: classroom1._id,
      studentId: studentUsers[idx]._id,
      timestamp: new Date(pastSession2.startTime.getTime() + (idx + 1) * 75000),
      studentLocation: {
        latitude: baseLat + 0.00003,
        longitude: baseLng - 0.00002,
        accuracy: 11,
        distanceMeters: 6.2,
      },
      verificationMethods: {
        locationVerified: true,
        faceVerified: true,
        passkeyVerified: false,
      },
      status: 'PRESENT',
    });
  }

  console.log('---------------------------------------------------------');
  console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
  console.log('---------------------------------------------------------');
  console.log('TEACHER CREDENTIALS:');
  console.log('  Email:    teacher@smartattend.edu');
  console.log('  Password: password123');
  console.log('STUDENT CREDENTIALS:');
  console.log('  Email:    rahul@student.edu (Biometric Face Registered)');
  console.log('  Password: password123');
  console.log('  Email:    priya@student.edu');
  console.log('  Password: password123');
  console.log('SAMPLE CLASSROOMS:');
  console.log('  1. CS301 - Data Structures (Join Code: DSA2026)');
  console.log('  2. CS302 - Database Systems (Join Code: DBMS26)');
  console.log('---------------------------------------------------------');

  await mongoose.disconnect();
}

seedDatabase().catch((err) => {
  console.error('[Seed Error]', err);
  process.exit(1);
});

