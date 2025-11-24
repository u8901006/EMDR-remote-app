import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LiveKitProvider } from './contexts/LiveKitContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <LiveKitProvider>
      <App />
    </LiveKitProvider>
  </React.StrictMode>
);
