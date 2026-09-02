import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HardHat, Loader2 } from 'lucide-react';
import Sidebar from './components/Sidebar';
import DrawingPage from './pages/DrawingPage';
import Dashboard from './pages/Dashboard';
import TaskList from './pages/TaskList';
import Projects from './pages/Projects';
import ZohoProjectsPage from './pages/ZohoProjects';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import { AppProvider } from './AppContext';
import { useCatalystAuth } from './utils/catalystAuth';
import { PAGE_GRADIENT } from './theme';

function FullScreenMessage({ title, sub, spinner }: { title: string; sub?: string; spinner?: boolean }) {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-3" style={{ background: PAGE_GRADIENT }}>
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
        style={{ background: 'linear-gradient(145deg, #d6486e 0%, #8b0a2e 100%)', border: '1px solid rgba(216,72,110,0.6)' }}
      >
        {spinner ? <Loader2 size={20} className="text-white animate-spin" /> : <HardHat size={20} className="text-white" />}
      </div>
      <div className="text-white font-bold text-sm">{title}</div>
      {sub && <div className="text-rose-200/60 text-xs">{sub}</div>}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const { status, user } = useCatalystAuth();

  if (status === 'checking') {
    return <FullScreenMessage title="Loading BuildTrack…" spinner />;
  }

  if (status === 'unauthenticated') {
    return <LoginPage />;
  }

  return (
    <AppProvider user={user}>
      <div
        className="flex h-screen w-screen p-3 gap-3 overflow-hidden relative"
        style={{ background: PAGE_GRADIENT }}
      >
        {/* Sidebar with rounded corners */}
        <div className="rounded-2xl overflow-hidden shrink-0 shadow-2xl">
          <Sidebar />
        </div>
        {/* Main content area with rounded corners */}
        <div className="flex-1 min-w-0 rounded-2xl overflow-hidden bg-black shadow-xl">
          <Routes>
            <Route path="/" element={<DrawingPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tasks" element={<TaskList />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/zoho-modules" element={<ZohoProjectsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            {/* Catalyst's embedded-auth SDK sometimes redirects to the legacy /app/ path after login on Slate — bounce back to root */}
            <Route path="/app/*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
      <Toaster position="top-right" />
    </AppProvider>
  );
}
