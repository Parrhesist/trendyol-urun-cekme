import { createRoot } from 'react-dom/client';
import { App } from './App';
import { LiveProvider } from './present/live';
import { StoreProvider } from './store';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StoreProvider>
    <LiveProvider>
      <App />
    </LiveProvider>
  </StoreProvider>,
);
