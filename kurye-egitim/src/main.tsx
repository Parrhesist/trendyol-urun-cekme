import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

// Kendi adresinde (ör. GitHub Pages) yayınlandığında internetsiz çalışma ve
// ana ekrana ekleme için service worker kaydedilir. claude.ai içinde açıldığında
// buna izin verilmez; hata sessizce yok sayılır.
if ('serviceWorker' in navigator && location.protocol === 'https:' && !location.hostname.endsWith('claude.ai')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
