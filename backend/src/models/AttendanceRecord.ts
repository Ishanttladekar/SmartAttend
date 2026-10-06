import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendanceRecord extends Document {
  sessionId: mongoose.Types.ObjectId;
  classroomId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  timestamp: Date;
  studentLocation: {
    latitude: number;
    longitude: number;
    accuracy: number;
    distanceMeters: number;
  };
  verificationMethods: {
    locationVerified: boolean;
    faceVerified: boolean;
    passkeyVerified: boolean;
  };
  status: 'PRESENT';
  createdAt: Date;
}

const AttendanceRecordSchema = new Schema<IAttendanceRecord>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'AttendanceSession', required: true, index: true },
    classroomId: { type: Schema.Types.ObjectId, ref: 'Classroom', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    timestamp: { type: Date, default: Date.now },
    studentLocation: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      accuracy: { type: Number, required: true },
      distanceMeters: { type: Number, required: true },
    },
    verificationMethods: {
      locationVerified: { type: Boolean, default: true },
      faceVerified: { type: Boolean, default: false },
      passkeyVerified: { type: Boolean, default: false },
    },
    status: { type: String, enum: ['PRESENT'], default: 'PRESENT' },
  },
  { timestamps: true }
);

AttendanceRecordSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });

export const AttendanceRecord = mongoose.model<IAttendanceRecord>(
  'AttendanceRecord',
  AttendanceRecordSchema
);

