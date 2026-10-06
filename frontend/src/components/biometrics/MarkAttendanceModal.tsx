import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Camera,
  Fingerprint,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { startAuthentication } from '@simplewebauthn/browser';
import { Modal } from '../common/Modal.js';
import { LocationMap } from '../common/LocationMap.js';
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
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [capturingFace, setCapturingFace] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

        if (accuracy > 35) {
          setError(
            `Location accuracy is too low (±${Math.round(accuracy)}m). Please enable high-accuracy GPS and try again.`
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
          setTimeout(() => {
            setCurrentStep('biometric');
            if (biometricMethod === 'face') {
              startCamera();
            }
          }, 1200);
        } else {
          setLocationVerified(false);
          setLocationStatus(`You are outside the ${allowedRadius}-meter area (${distance}m away).`);
          setError(`You must be within ${allowedRadius} meters of the classroom to mark attendance.`);
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        let msg = 'Failed to retrieve your location.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please allow location access in your browser settings.';
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
      setError('Camera access denied. Please allow camera permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

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
          'No clear face detected. Please ensure your face is well-lit and centered.'
        );
      }

      stopCamera();
      setCurrentStep('submitting');

      await api.post('/attendance/mark', {
        sessionId: session.id,
        sessionNonce: session.sessionNonce,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        faceDescriptor: analysis.descriptor,
      });

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

  const handleVerifyPasskeyAndSubmit = async () => {
    if (!coords) return;
    setError(null);
    setCurrentStep('submitting');

    try {
      const optionsRes = await api.get('/biometrics/passkey/auth-options');
      const authResponse = await startAuthentication({ optionsJSON: optionsRes.data });

      await api.post('/attendance/mark', {
        sessionId: session.id,
        sessionNonce: session.sessionNonce,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        webAuthnResponse: authResponse,
      });

      setCurrentStep('done');
      onSuccess();
    } catch (err: any) {
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
      title={`Mark Attendance: ${session.subjectCode}`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Step Indicator */}
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
            <span>Location Verification</span>
          </div>
          <div className="h-0.5 w-10 bg-slate-200" />
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
            <span>Identity Check</span>
          </div>
          <div className="h-0.5 w-10 bg-slate-200" />
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
              <p className="font-semibold">Verification Notice</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* STEP 1: INTERACTIVE MAP & LOCATION */}
        {currentStep === 'location' && (
          <div className="space-y-3">
            {/* Interactive Location Map */}
            <LocationMap
              centerLat={session.authorizedLocation.latitude}
              centerLng={session.authorizedLocation.longitude}
              radiusMeters={session.allowedRadiusMeters || 25}
              studentLat={coords?.latitude}
              studentLng={coords?.longitude}
              studentAccuracy={coords?.accuracy}
              className="h-56 w-full rounded-xl"
              centerLabel={`${session.subjectCode} Classroom`}
            />

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1">
              <h4 className="font-bold text-slate-800 text-sm">{locationStatus}</h4>
              <p className="text-xs text-slate-500">
                Authorized radius: <strong>{session.allowedRadiusMeters || 25} meters</strong>
                {coords?.accuracy && ` • GPS Accuracy: ±${Math.round(coords.accuracy)}m`}
              </p>
            </div>

            {!locationVerified && (
              <button
                onClick={verifyLocation}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2"
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
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Location verified ({locationDistance}m away)</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-700">WITHIN 25M</span>
            </div>

            <div className="flex p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => {
                  setBiometricMethod('face');
                  startCamera();
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
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
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  biometricMethod === 'passkey'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Fingerprint className="w-3.5 h-3.5" />
                <span>Device Fingerprint / Passkey</span>
              </button>
            </div>

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

                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-40 h-52 rounded-full border-2 border-dashed border-blue-400 bg-blue-500/10" />
                  </div>
                </div>

                <button
                  onClick={handleVerifyFaceAndSubmit}
                  disabled={capturingFace || !cameraActive}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-sm transition flex items-center justify-center gap-2"
                >
                  {capturingFace ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying Face...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify & Submit Attendance</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {biometricMethod === 'passkey' && (
              <div className="py-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center mx-auto">
                  <Fingerprint className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-slate-800 text-sm">
                    Device Biometric Verification
                  </h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Authenticate using your phone/device fingerprint scanner, Touch ID, or Windows Hello.
                  </p>
                </div>

                <button
                  onClick={handleVerifyPasskeyAndSubmit}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl shadow-sm transition flex items-center justify-center gap-2"
                >
                  <Fingerprint className="w-4 h-4" />
                  <span>Authenticate with Device Fingerprint</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* SUBMITTING */}
        {currentStep === 'submitting' && (
          <div className="py-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <h4 className="font-semibold text-slate-800 text-sm">
              Recording Attendance
            </h4>
            <p className="text-xs text-slate-500">
              Validating physical presence and credentials...
            </p>
          </div>
        )}

        {/* STEP 3: DONE */}
        {currentStep === 'done' && (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h4 className="text-xl font-bold text-slate-900">
                Attendance Marked
              </h4>
              <p className="text-xs text-slate-600">
                Verified: {locationDistance}m from classroom • {new Date().toLocaleTimeString()}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Subject:</span>
                <span className="font-semibold text-slate-800">{session.subjectName}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Location:</span>
                <span className="font-semibold text-emerald-600">Within 25m Radius</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Status:</span>
                <span className="font-semibold text-emerald-600">PRESENT</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
