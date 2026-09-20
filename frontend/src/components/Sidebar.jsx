import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, AlertTriangle, ShieldCheck, Mail, Calendar, 
  History, Bell, Lock, Settings, Sparkles 
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/radar', label: 'What Am I About to Miss?', icon: AlertTriangle, highlight: true },
  { to: '/opportunities', label: 'All Opportunities', icon: ShieldCheck },
  { to: '/emails', label: 'Email Inbox', icon: Mail },
  { to: '/timeline', label: 'Deadline Timeline', icon: Calendar },
  { to: '/history', label: 'Missed Opportunities', icon: History },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/privacy', label: 'Privacy Vault', icon: Lock },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`fixed top-14 bottom-0 left-0 z-40 w-64 bg-slate-950/95 border-r border-slate-800/80 p-4 transition-transform duration-200 lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) => `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : item.highlight
                      ? 'text-amber-300 hover:bg-amber-950/30 border border-amber-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${item.highlight ? 'text-amber-400' : ''}`} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        <div className="absolute bottom-4 left-4 right-4 p-3.5 rounded-xl bg-gradient-to-br from-indigo-950/60 to-purple-950/40 border border-indigo-500/20 text-xs">
          <div className="flex items-center gap-1.5 text-indigo-400 font-semibold mb-1">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Opportunity Engine</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            Proactively monitoring unread status, deadline proximity, and reminder escalation.
          </p>
        </div>
      </aside>
    </>
  );
}
