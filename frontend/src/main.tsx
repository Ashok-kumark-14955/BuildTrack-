import { StrictMode, Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import { seedIfNeeded } from './utils/seedData';

// Seed the browser IndexedDB with sample data on first launch (no-op after that).
seedIfNeeded().catch((e) => console.error('[BuildTrack] Seed failed:', e));

// Without this, an uncaught render error anywhere in the tree (e.g. the Konva
// <Stage> mounting before it has a real size) unmounts the whole app to a
// blank page with no way to recover except a manual reload.
class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 16, background: '#0c0004', color: '#fda4af',
          fontFamily: 'sans-serif', padding: 24, textAlign: 'center',
        }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Something went wrong.</div>
          <pre style={{
            maxWidth: 700, maxHeight: 240, overflow: 'auto', fontSize: 11, whiteSpace: 'pre-wrap',
            background: 'rgba(159,18,57,0.1)', border: '1px solid rgba(159,18,57,0.3)',
            borderRadius: 12, padding: 12, color: 'rgba(253,164,175,0.75)', textAlign: 'left',
          }}>
            {String(this.state.error?.stack || this.state.error)}
          </pre>
          <button onClick={() => window.location.reload()} style={{
            padding: '8px 18px', borderRadius: 10, border: '1px solid rgba(159,18,57,0.5)',
            background: 'linear-gradient(135deg, #9f1239 0%, #7c0a2a 100%)', color: '#fff',
            fontWeight: 700, cursor: 'pointer',
          }}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppErrorBoundary>
  </StrictMode>,
);
