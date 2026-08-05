import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import DrawingPage from './pages/DrawingPage';
import Dashboard from './pages/Dashboard';
import TaskList from './pages/TaskList';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import { AppProvider } from './AppContext';

export default function App() {
  return (
    <AppProvider>
        <div
          className="flex h-screen w-screen p-3 gap-3 overflow-hidden relative"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 10% 20%, rgba(190,24,93,0.45) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 90% 80%, rgba(157,23,77,0.35) 0%, transparent 60%), linear-gradient(135deg, #4a0020 0%, #6b0030 35%, #5a0028 65%, #3d001a 100%)',
          }}
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
            <Route path="/projects/:id" element={<ProjectDetail />} />
          </Routes>
        </div>
      </div>
      <Toaster position="top-right" />
    </AppProvider>
  );
}
