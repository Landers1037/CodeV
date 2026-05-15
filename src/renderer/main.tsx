import React from 'react';
import { createRoot } from 'react-dom/client';

import '@/index.css';
import { App } from '@/renderer/ui/App';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
