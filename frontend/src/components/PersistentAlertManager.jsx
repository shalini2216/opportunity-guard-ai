import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, BellRing, ExternalLink, Clock, Volume2, VolumeX, Eye, X } from 'lucide-react';
import { api } from '../services/api';
import { playAlertChime } from '../services/sound';

export default function PersistentAlertManager() {
  const navigate = useNavigate();
  const [criticalItem, setCriticalItem] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [snoozedUntil, setSnoozedUntil] = useState(0);
  const [browserPermission, setBrowserPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  const checkIntervalRef = useRef(null);
  const chimeIntervalRef = useRef(null);

  // Request browser notification permission
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
    // If currently snoozed by user, skip
    if (Date.now() < snoozedUntil) {
      return;
    }

    try {
      const res = await api.getRadar();
      const items = res.items || [];
      // Find the most urgent unopened or high urgency opportunity
      const mostUrgent = items.find(
        (item) => item.status === 'UNOPENED' || item.urgency_score >= 70
      );

      if (mostUrgent) {
        setCriticalItem(mostUrgent);
        // Play alert tone if sound is enabled
        if (soundEnabled) {
          playAlertChime('critical');
        }

        // Show native browser notification if enabled
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(`⚠️ CRITICAL ALERT: ${mostUrgent.category}`, {
              body: `Unopened time-sensitive opportunity: "${mostUrgent.title}". Reminders will persist until opened!`,
              icon: '/favicon.svg',
              tag: `opp-${mostUrgent.id}`
            });
          } catch (e) {
            // Ignore native notification error
          }
        }
      } else {
        setCriticalItem(null);
      }
    } catch (err) {
      // Backend maybe temporarily unreachable
    }
  };

  useEffect(() => {
    requestBrowserPermission();
    checkForUnopenedAlerts();

    // Check radar every 15 seconds
    checkIntervalRef.current = setInterval(checkForUnopenedAlerts, 15000);

    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      if (chimeIntervalRef.current) clearInterval(chimeIntervalRef.current);
    };
  }, [snoozedUntil, soundEnabled]);

  // Repeated audio chime every 25 seconds while an urgent unopened item is active
  useEffect(() => {
    if (criticalItem && soundEnabled && Date.now() >= snoozedUntil) {
      chimeIntervalRef.current = setInterval(() => {
        playAlertChime('critical');
      }, 25000);
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
    // Dismiss the current banner state as opening the page will mark it OPENED
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
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full p-1 animate-in slide-in-from-bottom-8 fade-in duration-300">
      <div className="relative rounded-2xl bg-slate-950 border-2 border-rose-500/80 p-5 shadow-2xl shadow-rose-950/60 backdrop-blur-xl">
        {/* Pulsing glow background indicator */}
        <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 opacity-30 blur-xs -z-10 animate-pulse" />

        <div className="flex items-start justify-between gap-3 pb-3 border-b border-rose-900/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-600/30 text-rose-400 border border-rose-500/50 animate-bounce">
              <BellRing className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-500/30 text-rose-200 border border-rose-500/50">
                  CONTINUOUS ALERT
                </span>
                <span className="text-[10px] text-amber-300 font-semibold animate-pulse">
                  PERSISTING UNTIL OPENED
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-100 mt-1">
                {criticalItem.category}: {criticalItem.title}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute alert sound' : 'Enable alert sound'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-rose-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
            <button
              onClick={() => handleSnooze(10)}
              title="Snooze alert for 10 minutes"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-3 rounded-xl border border-slate-800">
            {criticalItem.summary}
          </p>

          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="flex items-center gap-1 text-amber-300 font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>{criticalItem.status === 'UNOPENED' ? 'Status: Unopened Email' : 'Action Pending'}</span>
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
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/50 transition-all hover:scale-105"
          >
            <Eye className="w-4 h-4" />
            <span>Open & Review Now (Stops Alerts)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
