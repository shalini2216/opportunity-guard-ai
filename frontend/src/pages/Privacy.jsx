import React, { useState, useEffect } from 'react';
import { Lock, Download, Trash2, ShieldCheck, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export default function Privacy() {
  const [privacyData, setPrivacyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purging, setPurging] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const fetchPrivacyData = async () => {
    setLoading(true);
    try {
      const res = await api.getPrivacyData();
      setPrivacyData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrivacyData();
  }, []);

  const handlePurgeData = async () => {
    const confirmation = window.prompt('Type "DELETE ALL" to permanently purge all your emails, opportunities, and reminder metadata:');
    if (confirmation !== 'DELETE ALL') {
      alert('Purge canceled.');
      return;
    }

    setPurging(true);
    try {
      await api.purgeUserData();
      setStatusMsg('All personal opportunity data, emails, and reminders have been permanently deleted.');
      fetchPrivacyData();
    } catch (err) {
      alert(`Purge failed: ${err.message}`);
    } finally {
      setPurging(false);
    }
  };

  const handleDownloadExport = () => {
    const token = localStorage.getItem('og_token');
    window.open(api.getExportUrl(), '_blank');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <div className="flex items-center gap-2">
          <Lock className="w-6 h-6 text-emerald-400" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Privacy & Security Vault</h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Transparency controls, audit log oversight, data export, and GDPR-compliant data wipe
        </p>
      </div>

      {statusMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Security Principles */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>OpportunityGuard Privacy Guarantees</span>
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          {privacyData?.privacy_policy_summary}
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800">
          <li className="flex items-center gap-1.5">
            <span className="text-emerald-400">✓</span> No passwords stored (OAuth 2.0 PKCE)
          </li>
          <li className="flex items-center gap-1.5">
            <span className="text-emerald-400">✓</span> Bcrypt password hashing (12 rounds)
          </li>
          <li className="flex items-center gap-1.5">
            <span className="text-emerald-400">✓</span> Zero persistent full email storage
          </li>
          <li className="flex items-center gap-1.5">
            <span className="text-emerald-400">✓</span> Instant token revocation on disconnect
          </li>
        </ul>
      </div>

      {/* Stored Metadata Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
          <span className="text-xs text-slate-400">Emails Stored</span>
          <div className="text-xl font-bold text-slate-100 mt-1">{privacyData?.stats?.emails_stored || 0}</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
          <span className="text-xs text-slate-400">Opportunities</span>
          <div className="text-xl font-bold text-indigo-400 mt-1">{privacyData?.stats?.opportunities_tracked || 0}</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
          <span className="text-xs text-slate-400">Reminders Logged</span>
          <div className="text-xl font-bold text-purple-400 mt-1">{privacyData?.stats?.reminders_logged || 0}</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
          <span className="text-xs text-slate-400">Notifications</span>
          <div className="text-xl font-bold text-amber-400 mt-1">{privacyData?.stats?.notifications_logged || 0}</div>
        </div>
      </div>

      {/* Data Controls */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h3 className="text-sm font-semibold text-slate-200">Data Management & GDPR Controls</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleDownloadExport}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            <span>Export Data Snapshot (JSON)</span>
          </button>

          <button
            onClick={handlePurgeData}
            disabled={purging}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/80 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>{purging ? 'Purging...' : 'Purge All My Opportunity Data'}</span>
          </button>
        </div>
      </div>

      {/* Audit Logs */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-400" />
          <span>Security & System Audit Trail</span>
        </h3>
        <p className="text-xs text-slate-400">Recent security-sensitive events recorded in your account:</p>

        <div className="max-h-60 overflow-y-auto divide-y divide-slate-850 rounded-xl bg-slate-950 border border-slate-850 p-2 font-mono text-[11px]">
          {privacyData?.audit_logs?.length === 0 ? (
            <div className="p-4 text-center text-slate-500">No audit events yet.</div>
          ) : (
            privacyData?.audit_logs?.map((log) => (
              <div key={log.id} className="p-2 flex items-center justify-between gap-2 text-slate-300">
                <span className="text-indigo-400 font-bold">{log.action}</span>
                <span className="text-slate-500">{log.ip_address}</span>
                <span className="text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
