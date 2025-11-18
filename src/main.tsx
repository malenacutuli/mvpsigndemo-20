import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n/config'
import { initMonitoring } from './lib/monitoring'

// Initialize monitoring (Sentry, etc.)
initMonitoring();

createRoot(document.getElementById("root")!).render(<App />);
