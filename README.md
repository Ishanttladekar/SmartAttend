# SmartAttend - Anti-Proxy Full-Stack Attendance Management System

**SmartAttend** is a production-grade, full-stack attendance management system engineered to eliminate proxy attendance in university and college environments. It enforces a strict **three-tier zero-trust verification pipeline**:

```
[Student Device] 
      │
      ├─► 1. Physical Presence (GPS Geofence + Backend Haversine + Accuracy Threshold <= 25m)
      ├─► 2. Hardware Possession (FIDO2/WebAuthn Platform Authenticator - Fingerprint / Windows Hello / Touch ID)
      ├─► 3. Biometric Verification (Live Face Vector Matching + Liveness Challenge vs 128-d Embedding)
      │
      ▼
[SmartAttend Backend] (Atomic validation, Server-side Nonce, Duplication Guard)
      │
      ▼
[Real-Time Socket.IO] ──► [Teacher Live Dashboard]
```

---

## 1. Complete Project Structure

```
d:/Attandance/
├── backend/
│   ├── src/
│   │   ├── config/              # Typed environment variables and MongoDB connection
│   │   │   ├── db.ts
│   │   │   └── index.ts
│   │   ├── controllers/         # Request handling & domain logic
│   │   │   ├── attendanceController.ts
│   │   │   ├── authController.ts
│   │   │   ├── biometricController.ts
│   │   │   ├── classroomController.ts
│   │   │   ├── reportController.ts
│   │   │   └── sessionController.ts
│   │   ├── middleware/          # Security, Auth (JWT), Role Guard, Validation
│   │   │   ├── auth.ts
│   │   │   ├── errorHandler.ts
│   │   │   ├── roleGuard.ts
│   │   │   └── validate.ts
│   │   ├── models/              # Mongoose database models & indexes
│   │   │   ├── AttendanceRecord.ts
│   │   │   ├── AttendanceSession.ts
│   │   │   ├── Classroom.ts
│   │   │   ├── ClassroomMember.ts
│   │   │   ├── StudentProfile.ts
│   │   │   ├── TeacherProfile.ts
│   │   │   └── User.ts
│   │   ├── routes/              # Express REST endpoints
│   │   │   ├── attendanceRoutes.ts
│   │   │   ├── authRoutes.ts
│   │   │   ├── biometricRoutes.ts
│   │   │   ├── classroomRoutes.ts
│   │   │   ├── reportRoutes.ts
│   │   │   └── sessionRoutes.ts
│   │   ├── scripts/             # Database seeding and E2E verification
│   │   │   ├── seed.ts
│   │   │   └── testE2E.ts
│   │   ├── services/            # Biometrics, WebAuthn, Geofencing, PDF generator
│   │   │   ├── attendanceStatsService.ts
│   │   │   ├── faceService.ts
│   │   │   ├── pdfService.ts
│   │   │   └── webAuthnService.ts
│   │   ├── socket/              # Socket.IO live monitor event manager
│   │   │   └── index.ts
│   │   ├── types/               # TypeScript shared interfaces
│   │   │   └── index.ts
│   │   ├── utils/               # Haversine distance, Nonce, JWT, ApiResponse
│   │   │   ├── apiResponse.ts
│   │   │   ├── geo.ts
│   │   │   ├── jwt.ts
│   │   │   └── nonce.ts
│   │   └── server.ts            # Entry point for HTTP server and Socket.IO
│   ├── .env                     # Backend configuration
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── api/                 # Axios HTTP client with JWT interceptor
│   │   │   └── client.ts
│   │   ├── components/
│   │   │   ├── biometrics/      # Camera face capture & WebAuthn controls
│   │   │   │   ├── FaceEnrollModal.tsx
│   │   │   │   ├── MarkAttendanceModal.tsx
│   │   │   │   └── WebAuthnEnrollButton.tsx
│   │   │   └── common/          # Reusable UI components
│   │   │       ├── Modal.tsx
│   │   │       ├── Navbar.tsx
│   │   │       ├── QRCodeModal.tsx
│   │   │       └── StatCard.tsx
│   │   ├── context/             # AuthContext and SocketContext
│   │   │   ├── AuthContext.tsx
│   │   │   └── SocketContext.tsx
│   │   ├── pages/
│   │   │   ├── auth/            # Sign in and registration with demo fast-fills
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   └── RegisterPage.tsx
│   │   │   ├── common/          # Landing showcase
│   │   │   │   └── LandingPage.tsx
│   │   │   ├── student/         # Student portal
│   │   │   │   ├── BiometricSettingsPage.tsx
│   │   │   │   ├── JoinClassroomPage.tsx
│   │   │   │   ├── StudentDashboard.tsx
│   │   │   │   └── StudentHistoryPage.tsx
│   │   │   └── teacher/         # Teacher portal
│   │   │       ├── ClassroomDetailPage.tsx
│   │   │       ├── LiveSessionPage.tsx
│   │   │       └── TeacherDashboard.tsx
│   │   ├── utils/               # Client-side face descriptor & geometric models
│   │   │   └── faceBiometrics.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx              # Router & Role Route Guards
│   │   ├── index.css            # Tailwind directives & animation rules
│   │   └── main.tsx             # Application bootstrap
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
└── README.md
```

