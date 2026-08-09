import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import { seedIfNeeded } from './utils/seedData';

// Seed the browser IndexedDB with sample data on first launch (no-op after that).
seedIfNeeded().catch((e) => console.error('[BuildTrack] Seed failed:', e));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
