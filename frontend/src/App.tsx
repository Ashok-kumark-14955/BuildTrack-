import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import DrawingPage from './pages/DrawingPage';
import Dashboard from './pages/Dashboard';
import TaskList from './pages/TaskList';
import Projects from './pages/Projects';
import ZohoProjectsPage from './pages/ZohoProjects';
import SettingsPage from './pages/SettingsPage';
import { AppProvider } from './AppContext';
import { useCatalystAuth } from './utils/catalystAuth';

const PAGE_GRADIENT =
  'radial-gradient(ellipse 80% 60% at 10% 20%, rgba(160,18,72,0.50) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 90% 80%, rgba(130,15,60,0.40) 0%, transparent 60%), linear-gradient(135deg, #360016 0%, #520024 35%, #42001e 65%, #2a0012 100%)';

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const { user } = useCatalystAuth();

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
