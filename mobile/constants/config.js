// ─── Server Configuration ───────────────────────────────────────────────
// Change this to your server's IP/URL.  
// For local dev with Expo Go on a physical device, use your machine's LAN IP.
// Run 'ipconfig' (Windows) or 'ifconfig' (Mac/Linux) to find it.
const DEV_LOCAL_IP = '192.168.16.52'; // UPDATE THIS TO YOUR CURRENT LAN IP

export const API_BASE_URL = __DEV__
  ? `http://${DEV_LOCAL_IP}:5000`
  : 'https://arcadia-erp.up.railway.app';

export const API_URL = `${API_BASE_URL}/api`;
export const SOCKET_URL = API_BASE_URL;
