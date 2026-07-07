import '@deweyou-design/styles/reset.css';
import '@deweyou-design/styles/color.css';
import '@deweyou-design/styles/theme.css';
import '@deweyou-design/styles/theme-dark.css';
import './theme/app-theme.css';
import '@deweyou-design/react/style.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
