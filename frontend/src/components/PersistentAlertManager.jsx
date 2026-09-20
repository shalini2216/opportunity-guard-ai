import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, BellRing, ExternalLink, Clock, Volume2, VolumeX, Eye, X, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { playAlertChime } from '../services/sound';

export default function PersistentAlertManager() {
  const navigate = useNavigate();
  const [criticalItem, setCriticalItem] = useState(null);
  const [unopenedCount, setUnopenedCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [snoozedUntil, setSnoozedUntil] = useState(0);
  const [browserPermission, setBrowserPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  const checkIntervalRef = useRef(null);
  const chimeIntervalRef = useRef(null);

  // Request native browser notification permission
  const requestBrowserPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const perm = await Notification.requestPermission();
        setBrowserPermission(perm);
      } catch (err) {
        console.warn('Browser notification permission request failed:', err);
      }
    }
  };

  const checkForUnopenedAlerts = async () => {
    // If user snoozed alerts temporarily, don't show or chime
    if (Date.now() < snoozedUntil) {
      return;
    }

    try {
      const res = await api.getRadar();
      const items = res.items || [];

      // Filter specifically for UNOPENED opportunities as requested by the user:
      // "if there is an alerts. give continous pop up messages util i opend it"
      const unopenedList = items.filter((item) => item.status === 'UNOPENED');
      setUnopenedCount(unopenedList.length);

      if (unopenedList.length > 0) {
        // Find highest urgency among unopened items
        const target = unopenedList.reduce(
          (max, it) => ((it.urgency_score || 0) > (max.urgency_score || 0) ? it : max),
          unopenedList[0]
        );

        setCriticalItem(target);

        // Chime immediately on initial trigger
        if (soundEnabled) {
          playAlertChime('critical');
        }

        // Show native browser notification if allowed
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(`⚠️ UNOPENED ALERT: ${target.category}`, {
              body: `"${target.title}" is unopened! OpportunityGuard reminders will persist until you open this email.`,
              icon: '/favicon.svg',
              tag: `unopened-${target.id}`
            });
          } catch (e) {
            // Ignore notification construction error
          }
        }
      } else {
        // If all opportunities are opened, clear the critical alert popup immediately
        setCriticalItem(null);
      }
    } catch (err) {
      // Backend temporarily unreachable; will retry on next interval
    }
  };

  useEffect(() => {
    requestBrowserPermission();
    checkForUnopenedAlerts();

    // Check every 10 seconds for real-time responsiveness
    checkIntervalRef.current = setInterval(checkForUnopenedAlerts, 10000);

    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      if (chimeIntervalRef.current) clearInterval(chimeIntervalRef.current);
    };
  }, [snoozedUntil, soundEnabled]);

  // Repeated audio chime every 20 seconds while an urgent unopened item is active
  useEffect(() => {
    if (criticalItem && soundEnabled && Date.now() >= snoozedUntil) {
      chimeIntervalRef.current = setInterval(() => {
        playAlertChime('critical');
      }, 20000);
    } else {
      if (chimeIntervalRef.current) clearInterval(chimeIntervalRef.current);
    }
    return () => {
      if (chimeIntervalRef.current) clearInterval(chimeIntervalRef.current);
    };
  }, [criticalItem, soundEnabled, snoozedUntil]);

  const handleOpenNow = () => {
    if (!criticalItem) return;
    const targetEmailId = criticalItem.email_id;
    // Dismiss the banner immediately as navigation to email detail page marks it OPENED
    setCriticalItem(null);
    navigate(`/emails/${targetEmailId}`);
  };

  const handleSnooze = (minutes = 10) => {
    const until = Date.now() + minutes * 60 * 1000;
    setSnoozedUntil(until);
    setCriticalItem(null);
  };

  if (!criticalItem || Date.now() < snoozedUntil) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full p-2 animate-in slide-in-from-bottom-8 fade-in duration-300">
      <div className="relative rounded-2xl bg-slate-950/95 border-2 border-rose-500 p-5 shadow-2xl shadow-rose-950/80 backdrop-blur-xl">
        {/* Pulsing ring around modal */}
        <div className="absolute -inset-1 rounded-2xl bg-rose-600/30 blur-md -z-10 animate-pulse" />

        <div className="flex items-start justify-between gap-3 pb-3 border-b border-rose-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-600/30 text-rose-400 border border-rose-500/60 animate-bounce">
              <BellRing className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-rose-500 text-white tracking-wide">
                  CONTINUOUS ALERT
                </span>
                <span className="text-[10px] text-amber-300 font-bold tracking-tight animate-pulse">
                  PERSISTING UNTIL OPENED
                </span>
                {unopenedCount > 1 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {unopenedCount} Unopened
                  </span>
                )}
              </div>
              <h4 className="text-sm font-bold text-slate-100 mt-1 line-clamp-1">
                {criticalItem.category}: {criticalItem.title}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute alert chime' : 'Enable alert chime'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-rose-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
            <button
              onClick={() => handleSnooze(10)}
              title="Snooze alerts for 10 minutes"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mt-3 space-y-2.5">
          <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/90 p-3 rounded-xl border border-slate-800 line-clamp-3">
            {criticalItem.summary}
          </p>

          <div className="flex items-center justify-between text-xs px-1">
            <span className="flex items-center gap-1 text-amber-400 font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>Status: Unopened Email</span>
            </span>
            <span className="font-mono text-rose-400 font-bold">
              Urgency: {criticalItem.urgency_score}/100
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-rose-900/40 flex items-center justify-between gap-2">
          <button
            onClick={() => handleSnooze(10)}
            className="px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800 transition-colors"
          >
            Snooze 10m
          </button>

          <button
            onClick={handleOpenNow}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/70 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Eye className="w-4 h-4" />
            <span>Open & Review Now (Stops Alerts)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
