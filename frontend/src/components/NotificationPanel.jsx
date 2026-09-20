import React from 'react';
import { Bell, CheckCheck, ShieldAlert, Clock, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

export default function NotificationPanel({ notifications = [], unreadCount = 0, onClose, onRefresh }) {
  const handleMarkRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-96 max-w-[92vw] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-indigo-400" />
          <h4 className="text-sm font-semibold text-slate-100">Notifications</h4>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
              {unreadCount} unread
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/60">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No notifications yet. You're completely up to date!
          </div>
        ) : (
          notifications.map((notif) => {
            const isUnread = notif.status === 'UNREAD';
            return (
              <div
                key={notif.id}
                className={`p-3.5 transition-colors ${isUnread ? 'bg-indigo-950/20' : 'bg-transparent hover:bg-slate-800/40'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <span className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${
                      notif.urgency_level === 'Critical' ? 'bg-rose-500' : isUnread ? 'bg-indigo-500' : 'bg-slate-600'
                    }`} />
                    <div>
                      <h5 className="text-xs font-semibold text-slate-200">{notif.title}</h5>
                      <p className="text-xs text-slate-400 mt-1 leading-snug">{notif.message}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] text-slate-500">
                          {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isUnread && (
                          <button
                            onClick={() => handleMarkRead(notif.id)}
                            className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 bg-slate-950 border-t border-slate-800 text-center">
        <Link
          to="/notifications"
          onClick={onClose}
          className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
        >
          View Notification Center →
        </Link>
      </div>
    </div>
  );
}
