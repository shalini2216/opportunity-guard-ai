import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Bell, FastForward, LogOut, User, Menu, X, Sparkles, Mail, CheckCircle, RefreshCw } from 'lucide-react';
import NotificationPanel from './NotificationPanel';
import ConnectGmailModal from './ConnectGmailModal';
import { api } from '../services/api';

export default function Navbar({ onToggleSidebar, onSimulatorToggle }) {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userName, setUserName] = useState('User');
  const [emailAccount, setEmailAccount] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const loadNotifications = async () => {
    try {
      const res = await api.getNotifications();
      if (res.success) {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unread_count || 0);
      }
    } catch {
      // ignore
    }
  };

  const loadEmailAccount = async () => {
    try {
      const res = await api.getEmailAccount();
      if (res.success && res.connected) {
        setEmailAccount(res);
      } else {
        setEmailAccount(null);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const rawUser = localStorage.getItem('og_user');
    if (rawUser) {
      try {
        const u = JSON.parse(rawUser);
        setUserName(u.name || u.email || 'User');
      } catch {
        // ignore
      }
    }
    loadNotifications();
    loadEmailAccount();
    const interval = setInterval(() => {
      loadNotifications();
      loadEmailAccount();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSyncMail = async () => {
    setSyncing(true);
    try {
      const res = await api.syncEmail();
      if (res.error) {
        alert(res.error);
      } else {
        alert(res.message || 'Mailbox sync complete!');
        window.location.reload();
      }
    } catch (err) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('og_token');
    localStorage.removeItem('og_user');
    navigate('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-6 py-3">
        <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link to="/dashboard" className="flex items-center gap-2.5 group">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                  OpportunityGuard
                </span>
                <span className="ml-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  AI
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Gmail Connection Status or Connect Button */}
            {emailAccount ? (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-300 font-mono text-[11px] truncate max-w-[130px]">
                  {emailAccount.email_address}
                </span>
                <button
                  onClick={handleSyncMail}
                  disabled={syncing}
                  title="Sync Gmail inbox now"
                  className="p-1 hover:text-white text-emerald-400"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowConnectModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-600/30 to-rose-600/30 border border-amber-500/40 text-amber-200 hover:from-amber-600/50 hover:to-rose-600/50 transition-all hover:scale-105"
              >
                <Mail className="w-3.5 h-3.5 text-amber-400" />
                <span>Connect Gmail</span>
              </button>
            )}

            {/* Quick Demo Simulator Toggle */}
            <button
              onClick={onSimulatorToggle}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600/30 to-purple-600/30 border border-indigo-500/40 text-indigo-200 hover:from-indigo-600/50 hover:to-purple-600/50 transition-all hover:scale-105"
              title="Open Interactive Time Travel & Escalation Simulator"
            >
              <FastForward className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Time Simulator</span>
            </button>

            {/* Notifications Button */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <NotificationPanel
                  notifications={notifications}
                  unreadCount={unreadCount}
                  onClose={() => setShowNotifications(false)}
                  onRefresh={loadNotifications}
                />
              )}
            </div>

            <div className="h-5 w-px bg-slate-800 mx-1 hidden sm:block" />

            {/* User Profile / Logout */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-200">{userName}</span>
                <span className="text-[10px] text-slate-500">Protected Account</span>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {showConnectModal && (
        <ConnectGmailModal
          onClose={() => setShowConnectModal(false)}
          onConnected={() => {
            loadEmailAccount();
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
