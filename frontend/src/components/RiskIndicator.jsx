import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, ShieldCheck, Info } from 'lucide-react';

export default function RiskIndicator({ score = 0, level = 'Normal', reasons = [], size = 'md' }) {
  const [showTooltip, setShowTooltip] = useState(false);

  let colorClasses = 'text-slate-400 bg-slate-800/80 border-slate-700';
  let badgeColor = 'bg-slate-500';

  if (score >= 80 || level === 'Critical') {
    colorClasses = 'text-rose-400 bg-rose-950/40 border-rose-800/60';
    badgeColor = 'bg-rose-500';
  } else if (score >= 60 || level === 'High') {
    colorClasses = 'text-amber-400 bg-amber-950/40 border-amber-800/60';
    badgeColor = 'bg-amber-500';
  } else if (score >= 40 || level === 'Medium') {
    colorClasses = 'text-yellow-400 bg-yellow-950/40 border-yellow-800/60';
    badgeColor = 'bg-yellow-500';
  } else if (score >= 20 || level === 'Low') {
    colorClasses = 'text-blue-400 bg-blue-950/40 border-blue-800/60';
    badgeColor = 'bg-blue-500';
  }

  const isSmall = size === 'sm';

  return (
    <div className="relative inline-flex items-center">
      <div 
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold tracking-wide ${colorClasses} cursor-help transition-all hover:scale-105`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
      >
        <span className={`w-2 h-2 rounded-full ${badgeColor} ${score >= 60 ? 'animate-ping' : ''}`} />
        <span>{level.toUpperCase()}</span>
        <span className="font-mono opacity-80">({score})</span>
        <Info className="w-3 h-3 ml-0.5 opacity-60" />
      </div>

      {showTooltip && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-64 p-3 bg-slate-900 border border-slate-700 rounded-lg shadow-xl text-xs text-slate-300">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
            <span className="font-semibold text-slate-100">Opportunity Urgency Score: {score}/100</span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">{level}</span>
          </div>
          {reasons && reasons.length > 0 ? (
            <ul className="space-y-1 text-[11px]">
              {reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-1">
                  <span className="text-indigo-400">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-slate-400">Score evaluated dynamically based on category, deadline proximity, read state, and reminder count.</p>
          )}
        </div>
      )}
    </div>
  );
}
