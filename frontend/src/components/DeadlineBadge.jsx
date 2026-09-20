import React from 'react';
import { Clock, AlertCircle, Edit3 } from 'lucide-react';

export default function DeadlineBadge({ deadline, rawDeadline, isLowConfidence = false, onEdit = null }) {
  if (!deadline && !rawDeadline) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-500 italic">
        <Clock className="w-3.5 h-3.5" /> No deadline specified
      </span>
    );
  }

  let formattedDate = rawDeadline || deadline;
  let isExpired = false;
  let isImminent = false; // <24h
  let isCritical = false; // <6h
  let timeRemainingStr = '';

  if (deadline) {
    try {
      const dt = new Date(deadline);
      const now = new Date();
      const diffMs = dt - now;
      const diffHours = diffMs / (1000 * 60 * 60);

      formattedDate = dt.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      if (diffMs <= 0) {
        isExpired = true;
        timeRemainingStr = 'Expired';
      } else if (diffHours < 6) {
        isCritical = true;
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        timeRemainingStr = `${Math.floor(diffHours)}h ${mins}m left`;
      } else if (diffHours < 24) {
        isImminent = true;
        timeRemainingStr = `${Math.floor(diffHours)}h left`;
      } else {
        const days = Math.floor(diffHours / 24);
        timeRemainingStr = `${days}d left`;
      }
    } catch {
      formattedDate = rawDeadline || deadline;
    }
  }

  let colorClasses = 'bg-slate-800/80 text-slate-300 border-slate-700';
  if (isExpired) {
    colorClasses = 'bg-rose-950/60 text-rose-300 border-rose-800/80';
  } else if (isCritical) {
    colorClasses = 'bg-rose-900/50 text-rose-200 border-rose-700 animate-pulse';
  } else if (isImminent) {
    colorClasses = 'bg-amber-950/50 text-amber-200 border-amber-700';
  }

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${colorClasses}`}>
        <Clock className="w-3.5 h-3.5" />
        <span>{formattedDate}</span>
        {timeRemainingStr && (
          <span className="font-semibold px-1.5 py-0.5 rounded bg-black/40 text-[10px]">
            {timeRemainingStr}
          </span>
        )}
      </div>

      {isLowConfidence && (
        <button
          onClick={onEdit}
          title="Extracted with low confidence. Click to confirm or adjust."
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors"
        >
          <AlertCircle className="w-3 h-3 text-amber-400" />
          <span>Confirm Date</span>
          <Edit3 className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
}
