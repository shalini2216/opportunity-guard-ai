import React, { useState } from 'react';
import { X, Calendar, Check, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export default function EditDeadlineModal({ opportunity, onClose, onUpdated }) {
  const [dateInput, setDateInput] = useState(() => {
    if (opportunity?.deadline) {
      try {
        const d = new Date(opportunity.deadline);
        // format for datetime-local: YYYY-MM-DDTHH:mm
        return d.toISOString().slice(0, 16);
      } catch {
        return '';
      }
    }
    return '';
  });
  const [rawText, setRawText] = useState(opportunity?.raw_deadline || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dateInput) {
      setError('Please choose a valid date and time.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const isoString = new Date(dateInput).toISOString();
      await api.editDeadline(opportunity.id, isoString, rawText || dateInput);
      onUpdated();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update deadline');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold">
            <Calendar className="w-5 h-5" />
            <h3 className="text-slate-100 font-medium">Confirm or Correct Deadline</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="p-3 text-xs rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Select Exact Date & Time
            </label>
            <input
              type="datetime-local"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Descriptive Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Due before 5 PM EST"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{loading ? 'Saving...' : 'Confirm Deadline'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
