import React, { useState } from 'react';
import { X, Mail, Key, ExternalLink, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, FileText, Sparkles } from 'lucide-react';
import { api } from '../services/api';

export default function ConnectGmailModal({ onClose, onConnected }) {
  const [activeTab, setActiveTab] = useState('direct'); // 'direct', 'paste', or 'oauth'
  const [emailAddress, setEmailAddress] = useState('donthushalini@gmail.com');
  const [appPassword, setAppPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Paste real email state
  const [pasteSubject, setPasteSubject] = useState('');
  const [pasteSender, setPasteSender] = useState('');
  const [pasteBody, setPasteBody] = useState('');

  const handleDirectConnect = async (e) => {
    e.preventDefault();
    if (!emailAddress || !appPassword) {
      setError('Please provide both your Gmail address and 16-character App Password.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await api.connectGmailImap(emailAddress, appPassword);
      setSuccessMsg(res.message || 'Gmail connected and real messages synchronized successfully!');
      setTimeout(() => {
        if (onConnected) onConnected();
        onClose();
      }, 1500);
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('AUTHENTICATIONFAILED') || msg.includes('Invalid credentials')) {
        setError(
          'Gmail Login Failed: Please check: 1) Is IMAP enabled in your Gmail settings? (See step 1 below). 2) Was the 16-character App Password generated under the exact same Google account?'
        );
      } else {
        setError(msg || 'Failed to connect Gmail.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasteImport = async (e) => {
    e.preventDefault();
    if (!pasteBody && !pasteSubject) {
      setError('Please provide the subject or email body to analyze.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await api.importEmailText({
        subject: pasteSubject,
        sender: pasteSender || emailAddress,
        body: pasteBody,
        is_unopened: true
      });
      setSuccessMsg('Email analyzed and imported into your opportunity vault!');
      setTimeout(() => {
        if (onConnected) onConnected();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to import email text.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthConnect = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.connectEmail();
      if (res.auth_url) {
        window.location.href = res.auth_url;
      } else {
        setError(res.error || 'Google OAuth credentials not configured on backend.');
      }
    } catch (err) {
      setError(err.message || 'OAuth initiation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-600 text-white">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Connect Your Real Gmail Account</h3>
              <p className="text-xs text-slate-400">Import your actual emails & time-sensitive opportunities</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="mt-4 flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
          <button
            onClick={() => { setActiveTab('direct'); setError(''); }}
            className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'direct'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Direct Sync (App Password)
          </button>
          <button
            onClick={() => { setActiveTab('paste'); setError(''); }}
            className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'paste'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Paste Real Email (Instant) ⚡
          </button>
          <button
            onClick={() => { setActiveTab('oauth'); setError(''); }}
            className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'oauth'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            OAuth 2.0
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <div className="space-y-1">
              <span className="font-semibold block text-rose-100">Connection Notice:</span>
              <p className="leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {activeTab === 'direct' && (
          <form onSubmit={handleDirectConnect} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Your Gmail Address</label>
              <input
                type="email"
                required
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="you@gmail.com"
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">16-Character Google App Password</label>
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300"
                >
                  <span>Open App Passwords</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                type="password"
                required
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
                placeholder="xxxx xxxx xxxx xxxx"
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-mono tracking-wider focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            {/* Checklist for Invalid Credentials fix */}
            <div className="p-3.5 rounded-xl bg-slate-950/90 border border-amber-500/30 text-xs space-y-2">
              <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-amber-400 shrink-0" />
                If you see "Invalid credentials (Failure)", verify these 2 steps:
              </span>
              <div className="space-y-1.5 text-[11px] text-slate-300 pl-1 leading-relaxed">
                <div>
                  <strong className="text-white">1. Enable IMAP in Gmail Settings:</strong>
                  <p className="text-slate-400">
                    Open Gmail → Click ⚙️ <strong>Settings</strong> → <strong>See all settings</strong> → <strong>Forwarding and POP/IMAP</strong> tab → Select <strong>Enable IMAP</strong> → Click <strong>Save Changes</strong> at the bottom.
                  </p>
                </div>
                <div>
                  <strong className="text-white">2. Ensure App Password matches this email:</strong>
                  <p className="text-slate-400">
                    On <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer noopener" className="text-indigo-400 underline">myaccount.google.com/apppasswords</a>, verify the top-right profile is <strong>{emailAddress}</strong>. Create an app named <em>OpportunityGuard</em> and copy the 16 characters.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{loading ? 'Connecting & Syncing...' : 'Connect & Import Previous Mails'}</span>
              </button>
            </div>
          </form>
        )}

        {activeTab === 'paste' && (
          <form onSubmit={handlePasteImport} className="mt-4 space-y-4">
            <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-300">
              <span className="font-semibold block text-indigo-200 mb-1">Instant Real Email Analysis:</span>
              Paste any real email you have received (exam notice, interview invitation, assignment, or registration). OpportunityGuard AI will extract deadlines, links, and urgency scores instantly!
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Subject</label>
              <input
                type="text"
                required
                value={pasteSubject}
                onChange={(e) => setPasteSubject(e.target.value)}
                placeholder="e.g. Action Required: Online Technical Interview Confirmation"
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Sender Email / Name (Optional)</label>
              <input
                type="text"
                value={pasteSender}
                onChange={(e) => setPasteSender(e.target.value)}
                placeholder="e.g. recruiting@google.com or Prof. Smith"
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Body Text</label>
              <textarea
                rows={5}
                required
                value={pasteBody}
                onChange={(e) => setPasteBody(e.target.value)}
                placeholder="Paste the full body text of the email here..."
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-mono focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{loading ? 'Analyzing with AI...' : 'Analyze & Protect Opportunity'}</span>
              </button>
            </div>
          </form>
        )}

        {activeTab === 'oauth' && (
          <div className="mt-6 text-center space-y-4 py-4">
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Connect securely via Google OAuth 2.0. Requires configured Google Cloud Client ID and Secret in your backend environment variables.
            </p>

            <button
              onClick={handleOAuthConnect}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold bg-white text-slate-900 hover:bg-slate-100 shadow-md transition-all hover:scale-105 disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{loading ? 'Redirecting to Google...' : 'Sign in with Google OAuth'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
