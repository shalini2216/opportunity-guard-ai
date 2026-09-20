import React, { useState } from 'react';
import { FastForward, Play, RefreshCw, Sparkles, Mail, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { playAlertChime } from '../services/sound';

export default function EscalationSimulator({ onStateChange }) {
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const handleFastForward = async (minutes) => {
    setLoading(true);
    setStatusMsg(`Simulating time advance (+${minutes}m)...`);
    try {
      const res = await api.fastForwardDemo(minutes);
      playAlertChime('high');
      setStatusMsg(`Time advanced +${minutes}m. Notifs sent: ${res.stats?.notifications_sent || 0}, Reminders stopped: ${res.stats?.reminders_stopped || 0}`);
      if (onStateChange) onStateChange();
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => setStatusMsg(''), 6000);
    }
  };

  const handleTriggerUrgentEmail = async () => {
    setLoading(true);
    setStatusMsg('Injecting incoming urgent email...');
    try {
      const res = await api.triggerUrgentEmail({
        subject: 'URGENT: Invitation for Meta Final Technical Interview - Slot Confirmation required in 24 hours',
        sender: 'recruiting@meta.com'
      });
      playAlertChime('critical');
      setStatusMsg('New urgent interview email injected and analyzed by OpportunityGuard AI!');
      if (onStateChange) onStateChange();
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => setStatusMsg(''), 6000);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset demo data to initial state?')) return;
    setLoading(true);
    try {
      await api.resetDemo();
      setStatusMsg('Demo dataset reset successfully.');
      if (onStateChange) onStateChange();
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => setStatusMsg(''), 4000);
    }
  };

  return (
    <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900 to-purple-950/70 border border-indigo-500/30 rounded-2xl p-4 shadow-xl backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-900/40">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-400">
            <FastForward className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-slate-100">Opportunity Protection Time-Travel Simulator</h4>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold">
                Evaluation Accelerator
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Fast-forward escalation intervals (T+30m, T+2h, T+6h, T+12h) to verify persistent reminder cycles live
            </p>
          </div>
        </div>

        <button
          onClick={handleReset}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset Demo</span>
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-400 mr-1 flex items-center gap-1">
          <Play className="w-3 h-3 text-indigo-400" /> Fast Forward:
        </span>
        <button
          onClick={() => handleFastForward(30)}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600/30 text-indigo-200 border border-indigo-500/50 hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50"
        >
          +30 Mins (Step 1)
        </button>
        <button
          onClick={() => handleFastForward(120)}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600/30 text-indigo-200 border border-indigo-500/50 hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50"
        >
          +2 Hours (Step 2)
        </button>
        <button
          onClick={() => handleFastForward(360)}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-600/30 text-purple-200 border border-purple-500/50 hover:bg-purple-600 hover:text-white transition-all disabled:opacity-50"
        >
          +6 Hours (Step 3)
        </button>
        <button
          onClick={() => handleFastForward(720)}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-600/30 text-rose-200 border border-rose-500/50 hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50"
        >
          +12 Hours (Step 4)
        </button>

        <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

        <button
          onClick={handleTriggerUrgentEmail}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-200 border border-amber-500/40 hover:bg-amber-500/30 transition-all disabled:opacity-50"
        >
          <Mail className="w-3.5 h-3.5 text-amber-400" />
          <span>Simulate Urgent Incoming Email</span>
        </button>
      </div>

      {statusMsg && (
        <div className="mt-3 p-2.5 rounded-lg bg-indigo-950/80 border border-indigo-700/60 text-xs text-indigo-200 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}
    </div>
  );
}