---

## 2. Setup Instructions

### Prerequisites
- **Node.js**: v18.0.0 or higher (Tested on Node.js v26.3.0)
- **npm**: v9.0.0 or higher
- **MongoDB**: Community or Enterprise Server running on `localhost:27017`

### Clone & Navigate
```bash
cd d:\Attandance
```

---

## 3. Environment Variables List

Create or verify `backend/.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/smartattend
JWT_SECRET=smartattend_super_secret_jwt_key_2026_anti_proxy_secure_token!
JWT_EXPIRES_IN=7d
RP_NAME=SmartAttend
RP_ID=localhost
ORIGIN=http://localhost:5173
DEFAULT_ALLOWED_RADIUS_METERS=25
GPS_MAX_ACCURACY_THRESHOLD=35
```

---

## 4. Database Setup & Seeding

Ensure MongoDB service is running:
```powershell
Get-Service -Name *mongo*
```

Seed initial classrooms, teachers, students, and biometric fixtures:
```bash
cd d:\Attandance\backend
npm run seed
```

### Pre-configured Demo Accounts:
| Role | Email | Password | Additional Details |
| :--- | :--- | :--- | :--- |
| **Teacher** | `teacher@smartattend.edu` | `password123` | Dr. Alan Turing (CS Dept, FAC-CS-042) |
| **Student 1** | `rahul@student.edu` | `password123` | Rahul  (CS-2023-01, Face Enrolled) |
| **Student 2** | `priya@student.edu` | `password123` | Priya  (CS-2023-02) |
| **Student 3** | `aman@student.edu` | `password123` | Aman  (CS-2023-03) |

---

## 5. How to Run the Backend

```bash
cd d:\Attandance\backend
npm run dev
```
Backend will start on: **`http://localhost:5000`**

---

## 6. How to Run the Frontend

```bash
cd d:\Attandance\frontend
npm run dev
```
Frontend will be accessible at: **`http://localhost:5173`**

---

## 7. API Documentation

### Authentication (`/api/auth`)
- `POST /api/auth/register`: Create teacher or student user.
- `POST /api/auth/login`: Authenticate and receive JWT token.
- `GET /api/auth/me`: Fetch authenticated profile and biometric status.

### Classroom Management (`/api/classrooms`)
- `POST /api/classrooms`: Create classroom (Teacher only).
- `GET /api/classrooms/teacher`: List all teacher's classrooms with statistics.
- `GET /api/classrooms/student`: List student enrolled subjects with attendance percentage.
- `POST /api/classrooms/join`: Enroll student via 6-character code or link.
- `GET /api/classrooms/:id`: Get classroom details and roster.

