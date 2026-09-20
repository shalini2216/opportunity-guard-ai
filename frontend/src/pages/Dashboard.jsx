import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, ShieldAlert, MailWarning, Clock, CheckCircle2, 
  Sparkles, RefreshCw, Filter, ArrowRight 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import OpportunityCard from '../components/OpportunityCard';
import EscalationSimulator from '../components/EscalationSimulator';
import { api } from '../services/api';

export default function Dashboard() {
  const [opportunities, setOpportunities] = useState([]);
  const [radarItems, setRadarItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('ALL');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [oppRes, radarRes] = await Promise.all([
        api.getOpportunities(),
        api.getRadar()
      ]);
      setOpportunities(oppRes.opportunities || []);
      setRadarItems(radarRes.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute metrics
  const criticalCount = opportunities.filter(o => o.urgency_score >= 80 && o.status !== 'COMPLETED').length;
  const unopenedCount = opportunities.filter(o => o.status === 'UNOPENED').length;
  const actionPendingCount = opportunities.filter(o => o.status === 'ACTION_PENDING').length;
  const completedCount = opportunities.filter(o => o.status === 'COMPLETED').length;

  const filteredOpps = filterCategory === 'ALL' 
    ? opportunities 
    : opportunities.filter(o => o.category === filterCategory);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Executive Opportunity Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time deadline surveillance, unopened mail tracking, and automated reminder escalation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Triage</span>
          </button>
        </div>
      </div>

      {/* Simulator Accelerator */}
      <EscalationSimulator onStateChange={fetchData} />

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">Critical Urgency Items</span>
            <div className="text-2xl font-bold text-rose-400 mt-1">{criticalCount}</div>
            <span className="text-[10px] text-rose-500/80 font-mono">Score 80-100</span>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">Unopened Messages</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">{unopenedCount}</div>
            <span className="text-[10px] text-amber-500/80 font-mono">Escalating T+0..T+12h</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <MailWarning className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">Action Pending Tasks</span>
            <div className="text-2xl font-bold text-indigo-400 mt-1">{actionPendingCount}</div>
            <span className="text-[10px] text-indigo-500/80 font-mono">Opened, action due</span>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">Completed Opportunities</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{completedCount}</div>
            <span className="text-[10px] text-emerald-500/80 font-mono">Reminders Stopped</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Prominent "What Am I About to Miss?" View (PDF Section 13 & 14) */}
      {radarItems.length > 0 && (
        <section className="rounded-2xl border border-rose-500/40 bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-950 p-5 shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-rose-900/40 mb-4">
            <div className="flex items-center gap-2.5 text-rose-400">
              <div className="p-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 animate-pulse">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-100">What Am I About to Miss?</h2>
                <p className="text-xs text-rose-300/80">
                  Critical attention triage: unopened time-sensitive emails & approaching deadlines
                </p>
              </div>
            </div>

            <Link
              to="/radar"
              className="inline-flex items-center gap-1 text-xs font-semibold text-rose-300 hover:text-rose-200"
            >
              <span>Full Radar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {radarItems.slice(0, 4).map((item) => (
              <div key={item.id} className="p-4 rounded-xl bg-slate-950/80 border border-rose-900/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {item.category}
                    </span>
                    <span className="text-xs font-mono font-bold text-rose-400">
                      Urgency {item.urgency_score}/100
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-200 line-clamp-1">{item.title}</h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{item.summary}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-amber-300 font-mono">
                    {item.status === 'UNOPENED' ? '⚠️ UNOPENED EMAIL' : '⏳ Action Pending'}
                  </span>
                  <Link
                    to={`/emails/${item.email_id}`}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    Open & Review →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Opportunities Feed */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span>Tracked Opportunities</span>
            <span className="text-xs font-normal text-slate-400">({filteredOpps.length})</span>
          </h2>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {['ALL', 'EXAM', 'INTERNSHIP', 'JOB', 'INTERVIEW', 'ASSIGNMENT', 'REGISTRATION'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors shrink-0 ${
                  filterCategory === cat
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
            Evaluating opportunity pipeline...
          </div>
        ) : filteredOpps.length === 0 ? (
          <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-slate-400 text-sm">
            No opportunities found matching filter.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOpps.map((opp) => (
              <OpportunityCard
                key={opp.id}
                opportunity={opp}
                onActionCompleted={fetchData}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
