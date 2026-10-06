import { Router } from 'express';
import { BiometricController } from '../controllers/biometricController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';

const router = Router();

// Student face enrollment
router.post('/face/enroll', authenticate, requireRole('student'), BiometricController.enrollFace);
router.delete('/face', authenticate, requireRole('student'), BiometricController.deleteFace);

// Student WebAuthn Passkeys (Platform Biometrics)
router.get('/passkey/register-options', authenticate, requireRole('student'), BiometricController.getPasskeyRegistrationOptions);
router.post('/passkey/verify-registration', authenticate, requireRole('student'), BiometricController.verifyPasskeyRegistration);
router.get('/passkey/auth-options', authenticate, requireRole('student'), BiometricController.getPasskeyAuthOptions);

// Student biometric status
router.get('/status', authenticate, requireRole('student'), BiometricController.getBiometricStatus);

export default router;

