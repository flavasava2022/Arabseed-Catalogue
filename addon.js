const { getRouter } = require('stremio-addon-sdk');
const addonInterface = require('./api/index');
const express = require('express');

const app = express();

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Add the addon routes
app.use(getRouter(addonInterface));

// Start server
const PORT = 7000;
app.listen(PORT, () => {
  console.log('🚀 ArabSeed addon running at http://localhost:7000/manifest.json');
  console.log('📱 Desktop: http://localhost:7000/manifest.json');
  console.log('🌐 Web: http://localhost:7000/manifest.json (CORS enabled)');
});
