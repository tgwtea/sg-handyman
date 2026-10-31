// list of server urls and external apis
const constantUrls = {};

// The API is served under /api on the same domain (Vercel rewrites /api/* to the server service).
// In local dev, Vite proxies /api to the Express server on port 8000 (see vite.config.js).
constantUrls.serverUrl = import.meta.env.VITE_API_URL ?? '/api';


export default constantUrls;
