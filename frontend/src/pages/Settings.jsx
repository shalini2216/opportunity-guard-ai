import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Moon, Bell, Volume2, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export default function Settings() {
  const [settings, setSettings] = useState({
    quiet_hours_enabled: true,
    quiet_hours_start: '22:00',
    quiet_hours_end: '07:00',
    max_notifications_per_day: 15,
    priority_categories: ['EXAM', 'INTERNSHIP', 'JOB', 'INTERVIEW', 'REGISTRATION', 'ASSIGNMENT'],
    sound_alerts_enabled: true
  });
  const [availableCategories, setAvailableCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.getSettings();
        if (res.success) {
          setSettings(res.settings);
          setAvailableCategories(res.available_categories || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleCategoryToggle = (cat) => {
    const current = [...settings.priority_categories];
    const index = current.indexOf(cat);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(cat);
    }
    setSettings({ ...settings, priority_categories: current });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateSettings(settings);
      setSavedMsg('Personalization preferences saved successfully!');
      setTimeout(() => setSavedMsg(''), 4000);
    } catch (err) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500 text-sm">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-indigo-400" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Personalization & Guard Rules</h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Customize quiet hours, daily notification quotas, sound chimes, and priority categories
        </p>
      </div>

      {savedMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{savedMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Quiet Hours */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Quiet Hours Protection</h3>
                <p className="text-xs text-slate-400">Automatically delay reminders while resting</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.quiet_hours_enabled}
                onChange={(e) => setSettings({ ...settings, quiet_hours_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {settings.quiet_hours_enabled && (
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-800">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Start Time</label>
                <input
                  type="time"
                  value={settings.quiet_hours_start}
                  onChange={(e) => setSettings({ ...settings, quiet_hours_start: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">End Time</label>
                <input
                  type="time"
                  value={settings.quiet_hours_end}
                  onChange={(e) => setSettings({ ...settings, quiet_hours_end: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Quota & Sound Alerts */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Alert Quotas & Audio Chimes</h3>
              <p className="text-xs text-slate-400">Control frequency and high-urgency notifications</p>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Maximum Escalation Notifications Per Day:</span>
                <strong className="text-indigo-400 font-mono">{settings.max_notifications_per_day}</strong>
              </div>
              <input
                type="range"
                min="3"
                max="30"
                value={settings.max_notifications_per_day}
                onChange={(e) => setSettings({ ...settings, max_notifications_per_day: Number(e.target.value) })}
                className="w-full accent-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-300 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-slate-400" />
                <span>Play gentle audio chime on Critical alerts</span>
              </span>
              <input
                type="checkbox"
                checked={settings.sound_alerts_enabled}
                onChange={(e) => setSettings({ ...settings, sound_alerts_enabled: e.target.checked })}
                className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 bg-slate-950 border-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Priority Categories */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <h3 className="text-sm font-semibold text-slate-200">Priority Guard Categories</h3>
          <p className="text-xs text-slate-400">Select which categories trigger autonomous persistent reminders:</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
            {(availableCategories.length > 0 ? availableCategories : ['EXAM', 'INTERNSHIP', 'JOB', 'INTERVIEW', 'ASSIGNMENT', 'REGISTRATION', 'MEETING', 'COLLEGE', 'EVENT', 'FINANCE', 'SECURITY']).map((cat) => {
              const isChecked = settings.priority_categories.includes(cat);
              return (
                <label
                  key={cat}
                  className={`p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all flex items-center gap-2 ${
                    isChecked
                      ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleCategoryToggle(cat)}
                    className="rounded text-indigo-600 h-3.5 w-3.5 bg-slate-900 border-slate-700"
                  />
                  <span>{cat}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Settings...' : 'Save Preferences'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
