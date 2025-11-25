import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LiveKitProvider } from './contexts/LiveKitContext';
import { LanguageProvider } from './contexts/LanguageContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <LanguageProvider>
        <LiveKitProvider>
            <App />
        </LiveKitProvider>
    </LanguageProvider>
  </React.StrictMode>
);