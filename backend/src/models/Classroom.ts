import mongoose, { Schema, Document } from 'mongoose';

export interface IClassroom extends Document {
  teacherId: mongoose.Types.ObjectId;
  subjectName: string;
  subjectCode: string;
  section: string;
  semester: number;
  academicYear: string;
  description?: string;
  joinCode: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ClassroomSchema = new Schema<IClassroom>(
  {
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subjectName: { type: String, required: true, trim: true },
    subjectCode: { type: String, required: true, uppercase: true, trim: true, index: true },
    section: { type: String, required: true, trim: true },
    semester: { type: Number, required: true, min: 1, max: 12 },
    academicYear: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    joinCode: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Classroom = mongoose.model<IClassroom>('Classroom', ClassroomSchema);

