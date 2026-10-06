import mongoose, { Schema, Document } from 'mongoose';

export interface ITeacherProfile extends Document {
  userId: mongoose.Types.ObjectId;
  employeeId: string;
  department: string;
  phone?: string;
}

const TeacherProfileSchema = new Schema<ITeacherProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    employeeId: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
  },
  { timestamps: true }
);

export const TeacherProfile = mongoose.model<ITeacherProfile>('TeacherProfile', TeacherProfileSchema);

