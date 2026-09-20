import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MailOpen, RefreshCw, ChevronRight, Sparkles, PlusCircle } from 'lucide-react';
import ConnectGmailModal from '../components/ConnectGmailModal';
import { api } from '../services/api';

export default function Emails() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterState, setFilterState] = useState('ALL');
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const res = await api.getEmails();
      setEmails(res.emails || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const handleSyncMail = async () => {
    setSyncing(true);
    try {
      const res = await api.syncEmail();
      if (res.error) {
        alert(res.error);
      } else {
        alert(res.message || 'Mailbox sync complete!');
        fetchEmails();
      }
    } catch (err) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const filtered = filterState === 'ALL'
    ? emails
    : emails.filter(e => e.read_state === filterState);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Mailbox Surveillance</h1>
          <p className="text-xs text-slate-400 mt-1">
            Incoming communications monitored for opportunity triggers and read state transitions
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowConnectModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-600/30 to-rose-600/30 border border-amber-500/40 text-amber-200 hover:from-amber-600/50 hover:to-rose-600/50 transition-all hover:scale-105"
          >
            <Mail className="w-3.5 h-3.5 text-amber-400" />
            <span>Connect Real Gmail</span>
          </button>

          <button
            onClick={handleSyncMail}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>Sync Mailbox</span>
          </button>
        </div>
      </div>

      {/* State filter buttons */}
      <div className="flex items-center gap-2 bg-slate-900/60 p-1 rounded-xl border border-slate-800 w-fit text-xs">
        {['ALL', 'UNOPENED', 'OPENED', 'COMPLETED'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterState(st)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filterState === st ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">Loading emails...</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-3xl bg-slate-900/50 border border-slate-800 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto">
            <Mail className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-200">No Emails In Your Vault Yet</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Connect your real Gmail inbox to import your actual previous emails, or load the realistic demo dataset to evaluate the platform.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setShowConnectModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Connect Your Gmail Account</span>
            </button>
            <button
              onClick={async () => {
                await api.seedDemo();
                fetchEmails();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Load Sample Demo Emails</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-slate-800/80 rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
          {filtered.map((mail) => {
            const isUnopened = mail.read_state === 'UNOPENED';
            return (
              <Link
                key={mail.id}
                to={`/emails/${mail.id}`}
                className={`p-4 flex items-center justify-between gap-4 transition-colors ${
                  isUnopened ? 'bg-slate-900 hover:bg-slate-850' : 'hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                    isUnopened ? 'bg-indigo-600/30 text-indigo-400 border border-indigo-500/40' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {isUnopened ? <Mail className="w-4 h-4" /> : <MailOpen className="w-4 h-4" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-semibold text-slate-200">{mail.sender}</span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {mail.category}
                      </span>
                      {isUnopened && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                          UNREAD
                        </span>
                      )}
                      {mail.source === 'gmail_imap' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          GMAIL
                        </span>
                      )}
                    </div>
                    <h3 className={`text-sm truncate ${isUnopened ? 'font-bold text-slate-100' : 'font-medium text-slate-300'}`}>
                      {mail.subject}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{mail.snippet}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-slate-500 hidden sm:inline">
                    {new Date(mail.received_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showConnectModal && (
        <ConnectGmailModal
          onClose={() => setShowConnectModal(false)}
          onConnected={fetchEmails}
        />
      )}
    </div>
  );
}
