import React, { useState, useRef, useEffect } from 'react';
import { Camera, CheckCircle2, AlertCircle, RefreshCw, Shield, Lock } from 'lucide-react';
import { Modal } from '../common/Modal.js';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.js';
import { extractFaceDescriptorFromCanvas } from '../../utils/faceBiometrics.js';

interface FaceEnrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const FaceEnrollModal: React.FC<FaceEnrollModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { refreshUser } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturing, setCapturing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'camera' | 'verifying' | 'success'>('camera');
  const [countdown, setCountdown] = useState<number>(3);

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('camera');
      setError(null);
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setError(
        'Camera permission was denied or camera is unavailable. Please allow camera access in your browser.'
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleCaptureAndEnroll = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setCapturing(true);
    setError(null);

    // 3-second liveness stabilization countdown
    let count = 3;
    setCountdown(count);
    const interval = setInterval(async () => {
      count--;
      setCountdown(count);
      if (count === 0) {
        clearInterval(interval);
        setStep('verifying');
        setLoading(true);

        try {
          const analysis = extractFaceDescriptorFromCanvas(
            videoRef.current!,
            canvasRef.current!
          );

          if (!analysis.faceDetected) {
            throw new Error(
              'No clear face detected. Please ensure your face is well-lit and centered within the oval guide.'
            );
          }

          // Send 128-float descriptor vector to backend
          const res = await api.post('/biometrics/face/enroll', {
            faceDescriptor: analysis.descriptor,
          });

          await refreshUser();
          setStep('success');
          stopCamera();
          if (onSuccess) onSuccess();
        } catch (err: any) {
          setError(
            err.response?.data?.message ||
              err.message ||
              'Face biometric enrollment failed. Please try again.'
          );
          setStep('camera');
        } finally {
          setLoading(false);
          setCapturing(false);
        }
      }
    }, 1000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        stopCamera();
        onClose();
      }}
      title="Biometric Face Identity Enrollment"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Privacy Note Banner */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p>
            <strong>Biometric Privacy Guarantee:</strong> SmartAttend does <em>not</em> store
            raw photographs. Only a 128-dimensional mathematical vector representation is stored
            to authenticate your identity during class attendance.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {step === 'camera' && (
          <div className="space-y-3">
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-200 shadow-inner flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="hidden"
              />

              {/* Facial alignment oval guide overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className={`w-44 h-56 rounded-full border-2 border-dashed ${
                    capturing ? 'border-amber-400 bg-amber-400/10' : 'border-blue-400/80 bg-blue-500/5'
                  } transition-all duration-300 flex items-center justify-center`}
                >
                  {capturing && (
                    <div className="text-white text-3xl font-extrabold animate-pulse">
                      {countdown}
                    </div>
                  )}
                </div>
              </div>

              {/* Status pill */}
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-900/70 backdrop-blur-md text-white text-[11px] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live Camera Feed
              </div>
            </div>

            <p className="text-center text-xs text-slate-500">
              Align your face inside the oval, remove sunglasses/masks, and keep still.
            </p>

            <button
              onClick={handleCaptureAndEnroll}
              disabled={capturing || loading || !stream}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2"
            >
              {capturing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Capturing Liveness ({countdown}s)...</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  <span>Capture & Enroll Face</span>
                </>
              )}
            </button>
          </div>
        )}

        {step === 'verifying' && (
          <div className="py-10 text-center space-y-3">
            <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
            <h4 className="font-bold text-slate-800">Processing Biometric Features</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Extracting 128-point normalized facial descriptor vector and verifying liveness...
            </p>
          </div>
        )}

        {step === 'success' && (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Biometric Identity Enrolled!</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Your facial biometric descriptor is now registered. You are ready to mark attendance in class sessions!
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl transition"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

