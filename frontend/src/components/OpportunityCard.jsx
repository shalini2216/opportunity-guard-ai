import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckCircle, Clock, ExternalLink, Calendar, MessageSquare, 
  ChevronRight, AlertTriangle, BellOff, CalendarPlus, Sparkles 
} from 'lucide-react';
import RiskIndicator from './RiskIndicator';
import DeadlineBadge from './DeadlineBadge';
import EditDeadlineModal from './EditDeadlineModal';
import QuickReplyModal from './QuickReplyModal';
import { api } from '../services/api';

const CATEGORY_COLORS = {
  EXAM: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  INTERVIEW: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  INTERNSHIP: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  JOB: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  ASSIGNMENT: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  REGISTRATION: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  MEETING: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  COLLEGE: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
  EVENT: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
  FINANCE: 'bg-green-500/20 text-green-300 border-green-500/40',
  SECURITY: 'bg-red-500/20 text-red-300 border-red-500/40',
  GENERAL: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
  OTHER: 'bg-slate-700/20 text-slate-400 border-slate-700/40',
};

export default function OpportunityCard({ opportunity, onActionCompleted }) {
  const [showEditDeadline, setShowEditDeadline] = useState(false);
  const [showQuickReply, setShowQuickReply] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  const isCompleted = opportunity.status === 'COMPLETED';
  const isUnopened = opportunity.status === 'UNOPENED';
  const catColor = CATEGORY_COLORS[opportunity.category] || CATEGORY_COLORS.GENERAL;

  const handleComplete = async (e) => {
    e.stopPropagation();
    setLoadingAction(true);
    try {
      await api.completeOpportunity(opportunity.id);
      if (onActionCompleted) onActionCompleted();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSnooze = async (minutes) => {
    setLoadingAction(true);
    try {
      await api.snoozeOpportunity(opportunity.id, minutes);
      alert(`Reminders snoozed for ${minutes >= 60 ? `${minutes / 60} hours` : `${minutes} minutes`}`);
      if (onActionCompleted) onActionCompleted();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleGoogleCalendar = async (e) => {
    e.stopPropagation();
    try {
      const res = await api.getGoogleCalendarUrl(opportunity.id);
      if (res.google_calendar_url) {
        window.open(res.google_calendar_url, '_blank');
      }
    } catch (err) {
      alert('Could not generate calendar link: ' + err.message);
    }
  };

  return (
    <>
      <div className={`p-5 rounded-2xl border transition-all duration-200 ${
        isUnopened 
          ? 'bg-slate-900/90 border-indigo-500/50 shadow-lg shadow-indigo-950/20 hover:border-indigo-400' 
          : isCompleted 
            ? 'bg-slate-950/50 border-slate-800/80 opacity-70' 
            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/60">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${catColor}`}>
              {opportunity.category}
            </span>
            <RiskIndicator 
              score={opportunity.urgency_score} 
              level={opportunity.urgency_level} 
              reasons={opportunity.urgency_reasons} 
            />
            {isUnopened && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 animate-pulse">
                UNREAD EMAIL
              </span>
            )}
            {opportunity.status === 'ACTION_PENDING' && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                ACTION PENDING
              </span>
            )}
            {isCompleted && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                COMPLETED
              </span>
            )}
          </div>

          <DeadlineBadge 
            deadline={opportunity.deadline} 
            rawDeadline={opportunity.raw_deadline}
            isLowConfidence={opportunity.is_low_confidence}
            onEdit={() => setShowEditDeadline(true)}
          />
        </div>

        <div className="mt-3">
          <h3 className="text-base font-semibold text-slate-100 group-hover:text-indigo-400">
            {opportunity.title}
          </h3>
          {opportunity.sender && (
            <p className="text-xs text-slate-400 mt-0.5">
              From: <span className="text-slate-300 font-mono">{opportunity.sender}</span>
            </p>
          )}
          <p className="text-sm text-slate-300 mt-2 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
            {opportunity.summary}
          </p>
        </div>

        {/* Extracted Links */}
        {opportunity.links && opportunity.links.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {opportunity.links.map((link, idx) => (
              <a
                key={idx}
                href={link.url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-indigo-600 hover:text-white text-indigo-300 border border-slate-700 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{link.label}</span>
              </a>
            ))}
          </div>
        )}

        {/* Actions bar */}
        <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {!isCompleted ? (
              <button
                onClick={handleComplete}
                disabled={loadingAction}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Mark as Completed</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                <CheckCircle className="w-4 h-4" /> Reminders stopped
              </span>
            )}

            {!isCompleted && (
              <div className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-800/60 p-0.5">
                <button
                  onClick={() => handleSnooze(120)}
                  disabled={loadingAction}
                  className="px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
                >
                  Snooze 2h
                </button>
                <button
                  onClick={() => handleSnooze(720)}
                  disabled={loadingAction}
                  className="px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
                >
                  Snooze 12h
                </button>
              </div>
            )}

            {opportunity.deadline && (
              <button
                onClick={handleGoogleCalendar}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/60 hover:bg-slate-700 border border-slate-700 transition-colors"
                title="Add to Google Calendar"
              >
                <CalendarPlus className="w-3.5 h-3.5 text-blue-400" />
                <span>Add to G-Cal</span>
              </button>
            )}

            {opportunity.quick_replies && opportunity.quick_replies.length > 0 && (
              <button
                onClick={() => setShowQuickReply(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-indigo-300 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-700/50 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>AI Reply Drafts</span>
              </button>
            )}
          </div>

          <Link
            to={`/emails/${opportunity.email_id}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <span>View Full Email</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {showEditDeadline && (
        <EditDeadlineModal 
          opportunity={opportunity} 
          onClose={() => setShowEditDeadline(false)} 
          onUpdated={onActionCompleted} 
        />
      )}

      {showQuickReply && (
        <QuickReplyModal 
          opportunity={opportunity} 
          onClose={() => setShowQuickReply(false)} 
        />
      )}
    </>
  );
}
