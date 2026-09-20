import React, { useState, useEffect } from 'react';
import { History, AlertOctagon, RefreshCw, Info } from 'lucide-react';
import { api } from '../services/api';

export default function MissedHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.getMissedHistory();
      setHistory(res.history || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-6 h-6 text-slate-400" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">Missed Opportunity Retrospectives</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Historical analysis of opportunities that reached their expiration window without recorded completion
          </p>
        </div>

        <button
          onClick={fetchHistory}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Archive</span>
        </button>
      </div>

      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3 text-xs text-slate-400">
        <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <p>
          OpportunityGuard AI preserves expired opportunities using objective, constructive retrospectives to help fine-tune reminder schedules and reduce future oversight.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">Loading historical records...</div>
      ) : history.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-slate-400 text-sm">
          No missed opportunities recorded! All tracked deadlines were either acted on or remain active.
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {item.category}
                </span>

                <span className="text-xs text-slate-400 font-mono">
                  Expired on: {item.expired_at ? new Date(item.expired_at).toLocaleString() : 'N/A'}
                </span>
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-200">{item.title}</h3>
                <p className="text-xs text-slate-400 mt-1 italic">
                  "{item.neutral_statement}"
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-500">
                <span>Reminders Dispatched: <strong className="text-slate-300">{item.reminder_count}</strong></span>
                <span>Deadline: <strong className="text-slate-300">{item.deadline ? new Date(item.deadline).toLocaleString() : 'N/A'}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
