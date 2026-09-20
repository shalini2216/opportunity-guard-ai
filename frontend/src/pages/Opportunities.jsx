import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Filter, RefreshCw } from 'lucide-react';
import OpportunityCard from '../components/OpportunityCard';
import { api } from '../services/api';

export default function Opportunities() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const fetchOpps = async () => {
    setLoading(true);
    try {
      const res = await api.getOpportunities();
      setOpportunities(res.opportunities || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpps();
  }, []);

  const filtered = opportunities.filter((opp) => {
    const matchesSearch = searchTerm === '' ||
      opp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (opp.sender && opp.sender.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || opp.status === statusFilter;
    const matchesCat = categoryFilter === 'ALL' || opp.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCat;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Opportunity Vault</h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse and manage all extracted time-sensitive academic, career, and professional milestones
          </p>
        </div>

        <button
          onClick={fetchOpps}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col md:flex-row items-center gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search opportunities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs w-full md:w-auto overflow-x-auto">
          {['ALL', 'UNOPENED', 'ACTION_PENDING', 'COMPLETED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg font-medium transition-colors shrink-0 ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Category Select */}
        <div className="w-full md:w-auto ml-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full md:w-auto px-3 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-hidden focus:border-indigo-500"
          >
            <option value="ALL">All Categories</option>
            <option value="EXAM">EXAM</option>
            <option value="INTERNSHIP">INTERNSHIP</option>
            <option value="JOB">JOB</option>
            <option value="INTERVIEW">INTERVIEW</option>
            <option value="ASSIGNMENT">ASSIGNMENT</option>
            <option value="REGISTRATION">REGISTRATION</option>
            <option value="MEETING">MEETING</option>
            <option value="COLLEGE">COLLEGE</option>
            <option value="EVENT">EVENT</option>
            <option value="FINANCE">FINANCE</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">Loading opportunities...</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-slate-400 text-sm">
          No matching opportunities found.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((opp) => (
            <OpportunityCard
              key={opp.id}
              opportunity={opp}
              onActionCompleted={fetchOpps}
            />
          ))}
        </div>
      )}
    </div>
  );
}
