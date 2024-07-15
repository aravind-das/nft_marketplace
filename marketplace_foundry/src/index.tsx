import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Ensure the correct relative path to App.tsx

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
