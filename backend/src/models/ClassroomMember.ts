import mongoose, { Schema, Document } from 'mongoose';

export interface IClassroomMember extends Document {
  classroomId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  joinedAt: Date;
}

const ClassroomMemberSchema = new Schema<IClassroomMember>(
  {
    classroomId: { type: Schema.Types.ObjectId, ref: 'Classroom', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ClassroomMemberSchema.index({ classroomId: 1, studentId: 1 }, { unique: true });

export const ClassroomMember = mongoose.model<IClassroomMember>('ClassroomMember', ClassroomMemberSchema);

