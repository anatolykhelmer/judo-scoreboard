import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import './index.css';

const role = new URLSearchParams(window.location.search).get('role');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App role={role} />
  </StrictMode>,
);
