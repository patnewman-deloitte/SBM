import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { useGlobalStore } from './store/global';
import { AppStoreProvider } from './store/AppStore';
import { ToastProvider } from './components/ToastProvider';

const Root = () => {
  const hydrate = useGlobalStore((s) => s.hydrate);

  React.useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <ToastProvider>
      <AppStoreProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AppStoreProvider>
    </ToastProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
