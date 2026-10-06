import React, { useState, useEffect } from 'react';
import {
  Camera,
  Fingerprint,
  Shield,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Lock,
  RefreshCw,
  Info,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.js';
import { FaceEnrollModal } from '../../components/biometrics/FaceEnrollModal.js';
import { WebAuthnEnrollButton } from '../../components/biometrics/WebAuthnEnrollButton.js';

export const BiometricSettingsPage: React.FC = () => {
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [faceModalOpen, setFaceModalOpen] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);

  useEffect(() => {
    fetchBiometricStatus();
  }, []);

  const fetchBiometricStatus = async () => {
    setLoading(true);
    try {
      const res = await api.get('/biometrics/status');
      setStatus(res.data.data);
    } catch (err: any) {
      console.error('Failed to fetch biometric status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFace = async () => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete your registered facial biometric template? You will need to re-enroll before you can verify attendance using face recognition.'
    );
    if (!confirmDelete) return;

    setDeleting(true);
    try {
      await api.delete('/biometrics/face');
      await refreshUser();
      await fetchBiometricStatus();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete facial template');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Biometric Identity & Privacy Management
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage your anti-proxy authentication credentials. SmartAttend prioritizes zero raw-image storage and cryptographic device binding.
        </p>
      </div>

      {/* PRIVACY DISCLOSURE BANNER */}
      <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200 text-blue-950 text-xs space-y-2">
        <div className="flex items-center gap-2 font-bold text-sm text-blue-900">
          <Shield className="w-5 h-5 text-blue-600" />
          <span>Biometric Privacy & Data Minimization Architecture</span>
        </div>
        <p className="leading-relaxed">
          SmartAttend is designed in compliance with modern privacy principles (GDPR / BIPA / FERPA):
        </p>
        <ul className="list-disc list-inside space-y-1 text-blue-900/90 pl-1">
          <li>
            <strong>Zero Raw Face Photos:</strong> We do not store raw photographs or video streams. Only a 128-dimensional mathematical vector representation is stored for identity matching.
          </li>
          <li>
            <strong>Zero Raw Fingerprint Minutiae:</strong> Device biometric authentication is performed via the FIDO2/WebAuthn standard. Raw fingerprint scans never leave your device's Secure Enclave / TPM chip.
          </li>
          <li>
            <strong>Right to Erasure:</strong> You can delete your enrolled biometric templates at any time using the controls below.
          </li>
        </ul>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CARD 1: FACIAL RECOGNITION */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                <Camera className="w-6 h-6" />
              </div>

              {status?.isFaceEnrolled ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Enrolled ✓</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200">
                  <span>Not Enrolled</span>
                </span>
              )}
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                Facial Vector Identity
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Enables instantaneous camera face verification during attendance marking.
              </p>
            </div>

            {status?.isFaceEnrolled && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Template Type:</span>
                  <span className="font-mono font-bold">128-d Vector</span>
                </div>
                <div className="flex justify-between">
                  <span>Enrolled On:</span>
                  <span className="font-medium">
                    {status.faceEnrolledAt
                      ? new Date(status.faceEnrolledAt).toLocaleDateString()
                      : 'Active'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => setFaceModalOpen(true)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>{status?.isFaceEnrolled ? 'Re-Enroll Face Template' : 'Enroll Face Template'}</span>
            </button>

            {status?.isFaceEnrolled && (
              <button
                onClick={handleDeleteFace}
                disabled={deleting}
                className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition flex items-center justify-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Face Template</span>
              </button>
            )}
          </div>
        </div>

        {/* CARD 2: PLATFORM BIOMETRICS / PASSEKEYS */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-2xl bg-purple-50 text-purple-600">
                <Fingerprint className="w-6 h-6" />
              </div>

              {status?.isPasskeyEnrolled ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{status.passkeyCount} Enrolled</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                  <span>0 Devices</span>
                </span>
              )}
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                Device Fingerprint / Passkeys
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Binds attendance authentication to your device's hardware authenticator (Windows Hello, Touch ID, Android Biometrics).
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Standard:</span>
                <span className="font-mono font-bold">FIDO2 / WebAuthn</span>
              </div>
              <div className="flex justify-between">
                <span>Cryptographic Binding:</span>
                <span className="font-medium text-emerald-600">Hardware TPM / Secure Enclave</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <WebAuthnEnrollButton
              onSuccess={() => {
                fetchBiometricStatus();
                refreshUser();
              }}
            />
          </div>
        </div>
      </div>

      {/* Face Enroll Modal */}
      <FaceEnrollModal
        isOpen={faceModalOpen}
        onClose={() => setFaceModalOpen(false)}
        onSuccess={() => {
          fetchBiometricStatus();
          refreshUser();
        }}
      />
    </div>
  );
};

