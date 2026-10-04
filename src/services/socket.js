import { io } from 'socket.io-client';

const getSocketUrl = () => {
  const url = import.meta.env.VITE_SOCKET_URL;
  if (!url) {
    if (import.meta.env.PROD) {
      console.error('❌ CONFIGURATION ERROR: VITE_SOCKET_URL is missing from production environment settings.');
    }
    return 'http://localhost:5000';
  }
  return url;
};

const SOCKET_URL = getSocketUrl();

const socket = io(SOCKET_URL, {
  autoConnect: false
});

export default socket;
