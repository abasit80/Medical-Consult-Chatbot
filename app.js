/**
 * Namecheap cPanel Node.js startup file
 * Application startup file must be: app.js
 */
const path = require('path');

// Load env from server/.env
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });

const { start } = require(path.join(__dirname, 'server', 'index.js'));

start().catch((err) => {
  console.error('MediConsult failed to start:', err);
  // Keep process alive briefly so Passenger logs show the error
  setTimeout(() => process.exit(1), 1000);
});
