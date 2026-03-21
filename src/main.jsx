import React from 'react';
import ReactDOM from 'react-dom/client';
import '@ibm/plex/css/sans.css';
import '@ibm/plex/css/mono.css';
import '@carbon/charts/styles.css';
import App from './App';
import './styles/global.scss';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
