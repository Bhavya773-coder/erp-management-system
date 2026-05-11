// ─── Server Configuration ───────────────────────────────────────────────
// Change this to your server's IP/URL.  
// For local dev with Expo Go on a physical device, use your machine's LAN IP.
// e.g. 'http://192.168.1.100:5000'
// Use your production Railway URL as the primary URL
// Only use localhost if specifically running in development with Expo Go
export const API_BASE_URL = (__DEV__ && !process.env.JEST_WORKER_ID)
  ? 'https://arcadia-erp.up.railway.app' // Default to production even in dev for easier testing
  : 'https://arcadia-erp.up.railway.app';

// If you REALLY need local dev, uncomment the line below and comment the one above
// export const API_BASE_URL = 'http://192.168.16.127:5000';

export const API_URL = `${API_BASE_URL}/api`;
export const SOCKET_URL = API_BASE_URL;
