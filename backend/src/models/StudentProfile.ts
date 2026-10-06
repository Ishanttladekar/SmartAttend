import mongoose, { Schema, Document } from 'mongoose';

export interface IWebAuthnCredential {
  credentialId: string;
  publicKey: string; // Base64URL-encoded public key
  counter: number;
  transports?: string[];
  deviceType?: string;
  createdAt: Date;
}

export interface IStudentProfile extends Document {
  userId: mongoose.Types.ObjectId;
  rollNumber: string;
  department: string;
  semester: number;
  faceDescriptor: number[] | null;
  faceEnrolledAt?: Date;
  webAuthnCredentials: IWebAuthnCredential[];
  currentWebAuthnChallenge?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WebAuthnCredentialSchema = new Schema<IWebAuthnCredential>(
  {
    credentialId: { type: String, required: true },
    publicKey: { type: String, required: true },
    counter: { type: Number, required: true, default: 0 },
    transports: [{ type: String }],
    deviceType: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const StudentProfileSchema = new Schema<IStudentProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    rollNumber: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    department: { type: String, required: true, trim: true },
    semester: { type: Number, required: true, min: 1, max: 12 },
    faceDescriptor: { type: [Number], default: null },
    faceEnrolledAt: { type: Date },
    webAuthnCredentials: [WebAuthnCredentialSchema],
    currentWebAuthnChallenge: { type: String },
  },
  { timestamps: true }
);

export const StudentProfile = mongoose.model<IStudentProfile>('StudentProfile', StudentProfileSchema);

