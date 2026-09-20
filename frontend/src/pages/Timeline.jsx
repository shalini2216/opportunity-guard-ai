import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import DeadlineBadge from '../components/DeadlineBadge';
import RiskIndicator from '../components/RiskIndicator';

export default function Timeline() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const res = await api.getOpportunities();
        // filter those with deadlines, sorted by deadline asc
        const withDeadlines = (res.opportunities || [])
          .filter(o => o.deadline)
          .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
        setOpportunities(withDeadlines);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTimeline();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-indigo-400" />
          <span>Opportunity & Deadline Timeline</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Chronological milestone progression for high-stakes exams, submissions, and interviews
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">Building chronological timeline...</div>
      ) : opportunities.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-slate-400 text-sm">
          No deadlines currently scheduled.
        </div>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
          {opportunities.map((opp) => {
            const isCompleted = opp.status === 'COMPLETED';
            return (
              <div key={opp.id} className="relative group">
                {/* Timeline node */}
                <div className={`absolute -left-6 top-4 w-3.5 h-3.5 rounded-full border-2 ${
                  isCompleted 
                    ? 'bg-emerald-500 border-slate-950' 
                    : opp.urgency_score >= 80 
                      ? 'bg-rose-500 border-slate-950 animate-ping' 
                      : 'bg-indigo-500 border-slate-950'
                }`} />

                <div className={`p-5 rounded-2xl border transition-all ${
                  isCompleted ? 'bg-slate-950/40 border-slate-800/60 opacity-60' : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        {opp.category}
                      </span>
                      <RiskIndicator score={opp.urgency_score} level={opp.urgency_level} />
                    </div>
                    <DeadlineBadge deadline={opp.deadline} rawDeadline={opp.raw_deadline} />
                  </div>

                  <h3 className="text-base font-semibold text-slate-100 mt-2">{opp.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{opp.summary}</p>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      Status: <strong className="text-slate-300">{opp.status}</strong>
                    </span>

                    <Link
                      to={`/emails/${opp.email_id}`}
                      className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <span>Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
