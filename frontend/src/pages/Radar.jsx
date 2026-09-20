import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, ArrowRight, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import DeadlineBadge from '../components/DeadlineBadge';
import RiskIndicator from '../components/RiskIndicator';

export default function Radar() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRadar = async () => {
    setLoading(true);
    try {
      const res = await api.getRadar();
      setItems(res.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRadar();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">What Am I About to Miss?</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Dedicated triage view prioritizing unopened critical emails and impending deadlines
          </p>
        </div>

        <button
          onClick={fetchRadar}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Radar</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">Scanning impending risks...</div>
      ) : items.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-200">You Are Fully Guarded!</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No critical unread messages or impending deadlines detected right now.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-gradient-to-r from-rose-950/30 via-slate-900 to-slate-950 border border-rose-800/40 shadow-xl space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-rose-900/30">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-rose-400">#{idx + 1} PRIORITY</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                    {item.category}
                  </span>
                  <RiskIndicator score={item.urgency_score} level={item.urgency_level} />
                  {item.status === 'UNOPENED' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                      UNOPENED EMAIL
                    </span>
                  )}
                </div>

                <DeadlineBadge deadline={item.deadline} />
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-100">{item.title}</h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  {item.summary}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Status: <strong className="text-slate-200">{item.status.replace('_', ' ')}</strong>
                </span>

                <Link
                  to={`/emails/${item.email_id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all hover:scale-105"
                >
                  <span>Take Immediate Action</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
