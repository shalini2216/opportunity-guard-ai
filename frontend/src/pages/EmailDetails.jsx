import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Mail, Clock, ExternalLink, CheckCircle2, 
  Sparkles, CalendarPlus, ShieldAlert, AlertCircle 
} from 'lucide-react';
import RiskIndicator from '../components/RiskIndicator';
import DeadlineBadge from '../components/DeadlineBadge';
import EditDeadlineModal from '../components/EditDeadlineModal';
import QuickReplyModal from '../components/QuickReplyModal';
import { api } from '../services/api';

export default function EmailDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditDeadline, setShowEditDeadline] = useState(false);
  const [showQuickReply, setShowQuickReply] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const res = await api.getEmailDetails(id);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load email');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleStateChange = async (newState) => {
    try {
      await api.updateEmailState(id, newState);
      setActionMessage(`State transitioned to ${newState}. Persistent unread reminders updated.`);
      fetchDetails();
      setTimeout(() => setActionMessage(''), 5000);
    } catch (err) {
      alert(`Error updating state: ${err.message}`);
    }
  };

  const handleComplete = async () => {
    if (!data?.opportunity?.id) return;
    try {
      await api.completeOpportunity(data.opportunity.id);
      setActionMessage('Opportunity marked as Completed! All related reminders stopped.');
      fetchDetails();
      setTimeout(() => setActionMessage(''), 5000);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleStillNeedAction = async () => {
    if (!data?.opportunity?.id) return;
    try {
      await api.stillNeedAction(data.opportunity.id);
      setActionMessage('Action marked pending. Approaching deadline reminders will alert you.');
      fetchDetails();
      setTimeout(() => setActionMessage(''), 5000);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500 text-sm">Loading email details...</div>;
  }

  if (error || !data) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
        <p className="text-rose-400 text-sm">{error || 'Email record not found'}</p>
        <Link to="/emails" className="inline-flex items-center gap-1.5 text-xs text-indigo-400">
          <ArrowLeft className="w-4 h-4" /> Back to Inbox
        </Link>
      </div>
    );
  }

  const { email, opportunity } = data;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <Link
          to="/emails"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Emails
        </Link>

        {opportunity && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Read State:</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {email.read_state}
            </span>
          </div>
        )}
      </div>

      {actionMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* AI Extraction Banner */}
      {opportunity && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-purple-950/60 border border-indigo-500/30 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-900/40">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-indigo-600/30 text-indigo-200 border border-indigo-500/40">
                {opportunity.category}
              </span>
              <RiskIndicator
                score={opportunity.urgency_score}
                level={opportunity.urgency_level}
                reasons={opportunity.urgency_reasons}
              />
              <span className="text-xs text-slate-400">
                Action Status: <strong className="text-slate-200">{opportunity.action_status}</strong>
              </span>
            </div>

            <DeadlineBadge
              deadline={opportunity.deadline}
              rawDeadline={opportunity.raw_deadline}
              isLowConfidence={opportunity.is_low_confidence}
              onEdit={() => setShowEditDeadline(true)}
            />
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>AI Opportunity Summary</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-950/60 p-3.5 rounded-xl border border-indigo-900/40 font-sans">
              {opportunity.summary}
            </p>
          </div>

          {/* Action Tracking Bar (PDF Section 11) */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-indigo-900/30">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleComplete}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-900/30"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark as Completed</span>
              </button>

              <button
                onClick={handleStillNeedAction}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 transition-colors"
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Still Need to Act</span>
              </button>

              {opportunity.quick_replies && opportunity.quick_replies.length > 0 && (
                <button
                  onClick={() => setShowQuickReply(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>AI Reply Drafts</span>
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-400 italic">
              Opening this email automatically halted unread reminders.
            </p>
          </div>
        </div>
      )}

      {/* Original Email Content */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">{email.subject}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <div>From: <span className="text-slate-200 font-mono">{email.sender}</span></div>
            <div>Received: <span className="text-slate-200">{new Date(email.received_at).toLocaleString()}</span></div>
          </div>
        </div>

        {/* Extracted Links Section */}
        {opportunity?.links && opportunity.links.length > 0 && (
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs font-semibold text-slate-300 block mb-2">Verified Action Links:</span>
            <div className="flex flex-wrap gap-2">
              {opportunity.links.map((lnk, idx) => (
                <a
                  key={idx}
                  href={lnk.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-950/40 text-indigo-300 border border-indigo-800/60 hover:bg-indigo-900/60 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{lnk.label}: {lnk.url.slice(0, 45)}...</span>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-800">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Message Body</h4>
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800/80 font-mono text-xs sm:text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
            {email.body_text}
          </div>
        </div>
      </div>

      {showEditDeadline && (
        <EditDeadlineModal
          opportunity={opportunity}
          onClose={() => setShowEditDeadline(false)}
          onUpdated={fetchDetails}
        />
      )}

      {showQuickReply && (
        <QuickReplyModal
          opportunity={opportunity}
          onClose={() => setShowQuickReply(false)}
        />
      )}
    </div>
  );
}
