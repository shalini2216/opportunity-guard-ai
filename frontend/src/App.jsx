import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import EscalationSimulator from './components/EscalationSimulator';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Opportunities from './pages/Opportunities';
import Emails from './pages/Emails';
import EmailDetails from './pages/EmailDetails';
import Radar from './pages/Radar';
import Timeline from './pages/Timeline';
import MissedHistory from './pages/MissedHistory';
import Notifications from './pages/Notifications';
import Privacy from './pages/Privacy';
import Settings from './pages/Settings';

function ProtectedLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSimulatorModal, setShowSimulatorModal] = useState(false);

  const token = localStorage.getItem('og_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onSimulatorToggle={() => setShowSimulatorModal(!showSimulatorModal)}
      />

      <div className="flex-1 flex">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 lg:pl-64 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {showSimulatorModal && (
            <div className="mb-6 animate-in slide-in-from-top-4">
              <EscalationSimulator onStateChange={() => window.location.reload()} />
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Application Routes */}
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/radar" element={<Radar />} />
          <Route path="/opportunities" element={<Opportunities />} />
          <Route path="/emails" element={<Emails />} />
          <Route path="/emails/:id" element={<EmailDetails />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/history" element={<MissedHistory />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
