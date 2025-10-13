import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { useGlobalStore } from './store/global';
import { AppStoreProvider } from './store/AppStore';
import { ToastProvider } from './components/ToastProvider';
import { AppStateProvider } from './appState';

const Root = () => {
  const hydrate = useGlobalStore((s) => s.hydrate);

  React.useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <ToastProvider>
      <AppStoreProvider>
        <AppStateProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AppStateProvider>
      </AppStoreProvider>
    </ToastProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
