import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Camera,
  Fingerprint,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Navigation,
} from 'lucide-react';
import { startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { Modal } from '../common/Modal.js';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.js';
import { extractFaceDescriptorFromCanvas } from '../../utils/faceBiometrics.js';

interface MarkAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: {
    id: string;
    sessionNonce: string;
    allowedRadiusMeters: number;
    authorizedLocation: {
      latitude: number;
      longitude: number;
    };
    subjectName: string;
    subjectCode: string;
  };
  onSuccess: () => void;
}

export const MarkAttendanceModal: React.FC<MarkAttendanceModalProps> = ({
  isOpen,
  onClose,
  session,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<'location' | 'biometric' | 'submitting' | 'done'>('location');
  const [locationStatus, setLocationStatus] = useState<string>('Checking your location...');
  const [locationDistance, setLocationDistance] = useState<number | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [locationVerified, setLocationVerified] = useState<boolean>(false);

  // Biometric state
  const [biometricMethod, setBiometricMethod] = useState<'face' | 'passkey'>('face');
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [capturingFace, setCapturingFace] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successDetails, setSuccessDetails] = useState<any>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Calculate client distance helper for immediate feedback
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  };

  useEffect(() => {
    if (isOpen) {
      setCurrentStep('location');
      setError(null);
      setLocationVerified(false);
      setSuccessDetails(null);
      verifyLocation();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const verifyLocation = () => {
    setError(null);
    setLocationStatus('Checking your location...');
    setLocationDistance(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setLocationAccuracy(accuracy);
        setCoords({ latitude, longitude, accuracy });

        // GPS accuracy threshold check (max 35m)
        if (accuracy > 35) {
          setError(
            `Location accuracy is too low (±${Math.round(accuracy)}m). Please enable high-accuracy GPS or move closer to a window, and try again.`
          );
          setLocationStatus('Location accuracy insufficient.');
          return;
        }

        const distance = calculateDistance(
          latitude,
          longitude,
          session.authorizedLocation.latitude,
          session.authorizedLocation.longitude
        );

        setLocationDistance(distance);

        const allowedRadius = session.allowedRadiusMeters || 25;
        if (distance <= allowedRadius) {
          setLocationVerified(true);
          setLocationStatus(`You are ${distance} meters away. Location verified.`);
          // Move to Biometric step
          setTimeout(() => {
            setCurrentStep('biometric');
            if (biometricMethod === 'face') {
              startCamera();
            }
          }, 1000);
        } else {
          setLocationVerified(false);
          setLocationStatus(`You are outside the ${allowedRadius}-meter attendance area (${distance}m away).`);
          setError(`You must be within ${allowedRadius} meters of the classroom to mark attendance.`);
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        let msg = 'Failed to retrieve your location.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please allow location access in your browser settings to verify attendance.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Location information is unavailable. Check your device GPS.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Location request timed out. Please try again.';
        }
        setError(msg);
        setLocationStatus('Location check failed.');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraError('Camera access denied. Please allow camera permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Face attendance verification
  const handleVerifyFaceAndSubmit = async () => {
    if (!videoRef.current || !canvasRef.current || !coords) return;

    setCapturingFace(true);
    setError(null);

    try {
      const analysis = extractFaceDescriptorFromCanvas(
        videoRef.current,
        canvasRef.current
      );

      if (!analysis.faceDetected) {
        throw new Error(
          'No clear face detected. Please ensure your face is inside the oval guide and well-lit.'
        );
      }

      setFaceDescriptor(analysis.descriptor);
      stopCamera();
      setCurrentStep('submitting');

      // Submit to backend
      const res = await api.post('/attendance/mark', {
        sessionId: session.id,
        sessionNonce: session.sessionNonce,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        faceDescriptor: analysis.descriptor,
      });

      setSuccessDetails(res.data.data);
      setCurrentStep('done');
      onSuccess();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Face verification or attendance submission failed.'
      );
      setCurrentStep('biometric');
      startCamera();
    } finally {
      setCapturingFace(false);
    }
  };

  // WebAuthn Passkey attendance verification
  const handleVerifyPasskeyAndSubmit = async () => {
    if (!coords) return;
    setError(null);
    setCurrentStep('submitting');

    try {
      // 1. Get auth options from backend
      const optionsRes = await api.get('/biometrics/passkey/auth-options');
      const options = optionsRes.data;

      // 2. Invoke browser/device biometric prompt
      const authResponse = await startAuthentication({ optionsJSON: options });

      // 3. Submit attendance with Passkey response
      const res = await api.post('/attendance/mark', {
        sessionId: session.id,
        sessionNonce: session.sessionNonce,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        webAuthnResponse: authResponse,
      });

      setSuccessDetails(res.data.data);
      setCurrentStep('done');
      onSuccess();
    } catch (err: any) {
      console.warn('Passkey verification failed:', err);
      setError(
        err.response?.data?.message ||
          err.message ||
          'Device biometric verification failed.'
      );
      setCurrentStep('biometric');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        stopCamera();
        onClose();
      }}
      title={`Mark Attendance - ${session.subjectCode}`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Step Progress Bar */}
        <div className="flex items-center justify-between px-2 text-xs font-semibold">
          <div
            className={`flex items-center gap-1.5 ${
              currentStep === 'location'
                ? 'text-blue-600 font-bold'
                : locationVerified
                ? 'text-emerald-600'
                : 'text-slate-400'
            }`}
          >
            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px]">
              1
            </span>
            <span>Location (25m)</span>
          </div>
          <div className="h-0.5 w-12 bg-slate-200" />
          <div
            className={`flex items-center gap-1.5 ${
              currentStep === 'biometric' || currentStep === 'submitting'
                ? 'text-blue-600 font-bold'
                : currentStep === 'done'
                ? 'text-emerald-600'
                : 'text-slate-400'
            }`}
          >
            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px]">
              2
            </span>
            <span>Biometric Identity</span>
          </div>
          <div className="h-0.5 w-12 bg-slate-200" />
          <div
            className={`flex items-center gap-1.5 ${
              currentStep === 'done' ? 'text-emerald-600 font-bold' : 'text-slate-400'
            }`}
          >
            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px]">
              3
            </span>
            <span>Recorded</span>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Verification Alert</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* STEP 1: LOCATION */}
        {currentStep === 'location' && (
          <div className="space-y-4 py-4 text-center">
            <div className="relative mx-auto w-20 h-20 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center text-blue-600 shadow-md">
              <MapPin className="w-9 h-9" />
              <div className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping opacity-25" />
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-slate-800 text-base">{locationStatus}</h4>
              {locationDistance !== null && (
                <p className="text-xs text-slate-500">
                  Target classroom radius: <strong>{session.allowedRadiusMeters || 25} meters</strong>
                </p>
              )}
              {locationAccuracy !== null && (
                <p className="text-[11px] text-slate-400">
                  GPS Accuracy: ±{Math.round(locationAccuracy)}m (Must be ≤ 35m)
                </p>
              )}
            </div>

            {!locationVerified && (
              <button
                onClick={verifyLocation}
                className="mt-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition inline-flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Location Check</span>
              </button>
            )}
          </div>
        )}

        {/* STEP 2: BIOMETRIC IDENTITY */}
        {currentStep === 'biometric' && (
          <div className="space-y-4">
            {/* Location Confirmed Banner */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Location verified ({locationDistance}m away)</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-700">RADIUS OK</span>
            </div>

            {/* Biometric Method Selector */}
            <div className="flex p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => {
                  setBiometricMethod('face');
                  startCamera();
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  biometricMethod === 'face'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Face Recognition</span>
              </button>
              <button
                onClick={() => {
                  setBiometricMethod('passkey');
                  stopCamera();
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  biometricMethod === 'passkey'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Fingerprint className="w-3.5 h-3.5" />
                <span>Device Fingerprint / Passkey</span>
              </button>
            </div>

            {/* Face verification flow */}
            {biometricMethod === 'face' && (
              <div className="space-y-3">
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-200 shadow-inner flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform scale-x-[-1]"
                  />
                  <canvas ref={canvasRef} width={640} height={480} className="hidden" />

                  {/* Face oval guideline */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-40 h-52 rounded-full border-2 border-dashed border-blue-400 bg-blue-500/10" />
                  </div>

                  <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-slate-900/80 text-white text-[10px] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Live Video Biometric Check
                  </div>
                </div>

                <p className="text-center text-xs text-slate-500">
                  Center your face inside the guideline and press verify.
                </p>

                <button
                  onClick={handleVerifyFaceAndSubmit}
                  disabled={capturingFace || !cameraActive}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2"
                >
                  {capturingFace ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying Biometric Vector...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify Face & Mark Attendance</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Device Passkey flow */}
            {biometricMethod === 'passkey' && (
              <div className="py-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-indigo-50 border-2 border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto shadow-md">
                  <Fingerprint className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800 text-sm">
                    Device Biometric Authentication
                  </h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Authenticate using your device's platform authenticator (Fingerprint, Touch ID, or Windows Hello).
                  </p>
                </div>

                <button
                  onClick={handleVerifyPasskeyAndSubmit}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2"
                >
                  <Fingerprint className="w-4 h-4 text-indigo-400" />
                  <span>Authenticate with Device Passkey</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* SUBMITTING STATE */}
        {currentStep === 'submitting' && (
          <div className="py-12 text-center space-y-3">
            <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
            <h4 className="font-bold text-slate-800 text-base">
              Verifying Anti-Proxy Credentials
            </h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Validating physical presence within 25 meters, biometric identity match, and session nonce...
            </p>
          </div>
        )}

        {/* STEP 3: DONE */}
        {currentStep === 'done' && (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h4 className="text-xl font-extrabold text-slate-900">
                Attendance Marked!
              </h4>
              <p className="text-xs text-slate-600 font-medium">
                Verified: {locationDistance}m away • {new Date().toLocaleTimeString()}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Subject:</span>
                <span className="font-bold text-slate-800">{session.subjectName}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Location Geofence:</span>
                <span className="font-bold text-emerald-600">PASS (25m Radius)</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Biometric Identity:</span>
                <span className="font-bold text-emerald-600">VERIFIED ✓</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Status:</span>
                <span className="font-bold text-emerald-600">PRESENT</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

