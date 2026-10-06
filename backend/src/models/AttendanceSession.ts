import mongoose, { Schema, Document } from 'mongoose';
import { SessionStatus } from '../types/index.js';

export interface IAttendanceSession extends Document {
  classroomId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  sessionCode: string;
  startTime: Date;
  endTime?: Date;
  status: SessionStatus;
  authorizedLocation: {
    latitude: number;
    longitude: number;
    accuracy: number;
    address?: string;
  };
  allowedRadiusMeters: number;
  sessionNonce: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSessionSchema = new Schema<IAttendanceSession>(
  {
    classroomId: { type: Schema.Types.ObjectId, ref: 'Classroom', required: true, index: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sessionCode: { type: String, required: true, index: true },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'],
      default: 'ACTIVE',
      index: true,
    },
    authorizedLocation: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      accuracy: { type: Number, default: 10 },
      address: { type: String, default: '' },
    },
    allowedRadiusMeters: { type: Number, default: 25 },
    sessionNonce: { type: String, required: true },
  },
  { timestamps: true }
);

export const AttendanceSession = mongoose.model<IAttendanceSession>(
  'AttendanceSession',
  AttendanceSessionSchema
);

