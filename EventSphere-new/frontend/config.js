// frontend/config.js
// Auto-select backend URL based on environment to avoid hardcoding
// - Uses localhost in dev
// - Falls back to the deployed Render URL in production
;(function(){
  const isFileProtocol = window.location.protocol === 'file:';
  const isLocalHost = /localhost|127\.0\.0\.1/.test(window.location.hostname);
  const isLocal = isFileProtocol || isLocalHost;
  const localUrl = 'http://localhost:3000';
  const deployedUrl = 'https://event-projrct-1.onrender.com';
  const resolved = isLocal ? localUrl : deployedUrl;
  window.BASE_URL = resolved;
})();
const BASE_URL = window.BASE_URL;