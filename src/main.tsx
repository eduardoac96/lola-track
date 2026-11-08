import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from './lib/queryClient';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

if ('serviceWorker' in navigator && import.meta.env.PROD) registerSW({ immediate: true });

const queryClient = createQueryClient();

const root = document.getElementById('root');
if (!root) throw new Error('#root not found');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
