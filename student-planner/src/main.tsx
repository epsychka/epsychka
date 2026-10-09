import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { AppProvider } from './state/AppProvider';
import { createRepository } from './storage';
import { requestPersistentStorage } from './storage/localRepository';
import './index.css';

const repository = createRepository();
void requestPersistentStorage();

// Service worker: makes the app installable and usable offline.
// Data lives in localStorage, so updating the app never touches it.
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider repository={repository}>
      <App />
    </AppProvider>
  </StrictMode>,
);
