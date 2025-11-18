const { serveHTTP } = require('stremio-addon-sdk');
const addonInterface = require('./api/index');

serveHTTP(addonInterface, { port: 7000 });
console.log('🚀 ArabSeed addon running at http://localhost:7000/manifest.json');