### Attendance Sessions (`/api/sessions`)
- `POST /api/sessions/start`: Teacher activates session with live GPS coordinates and radius.
- `POST /api/sessions/:id/stop`: Ends session immediately, preventing further submissions.
- `GET /api/sessions/:id/status`: Real-time session metrics for the live dashboard.

### Anti-Proxy Attendance Marking (`/api/attendance`)
- `POST /api/attendance/mark`:
  - **Body**: `{ sessionId, sessionNonce, latitude, longitude, accuracy, faceDescriptor, webAuthnResponse }`
  - Validates active status, membership, nonce, GPS radius ($\le 25\text{m}$), GPS accuracy ($\le 35\text{m}$), and biometric match.
- `GET /api/attendance/history/student`: Fetch full attendance audit trail.

### Biometrics (`/api/biometrics`)
- `POST /api/biometrics/face/enroll`: Save 128-float face embedding vector.
- `DELETE /api/biometrics/face`: Remove face embedding (Right to Erasure).
- `GET /api/biometrics/passkey/register-options`: Generate FIDO2 registration challenge.
- `POST /api/biometrics/passkey/verify-registration`: Store WebAuthn credential public key.
- `GET /api/biometrics/passkey/auth-options`: Generate FIDO2 authentication challenge.
- `GET /api/biometrics/status`: Check student enrollment flags.

### Reports & Analytics (`/api/reports`)
- `GET /api/reports/pdf/:classroomId`: Generate and stream official PDF report.
- `GET /api/reports/classroom/:classroomId`: JSON analytics for classroom breakdown.
- `GET /api/reports/dashboard/teacher`: Teacher high-level overview metrics.
- `GET /api/reports/dashboard/student`: Student aggregate attendance statistics.

---

## 8. Automated Testing & Verification

Run the comprehensive 13-stage end-to-end anti-proxy test suite:
```bash
cd d:\Attandance\backend
npx tsx src/scripts/testE2E.ts
```

### Verified Anti-Proxy Test Matrix:
1. Teacher login authentication: **PASSED**
2. Classroom discovery: **PASSED**
3. Student login authentication: **PASSED**
4. Geofenced session activation: **PASSED**
5. **Anti-Proxy Check**: Student outside 25m radius ($150\text{m}$ away) -> **403 FORBIDDEN (Blocked)**
6. **Anti-Proxy Check**: Mocked / low GPS accuracy ($\pm 65\text{m}$) -> **422 UNPROCESSABLE (Blocked)**
7. **Anti-Proxy Check**: Face biometric vector mismatch -> **401 UNAUTHORIZED (Blocked)**
8. **Legitimate Check**: Physical presence ($4.7\text{m}$) + Face match -> **200 OK (Recorded)**
9. **Anti-Proxy Check**: Duplicate submission attempt -> **409 CONFLICT (Blocked)**
10. **Real-time Live Monitor**: Push event to teacher dashboard -> **VERIFIED**
11. Teacher stops attendance session -> **VERIFIED**
12. **Anti-Proxy Check**: Submission after session end -> **400 BAD REQUEST (Blocked)**
13. Official PDF Report Generation & download stream -> **VERIFIED**

---

## 9. Explanation of Facial Recognition Implementation

### Zero-Raw-Photo Architecture
Standard face recognition systems store unencrypted user photos, which violates biometric privacy regulations (GDPR Article 9, Illinois BIPA, FERPA). SmartAttend employs a privacy-first design:
1. **Camera Frame Extraction**: The student's device captures a live video frame using HTML5 Canvas.
2. **128-Dimensional Vectorization**: The system extracts a normalized 128-float biometric descriptor vector representing facial geometry ratios and spatial intensity invariants.
3. **Storage Minimization**: Only the 128-float mathematical vector is transmitted over HTTPS and stored in MongoDB. Raw photographs are never stored on the server.
4. **Euclidean Distance Comparison**:
   $$\text{distance} = \sqrt{\sum_{i=0}^{127} (A_i - B_i)^2}$$
   During attendance check-in, if the distance $d \le 0.50$, the system accepts the face with high confidence ($\ge 70\%$). If $d > 0.50$, attendance is rejected.

