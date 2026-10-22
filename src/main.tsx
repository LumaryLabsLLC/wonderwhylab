import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import '@fontsource-variable/lexend';
import './styles/app.css';
import App from './App';

// Lessons and games load as they are opened. After a new release, a tab that was already open asks for
// files that have been replaced, so reload it to get the new ones (at most once a minute, never in a loop).
window.addEventListener('vite:preloadError', (event) => {
  try {
    const last = Number(sessionStorage.getItem('wwl:reloaded') ?? 0);
    if (Date.now() - last < 60_000) return;
    sessionStorage.setItem('wwl:reloaded', String(Date.now()));
  } catch {
    return;
  }
  event.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
