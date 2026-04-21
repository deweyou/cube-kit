import '@deweyou-design/styles/css/reset.css'
import '@deweyou-design/styles/css/color.css'
import '@deweyou-design/styles/css/theme.css'
import '@deweyou-design/styles/css/theme-dark.css'
import '@deweyou-design/react/index.css'
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