---

## 10. Explanation of Location Verification

### Server-Authoritative Haversine Calculation
Client-side GPS can be modified by malicious mobile mock-location apps. To protect against this:
1. **Teacher Coordinates Capture**: When the instructor clicks "Start Attendance", the server stores the teacher's current coordinates $(lat_1, lon_1)$.
2. **Student Submission**: The student's device sends $(lat_2, lon_2)$ along with reported GPS accuracy.
3. **Accuracy Guard**: If $accuracy > 35\text{ meters}$, the backend rejects the submission immediately (`HTTP 422`), preventing students from exploiting large uncertainty circles.
4. **Great-Circle Distance Calculation**:
   $$\Delta\phi = \frac{\pi}{180}(lat_2 - lat_1), \quad \Delta\lambda = \frac{\pi}{180}(lon_2 - lon_1)$$
   $$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)$$
   $$d = 2 R \cdot \arctan2(\sqrt{a}, \sqrt{1-a}) \quad \text{where } R = 6,371,000 \text{ m}$$
5. **Radius Enforcement**: Attendance is allowed only if $d \le 25\text{ meters}$.

---

## 11. Explanation of Biometric Authentication (WebAuthn / Passkeys)

### Why Browsers Cannot Access Raw Fingerprints
Web browsers intentionally prevent websites from reading raw fingerprint minutiae for security and user privacy. Any website claiming to capture raw fingerprints in a web browser is either insecure or fraudulent.

### The Production Alternative: FIDO2 / WebAuthn
SmartAttend implements `@simplewebauthn/server` and `@simplewebauthn/browser`:
1. When enrolling, the student triggers their device's platform authenticator (Windows Hello fingerprint, macOS Touch ID, or Android Biometric Unlock).
2. The device generates an asymmetric key pair inside its **Secure Enclave / TPM hardware**.
3. The public key is sent to SmartAttend; the private key never leaves the student's hardware.
4. During attendance, the server issues a random challenge. The student touches their fingerprint sensor, signing the challenge with their hardware key.
5. This cryptographically ties the attendance record to the student's physical device, preventing password sharing or proxy logins.

---

## 12. Security Limitations & Threat Boundaries

While SmartAttend significantly increases the difficulty of proxy attendance, no software system can make fraud mathematically impossible:
1. **Hardware-Level Sensor Virtualization**: If a student roots their operating system, they could theoretically mock GPS at the kernel driver level. (Mitigated by combining GPS with biometric facial verification).
2. **Coerced Credentials**: If Student B takes Student A's physical laptop or phone to class, WebAuthn will pass. (Mitigated by requiring facial verification).
3. **High-Rise Vertical Accuracy**: GPS provides poor vertical ($Z$-axis) altitude resolution inside multi-story concrete buildings. (Mitigated by configurable teacher geofence radius of 15m–50m).

---

## 13. Deployment Instructions

### Production Deployment Steps
1. **Build Frontend**:
   ```bash
   cd d:\Attandance\frontend
   npm run build
   ```
   Deploy static assets from `dist/` to Nginx, AWS S3/CloudFront, or Vercel.

2. **Build Backend**:
   ```bash
   cd d:\Attandance\backend
   npm run build
   ```
   Run the compiled server with PM2 or Docker:
   ```bash
   pm2 start dist/server.js --name smartattend-api -i max
   ```

3. **HTTPS / SSL Requirement**:
   Both the HTML5 Geolocation API and WebAuthn (Passkeys) strictly require **HTTPS** in production environments. Configure an SSL certificate (e.g. Let's Encrypt) on your reverse proxy.

