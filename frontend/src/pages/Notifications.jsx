import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Trash2, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications || []);
      setUnreadCount(res.unread_count || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      fetchNotifs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      fetchNotifs();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-6 h-6 text-indigo-400" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">Notification Center</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Audit history of escalated reminders, deadline alerts, and attention pings
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark All Read ({unreadCount})</span>
            </button>
          )}

          <button
            onClick={fetchNotifs}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">Loading notification feed...</div>
      ) : notifications.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-slate-400 text-sm">
          No notifications recorded yet.
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const isUnread = n.status === 'UNREAD';
            return (
              <div
                key={n.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isUnread
                    ? 'bg-slate-900/90 border-indigo-500/40 shadow-md shadow-indigo-950/20'
                    : 'bg-slate-950/60 border-slate-850'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        n.urgency_level === 'Critical' ? 'bg-rose-500' : isUnread ? 'bg-indigo-400' : 'bg-slate-600'
                      }`} />
                      <h4 className="text-sm font-semibold text-slate-200">{n.title}</h4>
                      {isUnread && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed pl-4">{n.message}</p>
                    <span className="text-[10px] text-slate-500 block pl-4 pt-1 font-mono">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>

                  {isUnread && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors shrink-0"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
