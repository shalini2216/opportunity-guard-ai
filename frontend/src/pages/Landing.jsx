import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Shield, Clock, Sparkles, CheckCircle2, AlertTriangle, ArrowRight, 
  Lock, Mail, BellRing, Calendar, ChevronDown, ChevronUp, Layers 
} from 'lucide-react';
import { api } from '../services/api';

export default function Landing() {
  const navigate = useNavigate();
  const [demoLoading, setDemoLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const handleInstantDemo = async () => {
    setDemoLoading(true);
    try {
      // Use or create demo user
      const demoEmail = 'evaluator@opportunityguard.ai';
      const demoPass = 'demo2026pass';
      try {
        const loginRes = await api.login(demoEmail, demoPass);
        localStorage.setItem('og_token', loginRes.token);
        localStorage.setItem('og_user', JSON.stringify(loginRes.user));
      } catch {
        // Register if not exists
        const regRes = await api.register('Demo Evaluator', demoEmail, demoPass);
        localStorage.setItem('og_token', regRes.token);
        localStorage.setItem('og_user', JSON.stringify(regRes.user));
      }
      // Seed demo data
      await api.seedDemo();
      navigate('/dashboard');
    } catch (err) {
      alert(`Could not start Demo: ${err.message}`);
    } finally {
      setDemoLoading(false);
    }
  };

  const FAQS = [
    {
      q: "How does OpportunityGuard AI differ from standard email reminders?",
      a: "OpportunityGuard AI is not a static reminder app. It is an Opportunity Protection Engine. It autonomously tracks whether you have actually opened an email, monitors your action status, and intelligently escalates reminders (T+0, T+30m, T+2h, T+6h, T+12h). Opening the mail halts unread alerts, but deadline reminders persist if your task is still pending."
    },
    {
      q: "Does OpportunityGuard AI require access to my Gmail password?",
      a: "Never. OpportunityGuard AI connects exclusively via official Google OAuth 2.0 with minimal read-only scopes. We never see or store your password, and you can revoke access or purge your data with a single click."
    },
    {
      q: "Can I test and evaluate the system without connecting real email credentials?",
      a: "Yes! OpportunityGuard AI includes a full zero-dependency Demo Mode loaded with realistic internship assessments, coding exams, and interview invitations, plus a Time-Travel simulator to fast-forward escalation stages in seconds."
    },
    {
      q: "What happens when a deadline passes without completion?",
      a: "The opportunity transitions to EXPIRED and enters the Missed Opportunity Archive with neutral retrospective analysis, helping you reflect on time-to-attention and workflow habits."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800/80 px-6 py-4 backdrop-blur-md sticky top-0 z-50 bg-slate-950/80">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
              OpportunityGuard AI
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-xs font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Sign In
            </Link>
            <button
              onClick={handleInstantDemo}
              disabled={demoLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{demoLoading ? 'Launching Demo...' : 'Instant Demo Mode'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="relative px-6 pt-20 pb-16 overflow-hidden text-center max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 mb-8">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI-Powered Opportunity Protection Engine</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-100 leading-tight">
            Never Miss an Important <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
              Opportunity Again.
            </span>
          </h1>

          <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Exams, internship assessments, interview invites, and registrations often get buried in busy inboxes.
            OpportunityGuard AI detects time-sensitive milestones, tracks your read state, and persistently escalates until action is recorded.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={handleInstantDemo}
              disabled={demoLoading}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/40 transition-all hover:scale-105 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{demoLoading ? 'Starting Interactive Evaluation...' : 'Launch Interactive Demo'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-colors"
            >
              <span>Create Account</span>
            </Link>
          </div>

          {/* Core Differentiation Badges */}
          <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-indigo-400 font-bold text-lg mb-1">T+0 to T+12h</div>
              <div className="text-xs text-slate-400">Autonomous persistent escalation until opened</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-purple-400 font-bold text-lg mb-1">0–100 Score</div>
              <div className="text-xs text-slate-400">Dynamic multi-factor urgency & risk indicator</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-amber-400 font-bold text-lg mb-1">Action Tracking</div>
              <div className="text-xs text-slate-400">Opening email halts unread alerts, tracks pending task</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-emerald-400 font-bold text-lg mb-1">Zero Lock-in</div>
              <div className="text-xs text-slate-400">1-click Google Calendar & .ics calendar sync</div>
            </div>
          </div>
        </section>

        {/* Workflow Diagram Section */}
        <section className="px-6 py-16 bg-slate-900/40 border-y border-slate-800/60">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-100">The Opportunity Protection Engine Workflow</h2>
              <p className="text-sm text-slate-400 mt-2">End-to-end continuous vigilance from inbox arrival to milestone completion</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-3">
                  <Mail className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-semibold text-slate-200">1. Email Detection</h4>
                <p className="text-xs text-slate-400 mt-2">Classifies exams, internships, interviews, and deadlines with hybrid AI & NLP.</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center mb-3">
                  <Clock className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-semibold text-slate-200">2. Deadline Extraction</h4>
                <p className="text-xs text-slate-400 mt-2">Parses exact & relative time windows with confidence scoring and user correction.</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center mb-3">
                  <BellRing className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-semibold text-slate-200">3. Persistent Reminders</h4>
                <p className="text-xs text-slate-400 mt-2">Dispatches notifications at T+0, T+30m, T+2h, T+6h, T+12h while unread.</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center mb-3">
                  <Layers className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-semibold text-slate-200">4. Action Monitoring</h4>
                <p className="text-xs text-slate-400 mt-2">Opening mail halts unread alerts, but deadline warnings continue while task is pending.</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-semibold text-slate-200">5. Clean Resolution</h4>
                <p className="text-xs text-slate-400 mt-2">Marking completed stops all alerts; passing deadlines log neutral retrospectives.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="px-6 py-16 max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-100">Frequently Asked Questions</h2>
            <p className="text-xs text-slate-400 mt-1">Everything you need to know about OpportunityGuard AI</p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => (
              <div key={idx} className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between text-sm font-medium text-slate-200 hover:text-white"
                >
                  <span>{faq.q}</span>
                  {openFaq === idx ? <ChevronUp className="w-4 h-4 text-indigo-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {openFaq === idx && (
                  <div className="px-4 pb-4 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 px-6 py-8 text-center text-xs text-slate-500">
        <p>© 2026 OpportunityGuard AI. Proactive opportunity protection for high-stakes milestones.</p>
      </footer>
    </div>
  );
}
