import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MailOpen, RefreshCw, ChevronRight, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';

export default function Emails() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterState, setFilterState] = useState('ALL');

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

        <button
          onClick={fetchEmails}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Mailbox</span>
        </button>
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
        <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-slate-400 text-sm">
          No emails found.
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
    </div>
  );
}
