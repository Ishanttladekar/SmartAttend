import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Share2 } from 'lucide-react';
import { Modal } from './Modal.js';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  joinCode: string;
  subjectName: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  joinCode,
  subjectName,
}) => {
  const [copied, setCopied] = useState(false);
  const joinUrl = `${window.location.origin}/join/classroom/${joinCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${subjectName} on SmartAttend`,
          text: `Join the classroom for ${subjectName} using code ${joinCode} or this direct link:`,
          url: joinUrl,
        });
      } catch (err) {
        console.warn('Share cancelled or failed:', err);
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Join ${subjectName}`} maxWidth="sm">
      <div className="flex flex-col items-center text-center space-y-4">
        {/* QR Code Container */}
        <div className="p-4 bg-white rounded-2xl border-2 border-slate-100 shadow-md">
          <QRCodeSVG
            value={joinUrl}
            size={220}
            level="H"
            includeMargin={true}
          />
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Classroom Join Code
          </p>
          <div className="inline-block px-4 py-1.5 bg-blue-50 text-blue-700 font-mono text-2xl font-black rounded-xl tracking-widest border border-blue-200">
            {joinCode}
          </div>
        </div>

        <p className="text-xs text-slate-500 max-w-xs">
          Students can scan this QR code or enter the 6-character join code on their dashboard to enroll.
        </p>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 w-full pt-2">
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-600" />
                <span>Copy Link</span>
              </>
            )}
          </button>

          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Link</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

