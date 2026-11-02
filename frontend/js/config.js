// ===== EDIT THIS AFTER YOU DEPLOY THE BACKEND =====
// Replace the Render address below with your own backend URL (no slash at the end).
const PRODUCTION_API_URL ='https://expense-tracker-w117.onrender.com';;

// Currency used to display amounts (e.g. 'USD', 'EUR', 'AFN', 'PKR', 'GBP')
const CURRENCY = 'USD';

// While developing on your own computer, use the local backend automatically.
const isLocal = ['localhost', '127.0.0.1', ''].includes(location.hostname);
const API_URL = isLocal ? 'http://localhost:3000' : PRODUCTION_API_URL;
