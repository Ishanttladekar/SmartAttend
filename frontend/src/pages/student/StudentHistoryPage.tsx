import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Camera, Fingerprint, CheckCircle2, RefreshCw } from 'lucide-react';
import { api } from '../../api/client.js';

export const StudentHistoryPage: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get('/attendance/history/student');
      setHistory(res.data.data);
    } catch (err: any) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Attendance History Audit
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Complete cryptographic audit trail of all your verified attendance submissions.
          </p>
        </div>

        <button
          onClick={fetchHistory}
          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
            <p className="text-xs">Loading attendance audit log...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <Clock className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-700 text-sm">No attendance records yet</h3>
            <p className="text-xs text-slate-400">
              When instructors activate attendance sessions, mark attendance from your dashboard.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 uppercase tracking-wider font-bold">
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Session Code</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Physical Distance</th>
                  <th className="py-3 px-4">Anti-Proxy Verifications</th>
                  <th className="py-3 px-4">Audit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{record.subjectName}</div>
                      <div className="text-[11px] text-slate-400">
                        {record.subjectCode} • {record.section}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">
                      {record.sessionCode}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{new Date(record.timestamp).toLocaleDateString()}</div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(record.timestamp).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        <MapPin className="w-3 h-3 text-emerald-600" />
                        {record.distanceMeters}m away
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200">
                          <MapPin className="w-2.5 h-2.5" />
                          GPS
                        </span>
                        {record.verificationMethods?.faceVerified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-200">
                            <Camera className="w-2.5 h-2.5" />
                            Face Vector
                          </span>
                        )}
                        {record.verificationMethods?.passkeyVerified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold text-[10px] border border-purple-200">
                            <Fingerprint className="w-2.5 h-2.5" />
                            Passkey
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>PRESENT</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

