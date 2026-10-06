import mongoose from 'mongoose';
import { config } from '../config/index.js';
import { User } from '../models/User.js';
import { TeacherProfile } from '../models/TeacherProfile.js';
import { StudentProfile } from '../models/StudentProfile.js';
import { Classroom } from '../models/Classroom.js';
import { ClassroomMember } from '../models/ClassroomMember.js';
import { AttendanceSession } from '../models/AttendanceSession.js';
import { AttendanceRecord } from '../models/AttendanceRecord.js';

async function cleanDatabase() {
  console.log('[Clean] Connecting to MongoDB at', config.mongoUri);
  await mongoose.connect(config.mongoUri);

  console.log('[Clean] Removing all temporary teacher, student, and classroom demo records...');
  await User.deleteMany({});
  await TeacherProfile.deleteMany({});
  await StudentProfile.deleteMany({});
  await Classroom.deleteMany({});
  await ClassroomMember.deleteMany({});
  await AttendanceSession.deleteMany({});
  await AttendanceRecord.deleteMany({});

  console.log('✅ Database is now completely clean and empty.');
  console.log('You can now register your own Teacher and Student accounts from the Register page!');

  await mongoose.disconnect();
}

cleanDatabase().catch((err) => {
  console.error('[Clean Error]', err);
  process.exit(1);
});

