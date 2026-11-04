import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept and silence benign third-party Google GSI / FedCM iframe console errors
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const msg = args.map(arg => (arg && arg.message) || String(arg)).join(' ');
  if (msg.includes('identity-credentials-get') || msg.includes('FedCM get() rejects')) {
    // Silence this benign iframe credential permission warning
    return;
  }
  originalConsoleError.apply(console, args);
};

const originalConsoleWarn = console.warn;
console.warn = (...args: any[]) => {
  const msg = args.map(arg => (arg && arg.message) || String(arg)).join(' ');
  if (msg.includes('identity-credentials-get') || msg.includes('FedCM get() rejects')) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
