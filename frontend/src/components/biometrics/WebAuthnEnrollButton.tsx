import React, { useState } from 'react';
import { Fingerprint, CheckCircle2, AlertCircle, RefreshCw, KeyRound } from 'lucide-react';
import { startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.js';

interface WebAuthnEnrollButtonProps {
  onSuccess?: () => void;
}

export const WebAuthnEnrollButton: React.FC<WebAuthnEnrollButtonProps> = ({ onSuccess }) => {
  const { refreshUser } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnrollPasskey = async () => {
    if (!browserSupportsWebAuthn()) {
      setError('WebAuthn / Passkeys are not supported on this browser.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. Get registration options from server
      const optionsRes = await api.get('/biometrics/passkey/register-options');
      const options = optionsRes.data;

      // 2. Invoke browser/device platform biometric prompt (Windows Hello, Touch ID, Fingerprint)
      const registrationResponse = await startRegistration({ optionsJSON: options });

      // 3. Send response to server for cryptographic verification
      const verifyRes = await api.post(
        '/biometrics/passkey/verify-registration',
        registrationResponse
      );

      await refreshUser();
      setSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      console.warn('[WebAuthn] Registration error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Biometric registration was cancelled or timed out.');
      } else {
        setError(
          err.response?.data?.message ||
            err.message ||
            'Failed to register device biometric authenticator.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleEnrollPasskey}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-sm transition"
      >
        {loading ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin text-slate-300" />
            <span>Awaiting Device Biometrics...</span>
          </>
        ) : success ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-300">Device Biometric Registered!</span>
          </>
        ) : (
          <>
            <Fingerprint className="w-5 h-5 text-indigo-400" />
            <span>Enroll Device Fingerprint / Passkey</span>
          </>
        )}
      </button>

      {error && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 text-red-700 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

