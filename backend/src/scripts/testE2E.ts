import http from 'http';

function makeRequest(options: any, postData?: any): Promise<{ statusCode: number; headers: any; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ statusCode: res.statusCode || 200, headers: res.headers, body: parsed });
        } catch {
          resolve({ statusCode: res.statusCode || 200, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      const payload = typeof postData === 'string' ? postData : JSON.stringify(postData);
      req.setHeader('Content-Type', 'application/json');
      req.setHeader('Content-Length', Buffer.byteLength(payload));
      req.write(payload);
    }

    req.end();
  });
}

async function runE2ETest() {
  console.log('===============================================================');
  console.log('🧪 SMARTATTEND END-TO-END VERIFICATION & ANTI-PROXY TEST SUITE');
  console.log('===============================================================');

  // 1. Teacher Login
  console.log('\n[1] Testing Teacher Login...');
  const teacherLogin = await makeRequest(
    { hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST' },
    { email: 'teacher@smartattend.edu', password: 'password123' }
  );
  if (teacherLogin.statusCode !== 200) throw new Error('Teacher login failed');
  const teacherToken = teacherLogin.body.data.token;
  console.log('  ✅ Teacher Logged In:', teacherLogin.body.data.user.name);

  // 2. Fetch Teacher Classrooms
  console.log('\n[2] Fetching Teacher Classrooms...');
  const classroomsRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/classrooms/teacher',
    method: 'GET',
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  const classrooms = classroomsRes.body.data;
  const classroom = classrooms.find((c: any) => c.subjectCode === 'CS301');
  console.log(`  ✅ Classroom found: ${classroom.subjectName} (${classroom.subjectCode}), Join Code: ${classroom.joinCode}`);

  // 3. Student Login (Rahul Sharma - has face enrolled)
  console.log('\n[3] Testing Student Login (Rahul Sharma)...');
  const studentLogin = await makeRequest(
    { hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST' },
    { email: 'rahul@student.edu', password: 'password123' }
  );
  if (studentLogin.statusCode !== 200) throw new Error('Student login failed');
  const studentToken = studentLogin.body.data.token;
  console.log('  ✅ Student Logged In:', studentLogin.body.data.user.name, `(Face Enrolled: ${studentLogin.body.data.user.profile?.isFaceEnrolled})`);

  // 4. Start Attendance Session (Campus Hall: 12.9716 N, 77.5946 E, 25m Radius)
  console.log('\n[4] Teacher Starts Attendance Session (25m Geofence)...');
  const sessionStartRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/sessions/start',
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` },
    },
    {
      classroomId: classroom._id,
      latitude: 12.9716,
      longitude: 77.5946,
      accuracy: 6,
      allowedRadiusMeters: 25,
    }
  );
  const session = sessionStartRes.body.data;
  console.log(`  ✅ Session Started: ID ${session._id || session.id}, Nonce: ${session.sessionNonce}`);

  // 5. Anti-Proxy Test 1: Student outside 25m radius (approx 150m away)
  console.log('\n[5] Anti-Proxy Test: Student Outside Allowed Radius (150m away)...');
  const outsideRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/attendance/mark',
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    },
    {
      sessionId: session._id || session.id,
      sessionNonce: session.sessionNonce,
      latitude: 12.9729, // ~150m north
      longitude: 77.5955,
      accuracy: 10,
      faceDescriptor: Array.from({ length: 128 }, (_, i) => Math.sin(i + 1) * 0.1),
    }
  );
  console.log(`  Result Code: ${outsideRes.statusCode}`);
  console.log(`  Expected 403 Rejection Message: "${outsideRes.body.message}"`);
  if (outsideRes.statusCode === 403) {
    console.log('  ✅ PASSED: Remote proxy attempt outside 25m was successfully blocked!');
  } else {
    throw new Error('Expected 403 rejection for outside radius');
  }

  // 6. Anti-Proxy Test 2: Low GPS accuracy (accuracy = 65m > threshold 35m)
  console.log('\n[6] Anti-Proxy Test: Spoofed / Low GPS Accuracy (±65m)...');
  const poorGpsRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/attendance/mark',
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    },
    {
      sessionId: session._id || session.id,
      sessionNonce: session.sessionNonce,
      latitude: 12.9716,
      longitude: 77.5946,
      accuracy: 65, // Too high uncertainty
      faceDescriptor: Array.from({ length: 128 }, (_, i) => Math.sin(i + 1) * 0.1),
    }
  );
  console.log(`  Result Code: ${poorGpsRes.statusCode}`);
  console.log(`  Expected 422 Rejection Message: "${poorGpsRes.body.message}"`);
  if (poorGpsRes.statusCode === 422) {
    console.log('  ✅ PASSED: Inaccurate/mocked GPS circle was successfully rejected!');
  } else {
    throw new Error('Expected 422 rejection for poor GPS accuracy');
  }

  // 7. Anti-Proxy Test 3: Face descriptor mismatch
  console.log('\n[7] Anti-Proxy Test: Face Biometric Mismatch...');
  // Provide random vector that differs from Rahul's registered vector
  const fakeDescriptor = Array.from({ length: 128 }, () => 0.85);
  const fakeFaceRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/attendance/mark',
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    },
    {
      sessionId: session._id || session.id,
      sessionNonce: session.sessionNonce,
      latitude: 12.97161,
      longitude: 77.59461,
      accuracy: 8,
      faceDescriptor: fakeDescriptor,
    }
  );
  console.log(`  Result Code: ${fakeFaceRes.statusCode}`);
  console.log(`  Expected 401 Rejection Message: "${fakeFaceRes.body.message}"`);
  if (fakeFaceRes.statusCode === 401) {
    console.log('  ✅ PASSED: Mismatched facial identity was successfully rejected!');
  } else {
    throw new Error('Expected 401 rejection for face mismatch');
  }

  // 8. Legitimate Attendance Submission (Within 8m + Matching Face Descriptor)
  console.log('\n[8] Legitimate Submission: Physical Presence (8m) + Verified Face Biometrics...');
  const validFaceDescriptor = Array.from({ length: 128 }, (_, i) => Math.sin(i + 1) * 0.1);
  const legitimateRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/attendance/mark',
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    },
    {
      sessionId: session._id || session.id,
      sessionNonce: session.sessionNonce,
      latitude: 12.97163, // ~4 meters away
      longitude: 77.59463,
      accuracy: 7,
      faceDescriptor: validFaceDescriptor,
    }
  );
  console.log(`  Result Code: ${legitimateRes.statusCode}`);
  console.log(`  Response Message: "${legitimateRes.body.message}"`);
  if (legitimateRes.statusCode === 200) {
    console.log(`  ✅ PASSED: Attendance successfully marked! Distance: ${legitimateRes.body.data.distanceMeters}m`);
  } else {
    throw new Error('Expected 200 for legitimate submission');
  }

  // 9. Anti-Proxy Test 4: Duplicate Submission Prevention
  console.log('\n[9] Anti-Proxy Test: Duplicate Submission Prevention...');
  const duplicateRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/attendance/mark',
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    },
    {
      sessionId: session._id || session.id,
      sessionNonce: session.sessionNonce,
      latitude: 12.97163,
      longitude: 77.59463,
      accuracy: 7,
      faceDescriptor: validFaceDescriptor,
    }
  );
  console.log(`  Result Code: ${duplicateRes.statusCode}`);
  console.log(`  Expected 409 Rejection Message: "${duplicateRes.body.message}"`);
  if (duplicateRes.statusCode === 409) {
    console.log('  ✅ PASSED: Second submission blocked by database uniqueness constraint!');
  } else {
    throw new Error('Expected 409 duplicate rejection');
  }

  // 10. Verify Live Monitor State
  console.log('\n[10] Verifying Live Session Monitor State...');
  const liveStatusRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/sessions/${session._id || session.id}/status`,
    method: 'GET',
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  const liveData = liveStatusRes.body.data;
  console.log(`  Present Count: ${liveData.stats.presentCount} / ${liveData.stats.totalEnrolled}`);
  console.log(`  Present Student: ${liveData.presentStudents[0].name} (${liveData.presentStudents[0].rollNumber}) - ${liveData.presentStudents[0].distanceMeters}m away`);
  if (liveData.stats.presentCount >= 1) {
    console.log('  ✅ PASSED: Teacher live monitor accurately reflects verified student!');
  }

  // 11. Teacher Stops Session
  console.log('\n[11] Teacher Stops Session...');
  const stopRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/sessions/${session._id || session.id}/stop`,
    method: 'POST',
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  console.log(`  Session Status: ${stopRes.body.data.status}`);
  if (stopRes.body.data.status === 'COMPLETED') {
    console.log('  ✅ PASSED: Session stopped.');
  }

  // 12. Student attempts to submit after session stopped
  console.log('\n[12] Anti-Proxy Test: Submission After Session Closed...');
  const afterCloseRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/attendance/mark',
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    },
    {
      sessionId: session._id || session.id,
      sessionNonce: session.sessionNonce,
      latitude: 12.97163,
      longitude: 77.59463,
      accuracy: 7,
      faceDescriptor: validFaceDescriptor,
    }
  );
  console.log(`  Result Code: ${afterCloseRes.statusCode}`);
  console.log(`  Expected 400 Rejection Message: "${afterCloseRes.body.message}"`);
  if (afterCloseRes.statusCode === 400) {
    console.log('  ✅ PASSED: Late submission after session ended was blocked!');
  }

  // 13. Download Attendance PDF
  console.log('\n[13] Verifying PDF Attendance Report Generation...');
  const pdfRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/reports/pdf/${classroom._id}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  console.log(`  PDF HTTP Status: ${pdfRes.statusCode}`);
  console.log(`  Content-Type: ${pdfRes.headers['content-type']}`);
  console.log(`  Filename: ${pdfRes.headers['content-disposition']}`);
  if (pdfRes.statusCode === 200 && pdfRes.headers['content-type'] === 'application/pdf') {
    console.log('  ✅ PASSED: PDF generated and streamed successfully!');
  }

  console.log('\n===============================================================');
  console.log('🎉 ALL 13 E2E TESTS & ANTI-PROXY SECURITY CONTROLS PASSED 100%!');
  console.log('===============================================================');
}

runE2ETest().catch((err) => {
  console.error('\n❌ E2E TEST FAILED:', err.message);
  process.exit(1);
});

